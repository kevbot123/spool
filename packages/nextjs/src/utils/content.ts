import { SpoolConfig, GetSpoolContentOptions, GetSpoolStaticParamsOptions, GenerateSpoolSitemapOptions, SpoolMetadata, SpoolContent } from '../types';
import { resolveConfig, ResolvedConfig } from './config';
import { generateCacheKey, globalCache, createCachedFetch } from './cache';
import { detectEnvironment } from './environment';

// Content fetching options
export interface ContentOptions {
  renderHtml?: boolean; // Default: true (always render HTML for better DX)
  revalidate?: number;
  cache?: 'force-cache' | 'no-store' | 'default';
}

// Error types for better error handling
export class SpoolError extends Error {
  constructor(
    message: string,
    public code: 'NETWORK_ERROR' | 'AUTH_ERROR' | 'NOT_FOUND' | 'RATE_LIMITED' | 'SERVER_ERROR',
    public status?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'SpoolError';
  }
}

// Helper to add a timeout to fetch calls
function fetchWithTimeout(resource: RequestInfo | URL, options: RequestInit = {}, timeoutMs = 10_000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  const mergedOptions = { ...options, signal: controller.signal };
  return fetch(resource, mergedOptions).finally(() => clearTimeout(id));
}

// Enhanced fetch function with proper error handling and retry logic
async function enhancedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const environment = detectEnvironment();
  const cachedFetch = createCachedFetch();
  
  try {
    let response: Response;
    
    if (environment.isServer) {
      // Server-side: use Next.js fetch with caching
      const fetchOptions: any = {
        ...options,
        next: {
          revalidate: 300, // 5 minutes default
          ...((options as any).next || {}),
        },
      };
      response = await cachedFetch(url, fetchOptions);
    } else {
      // Client-side: use regular fetch with timeout
      response = await fetchWithTimeout(url, options);
    }
    
    if (!response.ok) {
      throw createSpoolError(response);
    }
    
    return response;
  } catch (error) {
    if (error instanceof SpoolError) {
      throw error;
    }
    
    // Handle network errors
    if (error instanceof TypeError || (error as any).name === 'AbortError') {
      throw new SpoolError(
        'Network error: Unable to connect to Spool CMS',
        'NETWORK_ERROR',
        undefined,
        true
      );
    }
    
    throw new SpoolError(
      `Unexpected error: ${(error as any).message}`,
      'SERVER_ERROR',
      undefined,
      false
    );
  }
}

// Create appropriate SpoolError from HTTP response
function createSpoolError(response: Response): SpoolError {
  const status = response.status;
  
  switch (status) {
    case 401:
    case 403:
      return new SpoolError(
        'Authentication failed: Invalid API key or insufficient permissions',
        'AUTH_ERROR',
        status,
        false
      );
    case 404:
      return new SpoolError(
        'Content not found',
        'NOT_FOUND',
        status,
        false
      );
    case 429:
      return new SpoolError(
        'Rate limit exceeded: Too many requests',
        'RATE_LIMITED',
        status,
        true
      );
    case 500:
    case 502:
    case 503:
    case 504:
      return new SpoolError(
        'Server error: Spool CMS is temporarily unavailable',
        'SERVER_ERROR',
        status,
        true
      );
    default:
      return new SpoolError(
        `HTTP ${status}: ${response.statusText}`,
        'SERVER_ERROR',
        status,
        status >= 500
      );
  }
}

// Retry logic with exponential backoff
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: SpoolError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof SpoolError ? error : new SpoolError(
        (error as any).message,
        'SERVER_ERROR',
        undefined,
        false
      );
      
      // Don't retry non-retryable errors
      if (!lastError.retryable || attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}



/**
 * Flatten content item structure to provide unified field access
 * Merges data fields with top-level fields, with data fields taking precedence
 * Creates smart markdown field objects for better developer experience
 */
function flattenContentItem(item: any): any {
  if (!item || typeof item !== 'object') {
    return item;
  }

  const { data, ...systemFields } = item;
  
  // If there's no data object, return as-is
  if (!data || typeof data !== 'object') {
    return item;
  }

  // Process data fields to create smart markdown objects and image objects
  const processedData = { ...data };
  
  // Find markdown fields and create smart objects
  Object.keys(data).forEach(fieldName => {
    const htmlFieldName = `${fieldName}_html`;
    
    // If we have both markdown and HTML versions, use HTML as default and store markdown separately
    if (data[fieldName] && data[htmlFieldName]) {
      // Use HTML as the default value (React-serializable)
      processedData[fieldName] = data[htmlFieldName];
      // Store markdown in a separate field for access when needed
      processedData[`${fieldName}_markdown`] = data[fieldName];
      // Remove the _html field since the main field now contains HTML
      delete processedData[htmlFieldName];
    }
  });

  // Process image fields to create image objects with thumbnail URLs
  Object.keys(processedData).forEach(fieldName => {
    const fieldValue = processedData[fieldName];
    
    // Check if this looks like an image URL string
    if (typeof fieldValue === 'string' && 
        (fieldValue.includes('/media/') || fieldValue.includes('storage')) &&
        (fieldValue.match(/\.(jpg|jpeg|png|gif|webp)$/i))) {
      
      // Generate thumbnail URLs by replacing extension with suffix + webp
      const originalUrl = fieldValue;
      const thumbUrl = originalUrl.replace(/(\.[^.]+)$/, '_thumb.webp');
      const smallUrl = originalUrl.replace(/(\.[^.]+)$/, '_small.webp');
      
      // Replace the string with an image object
      processedData[fieldName] = {
        original: originalUrl,
        thumb: thumbUrl,
        small: smallUrl
      };
    }
  });

  // Merge system fields with processed data fields, data fields take precedence
  const flattened = {
    ...systemFields,
    ...processedData,
    // Keep original data object for backward compatibility (marked as deprecated)
    data: {
      ...data,
      __deprecated: 'Access fields directly on the item instead of item.data.field'
    }
  };

  return flattened;
}

