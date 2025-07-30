/**
 * Webhook utilities for Spool CMS
 * Use these functions in your Next.js webhook endpoints to verify and handle Spool webhooks
 */

import crypto from 'crypto';
import { clearAllCaches } from './cache';

// Global flag to ensure only one dev polling loop runs per process, even after hot reloads.
declare global {
  // eslint-disable-next-line no-var
  var __spoolPollingActive: boolean | undefined;
  // eslint-disable-next-line no-var
  var __spoolWebhookHandlers: ((data: SpoolWebhookPayload) => Promise<void> | void)[] | undefined;
}

export interface SpoolWebhookPayload {
  event: 'content.created' | 'content.updated' | 'content.published' | 'content.deleted';
  site_id: string;
  collection: string;
  slug?: string;
  item_id: string;
  timestamp: string;
}

/**
 * Verify webhook signature from Spool CMS
 * Use this in your webhook endpoint to ensure the request is from Spool
 * 
 * @param payload - The raw request body as a string
 * @param signature - The X-Spool-Signature-256 header value
 * @param secret - Your webhook secret from Spool admin settings
 * @returns true if signature is valid, false otherwise
 * 
 * @example
 * ```typescript
 * import { verifySpoolWebhook } from '@spoolcms/nextjs';
 * 
 * export async function POST(request: Request) {
 *   const payload = await request.text();
 *   const signature = request.headers.get('x-spool-signature-256');
 *   const secret = process.env.SPOOL_WEBHOOK_SECRET;
 *   
 *   if (secret && signature && !verifySpoolWebhook(payload, signature, secret)) {
 *     return new Response('Unauthorized', { status: 401 });
 *   }
 *   
 *   // Process webhook...
 * }
 * ```
 */
export function verifySpoolWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!secret || !signature) {
    return false;
  }

  try {
    const expectedSignature = `sha256=${crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex')}`;
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Error verifying Spool webhook signature:', error);
    return false;
  }
}

/**
 * Parse and validate Spool webhook payload
 * 
 * @param payload - The raw request body as a string
 * @returns Parsed webhook payload or null if invalid
 * 
 * @example
 * ```typescript
 * import { parseSpoolWebhook } from '@spoolcms/nextjs';
 * 
 * export async function POST(request: Request) {
 *   const payload = await request.text();
 *   const data = parseSpoolWebhook(payload);
 *   
 *   if (!data) {
 *     return new Response('Invalid payload', { status: 400 });
 *   }
 *   
 *   console.log(`Received ${data.event} for ${data.collection}/${data.slug}`);
 * }
 * ```
 */
export function parseSpoolWebhook(payload: string): SpoolWebhookPayload | null {
  try {
    const data = JSON.parse(payload);
    
    // Validate required fields
    if (!data.event || !data.site_id || !data.collection || !data.item_id || !data.timestamp) {
      return null;
    }
    
    // Validate event type
    const validEvents = ['content.created', 'content.updated', 'content.published', 'content.deleted'];
    if (!validEvents.includes(data.event)) {
      return null;
    }
    
    return data as SpoolWebhookPayload;
  } catch (error) {
    console.error('Error parsing Spool webhook payload:', error);
    return null;
  }
}

/**
 * Get webhook headers from a Request object
 * Extracts Spool-specific headers for logging and debugging
 * 
 * @param request - The Next.js Request object
 * @returns Object with Spool webhook headers
 * 
 * @example
 * ```typescript
 * import { getSpoolWebhookHeaders } from '@spoolcms/nextjs';
 * 
 * export async function POST(request: Request) {
 *   const headers = getSpoolWebhookHeaders(request);
 *   console.log(`Processing delivery ${headers.deliveryId} for event ${headers.event}`);
 * }
 * ```
 */
export function getSpoolWebhookHeaders(request: Request): {
  signature?: string;
  deliveryId?: string;
  event?: string;
  userAgent?: string;
} {
  return {
    signature: request.headers.get('x-spool-signature-256') || undefined,
    deliveryId: request.headers.get('x-spool-delivery') || undefined,
    event: request.headers.get('x-spool-event') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
  };
}

/**
 * Development mode polling for localhost webhook simulation
 * This enables live updates during development when webhooks can't reach localhost
 */
let developmentPolling: NodeJS.Timeout | null = null;
let lastContentCheck: Record<string, { hash: string; slug: string; status: string; title: string; updated_at: string }> = {};
let isPollingActive = false;
let pollingRetryCount = 0;
const MAX_RETRY_COUNT = 3;

