import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { SpoolConfig } from '../types';

const SPOOL_API_BASE = process.env.SPOOL_API_BASE || 'http://localhost:3000';

/* ------------------------------------------------------------------
 * In-memory caching + rate limiting (per instance)
 * ------------------------------------------------------------------*/
const CACHE_TTL_MS = 60_000; // 1 min
const responseCache = new Map<string, { timestamp: number; payload: any }>();
function getCached(key: string) {
  const entry = responseCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) return entry.payload;
  if (entry) responseCache.delete(key);
  return null;
}
function setCache(key: string, payload: any) {
  responseCache.set(key, { timestamp: Date.now(), payload });
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = process.env.NODE_ENV === 'development' ? 1000 : 100; // Higher limit for dev
const rateMap = new Map<string, { count: number; windowStart: number }>();
function isRateLimited(ip: string) {
  const now = Date.now();
  const entry = rateMap.get(ip) || { count: 0, windowStart: now };
  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry.count = 0;
    entry.windowStart = now;
  }
  entry.count += 1;
  rateMap.set(ip, entry);
  return entry.count > RATE_LIMIT_MAX;
}

function fetchWithTimeout(resource: RequestInfo | URL, options: RequestInit = {}, timeoutMs = 10_000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  const mergedOpts = { ...options, signal: controller.signal };
  return fetch(resource, mergedOpts).finally(() => clearTimeout(id));
}

/**
 * Create Spool API handlers for Next.js
 * This function returns HTTP handlers that manage content from Spool CMS
 * 
 * Auto-detects config from environment variables if not provided
 */
