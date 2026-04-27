-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Add indexing status to documents
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS indexed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS chunk_count INT NOT NULL DEFAULT 0;

-- Chunk source enum
DO $$ BEGIN
  CREATE TYPE public.chunk_source AS ENUM ('corpus', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- document_chunks table
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source public.chunk_source NOT NULL,
  user_id UUID NULL,
  case_id UUID NULL,
  document_id UUID NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  act_name TEXT NULL,
  section_label TEXT NULL,
  chunk_index INT NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  embedding vector(768) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Integrity: corpus rows must not have user_id; user rows must.
ALTER TABLE public.document_chunks
  DROP CONSTRAINT IF EXISTS document_chunks_source_owner_chk;
ALTER TABLE public.document_chunks
  ADD CONSTRAINT document_chunks_source_owner_chk
  CHECK (
    (source = 'corpus' AND user_id IS NULL)
    OR (source = 'user' AND user_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS document_chunks_user_id_idx ON public.document_chunks(user_id);
CREATE INDEX IF NOT EXISTS document_chunks_document_id_idx ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS document_chunks_source_idx ON public.document_chunks(source);

-- HNSW cosine index for fast similarity search
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
  ON public.document_chunks
  USING hnsw (embedding vector_cosine_ops);

-- RLS
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chunks_select_corpus_or_own ON public.document_chunks;
CREATE POLICY chunks_select_corpus_or_own
  ON public.document_chunks
  FOR SELECT
  TO authenticated
  USING (source = 'corpus' OR auth.uid() = user_id);

DROP POLICY IF EXISTS chunks_modify_own ON public.document_chunks;
CREATE POLICY chunks_modify_own
  ON public.document_chunks
  FOR ALL
  TO authenticated
  USING (source = 'user' AND auth.uid() = user_id)
  WITH CHECK (source = 'user' AND auth.uid() = user_id);

-- Similarity search function. SECURITY DEFINER so the HNSW index is used
-- regardless of caller; we still filter strictly by the passed user id.
CREATE OR REPLACE FUNCTION public.match_chunks(
  query_embedding vector(768),
  match_user_id UUID,
  match_count INT DEFAULT 6,
  corpus_weight FLOAT DEFAULT 1.0
)
RETURNS TABLE (
  id UUID,
  source public.chunk_source,
  act_name TEXT,
  section_label TEXT,
  document_id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.source,
    c.act_name,
    c.section_label,
    c.document_id,
    c.content,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks c
  WHERE c.source = 'corpus' OR c.user_id = match_user_id
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

REVOKE ALL ON FUNCTION public.match_chunks(vector, UUID, INT, FLOAT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_chunks(vector, UUID, INT, FLOAT) TO authenticated, service_role;