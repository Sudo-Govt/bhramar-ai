-- FILE: supabase/migrations/20240518000000_admin_documents.sql
-- Bhramar.ai — Admin document tracking table

CREATE TABLE IF NOT EXISTS public.admin_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('upload', 'url')),
  source_url TEXT,
  filename TEXT,
  document_type TEXT NOT NULL DEFAULT 'custom' CHECK (document_type IN ('act', 'article', 'ebook', 'judgment', 'custom')),
  act_name TEXT,
  tags TEXT[] DEFAULT '{}',
  content_length INTEGER,
  chunk_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_documents ENABLE ROW LEVEL SECURITY;

-- Only super admin can view/manage admin documents
-- Note: Super admin check is done at application level (edge function)
-- RLS here prevents direct table access
CREATE POLICY "Super admin full access" ON public.admin_documents
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE email = current_setting('app.super_admin_email', true)
    )
  );

-- Index for status queries
CREATE INDEX idx_admin_documents_status ON public.admin_documents(status);
CREATE INDEX idx_admin_documents_type ON public.admin_documents(document_type);
CREATE INDEX idx_admin_documents_act ON public_documents(act_name);

-- Update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admin_documents_updated_at
  BEFORE UPDATE ON public.admin_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
