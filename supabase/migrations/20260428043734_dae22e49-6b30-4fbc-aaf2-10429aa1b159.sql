
-- 1. Case tracking number
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS case_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS complaint TEXT,
  ADD COLUMN IF NOT EXISTS ai_summary TEXT;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- Generator: 4 letters + 4 digits + 1 letter, e.g. Bhmr2641x
CREATE OR REPLACE FUNCTION public.generate_case_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  letters TEXT := 'abcdefghijklmnopqrstuvwxyz';
  out_text TEXT;
  i INT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    out_text := upper(substr(letters, 1 + floor(random()*26)::int, 1));
    FOR i IN 1..3 LOOP
      out_text := out_text || substr(letters, 1 + floor(random()*26)::int, 1);
    END LOOP;
    out_text := out_text || lpad(floor(random()*10000)::int::text, 4, '0');
    out_text := out_text || substr(letters, 1 + floor(random()*26)::int, 1);
    SELECT EXISTS(SELECT 1 FROM public.cases WHERE case_number = out_text) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN out_text;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_case_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.case_number IS NULL OR NEW.case_number = '' THEN
    NEW.case_number := public.generate_case_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cases_set_number ON public.cases;
CREATE TRIGGER trg_cases_set_number
  BEFORE INSERT ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION public.set_case_number();

-- Backfill existing rows
UPDATE public.cases SET case_number = public.generate_case_number() WHERE case_number IS NULL;

-- 2. Payments tracker
CREATE TABLE IF NOT EXISTS public.case_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  case_id UUID NOT NULL,
  fee_quoted NUMERIC(12,2) NOT NULL DEFAULT 0,
  fee_received NUMERIC(12,2) NOT NULL DEFAULT 0,
  note TEXT,
  occurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.case_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payments_all_own ON public.case_payments;
CREATE POLICY payments_all_own
  ON public.case_payments
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.case_payments;
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.case_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_case_payments_case ON public.case_payments(case_id);

-- 3. Stop seeding sample cases on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;
