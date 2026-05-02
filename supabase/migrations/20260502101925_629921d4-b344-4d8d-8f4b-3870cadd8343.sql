-- ai_training_logs: super-admin read only; trigger inserts via SECURITY DEFINER
ALTER TABLE public.ai_training_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_training_logs_admin_select ON public.ai_training_logs;
CREATE POLICY ai_training_logs_admin_select
  ON public.ai_training_logs
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

-- case_deletion_logs: owner read only; inserts happen via SECURITY DEFINER function
ALTER TABLE public.case_deletion_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS case_deletion_logs_select_own ON public.case_deletion_logs;
CREATE POLICY case_deletion_logs_select_own
  ON public.case_deletion_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_super_admin());