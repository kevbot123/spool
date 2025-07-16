-- Enable RLS for the content_items table
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow select for site members" ON public.content_items;
DROP POLICY IF EXISTS "Allow insert for site members" ON public.content_items;
DROP POLICY IF EXISTS "Allow update for site admins" ON public.content_items;
DROP POLICY IF EXISTS "Allow delete for site owners" ON public.content_items;

-- Helper function to get user's role in a site
CREATE OR REPLACE FUNCTION get_user_role(site_id_param uuid, user_id_param uuid) RETURNS text AS $$
DECLARE
  role text;
BEGIN
  SELECT site_members.role INTO role
  FROM site_members
  WHERE site_members.site_id = site_id_param AND site_members.user_id = user_id_param;
  RETURN role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for content_items
CREATE POLICY "Allow select for site members" ON public.content_items
  FOR SELECT USING (get_user_role(site_id) IS NOT NULL);

CREATE POLICY "Allow insert for site members" ON public.content_items
  FOR INSERT WITH CHECK (get_user_role(site_id) IS NOT NULL AND author_id = auth.uid());

CREATE POLICY "Allow update for site admins" ON public.content_items
  FOR UPDATE USING (get_user_role(site_id) IN ('admin', 'owner'));

CREATE POLICY "Allow delete for site owners" ON public.content_items
  FOR DELETE USING (get_user_role(site_id) = 'owner');

-- Policies for Storage (media bucket)
-- Note: Bucket must have RLS enabled in Supabase Dashboard

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow select for all users" ON storage.objects;
DROP POLICY IF EXISTS "Allow insert for site members" ON storage.objects;
DROP POLICY IF EXISTS "Allow update for site admins" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete for site admins" ON storage.objects;

-- Public read access
CREATE POLICY "Allow select for all users" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'media');

-- Allow uploads for site members into their site's folder
CREATE POLICY "Allow insert for site members" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'media' AND get_user_role((storage.foldername(name))[1]::uuid, auth.uid()) IS NOT NULL);

-- Allow updates for site admins/owners in their site's folder
CREATE POLICY "Allow update for site admins" ON storage.objects
  FOR UPDATE USING (bucket_id = 'media' AND get_user_role((storage.foldername(name))[1]::uuid) IN ('admin', 'owner'));

-- Allow deletes for site admins/owners in their site's folder
CREATE POLICY "Allow delete for site admins" ON storage.objects
  FOR DELETE USING (bucket_id = 'media' AND get_user_role((storage.foldername(name))[1]::uuid) IN ('admin', 'owner'));
