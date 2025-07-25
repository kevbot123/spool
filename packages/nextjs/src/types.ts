export interface SpoolConfig {
  apiKey?: string;
  siteId?: string;
  baseUrl?: string;
}

// Base content interface with system fields
export interface SpoolContentBase {
  id: string;
  slug: string;
  title: string;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
  published_at?: string;
  
  // SEO fields (available on all content)
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string | ImageSizes;
}

// Generic content interface that can be extended
export type SpoolContent<T = Record<string, any>> = SpoolContentBase & T;

// Common content types for better DX
export interface BlogPost extends SpoolContentBase {
  body: string;
  body_markdown?: string;
  author?: string;
  tags?: string[];
  featured?: boolean;
  excerpt?: string;
}

export interface Page extends SpoolContentBase {
  body: string;
  body_markdown?: string;
  template?: string;
}

// Legacy interface for backward compatibility
export interface SpoolContentLegacy {
  id: string;
  slug: string;
  title: string;
  data: Record<string, any>;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
  published_at?: string;
}

// Field types for collection schemas
export interface SpoolField {
  name: string;
  type: 'text' | 'textarea' | 'markdown' | 'number' | 'boolean' | 'date' | 'image' | 'select' | 'multiselect';
  label?: string;
  required?: boolean;
  default?: any;
  options?: string[]; // For select/multiselect fields
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface SpoolCollectionSchema {
  fields: SpoolField[];
}

export interface SpoolCollection {
  id: string;
  name: string;
  slug: string;
  schema: SpoolCollectionSchema;
  created_at: string;
  updated_at?: string;
}

export interface ImageSizes {
  original: string;
  thumb: string;
  small: string;
}

export type ImageSize = 'thumb' | 'small' | 'original';

// New simplified API types
export interface GetSpoolContentOptions {
  collection: string;
  slug?: string;
  config?: SpoolConfig;
  renderHtml?: boolean;
  revalidate?: number;
  cache?: 'force-cache' | 'no-store' | 'default';
}

export interface GetSpoolStaticParamsOptions {
  collection: string;
  config?: SpoolConfig;
}

export interface GenerateSpoolSitemapOptions {
  collections: string[];
  staticPages?: {
    url: string;
    priority?: number;
    changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  }[];
  config?: SpoolConfig;
}

// Utility types for better type inference
export type SpoolContentArray<T = SpoolContent> = T[];
export type SpoolContentSingle<T = SpoolContent> = T | null;

// Helper type for collection-specific content
export type CollectionContent<T extends string> = 
  T extends 'blog' ? BlogPost :
  T extends 'pages' ? Page :
  SpoolContent;

// Metadata types
export interface SpoolMetadata {
  title?: string;
  description?: string;
  robots?: string;
  openGraph: {
    title: string;
    description: string;
    images: Array<{
      url: string;
      width?: number;
      height?: number;
      alt?: string;
    }>;
    siteName: string;
    type: string;
  };
  twitter?: {
    card?: string;
    title?: string;
    description?: string;
    images?: string[];
  };
} 