// Create a stable hash for content comparison
function createContentHash(item: any): string {
  try {
    // Sort data object keys to ensure consistent stringification
    const sortedData = item.data ? 
      JSON.stringify(item.data, Object.keys(item.data).sort()) : 
      '{}';
    
    // Create a simple, reliable hash from key fields with sorted data
    const key = `${item.item_id}-${item.updated_at}-${item.status}-${sortedData}`;
    
    // Create a simple hash using built-in string methods
    let hash = 0;
    if (key.length === 0) return hash.toString();
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  } catch (error) {
    console.warn('[DEV] Error creating content hash:', error);
    // Fallback to timestamp + status + id (most reliable)
    return `${item.item_id}-${item.updated_at || Date.now()}-${item.status || 'unknown'}`;
  }
}

import { devPollingBus } from '../dev-polling-bus';

// Helper function to call all registered webhook handlers
async function callWebhookHandlers(data: SpoolWebhookPayload) {
  // Emit on the bus for backward compatibility
  devPollingBus.emit('contentChange', data);
  
  // Call all registered webhook handlers - use process.nextTick to defer but still be awaitable
  if (global.__spoolWebhookHandlers && global.__spoolWebhookHandlers.length > 0) {
    // Use process.nextTick to defer execution outside of render phase but still allow await
    await new Promise<void>((resolve) => {
      process.nextTick(async () => {
        try {
          const handlers = global.__spoolWebhookHandlers;
          if (handlers) {
            for (const handler of handlers) {
              try {
                await handler(data);
              } catch (err) {
                console.error('[DEV] Error in webhook handler:', err);
              }
            }
          }
        } finally {
          resolve();
        }
      });
    });
  }
}

