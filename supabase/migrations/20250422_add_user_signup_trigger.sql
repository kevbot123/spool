-- Migration to add user signup trigger for Stripe integration
-- Date: 2025-04-22

-- Create a function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a record into the user_limits table with default free plan settings
  INSERT INTO public.user_limits (
    user_id, 
    plan_id, 
    message_credits, 
    message_credits_used,
    training_data_size_kb,
    training_data_used_kb,
    training_urls,
    training_urls_used,
    can_remove_branding,
    reset_date
  ) VALUES (
    NEW.id, 
    'free', 
    300, -- Updated message credits for trial
    0,
    35840, -- Updated training data size for trial (35MB in KB)
    0,
    -1, -- Unlimited URLs for trial (-1 represents Infinity)
    0,
    false, -- Cannot remove branding on free plan
    NOW() + INTERVAL '1 month'
  );
  
  -- Insert a placeholder record in the customers table
  -- The actual Stripe customer ID will be filled in by the API
  INSERT INTO public.customers (
    user_id,
    plan_id,
    status
  ) VALUES (
    NEW.id,
    'free',
    'active'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to call the function on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_signup();
