# Plan — Bhramar.ai RAG (Lovable AI + pgvector)

Turn Bhramar.ai into a true grounded Indian legal agent. The LLM stays Lovable AI (Gemini); we add a retrieval layer that fetches relevant chunks from (a) pre-loaded bare acts and (b) the user's own uploaded case files, then injects them into the prompt with real citations.

## Architecture

```text
                ┌───────────────────────────────────────────┐
                │           User asks a question            │
                └──────────────────┬────────────────────────┘
                                   ▼
                  ┌────────────────────────────────┐
                  │  chat()  edge function         │
                  │  1. embed question (Lovable AI)│
                  │  2. pgvector similarity search │
                  │     (corpus + user docs)       │
                  │  3. build grounded prompt      │
                  │  4. stream Gemini response     │
                  └──────────────────┬─────────────┘
                                     ▼
                          Streamed answer + citations
                                     ▲
              ┌──────────────────────┴──────────────────────┐
              │        document_chunks (pgvector)            │
              │   ┌─────────────────┐  ┌─────────────────┐  │
              │   │ source='corpus' │  │ source='user'   │  │
              │   │ IPC, CrPC, CPC, │  │ uploaded PDFs   │  │
              │   │ Evidence,       │  │ scoped per user │  │
              │   │ Constitution,   │  │ + per case      │  │
              │   │ Contract Act    │  │                 │  │
              │   └─────────────────┘  └─────────────────┘  │
              └──────────────────────────────────────────────┘
                          ▲                       ▲
                          │                       │
                  one-time seed             ingest-document()
                  (admin script)            edge function
```

## What gets built

### 1. Database (migration)
- Enable `vector` extension.
- New table `document_chunks`:
  - `id uuid pk`, `source text` (`'corpus'` or `'user'`), `user_id uuid null`, `case_id uuid null`, `document_id uuid null` (FK to `documents`), `act_name text` (e.g. "IPC"), `section_label text` (e.g. "Section 302"), `chunk_index int`, `content text`, `embedding vector(768)`, `created_at`.
- HNSW index on `embedding` for fast cosine similarity.
- RLS: corpus chunks readable by all authenticated users; user chunks readable only by owner (`auth.uid() = user_id`).
- SQL function `match_chunks(query_embedding vector, user_id uuid, case_id uuid, match_count int)` returning the top-K rows mixing corpus + that user's docs.

### 2. New edge function: `ingest-document`
Called when the user clicks "Index for AI" on an uploaded document.
- Downloads the file from the `case-documents` storage bucket.
- Extracts text (PDF → text via `pdf-parse` from esm.sh; .txt/.md handled directly).
- Splits into ~500-token overlapping chunks.
- Calls Lovable AI embeddings (`text-embedding-004`, 768-dim) in batches.
- Inserts rows into `document_chunks` with `source='user'`, `user_id`, `case_id`, `document_id`.

### 3. Updated edge function: `chat`
Before calling the LLM:
- Embed the latest user message.
- `rpc('match_chunks', …)` → top 6 chunks (mix of corpus + user's docs).
- Build augmented system prompt:

  ```text
  Use ONLY the following sources to answer. Cite each fact as [S1], [S2]…
  S1 — IPC §302 (corpus): "Whoever commits murder…"
  S2 — User doc "FIR_Sharma.pdf" p.3: "…"
  ```
- Stream response as today. Parse `[S#]` markers and return a `citations` array (id, label, source type, snippet) alongside the SSE stream via a final `data: {"citations":[…]} ` event.

### 4. New edge function: `seed-corpus` (run once)
- Hard-coded list of bare-act source URLs (indiacode.nic.in / official PDFs):
  IPC, CrPC, CPC, Indian Evidence Act, Constitution of India, Indian Contract Act.
- For each: fetch text, split per Section, embed, insert with `source='corpus'`, `act_name`, `section_label`.
- Idempotent — skips acts already present.
- Triggered by you clicking a hidden "Seed corpus" button in Profile (admin-only via your user id) or by me invoking it once after deploy.

### 5. Frontend changes (`src/pages/Dashboard.tsx`)
- **Right panel → Documents tab**: each uploaded file gets an **"Index for AI"** button (calls `ingest-document`). Status badge: *Not indexed / Indexing… / Indexed (N chunks)*.
- **Right panel → Research tab**: now populated from real citations returned by chat (clickable chips opening a popover with the source snippet).
- **Chat bubbles**: assistant messages render `[S1] [S2]` as gold citation chips; hovering shows the snippet, clicking jumps to Research tab.
- **Composer**: small toggle "Ground in my documents" (default on). When off, falls back to plain LLM answer.

### 6. New table column on `documents`
- Add `indexed_at timestamptz null` and `chunk_count int default 0` so the UI can show indexing status.

## Cost estimate (Lovable AI)
- Seeding all six bare acts: ~5–10M tokens of embeddings ≈ **one-time $0.10–$0.20**.
- Per question: 1 embedding (negligible) + 1 chat call with ~3K tokens of context ≈ **<$0.001 per query** on Gemini Flash.
- Storage: free at this scale inside Lovable Cloud.

## Security
- Corpus chunks: `SELECT` allowed for any authenticated user, no writes.
- User chunks: full RLS — only owner reads/writes.
- `match_chunks` is `SECURITY DEFINER` but always filters by the passed `user_id` (validated server-side from JWT in the edge function, never trusted from the client).
- Storage bucket `case-documents` already private; ingestion uses the service role key.

## Files touched
- `supabase/migrations/<new>.sql` — extension, table, index, RLS, `match_chunks` function, `documents` columns.
- `supabase/functions/chat/index.ts` — add embed + retrieve + grounded prompt steps.
- `supabase/functions/ingest-document/index.ts` — new.
- `supabase/functions/seed-corpus/index.ts` — new.
- `src/pages/Dashboard.tsx` — index buttons, citation chips, Research tab wiring.
- `src/lib/markdown.tsx` — render `[S#]` chips.
- `supabase/config.toml` — register new functions.

## Out of scope (for this pass)
- OCR for scanned PDFs (we'll add `pytesseract`-equivalent later if needed; for now scanned PDFs will index whatever embedded text exists).
- Re-ranking model (top-K cosine is enough at this scale).
- Per-section deep-link navigation to bare-act source PDFs.

## After approval, you do nothing
I'll run the migration, deploy the three functions, invoke `seed-corpus` once (takes ~3–5 min), and verify a sample question like *"What is the punishment under Section 302 IPC?"* returns a grounded answer with `[S1] IPC §302 (corpus)` citation.
