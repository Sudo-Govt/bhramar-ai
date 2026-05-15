// supabase/functions/process-corpus-queue/index.ts
// Worker: drains rag_upload_queue → chunks file → embeds via Google AI → inserts into document_chunks.
// Triggered by pg_cron every 5 minutes (also callable manually).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_AI_KEY = Deno.env.get("GOOGLE_AI_API_KEY") || Deno.env.get("GEMINI_API_KEY") || "";
const EMBED_MODEL = "models/text-embedding-004";
const EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/${EMBED_MODEL}:batchEmbedContents`;
const BUCKET = "rag-corpus";
const MAX_BATCH = 8;        // queue rows per invocation
const CHUNK_SIZE = 1200;
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
  if (!GOOGLE_AI_KEY) throw new Error("GOOGLE_AI_API_KEY (or GEMINI_API_KEY) not configured");
  const r = await fetch(`${EMBED_URL}?key=${GOOGLE_AI_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: texts.map((t) => ({
        model: EMBED_MODEL,
        content: { parts: [{ text: t }] },
      })),
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`embed ${r.status}: ${t.slice(0, 300)}`);
  }
  const j = await r.json();
  return (j?.embeddings || []).map((e: any) => e.values as number[]);
}

async function processRow(supa: ReturnType<typeof createClient>, row: any) {
  await supa.from("rag_upload_queue").update({ status: "processing" }).eq("id", row.id);

  const { data: blob, error: dlErr } = await supa.storage.from(BUCKET).download(row.file_path);
  if (dlErr || !blob) throw new Error(`download failed: ${dlErr?.message || "no blob"}`);
  const text = await blob.text();
  const chunks = chunkText(text);
  if (chunks.length === 0) throw new Error("file produced 0 chunks");

  const chunkSource = row.source === "kb" ? "kb" : "corpus";
  const actName = row.original_filename || row.file_path;

  let inserted = 0;
  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const batch = chunks.slice(i, i + EMBED_BATCH);
    const vectors = await embedBatch(batch.map((c) => `${actName}\n${c}`));
    if (vectors.length !== batch.length) throw new Error(`embed mismatch ${vectors.length}/${batch.length}`);
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

// Scan storage and create queue rows for any orphans (files in storage but not in queue).
async function reconcileStorage(supa: ReturnType<typeof createClient>) {
  let added = 0;
  for (const folder of ["corpus", "kb", "pipeline"]) {
    const { data: objs } = await supa.storage.from(BUCKET).list(folder, { limit: 1000 });
    if (!objs) continue;
    for (const o of objs) {
      if (!o.name) continue;
      const path = `${folder}/${o.name}`;
      const { data: existing } = await supa.from("rag_upload_queue").select("id").eq("file_path", path).maybeSingle();
      if (existing) continue;
      await supa.from("rag_upload_queue").insert({
        source: folder,
        file_path: path,
        original_filename: o.name,
        file_size_bytes: (o.metadata as any)?.size || null,
        status: "pending",
      });
      added++;
    }
  }
  return added;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Reconcile orphan storage objects on every run
    const reconciled = await reconcileStorage(supa).catch((e) => {
      console.warn("reconcile failed", e?.message);
      return 0;
    });

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

    return new Response(JSON.stringify({ ok: true, reconciled, processed: results.length, results }), {
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
