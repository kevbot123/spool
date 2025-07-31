import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Track a client connection
 * Called when a customer's Next.js app connects
 */
export const trackConnection = mutation({
  args: {
    siteId: v.string(),
    clientId: v.string(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if connection already exists
    const existingConnection = await ctx.db
      .query("connections")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .first();

    const now = Date.now();

    if (existingConnection) {
      // Update existing connection
      await ctx.db.patch(existingConnection._id, {
        siteId: args.siteId,
        lastSeen: now,
        userAgent: args.userAgent,
      });
    } else {
      // Create new connection
      await ctx.db.insert("connections", {
        siteId: args.siteId,
        clientId: args.clientId,
        lastSeen: now,
        userAgent: args.userAgent,
      });
    }

    return true;
  },
});

/**
 * Update connection heartbeat
 */
export const heartbeat = mutation({
  args: {
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("connections")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .first();

    if (connection) {
      await ctx.db.patch(connection._id, {
        lastSeen: Date.now(),
      });
      return true;
    }

    return false;
  },
});

/**
 * Get active connections for a site
 */
export const getActiveConnections = query({
  args: {
    siteId: v.string(),
    maxAgeMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const maxAge = args.maxAgeMinutes || 5; // Default 5 minutes
    const cutoff = Date.now() - (maxAge * 60 * 1000);

    const connections = await ctx.db
      .query("connections")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .filter((q) => q.gt(q.field("lastSeen"), cutoff))
      .collect();

    return connections.map(conn => ({
      clientId: conn.clientId,
      lastSeen: conn.lastSeen,
      userAgent: conn.userAgent,
    }));
  },
});

/**
 * Clean up old connections
 */
export const cleanupConnections = mutation({
  args: {
    maxAgeHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const maxAge = args.maxAgeHours || 24; // Default 24 hours
    const cutoff = Date.now() - (maxAge * 60 * 60 * 1000);

    const oldConnections = await ctx.db
      .query("connections")
      .withIndex("by_last_seen", (q) => q.lt("lastSeen", cutoff))
      .collect();

    let deletedCount = 0;
    for (const connection of oldConnections) {
      await ctx.db.delete(connection._id);
      deletedCount++;
    }

    console.log(`[CONVEX] Cleaned up ${deletedCount} old connections`);
    return deletedCount;
  },
});

/**
 * Get connection stats for monitoring
 */
export const getConnectionStats = query({
  args: {},
  handler: async (ctx) => {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    const activeConnections = await ctx.db
      .query("connections")
      .withIndex("by_last_seen", (q) => q.gt("lastSeen", fiveMinutesAgo))
      .collect();

    const recentConnections = await ctx.db
      .query("connections")
      .withIndex("by_last_seen", (q) => q.gt("lastSeen", oneHourAgo))
      .collect();

    // Group by site
    const bySite = activeConnections.reduce((acc, conn) => {
      acc[conn.siteId] = (acc[conn.siteId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      activeConnections: activeConnections.length,
      recentConnections: recentConnections.length,
      connectionsBySite: bySite,
    };
  },
});