ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
-- Mark existing users as onboarded so flow only shows for new signups
UPDATE public.profiles SET onboarding_completed = true WHERE created_at < now() - interval '1 minute';