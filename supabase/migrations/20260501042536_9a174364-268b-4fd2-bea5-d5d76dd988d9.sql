
-- ai_settings extensions
ALTER TABLE public.ai_settings
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'gemini',
  ADD COLUMN IF NOT EXISTS groq_model text,
  ADD COLUMN IF NOT EXISTS kb_threshold double precision NOT NULL DEFAULT 0.72,
  ADD COLUMN IF NOT EXISTS allow_general_fallback boolean NOT NULL DEFAULT true;

-- kb_files
CREATE TABLE IF NOT EXISTS public.kb_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  item_count integer NOT NULL DEFAULT 0,
  is_global boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kb_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kb_files_owner_all ON public.kb_files;
CREATE POLICY kb_files_owner_all ON public.kb_files
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.is_super_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_super_admin());

DROP POLICY IF EXISTS kb_files_global_read ON public.kb_files;
CREATE POLICY kb_files_global_read ON public.kb_files
  FOR SELECT TO authenticated
  USING (is_global = true);

CREATE INDEX IF NOT EXISTS kb_files_user_idx ON public.kb_files(user_id);

-- match_chunks v2 with KB boost
CREATE OR REPLACE FUNCTION public.match_chunks(
  query_embedding vector,
  match_user_id uuid,
  match_count integer DEFAULT 6,
  corpus_weight double precision DEFAULT 1.0
)
RETURNS TABLE(
  id uuid,
  source public.chunk_source,
  act_name text,
  section_label text,
  document_id uuid,
  content text,
  similarity double precision
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    c.id, c.source, c.act_name, c.section_label, c.document_id, c.content,
    CASE WHEN c.source = 'kb'::public.chunk_source
         THEN (1 - (c.embedding <=> query_embedding)) * 1.15
         ELSE (1 - (c.embedding <=> query_embedding))
    END AS similarity
  FROM public.document_chunks c
  LEFT JOIN public.kb_files kf
    ON c.source = 'kb'::public.chunk_source
   AND kf.id::text = c.act_name
  WHERE c.source = 'corpus'::public.chunk_source
     OR (c.source = 'user'::public.chunk_source AND c.user_id = match_user_id)
     OR (c.source = 'kb'::public.chunk_source AND (c.user_id = match_user_id OR kf.is_global = true))
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- Super-admin helpers
CREATE OR REPLACE FUNCTION public.admin_list_training_logs(
  _search text DEFAULT NULL,
  _from timestamptz DEFAULT NULL,
  _to timestamptz DEFAULT NULL,
  _user uuid DEFAULT NULL,
  _role text DEFAULT NULL,
  _limit integer DEFAULT 200
)
RETURNS TABLE(id uuid, created_at timestamptz, user_id uuid, user_email text,
  case_id uuid, conversation_id uuid, role text, content text, citations jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.id, l.created_at, l.user_id, p.email, l.case_id, l.conversation_id, l.role, l.content, l.citations
  FROM public.ai_training_logs l
  LEFT JOIN public.profiles p ON p.id = l.user_id
  WHERE public.is_super_admin()
    AND (_search IS NULL OR l.content ILIKE '%' || _search || '%')
    AND (_from IS NULL OR l.created_at >= _from)
    AND (_to IS NULL OR l.created_at <= _to)
    AND (_user IS NULL OR l.user_id = _user)
    AND (_role IS NULL OR l.role = _role)
  ORDER BY l.created_at DESC
  LIMIT GREATEST(_limit, 1);
$$;

CREATE OR REPLACE FUNCTION public.admin_list_profiles(
  _search text DEFAULT NULL,
  _limit integer DEFAULT 100,
  _offset integer DEFAULT 0
)
RETURNS TABLE(id uuid, email text, full_name text, subscription_tier subscription_tier,
  subscription_started_at timestamptz, subscription_expires_at timestamptz,
  state text, district text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.email, p.full_name, p.subscription_tier,
         p.subscription_started_at, p.subscription_expires_at,
         p.state, p.district, p.created_at
  FROM public.profiles p
  WHERE public.is_super_admin()
    AND (_search IS NULL OR p.email ILIKE '%' || _search || '%' OR p.full_name ILIKE '%' || _search || '%')
  ORDER BY p.created_at DESC
  LIMIT GREATEST(_limit, 1) OFFSET GREATEST(_offset, 0);
$$;

CREATE OR REPLACE FUNCTION public.admin_kb_files()
RETURNS TABLE(id uuid, name text, user_id uuid, user_email text,
  item_count integer, is_global boolean, chunk_count bigint, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.id, f.name, f.user_id, p.email, f.item_count, f.is_global,
         (SELECT COUNT(*) FROM public.document_chunks dc
          WHERE dc.source = 'kb'::public.chunk_source AND dc.act_name = f.id::text),
         f.created_at
  FROM public.kb_files f
  LEFT JOIN public.profiles p ON p.id = f.user_id
  WHERE public.is_super_admin()
  ORDER BY f.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_audit(_limit integer DEFAULT 200)
RETURNS TABLE(id uuid, created_at timestamptz, user_id uuid, user_email text,
  action text, entity_type text, entity_id uuid, metadata jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.created_at, a.user_id, p.email, a.action, a.entity_type, a.entity_id, a.metadata
  FROM public.audit_log a
  LEFT JOIN public.profiles p ON p.id = a.user_id
  WHERE public.is_super_admin()
  ORDER BY a.created_at DESC
  LIMIT GREATEST(_limit, 1);
$$;

-- Lock down execution: only signed-in users; anon revoked. The functions themselves
-- gate access via is_super_admin().
REVOKE ALL ON FUNCTION public.admin_list_training_logs(text, timestamptz, timestamptz, uuid, text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_profiles(text, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_kb_files() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_audit(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_training_logs(text, timestamptz, timestamptz, uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_kb_files() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_audit(integer) TO authenticated;
