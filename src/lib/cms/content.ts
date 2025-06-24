import { ContentItem, CollectionConfig, ParsedContent, ContentMeta } from '@/types/cms';
import { getCollectionsManager } from './collections';
import { getMarkdownProcessor } from './markdown';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import slugify from 'slugify';
import matter from 'gray-matter';

const CONTENT_DIR = path.join(process.cwd(), 'content');
const COLLECTIONS_DIR = path.join(CONTENT_DIR, 'collections');

function prepareFrontmatter(data: Record<string, any>): Record<string, any> {
  // Don't filter anything - we need to preserve all custom fields
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Only exclude body as it's not part of frontmatter
    if (key !== 'body') {
      result[key] = value;
    }
  }
  
  return result;
}

export class ContentManager {
  private collectionsManager = getCollectionsManager();
  private markdownProcessor = getMarkdownProcessor();

  async getContentItem(collectionSlug: string, contentSlug: string): Promise<ContentItem | null> {
    const collection = (await this.collectionsManager).getCollection(collectionSlug);
    if (!collection) return null;

    const filePath = path.join(
      COLLECTIONS_DIR,
      collectionSlug,
      collection.contentPath,
      `${contentSlug}.md`
    );

    return this.parseFile(filePath, collectionSlug);
  }

  private async findItemById(collectionSlug: string, id: string): Promise<{ filePath: string, slug: string } | null> {
    const collection = (await this.collectionsManager).getCollection(collectionSlug);
    if (!collection) return null;

    const contentDir = path.join(COLLECTIONS_DIR, collectionSlug, collection.contentPath);
    
    try {
        const files = await fs.readdir(contentDir);
        const mdFiles = files.filter(file => file.endsWith('.md'));

        for (const file of mdFiles) {
            const filePath = path.join(contentDir, file);
            try {
                const fileContent = await fs.readFile(filePath, 'utf-8');
                const { data: frontmatter } = matter(fileContent);

                const fileSlug = file.replace('.md', '');
                // Match if the provided id matches the explicit frontmatter id _or_ the file slug (fallback)
                if (frontmatter.id === id || fileSlug === id) {
                    const slug = fileSlug;
                    return { filePath, slug };
                }
            } catch (parseError) {
                console.error(`Skipping file ${file} due to parse error:`, parseError);
                continue;
            }
        }
    } catch (error) {
        console.error(`Error finding item by ID in ${collectionSlug}:`, error);
    }

    return null;
  }

  async getContentItemById(collectionSlug: string, id: string): Promise<ContentItem | null> {
    const found = await this.findItemById(collectionSlug, id);
    if (!found) return null;
    return this.parseFile(found.filePath, collectionSlug);
  }

  async getContentByUrl(url: string): Promise<ContentItem | null> {
    const result = (await this.collectionsManager).getCollectionByUrlPattern(url);
    if (!result) return null;

    const { collection, params } = result;
    return this.getContentItem(collection.slug, params.slug);
  }

  async listContent(collectionSlug: string, options?: {
    limit?: number;
    offset?: number;
    filter?: Record<string, any>;
    sort?: { field: string; order: 'asc' | 'desc' };
    publishedOnly?: boolean;
  }): Promise<{ items: ContentItem[]; total: number }> {
    const collection = (await this.collectionsManager).getCollection(collectionSlug);
    if (!collection) return { items: [], total: 0 };

    const contentDir = path.join(COLLECTIONS_DIR, collectionSlug, collection.contentPath);
    
    try {
      const files = await fs.readdir(contentDir);
      const mdFiles = files.filter(file => file.endsWith('.md'));
      
      const items: ContentItem[] = [];
      
      for (const file of mdFiles) {
        const slug = file.replace('.md', '');
        const item = await this.getContentItem(collectionSlug, slug);
        if (item) {
          // Filter out unpublished items if publishedOnly is true
          if (options?.publishedOnly && !item.publishedAt) {
            continue;
          }

          // Apply filters
          if (options?.filter) {
            let match = true;
            for (const [key, value] of Object.entries(options.filter)) {
              if (item.data[key] !== value) {
                match = false;
                break;
              }
            }
            if (!match) continue;
          }
          
          items.push(item);
        }
      }
      
      // Apply sorting
      if (options?.sort) {
        items.sort((a, b) => {
          const aValue = a.data[options.sort!.field];
          const bValue = b.data[options.sort!.field];
          const order = options.sort!.order === 'asc' ? 1 : -1;
          
          if (aValue < bValue) return -order;
          if (aValue > bValue) return order;
          return 0;
        });
      }
      
      // Apply pagination
      const start = options?.offset || 0;
      const end = options?.limit ? start + options.limit : items.length;
      
      return {
        items: items.slice(start, end),
        total: items.length
      };
    } catch (error) {
      console.error(`Error listing content for ${collectionSlug}:`, error);
      return { items: [], total: 0 };
    }
  }

