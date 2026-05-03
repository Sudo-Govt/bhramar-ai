ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS summary_until_message_id uuid,
  ADD COLUMN IF NOT EXISTS summary_updated_at timestamptz;