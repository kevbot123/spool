-- Create trends_usage table to track daily usage limits
CREATE TABLE IF NOT EXISTS trends_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add a unique constraint to ensure one record per user per day
  UNIQUE(user_id, date)
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS trends_usage_user_id_idx ON trends_usage(user_id);
CREATE INDEX IF NOT EXISTS trends_usage_date_idx ON trends_usage(date);

-- Add RLS policies
ALTER TABLE trends_usage ENABLE ROW LEVEL SECURITY;

-- Only allow users to see their own usage
CREATE POLICY trends_usage_select_policy ON trends_usage 
  FOR SELECT USING (auth.uid() = user_id);

-- Only system services can insert/update usage records
CREATE POLICY trends_usage_insert_policy ON trends_usage 
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY trends_usage_update_policy ON trends_usage 
  FOR UPDATE USING (auth.uid() = user_id OR auth.jwt()->>'role' = 'service_role');

-- Add a function to reset counts at midnight
CREATE OR REPLACE FUNCTION reset_trends_usage_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- If the date has changed, reset the count
  IF NEW.date::date <> OLD.date::date THEN
    NEW.count := 1;
  END IF;
  
  -- Update the updated_at timestamp
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function before updates
CREATE TRIGGER trends_usage_reset_trigger
  BEFORE UPDATE ON trends_usage
  FOR EACH ROW
  EXECUTE FUNCTION reset_trends_usage_counts();

-- Add a comment to the table
COMMENT ON TABLE trends_usage IS 'Tracks daily usage of the trends analysis feature for rate limiting purposes';
