// Rolling factual summary for a conversation.
// Folds older messages into conversations.summary so chat can stay grounded
// without re-sending the full transcript on every turn.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const RECENT_KEEP = 6; // verbatim turns kept; older ones get summarised

const SUMMARY_SYSTEM = `You are a strictly factual conversation summariser for an Indian legal assistant.
Your ONLY job is to produce a tight bullet list of facts already stated in the transcript.

RULES:
- Do NOT add legal opinions, conclusions, or citations that were not already in the transcript.
- Do NOT invent details. If unsure, omit.
- Capture: client identity, location, key dates, monetary amounts, named statutes/sections explicitly mentioned, the user's stated goal, what advice has already been given, and any open questions Bhramar asked but the user has not yet answered.
- Output 6-15 short bullets. No prose, no headings, no preamble.
- If a previous summary is supplied, integrate it: keep all still-relevant facts, add new ones from the new messages, drop nothing unless contradicted by a later message.`;

async function summarise(prevSummary: string, transcript: string): Promise<string> {
  const userMsg = prevSummary
    ? `EXISTING SUMMARY:\n${prevSummary}\n\nNEW MESSAGES TO FOLD IN:\n${transcript}`
    : `TRANSCRIPT:\n${transcript}`;
  const body = {
    messages: [
      { role: "system", content: SUMMARY_SYSTEM },
      { role: "user", content: userMsg },
    ],
    temperature: 0.1,
  };

  // Prefer Groq (cheapest), fall back to Gemini, then Lovable.
  if (GROQ_API_KEY) {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, model: "llama-3.3-70b-versatile" }),
    });
    if (r.ok) { const j = await r.json(); return j?.choices?.[0]?.message?.content?.trim() || prevSummary; }
  }
  if (GEMINI_API_KEY) {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, model: "gemini-2.5-flash" }),
    });
    if (r.ok) { const j = await r.json(); return j?.choices?.[0]?.message?.content?.trim() || prevSummary; }
  }
  if (LOVABLE_API_KEY) {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, model: "google/gemini-3-flash-preview" }),
    });
    if (r.ok) { const j = await r.json(); return j?.choices?.[0]?.message?.content?.trim() || prevSummary; }
  }
  return prevSummary;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { global: { headers: { Authorization: auth } } });
    const { data: ud } = await supabase.auth.getUser();
    if (!ud?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = ud.user.id;
    const { conversation_id } = await req.json();
    if (!conversation_id) {
      return new Response(JSON.stringify({ error: "conversation_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: conv } = await supabase
      .from("conversations")
      .select("id, user_id, summary, summary_until_message_id")
      .eq("id", conversation_id).maybeSingle();
    if (!conv || conv.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: allMsgs } = await supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true });
    const msgs = allMsgs || [];

    // Only summarise messages older than the last RECENT_KEEP turns.
    if (msgs.length <= RECENT_KEEP) {
      return new Response(JSON.stringify({ ok: true, skipped: "not enough history" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const olderToFold = msgs.slice(0, msgs.length - RECENT_KEEP);

    // Skip if we've already summarised up to the same boundary.
    const boundaryId = olderToFold[olderToFold.length - 1].id;
    if (conv.summary_until_message_id === boundaryId) {
      return new Response(JSON.stringify({ ok: true, skipped: "up to date" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Determine what's new since last summary.
    let toSummariseList = olderToFold;
    if (conv.summary_until_message_id) {
      const idx = olderToFold.findIndex((m) => m.id === conv.summary_until_message_id);
      if (idx >= 0) toSummariseList = olderToFold.slice(idx + 1);
    }
    if (!toSummariseList.length) {
      return new Response(JSON.stringify({ ok: true, skipped: "nothing new" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const transcript = toSummariseList
      .map((m) => `[${m.role.toUpperCase()}] ${m.content}`)
      .join("\n\n")
      .slice(0, 60000);

    const newSummary = await summarise(conv.summary || "", transcript);

    await supabase.from("conversations")
      .update({ summary: newSummary, summary_until_message_id: boundaryId, summary_updated_at: new Date().toISOString() })
      .eq("id", conversation_id);

    return new Response(JSON.stringify({ ok: true, length: newSummary.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("summarize error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
