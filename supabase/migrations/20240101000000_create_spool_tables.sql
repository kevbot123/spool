-- Create Spool CMS core tables
-- This migration creates the foundational tables for the headless CMS

-- Sites table - each user can have multiple sites/projects
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT,
  subdomain TEXT UNIQUE,
  api_key TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT sites_user_id_name_unique UNIQUE(user_id, name)
);

-- Collections table - defines content types (like "blog", "docs", etc.)
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  schema JSONB NOT NULL DEFAULT '{"fields": []}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT collections_site_slug_unique UNIQUE(site_id, slug)
);

-- Content items table - the actual content pieces
CREATE TABLE content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT,
  data JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  author_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT content_items_site_collection_slug_unique UNIQUE(site_id, collection_id, slug)
);

-- Media table - for uploaded images and files
CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  alt_text TEXT,
  author_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT media_site_filename_unique UNIQUE(site_id, filename)
);

-- Site collaborators - manage who can access each site
CREATE TABLE site_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'editor' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT site_collaborators_site_user_unique UNIQUE(site_id, user_id)
);

-- Activity log for audit trail
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_sites_user_id ON sites(user_id);
CREATE INDEX idx_sites_subdomain ON sites(subdomain) WHERE subdomain IS NOT NULL;

CREATE INDEX idx_collections_site_id ON collections(site_id);
CREATE INDEX idx_collections_slug ON collections(slug);

CREATE INDEX idx_content_items_site_id ON content_items(site_id);
CREATE INDEX idx_content_items_collection_id ON content_items(collection_id);
CREATE INDEX idx_content_items_status ON content_items(status);
CREATE INDEX idx_content_items_published_at ON content_items(published_at DESC) WHERE status = 'published';
CREATE INDEX idx_content_items_author_id ON content_items(author_id);

CREATE INDEX idx_media_site_id ON media(site_id);
CREATE INDEX idx_media_created_at ON media(created_at DESC);

CREATE INDEX idx_site_collaborators_site_id ON site_collaborators(site_id);
CREATE INDEX idx_site_collaborators_user_id ON site_collaborators(user_id);

CREATE INDEX idx_activity_logs_site_id ON activity_logs(site_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Row Level Security (RLS) policies
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Sites policies
CREATE POLICY "Users can view their own sites" ON sites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sites" ON sites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sites" ON sites
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sites" ON sites
  FOR DELETE USING (auth.uid() = user_id);

-- Site collaborators can also access sites
CREATE POLICY "Collaborators can view sites" ON sites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM site_collaborators 
      WHERE site_id = sites.id 
      AND user_id = auth.uid()
      AND accepted_at IS NOT NULL
    )
  );

-- Collections policies (inherit from site access)
CREATE POLICY "Site owners and collaborators can manage collections" ON collections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sites 
      WHERE sites.id = collections.site_id 
      AND (
        sites.user_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM site_collaborators 
          WHERE site_collaborators.site_id = sites.id 
          AND site_collaborators.user_id = auth.uid()
          AND site_collaborators.accepted_at IS NOT NULL
        )
      )
    )
  );

-- Content items policies (inherit from site access)
CREATE POLICY "Site owners and collaborators can manage content" ON content_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sites 
      WHERE sites.id = content_items.site_id 
      AND (
        sites.user_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM site_collaborators 
          WHERE site_collaborators.site_id = sites.id 
          AND site_collaborators.user_id = auth.uid()
          AND site_collaborators.accepted_at IS NOT NULL
        )
      )
    )
  );

-- Media policies (inherit from site access)
CREATE POLICY "Site owners and collaborators can manage media" ON media
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sites 
      WHERE sites.id = media.site_id 
      AND (
        sites.user_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM site_collaborators 
          WHERE site_collaborators.site_id = sites.id 
          AND site_collaborators.user_id = auth.uid()
          AND site_collaborators.accepted_at IS NOT NULL
        )
      )
    )
  );

-- Site collaborators policies
CREATE POLICY "Site owners can manage collaborators" ON site_collaborators
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sites 
      WHERE sites.id = site_collaborators.site_id 
      AND sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own collaborator records" ON site_collaborators
  FOR SELECT USING (user_id = auth.uid());

-- Activity logs policies
CREATE POLICY "Site owners and collaborators can view activity logs" ON activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sites 
      WHERE sites.id = activity_logs.site_id 
      AND (
        sites.user_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM site_collaborators 
          WHERE site_collaborators.site_id = sites.id 
          AND site_collaborators.user_id = auth.uid()
          AND site_collaborators.accepted_at IS NOT NULL
        )
      )
    )
  );

-- Functions and triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_items_updated_at BEFORE UPDATE ON content_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Activity logging function
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
DECLARE
  site_uuid UUID;
BEGIN
  -- Extract site_id based on table
  IF TG_TABLE_NAME = 'sites' THEN
    site_uuid := NEW.id;
  ELSIF TG_TABLE_NAME = 'collections' THEN
    site_uuid := NEW.site_id;
  ELSIF TG_TABLE_NAME = 'content_items' THEN
    site_uuid := NEW.site_id;
  ELSIF TG_TABLE_NAME = 'media' THEN
    site_uuid := NEW.site_id;
  END IF;

  -- Log the activity
  INSERT INTO activity_logs (site_id, user_id, action, resource_type, resource_id, metadata)
  VALUES (
    site_uuid,
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    NEW.id,
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'timestamp', NOW()
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add activity logging triggers
CREATE TRIGGER log_sites_activity AFTER INSERT OR UPDATE OR DELETE ON sites
  FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER log_collections_activity AFTER INSERT OR UPDATE OR DELETE ON collections
  FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER log_content_items_activity AFTER INSERT OR UPDATE OR DELETE ON content_items
  FOR EACH ROW EXECUTE FUNCTION log_activity(); 