// Export for testing
export const __testing__ = {
  clearCache: () => globalCache.clear(),
  disableCache: false,
  flattenContentItem,
};

/**
 * Main function to get content from Spool CMS
 * Works seamlessly in both server and client components
 * 
 * Supports both old and new API:
 * - getSpoolContent(config, 'blog') // Old way
 * - getSpoolContent({ collection: 'blog' }) // New simplified way
 */
export async function getSpoolContent<T = SpoolContent>(
  options: GetSpoolContentOptions
): Promise<T> {
  const { collection, slug, config, ...contentOptions } = options;
  
  // Use provided config or default from environment
  const resolvedConfig = resolveConfig(config || {
    apiKey: process.env.SPOOL_API_KEY!,
    siteId: process.env.SPOOL_SITE_ID!,
  });
  
  // Build endpoint URL
  let endpoint = slug 
    ? `/api/spool/${resolvedConfig.siteId}/content/${collection}/${slug}`
    : `/api/spool/${resolvedConfig.siteId}/content/${collection}`;

  // Always request HTML for markdown fields by default (better DX)
  // Users can opt out by setting renderHtml: false
  const shouldRenderHtml = contentOptions?.renderHtml !== false;
  if (shouldRenderHtml) {
    endpoint += '?_html=true';
  }
  
  const url = `${resolvedConfig.baseUrl}${endpoint}`;
  const cacheKey = generateCacheKey(
    resolvedConfig.baseUrl,
    resolvedConfig.siteId,
    collection,
    slug,
    contentOptions
  );
  
  try {
    // Use unified caching that works in both server and client contexts
    const data = await globalCache.getOrFetch(cacheKey, async () => {
      return withRetry(async () => {
        const response = await enhancedFetch(url, {
          headers: {
            'Authorization': `Bearer ${resolvedConfig.apiKey}`,
          },
          // next: options?.revalidate ? { revalidate: options.revalidate } : undefined,
          cache: options?.cache,
        });
        
        try {
          return await response.json();
        } catch (jsonError) {
          // Handle "Body is unusable" error by retrying without cache
          if ((jsonError as any).message?.includes('unusable') || (jsonError as any).message?.includes('disturbed')) {
            // Clear cache and retry
            globalCache.clear();
            const retryResponse = await enhancedFetch(url, {
              headers: {
                'Authorization': `Bearer ${resolvedConfig.apiKey}`,
              },
              cache: 'no-store', // Force no cache on retry
            });
            return await retryResponse.json();
          }
          throw jsonError;
        }
      });
    });
    
    // Handle different response formats
    if (slug) {
      // Single item - return just the item (could be null if not found)
      const item = (data as any)?.item ?? data ?? null;
      return item ? flattenContentItem(item) as T : (null as any);
    }
    
    // Collection request – always return an array for consistency
    let items: any[] = [];
    if (Array.isArray(data)) {
      items = data;
    } else if (Array.isArray((data as any)?.items)) {
      items = (data as any).items;
    }
    
    // Flatten each item in the collection
    return items.map(item => flattenContentItem(item)) as any;
    
  } catch (error) {
    if (error instanceof SpoolError) {
      // For NOT_FOUND errors, return appropriate empty values
      if (error.code === 'NOT_FOUND') {
        return (slug ? null : []) as any;
      }
      
      // Log API errors for debugging
      if (resolvedConfig.environment.isDevelopment) {
        console.error(`SpoolCMS API error: ${error.message}`);
      }
    } else {
      // Log other errors for debugging
      if (resolvedConfig.environment.isDevelopment) {
        console.error('SpoolCMS content fetch failed:', error);
      }
    }
    
    // Always return empty values on any error to prevent breaking the UI
    return (slug ? null : []) as any;
  }
}

/**
 * Generate static params for Next.js generateStaticParams - ONE LINE HELPER
 * Supports both old and new API
 */
export async function getSpoolStaticParams(
  options: GetSpoolStaticParamsOptions
): Promise<{ slug: string }[]> {
  const { collection, config } = options;
  const items = await getSpoolContent<any[]>({ collection, config });
  return Array.isArray(items) ? items.map(item => ({ slug: item.slug })) : [];
}