async function startDevelopmentPolling(
  config: { apiKey: string; siteId: string; baseUrl?: string },
  onContentChange: (data: SpoolWebhookPayload) => Promise<void> | void = () => {}
) {
  if (typeof window !== 'undefined') return; // Only run on server
  if (process.env.NODE_ENV !== 'development') return; // Only in development
  
  // Check if polling is actually running (not just flagged)
  if (developmentPolling && isPollingActive) {
    console.log(`[DEV] Polling already active (interval: ${!!developmentPolling}, isPollingActive: ${isPollingActive})`);
    return;
  }
  
  // Reset stale global flag if no actual polling is running
  if (global.__spoolPollingActive && !developmentPolling) {
    console.log(`[DEV] Clearing stale global polling flag`);
    global.__spoolPollingActive = false;
  }
  
  console.log('[DEV] Starting Spool development mode polling...');
  isPollingActive = true;
  global.__spoolPollingActive = true;
  pollingRetryCount = 0;
  
  const checkForChanges = async () => {
    try {
      const baseUrl = config.baseUrl || 'https://www.spoolcms.com';
      // Add cache-busting timestamp to ensure fresh data
      const timestamp = Date.now();
      // Use the actual content endpoint that we know works
      const url = `${baseUrl}/api/spool/${config.siteId}/content/blog?t=${timestamp}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const updates = await response.json();
      const currentItems = new Set<string>();
      const isFirstRun = Object.keys(lastContentCheck).length === 0;
      
      // Only log first run and when items count changes
      if (isFirstRun) {
        console.log(`[DEV] Initial content sync: ${updates.items?.length || 0} items`);
      }
      
      // Reset retry count on successful fetch
      pollingRetryCount = 0;
      
      // Track all timestamps to detect ANY changes
      const allCurrentTimestamps: Record<string, string> = {};
      const allPreviousTimestamps: Record<string, string> = {};
      
      // Adapt the response format from the real API
      for (const item of updates.items || []) {
        // The real API returns items with 'id' not 'item_id', and no 'collection' field on items
        const adaptedUpdate = {
          collection: updates.collection?.slug || 'blog', // Use collection from top level
          item_id: item.id,
          updated_at: item.updated_at,
          slug: item.slug,
          status: item.status,
          title: item.title
        };
        
        const key = `${adaptedUpdate.collection}::${adaptedUpdate.item_id}`;
        allCurrentTimestamps[key] = adaptedUpdate.updated_at;
        if (lastContentCheck[key]) {
          allPreviousTimestamps[key] = lastContentCheck[key].updated_at;
        }
      }
      
      // Log any timestamp changes detected
      const timestampChanges = [];
      for (const key in allCurrentTimestamps) {
        if (allPreviousTimestamps[key] && allCurrentTimestamps[key] !== allPreviousTimestamps[key]) {
          timestampChanges.push({
            key,
            old: allPreviousTimestamps[key],
            new: allCurrentTimestamps[key]
          });
        }
      }
      
      // Log changes in development
      if (timestampChanges.length > 0 && !isFirstRun) {
        console.log(`[DEV] Detected ${timestampChanges.length} content change(s)`);
      }
      
      // Process each content item
      for (const item of updates.items || []) {
        // Adapt the item format to what the polling expects
        const adaptedUpdate = {
          collection: updates.collection?.slug || 'blog',
          item_id: item.id,
          updated_at: item.updated_at,
          slug: item.slug,
          status: item.status,
          title: item.title
        };
        
        const key = `${adaptedUpdate.collection}::${adaptedUpdate.item_id}`;
        const currentHash = createContentHash(item); // Use original item for hash
        const previousData = lastContentCheck[key];
        
        currentItems.add(key);
        
        if (previousData && !isFirstRun) {
          // Check if content actually changed (hash OR updated_at timestamp)
          const hashChanged = previousData.hash !== currentHash;
          const timestampChanged = previousData.updated_at !== (adaptedUpdate.updated_at || '');
          
          if (hashChanged || timestampChanged) {
            // Determine event type based on what changed
            let event: SpoolWebhookPayload['event'] = 'content.updated';
            
            // Detect publishing events
            if (adaptedUpdate.status === 'published' && previousData.status !== 'published') {
              event = 'content.published';
              console.log(`[DEV] Content published: ${adaptedUpdate.collection}/${adaptedUpdate.slug || 'no-slug'}`);
            } else if (adaptedUpdate.status === 'draft' && previousData.status === 'published') {
              console.log(`[DEV] Content unpublished: ${adaptedUpdate.collection}/${adaptedUpdate.slug || 'no-slug'}`);
            } else {
              console.log(`[DEV] Content updated: ${adaptedUpdate.collection}/${adaptedUpdate.slug || 'no-slug'}`);
            }
            
            // Call webhook handlers for content change
            await callWebhookHandlers({
              event,
              site_id: config.siteId,
              collection: adaptedUpdate.collection,
              slug: adaptedUpdate.slug,
              item_id: adaptedUpdate.item_id,
              timestamp: new Date().toISOString(),
            });
            
            // Handle slug changes - trigger for old slug to clear cache
            if (previousData.slug && previousData.slug !== adaptedUpdate.slug) {
              console.log(`[DEV] Slug changed: ${adaptedUpdate.collection}/${previousData.slug} → ${adaptedUpdate.slug}`);
              
              // Call webhook handlers for slug change
              await callWebhookHandlers({
                event: 'content.updated',
                site_id: config.siteId,
                collection: adaptedUpdate.collection,
                slug: previousData.slug,
                item_id: adaptedUpdate.item_id,
                timestamp: new Date().toISOString(),
              });
            }
          }
        } else if (!isFirstRun) {
          // New item detected (not on first run)
          console.log(`[DEV] New content created: ${adaptedUpdate.collection}/${adaptedUpdate.slug || 'no-slug'}`);
          
          // Call webhook handlers for new content
          await callWebhookHandlers({
            event: 'content.created',
            site_id: config.siteId,
            collection: adaptedUpdate.collection,
            slug: adaptedUpdate.slug,
            item_id: adaptedUpdate.item_id,
            timestamp: new Date().toISOString(),
          });
        }
        
        // Store comprehensive data for next check
        lastContentCheck[key] = {
          hash: currentHash,
          slug: adaptedUpdate.slug || '',
          status: adaptedUpdate.status || 'draft',
          title: adaptedUpdate.title || '',
          updated_at: adaptedUpdate.updated_at || '',
        };
      }
      
      // Check for deleted items (only after first run)
      if (!isFirstRun) {
        for (const [key, data] of Object.entries(lastContentCheck)) {
          if (!currentItems.has(key)) {
            const [collection, itemId] = key.split('::');
            
            console.log(`[DEV] Content deleted: ${collection}/${data.slug}`);
            
            // Call webhook handlers for deletion
            await callWebhookHandlers({
              event: 'content.deleted',
              site_id: config.siteId,
              collection,
              slug: data.slug,
              item_id: itemId,
              timestamp: new Date().toISOString(),
            });
            
            delete lastContentCheck[key];
          }
        }
      }
      
      if (isFirstRun) {
        console.log(`[DEV] Initial content sync complete - tracking ${currentItems.size} items`);
      }
      
    } catch (error) {
      pollingRetryCount++;
      console.error(`[DEV] Spool polling error (Attempt ${pollingRetryCount}/${MAX_RETRY_COUNT}):`, error);
      console.error(`[DEV] API Key: ${config.apiKey ? config.apiKey.substring(0, 10) + '...' : 'MISSING'}`);
      console.error(`[DEV] Site ID: ${config.siteId || 'MISSING'}`);
      
      if (pollingRetryCount >= MAX_RETRY_COUNT) {
        console.error('[DEV] Max polling retries reached. Stopping development polling. Please restart your dev server to resume.');
        stopDevelopmentPolling();
      }
    }
  };
  
  // Initial check with a small delay to let the server start up
  setTimeout(async () => {
    console.log('[DEV] Performing initial content sync...');
    await checkForChanges();
  }, 1000);
  
  // Check every 2 seconds in development for responsive updates
  developmentPolling = setInterval(checkForChanges, 2000);
  
  console.log('[DEV] Development polling started - live updates enabled on localhost');
}

function stopDevelopmentPolling() {
  if (developmentPolling) {
    clearInterval(developmentPolling);
    developmentPolling = null;
    isPollingActive = false;
    pollingRetryCount = 0;
    console.log('[DEV] Development polling stopped');
    global.__spoolPollingActive = false;
  }
}

/**
 * Create a complete webhook handler with verification and parsing
 * This is a higher-level utility that handles the common webhook processing pattern
 * 
 * @param options - Configuration options
 * @returns Webhook handler function
 * 
 * @example
 * ```typescript
 * import { createSpoolWebhookHandler } from '@spoolcms/nextjs';
 * import { revalidatePath } from 'next/cache';
 * 
 * const handleWebhook = createSpoolWebhookHandler({
 *   secret: process.env.SPOOL_WEBHOOK_SECRET,
 *   developmentConfig: {
 *     apiKey: process.env.SPOOL_API_KEY!,
 *     siteId: process.env.SPOOL_SITE_ID!,
 *   },
 *   onWebhook: async (data, headers) => {
 *     console.log(`Processing ${data.event} for ${data.collection}/${data.slug}`);
 *     
 *     // Revalidate paths based on collection
 *     if (data.collection === 'blog') {
 *       revalidatePath('/blog');
 *       if (data.slug) revalidatePath(`/blog/${data.slug}`);
 *     }
 *     
 *     revalidatePath('/');
 *   }
 * });
 * 
 * export const POST = handleWebhook;
 * ```
 */
export function createSpoolWebhookHandler(options: {
  secret?: string;
  developmentConfig?: {
    apiKey: string;
    siteId: string;
    baseUrl?: string;
  };
  onWebhook: (
    data: SpoolWebhookPayload, 
    headers: ReturnType<typeof getSpoolWebhookHeaders>
  ) => Promise<void> | void;
  onError?: (error: Error, request: Request) => Promise<Response> | Response;
}) {

  // In development, register this webhook handler globally so dev-bootstrap can call it
  if (process.env.NODE_ENV === 'development' && options.developmentConfig) {
    if (!global.__spoolWebhookHandlers) {
      global.__spoolWebhookHandlers = [];
    }
    
    const devHandler = async (data: SpoolWebhookPayload) => {
      try {
        console.log(`Processing ${data.event} for ${data.collection}${data.slug ? `/${data.slug}` : ''}`);
        
        // Nuclear option: Use HTTP request to trigger revalidation from completely separate context
        const revalidatePaths: string[] = [];
        
        // Aggressive cache clearing for Next.js 15
        const pathsToTry = [];
        
        if (data.collection === 'blog') {
          pathsToTry.push('/blog');
          pathsToTry.push('/blog/page');
          if (data.slug) {
            pathsToTry.push(`/blog/${data.slug}`);
            pathsToTry.push(`/blog/${data.slug}/page`);
          }
        } else {
          pathsToTry.push(`/${data.collection}`);
          pathsToTry.push(`/${data.collection}/page`);
          if (data.slug) {
            pathsToTry.push(`/${data.collection}/${data.slug}`);
            pathsToTry.push(`/${data.collection}/${data.slug}/page`);
          }
        }
        
        // Always revalidate root and common paths
        pathsToTry.push('/');
        pathsToTry.push('/page');
        pathsToTry.push('/sitemap.xml');
        
        // Try both revalidatePath and revalidateTag approaches
        for (const path of pathsToTry) {
          revalidatePaths.push(path);
          revalidatePaths.push(`${path}?revalidateTag=${data.collection}`);
        }
        
                // Trigger revalidation via HTTP (completely separate execution context)
        setTimeout(async () => {
          // Wait 2 seconds to allow Spool API to propagate the changes
          // This prevents race conditions where revalidation happens faster than API propagation
          console.log("[DEV] Waiting 2 seconds for API propagation before revalidation...");
          await new Promise(resolve => setTimeout(resolve, 2000));
          const revalidationPromises = revalidatePaths.map(async (path) => {
            try {
              // Add cache-busting and force fresh request
              const timestamp = Date.now();
              const response = await fetch(`http://localhost:3000/api/revalidate?path=${encodeURIComponent(path)}&t=${timestamp}`, {
                method: 'POST',
                headers: {
                  'Cache-Control': 'no-cache',
                  'Pragma': 'no-cache',
                },
                signal: AbortSignal.timeout(5000),
              });
              
              const responseText = await response.text();
              
              if (response.ok) {
                console.log(`✅ HTTP revalidated: ${path} (${response.status})`);
              } else {
                console.log(`❌ HTTP revalidation FAILED for ${path}: ${response.status} - ${responseText}`);
              }
            } catch (err) {
              console.log(`❌ Revalidation ERROR for ${path}:`, err instanceof Error ? err.message : String(err));
            }
          });
          
          await Promise.allSettled(revalidationPromises);
          // Clear in-memory caches so next getSpoolContent fetches fresh data in dev
          if (process.env.NODE_ENV === 'development') {
            try {
              clearAllCaches();
              console.log('[DEV] In-memory caches cleared (after 2-second API propagation delay)');
            } catch (err) {
              console.warn('[DEV] Failed to clear caches:', err instanceof Error ? err.message : String(err));
            }
          }
        }, 100);
        
      } catch (err) {
        console.error('[DEV] Error in webhook handler:', err);
      }
    };
    
    global.__spoolWebhookHandlers.push(devHandler);
  }

  return async function webhookHandler(request: Request): Promise<Response> {
    const startTime = Date.now();
    let headers: ReturnType<typeof getSpoolWebhookHeaders> = {};
    
    try {
      const payload = await request.text();
      headers = getSpoolWebhookHeaders(request);
      
      // Verify signature if secret is provided
      if (options.secret && headers.signature) {
        const isValid = verifySpoolWebhook(payload, headers.signature, options.secret);
        if (!isValid) {
          console.error(`[${headers.deliveryId || 'unknown'}] Invalid webhook signature`);
          return new Response('Unauthorized', { status: 401 });
        }
      }
      
      // Parse payload
      const data = parseSpoolWebhook(payload);
      if (!data) {
        console.error(`[${headers.deliveryId || 'unknown'}] Invalid webhook payload:`, payload.substring(0, 200));
        return new Response('Invalid payload', { status: 400 });
      }
      
      console.log(`[${headers.deliveryId || 'unknown'}] Processing webhook: ${data.event} for ${data.collection}${data.slug ? `/${data.slug}` : ''}`);
      
      // Call user handler with error boundary
      try {
        await options.onWebhook(data, headers);
      } catch (handlerError) {
        console.error(`[${headers.deliveryId || 'unknown'}] Error in user webhook handler:`, handlerError);
        throw handlerError; // Re-throw to be caught by outer try-catch
      }
      
      const duration = Date.now() - startTime;
      console.log(`[${headers.deliveryId || 'unknown'}] Webhook processed successfully in ${duration}ms`);
      
      return new Response('OK', {
        headers: {
          'X-Spool-Processed': 'true',
          'X-Processing-Time': `${duration}ms`
        }
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error(`[${headers.deliveryId || 'unknown'}] Webhook error after ${duration}ms:`, error);
      
      if (options.onError) {
        try {
          return await options.onError(error as Error, request);
        } catch (errorHandlerError) {
          console.error('Error in custom error handler:', errorHandlerError);
          // Fall through to default error response
        }
      }
      
      return new Response('Error processing webhook', { 
        status: 500,
        headers: {
          'X-Spool-Error': 'true',
          'X-Processing-Time': `${duration}ms`,
          'X-Error-Message': error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  };
}

// Export development utilities for advanced use cases
export { startDevelopmentPolling, stopDevelopmentPolling };