// Bhramar.ai chat — streaming SSE.
// Provider abstraction: switch from Lovable AI (Gemini, default) to Groq/Llama
// later by setting AI_PROVIDER=groq and adding GROQ_API_KEY (optionally GROQ_MODEL).
// No frontend changes required.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.104.1/cors";

const SYSTEM_PROMPT = `You are Bhramar.ai, an expert AI legal assistant trained exclusively on Indian law.

Scope:
- Indian Penal Code (IPC), Code of Criminal Procedure (CrPC), Civil Procedure Code (CPC),
  Indian Evidence Act, Indian Contract Act, Constitution of India, family laws, property laws,
  and landmark Supreme Court & High Court judgements.
- If a question is outside Indian law, politely redirect.

Response format (always):
1. A clear, structured answer using markdown headings, bullet lists and bold.
2. Bold the cited statutory references inline (e.g. **Section 302 IPC**, **CrPC §438**, **Article 21**).
3. Mention 1-3 relevant landmark judgements where applicable, in italics.
4. Append a short "Practical next steps" list when the user describes a real-world scenario.
5. End with: "_Bhramar.ai provides legal information, not legal advice. Always consult a qualified advocate._"

Tone: calm, authoritative, precise. Use Indian English. Never invent sections or judgements.`;

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

function getProviderConfig() {
  const provider = (Deno.env.get("AI_PROVIDER") || "lovable").toLowerCase();
  if (provider === "groq") {
    return {
      provider,
      url: "https://api.groq.com/openai/v1/chat/completions",
      apiKey: Deno.env.get("GROQ_API_KEY") || "",
      model: Deno.env.get("GROQ_MODEL") || "llama-3.3-70b-versatile",
    };
  }
  return {
    provider: "lovable",
    url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    apiKey: Deno.env.get("LOVABLE_API_KEY") || "",
    model: Deno.env.get("LOVABLE_MODEL") || "google/gemini-3-flash-preview",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
    if (!messages.length) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cfg = getProviderConfig();
    if (!cfg.apiKey) {
      return new Response(JSON.stringify({ error: `${cfg.provider.toUpperCase()} API key not configured` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const upstream = await fetch(cfg.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: cfg.model,
        stream: true,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      }),
    });

    if (!upstream.ok) {
      if (upstream.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (upstream.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to your workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await upstream.text();
      console.error("AI gateway error", upstream.status, errText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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