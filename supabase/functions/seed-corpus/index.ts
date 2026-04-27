// Seed the shared bare-acts corpus into document_chunks (source='corpus').
// Idempotent: skips acts already present.
// Authorisation: requires a signed-in user. Safe to expose since it only
// inserts curated, hard-coded text and never reads user data.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";
import { CORPUS } from "./corpus.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const EMBED_MODEL = "google/text-embedding-004";

async function embedBatch(texts: string[]): Promise<number[][]> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`embedding failed (${resp.status}): ${t.slice(0, 200)}`);
  }
  const data = await resp.json();
  return (data?.data || []).map((d: any) => d.embedding as number[]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const force = new URL(req.url).searchParams.get("force") === "1";
    const summary: Record<string, { inserted: number; skipped: boolean }> = {};

    for (const act of CORPUS) {
      const { count, error: countErr } = await supabase
        .from("document_chunks")
        .select("id", { count: "exact", head: true })
        .eq("source", "corpus")
        .eq("act_name", act.name);
      if (countErr) throw countErr;

      if ((count ?? 0) > 0 && !force) {
        summary[act.name] = { inserted: 0, skipped: true };
        continue;
      }
      if (force) {
        await supabase.from("document_chunks").delete().eq("source", "corpus").eq("act_name", act.name);
      }

      let inserted = 0;
      for (let i = 0; i < act.sections.length; i += 16) {
        const batch = act.sections.slice(i, i + 16);
        const vectors = await embedBatch(batch.map((s) => `${act.name} ${s.label}\n${s.text}`));
        const rows = batch.map((s, idx) => ({
          source: "corpus" as const,
          user_id: null,
          case_id: null,
          document_id: null,
          act_name: act.name,
          section_label: s.label,
          chunk_index: i + idx,
          content: s.text,
          embedding: vectors[idx] as unknown as string,
        }));
        const { error: insErr } = await supabase.from("document_chunks").insert(rows);
        if (insErr) throw insErr;
        inserted += batch.length;
      }
      summary[act.name] = { inserted, skipped: false };
    }

    return new Response(JSON.stringify({ ok: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("seed-corpus error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});