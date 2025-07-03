import { SpoolConfig } from '../types';

const SPOOL_API_BASE = process.env.SPOOL_API_BASE || 'http://localhost:3000';

/**
 * Helper function to get content from Spool CMS (for use in getStaticProps, etc.)
 */
export async function getSpoolContent(
  config: SpoolConfig,
  collection: string,
  slug?: string
) {
  const { apiKey, siteId, baseUrl = SPOOL_API_BASE } = config;
  
  const endpoint = slug 
    ? `/api/spool/${siteId}/content/${collection}/${slug}`
    : `/api/spool/${siteId}/content/${collection}`;
  
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch content: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Handle different response formats
  if (slug) {
    // Single item - return just the item
    return data.item || data;
  } else {
    // Collection - return just the items array
    return data.items || data;
  }
}

/**
 * Helper function to get all collections from Spool CMS
 */
export async function getSpoolCollections(config: SpoolConfig) {
  const { apiKey, siteId, baseUrl = SPOOL_API_BASE } = config;
  
  const response = await fetch(`${baseUrl}/api/spool/${siteId}/collections`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch collections: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Return just the collections array
  return data.collections || data;
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