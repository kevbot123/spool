/**
 * Complete webhook route example for Spool CMS
 * Copy this to: app/api/webhooks/spool/route.ts
 * 
 * This example includes:
 * - Production webhook handling with signature verification
 * - Development mode with live localhost updates
 * - Comprehensive revalidation logic
 * - Error handling and logging
 */

import { createSpoolWebhookHandler } from '@spoolcms/nextjs';
import { revalidatePath } from 'next/cache';

const handleWebhook = createSpoolWebhookHandler({
  // Webhook secret for signature verification (recommended for production)
  secret: process.env.SPOOL_WEBHOOK_SECRET,
  
  // Development configuration for localhost live updates
  developmentConfig: {
    apiKey: process.env.SPOOL_API_KEY!,
    siteId: process.env.SPOOL_SITE_ID!,
    // Optional: specify different base URL (defaults to https://www.spoolcms.com)
    // baseUrl: 'https://your-custom-spool-instance.com'
  },
  
  // Main webhook handler - called for both production webhooks and development polling
  onWebhook: async (data, headers) => {
    const { event, collection, slug, item_id } = data;
    
    console.log(`[${headers.deliveryId}] Processing ${event} for ${collection}${slug ? `/${slug}` : ''} (${item_id})`);
    
    // Collection-specific revalidation logic
    const pathsToRevalidate: string[] = [];
    
    switch (collection) {
      case 'blog':
        // Revalidate blog listing page
        pathsToRevalidate.push('/blog');
        
        // Revalidate specific blog post if slug exists
        if (slug) {
          pathsToRevalidate.push(`/blog/${slug}`);
        }
        
        // Revalidate blog category pages if you have them
        // pathsToRevalidate.push('/blog/categories');
        break;
        
      case 'pages':
        // Revalidate specific page
        if (slug) {
          pathsToRevalidate.push(`/${slug}`);
        }
        break;
        
      case 'products':
        // Revalidate products listing
        pathsToRevalidate.push('/products');
        
        // Revalidate specific product page
        if (slug) {
          pathsToRevalidate.push(`/products/${slug}`);
        }
        break;
        
      case 'authors':
        // Revalidate authors listing
        pathsToRevalidate.push('/authors');
        
        // Revalidate specific author page and their posts
        if (slug) {
          pathsToRevalidate.push(`/authors/${slug}`);
          pathsToRevalidate.push(`/blog/author/${slug}`);
        }
        break;
        
      default:
        // Generic collection handling
        pathsToRevalidate.push(`/${collection}`);
        if (slug) {
          pathsToRevalidate.push(`/${collection}/${slug}`);
        }
    }
    
    // Always revalidate these common paths
    pathsToRevalidate.push('/');           // Home page
    pathsToRevalidate.push('/sitemap.xml'); // Sitemap
    
    // Add RSS feed if you have one
    // pathsToRevalidate.push('/feed.xml');
    
    // Event-specific handling
    switch (event) {
      case 'content.deleted':
        // For deletions, you might want to revalidate parent collections more aggressively
        pathsToRevalidate.push(`/${collection}`);
        console.log(`[${headers.deliveryId}] Content deleted - revalidating collection: ${collection}`);
        break;
        
      case 'content.published':
        // For new publications, you might want to revalidate related content
        console.log(`[${headers.deliveryId}] Content published - triggering broader revalidation`);
        break;
        
      case 'content.created':
        // For new content, revalidate listings
        pathsToRevalidate.push(`/${collection}`);
        console.log(`[${headers.deliveryId}] New content created in: ${collection}`);
        break;
        
      case 'content.updated':
        // Standard update - paths already added above
        break;
    }
    
    // Perform all revalidations
    const revalidationPromises = pathsToRevalidate.map(async (path) => {
      try {
        // Defer revalidation to avoid Next.js 15 render phase restriction
        await new Promise(resolve => setTimeout(resolve, 0));
        revalidatePath(path);
        console.log(`[${headers.deliveryId}] Revalidated: ${path}`);
      } catch (error) {
        console.error(`[${headers.deliveryId}] Failed to revalidate ${path}:`, error);
      }
    });
    
    // Wait for all revalidations to complete
    await Promise.allSettled(revalidationPromises);
    
    console.log(`[${headers.deliveryId}] Revalidated ${pathsToRevalidate.length} paths`);
  },
  
  // Optional: Custom error handler
  onError: async (error, request) => {
    console.error('Webhook processing error:', error);
    
    // You could send error notifications here
    // await sendErrorNotification(error);
    
    // Return a custom error response
    return new Response(JSON.stringify({
      error: 'Webhook processing failed',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Spool-Error': 'true'
      }
    });
  }
});

export const POST = handleWebhook;

// Optional: Handle CORS preflight requests if needed
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Spool-Signature-256, X-Spool-Delivery, X-Spool-Event',
    },
  });
}