// supabase/functions/process-corpus-queue/index.ts
// Worker: drains rag_upload_queue → chunks file → embeds via Lovable AI Gateway → inserts into document_chunks.
// Triggered by pg_cron every 5 minutes (also callable manually).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const EMBED_MODEL = "google/text-embedding-004";
const EMBED_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
const BUCKET = "rag-corpus";
const MAX_BATCH = 5;        // queue rows per invocation
const CHUNK_SIZE = 1200;    // chars
const CHUNK_OVERLAP = 150;
const EMBED_BATCH = 16;

function chunkText(text: string): string[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];
  const out: string[] = [];
  let i = 0;
  while (i < clean.length) {
    const end = Math.min(i + CHUNK_SIZE, clean.length);
    out.push(clean.slice(i, end));
    if (end >= clean.length) break;
    i = end - CHUNK_OVERLAP;
  }
  return out;
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const r = await fetch(EMBED_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`embed ${r.status}: ${t.slice(0, 200)}`);
  }
  const j = await r.json();
  return (j?.data || []).map((d: any) => d.embedding as number[]);
}

async function processRow(supa: ReturnType<typeof createClient>, row: any) {
  // mark processing
  await supa.from("rag_upload_queue").update({ status: "processing" }).eq("id", row.id);

  // download from storage
  const { data: blob, error: dlErr } = await supa.storage.from(BUCKET).download(row.file_path);
  if (dlErr || !blob) throw new Error(`download failed: ${dlErr?.message || "no blob"}`);
  const text = await blob.text();
  const chunks = chunkText(text);
  if (chunks.length === 0) throw new Error("file produced 0 chunks");

  // map queue source → document_chunks.source enum
  // queue: 'corpus' | 'kb' | 'pipeline'   →   chunks: 'corpus' | 'kb'
  const chunkSource = row.source === "kb" ? "kb" : "corpus";
  const actName = row.original_filename || row.file_path;

  let inserted = 0;
  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const batch = chunks.slice(i, i + EMBED_BATCH);
    const vectors = await embedBatch(batch.map((c) => `${actName}\n${c}`));
    const rows = batch.map((content, idx) => ({
      source: chunkSource,
      user_id: chunkSource === "kb" ? row.uploaded_by : null,
      case_id: null,
      document_id: null,
      act_name: actName,
      section_label: `chunk-${i + idx + 1}`,
      chunk_index: i + idx,
      content,
      embedding: vectors[idx] as unknown as string,
    }));
    const { error: insErr } = await supa.from("document_chunks").insert(rows);
    if (insErr) throw new Error(`insert failed: ${insErr.message}`);
    inserted += batch.length;
  }

  await supa.from("rag_upload_queue").update({
    status: "done",
    processed_at: new Date().toISOString(),
    error_message: null,
  }).eq("id", row.id);

  return inserted;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: pending, error: qErr } = await supa
      .from("rag_upload_queue")
      .select("*")
      .eq("status", "pending")
      .order("uploaded_at", { ascending: true })
      .limit(MAX_BATCH);
    if (qErr) throw qErr;

    const results: any[] = [];
    for (const row of pending || []) {
      try {
        const n = await processRow(supa, row);
        results.push({ id: row.id, file: row.original_filename, status: "done", chunks: n });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await supa.from("rag_upload_queue").update({
          status: "failed",
          error_message: msg.slice(0, 500),
          processed_at: new Date().toISOString(),
        }).eq("id", row.id);
        results.push({ id: row.id, file: row.original_filename, status: "failed", error: msg });
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("process-corpus-queue fatal", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
