-- Create webhook_deliveries table for tracking webhook delivery status
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  
  -- Indexes for performance
  INDEX idx_webhook_deliveries_site_id ON webhook_deliveries(site_id),
  INDEX idx_webhook_deliveries_status ON webhook_deliveries(status),
  INDEX idx_webhook_deliveries_created_at ON webhook_deliveries(created_at DESC)
);

-- Add RLS policies
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see webhook deliveries for sites they have access to
CREATE POLICY "Users can view webhook deliveries for their sites" ON webhook_deliveries
  FOR SELECT USING (
    site_id IN (
      SELECT s.id FROM sites s
      JOIN site_members sm ON s.id = sm.site_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- Policy: System can insert webhook deliveries (for webhook triggers)
CREATE POLICY "System can insert webhook deliveries" ON webhook_deliveries
  FOR INSERT WITH CHECK (true);

-- Add webhook_secret to sites settings
-- This will be stored in the existing settings JSONB column
COMMENT ON COLUMN sites.settings IS 'Site settings including webhook_url, webhook_secret, seo, social_links, etc.';