  async createContent(collectionSlug: string, data: Record<string, any>): Promise<ContentItem> {
    const collection = (await this.collectionsManager).getCollection(collectionSlug);
    if (!collection) throw new Error(`Collection ${collectionSlug} not found`);

    // Generate slug if not provided
    const slug = data.slug || slugify(data.title, { lower: true, strict: true });
    
    // Separate body from other data
    const { body, ...metaData } = data;
    
    // Create meta object with required fields
    const meta: Record<string, any> = {
      ...metaData,
      id: uuidv4(),
      title: metaData.title || 'Untitled',
      slug: slug,
      // Start as draft by default - admin can publish later
      publishedAt: null
    };
    
    // Create markdown content
    const content = this.markdownProcessor.stringify(meta as any, body || '');
    
    // Write file
    const filePath = path.join(
      COLLECTIONS_DIR,
      collectionSlug,
      collection.contentPath,
      `${slug}.md`
    );
    
    await fs.writeFile(filePath, content);
    
    // Return the created item
    const created = await this.getContentItem(collectionSlug, slug);
    if (!created) throw new Error('Failed to create content item');
    
    return created;
  }

  async updateContent(collectionSlug: string, contentSlug: string, data: Record<string, any>): Promise<ContentItem> {
    const collection = (await this.collectionsManager).getCollection(collectionSlug);
    if (!collection) throw new Error(`Collection ${collectionSlug} not found`);

    const existing = await this.getContentItem(collectionSlug, contentSlug);
    if (!existing) throw new Error(`Content ${contentSlug} not found`);

    // Separate system fields from data fields
    const { body, title, slug, seoTitle, seoDescription, ogImage, data: nestedData, ...otherUpdates } = data;
    
    // Build updated meta - preserve all existing data first
    const updatedMeta: Record<string, any> = {
      ...existing.data  // Start with all existing data
    };
    
    // Update system fields if provided
    if (title !== undefined) updatedMeta.title = title;
    if (slug !== undefined) updatedMeta.slug = slug;
    if (seoTitle !== undefined) updatedMeta.seoTitle = seoTitle;
    if (seoDescription !== undefined) updatedMeta.seoDescription = seoDescription;
    if (ogImage !== undefined) updatedMeta.ogImage = ogImage;
    
    // Merge in other updates
    Object.assign(updatedMeta, otherUpdates);
    
    // If nested data was provided, merge it in
    if (nestedData) {
      Object.assign(updatedMeta, nestedData);
    }
    
    // Ensure required fields
    updatedMeta.title = updatedMeta.title || 'Untitled';
    updatedMeta.slug = updatedMeta.slug || contentSlug;
    
    // Create updated content
    const content = this.markdownProcessor.stringify(updatedMeta as ContentMeta, body !== undefined ? body : existing.body);
    
    // Get the final slug
    const finalSlug = updatedMeta.slug;

    const oldFilePath = path.join(
      COLLECTIONS_DIR,
      collectionSlug,
      collection.contentPath,
      `${contentSlug}.md`
    );
    
    const newFilePath = path.join(
      COLLECTIONS_DIR,
      collectionSlug,
      collection.contentPath,
      `${finalSlug}.md`
    );

    // The file path we'll write to (either the old path or new path after renaming)
    let targetFilePath = oldFilePath;

    // If the slug changed, rename the file
    if (finalSlug !== contentSlug) {
      try {
        console.log('Attempting to rename file...');
        await fs.rename(oldFilePath, newFilePath);
        console.log('File renamed successfully');
        targetFilePath = newFilePath;
      } catch (error) {
        console.error('Error renaming file:', error);
        throw new Error(`Failed to rename file from ${oldFilePath} to ${newFilePath}`);
      }
    }
    
    // Write the updated content to the target file path
    try {
      await fs.writeFile(targetFilePath, content);
      console.log('Content written successfully to:', targetFilePath);
    } catch (error) {
      console.error('Error writing file:', error);
      throw new Error(`Failed to write content to ${targetFilePath}`);
    }
    
    // Return the updated item
    const updatedItem = await this.getContentItem(collectionSlug, finalSlug);
    if (!updatedItem) {
      console.error('Failed to retrieve updated item after update');
      throw new Error('Failed to retrieve updated item');
    }
    
    return updatedItem;
  }

