import { SpoolConfig } from '../types';

// ---------------------------------------------------------------------------
// Simple in-memory request cache to deduplicate identical, short-lived requests
// ---------------------------------------------------------------------------
interface CacheEntry<T> {
  timestamp: number;
  promise: Promise<T>;
}

const REQUEST_DEDUP_WINDOW_MS = 5_000; // 5 seconds – enough for build/dev usage
const RESPONSE_TTL_MS = 60_000; // 1 minute response cache to stop loops

// Keeps in-flight promises and fulfilled responses for a short TTL
const requestCache: Map<string, CacheEntry<any> | { timestamp: number; data: any }> = new Map();

// Export for testing
export const __testing__ = {
  requestCache,
  clearCache: () => requestCache.clear(),
  disableCache: false,
};

async function fetchWithDedup<T>(key: string, fetcher: () => Promise<Response>): Promise<T> {
  // Skip caching during tests
  if (__testing__.disableCache) {
    const response = await fetcher();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json() as T;
  }

  const now = Date.now();
  const cached = requestCache.get(key);

  // If a resolved data cache entry exists and is fresh, return it immediately
  if (cached && 'data' in cached && now - cached.timestamp < RESPONSE_TTL_MS) {
    return cached.data as T;
  }

  // If there is an in-flight request less than x ms old, reuse its promise
  if (cached && 'promise' in cached && now - cached.timestamp < REQUEST_DEDUP_WINDOW_MS) {
    return cached.promise as Promise<T>;
  }

  const promise = fetcher().then(async (response) => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    // Store resolved data for TTL window
    requestCache.set(key, { timestamp: Date.now(), data });
    return data;
  });

  requestCache.set(key, { timestamp: now, promise });
  return promise;
}

// Helper to add a timeout to fetch calls (prevents runaway 20+ second waits)
function fetchWithTimeout(resource: RequestInfo | URL, options: RequestInit = {}, timeoutMs = 10_000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  const mergedOptions = { ...options, signal: controller.signal };
  return fetch(resource, mergedOptions).finally(() => clearTimeout(id));
}

// Smart default for Spool API base URL
function getDefaultSpoolApiBase(): string {
  // If explicitly set, use that
  if (process.env.SPOOL_API_BASE || process.env.SPOOL_BASE_URL) {
    return process.env.SPOOL_API_BASE || process.env.SPOOL_BASE_URL!;
  }
  
  // Auto-detect based on environment
  if (process.env.NODE_ENV === 'production') {
    // In production, try to use the same domain as the site
    return process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || 'http://localhost:3000';
  }
  
  // Default to localhost for development
  return 'http://localhost:3000';
}

const SPOOL_API_BASE = getDefaultSpoolApiBase();

/**
 * Helper function to get content from Spool CMS (for use in getStaticProps, etc.)
 */
export async function getSpoolContent(
  config: SpoolConfig,
  collection: string,
  slug?: string,
  options?: { renderHtml?: boolean }
) {
  const { apiKey, siteId, baseUrl = SPOOL_API_BASE } = config;
  
  let endpoint = slug 
    ? `/api/spool/${siteId}/content/${collection}/${slug}`
    : `/api/spool/${siteId}/content/${collection}`;

  if (options?.renderHtml) {
    endpoint += '?_html=true';
  }
  
  const cacheKey = `${baseUrl}${endpoint}`;
  
  try {
    const data = await fetchWithDedup(cacheKey, () =>
      fetchWithTimeout(`${baseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      })
    );
    
    // Handle different response formats
    if (slug) {
      // Single item - return just the item (could be null if not found)
      return (data as any)?.item ?? data ?? null;
    }
    
    // Collection request – always return an array for consistency
    if (Array.isArray(data)) {
      return data;
    }
    if (Array.isArray((data as any)?.items)) {
      return (data as any).items;
    }
    // If API returned an empty object or unexpected shape, fall back to []
    return [];
    
  } catch (error) {
    console.error('SpoolCMS content fetch failed:', error);
    // Always return empty values on any error
    if (slug) {
      return null;
    }
    return [];
  }
}

/**
 * Helper function to get all collections from Spool CMS
 */
export async function getSpoolCollections(config: SpoolConfig) {
  const { apiKey, siteId, baseUrl = SPOOL_API_BASE } = config;
  
  try {
    const collEndpoint = `${baseUrl}/api/spool/${siteId}/collections`;
    const data = await fetchWithDedup(collEndpoint, () =>
      fetchWithTimeout(collEndpoint, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      })
    );
    
    // Always return an array of collections
    if (Array.isArray(data)) {
      return data;
    }
    if (Array.isArray((data as any)?.collections)) {
      return (data as any).collections;
    }
    return [];
    
  } catch (error) {
    console.error('SpoolCMS collections fetch failed:', error);
    return [];
  }
}

/**
 * Generate sitemap for your site
 */
export async function getSpoolSitemap(config: SpoolConfig): Promise<string> {
  const { apiKey, siteId, baseUrl = SPOOL_API_BASE } = config;
  
  try {
    const response = await fetch(`${baseUrl}/api/spool/${siteId}/sitemap`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    if (!response.ok) {
      console.error(`SpoolCMS Sitemap API error: HTTP ${response.status} ${response.statusText}`);
      return ''; // Return empty sitemap instead of throwing
    }
    
    return response.text();
    
  } catch (error) {
    console.error('SpoolCMS sitemap fetch failed:', error);
    return ''; // Return empty sitemap instead of throwing
  }
}

/**
 * Generate robots.txt for your site
 */
export async function getSpoolRobots(config: SpoolConfig): Promise<string> {
  const { apiKey, siteId, baseUrl = SPOOL_API_BASE } = config;
  
  try {
    const response = await fetch(`${baseUrl}/api/spool/${siteId}/robots`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    if (!response.ok) {
      console.error(`SpoolCMS Robots API error: HTTP ${response.status} ${response.statusText}`);
      return ''; // Return empty robots.txt instead of throwing
    }
    
    return response.text();
    
  } catch (error) {
    console.error('SpoolCMS robots fetch failed:', error);
    return ''; // Return empty robots.txt instead of throwing
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
  
  const title = content.data?.seoTitle || content.data?.title || 'Untitled';
  const description = content.data?.seoDescription || content.data?.description || content.data?.excerpt || '';
  const canonicalUrl = content.data?.canonicalUrl || `${siteUrl}${path}`;
  const ogImage = content.data?.ogImage || `${siteUrl}/api/og?title=${encodeURIComponent(title)}`;
  
  return {
    title,
    description,
    canonical: canonicalUrl,
    openGraph: {
      title: content.data?.ogTitle || title,
      description: content.data?.ogDescription || description,
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