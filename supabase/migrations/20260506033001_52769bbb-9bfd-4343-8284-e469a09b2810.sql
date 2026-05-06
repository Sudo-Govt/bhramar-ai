-- Phase 3: Advocate Cells + Legal News cache

CREATE TABLE IF NOT EXISTS public.court_cells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  court_name text NOT NULL,
  state text,
  city text,
  level text NOT NULL CHECK (level IN ('supreme_court', 'high_court', 'district_court')),
  slug text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_court_cells_level_state ON public.court_cells(level, state);
CREATE INDEX IF NOT EXISTS idx_court_cells_court_name ON public.court_cells(court_name);

ALTER TABLE public.court_cells ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can browse court cells" ON public.court_cells;
CREATE POLICY "Authenticated users can browse court cells"
ON public.court_cells
FOR SELECT
TO authenticated
USING (true);

CREATE OR REPLACE FUNCTION public.is_cell_member(_cell_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.court_cells c
    JOIN public.profiles p ON p.id = _user_id
    WHERE c.id = _cell_id
      AND p.user_type IN ('advocate', 'firm_member')
      AND (
        lower(coalesce(p.court_of_practice, '')) = lower(c.court_name)
        OR (c.level = 'supreme_court' AND lower(coalesce(p.court_of_practice, '')) LIKE '%supreme court%')
        OR (c.state IS NOT NULL AND lower(coalesce(p.state, '')) = lower(c.state))
      )
  );
$$;

CREATE TABLE IF NOT EXISTS public.cell_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cell_id uuid NOT NULL REFERENCES public.court_cells(id) ON DELETE CASCADE,
  posted_by uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cell_notices_cell_created ON public.cell_notices(cell_id, created_at DESC);

ALTER TABLE public.cell_notices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cell members can view notices" ON public.cell_notices;
CREATE POLICY "Cell members can view notices"
ON public.cell_notices
FOR SELECT
TO authenticated
USING (public.is_cell_member(cell_id, auth.uid()));

DROP POLICY IF EXISTS "Cell members can post notices" ON public.cell_notices;
CREATE POLICY "Cell members can post notices"
ON public.cell_notices
FOR INSERT
TO authenticated
WITH CHECK (posted_by = auth.uid() AND public.is_cell_member(cell_id, auth.uid()));

DROP POLICY IF EXISTS "Notice authors can edit notices" ON public.cell_notices;
CREATE POLICY "Notice authors can edit notices"
ON public.cell_notices
FOR UPDATE
TO authenticated
USING (posted_by = auth.uid() AND public.is_cell_member(cell_id, auth.uid()))
WITH CHECK (posted_by = auth.uid() AND public.is_cell_member(cell_id, auth.uid()));

DROP POLICY IF EXISTS "Notice authors can delete notices" ON public.cell_notices;
CREATE POLICY "Notice authors can delete notices"
ON public.cell_notices
FOR DELETE
TO authenticated
USING (posted_by = auth.uid() AND public.is_cell_member(cell_id, auth.uid()));

CREATE TABLE IF NOT EXISTS public.cell_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cell_id uuid NOT NULL REFERENCES public.court_cells(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cell_messages_cell_created ON public.cell_messages(cell_id, created_at DESC);

ALTER TABLE public.cell_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cell members can view messages" ON public.cell_messages;
CREATE POLICY "Cell members can view messages"
ON public.cell_messages
FOR SELECT
TO authenticated
USING (public.is_cell_member(cell_id, auth.uid()));

DROP POLICY IF EXISTS "Cell members can send messages" ON public.cell_messages;
CREATE POLICY "Cell members can send messages"
ON public.cell_messages
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_cell_member(cell_id, auth.uid()));

CREATE TABLE IF NOT EXISTS public.legal_news_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  state text,
  court text,
  category text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  refreshed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legal_news_cache_lookup ON public.legal_news_cache(state, court, category, refreshed_at DESC);

ALTER TABLE public.legal_news_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read legal news cache" ON public.legal_news_cache;
CREATE POLICY "Authenticated users can read legal news cache"
ON public.legal_news_cache
FOR SELECT
TO authenticated
USING (true);

