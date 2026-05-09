
CREATE TABLE IF NOT EXISTS public.case_prompt_suggestions (
  case_id uuid PRIMARY KEY REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  suggestions jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.case_prompt_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY cps_select_own ON public.case_prompt_suggestions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY cps_insert_own ON public.case_prompt_suggestions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY cps_update_own ON public.case_prompt_suggestions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY cps_delete_own ON public.case_prompt_suggestions
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_cps_user ON public.case_prompt_suggestions(user_id);
