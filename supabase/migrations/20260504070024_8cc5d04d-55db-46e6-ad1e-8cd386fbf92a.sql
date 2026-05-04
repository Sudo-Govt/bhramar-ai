
-- State code helper
CREATE OR REPLACE FUNCTION public.state_code(_state text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE upper(coalesce(_state, ''))
    WHEN 'KERALA' THEN 'KL'
    WHEN 'TAMIL NADU' THEN 'TN'
    WHEN 'KARNATAKA' THEN 'KA'
    WHEN 'MAHARASHTRA' THEN 'MH'
    WHEN 'DELHI' THEN 'DL'
    WHEN 'UTTAR PRADESH' THEN 'UP'
    WHEN 'WEST BENGAL' THEN 'WB'
    WHEN 'GUJARAT' THEN 'GJ'
    WHEN 'RAJASTHAN' THEN 'RJ'
    WHEN 'PUNJAB' THEN 'PB'
    WHEN 'HARYANA' THEN 'HR'
    WHEN 'BIHAR' THEN 'BR'
    WHEN 'ODISHA' THEN 'OD'
    WHEN 'TELANGANA' THEN 'TG'
    WHEN 'ANDHRA PRADESH' THEN 'AP'
    WHEN 'MADHYA PRADESH' THEN 'MP'
    WHEN 'CHHATTISGARH' THEN 'CG'
    WHEN 'JHARKHAND' THEN 'JH'
    WHEN 'ASSAM' THEN 'AS'
    WHEN 'GOA' THEN 'GA'
    WHEN 'HIMACHAL PRADESH' THEN 'HP'
    WHEN 'UTTARAKHAND' THEN 'UK'
    WHEN 'JAMMU AND KASHMIR' THEN 'JK'
    WHEN 'MEGHALAYA' THEN 'ML'
    WHEN 'MANIPUR' THEN 'MN'
    WHEN 'NAGALAND' THEN 'NL'
    WHEN 'TRIPURA' THEN 'TR'
    WHEN 'MIZORAM' THEN 'MZ'
    WHEN 'ARUNACHAL PRADESH' THEN 'AR'
    WHEN 'SIKKIM' THEN 'SK'
    ELSE 'IN'
  END;
$$;

-- ID generator
CREATE OR REPLACE FUNCTION public.generate_advocate_id(_state text)
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  code TEXT := public.state_code(_state);
  out_text TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    out_text := 'BHR-' || code || '-' || lpad(floor(random()*1000000)::int::text, 6, '0');
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE advocate_id = out_text) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN out_text;
END;
$$;

-- Profile columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS advocate_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS bar_council text,
  ADD COLUMN IF NOT EXISTS enrollment_number text,
  ADD COLUMN IF NOT EXISTS years_experience int,
  ADD COLUMN IF NOT EXISTS specializations text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS user_type text NOT NULL DEFAULT 'citizen',
  ADD COLUMN IF NOT EXISTS firm_role text,
  ADD COLUMN IF NOT EXISTS firm_id uuid,
  ADD COLUMN IF NOT EXISTS vakeel_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vakeel_reviews_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_available_for_emergency boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_user_type_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_type_check
  CHECK (user_type IN ('citizen','advocate','firm_member'));

-- Trigger: assign advocate_id when user becomes advocate
CREATE OR REPLACE FUNCTION public.assign_advocate_id()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.user_type IN ('advocate','firm_member') AND (NEW.advocate_id IS NULL OR NEW.advocate_id = '') THEN
    NEW.advocate_id := public.generate_advocate_id(NEW.state);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_advocate_id ON public.profiles;
CREATE TRIGGER trg_assign_advocate_id
  BEFORE INSERT OR UPDATE OF user_type, state ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_advocate_id();

-- Public profile RPC (returns only safe public columns)
CREATE OR REPLACE FUNCTION public.get_public_profile(_advocate_id text)
RETURNS TABLE(
  advocate_id text, full_name text, user_type text, bar_council text,
  enrollment_number text, court_of_practice text, years_experience int,
  specializations text[], state text, district text,
  vakeel_score numeric, vakeel_reviews_count int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT advocate_id, full_name, user_type, bar_council,
         enrollment_number, court_of_practice, years_experience,
         specializations, state, district,
         vakeel_score, vakeel_reviews_count
  FROM public.profiles
  WHERE advocate_id = _advocate_id
    AND user_type IN ('advocate','firm_member');
$$;

-- Backfill advocate_id for existing rows that look like advocates
UPDATE public.profiles
SET user_type = 'advocate'
WHERE user_type = 'citizen'
  AND (court_of_practice IS NOT NULL OR subscription_tier IN ('Pro','Firm'));

UPDATE public.profiles
SET advocate_id = public.generate_advocate_id(state)
WHERE user_type IN ('advocate','firm_member') AND advocate_id IS NULL;
