
-- 1. chat_summaries RLS
ALTER TABLE public.chat_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_summaries_select_own" ON public.chat_summaries
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "chat_summaries_insert_own" ON public.chat_summaries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chat_summaries_update_own" ON public.chat_summaries
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chat_summaries_delete_own" ON public.chat_summaries
  FOR DELETE USING (auth.uid() = user_id);

-- 2. impersonation_tokens — service role only (no policies = deny all to anon/authenticated)
ALTER TABLE public.impersonation_tokens ENABLE ROW LEVEL SECURITY;

-- 3. notifications: restrict self-insert
DROP POLICY IF EXISTS notif_insert_any_authed ON public.notifications;
CREATE POLICY "notif_insert_own" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 4. emergency_consultations: require auth + match citizen_user_id
DROP POLICY IF EXISTS ec_insert_citizen ON public.emergency_consultations;
CREATE POLICY "ec_insert_citizen" ON public.emergency_consultations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = citizen_user_id);

-- 5. advocate_reviews: own update/delete
CREATE POLICY "ar_update_own" ON public.advocate_reviews
  FOR UPDATE USING (auth.uid() = reviewer_user_id) WITH CHECK (auth.uid() = reviewer_user_id);
CREATE POLICY "ar_delete_own" ON public.advocate_reviews
  FOR DELETE USING (auth.uid() = reviewer_user_id);

-- 6. Storage UPDATE policies
CREATE POLICY "case_docs_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'case-documents' AND (auth.uid())::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'case-documents' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "rec_own_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'video-recordings' AND (auth.uid())::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'video-recordings' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 7. Replace is_super_admin with role-based check
-- Seed admin role for existing super admin email
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
WHERE lower(email) = 'bhramar123@gmail.com'
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
$$;

-- 8. Fix search_path on helper functions
CREATE OR REPLACE FUNCTION public.tier_quotas(_tier text)
RETURNS TABLE(daily integer, monthly integer)
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT
    CASE _tier
      WHEN 'Free' THEN 5
      WHEN 'Pro'  THEN 10
      WHEN 'Firm' THEN 20
      ELSE 5
    END,
    CASE _tier
      WHEN 'Free' THEN 75
      WHEN 'Pro'  THEN 200
      WHEN 'Firm' THEN 500
      ELSE 75
    END;
$$;

CREATE OR REPLACE FUNCTION public.state_code(_state text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
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