  async updateContentById(collectionSlug: string, id: string, data: Partial<ContentItem>): Promise<ContentItem | null> {
    const found = await this.findItemById(collectionSlug, id);
    if (!found) throw new Error(`Content with id ${id} not found`);
  
    const fileContent = await fs.readFile(found.filePath, 'utf-8');
    const { data: frontmatter, content: body } = matter(fileContent);
  
    // Merge the update data with existing frontmatter
    const updatedFrontmatter: Record<string, any> = { ...frontmatter };
    
    // Handle system fields that go in frontmatter
    const systemFields = ['title', 'slug', 'seoTitle', 'seoDescription', 'ogImage', 'publishedAt'];
    for (const field of systemFields) {
      if (field in data) {
        if (data[field as keyof ContentItem] !== undefined && data[field as keyof ContentItem] !== null) {
          updatedFrontmatter[field] = data[field as keyof ContentItem];
        } else if (field === 'publishedAt') {
          // Explicitly remove publishedAt when its value is null or undefined
          delete updatedFrontmatter[field];
        }
      }
    }
    
    console.log(`🔥 Final frontmatter for ${id}:`, updatedFrontmatter);
    
    // Handle custom data fields
    if (data.data) {
      // Merge custom data fields
      Object.assign(updatedFrontmatter, data.data);
    }
    
    // Strip system only fields we don't want in front-matter
    delete updatedFrontmatter.draft;
    delete updatedFrontmatter.collection;
    
    // Ensure the id remains stable in the persisted frontmatter
    updatedFrontmatter.id = id;
  
    const newSlug = updatedFrontmatter.slug || found.slug;
    const newBody = data.body !== undefined ? data.body : body;
  
        const preparedFrontmatter = prepareFrontmatter(updatedFrontmatter);
    console.log(`🔥 Prepared frontmatter for ${id}:`, preparedFrontmatter);
    
    const newContent = matter.stringify(
      newBody,
      preparedFrontmatter
    );
    
    console.log(`🔥 New content to write for ${id}:`, newContent.substring(0, 200) + '...');

    let finalFilePath = found.filePath;
    if (newSlug !== found.slug) {
      const newPath = path.join(path.dirname(found.filePath), `${newSlug}.md`);
      await fs.rename(found.filePath, newPath);
      finalFilePath = newPath;
    }
    
    await fs.writeFile(finalFilePath, newContent);
    console.log(`🔥 File written to ${finalFilePath}`);
    
    // Instead of re-reading the file, construct the updated item directly
    const updatedItem: ContentItem = {
      id: id,
      collection: collectionSlug,
      slug: newSlug,
      title: updatedFrontmatter.title || 'Untitled',
      seoTitle: updatedFrontmatter.seoTitle,
      seoDescription: updatedFrontmatter.seoDescription,
      ogImage: updatedFrontmatter.ogImage,
      body: newBody,
      data: (() => {
        const { title, slug, seoTitle, seoDescription, ogImage, publishedAt, id: itemId, ...customData } = updatedFrontmatter;
        return customData;
      })(),
      draft: updatedFrontmatter.draft || null,
      createdAt: new Date().toISOString(), // We don't have the original creation time, but this is for immediate response
      updatedAt: new Date().toISOString(),
      publishedAt: updatedFrontmatter.publishedAt,
    };
    
    console.log(`🔥 Returning constructed item for ${id}:`, { ...updatedItem, body: updatedItem.body.substring(0, 50) + '...' });
    
    return updatedItem;
  }

  async deleteContent(collectionSlug: string, contentSlug: string): Promise<void> {
    const collection = (await this.collectionsManager).getCollection(collectionSlug);
    if (!collection) throw new Error(`Collection ${collectionSlug} not found`);

    const filePath = path.join(
      COLLECTIONS_DIR,
      collectionSlug,
      collection.contentPath,
      `${contentSlug}.md`
    );

    try {
      await fs.unlink(filePath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, which is fine for a delete operation.
        console.warn(`Attempted to delete non-existent file: ${filePath}`);
        return;
      }
      throw error;
    }
  }

