// Auto-bootstrap for Spool CMS - Convex Live Updates
// This file is imported as a side-effect from src/index.ts
// In v2.1.0+, live updates are handled by the useSpoolLiveUpdates hook

import { SpoolWebhookPayload } from './utils/webhook';

// Augment the global namespace for backward compatibility
declare global {
  var __spoolPollingActive: boolean | undefined;
  var __spoolWebhookHandlers: ((data: SpoolWebhookPayload) => Promise<void> | void)[] | undefined;
}

// Initialize webhook handlers array for backward compatibility
if (!global.__spoolWebhookHandlers) {
  global.__spoolWebhookHandlers = [];
}

// Show migration message in development
if (typeof window === 'undefined' && 
    process.env.NODE_ENV === 'development' && 
    !global.__spoolPollingActive) {
  
  global.__spoolPollingActive = true;
  
  console.log('[DEV] 🚀 Spool CMS v2.1.0 - Now with Convex Live Updates!');
  console.log('[DEV] 💡 Live updates now use the useSpoolLiveUpdates hook');
  console.log('[DEV] 📖 See: https://docs.spoolcms.com/nextjs-integration#live-updates');
  
  // Check if user has the new environment variables
  if (process.env.NEXT_PUBLIC_SPOOL_CONVEX_URL) {
    console.log('[DEV] ✅ Convex URL detected - ready for live updates!');
  } else {
    console.log('[DEV] ⚠️  Add NEXT_PUBLIC_SPOOL_CONVEX_URL to use live updates');
  }
}
