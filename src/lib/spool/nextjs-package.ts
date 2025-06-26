// This simulates the @spool/nextjs package that users would install
// npm install @spool/nextjs

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

interface SpoolConfig {
  apiKey: string;
  siteId: string;
  baseUrl?: string;
}

const SPOOL_API_BASE = process.env.SPOOL_API_BASE || 'http://localhost:3000';

/**
 * Create Spool API handlers for Next.js
 * This function returns HTTP handlers that manage content from Spool CMS
 */
export function createSpoolHandler(config: SpoolConfig) {
  const { apiKey, siteId, baseUrl = SPOOL_API_BASE } = config;

  // Helper function to make authenticated requests to Spool API
  async function spoolFetch(endpoint: string, options: RequestInit = {}) {
    const url = `${baseUrl}/api/spool/${siteId}${endpoint}`;
    
    return fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  }

  return {
    // GET /api/spool/[...route] - Fetch content or collections
    async GET(request: NextRequest) {
      try {
        const url = new URL(request.url);
        const pathSegments = url.pathname.split('/').filter(Boolean);
        
        // Remove 'api', 'spool' from path to get the actual resource path
        const resourcePath = pathSegments.slice(2).join('/');
        
        if (!resourcePath) {
          return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
        }

        // Handle different request types
        if (resourcePath === 'collections') {
          // GET /api/spool/collections - Get all collections configuration
          const collectionsResponse = await spoolFetch('/collections');
          const collections = await collectionsResponse.json();
          
          return NextResponse.json(collections);
        }

        if (resourcePath.startsWith('content/')) {
          // GET /api/spool/content/[collection] or /api/spool/content/[collection]/[slug]
          const contentPath = resourcePath.replace('content/', '');
          const queryString = url.search;
          
          const contentResponse = await spoolFetch(`/content/${contentPath}${queryString}`);
          const content = await contentResponse.json();
          
          return NextResponse.json(content);
        }

        return NextResponse.json({ error: 'Not found' }, { status: 404 });

      } catch (error) {
        console.error('Spool GET error:', error);
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }
    },

    // POST /api/spool/[...route] - Create content or publish
    async POST(request: NextRequest) {
      try {
        const url = new URL(request.url);
        const pathSegments = url.pathname.split('/').filter(Boolean);
        const resourcePath = pathSegments.slice(2).join('/');
        
        const body = await request.json();

        if (resourcePath.startsWith('content/') && resourcePath.endsWith('/publish')) {
          // POST /api/spool/content/[collection]/[slug]/publish - Publish content
          const contentPath = resourcePath.replace('content/', '').replace('/publish', '');
          
          const publishResponse = await spoolFetch(`/content/${contentPath}/publish`, {
            method: 'POST',
            body: JSON.stringify(body),
          });
          
          const result = await publishResponse.json();
          
          // If publishing succeeded, trigger local revalidation
          if (result.success) {
            const [collection, slug] = contentPath.split('/');
            
            // Revalidate relevant paths
            revalidatePath(`/${collection}/${slug}`);
            revalidatePath(`/${collection}`);
            revalidatePath('/');
          }
          
          return NextResponse.json(result);
        }

        if (resourcePath.startsWith('content/')) {
          // POST /api/spool/content/[collection] - Create new content
          const contentPath = resourcePath.replace('content/', '');
          
          const createResponse = await spoolFetch(`/content/${contentPath}`, {
            method: 'POST',
            body: JSON.stringify(body),
          });
          
          const result = await createResponse.json();
          return NextResponse.json(result);
        }

        return NextResponse.json({ error: 'Not found' }, { status: 404 });

      } catch (error) {
        console.error('Spool POST error:', error);
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }
    },

    // PUT /api/spool/[...route] - Update content (draft saves)
    async PUT(request: NextRequest) {
      try {
        const url = new URL(request.url);
        const pathSegments = url.pathname.split('/').filter(Boolean);
        const resourcePath = pathSegments.slice(2).join('/');
        
        const body = await request.json();

        if (resourcePath.startsWith('content/')) {
          // PUT /api/spool/content/[collection]/[slug] - Update content
          const contentPath = resourcePath.replace('content/', '');
          
          const updateResponse = await spoolFetch(`/content/${contentPath}`, {
            method: 'PUT',
            body: JSON.stringify(body),
          });
          
          const result = await updateResponse.json();
          return NextResponse.json(result);
        }

        return NextResponse.json({ error: 'Not found' }, { status: 404 });

      } catch (error) {
        console.error('Spool PUT error:', error);
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }
    },

    // DELETE /api/spool/[...route] - Delete content
    async DELETE(request: NextRequest) {
      try {
        const url = new URL(request.url);
        const pathSegments = url.pathname.split('/').filter(Boolean);
        const resourcePath = pathSegments.slice(2).join('/');

        if (resourcePath.startsWith('content/')) {
          // DELETE /api/spool/content/[collection]/[slug] - Delete content
          const contentPath = resourcePath.replace('content/', '');
          
          const deleteResponse = await spoolFetch(`/content/${contentPath}`, {
            method: 'DELETE',
          });
          
          const result = await deleteResponse.json();
          
          // If deletion succeeded, trigger local revalidation
          if (result.success) {
            const [collection, slug] = contentPath.split('/');
            
            // Revalidate collection page to remove deleted item
            revalidatePath(`/${collection}`);
            revalidatePath('/');
          }
          
          return NextResponse.json(result);
        }

        return NextResponse.json({ error: 'Not found' }, { status: 404 });

      } catch (error) {
        console.error('Spool DELETE error:', error);
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }
    }
  };
}

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