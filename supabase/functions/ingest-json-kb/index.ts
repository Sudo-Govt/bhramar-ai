// Ingest a JSON knowledge file: chunk + embed + store as document_chunks (source='kb').
// Body: { name: string, items: any, is_global?: boolean }
// "items" can be: array of {q,a} | {title,text} | {label,text} | strings,
// or an object wrapping any of those under items/records/data.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const EMBED_MODEL = "google/text-embedding-004";
const SUPER_ADMIN = "bhramar123@gmail.com";
const CHUNK = 1800, OVERLAP = 200;

function chunkText(text: string): string[] {
  const t = text.replace(/\r/g, "").trim();
  if (!t) return [];
  if (t.length <= CHUNK) return [t];
  const out: string[] = [];
  for (let i = 0; i < t.length; i += CHUNK - OVERLAP) out.push(t.slice(i, i + CHUNK));
  return out;
}

function normalize(items: any): { label: string; text: string }[] {
  let arr: any = items;
  if (!Array.isArray(arr)) {
    if (arr && typeof arr === "object") {
      arr = arr.items ?? arr.records ?? arr.data ?? arr.entries ?? null;
    }
  }
  if (!Array.isArray(arr)) return [];
  const out: { label: string; text: string }[] = [];
  for (const it of arr) {
    if (typeof it === "string") {
      out.push({ label: "", text: it });
    } else if (it && typeof it === "object") {
      const label =
        it.label ?? it.title ?? it.heading ?? it.section ?? it.q ?? it.question ?? "";
      let text =
        it.text ?? it.content ?? it.body ?? it.answer ?? it.a ?? "";
      if (!text && it.q && it.a) text = `Q: ${it.q}\nA: ${it.a}`;
      if (!text) text = JSON.stringify(it);
      out.push({ label: String(label || "").slice(0, 200), text: String(text) });
    }
  }
  return out.filter((x) => x.text && x.text.trim().length > 5);
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  });
  if (!r.ok) throw new Error(`embedding ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return (d?.data || []).map((x: any) => x.embedding as number[]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return new Response(JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const name = String(body?.name || "knowledge.json").slice(0, 200);
    const isAdmin = (u.user.email || "").toLowerCase() === SUPER_ADMIN;
    const is_global = !!body?.is_global && isAdmin;

    const records = normalize(body?.items);
    if (!records.length) {
      return new Response(JSON.stringify({ error: "No usable records found in JSON" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create kb_files row first to get the id (we use it as act_name on chunks).
    const { data: file, error: fErr } = await sb.from("kb_files").insert({
      user_id: u.user.id, name, item_count: records.length, is_global,
    }).select("id").single();
    if (fErr || !file) throw fErr || new Error("kb_files insert failed");

    let inserted = 0;
    // Flatten records into chunks
    const flat: { label: string; text: string; rec_idx: number }[] = [];
    records.forEach((r, idx) => {
      const pieces = chunkText(r.text);
      pieces.forEach((p) => flat.push({ label: r.label, text: p, rec_idx: idx }));
    });

    for (let i = 0; i < flat.length; i += 16) {
      const batch = flat.slice(i, i + 16);
      const vectors = await embedBatch(batch.map((b) => (b.label ? b.label + "\n" : "") + b.text));
      const rows = batch.map((b, idx) => ({
        source: "kb" as const,
        user_id: u.user!.id,
        case_id: null,
        document_id: null,
        act_name: file.id, // FK-by-convention: chunks.act_name == kb_files.id
        section_label: b.label || `#${b.rec_idx + 1}`,
        chunk_index: i + idx,
        content: b.text,
        embedding: vectors[idx] as unknown as string,
      }));
      const { error: insErr } = await sb.from("document_chunks").insert(rows);
      if (insErr) throw insErr;
      inserted += batch.length;
    }

    return new Response(JSON.stringify({ ok: true, file_id: file.id, items: records.length, chunks: inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ingest-json-kb", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