  async deleteContentById(collectionSlug: string, id: string): Promise<void> {
    const filePath = await this.getFilePath(collectionSlug, id);
    await fs.unlink(filePath);
  }

  async searchContent(query: string, collectionSlugs?: string[], publishedOnly: boolean = false): Promise<ContentItem[]> {
    const cm = await this.collectionsManager;
    const collectionsToSearch = collectionSlugs
      ? collectionSlugs.map(slug => cm.getCollection(slug)).filter(Boolean) as CollectionConfig[]
      : cm.getAllCollections();

    let results: ContentItem[] = [];

    for (const collection of collectionsToSearch) {
      const { items } = await this.listContent(collection.slug, { publishedOnly });
      results = results.concat(
        items.filter(item => 
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          (item.body && item.body.toLowerCase().includes(query.toLowerCase()))
        )
      );
    }

    return results;
  }

  async updateDraftById(collectionSlug: string, id: string, draftData: Partial<ContentItem>): Promise<ContentItem | null> {
    const found = await this.findItemById(collectionSlug, id);
    if (!found) throw new Error(`Content item with ID ${id} not found.`);

    const fileContent = await fs.readFile(found.filePath, 'utf-8');
    const { data: frontmatter, content: body } = matter(fileContent);

    // Merge new draft data with existing draft data
    const newDraft = { ...(frontmatter.draft || {}), ...draftData };

    const newFrontmatter = { ...frontmatter, draft: newDraft };

    const newContent = matter.stringify(body, newFrontmatter);
    await fs.writeFile(found.filePath, newContent);

    return this.getContentItemById(collectionSlug, id);
  }

  private async getFilePath(collectionSlug: string, id: string): Promise<string> {
    const collectionConfig = (await this.collectionsManager).getCollection(collectionSlug);
    if (!collectionConfig) {
      throw new Error(`Collection not found: ${collectionSlug}`);
    }

    const contentDir = path.join(COLLECTIONS_DIR, collectionSlug, collectionConfig.contentPath);
    const files = await fs.readdir(contentDir);
    const file = files.find(f => path.basename(f, path.extname(f)) === id);

    if (!file) {
      throw new Error(`File with id ${id} not found in ${collectionSlug}`);
    }

    return path.join(contentDir, file);
  }

  private async parseFile(filePath: string, collectionSlug: string): Promise<ContentItem | null> {
    try {
      const collection = (await this.collectionsManager).getCollection(collectionSlug);
      if (!collection) return null;

      const fileContent = await fs.readFile(filePath, 'utf-8');
      const stats = await fs.stat(filePath);
      let { data: frontmatter, content: body } = matter(fileContent);

      // Ensure every piece of content has a stable UUID. If missing, generate one
      // and persist it back to the markdown file so future reads are stable.
      let id: string;
      if (!frontmatter.id) {
        id = uuidv4();
        frontmatter = { ...frontmatter, id };
        try {
          const newContentWithId = matter.stringify(body, frontmatter);
          await fs.writeFile(filePath, newContentWithId);
        } catch (writeErr) {
          console.error(`Failed to persist generated id to ${filePath}:`, writeErr);
        }
      } else {
        id = frontmatter.id;
      }

      const slug = frontmatter.slug || path.basename(filePath, '.md');

      const liveData = { ...frontmatter };
      const draftData = liveData.draft || null;
      if (liveData.draft) delete liveData.draft;

      const displayData = { ...liveData, ...draftData };

      // Extract system fields to top level
      const { 
        title, 
        seoTitle, 
        seoDescription, 
        ogImage, 
        publishedAt,
        slug: dataSlug,
        id: dataId,
        ...customData 
      } = displayData;

      return {
        id: id,
        collection: collectionSlug,
        slug: slug,
        title: title || 'Untitled',
        seoTitle: seoTitle,
        seoDescription: seoDescription,
        ogImage: ogImage,
        body: body,
        data: customData, // Only custom fields go in data
        draft: draftData,
        createdAt: stats.birthtime.toISOString(),
        updatedAt: stats.mtime.toISOString(),
        publishedAt: publishedAt,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(`Error parsing file ${filePath}:`, error);
      }
      return null;
    }
  }
}

// Singleton instance
let contentManager: ContentManager | null = null;

export function getContentManager(): ContentManager {
  if (!contentManager) {
    contentManager = new ContentManager();
  }
  return contentManager;
} 