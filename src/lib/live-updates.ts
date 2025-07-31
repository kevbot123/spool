/**
 * Live updates broadcaster for Spool CMS
 * Now uses Convex for better real-time performance and easier maintenance
 */

// Re-export from the new Convex implementation
export {
  broadcastContentUpdate,
  syncSiteToConvex,
  removeSiteFromConvex,
  sendTestUpdate,
  getConnectionStats,
  type ContentUpdateData
} from './convex-live-updates';

// Legacy compatibility - these functions now use Convex under the hood
export async function cleanupOldUpdates() {
  console.log('[LIVE_UPDATES] Cleanup is now handled automatically by Convex cron jobs');
}