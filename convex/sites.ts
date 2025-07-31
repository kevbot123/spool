import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Sync a site from PostgreSQL to Convex
 * Called when a site is created/updated in your main database
 */
export const syncSite = mutation({
  args: {
    id: v.string(),
    apiKey: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if site already exists
    const existingSite = await ctx.db
      .query("sites")
      .withIndex("by_site_id", (q) => q.eq("id", args.id))
      .first();

    if (existingSite) {
      // Update existing site
      await ctx.db.patch(existingSite._id, {
        apiKey: args.apiKey,
        name: args.name,
      });
      console.log(`[CONVEX] Updated site: ${args.name} (${args.id})`);
      return existingSite._id;
    } else {
      // Create new site
      const siteId = await ctx.db.insert("sites", {
        id: args.id,
        apiKey: args.apiKey,
        name: args.name,
      });
      console.log(`[CONVEX] Created site: ${args.name} (${args.id})`);
      return siteId;
    }
  },
});

/**
 * Remove a site from Convex
 * Called when a site is deleted from PostgreSQL
 */
export const removeSite = mutation({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const site = await ctx.db
      .query("sites")
      .withIndex("by_site_id", (q) => q.eq("id", args.id))
      .first();

    if (site) {
      await ctx.db.delete(site._id);
      
      // Also clean up all live updates for this site
      const updates = await ctx.db
        .query("liveUpdates")
        .withIndex("by_site", (q) => q.eq("siteId", args.id))
        .collect();

      for (const update of updates) {
        await ctx.db.delete(update._id);
      }

      console.log(`[CONVEX] Removed site and ${updates.length} live updates: ${args.id}`);
      return true;
    }
    
    return false;
  },
});

/**
 * Verify a site's API key
 * Used for authentication in other functions
 */
export const verifySite = query({
  args: {
    siteId: v.string(),
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const site = await ctx.db
      .query("sites")
      .withIndex("by_api_key", (q) => q.eq("apiKey", args.apiKey))
      .first();

    return site?.id === args.siteId;
  },
});

/**
 * Get site info by API key
 */
export const getSiteByApiKey = query({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const site = await ctx.db
      .query("sites")
      .withIndex("by_api_key", (q) => q.eq("apiKey", args.apiKey))
      .first();

    return site ? {
      id: site.id,
      name: site.name,
    } : null;
  },
});

/**
 * List all sites (admin function)
 */
export const listSites = query({
  args: {},
  handler: async (ctx) => {
    const sites = await ctx.db.query("sites").collect();
    return sites.map(site => ({
      id: site.id,
      name: site.name,
      // Don't return API keys in list
    }));
  },
});