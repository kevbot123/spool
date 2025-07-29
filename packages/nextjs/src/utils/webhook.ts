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
  onWebhook: (
    data: SpoolWebhookPayload, 
    headers: ReturnType<typeof getSpoolWebhookHeaders>
  ) => Promise<void> | void;
  onError?: (error: Error, request: Request) => Promise<Response> | Response;
}) {
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