// FILE: supabase/functions/chat/index.ts
// Bhramar.ai — Hardened chat edge function with rate limiting + env-based super admin

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

    // ─── 3. Super Admin Check (for future AI switcher) ───────
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

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return jsonError("Messages array required", 400);
    }

    // ─── 5. Super Admin: Allow Model Override ────────────────
    let chatModel = CONFIG.DEFAULT_CHAT_MODEL;
    if (userIsSuperAdmin && preferred_model) {
      // Validate against allowed models
      const allowedModels = [
        "google/gemini-2.5-flash",
        "google/gemini-2.5-pro",
        "anthropic/claude-3.5-sonnet",
        "anthropic/claude-3-opus",
        "openai/gpt-4o",
        "openai/gpt-4o-mini",
      ];
      if (allowedModels.includes(preferred_model)) {
        chatModel = preferred_model;
      }
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
      // Summarize old messages (simplified — in production, call AI here)
      finalMessages = [
        { role: "system", content: `Previous conversation summary: ${summaryPrompt}` },
        ...messages.slice(-10),
      ];
    }

    // ─── 9. Call AI Gateway ──────────────────────────────────
    const lovableKey = CONFIG.LOVABLE_API_KEY;
    if (!lovableKey) {
      return jsonError("AI Gateway not configured", 500);
    }

    const aiRes = await fetch(CONFIG.AI_GATEWAY + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableKey}`,
      },
      body: JSON.stringify({
        model: chatModel,
        messages: [
          { role: "system", content: systemPrompt },
          ...finalMessages,
        ],
        stream: true,
        temperature
