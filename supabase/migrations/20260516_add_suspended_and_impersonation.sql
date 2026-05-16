-- Migration: add suspended column to profiles and impersonation_tokens table
BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended BOOLEAN NOT NULL DEFAULT FALSE;

-- Table to store short-lived impersonation tokens issued to super-admins
CREATE TABLE IF NOT EXISTS public.impersonation_tokens (
  token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  used BOOLEAN NOT NULL DEFAULT FALSE
);

COMMIT;
