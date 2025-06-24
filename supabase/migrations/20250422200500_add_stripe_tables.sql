-- Migration to add Stripe billing tables and functions
-- Date: 2025-04-22

-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  plan_id TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies for customers table
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Only allow users to see their own customer data
DROP POLICY IF EXISTS "Users can view their own customer data" ON public.customers;
CREATE POLICY "Users can view their own customer data" ON public.customers
  FOR SELECT USING (auth.uid() = user_id);

-- Only allow service role to insert/update customer data
DROP POLICY IF EXISTS "Service role can manage all customer data" ON public.customers;
CREATE POLICY "Service role can manage all customer data" ON public.customers
  USING (auth.jwt() ? 'service_role');

-- Create user_limits table
CREATE TABLE IF NOT EXISTS public.user_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'free',
  message_credits INTEGER NOT NULL DEFAULT 100,
  message_credits_used INTEGER NOT NULL DEFAULT 0,
  training_data_size_kb INTEGER NOT NULL DEFAULT 400,
  training_data_used_kb INTEGER NOT NULL DEFAULT 0,
  training_urls INTEGER NOT NULL DEFAULT 10,
  training_urls_used INTEGER NOT NULL DEFAULT 0,
  can_remove_branding BOOLEAN NOT NULL DEFAULT FALSE,
  reset_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 month'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies for user_limits table
ALTER TABLE public.user_limits ENABLE ROW LEVEL SECURITY;

-- Only allow users to see their own limits
DROP POLICY IF EXISTS "Users can view their own limits" ON public.user_limits;
CREATE POLICY "Users can view their own limits" ON public.user_limits
  FOR SELECT USING (auth.uid() = user_id);

-- Only allow service role to insert/update limits
DROP POLICY IF EXISTS "Service role can manage all limits" ON public.user_limits;
CREATE POLICY "Service role can manage all limits" ON public.user_limits
  USING (auth.jwt() ? 'service_role');

-- Create usage_logs table
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  credits_used INTEGER NOT NULL DEFAULT 1,
  model_used TEXT,
  message_length INTEGER,
  data_size_kb INTEGER,
  url_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies for usage_logs table
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Only allow users to see their own usage logs
DROP POLICY IF EXISTS "Users can view their own usage logs" ON public.usage_logs;
CREATE POLICY "Users can view their own usage logs" ON public.usage_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Only allow service role to insert usage logs
DROP POLICY IF EXISTS "Service role can insert usage logs" ON public.usage_logs;
CREATE POLICY "Service role can insert usage logs" ON public.usage_logs
  FOR INSERT WITH CHECK (auth.jwt() ? 'service_role');

-- Create a function to update usage when a message is sent
CREATE OR REPLACE FUNCTION public.update_message_credits()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the user's message credits used
  UPDATE public.user_limits
  SET message_credits_used = message_credits_used + NEW.credits_used
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update message credits when a usage log is inserted
DROP TRIGGER IF EXISTS update_message_credits_trigger ON public.usage_logs;
CREATE TRIGGER update_message_credits_trigger
AFTER INSERT ON public.usage_logs
FOR EACH ROW
WHEN (NEW.action_type = 'message')
EXECUTE FUNCTION public.update_message_credits();

-- Create a function to reset usage limits monthly
CREATE OR REPLACE FUNCTION public.reset_monthly_limits()
RETURNS TRIGGER AS $$
BEGIN
  -- Reset the usage counters
  UPDATE public.user_limits
  SET message_credits_used = 0,
      reset_date = NOW() + INTERVAL '1 month',
      updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to reset limits when a customer's subscription renews
DROP TRIGGER IF EXISTS reset_monthly_limits_trigger ON public.customers;
CREATE TRIGGER reset_monthly_limits_trigger
AFTER UPDATE ON public.customers
FOR EACH ROW
WHEN (NEW.updated_at > OLD.updated_at AND NEW.status = 'active')
EXECUTE FUNCTION public.reset_monthly_limits();