/**
 * Generate sitemap for Next.js sitemap.ts - ONE LINE HELPER
 * Supports both old and new API
 */
export async function generateSpoolSitemap(
  options: GenerateSpoolSitemapOptions
): Promise<any[]> {
  const { collections, staticPages, config } = options;
  // Auto-detect site URL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                  'http://localhost:3000';
  
  const sitemap: any[] = [];
  
  // Add static pages
  if (staticPages) {
    sitemap.push(...staticPages.map(page => ({
      url: `${siteUrl}${page.url}`,
      lastModified: new Date(),
      changeFrequency: page.changeFrequency || 'monthly',
      priority: page.priority || 0.8,
    })));
  }
  
  // Add content from collections
  for (const collection of collections) {
    try {
      const items = await getSpoolContent<any[]>({ collection, config });
      if (Array.isArray(items)) {
        sitemap.push(...items.map(item => ({
          url: `${siteUrl}/${collection}/${item.slug}`,
          lastModified: new Date(item.updated_at || item.created_at),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        })));
      }
    } catch (error) {
      console.warn(`Failed to fetch ${collection} for sitemap:`, error);
    }
  }
  
  return sitemap;
}

/**
 * Helper function to get all collections from Spool CMS
 * Supports both old and new API
 */
export async function getSpoolCollections(config?: SpoolConfig) {
  // Auto-detect config if not provided
  const resolvedConfigInput = config || {
    apiKey: process.env.SPOOL_API_KEY!,
    siteId: process.env.SPOOL_SITE_ID!,
  };
  const resolvedConfig = resolveConfig(resolvedConfigInput);
  const url = `${resolvedConfig.baseUrl}/api/spool/${resolvedConfig.siteId}/collections`;
  const cacheKey = generateCacheKey(resolvedConfig.baseUrl, resolvedConfig.siteId, 'collections');
  
  try {
    const data = await globalCache.getOrFetch(cacheKey, async () => {
      return withRetry(async () => {
        const response = await enhancedFetch(url, {
          headers: {
            'Authorization': `Bearer ${resolvedConfig.apiKey}`,
          },
        });
        
        try {
          return await response.json();
        } catch (jsonError) {
          // Handle "Body is unusable" error by retrying without cache
          if ((jsonError as any).message?.includes('unusable') || (jsonError as any).message?.includes('disturbed')) {
            // Clear cache and retry
            globalCache.clear();
            const retryResponse = await enhancedFetch(url, {
              headers: {
                'Authorization': `Bearer ${resolvedConfig.apiKey}`,
              },
              cache: 'no-store', // Force no cache on retry
            });
            return await retryResponse.json();
          }
          throw jsonError;
        }
      });
    });
    
    // Always return an array of collections
    if (Array.isArray(data)) {
      return data;
    }
    if (Array.isArray((data as any)?.collections)) {
      return (data as any).collections;
    }
    return [];
    
  } catch (error) {
    if (error instanceof SpoolError) {
      // Log API errors for debugging
      if (resolvedConfig.environment.isDevelopment) {
        console.error(`SpoolCMS Collections API error: ${error.message}`);
      }
    } else {
      // Log other errors for debugging
      if (resolvedConfig.environment.isDevelopment) {
        console.error('SpoolCMS collections fetch failed:', error);
      }
    }
    return [];
  }
}





/**
 * Generate metadata for Next.js App Router - SIMPLIFIED VERSION
 * Auto-detects site URL, path, and everything else from Next.js context
 */
export function generateSpoolMetadata(content: any): SpoolMetadata {
  if (!content) {
    return { 
      title: 'Content Not Found',
      description: '',
      openGraph: {
        title: 'Content Not Found',
        description: '',
        siteName: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        images: [],
        type: 'article',
      },
      robots: 'noindex,nofollow',
    };
  }
  
  // Auto-detect site URL from environment
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                  'http://localhost:3000';
  
  const title = content?.seoTitle || content?.title || 'Untitled';
  const description = content?.seoDescription || content?.description || content?.excerpt || '';
  
  // Handle ogImage which can be string or ImageSizes object
  const ogImageUrl = content?.ogImage 
    ? (typeof content.ogImage === 'string' ? content.ogImage : content.ogImage.original)
    : `${siteUrl}/api/og?title=${encodeURIComponent(title)}`;
  
  return {
    title,
    description,
    openGraph: {
      title: content?.ogTitle || title,
      description: content?.ogDescription || description,
      siteName: siteUrl,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: [ogImageUrl],
    },
    robots: content?.noIndex ? 'noindex,nofollow' : 'index,follow',
  };
}

/**
 * Legacy version for backward compatibility
 * @deprecated Use generateSpoolMetadata(content) instead
 */
export function generateSpoolMetadataLegacy(options: {
  content: any;
  collection: string;
  path: string;
  siteUrl: string;
}) {
  console.warn('generateSpoolMetadata with options object is deprecated. Use generateSpoolMetadata(content) instead.');
  return generateSpoolMetadata(options.content);
} 