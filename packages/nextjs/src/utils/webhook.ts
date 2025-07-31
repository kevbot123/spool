/**
 * Webhook utilities for Spool CMS
 * Use these functions in your Next.js webhook endpoints to verify and handle Spool webhooks
 */

import crypto from 'crypto';
import { clearAllCaches } from './cache';

/**
 * Dynamically detect the base URL of the current Next.js app
 * This handles different ports and environments
 */
function getAppBaseUrl(): string {
  // In development, try to detect the port from common environment variables
  if (process.env.NODE_ENV === 'development') {
    // Check for common Next.js port environment variables
    const port = process.env.PORT || process.env.NEXT_PUBLIC_PORT || '3000';
    return `http://localhost:${port}`;
  }
  
  // In production, try to get from environment variables
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                  process.env.NEXT_PUBLIC_APP_URL || 
                  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                  'http://localhost:3000';
  
  return baseUrl;
}

/**
 * Test if the revalidate endpoint exists and is working
 */
async function testRevalidateEndpoint(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/revalidate?path=/test`, {
      method: 'POST',
      signal: AbortSignal.timeout(3000),
    });
    
    return response.status !== 404;
  } catch (error) {
    return false;
  }
}

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
 * Supabase Realtime live updates client
 * Connects to Spool's dedicated live updates Supabase project
 */
let realtimeChannel: any = null;
let supabaseClient: any = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Spool Live Updates Project Credentials (embedded in package)
const SPOOL_LIVE_UPDATES_URL = 'https://uyauwtottrqhbhfcckwk.supabase.co';
const SPOOL_LIVE_UPDATES_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5YXV3dG90dHJxaGJoZmNja3drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4OTkwODYsImV4cCI6MjA2OTQ3NTA4Nn0.iclMZMPlXYyKaQFt6A8ygSB0bFPK45ct1RPYSkoIve4';

/**
 * Connect to Spool's live updates Supabase Realtime
 */
async function connectSpoolRealtime(config: { apiKey: string; siteId: string; baseUrl?: string }) {
  if (typeof window !== 'undefined') return; // Only run on server
  
  try {
    // Dynamically import Supabase client
    const { createClient } = await import('@supabase/supabase-js');
    
    // Create client for Spool's live updates project
    supabaseClient = createClient(SPOOL_LIVE_UPDATES_URL, SPOOL_LIVE_UPDATES_ANON_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      },
      global: {
        headers: {
          'x-api-key': config.apiKey // For RLS policy authentication
        }
      }
    });
    
    // Subscribe to live_updates table changes for this site
    realtimeChannel = supabaseClient
      .channel(`live_updates:site_id=eq.${config.siteId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'live_updates',
        filter: `site_id=eq.${config.siteId}`
      }, (payload: any) => {
        const update = payload.new;
        console.log(`[DEV] 🔄 Live update: ${update.collection}/${update.slug || 'no-slug'}`);
        
        // Convert to webhook format and call handlers
        const webhookData = {
          event: update.event_type,
          site_id: update.site_id,
          collection: update.collection,
          slug: update.slug,
          item_id: update.item_id,
          timestamp: update.timestamp
        };
        
        callWebhookHandlers(webhookData);
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[DEV] ✅ Connected to Spool Realtime for site: ${config.siteId}`);
          reconnectAttempts = 0;
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[DEV] ❌ Spool Realtime connection error');
          handleReconnection(config);
        } else if (status === 'TIMED_OUT') {
          console.warn('[DEV] ⚠️  Spool Realtime connection timed out');
          handleReconnection(config);
        }
      });
    
  } catch (error) {
    console.error('[DEV] Failed to connect to Spool Realtime:', error);
    console.warn('[DEV] 💡 Make sure @supabase/supabase-js is installed');
    handleReconnection(config);
  }
}

/**
 * Handle reconnection with exponential backoff
 */
function handleReconnection(config: { apiKey: string; siteId: string; baseUrl?: string }) {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('[DEV] ❌ Max reconnection attempts reached. Live updates disabled.');
    console.log('[DEV] 💡 Restart your dev server to re-enable live updates');
    return;
  }
  
  reconnectAttempts++;
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
  
  console.log(`[DEV] Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
  
  setTimeout(() => {
    // Clean up existing connection
    if (realtimeChannel) {
      realtimeChannel.unsubscribe();
      realtimeChannel = null;
    }
    if (supabaseClient) {
      supabaseClient.removeAllChannels();
      supabaseClient = null;
    }
    
    // Attempt reconnection
    connectSpoolRealtime(config);
  }, delay);
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

async function startLiveUpdates(
  config: { apiKey: string; siteId: string; baseUrl?: string }
) {
  if (typeof window !== 'undefined') return; // Only run on server
  
  // Check if already connected
  if (realtimeChannel) {
    console.log('[DEV] Spool Realtime already connected');
    return;
  }
  
  console.log('[DEV] Starting Spool live updates via Supabase Realtime...');
  await connectSpoolRealtime(config);
  
  // Test if revalidate endpoint exists (only in development)
  if (process.env.NODE_ENV === 'development') {
    setTimeout(async () => {
      const appBaseUrl = getAppBaseUrl();
      const revalidateWorks = await testRevalidateEndpoint(appBaseUrl);
      
      if (!revalidateWorks) {
        console.warn('[DEV] ⚠️  /api/revalidate endpoint not found or not working');
        console.warn('[DEV] 💡 Create app/api/revalidate/route.ts for live updates to work');
        console.warn('[DEV] 📖 See: https://docs.spoolcms.com/nextjs-integration#revalidate-route');
      } else {
        console.log('[DEV] ✅ /api/revalidate endpoint is working');
      }
    }, 1000);
  }
}

function stopLiveUpdates() {
  if (realtimeChannel) {
    realtimeChannel.unsubscribe();
    realtimeChannel = null;
    console.log('[DEV] Spool Realtime connection closed');
  }
  
  if (supabaseClient) {
    supabaseClient.removeAllChannels();
    supabaseClient = null;
  }
  
  reconnectAttempts = 0;
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
  onWebhook?: (
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
          
          // Detect the current app URL dynamically
          const baseUrl = getAppBaseUrl();
          
          const revalidationPromises = revalidatePaths.map(async (path) => {
            try {
              // Add cache-busting and force fresh request
              const timestamp = Date.now();
              const revalidateUrl = `${baseUrl}/api/revalidate?path=${encodeURIComponent(path)}&t=${timestamp}`;
              
              const response = await fetch(revalidateUrl, {
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
                
                // If 404, provide helpful guidance
                if (response.status === 404) {
                  console.log(`💡 HINT: Create app/api/revalidate/route.ts in your Next.js app. See: https://docs.spoolcms.com/nextjs-integration#revalidate-route`);
                }
              }
            } catch (err) {
              console.log(`❌ Revalidation ERROR for ${path}:`, err instanceof Error ? err.message : String(err));
              
              // Provide helpful error context
              if (err instanceof Error && err.message.includes('ECONNREFUSED')) {
                console.log(`💡 HINT: Make sure your Next.js dev server is running and accessible at ${baseUrl}`);
              }
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
    
    // Start Socket.IO connection for live updates
    startLiveUpdates(options.developmentConfig);
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
      
      // Call user handler with error boundary (if provided)
      if (options.onWebhook) {
        try {
          await options.onWebhook(data, headers);
        } catch (handlerError) {
          console.error(`[${headers.deliveryId || 'unknown'}] Error in user webhook handler:`, handlerError);
          throw handlerError; // Re-throw to be caught by outer try-catch
        }
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

// Export live update utilities for advanced use cases
export { startLiveUpdates, stopLiveUpdates };