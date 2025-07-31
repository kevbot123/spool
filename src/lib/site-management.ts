/**
 * Site Management with Convex Integration
 * This handles site CRUD operations and syncs with Convex for live updates
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { syncSiteToConvex, removeSiteFromConvex } from '@/lib/live-updates';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/database.types';

export interface Site {
  id: string;
  name: string;
  api_key: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export class SiteManager {
  private supabase: SupabaseClient<Database>;

  constructor(supabaseClient?: SupabaseClient<Database>) {
    this.supabase = supabaseClient || createSupabaseServerClient();
  }

  /**
   * Create a new site and sync it to Convex
   */
  async createSite(data: {
    name: string;
    user_id: string;
    api_key?: string;
  }): Promise<Site> {
    const { data: site, error } = await this.supabase
      .from('sites')
      .insert({
        name: data.name,
        user_id: data.user_id,
        api_key: data.api_key || this.generateApiKey(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create site: ${error.message}`);
    }

    // Sync to Convex for live updates
    try {
      await syncSiteToConvex({
        id: site.id,
        api_key: site.api_key,
        name: site.name,
      });
      console.log(`[SITE_MANAGER] Synced new site to Convex: ${site.name}`);
    } catch (convexError) {
      console.error(`[SITE_MANAGER] Failed to sync site to Convex:`, convexError);
      // Don't fail the site creation if Convex sync fails
    }

    return site;
  }

  /**
   * Update an existing site and sync changes to Convex
   */
  async updateSite(id: string, data: {
    name?: string;
    api_key?: string;
  }): Promise<Site> {
    const { data: site, error } = await this.supabase
      .from('sites')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update site: ${error.message}`);
    }

    // Sync changes to Convex
    try {
      await syncSiteToConvex({
        id: site.id,
        api_key: site.api_key,
        name: site.name,
      });
      console.log(`[SITE_MANAGER] Synced site updates to Convex: ${site.name}`);
    } catch (convexError) {
      console.error(`[SITE_MANAGER] Failed to sync site updates to Convex:`, convexError);
      // Don't fail the site update if Convex sync fails
    }

    return site;
  }

  /**
   * Delete a site and remove it from Convex
   */
  async deleteSite(id: string): Promise<void> {
    // Get site info before deleting
    const { data: site, error: fetchError } = await this.supabase
      .from('sites')
      .select('name')
      .eq('id', id)
      .single();

    if (fetchError) {
      throw new Error(`Site not found: ${fetchError.message}`);
    }

    // Delete from PostgreSQL
    const { error } = await this.supabase
      .from('sites')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete site: ${error.message}`);
    }

    // Remove from Convex
    try {
      await removeSiteFromConvex(id);
      console.log(`[SITE_MANAGER] Removed site from Convex: ${site.name}`);
    } catch (convexError) {
      console.error(`[SITE_MANAGER] Failed to remove site from Convex:`, convexError);
      // Log but don't fail since the site is already deleted from PostgreSQL
    }
  }

  /**
   * Get a site by ID
   */
  async getSite(id: string): Promise<Site | null> {
    const { data, error } = await this.supabase
      .from('sites')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  /**
   * List sites for a user
   */
  async listUserSites(userId: string): Promise<Site[]> {
    const { data, error } = await this.supabase
      .from('sites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error listing user sites:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Regenerate API key for a site
   */
  async regenerateApiKey(id: string): Promise<Site> {
    const newApiKey = this.generateApiKey();
    
    return this.updateSite(id, {
      api_key: newApiKey,
    });
  }

  /**
   * Sync all existing sites to Convex
   * Useful for initial setup or recovery
   */
  async syncAllSitesToConvex(): Promise<{ success: number; failed: number }> {
    const { data: sites, error } = await this.supabase
      .from('sites')
      .select('id, name, api_key');

    if (error) {
      throw new Error(`Failed to fetch sites: ${error.message}`);
    }

    let success = 0;
    let failed = 0;

    for (const site of sites || []) {
      try {
        await syncSiteToConvex({
          id: site.id,
          api_key: site.api_key,
          name: site.name,
        });
        success++;
        console.log(`[SITE_MANAGER] Synced site to Convex: ${site.name}`);
      } catch (error) {
        failed++;
        console.error(`[SITE_MANAGER] Failed to sync site ${site.name}:`, error);
      }
    }

    console.log(`[SITE_MANAGER] Sync complete: ${success} success, ${failed} failed`);
    return { success, failed };
  }

  /**
   * Generate a new API key
   */
  private generateApiKey(): string {
    const prefix = 'spool_';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let result = prefix;
    
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }
}

// Convenience functions for use throughout the app
export async function createSite(data: {
  name: string;
  user_id: string;
  api_key?: string;
}): Promise<Site> {
  const manager = new SiteManager();
  return manager.createSite(data);
}

export async function updateSite(id: string, data: {
  name?: string;
  api_key?: string;
}): Promise<Site> {
  const manager = new SiteManager();
  return manager.updateSite(id, data);
}

export async function deleteSite(id: string): Promise<void> {
  const manager = new SiteManager();
  return manager.deleteSite(id);
}

export async function syncAllSitesToConvex(): Promise<{ success: number; failed: number }> {
  const manager = new SiteManager();
  return manager.syncAllSitesToConvex();
}