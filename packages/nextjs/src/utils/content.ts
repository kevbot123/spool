import { SpoolConfig } from '../types';

// ---------------------------------------------------------------------------
// Simple in-memory request cache to deduplicate identical, short-lived requests
// ---------------------------------------------------------------------------
interface CacheEntry<T> {
  timestamp: number;
  promise: Promise<T>;
}

const REQUEST_DEDUP_WINDOW_MS = 5_000; // 5 seconds – enough for build/dev usage
const requestCache: Map<string, CacheEntry<any>> = new Map();

async function fetchWithDedup<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const cached = requestCache.get(key);

  // If there is an in-flight request less than x ms old, reuse its promise
  if (cached && now - cached.timestamp < REQUEST_DEDUP_WINDOW_MS) {
    return cached.promise;
  }

  const promise = fetcher().finally(() => {
    // Clean up old cache entries to avoid unbounded growth
    requestCache.delete(key);
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

const SPOOL_API_BASE = process.env.SPOOL_API_BASE || 'http://localhost:3000';

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
  const response = await fetchWithDedup(cacheKey, () =>
    fetchWithTimeout(`${baseUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    })
  );
  
  if (!response.ok) {
    // Gracefully handle errors (rate-limit, 5xx) by returning empty values
    if (slug) {
      return null;
    }
    return [];
  }
  
  const data = await response.json();
  
  // Handle different response formats
  if (slug) {
    // Single item - return just the item (could be null if not found)
    return data?.item ?? data ?? null;
  }
  
  // Collection request – always return an array for consistency
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data?.items)) {
    return data.items;
  }
  // If API returned an empty object or unexpected shape, fall back to []
  return [];

}

/**
 * Helper function to get all collections from Spool CMS
 */
export async function getSpoolCollections(config: SpoolConfig) {
  const { apiKey, siteId, baseUrl = SPOOL_API_BASE } = config;
  
  const collEndpoint = `${baseUrl}/api/spool/${siteId}/collections`;
  const response = await fetchWithDedup(collEndpoint, () =>
    fetchWithTimeout(collEndpoint, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    })
  );
  
  if (!response.ok) {
    // On errors just return an empty array so callers don’t retry forever
    return [];
  }
  
  const data = await response.json();
  
  // Always return an array of collections
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data?.collections)) {
    return data.collections;
  }
  return [];
}

/**
 * Generate sitemap for your site
 */
export async function getSpoolSitemap(config: SpoolConfig): Promise<string> {
  const { apiKey, siteId, baseUrl = SPOOL_API_BASE } = config;
  
  const response = await fetch(`${baseUrl}/api/spool/${siteId}/sitemap`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to generate sitemap: ${response.statusText}`);
  }
  
  return response.text();
}

/**
 * Generate robots.txt for your site
 */
export async function getSpoolRobots(config: SpoolConfig): Promise<string> {
  const { apiKey, siteId, baseUrl = SPOOL_API_BASE } = config;
  
  const response = await fetch(`${baseUrl}/api/spool/${siteId}/robots`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to generate robots.txt: ${response.statusText}`);
  }
  
  return response.text();
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