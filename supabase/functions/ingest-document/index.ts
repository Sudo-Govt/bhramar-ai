// FILE: supabase/functions/ingest-document/index.ts
// Bhramar.ai — Admin document ingestion: PDF/DOCX/URL → chunks → embeddings → pgvector

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  CONFIG,
  isSuperAdmin,
  getAuthHeader,
  jsonError,
  corsHeaders,
} from "../_shared/config.ts";

// ─── Text Extraction ───────────────────────────────────────────

async function extractTextFromUrl(url: string): Promise<string> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  
  const contentType = res.headers.get("content-type") || "";
  
  if (contentType.includes("application/pdf")) {
    return await extractPdfText(await res.arrayBuffer());
  } else if (contentType.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document")) {
    return await extractDocxText(await res.arrayBuffer());
  } else if (contentType.includes("text/")) {
    return await res.text();
  } else {
    // Try to extract as text anyway
    return await res.text();
  }
}

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  // Using pdf-parse via esm.sh (lightweight Deno-compatible parser)
  // For production with scanned PDFs, integrate OCR service
  const { default: pdfParse } = await import("https://esm.sh/pdf-parse@1.1.1");
  const data = await pdfParse(new Uint8Array(buffer));
  return data.text || "";
}

async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  // Using mammoth.js for DOCX extraction
  const mammoth = await import("https://esm.sh/mammoth@1.6.0");
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value || "";
}

// ─── Chunking Strategy ─────────────────────────────────────────

interface Chunk {
  content: string;
  startIndex: number;
  endIndex: number;
}

function chunkText(text: string, maxChars: number = 1500, overlap: number = 200): Chunk[] {
  const chunks: Chunk[] = [];
  const sentences = text.split(/(?<=[.!?।])\s+/); // Split on sentence endings (supports Hindi)
  
  let currentChunk = "";
  let currentStart = 0;
  let chunkIndex = 0;
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    if (!sentence) continue;
    
    if (currentChunk.length + sentence.length + 1 > maxChars && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        startIndex: currentStart,
        endIndex: currentStart + currentChunk.length,
      });
      // Overlap: keep last N characters for context continuity
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + " " + sentence;
      currentStart = chunkIndex * maxChars - overlap;
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      startIndex: currentStart,
      endIndex: currentStart + currentChunk.length,
    });
  }
  
  return chunks;
}

// ─── Embedding ─────────────────────────────────────────────────

