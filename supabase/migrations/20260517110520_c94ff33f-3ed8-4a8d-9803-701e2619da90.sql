
-- 1) Token quotas: 5 daily for everyone, monthly caps stay tiered
CREATE OR REPLACE FUNCTION public.tier_quotas(_tier text)
 RETURNS TABLE(daily integer, monthly integer)
 LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $$
  SELECT 5,
    CASE _tier
      WHEN 'Free' THEN 75
      WHEN 'Pro'  THEN 200
      WHEN 'Firm' THEN 500
      ELSE 75
    END;
$$;

-- 2) New Bhramar case-file schema (parallel to old cases)
CREATE TABLE public.case_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advocate_id UUID NOT NULL,
  case_title TEXT NOT NULL,
  case_number TEXT,
  court TEXT,
  judge TEXT,
  case_type TEXT NOT NULL DEFAULT 'Criminal',
  primary_act TEXT,
  sections_charged TEXT[],
  current_stage TEXT NOT NULL DEFAULT 'FIR Filed',
  next_date TIMESTAMPTZ,
  next_date_purpose TEXT,
  date_of_fir TIMESTAMPTZ,
  date_of_arrest TIMESTAMPTZ,
  date_of_charge_sheet TIMESTAMPTZ,
  limitation_deadline TIMESTAMPTZ,
  is_bailable TEXT DEFAULT 'unknown',
  is_cognizable TEXT DEFAULT 'unknown',
  police_station TEXT,
  io_name TEXT,
  pp_name TEXT,
  opposing_counsel TEXT,
  key_facts TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.case_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.case_files(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  occupation TEXT,
  district TEXT,
  state TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  is_in_custody BOOLEAN NOT NULL DEFAULT false,
  custody_location TEXT,
  legal_aid_eligible TEXT DEFAULT 'unknown',
  relationship_to_case TEXT NOT NULL DEFAULT 'Accused',
  client_access_pin TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.case_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.case_files(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  filename TEXT NOT NULL,
  doc_date DATE,
  ai_summary TEXT,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.case_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.case_files(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.case_hearings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.case_files(id) ON DELETE CASCADE,
  hearing_date DATE NOT NULL,
  court TEXT,
  what_happened TEXT,
  order_passed TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.bhramar_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.case_files(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('advocate', 'client')),
  client_id UUID REFERENCES public.case_clients(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) RLS — advocate-scoped (no public/open policies)
ALTER TABLE public.case_files     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_clients   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_notes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_hearings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bhramar_chats  ENABLE ROW LEVEL SECURITY;

CREATE POLICY cf_owner_all ON public.case_files
  FOR ALL TO authenticated
  USING (advocate_id = auth.uid()) WITH CHECK (advocate_id = auth.uid());

-- helper: case ownership
CREATE OR REPLACE FUNCTION public.owns_case_file(_case_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS(SELECT 1 FROM public.case_files WHERE id = _case_id AND advocate_id = auth.uid()) $$;

CREATE POLICY cc_owner_all ON public.case_clients   FOR ALL TO authenticated USING (public.owns_case_file(case_id)) WITH CHECK (public.owns_case_file(case_id));
CREATE POLICY cd_owner_all ON public.case_documents FOR ALL TO authenticated USING (public.owns_case_file(case_id)) WITH CHECK (public.owns_case_file(case_id));
CREATE POLICY cn_owner_all ON public.case_notes     FOR ALL TO authenticated USING (public.owns_case_file(case_id)) WITH CHECK (public.owns_case_file(case_id));
CREATE POLICY ch_owner_all ON public.case_hearings  FOR ALL TO authenticated USING (public.owns_case_file(case_id)) WITH CHECK (public.owns_case_file(case_id));
CREATE POLICY bc_owner_all ON public.bhramar_chats  FOR ALL TO authenticated USING (public.owns_case_file(case_id)) WITH CHECK (public.owns_case_file(case_id));

CREATE INDEX idx_case_files_advocate    ON public.case_files(advocate_id);
CREATE INDEX idx_bhramar_chats_case     ON public.bhramar_chats(case_id, session_type, created_at);
CREATE INDEX idx_case_notes_case        ON public.case_notes(case_id, created_at DESC);
CREATE INDEX idx_case_hearings_case     ON public.case_hearings(case_id, hearing_date DESC);
CREATE INDEX idx_case_documents_case    ON public.case_documents(case_id);
CREATE INDEX idx_case_clients_case      ON public.case_clients(case_id);

-- 4) Update timestamp trigger
CREATE TRIGGER trg_case_files_updated_at
  BEFORE UPDATE ON public.case_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Refresh existing user balances to new daily=5 quota
UPDATE public.token_balances SET daily_quota = 5 WHERE daily_quota <> 5;
