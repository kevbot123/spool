/**
 * Convex Live Updates Integration
 * This replaces the Supabase live updates broadcaster
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

// Initialize Convex client for server-side operations
const convex = new ConvexHttpClient(process.env.CONVEX_URL!);

export interface ContentUpdateData {
  event_type: 'content.created' | 'content.updated' | 'content.published' | 'content.deleted';
  collection: string;
  slug?: string;
  item_id: string;
  metadata?: {
    title?: string;
    author?: string;
    tags?: string[];
  };
}

/**
 * Broadcast content updates via Convex
 * This replaces the Supabase broadcaster
 */
export async function broadcastContentUpdate(siteId: string, data: ContentUpdateData) {
  try {
    const updateId = await convex.mutation(api.liveUpdates.broadcast, {
      siteId,
      event: data.event_type,
      collection: data.collection,
      slug: data.slug,
      itemId: data.item_id,
      metadata: data.metadata,
    });
    
    console.log(`[CONVEX_LIVE_UPDATES] Broadcasted ${data.event_type} to site ${siteId}:`, {
      collection: data.collection,
      slug: data.slug,
      updateId,
    });
    
    return updateId;
    
  } catch (error) {
    console.error('[CONVEX_LIVE_UPDATES] Error broadcasting update:', error);
    throw error;
  }
}

/**
 * Sync a site to Convex when it's created/updated in PostgreSQL
 */
export async function syncSiteToConvex(site: {
  id: string;
  api_key: string;
  name: string;
}) {
  try {
    const siteId = await convex.mutation(api.sites.syncSite, {
      id: site.id,
      apiKey: site.api_key,
      name: site.name,
    });
    
    console.log(`[CONVEX_LIVE_UPDATES] Synced site to Convex: ${site.name} (${site.id})`);
    return siteId;
    
  } catch (error) {
    console.error('[CONVEX_LIVE_UPDATES] Error syncing site:', error);
    throw error;
  }
}

/**
 * Remove a site from Convex when it's deleted from PostgreSQL
 */
export async function removeSiteFromConvex(siteId: string) {
  try {
    const removed = await convex.mutation(api.sites.removeSite, {
      id: siteId,
    });
    
    console.log(`[CONVEX_LIVE_UPDATES] Removed site from Convex: ${siteId}`);
    return removed;
    
  } catch (error) {
    console.error('[CONVEX_LIVE_UPDATES] Error removing site:', error);
    throw error;
  }
}

/**
 * Send a test update (useful for debugging)
 */
export async function sendTestUpdate(siteId: string) {
  await broadcastContentUpdate(siteId, {
    event_type: 'content.updated',
    collection: 'test',
    slug: 'test-item',
    item_id: 'test-id-' + Date.now(),
    metadata: { 
      title: 'Test Update',
      author: 'Test User'
    }
  });
}

/**
 * Get connection stats for monitoring
 */
export async function getConnectionStats() {
  try {
    const stats = await convex.query(api.connections.getConnectionStats);
    return stats;
  } catch (error) {
    console.error('[CONVEX_LIVE_UPDATES] Error getting connection stats:', error);
    return null;
  }
}