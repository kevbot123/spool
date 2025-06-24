-- Add missing 'published' columns to chatbots table
ALTER TABLE public.chatbots ADD COLUMN IF NOT EXISTS show_sources_with_response boolean DEFAULT true;
ALTER TABLE public.chatbots ADD COLUMN IF NOT EXISTS auto_open_chat_window boolean DEFAULT false;
ALTER TABLE public.chatbots ADD COLUMN IF NOT EXISTS auto_open_delay_seconds integer DEFAULT 0;
ALTER TABLE public.chatbots ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT true;

-- Add corresponding 'draft' columns
ALTER TABLE public.chatbots ADD COLUMN IF NOT EXISTS draft_show_sources_with_response boolean;
ALTER TABLE public.chatbots ADD COLUMN IF NOT EXISTS draft_auto_open_chat_window boolean;
ALTER TABLE public.chatbots ADD COLUMN IF NOT EXISTS draft_auto_open_delay_seconds integer;
ALTER TABLE public.chatbots ADD COLUMN IF NOT EXISTS draft_is_published boolean;