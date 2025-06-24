-- Create slack_integrations table
CREATE TABLE IF NOT EXISTS slack_integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
    bot_token TEXT NOT NULL,
    workspace_name TEXT,
    channel_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one integration per chatbot
    UNIQUE(chatbot_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_slack_integrations_chatbot_id ON slack_integrations(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_slack_integrations_active ON slack_integrations(is_active);

-- Add RLS policies
ALTER TABLE slack_integrations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access integrations for their own chatbots
CREATE POLICY "Users can manage their own slack integrations" ON slack_integrations
    FOR ALL USING (
        chatbot_id IN (
            SELECT id FROM chatbots WHERE user_id = auth.uid()
        )
    );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_slack_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_slack_integrations_updated_at
    BEFORE UPDATE ON slack_integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_slack_integrations_updated_at(); 