// FILE: supabase/functions/chat/index.ts
// Bhramar.ai — Multi-provider AI chat with RAG + rate limiting + super admin model override

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildSystemPrompt,
  type FullContext,
  type ProfileCtx,
  type CaseCtx,
  type ChunkCtx,
  buildChatHistorySummaryPrompt,
} from "../_shared/bhramarPrompt.ts";

import {
  CONFIG,
  checkRateLimit,
  isSuperAdmin,
  getAuthHeader,
  jsonError,
  corsHeaders,
} from "../_shared/config.ts";

// ─── Provider Routing ──────────────────────────────────────────

interface ProviderConfig {
  url: string;
  key: string;
  modelPrefix: string;
  headers: Record<string, string>;
  bodyTransform: (model: string, messages: any[], systemPrompt: string, stream: boolean) => any;
  responseTransform: (res: Response) => Promise<Response>;
}

function getProviderConfig(modelId: string): ProviderConfig {
  // modelId format: "provider/model-name" or just "model-name" (defaults to lovable)
  const [provider, ...modelParts] = modelId.split("/");
  const modelName = modelParts.join("/") || provider;
  
  // Determine actual provider from prefix or default
  let actualProvider = provider;
  if (!["google", "anthropic", "openai", "lovable"].includes(provider)) {
    actualProvider = "lovable"; // default fallback
  }

  switch (actualProvider) {
    case "google": {
      const key = CONFIG.GOOGLE_AI_KEY;
      if (!key) throw new Error("Google AI API key not configured");
      return {
        url: "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent",
        key,
        modelPrefix: "google/",
        headers: { "Content-Type": "application/json" },
        bodyTransform: (model, messages, systemPrompt, stream) => ({
          contents: [
            { role: "user", parts: [{ text: systemPrompt }] },
            ...messages.map((m: any) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }]
            }))
          ],
          generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
        }),
        responseTransform: async (res) => {
          if (!res.ok) {
            const err = await res.text();
            throw new Error(`Google AI error: ${err}`);
          }
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          // Convert to OpenAI-compatible streaming format
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            }
          });
          return new Response(stream, {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream" }
          });
        }
      };
    }

    case "anthropic": {
      const key = CONFIG.ANTHROPIC_KEY;
      if (!key) throw new Error("Anthropic API key not configured");
      return {
        url: "https://api.anthropic.com/v1/messages",
        key,
        modelPrefix: "anthropic/",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        bodyTransform: (model, messages, systemPrompt, stream) => {
          const userMessages = messages.filter((m: any) => m.role !== "system");
          const lastUserMsg = userMessages.pop();
          return {
            model: modelName,
            max_tokens: 4096,
            temperature: 0.3,
            system: systemPrompt,
            messages: [
              ...userMessages.map((m: any) => ({ role: m.role, content: m.content })),
              { role: "user", content: lastUserMsg?.content || "" }
            ],
            stream: false, // Anthropic streaming requires different handling
          };
        },
        responseTransform: async (res) => {
          if (!res.ok) {
            const err = await res.text();
            throw new Error(`Anthropic error: ${err}`);
          }
          const data = await res.json();
          const text = data.content?.[0]?.text || "";
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            }
          });
          return new Response(stream, {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream" }
          });
        }
      };
    }

    case "openai": {
      const key = CONFIG.OPENAI_KEY;
      if (!key) throw new Error("OpenAI API key not configured");
      return {
        url: "https://api.openai.com/v1/chat/completions",
        key,
        modelPrefix: "openai/",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`,
        },
        bodyTransform: (model, messages, systemPrompt, stream) => ({
          model: modelName,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages
          ],
          temperature: 0.3,
          max_tokens: 4096,
          stream: true,
        }),
        responseTransform: async (res) => {
          if (!res.ok) {
            const err = await res.text();
            throw new Error(`OpenAI error: ${err}`);
          }
          // Pass through OpenAI's SSE stream
          return new Response(res.body, {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream" }
          });
        }
      };
    }

    case "lovable":
    default: {
      const key = CONFIG.LOVABLE_API_KEY;
      if (!key) throw new Error("Lovable API key not configured");
      return {
        url: CONFIG.AI_GATEWAY + "/chat/completions",
        key,
        modelPrefix: "lovable/",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`,
        },
        bodyTransform: (model, messages, systemPrompt, stream) => ({
          model: modelId, // Lovable uses full model ID like "google/gemini-2.5-flash"
          messages: [
            { role: "system", content: systemPrompt },
            ...messages
          ],
          temperature: 0.3,
          stream: true,
        }),
        responseTransform: async (res) => {
          if (!res.ok) {
            const err = await res.text();
            throw new Error(`Lovable Gateway error: ${err}`);
          }
          return new Response(res.body, {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream" }
          });
        }
      };
    }
  }
}

