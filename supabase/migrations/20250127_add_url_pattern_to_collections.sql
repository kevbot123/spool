-- Add URL pattern support to collections
-- This allows each collection to define its URL structure

ALTER TABLE collections 
ADD COLUMN url_pattern TEXT DEFAULT '/{slug}';

-- Update existing collections to have their URL pattern based on their slug
UPDATE collections 
SET url_pattern = '/' || slug || '/{slug}' 
WHERE url_pattern IS NULL OR url_pattern = '/{slug}';

-- Add index for URL pattern lookups
CREATE INDEX idx_collections_url_pattern ON collections(url_pattern); 