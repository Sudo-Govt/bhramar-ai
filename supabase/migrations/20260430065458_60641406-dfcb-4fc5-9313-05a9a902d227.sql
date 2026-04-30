-- 1. Demographic columns shared by profiles & clients
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS religion TEXT,
  ADD COLUMN IF NOT EXISTS marital_status TEXT,
  ADD COLUMN IF NOT EXISTS has_children BOOLEAN,
  ADD COLUMN IF NOT EXISTS occupation TEXT,
  ADD COLUMN IF NOT EXISTS earning_bracket TEXT,
  ADD COLUMN IF NOT EXISTS family_background TEXT,
  ADD COLUMN IF NOT EXISTS physical_condition TEXT,
  ADD COLUMN IF NOT EXISTS prior_case_history TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS court_of_practice TEXT;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS religion TEXT,
  ADD COLUMN IF NOT EXISTS marital_status TEXT,
  ADD COLUMN IF NOT EXISTS has_children BOOLEAN,
  ADD COLUMN IF NOT EXISTS occupation TEXT,
  ADD COLUMN IF NOT EXISTS earning_bracket TEXT,
  ADD COLUMN IF NOT EXISTS family_background TEXT,
  ADD COLUMN IF NOT EXISTS physical_condition TEXT,
  ADD COLUMN IF NOT EXISTS prior_case_history TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT;

-- 2. AI settings (super-admin controls model + system prompt)
CREATE TABLE IF NOT EXISTS public.ai_settings (
  id INT PRIMARY KEY DEFAULT 1,
  model TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  system_prompt TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  CONSTRAINT singleton CHECK (id = 1)
);

INSERT INTO public.ai_settings (id, model, system_prompt)
VALUES (1, 'google/gemini-3-flash-preview', NULL)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

-- Helper: super-admin check by auth email
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT lower(coalesce((auth.jwt() ->> 'email'), '')) = 'bhramar123@gmail.com'
$$;

DROP POLICY IF EXISTS ai_settings_read ON public.ai_settings;
CREATE POLICY ai_settings_read ON public.ai_settings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS ai_settings_admin_write ON public.ai_settings;
CREATE POLICY ai_settings_admin_write ON public.ai_settings
  FOR UPDATE TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS ai_settings_admin_insert ON public.ai_settings;
CREATE POLICY ai_settings_admin_insert ON public.ai_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());