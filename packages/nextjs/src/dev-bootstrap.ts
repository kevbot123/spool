// Auto-bootstrap Spool CMS development polling
// This file is imported as a side-effect from src/index.ts so that any import
// of `@spoolcms/nextjs` in development automatically starts the polling loop.
// It is safe to import multiple times because `startDevelopmentPolling` guards
// against duplicate instances.

import { startDevelopmentPolling, SpoolWebhookPayload } from './utils/webhook';

// Augment the global namespace to inform TypeScript about our custom global property.
declare global {
  var __spoolPollingActive: boolean | undefined;
  var __spoolWebhookHandlers: ((data: SpoolWebhookPayload) => Promise<void> | void)[] | undefined;
}

// Initialize webhook handlers array
if (!global.__spoolWebhookHandlers) {
  global.__spoolWebhookHandlers = [];
}

// Use a global variable to ensure the polling process is a singleton.
if (
  typeof window === 'undefined' &&
  process.env.NODE_ENV === 'development' &&
  !global.__spoolPollingActive
) {
  // Set the flag immediately to prevent race conditions.
  global.__spoolPollingActive = true;

  if (process.env.SPOOL_API_KEY && process.env.SPOOL_SITE_ID) {
    try {
      console.log('[DEV] Starting Spool development mode polling...');
      startDevelopmentPolling({
        apiKey: process.env.SPOOL_API_KEY,
        siteId: process.env.SPOOL_SITE_ID,
      });
      console.log('[DEV] Development polling started - live updates enabled on localhost');
      
      // Force webhook route loading by making a request to common webhook paths
      setTimeout(async () => {
        const handlerCount = global.__spoolWebhookHandlers?.length || 0;
        if (handlerCount === 0) {
          console.log('[DEV] No webhook handlers registered yet - attempting to load webhook routes...');
          
          const commonPaths = [
            '/api/webhooks/spool',
            '/api/webhook/spool', 
            '/api/spool/webhook'
          ];
          
          for (const path of commonPaths) {
            try {
              // Make a HEAD request to trigger route loading without processing
              await fetch(`http://localhost:3000${path}`, { 
                method: 'HEAD',
                signal: AbortSignal.timeout(1000)
              });
              console.log(`[DEV] Attempted to load webhook route: ${path}`);
            } catch (e) {
              // Ignore - route doesn't exist or other error
            }
          }
          
          // Check again after attempting to load routes
          setTimeout(() => {
            const newHandlerCount = global.__spoolWebhookHandlers?.length || 0;
            if (newHandlerCount > 0) {
              console.log(`[DEV] ✅ ${newHandlerCount} webhook handler(s) loaded - live updates ready!`);
            } else {
              console.warn('[DEV] ⚠️  Still no webhook handlers registered.');
              console.warn('[DEV] Make sure you have created: app/api/webhooks/spool/route.ts');
              console.warn('[DEV] And that it uses createSpoolWebhookHandler with developmentConfig');
            }
          }, 500);
        }
      }, 2000);
      
    } catch (e) {
      console.error('[DEV] Failed to start Spool development polling.', e);
      // Unset the key if startup fails, allowing a future attempt.
      global.__spoolPollingActive = false;
    }
  }
}
