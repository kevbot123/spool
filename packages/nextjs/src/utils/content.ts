import { SpoolConfig } from '../types';
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
      
      // Generate thumbnail URLs by modifying the original URL
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
 */
export async function getSpoolContent<T = any>(
  config: SpoolConfig,
  collection: string,
  slug?: string,
  options?: ContentOptions
): Promise<T> {
  // Resolve configuration with environment detection
  const resolvedConfig = resolveConfig(config);
  
  // Build endpoint URL
  let endpoint = slug 
    ? `/api/spool/${resolvedConfig.siteId}/content/${collection}/${slug}`
    : `/api/spool/${resolvedConfig.siteId}/content/${collection}`;

  // Always request HTML for markdown fields by default (better DX)
  // Users can opt out by setting renderHtml: false
  const shouldRenderHtml = options?.renderHtml !== false;
  if (shouldRenderHtml) {
    endpoint += '?_html=true';
  }
  
  const url = `${resolvedConfig.baseUrl}${endpoint}`;
  const cacheKey = generateCacheKey(
    resolvedConfig.baseUrl,
    resolvedConfig.siteId,
    collection,
    slug,
    options
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
      return item ? flattenContentItem(item) as T : null as T;
    }
    
    // Collection request – always return an array for consistency
    let items: any[] = [];
    if (Array.isArray(data)) {
      items = data;
    } else if (Array.isArray((data as any)?.items)) {
      items = (data as any).items;
    }
    
    // Flatten each item in the collection
    return items.map(item => flattenContentItem(item)) as T;
    
  } catch (error) {
    if (error instanceof SpoolError) {
      // For NOT_FOUND errors, return appropriate empty values
      if (error.code === 'NOT_FOUND') {
        return (slug ? null : []) as T;
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
    return (slug ? null : []) as T;
  }
}

/**
 * Helper function to get all collections from Spool CMS
 */
export async function getSpoolCollections(config: SpoolConfig) {
  const resolvedConfig = resolveConfig(config);
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
 * Generate metadata for Next.js App Router
 */
export function generateSpoolMetadata(options: {
  content: any;
  collection: string;
  path: string;
  siteUrl: string;
}) {
  const { content, collection, path, siteUrl } = options;
  
  const title = content.seoTitle || content.title || 'Untitled';
  const description = content.seoDescription || content.description || content.excerpt || '';
  const canonicalUrl = content.canonicalUrl || `${siteUrl}${path}`;
  const ogImage = content.ogImage || `${siteUrl}/api/og?title=${encodeURIComponent(title)}`;
  
  return {
    title,
    description,
    canonical: canonicalUrl,
    openGraph: {
      title: content.ogTitle || title,
      description: content.ogDescription || description,
      url: canonicalUrl,
      siteName: siteUrl,
      images: [
        {
          url: ogImage,
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
      images: [ogImage],
    },
    robots: content.data?.noIndex ? 'noindex,nofollow' : 'index,follow',
  };
} 