/**
 * Supabase Realtime live updates broadcaster for Spool CMS
 * Uses separate Supabase project for live updates isolation
 */

import { createClient } from '@supabase/supabase-js';

// Live Updates Supabase Project Credentials
const LIVE_UPDATES_SUPABASE_URL = 'https://uyauwtottrqhbhfcckwk.supabase.co';
const LIVE_UPDATES_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5YXV3dG90dHJxaGJoZmNja3drIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzg5OTA4NiwiZXhwIjoyMDY5NDc1MDg2fQ.QzGh_6O9NxDzVEUOBqVZHMLe8KVwepWpNVrFDRUW03Q';

// Create Supabase client for live updates project
const liveUpdatesSupabase = createClient(
  LIVE_UPDATES_SUPABASE_URL,
  LIVE_UPDATES_SERVICE_KEY
);

export interface ContentUpdateData {
  event_type: 'content.created' | 'content.updated' | 'content.published' | 'content.deleted';
  collection: string;
  slug?: string;
  item_id: string;
  metadata?: Record<string, any>;
}

/**
 * Broadcast content updates via separate Supabase Realtime project
 * This inserts into live_updates table which triggers Realtime broadcast
 */
export async function broadcastContentUpdate(siteId: string, data: ContentUpdateData) {
  try {
    // Insert into live_updates table (triggers Realtime broadcast)
    const { error } = await liveUpdatesSupabase
      .from('live_updates')
      .insert({
        site_id: siteId,
        event_type: data.event_type,
        collection: data.collection,
        slug: data.slug,
        item_id: data.item_id,
        metadata: data.metadata || {},
        timestamp: new Date().toISOString()
      });

    if (error) {
      console.error('[LIVE_UPDATES] Error inserting update:', error);
      return;
    }
    
    console.log(`[LIVE_UPDATES] Broadcasted ${data.event_type} to site ${siteId}:`, {
      collection: data.collection,
      slug: data.slug
    });
    
  } catch (error) {
    console.error('[LIVE_UPDATES] Error broadcasting update:', error);
  }
}

/**
 * Clean up old live updates (older than 1 hour)
 * This should be called periodically to prevent table bloat
 */
export async function cleanupOldUpdates() {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const { error } = await liveUpdatesSupabase
      .from('live_updates')
      .delete()
      .lt('timestamp', oneHourAgo.toISOString());

    if (error) {
      console.error('[LIVE_UPDATES] Error cleaning up old updates:', error);
    } else {
      console.log('[LIVE_UPDATES] Cleaned up old updates');
    }
  } catch (error) {
    console.error('[LIVE_UPDATES] Error in cleanup:', error);
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
    metadata: { test: true }
  });
}