
-- limitation_periods
CREATE TABLE public.limitation_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  description text NOT NULL,
  act_reference text NOT NULL,
  period_days integer,
  period_label text NOT NULL,
  urgent_flag boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0
);
ALTER TABLE public.limitation_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY lp_public_read ON public.limitation_periods FOR SELECT USING (true);

INSERT INTO public.limitation_periods (category, description, act_reference, period_days, period_label, urgent_flag, sort_order) VALUES
('Contract', 'Suit on a contract', 'Limitation Act, Art. 55', 1095, '3 years', false, 1),
('Money', 'Recovery of money lent', 'Limitation Act, Art. 19', 1095, '3 years', false, 2),
('Cheque Bounce', 'Complaint under NI Act s.138', 'NI Act, Sec. 142', 30, '1 month (from cause of action)', true, 3),
('Consumer', 'Consumer complaint', 'CPA 2019', 730, '2 years', false, 4),
('Motor Accident', 'Claim before MACT', 'MV Act', 180, '6 months', true, 5),
('Service', 'Service matter / Government', 'Limitation Act', 1095, '3 years', false, 6),
('Property', 'Possession of immovable property', 'Limitation Act, Art. 64/65', 4380, '12 years', false, 7),
('Rent', 'Rent recovery', 'Limitation Act', 1095, '3 years', false, 8),
('Matrimonial', 'Divorce — cooling-off period', 'HMA 1955', 365, '1 year', false, 9),
('Criminal Appeal', 'Appeal to High Court from Sessions', 'CrPC', 60, '60 days', true, 10),
('Criminal Appeal', 'Appeal to Supreme Court from HC', 'SC Rules', 90, '90 days', true, 11),
('Writ', 'Writ petition (Art. 226 / 32)', 'Constitution', NULL, 'No fixed limit — laches applies', false, 12),
('POCSO', 'POCSO complaint', 'POCSO Act 2012', NULL, 'No limitation', true, 13),
('Habeas Corpus', 'Habeas corpus petition', 'Constitution, Art. 226/32', NULL, 'No limitation — urgent', true, 14),
('Specific Performance', 'Specific performance of contract', 'Limitation Act, Art. 54', 1095, '3 years', false, 15),
('Mortgage', 'Recovery of immovable property by mortgagee', 'Limitation Act', 4380, '12 years', false, 16),
('Industrial', 'Industrial dispute reference', 'ID Act 1947', 1095, '3 years from cause', false, 17),
('Arbitration', 'Challenge to arbitral award', 'A&C Act, Sec. 34', 120, '3 months + 30 days grace', true, 18);

-- advocate_reviews
CREATE TABLE public.advocate_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advocate_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewer_user_id uuid NOT NULL REFERENCES public.profiles(id),
  case_id uuid REFERENCES public.cases(id),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (advocate_id, reviewer_user_id, case_id)
);
ALTER TABLE public.advocate_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY ar_insert_reviewer ON public.advocate_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_user_id);
CREATE POLICY ar_select_all ON public.advocate_reviews FOR SELECT USING (true);

CREATE INDEX idx_advocate_reviews_advocate ON public.advocate_reviews(advocate_id);

-- recompute vakeel score
CREATE OR REPLACE FUNCTION public.recompute_vakeel_score(_advocate uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET
    vakeel_score = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM public.advocate_reviews WHERE advocate_id = _advocate), 0),
    vakeel_reviews_count = (SELECT COUNT(*) FROM public.advocate_reviews WHERE advocate_id = _advocate)
  WHERE id = _advocate;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recompute_vakeel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recompute_vakeel_score(NEW.advocate_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_review_recompute
  AFTER INSERT ON public.advocate_reviews
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_vakeel();

-- emergency_consultations
CREATE TABLE public.emergency_consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_user_id uuid REFERENCES public.profiles(id),
  advocate_id uuid NOT NULL REFERENCES public.profiles(id),
  issue_type text NOT NULL,
  description text,
  state text,
  district text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.emergency_consultations ENABLE ROW LEVEL SECURITY;
CREATE POLICY ec_select_parties ON public.emergency_consultations FOR SELECT
  USING (auth.uid() = citizen_user_id OR auth.uid() = advocate_id);
CREATE POLICY ec_insert_citizen ON public.emergency_consultations FOR INSERT WITH CHECK (true);
CREATE INDEX idx_emergency_advocate ON public.emergency_consultations(advocate_id);
