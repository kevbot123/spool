-- Migration script to rename thumbnail files from old format to new format
-- Old format: filename.jpeg_thumb.webp
-- New format: filename_thumb.webp

-- This script needs to be run in the Supabase SQL editor or via the API
-- It will rename files in the storage bucket

-- First, let's see what files need to be migrated
SELECT 
  name,
  CASE 
    WHEN name LIKE '%._thumb.webp' THEN 
      REGEXP_REPLACE(name, '(\.[^.]+)_thumb\.webp$', '_thumb.webp')
    WHEN name LIKE '%._small.webp' THEN 
      REGEXP_REPLACE(name, '(\.[^.]+)_small\.webp$', '_small.webp')
    ELSE name
  END as new_name
FROM storage.objects 
WHERE bucket_id = 'media' 
  AND (name LIKE '%._thumb.webp' OR name LIKE '%._small.webp')
ORDER BY name;

-- Note: The actual file renaming needs to be done via the Supabase Storage API
-- This SQL is just for planning - the actual migration needs to be done programmatically