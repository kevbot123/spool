import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Live updates events - the core of our real-time system
  liveUpdates: defineTable({
    siteId: v.string(), // References your PostgreSQL sites.id
    event: v.union(
      v.literal("content.created"),
      v.literal("content.updated"), 
      v.literal("content.published"),
      v.literal("content.deleted")
    ),
    collection: v.string(),
    slug: v.optional(v.string()),
    itemId: v.string(), // References your PostgreSQL content.id
    metadata: v.optional(v.object({
      title: v.optional(v.string()),
      author: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      // Add other metadata fields as needed
    })),
    timestamp: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_site_timestamp", ["siteId", "timestamp"])
    .index("by_timestamp", ["timestamp"]), // For cleanup

  // Site authentication - minimal sync from your PostgreSQL
  sites: defineTable({
    id: v.string(), // Your PostgreSQL site.id
    apiKey: v.string(), // Your PostgreSQL site.api_key
    name: v.string(),
    // Only essential fields - keep main data in PostgreSQL
  })
    .index("by_api_key", ["apiKey"])
    .index("by_site_id", ["id"]),

  // Connection tracking for monitoring (optional)
  connections: defineTable({
    siteId: v.string(),
    clientId: v.string(), // Unique client identifier
    lastSeen: v.number(),
    userAgent: v.optional(v.string()),
  })
    .index("by_site", ["siteId"])
    .index("by_client", ["clientId"])
    .index("by_last_seen", ["lastSeen"]), // For cleanup
});