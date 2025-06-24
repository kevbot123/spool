-- Create tables for ChatApp

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  email TEXT NOT NULL UNIQUE,
  name TEXT
);

-- Chatbots Table
CREATE TABLE IF NOT EXISTS public.chatbots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  temperature NUMERIC DEFAULT 0.7,
  system_prompt TEXT NOT NULL DEFAULT 'You are a helpful assistant.',
  is_active BOOLEAN DEFAULT TRUE,
  display_name TEXT,
  theme TEXT,
  message_placeholder TEXT,
  initial_messages TEXT[],
  suggested_messages TEXT[],
  collect_user_feedback BOOLEAN DEFAULT TRUE,
  regenerate_messages BOOLEAN DEFAULT TRUE,
  footer_text TEXT,
  user_message_color TEXT,
  chat_bubble_button_color TEXT,
  profile_picture_url TEXT,
  chat_icon_url TEXT,
  show_sources_with_response BOOLEAN DEFAULT true,
  auto_open_chat_window BOOLEAN DEFAULT false,
  auto_open_delay_seconds INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  tease_initial_messages BOOLEAN DEFAULT false, 
  tease_delay_seconds INTEGER DEFAULT 5, 
  conversation_id UUID
);

-- Chat Logs Table
CREATE TABLE IF NOT EXISTS public.chat_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
  user_message TEXT NOT NULL,
  bot_response TEXT NOT NULL,
  source TEXT,
  user_feedback TEXT,
  revised_answer TEXT,
  conversation_id UUID
);

-- Training Sources Table
CREATE TABLE IF NOT EXISTS public.training_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  content TEXT,
  url TEXT,
  file_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  size_kb NUMERIC
);

-- Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_end TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- Users Policies
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);
  
CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Chatbots Policies
CREATE POLICY "Users can view own chatbots" ON public.chatbots
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can create own chatbots" ON public.chatbots
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update own chatbots" ON public.chatbots
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete own chatbots" ON public.chatbots
  FOR DELETE USING (auth.uid() = user_id);

-- Chat Logs Policies
CREATE POLICY "Users can view logs of own chatbots" ON public.chat_logs
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.chatbots WHERE id = chatbot_id
    )
  );
  
CREATE POLICY "Users can insert logs for own chatbots" ON public.chat_logs
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.chatbots WHERE id = chatbot_id
    )
  );
  
CREATE POLICY "Users can update logs of own chatbots" ON public.chat_logs
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM public.chatbots WHERE id = chatbot_id
    )
  );

-- Training Sources Policies
CREATE POLICY "Users can view sources of own chatbots" ON public.training_sources
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.chatbots WHERE id = chatbot_id
    )
  );
  
CREATE POLICY "Users can create sources for own chatbots" ON public.training_sources
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.chatbots WHERE id = chatbot_id
    )
  );
  
CREATE POLICY "Users can update sources of own chatbots" ON public.training_sources
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM public.chatbots WHERE id = chatbot_id
    )
  );
  
CREATE POLICY "Users can delete sources of own chatbots" ON public.training_sources
  FOR DELETE USING (
    auth.uid() IN (
      SELECT user_id FROM public.chatbots WHERE id = chatbot_id
    )
  );

-- Subscriptions Policies
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can update own subscriptions" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chatbots_updated_at
BEFORE UPDATE ON public.chatbots
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
