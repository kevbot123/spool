import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Broadcast a live update event
 * Called by your CMS backend when content changes
 */
export const broadcast = mutation({
  args: {
    siteId: v.string(),
    event: v.union(
      v.literal("content.created"),
      v.literal("content.updated"), 
      v.literal("content.published"),
      v.literal("content.deleted")
    ),
    collection: v.string(),
    slug: v.optional(v.string()),
    itemId: v.string(),
    metadata: v.optional(v.object({
      title: v.optional(v.string()),
      author: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
    })),
  },
  handler: async (ctx, args) => {
    // Verify the site exists (basic validation)
    const site = await ctx.db
      .query("sites")
      .withIndex("by_site_id", (q) => q.eq("id", args.siteId))
      .first();
    
    if (!site) {
      throw new Error(`Site ${args.siteId} not found`);
    }

    // Insert the live update event
    const updateId = await ctx.db.insert("liveUpdates", {
      siteId: args.siteId,
      event: args.event,
      collection: args.collection,
      slug: args.slug,
      itemId: args.itemId,
      metadata: args.metadata,
      timestamp: Date.now(),
    });

    console.log(`[CONVEX] Broadcasted ${args.event} for site ${args.siteId}: ${args.collection}/${args.slug}`);
    
    return updateId;
  },
});

/**
 * Subscribe to live updates for a specific site
 * Used by customer Next.js apps
 */
export const subscribe = query({
  args: { 
    siteId: v.string(),
    apiKey: v.string(), // For authentication
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify API key matches the site
    const site = await ctx.db
      .query("sites")
      .withIndex("by_api_key", (q) => q.eq("apiKey", args.apiKey))
      .first();
    
    if (!site || site.id !== args.siteId) {
      throw new Error("Invalid API key for this site");
    }

    // Return recent live updates for this site
    const updates = await ctx.db
      .query("liveUpdates")
      .withIndex("by_site_timestamp", (q) => q.eq("siteId", args.siteId))
      .order("desc")
      .take(args.limit || 50);

    return updates;
  },
});

/**
 * Get the latest update timestamp for a site
 * Useful for checking if there are new updates
 */
export const getLatestTimestamp = query({
  args: { 
    siteId: v.string(),
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify API key
    const site = await ctx.db
      .query("sites")
      .withIndex("by_api_key", (q) => q.eq("apiKey", args.apiKey))
      .first();
    
    if (!site || site.id !== args.siteId) {
      throw new Error("Invalid API key for this site");
    }

    const latestUpdate = await ctx.db
      .query("liveUpdates")
      .withIndex("by_site_timestamp", (q) => q.eq("siteId", args.siteId))
      .order("desc")
      .first();

    return latestUpdate?.timestamp || 0;
  },
});

/**
 * Clean up old live updates (older than 1 hour)
 * Should be called periodically via cron
 */
export const cleanup = mutation({
  args: {},
  handler: async (ctx) => {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    const oldUpdates = await ctx.db
      .query("liveUpdates")
      .withIndex("by_timestamp", (q) => q.lt("timestamp", oneHourAgo))
      .collect();

    let deletedCount = 0;
    for (const update of oldUpdates) {
      await ctx.db.delete(update._id);
      deletedCount++;
    }

    console.log(`[CONVEX] Cleaned up ${deletedCount} old live updates`);
    return deletedCount;
  },
});