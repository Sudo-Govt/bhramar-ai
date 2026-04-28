-- 1. Archive support on cases
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS cases_archived_idx ON public.cases (user_id, archived_at);

-- 2. Subscription window on profiles (so we can show "X days left" and switch Pro AI to free-tier limits after expiry)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- 3. Permanent log of deleted cases (kept for AI training even after user delete)
CREATE TABLE IF NOT EXISTS public.case_deletion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  original_case_id UUID NOT NULL,
  case_number TEXT,
  case_name TEXT,
  client_name TEXT,
  complaint TEXT,
  ai_summary TEXT,
  conversations_text TEXT,
  documents_summary TEXT,
  payments_summary TEXT,
  notes_text TEXT,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.case_deletion_logs ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT/UPDATE/DELETE policies => only service-role can access (intended: training data)

-- 4. Per-message AI training log (every chat saved here even if user deletes the conv)
CREATE TABLE IF NOT EXISTS public.ai_training_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  case_id UUID,
  conversation_id UUID,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  citations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_training_logs ENABLE ROW LEVEL SECURITY;
-- Service-role only

-- 5. Mirror every chat message into ai_training_logs via trigger (survives user deletes)
CREATE OR REPLACE FUNCTION public.mirror_message_to_training()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_case_id UUID;
BEGIN
  SELECT case_id INTO v_case_id FROM public.conversations WHERE id = NEW.conversation_id;
  INSERT INTO public.ai_training_logs (user_id, case_id, conversation_id, role, content, citations)
  VALUES (NEW.user_id, v_case_id, NEW.conversation_id, NEW.role::text, NEW.content, COALESCE(NEW.citations, '[]'::jsonb));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS messages_mirror_to_training ON public.messages;
CREATE TRIGGER messages_mirror_to_training
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.mirror_message_to_training();

-- 6. Archive / unarchive helpers
CREATE OR REPLACE FUNCTION public.archive_case(_case_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.cases SET archived_at = now()
  WHERE id = _case_id AND user_id = auth.uid();
END; $$;

CREATE OR REPLACE FUNCTION public.unarchive_case(_case_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.cases SET archived_at = NULL
  WHERE id = _case_id AND user_id = auth.uid();
END; $$;

-- 7. Delete with permanent log (writes plain-text snapshot, then removes user-visible rows)
CREATE OR REPLACE FUNCTION public.delete_case_with_log(_case_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_case RECORD;
  v_convs TEXT;
  v_docs TEXT;
  v_pay TEXT;
  v_notes TEXT;
BEGIN
  SELECT * INTO v_case FROM public.cases WHERE id = _case_id AND user_id = v_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'Case not found'; END IF;

  SELECT string_agg(
    '--- ' || c.title || ' (' || to_char(c.created_at, 'YYYY-MM-DD HH24:MI') || ') ---' || E'\n' ||
    COALESCE((
      SELECT string_agg('[' || m.role || '] ' || m.content, E'\n\n' ORDER BY m.created_at)
      FROM public.messages m WHERE m.conversation_id = c.id
    ), ''), E'\n\n'
  ) INTO v_convs FROM public.conversations c WHERE c.case_id = _case_id AND c.user_id = v_user;

  SELECT string_agg(filename || ' (' || COALESCE(mime_type,'?') || ', ' || COALESCE(size_bytes::text,'?') || ' bytes)' ||
    COALESCE(E'\n  Summary: ' || ai_summary, ''), E'\n')
  INTO v_docs FROM public.documents WHERE case_id = _case_id AND user_id = v_user;

  SELECT string_agg('₹' || fee_received::text || ' / ₹' || fee_quoted::text || ' on ' || occurred_on::text ||
    COALESCE(' — ' || note, ''), E'\n')
  INTO v_pay FROM public.case_payments WHERE case_id = _case_id AND user_id = v_user;

  SELECT body INTO v_notes FROM public.notes WHERE case_id = _case_id AND user_id = v_user;

  INSERT INTO public.case_deletion_logs (
    user_id, original_case_id, case_number, case_name, client_name, complaint, ai_summary,
    conversations_text, documents_summary, payments_summary, notes_text
  ) VALUES (
    v_user, v_case.id, v_case.case_number, v_case.name, v_case.client_name, v_case.complaint, v_case.ai_summary,
    v_convs, v_docs, v_pay, v_notes
  );

  DELETE FROM public.messages WHERE conversation_id IN (SELECT id FROM public.conversations WHERE case_id = _case_id AND user_id = v_user);
  DELETE FROM public.conversations WHERE case_id = _case_id AND user_id = v_user;
  DELETE FROM public.documents WHERE case_id = _case_id AND user_id = v_user;
  DELETE FROM public.case_payments WHERE case_id = _case_id AND user_id = v_user;
  DELETE FROM public.notes WHERE case_id = _case_id AND user_id = v_user;
  DELETE FROM public.cases WHERE id = _case_id AND user_id = v_user;
END; $$;