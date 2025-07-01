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
  
  return response.json();
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
  
  return response.json();
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