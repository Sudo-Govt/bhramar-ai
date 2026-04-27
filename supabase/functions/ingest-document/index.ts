// Extract text from an uploaded document, chunk it, embed each chunk via
// Lovable AI, and store rows in document_chunks (source='user').
// Body: { document_id: string }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";
import pdf from "https://esm.sh/pdf-parse@1.1.1?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const EMBED_MODEL = "google/text-embedding-004";
const CHUNK_TARGET_CHARS = 1800; // ~450 tokens
const CHUNK_OVERLAP_CHARS = 200;

function chunkText(text: string): string[] {
  const cleaned = text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  if (!cleaned) return [];
  // Split on paragraph boundaries first, then pack into ~CHUNK_TARGET_CHARS windows.
  const paragraphs = cleaned.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    if ((current + "\n\n" + p).length > CHUNK_TARGET_CHARS && current) {
      chunks.push(current.trim());
      // overlap last N chars to preserve context
      current = current.slice(-CHUNK_OVERLAP_CHARS) + "\n\n" + p;
    } else {
      current = current ? `${current}\n\n${p}` : p;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  // Hard-split any single paragraph that is still oversized
  const final: string[] = [];
  for (const c of chunks) {
    if (c.length <= CHUNK_TARGET_CHARS * 1.5) {
      final.push(c);
    } else {
      for (let i = 0; i < c.length; i += CHUNK_TARGET_CHARS - CHUNK_OVERLAP_CHARS) {
        final.push(c.slice(i, i + CHUNK_TARGET_CHARS));
      }
    }
  }
  return final;
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  // Lovable AI gateway accepts an array input for embeddings.
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

async function extractTextFromBlob(blob: Blob, filename: string, mime: string | null): Promise<string> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".txt") || lower.endsWith(".md") || (mime || "").startsWith("text/")) {
    return await blob.text();
  }
  if (lower.endsWith(".pdf") || mime === "application/pdf") {
    const buf = new Uint8Array(await blob.arrayBuffer());
    const result: any = await pdf(buf);
    return String(result?.text || "");
  }
  // Best-effort fallback
  return await blob.text();
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
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { document_id } = await req.json();
    if (!document_id) {
      return new Response(JSON.stringify({ error: "document_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch document row (must belong to caller)
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("*")
      .eq("id", document_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (docErr || !doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download file from storage
    const { data: fileBlob, error: dlErr } = await supabase.storage
      .from("case-documents")
      .download(doc.storage_path);
    if (dlErr || !fileBlob) {
      return new Response(JSON.stringify({ error: "Failed to download file" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = await extractTextFromBlob(fileBlob, doc.filename, doc.mime_type);
    if (!text || text.trim().length < 20) {
      return new Response(JSON.stringify({ error: "Could not extract readable text from this file." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chunks = chunkText(text);
    if (!chunks.length) {
      return new Response(JSON.stringify({ error: "No chunks produced" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Wipe any prior chunks for this document so re-indexing is idempotent
    await supabase.from("document_chunks").delete().eq("document_id", document_id);

    // Embed in batches of 16
    let inserted = 0;
    for (let i = 0; i < chunks.length; i += 16) {
      const batch = chunks.slice(i, i + 16);
      const vectors = await embedBatch(batch);
      const rows = batch.map((content, idx) => ({
        source: "user" as const,
        user_id: userId,
        case_id: doc.case_id,
        document_id,
        chunk_index: i + idx,
        content,
        embedding: vectors[idx] as unknown as string, // pgvector accepts JSON array
      }));
      const { error: insErr } = await supabase.from("document_chunks").insert(rows);
      if (insErr) {
        console.error("insert chunks failed", insErr);
        return new Response(JSON.stringify({ error: insErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      inserted += batch.length;
    }

    await supabase
      .from("documents")
      .update({ indexed_at: new Date().toISOString(), chunk_count: inserted })
      .eq("id", document_id);

    return new Response(JSON.stringify({ ok: true, chunks: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ingest-document error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});