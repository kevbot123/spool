export interface SpoolConfig {
  apiKey: string;
  siteId: string;
  baseUrl?: string;
}

export interface SpoolContent {
  id: string;
  slug: string;
  title?: string;
  data: Record<string, any>;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface SpoolCollection {
  id: string;
  name: string;
  slug: string;
  schema: Record<string, any>;
  created_at: string;
} 