/**
 * Webhook utilities for Spool CMS
 * Use these functions in your Next.js webhook endpoints to verify and handle Spool webhooks
 */

import crypto from 'crypto';

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
let lastContentCheck: Record<string, string | { hash: string; slug: string; status: string }> = {};
let isPollingActive = false;

async function startDevelopmentPolling(
  config: { apiKey: string; siteId: string; baseUrl?: string },
  onContentChange: (data: SpoolWebhookPayload) => Promise<void> | void
) {
  if (typeof window !== 'undefined') return; // Only run on server
  if (process.env.NODE_ENV !== 'development') return; // Only in development
  if (isPollingActive) return; // Prevent multiple polling instances
  
  console.log('[DEV] Starting Spool development mode polling...');
  isPollingActive = true;
  
  const checkForChanges = async () => {
    try {
      const baseUrl = config.baseUrl || 'https://www.spoolcms.com';
      const response = await fetch(`${baseUrl}/api/spool/${config.siteId}/content-updates`, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
        },
      });
      
      if (response.ok) {
        const updates = await response.json();
        const currentItems = new Set<string>();
        
        for (const update of updates.items || []) {
          const key = `${update.collection}-${update.item_id}`;
          const currentHash = update.content_hash;
          const previousData = lastContentCheck[key];
          
          currentItems.add(key);
          
          if (previousData) {
            const previousHash = typeof previousData === 'string' ? previousData : previousData.hash;
            const previousSlug = typeof previousData === 'object' ? previousData.slug : null;
            
            if (previousHash !== currentHash) {
              // Content changed - determine event type
              let event: SpoolWebhookPayload['event'] = 'content.updated';
              
              if (update.status === 'published' && (!previousData || typeof previousData === 'string')) {
                event = 'content.published';
              } else if (update.status !== 'published' && previousSlug) {
                event = 'content.updated'; // Unpublished - still trigger update to remove from cache
              }
              
              console.log(`[DEV] Content change detected: ${update.collection}/${update.slug || 'no-slug'} (${event})`);
              
              // Trigger webhook for current slug
              await onContentChange({
                event,
                site_id: config.siteId,
                collection: update.collection,
                slug: update.slug,
                item_id: update.item_id,
                timestamp: new Date().toISOString(),
              });
              
              // If slug changed, also trigger for old slug to clear old cache
              if (previousSlug && previousSlug !== update.slug) {
                console.log(`[DEV] Slug change detected: ${update.collection}/${previousSlug} → ${update.slug}`);
                await onContentChange({
                  event: 'content.updated',
                  site_id: config.siteId,
                  collection: update.collection,
                  slug: previousSlug,
                  item_id: update.item_id,
                  timestamp: new Date().toISOString(),
                });
              }
            }
          }
          
          // Store comprehensive data for next check
          lastContentCheck[key] = {
            hash: currentHash,
            slug: update.slug,
            status: update.status,
          };
        }
        
        // Check for deleted items (items that were in lastContentCheck but not in current response)
        for (const [key, data] of Object.entries(lastContentCheck)) {
          if (!currentItems.has(key) && typeof data === 'object') {
            const [collection, itemId] = key.split('-');
            console.log(`[DEV] Content deletion detected: ${collection}/${data.slug}`);
            
            await onContentChange({
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
      } else {
        console.error(`[DEV] Failed to fetch content updates: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('[DEV] Polling error:', error);
    }
  };
  
  // Initial check to populate lastContentCheck
  await checkForChanges();
  
  // Check every 2 seconds in development
  developmentPolling = setInterval(checkForChanges, 2000);
  
  console.log('[DEV] Development polling started - live updates enabled on localhost');
}

function stopDevelopmentPolling() {
  if (developmentPolling) {
    clearInterval(developmentPolling);
    developmentPolling = null;
    isPollingActive = false;
    console.log('[DEV] Development polling stopped');
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
  // ✅ Start development polling immediately when handler is created
  if (options.developmentConfig && process.env.NODE_ENV === 'development' && typeof window === 'undefined') {
    // Use setTimeout to start polling after the current execution context
    setTimeout(() => {
      startDevelopmentPolling(options.developmentConfig!, (data) => {
        return options.onWebhook(data, {
          deliveryId: `dev-${Date.now()}`,
          event: data.event,
          userAgent: 'Spool-Dev-Polling/1.0',
        });
      }).catch(console.error);
    }, 100);
  }
  
  return async function webhookHandler(request: Request): Promise<Response> {
    const startTime = Date.now();
    
    try {
      const payload = await request.text();
      const headers = getSpoolWebhookHeaders(request);
      
      // Verify signature if secret is provided
      if (options.secret && headers.signature) {
        const isValid = verifySpoolWebhook(payload, headers.signature, options.secret);
        if (!isValid) {
          console.error(`[${headers.deliveryId}] Invalid webhook signature`);
          return new Response('Unauthorized', { status: 401 });
        }
      }
      
      // Parse payload
      const data = parseSpoolWebhook(payload);
      if (!data) {
        console.error(`[${headers.deliveryId}] Invalid webhook payload`);
        return new Response('Invalid payload', { status: 400 });
      }
      
      console.log(`[${headers.deliveryId}] Processing webhook: ${data.event} for ${data.collection}${data.slug ? `/${data.slug}` : ''}`);
      
      // Call user handler
      await options.onWebhook(data, headers);
      
      const duration = Date.now() - startTime;
      console.log(`[${headers.deliveryId}] Webhook processed successfully in ${duration}ms`);
      
      return new Response('OK', {
        headers: {
          'X-Spool-Processed': 'true',
          'X-Processing-Time': `${duration}ms`
        }
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const headers = getSpoolWebhookHeaders(request);
      
      console.error(`[${headers.deliveryId}] Webhook error after ${duration}ms:`, error);
      
      if (options.onError) {
        return await options.onError(error as Error, request);
      }
      
      return new Response('Error processing webhook', { 
        status: 500,
        headers: {
          'X-Spool-Error': 'true',
          'X-Processing-Time': `${duration}ms`
        }
      });
    }
  };
}

// Export development utilities for advanced use cases
export { startDevelopmentPolling, stopDevelopmentPolling };