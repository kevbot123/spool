export interface SpoolConfig {
  apiKey?: string;
  siteId?: string;
  baseUrl?: string;
}

// Image object interface for ogImage and other image fields
export interface ImageObject {
  original: string;
  thumb: string;
  small: string;
}

// Base content interface with common fields
interface SpoolContentBase {
  // System fields
  id: string;
  slug: string;
  title: string;
  created_at: string;
  updated_at: string;
  
  // SEO fields (available on all content by default)
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string | ImageObject;
  
  // Common content fields
  body?: string;
  body_markdown?: string;
  author?: string;
  excerpt?: string;
  tags?: string[];
  featured?: boolean;
  template?: string;
  category?: string;
  
  // Allow any additional custom fields
  [key: string]: any;
}

// Draft content - published_at is undefined
export interface SpoolDraftContent extends SpoolContentBase {
  status: 'draft';
  published_at?: undefined;
}

// Published content - published_at is guaranteed to exist
export interface SpoolPublishedContent extends SpoolContentBase {
  status: 'published';
  published_at: string;
}

// Default SpoolContent type assumes published content (most common use case)
// This means published_at is guaranteed to exist for typical usage
export type SpoolContent = SpoolPublishedContent;

// Union type for when you need both draft and published content
export type SpoolContentWithDrafts = SpoolDraftContent | SpoolPublishedContent;

// Type guards for narrowing content types (use with SpoolContentWithDrafts)
export function isPublishedContent(content: SpoolContentWithDrafts): content is SpoolPublishedContent {
  return content.status === 'published';
}

export function isDraftContent(content: SpoolContentWithDrafts): content is SpoolDraftContent {
  return content.status === 'draft';
}

// Specific content types for better DX
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

// Published versions of specific types
export interface PublishedBlogPost extends BlogPost {
  status: 'published';
  published_at: string;
}

export interface PublishedPage extends Page {
  status: 'published';
  published_at: string;
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
  includeDrafts?: boolean; // When true, returns SpoolContentWithDrafts
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