async function getEmbedding(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=" + apiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/text-embedding-004",
        content: { parts: [{ text: text.slice(0, 8000) }] }, // Truncate if too long
      }),
    }
  );
  
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Embedding failed: ${err}`);
  }
  
  const data = await res.json();
  return data.embedding?.values;
}

// ─── Main Handler ──────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // ─── 1. Auth + Super Admin Check ────────────────────────
    const authHeader = getAuthHeader(req);
    if (!authHeader) return jsonError("Unauthorized", 401);

    const supabaseUrl = CONFIG.SUPABASE_URL;
    const serviceKey = CONFIG.SERVICE_ROLE_KEY;
    const anonKey = CONFIG.ANON_KEY;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return jsonError("Unauthorized", 401);

    if (!isSuperAdmin(user.email)) {
      return jsonError("Super admin access required", 403);
    }

    // ─── 2. Parse Request ───────────────────────────────────
    const body = await req.json();
    const {
      source,           // "upload" | "url"
      url,              // required if source === "url"
      filename,         // required if source === "upload"
      content_base64,   // required if source === "upload"
      document_type,    // "act" | "article" | "ebook" | "judgment" | "custom"
      title,
      description,
      act_name,         // e.g., "Bharatiya Nyaya Sanhita 2023"
      tags,             // string[]
    } = body;

    if (!source || !["upload", "url"].includes(source)) {
      return jsonError("source must be 'upload' or 'url'", 400);
    }

    if (source === "url" && !url) {
      return jsonError("url required when source is 'url'", 400);
    }

    if (source === "upload" && (!filename || !content_base64)) {
      return jsonError("filename and content_base64 required when source is 'upload'", 400);
    }

    // ─── 3. Extract Text ────────────────────────────────────
    let rawText = "";
    let finalFilename = filename || url || "untitled";

    if (source === "url") {
      rawText = await extractTextFromUrl(url);
      finalFilename = url;
    } else {
      const buffer = Uint8Array.from(atob(content_base64), c => c.charCodeAt(0));
      if (filename.endsWith(".pdf")) {
        rawText = await extractPdfText(buffer.buffer);
      } else if (filename.endsWith(".docx")) {
        rawText = await extractDocxText(buffer.buffer);
      } else if (filename.endsWith(".txt") || filename.endsWith(".md")) {
        rawText = new TextDecoder().decode(buffer);
      } else {
        return jsonError("Unsupported file type. Use .pdf, .docx, .txt, or .md", 400);
      }
    }

    if (!rawText || rawText.trim().length < 50) {
      return jsonError("Could not extract meaningful text from document", 400);
    }

    // ─── 4. Create Admin Document Record ────────────────────
    const supa = createClient(supabaseUrl, serviceKey);

    const { data: docRecord, error: docErr } = await supa
      .from("admin_documents")
      .insert({
        title: title || finalFilename,
        description: description || null,
        source_type: source,
        source_url: source === "url" ? url : null,
        filename: finalFilename,
        document_type: document_type || "custom",
        act_name: act_name || null,
        tags: tags || [],
        content_length: rawText.length,
        chunk_count: 0,
        status: "processing",
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (docErr || !docRecord) {
      return jsonError(`Failed to create document record: ${docErr?.message}`, 500);
    }

    // ─── 5. Chunk Text ──────────────────────────────────────
    const chunks = chunkText(rawText);
    const chunkCount = chunks.length;

    // ─── 6. Generate Embeddings + Insert Chunks ─────────────
    const googleKey = CONFIG.GOOGLE_AI_KEY;
    if (!googleKey) {
      await supa.from("admin_documents").update({ status: "failed", error: "Google AI key not configured" }).eq("id", docRecord.id);
      return jsonError("Google AI API key not configured", 500);
    }

    const insertedChunks = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        const embedding = await getEmbedding(chunk.content, googleKey);
        
        const { data: chunkRecord, error: chunkErr } = await supa
          .from("document_chunks")
          .insert({
            document_id: docRecord.id,
            chunk_index: i,
            content: chunk.content,
            embedding: embedding,
            start_index: chunk.startIndex,
            end_index: chunk.endIndex,
            act_name: act_name || null,
            section_label: null, // Could be extracted via AI in v2
            metadata: {
              source: finalFilename,
              document_type: document_type || "custom",
              tags: tags || [],
            },
          })
          .select()
          .single();

        if (chunkErr) {
          console.error(`Chunk ${i} insert failed:`, chunkErr);
          continue;
        }
        
        insertedChunks.push(chunkRecord);
        
        // Small delay to avoid rate limiting
        if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 100));
        
      } catch (err) {
        console.error(`Chunk ${i} embedding failed:`, err);
        continue;
      }
    }

    // ─── 7. Update Document Status ──────────────────────────
    await supa
      .from("admin_documents")
      .update({
        status: insertedChunks.length > 0 ? "completed" : "failed",
        chunk_count: insertedChunks.length,
        processed_at: new Date().toISOString(),
        error: insertedChunks.length === 0 ? "All chunks failed to process" : null,
      })
      .eq("id", docRecord.id);

    // ─── 8. Return Result ───────────────────────────────────
    return new Response(
      JSON.stringify({
        success: true,
        document_id: docRecord.id,
        title: docRecord.title,
        chunks_total: chunkCount,
        chunks_inserted: insertedChunks.length,
        status: insertedChunks.length > 0 ? "completed" : "failed",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (err) {
    console.error("Ingest error:", err);
    return jsonError(err instanceof Error ? err.message : "Internal error", 500);
  }
});
