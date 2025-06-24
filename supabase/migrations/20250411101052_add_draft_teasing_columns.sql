-- Add missing draft teasing columns
ALTER TABLE public.chatbots ADD COLUMN IF NOT EXISTS draft_tease_initial_messages boolean;
ALTER TABLE public.chatbots ADD COLUMN IF NOT EXISTS draft_tease_delay_seconds integer;