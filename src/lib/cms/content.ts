import { ContentItem, CollectionConfig, ParsedContent, ContentMeta } from '@/types/cms';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import slugify from 'slugify';

export class ContentManager {
  private async getSupabase() {
    return await createSupabaseServerClient();
  }

  async getContentItem(collectionSlug: string, contentSlug: string): Promise<ContentItem | null> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('content_items')
      .select(`
        *,
        collections!inner(slug, site_id)
      `)
      .eq('slug', contentSlug)
      .eq('collections.slug', collectionSlug)
      .single();

    if (error || !data) return null;

    return this.mapDatabaseToContentItem(data);
  }

  async getContentItemById(collectionSlug: string, id: string): Promise<ContentItem | null> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('content_items')
      .select(`
        *,
        collections!inner(slug, site_id)
      `)
      .eq('id', id)
      .eq('collections.slug', collectionSlug)
      .single();

    if (error || !data) return null;

    return this.mapDatabaseToContentItem(data);
  }

  async getContentByUrl(url: string): Promise<ContentItem | null> {
    // This would need collection config to parse URL patterns
    // For now, implement basic logic
    const parts = url.split('/').filter(Boolean);
    if (parts.length < 2) return null;

    const collectionSlug = parts[0];
    const contentSlug = parts[1];

    return this.getContentItem(collectionSlug, contentSlug);
  }

  async listContent(collectionSlug: string, options?: {
    limit?: number;
    offset?: number;
    filter?: Record<string, any>;
    sort?: { field: string; order: 'asc' | 'desc' };
    publishedOnly?: boolean;
    siteId?: string;
  }): Promise<{ items: ContentItem[]; total: number }> {
    const supabase = await this.getSupabase();
    let query = supabase
      .from('content_items')
      .select(`
        *,
        collections!inner(slug, site_id)
      `, { count: 'exact' })
      .eq('collections.slug', collectionSlug);

    // Filter by site if provided
    if (options?.siteId) {
      query = query.eq('collections.site_id', options.siteId);
    }

    // Filter published only
    if (options?.publishedOnly) {
      query = query.eq('status', 'published').not('published_at', 'is', null);
      }
      
      // Apply sorting
      if (options?.sort) {
      const { field, order } = options.sort;
      query = query.order(field, { ascending: order === 'asc' });
    } else {
      // Default sort by updated_at desc
      query = query.order('updated_at', { ascending: false });
      }
      
      // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, (options.offset + (options?.limit || 10)) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error listing content:', error);
      return { items: [], total: 0 };
    }

    const items = (data || []).map((item: any) => this.mapDatabaseToContentItem(item));

    return {
      items,
      total: count || 0
    };
  }

  async createContent(collectionSlug: string, data: Record<string, any>, siteId?: string): Promise<ContentItem> {
    const supabase = await this.getSupabase();
    
    // Get collection ID
    const actualSiteId = siteId || await this.getDefaultSiteId();
    const { data: collection, error: collectionError } = await supabase
      .from('collections')
      .select('id, site_id')
      .eq('slug', collectionSlug)
      .eq('site_id', actualSiteId)
      .single();

    if (collectionError || !collection) {
      throw new Error(`Collection ${collectionSlug} not found`);
    }

    // Generate slug if not provided
    const slug = data.slug || slugify(data.title || 'untitled', { lower: true, strict: true });
    
    // Prepare content item data
    // Separate system fields from custom data fields
    const { title: dataTitle, slug: dataSlug, ...customData } = data;
    
    const contentData = {
      id: uuidv4(),
      site_id: collection.site_id,
      collection_id: collection.id,
      slug: slug,
      title: data.title || 'Untitled',
      data: {
        ...customData, // Only custom fields, no system fields
        body: data.body || '',
      },
      status: 'draft',
      author_id: await this.getCurrentUserId(),
    };

    const { data: created, error } = await supabase
      .from('content_items')
      .insert(contentData)
      .select(`
        *,
        collections!inner(slug, site_id)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create content: ${error.message}`);
    }

    return this.mapDatabaseToContentItem(created);
  }

  async updateContent(collectionSlug: string, contentSlug: string, data: Record<string, any>): Promise<ContentItem> {
    const item = await this.getContentItem(collectionSlug, contentSlug);
    if (!item) throw new Error('Content item not found');

    return await this.updateContentById(collectionSlug, item.id, data) as ContentItem;
  }

  async updateContentById(collectionSlug: string, id: string, data: Record<string, any>): Promise<ContentItem | null> {
    const supabase = await this.getSupabase();
    
    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Handle top-level fields
    if (data.title !== undefined) updateData.title = data.title;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.status !== undefined) updateData.status = data.status;

    // Handle the data payload. The frontend should send the complete, updated data object.
    if (data.data !== undefined) {
      updateData.data = data.data;
    }
    
    // If status is being set to published, update the timestamp
    if (data.status === 'published') {
        const currentItem = await this.getContentItemById(collectionSlug, id);
        // Only set published_at if it's the first time being published
        if (currentItem && !currentItem.publishedAt) {
            updateData.published_at = new Date().toISOString();
        }
    }

    const { data: updated, error } = await supabase
      .from('content_items')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        collections!inner(slug, site_id)
      `)
      .single();

    if (error) {
      console.error('Error updating content:', error);
      return null;
    }

    return this.mapDatabaseToContentItem(updated);
  }

  async publishDraftById(collectionSlug: string, id: string, draftPayload?: any): Promise<ContentItem | null> {
    const supabase = await this.getSupabase();
    
    // 1. Get the current item
    const item = await this.getContentItemById(collectionSlug, id);
    if (!item) {
      throw new Error('Item not found.');
    }

    // 2. Determine the draft to merge. Use the payload if provided, otherwise fallback to DB draft.
    const draftToMerge = draftPayload || item.draft;
    if (!draftToMerge) {
      // If there's no payload and no draft in DB, there's nothing to publish.
      // We can just return the item as is, or throw an error. Let's return it.
      return item;
    }

    // 3. Merge draft data into main data
    const mergedData = {
      ...item.data,
      ...draftToMerge, // Merges fields from draft payload over existing data
    };

    // 4. Handle top-level fields from the draft payload (like title, slug etc)
    const topLevelUpdates: Partial<ContentItem> = {};
    if (draftPayload) {
      Object.keys(draftPayload).forEach(key => {
        if (key !== 'data') {
          (topLevelUpdates as any)[key] = draftPayload[key];
        }
      });
    }

    // 5. Prepare the final update payload
    const updatePayload: any = {
      ...topLevelUpdates,
      data: mergedData,
      draft_data: null, // Clear the draft data
      status: 'published',
      updated_at: new Date().toISOString(),
    };

    // 6. Set published_at if it's the first time
    if (!item.publishedAt) {
      updatePayload.published_at = new Date().toISOString();
    }

    // 7. Perform the update
    const { data: updated, error } = await supabase
      .from('content_items')
      .update(updatePayload)
      .eq('id', id)
      .select(`
        *,
        collections!inner(slug, site_id)
      `)
      .single();

    if (error) {
      console.error('Error publishing draft:', error);
      throw new Error(`Failed to publish draft: ${error.message}`);
    }

    return this.mapDatabaseToContentItem(updated);
  }

  async deleteContent(collectionSlug: string, contentSlug: string): Promise<void> {
    const item = await this.getContentItem(collectionSlug, contentSlug);
    if (!item) throw new Error('Content item not found');

    await this.deleteContentById(collectionSlug, item.id);
  }

  async deleteContentById(collectionSlug: string, id: string): Promise<void> {
    const supabase = await this.getSupabase();
    const { error } = await supabase
      .from('content_items')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete content: ${error.message}`);
    }
  }

  async searchContent(query: string, collectionSlugs?: string[], publishedOnly: boolean = false): Promise<ContentItem[]> {
    const supabase = await this.getSupabase();
    let dbQuery = supabase
      .from('content_items')
      .select(`
        *,
        collections!inner(slug, site_id)
      `)
      .or(`title.ilike.%${query}%,data->body.ilike.%${query}%`);

    if (publishedOnly) {
      dbQuery = dbQuery.eq('status', 'published');
    }

    if (collectionSlugs && collectionSlugs.length > 0) {
      dbQuery = dbQuery.in('collections.slug', collectionSlugs);
    }

    const { data, error } = await dbQuery.limit(50);

    if (error) {
      console.error('Error searching content:', error);
      return [];
    }

    return (data || []).map((item: any) => this.mapDatabaseToContentItem(item));
  }

  async updateDraftById(collectionSlug: string, id: string, draftData: Record<string, any>): Promise<ContentItem | null> {
    const supabase = await this.getSupabase();
    
    // Get the current item to check if it's published
    const currentItem = await this.getContentItemById(collectionSlug, id);
    if (!currentItem) return null;
    
    // Only save draft data for published items
    if (!currentItem.publishedAt) {
      // For unpublished items, save changes directly
      return this.updateContentById(collectionSlug, id, draftData);
    }
    
    // For published items, save draft data separately
    const { data: updated, error } = await supabase
      .from('content_items')
      .update({
        draft_data: draftData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        collections!inner(slug, site_id)
      `)
      .single();

    if (error) {
      console.error('Error updating draft:', error);
      return null;
    }

    return this.mapDatabaseToContentItem(updated);
  }

  /**
   * Clears (deletes) the draft data for a published item. After this the live
   * version remains untouched and the draft is removed.
   */
  async clearDraftById(collectionSlug: string, id: string): Promise<ContentItem | null> {
    const supabase = await this.getSupabase();

    const { data: updated, error } = await supabase
      .from('content_items')
      .update({
        draft_data: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        collections!inner(slug, site_id)
      `)
      .single();

    if (error) {
      console.error('Error clearing draft:', error);
      return null;
    }

    return this.mapDatabaseToContentItem(updated);
  }

  private mapDatabaseToContentItem(dbItem: any): ContentItem {
    return {
      id: dbItem.id,
      slug: dbItem.slug,
      collection: dbItem.collections.slug,
      title: dbItem.title || '',
      body: dbItem.data?.body || '',
      data: dbItem.data || {},
      status: dbItem.status || 'draft',
      createdAt: dbItem.created_at,
      updatedAt: dbItem.updated_at,
      publishedAt: dbItem.published_at,
      draft: dbItem.draft_data || undefined, // Include draft data for published items
      // SEO fields
      seoTitle: dbItem.data?.seoTitle,
      seoDescription: dbItem.data?.seoDescription,
      ogImage: dbItem.data?.ogImage,
      meta: {
        lastEditedBy: dbItem.author_id,
        version: 1, // TODO: Implement versioning
      },
    };
  }

  private async getCurrentUserId(): Promise<string | null> {
    const supabase = await this.getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  }

  private async getDefaultSiteId(): Promise<string> {
    const userId = await this.getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('sites')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (error || !data) {
      throw new Error('No site found for user. Please create a site first.');
    }

    return data.id;
  }

  // Site management methods for the platform
  async createSite(name: string, domain?: string): Promise<any> {
    const userId = await this.getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('sites')
      .insert({
        user_id: userId,
        name,
        domain,
        subdomain: slugify(name, { lower: true, strict: true }),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create site: ${error.message}`);
    }

    return data;
  }

  async getUserSites(): Promise<any[]> {
    const userId = await this.getCurrentUserId();
    if (!userId) return [];

    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user sites:', error);
      return [];
    }

    return data || [];
  }

  async createCollection(siteId: string, config: Partial<CollectionConfig>): Promise<any> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('collections')
      .insert({
        site_id: siteId,
        name: config.name || 'Untitled Collection',
        slug: config.slug || slugify(config.name || 'untitled', { lower: true, strict: true }),
        description: config.description,
        schema: JSON.parse(JSON.stringify({
          fields: config.fields || []
        })),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create collection: ${error.message}`);
    }

    return data;
  }
}

// Singleton instance
let contentManager: ContentManager;

export function getContentManager(): ContentManager {
  if (!contentManager) {
    contentManager = new ContentManager();
  }
  return contentManager;
} 