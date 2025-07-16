export interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'markdown' | 'body' | 'number' | 'boolean' | 'date' | 'datetime' | 'select' | 'multiselect' | 'reference' | 'multi-reference' | 'image' | 'json';
  required?: boolean;
  inTable?: boolean;
  placeholder?: string;
  description?: string;
  options?: string[]; // For select and multiselect fields
  /**
   * For reference and multi-reference fields, specify which collection the field should reference.
   * Holds the slug of the target collection.
   */
  referenceCollection?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  default?: any;
  meta?: Record<string, any>;
}

export interface CollectionConfig {
  site_id: string;
  name: string;
  slug: string;
  description?: string;
  contentPath: string;
  urlPattern: string;
  fields: FieldConfig[];
  settings?: {
    allowCreate?: boolean;
    allowEdit?: boolean;
    allowDelete?: boolean;
    indexField?: string;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  };
  seo?: {
    titleTemplate?: string;
    defaultDescription?: string;
    defaultOgImage?: string;
    ogImageTemplate?: string;
    titleField?: string;
    descriptionField?: string;
    imageField?: string;
  };
}

export interface ContentItem {
  id: string;
  slug: string;
  collection: string;
  title: string;
  body: string;
  data: Record<string, any>;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  draft?: any; // To satisfy CollectionTable
  
  // SEO fields
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  
  meta?: {
    lastEditedBy?: string;
    version?: number;
  };
}

export interface ContentListResponse {
  items: ContentItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ParsedContent {
  content: string;
  data: Record<string, any>;
  excerpt?: string;
}

export interface ContentMeta {
  id: string;
  title: string;
  slug: string;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface SEOData {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  canonicalUrl: string;
  jsonLd: SchemaDefinition[];
}

export interface SchemaDefinition {
  '@context': string;
  '@type': string;
  [key: string]: any;
} 