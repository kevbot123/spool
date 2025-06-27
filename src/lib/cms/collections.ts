import { CollectionConfig, FieldConfig } from '@/types/cms';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export class CollectionsManager {
  private collections: Map<string, CollectionConfig> = new Map();
  private defaultFields: FieldConfig[] = [
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      required: true,
      placeholder: 'Enter title...'
    },
    {
      name: 'description',
      label: 'Description',
      type: 'text',
      required: false,
      placeholder: 'Brief description...'
    },
    {
      name: 'slug',
      label: 'URL Slug',
      type: 'text',
      required: true,
      placeholder: 'url-slug'
    },
    {
      name: 'seoTitle',
      label: 'SEO Title',
      type: 'text',
      required: false,
      placeholder: 'Falls back to Title if empty',
      description: 'Custom title for search engines (falls back to Title if empty)'
    },
    {
      name: 'seoDescription',
      label: 'SEO Description',
      type: 'text',
      required: false,
      placeholder: 'Falls back to Description if empty',
      description: 'Meta description for search engines (falls back to Description if empty)',
      validation: {
        max: 160
      }
    },
    {
      name: 'ogTitle',
      label: 'OG Title',
      type: 'text',
      required: false,
      placeholder: 'Falls back to SEO Title or Title if empty',
      description: 'Open Graph title for social media (falls back to SEO Title, then Title if empty)'
    },
    {
      name: 'ogDescription',
      label: 'OG Description',
      type: 'text',
      required: false,
      placeholder: 'Falls back to SEO Description or Description if empty',
      description: 'Open Graph description for social media (falls back to SEO Description, then Description if empty)',
      validation: {
        max: 200
      }
    },
    {
      name: 'ogImage',
      label: 'OG Image',
      type: 'image',
      required: false,
      description: 'Social media preview image'
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: ['draft', 'published', 'archived'],
      default: 'draft',
      required: true,
      description: 'Content publication status'
    },
    {
      name: 'dateLastModified',
      label: 'Date Last Modified',
      type: 'datetime',
      required: false,
      description: 'Automatically updated when content is modified',
      meta: {
        automatic: true,
        readonly: true
      }
    },
    {
      name: 'datePublished',
      label: 'Date Published',
      type: 'datetime',
      required: false,
      description: 'Automatically set when content is first published',
      meta: {
        automatic: true,
        readonly: true
      }
    }
  ];

  private async getSupabase() {
    return await createSupabaseServerClient();
  }

  async initialize(siteId?: string) {
    // Load collections from database
    await this.loadCollections(siteId);
  }

  private async loadCollections(siteId?: string) {
    const supabase = await this.getSupabase();
    
    let query = supabase
      .from('collections')
      .select('*');

    if (siteId) {
      query = query.eq('site_id', siteId);
    }

    const { data: collections, error } = await query;

    if (error) {
      console.error('Error loading collections:', error);
      return;
    }

    this.collections.clear();

         for (const collection of collections || []) {
       const schema = collection.schema && typeof collection.schema === 'object' && collection.schema !== null
         ? collection.schema as { fields?: FieldConfig[] }
         : { fields: [] };
       const config: CollectionConfig = {
         name: collection.name,
         slug: collection.slug,
         description: collection.description || '',
         contentPath: 'posts', // Default path for compatibility
         urlPattern: collection.url_pattern || `/${collection.slug}/{slug}`,
         fields: this.defaultFields.concat((schema?.fields as FieldConfig[]) || []),
        settings: {
          allowCreate: true,
          allowEdit: true,
          allowDelete: true,
          sortField: 'updated_at',
          sortOrder: 'desc',
          ...(collection.settings && typeof collection.settings === 'object' && collection.settings !== null 
             ? collection.settings as Record<string, any> 
             : {})
        },
        seo: {
          titleField: 'title',
          descriptionField: 'seoDescription',
          imageField: 'ogImage'
        }
      };

      this.collections.set(collection.slug, config);
    }
  }

  getCollection(slug: string): CollectionConfig | null {
    return this.collections.get(slug) || null;
  }

  getAllCollections(): CollectionConfig[] {
    return Array.from(this.collections.values());
  }

  getCollectionByUrlPattern(url: string): { collection: CollectionConfig; params: Record<string, string> } | null {
    const urlParts = url.split('/').filter(Boolean);
    
    for (const collection of this.collections.values()) {
      const patternParts = collection.urlPattern.split('/').filter(Boolean);
      
      if (patternParts.length !== urlParts.length) continue;
      
      let match = true;
      const params: Record<string, string> = {};
      
      for (let i = 0; i < patternParts.length; i++) {
        const patternPart = patternParts[i];
        const urlPart = urlParts[i];
        
        if (patternPart.startsWith('{') && patternPart.endsWith('}')) {
          // Dynamic parameter
          const paramName = patternPart.slice(1, -1);
          params[paramName] = urlPart;
        } else if (patternPart !== urlPart) {
          // Static part doesn't match
          match = false;
          break;
        }
      }
      
      if (match) {
        return { collection, params };
      }
    }
    
    return null;
  }

  async createCollection(siteId: string, config: Partial<CollectionConfig>): Promise<CollectionConfig> {
    const supabase = await this.getSupabase();
    
    const { data, error } = await supabase
      .from('collections')
      .insert({
        site_id: siteId,
        name: config.name || 'Untitled Collection',
        slug: config.slug || this.generateSlug(config.name || 'untitled'),
        description: config.description,
        url_pattern: config.urlPattern || `/${config.slug || this.generateSlug(config.name || 'untitled')}/{slug}`,
        schema: JSON.parse(JSON.stringify({
          fields: config.fields || []
        })),
        settings: config.settings || {}
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create collection: ${error.message}`);
    }

         // Add to local cache
     const schema = data.schema && typeof data.schema === 'object' && data.schema !== null
       ? data.schema as { fields?: FieldConfig[] }
       : { fields: [] };
     const newCollection: CollectionConfig = {
       name: data.name,
       slug: data.slug,
       description: data.description || '',
       contentPath: 'posts',
       urlPattern: data.url_pattern || `/${data.slug}/{slug}`,
       fields: this.defaultFields.concat((schema?.fields as FieldConfig[]) || []),
      settings: {
        allowCreate: true,
        allowEdit: true,
        allowDelete: true,
        sortField: 'updated_at',
        sortOrder: 'desc',
        ...(data.settings && typeof data.settings === 'object' && data.settings !== null 
           ? data.settings as Record<string, any> 
           : {})
      },
      seo: {
        titleField: 'title',
        descriptionField: 'seoDescription',
        imageField: 'ogImage'
      }
    };

    this.collections.set(data.slug, newCollection);
    return newCollection;
  }

  async updateCollection(slug: string, updates: Partial<CollectionConfig>): Promise<CollectionConfig | null> {
    const supabase = await this.getSupabase();
    
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.description) updateData.description = updates.description;
    if (updates.urlPattern) updateData.url_pattern = updates.urlPattern;
    if (updates.fields) {
      updateData.schema = JSON.parse(JSON.stringify({
        fields: updates.fields
      }));
    }
    if (updates.settings) updateData.settings = updates.settings;

    const { data, error } = await supabase
      .from('collections')
      .update(updateData)
      .eq('slug', slug)
      .select()
      .single();

    if (error) {
      console.error('Error updating collection:', error);
      return null;
    }

    // Update local cache
    const schema = data.schema && typeof data.schema === 'object' && data.schema !== null
      ? data.schema as { fields?: FieldConfig[] }
      : { fields: [] };
    const updatedCollection: CollectionConfig = {
      name: data.name,
      slug: data.slug,
      description: data.description || '',
      contentPath: 'posts',
      urlPattern: data.url_pattern || `/${data.slug}/{slug}`,
      fields: [
        ...this.defaultFields,
        ...(schema?.fields || [])
      ],
      settings: {
        allowCreate: true,
        allowEdit: true,
        allowDelete: true,
        sortField: 'updated_at',
        sortOrder: 'desc',
        ...(data.settings && typeof data.settings === 'object' && data.settings !== null 
           ? data.settings as Record<string, any> 
           : {})
      },
      seo: {
        titleField: 'title',
        descriptionField: 'seoDescription',
        imageField: 'ogImage'
      }
    };

    this.collections.set(data.slug, updatedCollection);
    return updatedCollection;
  }

  async deleteCollection(slug: string): Promise<void> {
    const supabase = await this.getSupabase();
    
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('slug', slug);

    if (error) {
      throw new Error(`Failed to delete collection: ${error.message}`);
    }

    this.collections.delete(slug);
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Default collections for new sites
  async createDefaultCollections(siteId: string): Promise<void> {
    const defaultCollections: Array<Partial<CollectionConfig>> = [
      {
        name: 'Blog',
        slug: 'blog',
        description: 'Blog posts and articles',
        fields: [
          {
            name: 'excerpt',
            label: 'Excerpt',
            type: 'text' as const,
            placeholder: 'Brief description...'
          },
          {
            name: 'featured',
            label: 'Featured Post',
            type: 'boolean' as const,
            default: false
          },
          {
            name: 'tags',
            label: 'Tags',
            type: 'text' as const,
            placeholder: 'tag1, tag2, tag3'
          }
        ]
      },
      {
        name: 'Pages',
        slug: 'pages',
        description: 'Static pages',
        fields: [
          {
            name: 'description',
            label: 'Description',
            type: 'text' as const,
            placeholder: 'Page description...'
          }
        ]
      }
    ];

    for (const config of defaultCollections) {
      try {
        await this.createCollection(siteId, config);
      } catch (error) {
        console.error(`Failed to create default collection ${config.slug}:`, error);
      }
    }
  }
}

// Singleton instance per site
const collectionsManagers = new Map<string, CollectionsManager>();

export async function getCollectionsManager(siteId?: string): Promise<CollectionsManager> {
  const key = siteId || 'default';
  
  if (!collectionsManagers.has(key)) {
    const manager = new CollectionsManager();
    await manager.initialize(siteId);
    collectionsManagers.set(key, manager);
  }
  
  return collectionsManagers.get(key)!;
} 