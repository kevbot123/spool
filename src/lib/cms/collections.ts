import { CollectionConfig, FieldConfig } from '@/types/cms';
import fs from 'fs/promises';
import path from 'path';

const CONTENT_DIR = path.join(process.cwd(), 'content');
const COLLECTIONS_DIR = path.join(CONTENT_DIR, 'collections');
const SCHEMA_DIR = path.join(CONTENT_DIR, 'schemas');

export class CollectionsManager {
  private collections: Map<string, CollectionConfig> = new Map();
  private defaultFields: FieldConfig[] = [];

  async initialize() {
    // Load default fields
    const fieldTypesPath = path.join(SCHEMA_DIR, 'field-types.json');
    try {
      const fieldTypesData = await fs.readFile(fieldTypesPath, 'utf-8');
      const { defaultFields } = JSON.parse(fieldTypesData);
      this.defaultFields = defaultFields;
    } catch (error) {
      console.error('Error loading field types:', error);
    }

    // Load all collection configs
    await this.loadCollections();
  }

  private async loadCollections() {
    try {
      const collections = await fs.readdir(COLLECTIONS_DIR);
      
      for (const collectionDir of collections) {
        const configPath = path.join(COLLECTIONS_DIR, collectionDir, 'config.json');
        
        try {
          const configData = await fs.readFile(configPath, 'utf-8');
          const config: CollectionConfig = JSON.parse(configData);
          
          // Merge default fields with collection fields
          const mergedFields = [...this.defaultFields, ...config.fields];
          config.fields = mergedFields;
          
          this.collections.set(config.slug, config);
        } catch (error) {
          console.error(`Error loading collection config for ${collectionDir}:`, error);
        }
      }
    } catch (error) {
      console.error('Error loading collections:', error);
    }
  }

  getCollection(slug: string): CollectionConfig | undefined {
    return this.collections.get(slug);
  }

  getAllCollections(): CollectionConfig[] {
    return Array.from(this.collections.values());
  }

  getCollectionByUrlPattern(url: string): { collection: CollectionConfig; params: Record<string, string> } | null {
    for (const collection of this.collections.values()) {
      const pattern = collection.urlPattern;
      const regex = new RegExp('^' + pattern.replace(/{(\w+)}/g, '(?<$1>[^/]+)') + '$');
      const match = url.match(regex);
      
      if (match && match.groups) {
        return {
          collection,
          params: match.groups as Record<string, string>
        };
      }
    }
    
    return null;
  }

  async saveCollection(slug: string, config: CollectionConfig) {
    const configPath = path.join(COLLECTIONS_DIR, slug, 'config.json');
    
    // Remove default fields before saving
    const configToSave = {
      ...config,
      fields: config.fields.filter(field => 
        !this.defaultFields.some(df => df.name === field.name)
      )
    };
    
    await fs.writeFile(configPath, JSON.stringify(configToSave, null, 2));
    this.collections.set(slug, config);
  }

  async createCollection(config: CollectionConfig) {
    const collectionDir = path.join(COLLECTIONS_DIR, config.slug);
    const contentDir = path.join(collectionDir, config.contentPath);
    
    // Create directories
    await fs.mkdir(contentDir, { recursive: true });
    
    // Save config
    await this.saveCollection(config.slug, config);
  }
}

// Singleton instance
let collectionsManager: CollectionsManager | null = null;

export async function getCollectionsManager(): Promise<CollectionsManager> {
  if (!collectionsManager) {
    collectionsManager = new CollectionsManager();
    await collectionsManager.initialize();
  }
  return collectionsManager;
} 