export function createSpoolHandler(config?: SpoolConfig) {
  // Auto-detect config from environment if not provided
  const resolvedConfig = config || {
    apiKey: process.env.SPOOL_API_KEY!,
    siteId: process.env.SPOOL_SITE_ID!,
    baseUrl: process.env.SPOOL_BASE_URL,
  };
  
  const { apiKey, siteId, baseUrl = SPOOL_API_BASE } = resolvedConfig;
  
  // Validate required config
  if (!apiKey || !siteId) {
    throw new Error('SPOOL_API_KEY and SPOOL_SITE_ID environment variables are required');
  }

  // Helper function to add CORS headers
  function addCorsHeaders(response: NextResponse) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
  }

  // Helper function to make authenticated requests to Spool API with timeout
  async function spoolFetch(endpoint: string, options: RequestInit = {}) {
    const url = `${baseUrl}/api/spool/${siteId}${endpoint}`;
    return fetchWithTimeout(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  }

  return {
    // OPTIONS /api/spool/[...route] - Handle CORS preflight requests
    async OPTIONS() {
      return addCorsHeaders(new NextResponse(null, { status: 200 }));
    },

    // GET /api/spool/[...route] - Fetch content or collections
    async GET(request: NextRequest) {
      try {
        const url = new URL(request.url);
        const pathSegments = url.pathname.split('/').filter(Boolean);
        
        // Remove 'api', 'spool' from path to get the actual resource path
        // pathSegments indices: ['api', 'spool', ':siteId', ...]
        const resourcePath = pathSegments.slice(3).join('/');
        
        if (!resourcePath) {
          return addCorsHeaders(NextResponse.json({ error: 'Invalid path' }, { status: 400 }));
        }

        // --- Rate limiting ---
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
        if (isRateLimited(ip)) {
          return addCorsHeaders(NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 }));
        }

        // --- Response cache ---
        const cacheKey = `${resourcePath}${url.search}`;
        const cached = getCached(cacheKey);
        if (cached) {
          return addCorsHeaders(NextResponse.json(cached));
        }

        // Handle different request types
        if (resourcePath === 'collections') {
          // GET /api/spool/collections - Get all collections configuration
          const collectionsResponse = await spoolFetch('/collections');
          const collections = await collectionsResponse.json();
          setCache(cacheKey, collections);
          return addCorsHeaders(NextResponse.json(collections));
        }

        if (resourcePath.startsWith('content/')) {
          // GET /api/spool/content/[collection] or /api/spool/content/[collection]/[slug]
          const contentPath = resourcePath.replace('content/', '');
          const queryString = url.search;
          
          const contentResponse = await spoolFetch(`/content/${contentPath}${queryString}`);
          const content = await contentResponse.json();
          setCache(cacheKey, content);
          return addCorsHeaders(NextResponse.json(content));
        }

        return addCorsHeaders(NextResponse.json({ error: 'Not found' }, { status: 404 }));

      } catch (error) {
        console.error('Spool GET error:', error);
        return addCorsHeaders(NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        ));
      }
    },

    // POST /api/spool/[...route] - Create content or publish
    async POST(request: NextRequest) {
      try {
        const url = new URL(request.url);
        const pathSegments = url.pathname.split('/').filter(Boolean);
        // pathSegments indices: ['api', 'spool', ':siteId', ...]
        const resourcePath = pathSegments.slice(3).join('/');
        
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
            
            // Defer revalidation to avoid Next.js 15 render phase restrictions
            setTimeout(() => {
              try {
                revalidatePath(`/${collection}/${slug}`);
                revalidatePath(`/${collection}`);
                revalidatePath('/');
              } catch (err) {
                console.error('Revalidation error:', err);
              }
            }, 0);
          }
          
          return addCorsHeaders(NextResponse.json(result));
        }

        if (resourcePath.startsWith('content/')) {
          // POST /api/spool/content/[collection] - Create new content
          const contentPath = resourcePath.replace('content/', '');
          
          const createResponse = await spoolFetch(`/content/${contentPath}`, {
            method: 'POST',
            body: JSON.stringify(body),
          });
          
          const result = await createResponse.json();
          return addCorsHeaders(NextResponse.json(result));
        }

        return addCorsHeaders(NextResponse.json({ error: 'Not found' }, { status: 404 }));

      } catch (error) {
        console.error('Spool POST error:', error);
        return addCorsHeaders(NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        ));
      }
    },

    // PUT /api/spool/[...route] - Update content (draft saves)
    async PUT(request: NextRequest) {
      try {
        const url = new URL(request.url);
        const pathSegments = url.pathname.split('/').filter(Boolean);
        // pathSegments indices: ['api', 'spool', ':siteId', ...]
        const resourcePath = pathSegments.slice(3).join('/');
        
        const body = await request.json();

        if (resourcePath.startsWith('content/')) {
          // PUT /api/spool/content/[collection]/[slug] - Update content
          const contentPath = resourcePath.replace('content/', '');
          
          const updateResponse = await spoolFetch(`/content/${contentPath}`, {
            method: 'PUT',
            body: JSON.stringify(body),
          });
          
          const result = await updateResponse.json();
          return addCorsHeaders(NextResponse.json(result));
        }

        return addCorsHeaders(NextResponse.json({ error: 'Not found' }, { status: 404 }));

      } catch (error) {
        console.error('Spool PUT error:', error);
        return addCorsHeaders(NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        ));
      }
    },

    // DELETE /api/spool/[...route] - Delete content
    async DELETE(request: NextRequest) {
      try {
        const url = new URL(request.url);
        const pathSegments = url.pathname.split('/').filter(Boolean);
        // pathSegments indices: ['api', 'spool', ':siteId', ...]
        const resourcePath = pathSegments.slice(3).join('/');

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
            
            // Defer revalidation to avoid Next.js 15 render phase restrictions
            setTimeout(() => {
              try {
                revalidatePath(`/${collection}`);
                revalidatePath('/');
              } catch (err) {
                console.error('Revalidation error:', err);
              }
            }, 0);
          }
          
          return addCorsHeaders(NextResponse.json(result));
        }

        return addCorsHeaders(NextResponse.json({ error: 'Not found' }, { status: 404 }));

      } catch (error) {
        console.error('Spool DELETE error:', error);
        return addCorsHeaders(NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        ));
      }
    }
  };
} 