CREATE OR REPLACE FUNCTION public.list_cell_members(_cell_id uuid)
RETURNS TABLE (
  profile_id uuid,
  full_name text,
  advocate_id text,
  state text,
  court_of_practice text,
  specializations text[],
  vakeel_score numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.advocate_id, p.state, p.court_of_practice, p.specializations, p.vakeel_score
  FROM public.profiles p
  JOIN public.court_cells c ON c.id = _cell_id
  WHERE p.user_type IN ('advocate', 'firm_member')
    AND (
      lower(coalesce(p.court_of_practice, '')) = lower(c.court_name)
      OR (c.level = 'supreme_court' AND lower(coalesce(p.court_of_practice, '')) LIKE '%supreme court%')
      OR (c.state IS NOT NULL AND lower(coalesce(p.state, '')) = lower(c.state))
    )
  ORDER BY p.vakeel_score DESC NULLS LAST, p.full_name NULLS LAST
  LIMIT 200;
$$;

CREATE OR REPLACE FUNCTION public.my_court_cell()
RETURNS SETOF public.court_cells
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.*
  FROM public.court_cells c
  JOIN public.profiles p ON p.id = auth.uid()
  WHERE p.user_type IN ('advocate', 'firm_member')
    AND (
      lower(coalesce(p.court_of_practice, '')) = lower(c.court_name)
      OR (c.level = 'supreme_court' AND lower(coalesce(p.court_of_practice, '')) LIKE '%supreme court%')
      OR (c.state IS NOT NULL AND lower(coalesce(p.state, '')) = lower(c.state))
    )
  ORDER BY
    CASE WHEN lower(coalesce(p.court_of_practice, '')) = lower(c.court_name) THEN 0 ELSE 1 END,
    CASE c.level WHEN 'supreme_court' THEN 0 WHEN 'high_court' THEN 1 ELSE 2 END
  LIMIT 1;
$$;

DROP TRIGGER IF EXISTS trg_court_cells_updated ON public.court_cells;
CREATE TRIGGER trg_court_cells_updated
BEFORE UPDATE ON public.court_cells
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_cell_notices_updated ON public.cell_notices;
CREATE TRIGGER trg_cell_notices_updated
BEFORE UPDATE ON public.cell_notices
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_legal_news_cache_updated ON public.legal_news_cache;
CREATE TRIGGER trg_legal_news_cache_updated
BEFORE UPDATE ON public.legal_news_cache
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.court_cells (court_name, state, city, level, slug, description) VALUES
('Supreme Court of India', 'Delhi', 'New Delhi', 'supreme_court', 'supreme-court-of-india', 'National cell for Supreme Court practitioners.'),
('Allahabad High Court', 'Uttar Pradesh', 'Prayagraj', 'high_court', 'allahabad-high-court', 'Court cell for Uttar Pradesh High Court advocates.'),
('Bombay High Court', 'Maharashtra', 'Mumbai', 'high_court', 'bombay-high-court', 'Court cell for Bombay High Court advocates.'),
('Calcutta High Court', 'West Bengal', 'Kolkata', 'high_court', 'calcutta-high-court', 'Court cell for Calcutta High Court advocates.'),
('Delhi High Court', 'Delhi', 'New Delhi', 'high_court', 'delhi-high-court', 'Court cell for Delhi High Court advocates.'),
('Gujarat High Court', 'Gujarat', 'Ahmedabad', 'high_court', 'gujarat-high-court', 'Court cell for Gujarat High Court advocates.'),
('Karnataka High Court', 'Karnataka', 'Bengaluru', 'high_court', 'karnataka-high-court', 'Court cell for Karnataka High Court advocates.'),
('Kerala High Court', 'Kerala', 'Kochi', 'high_court', 'kerala-high-court', 'Court cell for Kerala High Court advocates.'),
('Madras High Court', 'Tamil Nadu', 'Chennai', 'high_court', 'madras-high-court', 'Court cell for Madras High Court advocates.'),
('Rajasthan High Court', 'Rajasthan', 'Jodhpur', 'high_court', 'rajasthan-high-court', 'Court cell for Rajasthan High Court advocates.'),
('Patna High Court', 'Bihar', 'Patna', 'high_court', 'patna-high-court', 'Court cell for Patna High Court advocates.'),
('Punjab & Haryana High Court', 'Punjab', 'Chandigarh', 'high_court', 'punjab-haryana-high-court', 'Court cell for Punjab and Haryana High Court advocates.'),
('Gauhati High Court', 'Assam', 'Guwahati', 'high_court', 'gauhati-high-court', 'Court cell for Gauhati High Court advocates.'),
('Andhra Pradesh High Court', 'Andhra Pradesh', 'Amaravati', 'high_court', 'andhra-pradesh-high-court', 'Court cell for Andhra Pradesh High Court advocates.'),
('Telangana High Court', 'Telangana', 'Hyderabad', 'high_court', 'telangana-high-court', 'Court cell for Telangana High Court advocates.'),
('Chhattisgarh High Court', 'Chhattisgarh', 'Bilaspur', 'high_court', 'chhattisgarh-high-court', 'Court cell for Chhattisgarh High Court advocates.'),
('Himachal Pradesh High Court', 'Himachal Pradesh', 'Shimla', 'high_court', 'himachal-pradesh-high-court', 'Court cell for Himachal Pradesh High Court advocates.'),
('Jharkhand High Court', 'Jharkhand', 'Ranchi', 'high_court', 'jharkhand-high-court', 'Court cell for Jharkhand High Court advocates.'),
('Madhya Pradesh High Court', 'Madhya Pradesh', 'Jabalpur', 'high_court', 'madhya-pradesh-high-court', 'Court cell for Madhya Pradesh High Court advocates.'),
('Orissa High Court', 'Odisha', 'Cuttack', 'high_court', 'orissa-high-court', 'Court cell for Orissa High Court advocates.'),
('Uttarakhand High Court', 'Uttarakhand', 'Nainital', 'high_court', 'uttarakhand-high-court', 'Court cell for Uttarakhand High Court advocates.'),
('Jammu & Kashmir High Court', 'Jammu and Kashmir', 'Srinagar', 'high_court', 'jammu-kashmir-high-court', 'Court cell for Jammu and Kashmir High Court advocates.'),
('Manipur High Court', 'Manipur', 'Imphal', 'high_court', 'manipur-high-court', 'Court cell for Manipur High Court advocates.'),
('Meghalaya High Court', 'Meghalaya', 'Shillong', 'high_court', 'meghalaya-high-court', 'Court cell for Meghalaya High Court advocates.'),
('Tripura High Court', 'Tripura', 'Agartala', 'high_court', 'tripura-high-court', 'Court cell for Tripura High Court advocates.')
ON CONFLICT (slug) DO UPDATE SET
  court_name = EXCLUDED.court_name,
  state = EXCLUDED.state,
  city = EXCLUDED.city,
  level = EXCLUDED.level,
  description = EXCLUDED.description;

ALTER PUBLICATION supabase_realtime ADD TABLE public.cell_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cell_notices;