// ─── Main Handler ──────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // ─── 1. Rate Limit Check ─────────────────────────────────
    const clientIp = req.headers.get("x-forwarded-for") || "unknown";
    const rateLimit = checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return jsonError(`Rate limit exceeded. Retry after ${rateLimit.retryAfter}s`, 429);
    }

    // ─── 2. Auth Validation ──────────────────────────────────
    const authHeader = getAuthHeader(req);
    if (!authHeader) return jsonError("Unauthorized", 401);

    const supabaseUrl = CONFIG.SUPABASE_URL;
    const serviceKey = CONFIG.SERVICE_ROLE_KEY;
    const anonKey = CONFIG.ANON_KEY;

    if (!supabaseUrl || !serviceKey || !anonKey) {
      return jsonError("Server configuration error", 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return jsonError("Unauthorized", 401);

    // ─── 3. Super Admin Check ────────────────────────────────
    const userIsSuperAdmin = isSuperAdmin(user.email);

    // ─── 4. Parse Request ────────────────────────────────────
    const body = await req.json();
    const {
      messages,
      case_id,
      summarize_history,
      preferred_model, // super admin can override
    } = body as {
      messages: { role: string; content: string }[];
      case_id?: string;
      summarize_history?: boolean;
      preferred_model?: string;
    };

    // ─── Admin Check Endpoint ────────────────────────────────
    if (body.check_admin) {
      return new Response(
        JSON.stringify({ is_super_admin: userIsSuperAdmin }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return jsonError("Messages array required", 400);
    }

    // ─── 5. Determine Model ──────────────────────────────────
    let chatModel = CONFIG.DEFAULT_CHAT_MODEL;
    
    // Super admin override
    if (userIsSuperAdmin && preferred_model) {
      chatModel = preferred_model;
    } else {
      // Check user tier for model access
      const { data: profile } = await createClient(supabaseUrl, serviceKey)
        .from("profiles")
        .select("subscription_tier")
        .eq("id", user.id)
        .single();
      
      // Free tier: only basic models
      if (profile?.subscription_tier === "Free") {
        chatModel = "google/gemini-2.5-flash-lite";
      }
      // Pro tier: standard models
      else if (profile?.subscription_tier === "Pro") {
        chatModel = "google/gemini-2.5-flash";
      }
      // Firm/Enterprise: any model (will use default or admin-set)
    }

    // ─── 6. Build Context ────────────────────────────────────
    const supa = createClient(supabaseUrl, serviceKey);

    // Fetch profile
    const { data: profile } = await supa
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) return jsonError("Profile not found", 404);

    // Build L2 context
    const profileCtx: ProfileCtx = {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      user_type: profile.user_type,
      state: profile.state,
      district: profile.district,
      age: profile.age,
      gender: profile.gender,
      occupation: profile.occupation,
      marital_status: profile.marital_status,
      earning_bracket: profile.earning_bracket,
      family_background: profile.family_background,
      prior_case_history: profile.prior_case_history,
      physical_condition: profile.physical_condition,
      advocate_id: profile.advocate_id,
      bar_council: profile.bar_council,
      enrollment_number: profile.enrollment_number,
      court_of_practice: profile.court_of_practice,
      specializations: profile.specializations,
      years_experience: profile.years_experience,
      firm_id: profile.firm_id,
      firm_role: profile.firm_role,
    };

    // Build L3 context (active case)
    let caseCtx: CaseCtx | null = null;
    let clientCtx = null;
    let docsCtx: any[] = [];
    let notesCtx: any[] = [];
    let tasksCtx: any[] = [];
    let recentMessages: any[] = [];
    let ragChunks: ChunkCtx[] = [];

    if (case_id) {
      const { data: caseData } = await supa
        .from("cases")
        .select("*")
        .eq("id", case_id)
        .eq("user_id", user.id)
        .single();

      if (caseData) {
        caseCtx = {
          id: caseData.id,
          name: caseData.name,
          case_number: caseData.case_number,
          client_name: caseData.client_name,
          status: caseData.status,
          stage: caseData.stage,
          priority: caseData.priority,
          deadline: caseData.deadline,
          ai_summary: caseData.ai_summary,
          complaint: caseData.complaint,
        };

        // Fetch related data (batched)
        const [docsRes, notesRes, tasksRes, messagesRes] = await Promise.all([
          supa.from("documents").select("filename, ai_summary").eq("case_id", case_id).limit(5),
          supa.from("notes").select("body, updated_at").eq("case_id", case_id).limit(5),
          supa.from("tasks").select("title, due_date, status").eq("case_id", case_id).limit(10),
          supa.from("messages").select("role, content").eq("case_id", case_id).order("created_at", { ascending: false }).limit(10),
        ]);

        docsCtx = docsRes.data || [];
        notesCtx = notesRes.data || [];
        tasksCtx = tasksRes.data || [];
        recentMessages = (messagesRes.data || []).reverse();

        // RAG: Get embedding for last user message
        const lastUserMessage = messages.filter(m => m.role === "user").pop();
        if (lastUserMessage) {
          try {
            const embedRes = await fetch(
              "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=" + CONFIG.GOOGLE_AI_KEY,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  model: "models/text-embedding-004",
                  content: { parts: [{ text: lastUserMessage.content }] },
                }),
              }
            );
            const embedData = await embedRes.json();
            const embedding = embedData.embedding?.values;

            if (embedding) {
              const { data: chunks } = await supa.rpc("match_chunks", {
                query_embedding: embedding,
                match_threshold: 0.7,
                match_count: 5,
              });
              ragChunks = (chunks || []).map((c: any) => ({
                act_name: c.act_name,
                section_label: c.section_label,
                content: c.content,
                similarity: c.similarity,
              }));
            }
          } catch (e) {
            console.error("Embedding failed, continuing without RAG:", e);
          }
        }
      }
    }

    // Build L4 context (firm)
    let firmCtx = null;
    if (profile.firm_id) {
      const { data: firm } = await supa
        .from("firms")
        .select("name, member_count, active_cases")
        .eq("id", profile.firm_id)
        .single();
      if (firm) firmCtx = firm;
    }

    const fullContext: FullContext = {
      profile: profileCtx,
      activeCase: caseCtx,
      client: clientCtx,
      documents: docsCtx,
      notes: notesCtx,
      tasks: tasksCtx,
      recentMessages,
      ragChunks,
      firm: firmCtx,
    };

    // ─── 7. Build System Prompt ──────────────────────────────
    const systemPrompt = buildSystemPrompt(fullContext);

    // ─── 8. History Summarization (if needed) ────────────────
    let finalMessages = messages;
    if (summarize_history && messages.length > 20) {
      const summaryPrompt = buildChatHistorySummaryPrompt(messages.slice(0, -10));
      finalMessages = [
        { role: "system", content: `Previous conversation summary: ${summaryPrompt}` },
        ...messages.slice(-10),
      ];
    }

    // ─── 9. Route to Provider ────────────────────────────────
    const provider = getProviderConfig(chatModel);
    const requestBody = provider.bodyTransform(chatModel, finalMessages, systemPrompt, true);

    const aiRes = await fetch(provider.url, {
      method: "POST",
      headers: provider.headers,
      body: JSON.stringify(requestBody),
    });

    if (!aiRes.ok) {
      const err = await aiRes.text();
      return jsonError(`AI error: ${err}`, 502);
    }

    // ─── 10. Stream Response ─────────────────────────────────
    const transformedRes = await provider.responseTransform(aiRes);
    return transformedRes;

  } catch (err) {
    console.error("Chat function error:", err);
    return jsonError(err instanceof Error ? err.message : "Internal error", 500);
  }
});
