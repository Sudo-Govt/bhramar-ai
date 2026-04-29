
-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('owner','admin','advocate','member','client');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  firm_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, firm_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- ============ FIRMS ============
CREATE TABLE public.firms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.firm_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  user_id UUID,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'advocate',
  status TEXT NOT NULL DEFAULT 'invited',
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  joined_at TIMESTAMPTZ,
  UNIQUE(firm_id, email)
);
ALTER TABLE public.firm_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_firm_owner(_firm_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.firms WHERE id = _firm_id AND owner_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.is_firm_member(_firm_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.firms WHERE id = _firm_id AND owner_id = auth.uid()
    UNION SELECT 1 FROM public.firm_members WHERE firm_id = _firm_id AND user_id = auth.uid() AND status = 'active'
  )
$$;

CREATE POLICY "firms_owner_all" ON public.firms FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "firms_member_select" ON public.firms FOR SELECT USING (public.is_firm_member(id));

CREATE POLICY "firm_members_owner_all" ON public.firm_members FOR ALL USING (public.is_firm_owner(firm_id)) WITH CHECK (public.is_firm_owner(firm_id));
CREATE POLICY "firm_members_self_select" ON public.firm_members FOR SELECT USING (auth.uid() = user_id);

-- ============ CLIENTS ============
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  firm_id UUID REFERENCES public.firms(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_all_own" ON public.clients FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clients_firm_read" ON public.clients FOR SELECT USING (firm_id IS NOT NULL AND public.is_firm_member(firm_id));

ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES public.firms(id) ON DELETE SET NULL;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS deadline DATE;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'intake';

CREATE POLICY "cases_firm_read" ON public.cases FOR SELECT USING (firm_id IS NOT NULL AND public.is_firm_member(firm_id));

-- ============ TASKS ============
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  firm_id UUID REFERENCES public.firms(id) ON DELETE SET NULL,
  assigned_to UUID,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_all_own" ON public.tasks FOR ALL USING (auth.uid() = user_id OR auth.uid() = assigned_to) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tasks_firm_read" ON public.tasks FOR SELECT USING (firm_id IS NOT NULL AND public.is_firm_member(firm_id));

-- ============ EVENTS (calendar) ============
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  firm_id UUID REFERENCES public.firms(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  kind TEXT NOT NULL DEFAULT 'meeting',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_all_own" ON public.events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "events_firm_read" ON public.events FOR SELECT USING (firm_id IS NOT NULL AND public.is_firm_member(firm_id));

-- ============ INVOICES ============
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  firm_id UUID REFERENCES public.firms(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  issued_on DATE NOT NULL DEFAULT CURRENT_DATE,
  due_on DATE,
  paid_on DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_all_own" ON public.invoices FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "invoices_firm_read" ON public.invoices FOR SELECT USING (firm_id IS NOT NULL AND public.is_firm_member(firm_id));

-- ============ FEE SCHEDULE ============
CREATE TABLE public.fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  firm_id UUID REFERENCES public.firms(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  description TEXT,
  rate NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'flat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fees_all_own" ON public.fees FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fees_firm_read" ON public.fees FOR SELECT USING (firm_id IS NOT NULL AND public.is_firm_member(firm_id));

-- ============ FILES (folders/files browser) ============
CREATE TABLE public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  firm_id UUID REFERENCES public.firms(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES public.files(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'file',
  storage_path TEXT,
  size_bytes BIGINT,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "files_all_own" ON public.files FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "files_firm_read" ON public.files FOR SELECT USING (firm_id IS NOT NULL AND public.is_firm_member(firm_id));

-- ============ SUPPORT REQUESTS ============
CREATE TABLE public.support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  assigned_to UUID,
  subject TEXT NOT NULL,
  body TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  sla_due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "support_all_own" ON public.support_requests FOR ALL USING (auth.uid() = user_id OR auth.uid() = assigned_to) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "support_firm_all" ON public.support_requests FOR ALL USING (firm_id IS NOT NULL AND public.is_firm_member(firm_id)) WITH CHECK (firm_id IS NOT NULL AND public.is_firm_member(firm_id));

-- ============ AUDIT LOG ============
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_insert_own" ON public.audit_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "audit_select_own" ON public.audit_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "audit_firm_select" ON public.audit_log FOR SELECT USING (firm_id IS NOT NULL AND public.is_firm_owner(firm_id));

-- ============ SMTP CONFIG ============
CREATE TABLE public.smtp_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 587,
  username TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT,
  use_tls BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.smtp_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "smtp_all_own" ON public.smtp_configs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ VIDEO RECORDINGS ============
CREATE TABLE public.video_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  duration_seconds INTEGER,
  transcript TEXT,
  ai_summary TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.video_recordings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rec_all_own" ON public.video_recordings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES ('client-files','client-files', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('video-recordings','video-recordings', false) ON CONFLICT DO NOTHING;

CREATE POLICY "client_files_own_select" ON storage.objects FOR SELECT USING (bucket_id='client-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "client_files_own_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id='client-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "client_files_own_update" ON storage.objects FOR UPDATE USING (bucket_id='client-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "client_files_own_delete" ON storage.objects FOR DELETE USING (bucket_id='client-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "rec_own_select" ON storage.objects FOR SELECT USING (bucket_id='video-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "rec_own_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id='video-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "rec_own_delete" ON storage.objects FOR DELETE USING (bucket_id='video-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============ TRIGGERS ============
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_firms_updated BEFORE UPDATE ON public.firms FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_smtp_updated BEFORE UPDATE ON public.smtp_configs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
