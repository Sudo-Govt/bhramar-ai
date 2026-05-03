// Bhramar.ai chat — direct API streaming, NO RAG.
// Case context (notes, documents, prior chats, payments) is injected as plain text.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const DEFAULT_MODEL = "google/gemini-3-flash-preview";

function toGeminiModelId(id: string): string {
  let m = id.replace(/^google\//, "").replace(/-preview$/, "");
  if (m === "gemini-3-flash") m = "gemini-2.5-flash";
  if (m === "gemini-3.1-pro") m = "gemini-2.5-pro";
  return m;
}

const BASE_SYSTEM = `You are Bhramar — India's most powerful AI legal intelligence, built exclusively for Indian law (IPC/BNS, CrPC/BNSS, CPC, Evidence Act/BSA, Constitution, special legislation).
You are a litigation engine for advocates, law firms and clients. Calibrate tone to the user's tier.
LANGUAGE: English by default. Match Hinglish/Hindi if the user uses it. Switch with them.
Cite real sections (**Section X**, **Article Y**) and real precedents (case name, year, bench, ratio). Never fabricate citations. If unsure, say so.
Use clean markdown — headings, bullets, bold for statutes, italics for case names. No standard end disclaimer.`;

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY && !GEMINI_API_KEY && !GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: "No AI API key configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
    const caseId: string | null = body?.case_id || null;
    if (!messages.length) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load tier, demographics, admin AI settings.
    let tierLabel = "Free Individual";
    let demoBlock = "";
    let chatModel = DEFAULT_MODEL;
    let baseSystem = BASE_SYSTEM;
    let provider: "groq" | "gemini" | "lovable" = "gemini";
    let groqModel = "llama-3.3-70b-versatile";
    try {
      const [{ data: prof }, { data: settings }] = await Promise.all([
        supabase.from("profiles").select(
          "subscription_tier, full_name, age, gender, religion, marital_status, has_children, occupation, earning_bracket, family_background, physical_condition, prior_case_history, state, district"
        ).eq("id", userId).maybeSingle(),
        supabase.from("ai_settings").select("model, system_prompt, provider, groq_model").eq("id", 1).maybeSingle(),
      ]);
      const t = (prof?.subscription_tier as string | undefined) || "Free";
      if (t === "Free") tierLabel = "Free Individual";
      else if (t === "Pro") tierLabel = "Pro Individual / Pro Advocate";
      else if (t === "Firm") tierLabel = "Enterprise (Law Firm)";

      if (settings?.model) chatModel = settings.model;
      if (settings?.system_prompt && settings.system_prompt.trim()) baseSystem = settings.system_prompt;
      if (settings?.provider) provider = settings.provider as any;
      if (settings?.groq_model) groqModel = settings.groq_model;

      if (prof) {
        const lines: string[] = [];
        if (prof.full_name) lines.push(`Name: ${prof.full_name}`);
        if (prof.age != null) lines.push(`Age: ${prof.age}`);
        if (prof.gender) lines.push(`Gender: ${prof.gender}`);
        if (prof.religion) lines.push(`Religion: ${prof.religion}`);
        if (prof.state || prof.district) lines.push(`Location: ${[prof.district, prof.state].filter(Boolean).join(", ")}, India`);
        if (prof.marital_status) lines.push(`Marital status: ${prof.marital_status}${prof.has_children ? " (has children)" : ""}`);
        if (prof.occupation) lines.push(`Occupation: ${prof.occupation}`);
        if (prof.earning_bracket) lines.push(`Earning bracket: ${prof.earning_bracket}`);
        if (prof.physical_condition) lines.push(`Physical condition: ${prof.physical_condition}`);
        if (prof.family_background) lines.push(`Family background: ${prof.family_background}`);
        if (prof.prior_case_history) lines.push(`Prior case history: ${prof.prior_case_history}`);
        if (lines.length) {
          demoBlock = `\n\n---\nUSER PROFILE:\n${lines.join("\n")}`;
        }
      }
    } catch (e) {
      console.error("context lookup failed", e);
    }

    // Case context — load case row + notes + documents (filename + ai_summary + extracted text) + payments.
    let caseBlock = "";
    if (caseId) {
      try {
        const [{ data: caseRow }, { data: notes }, { data: docs }, { data: chunks }, { data: payments }] = await Promise.all([
          supabase.from("cases").select("name, case_number, client_name, complaint, ai_summary, stage, priority, status").eq("id", caseId).eq("user_id", userId).maybeSingle(),
          supabase.from("notes").select("body").eq("case_id", caseId).eq("user_id", userId).maybeSingle(),
          supabase.from("documents").select("id, filename, mime_type, ai_summary").eq("case_id", caseId).eq("user_id", userId),
          supabase.from("document_chunks").select("document_id, content").eq("case_id", caseId).eq("user_id", userId).limit(40),
          supabase.from("case_payments").select("fee_quoted, fee_received, occurred_on, note").eq("case_id", caseId).eq("user_id", userId),
        ]);

        if (caseRow) {
          const parts: string[] = [];
          parts.push(`CASE: ${caseRow.name || ""} (${caseRow.case_number || "no number"})`);
          if (caseRow.client_name) parts.push(`Client: ${caseRow.client_name}`);
          if (caseRow.stage) parts.push(`Stage: ${caseRow.stage}`);
          if (caseRow.priority) parts.push(`Priority: ${caseRow.priority}`);
          if (caseRow.status) parts.push(`Status: ${caseRow.status}`);
          if (caseRow.complaint) parts.push(`\nCOMPLAINT / NARRATIVE:\n${caseRow.complaint}`);
          if (caseRow.ai_summary) parts.push(`\nPRIOR AI SUMMARY:\n${caseRow.ai_summary}`);
          if (notes?.body) parts.push(`\nADVOCATE NOTES:\n${notes.body}`);

          if (Array.isArray(docs) && docs.length) {
            const docMap = new Map(docs.map((d: any) => [d.id, d]));
            const grouped: Record<string, string[]> = {};
            for (const c of (chunks || [])) {
              const k = c.document_id || "_";
              (grouped[k] ||= []).push(c.content || "");
            }
            const docLines: string[] = [];
            for (const d of docs) {
              const text = (grouped[d.id] || []).join("\n").slice(0, 4000);
              docLines.push(`• ${d.filename}${d.ai_summary ? ` — ${d.ai_summary}` : ""}${text ? `\n${text}` : ""}`);
            }
            // Cap total document text to ~24k chars
            const joined = docLines.join("\n\n");
            parts.push(`\nDOCUMENTS / EVIDENCE (extracted text incl. transcribed audio/video):\n${joined.slice(0, 24000)}`);
          }
          if (Array.isArray(payments) && payments.length) {
            parts.push(`\nFEES: ${payments.map((p: any) => `₹${p.fee_received}/${p.fee_quoted} on ${p.occurred_on}${p.note ? ` (${p.note})` : ""}`).join("; ")}`);
          }
          caseBlock = `\n\n---\nACTIVE CASE FILE — use this as the ground truth for the matter:\n${parts.join("\n")}`;
        }
      } catch (e) {
        console.error("case context load failed", e);
      }
    }

    const tierBlock = `\n\n---\nSESSION CONTEXT — USER TIER: ${tierLabel}`;
    const systemPrompt = `${baseSystem}${tierBlock}${demoBlock}${caseBlock}`;

    const isOpenAI = chatModel.startsWith("openai/");
    const payload = {
      stream: true,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    };

    let upstream: Response | null = null;
    let usedProvider: "groq" | "gemini" | "lovable" = provider;

    const tryGroq = async () => {
      if (!GROQ_API_KEY) return null;
      try {
        const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, model: groqModel }),
        });
        if (!r.ok) { console.error("Groq failed", r.status); return null; }
        return r;
      } catch (e) { console.error("Groq threw", e); return null; }
    };
    const tryGemini = async () => {
      if (isOpenAI || !GEMINI_API_KEY) return null;
      try {
        const r = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, model: toGeminiModelId(chatModel) }),
        });
        if (!r.ok) { console.error("Gemini failed", r.status); return null; }
        return r;
      } catch (e) { console.error("Gemini threw", e); return null; }
    };
    const tryLovable = async () => {
      if (!LOVABLE_API_KEY) return null;
      return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, model: chatModel }),
      });
    };

    const order: Array<"groq" | "gemini" | "lovable"> =
      provider === "groq" ? ["groq", "gemini", "lovable"]
      : provider === "lovable" ? ["lovable", "gemini"]
      : ["gemini", "lovable", "groq"];

    for (const p of order) {
      const r = p === "groq" ? await tryGroq() : p === "gemini" ? await tryGemini() : await tryLovable();
      if (r && r.ok) { upstream = r; usedProvider = p; break; }
    }

    if (!upstream) {
      return new Response(JSON.stringify({ error: "No AI provider available" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (upstream.status === 429) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (upstream.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log(`chat: provider=${usedProvider} model=${chatModel} case=${caseId || "-"}`);

    return new Response(upstream.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat function error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
