-- Add draft_data column to content_items table
-- This column will store draft changes for published items
ALTER TABLE public.content_items ADD COLUMN IF NOT EXISTS draft_data JSONB DEFAULT NULL;

-- Add index for performance when querying items with draft data
CREATE INDEX IF NOT EXISTS idx_content_items_draft_data ON public.content_items USING GIN (draft_data) WHERE draft_data IS NOT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.content_items.draft_data IS 'Stores draft changes for published items. Only published items can have draft data.'; 