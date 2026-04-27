// Bhramar.ai chat — RAG-grounded streaming SSE.
// 1. Validates the caller's JWT.
// 2. Embeds the latest user message via Lovable AI.
// 3. Retrieves top-K chunks from pgvector (corpus + this user's docs).
// 4. Streams Gemini answer with [S#] citations.
// 5. Appends a final SSE event: data: {"sources":[…]} so the client can render chips.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const CHAT_MODEL = "google/gemini-3-flash-preview";
const EMBED_MODEL = "google/text-embedding-004";

const BASE_SYSTEM = `You are Bhramar.ai, an expert AI legal assistant trained exclusively on Indian law.

Scope: IPC, CrPC, CPC, Indian Evidence Act, Indian Contract Act, Constitution of India,
family/property laws, and landmark Supreme Court & High Court judgements.
If a question is outside Indian law, politely redirect.

Response format (always):
1. Clear structured answer using markdown headings, bullets and bold.
2. Bold statutory references inline (e.g. **Section 302 IPC**, **Article 21**).
3. Mention 1-3 relevant landmark judgements where applicable, in italics.
4. Append a short "Practical next steps" list when the user describes a real scenario.
5. End with: "_Bhramar.ai provides legal information, not legal advice. Always consult a qualified advocate._"

Tone: calm, authoritative, precise. Use Indian English. Never invent sections or judgements.`;

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

async function embed(text: string): Promise<number[]> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`embedding failed (${resp.status}): ${t.slice(0, 200)}`);
  }
  const data = await resp.json();
  return data?.data?.[0]?.embedding ?? [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate JWT and obtain the user id
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
    const useRag: boolean = body?.useRag !== false; // default on
    if (!messages.length) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find latest user message to retrieve against
    const latestUser = [...messages].reverse().find((m) => m.role === "user")?.content || "";

    let sources: Array<{ id: number; label: string; source: string; snippet: string; document_id: string | null }> = [];
    let groundingBlock = "";

    if (useRag && latestUser) {
      try {
        const queryEmbedding = await embed(latestUser);
        const { data: chunks, error: rpcErr } = await supabase.rpc("match_chunks", {
          query_embedding: queryEmbedding,
          match_user_id: userId,
          match_count: 6,
          corpus_weight: 1.0,
        });
        if (rpcErr) {
          console.error("match_chunks failed", rpcErr);
        } else if (Array.isArray(chunks) && chunks.length) {
          sources = chunks.map((c: any, i: number) => {
            const label =
              c.source === "corpus"
                ? `${c.act_name || "Bare act"}${c.section_label ? ` ${c.section_label}` : ""}`
                : `Your document`;
            return {
              id: i + 1,
              label,
              source: c.source,
              snippet: (c.content || "").slice(0, 400),
              document_id: c.document_id,
            };
          });
          groundingBlock = sources
            .map((s) => `[S${s.id}] (${s.label}) ${s.snippet}`)
            .join("\n\n");
        }
      } catch (e) {
        console.error("retrieval error (continuing without grounding)", e);
      }
    }

    const systemPrompt = groundingBlock
      ? `${BASE_SYSTEM}\n\n---\nUse the following sources when relevant. When you rely on a source, cite it inline as [S1], [S2] etc. matching the labels below. If the sources don't cover the question, answer from your training but do not fabricate citations.\n\n${groundingBlock}`
      : BASE_SYSTEM;

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        stream: true,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
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

    // Pipe upstream SSE through, then append a final sources event.
    const reader = upstream.body!.getReader();
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
          // Append our custom sources event so the client can render citation chips.
          controller.enqueue(
            encoder.encode(`\nevent: sources\ndata: ${JSON.stringify({ sources })}\n\n`),
          );
        } catch (e) {
          console.error("stream pipe error", e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat function error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});