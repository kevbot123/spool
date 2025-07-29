// Auto-bootstrap Spool CMS development polling
// This file is imported as a side-effect from src/index.ts so that any import
// of `@spoolcms/nextjs` in development automatically starts the polling loop.
// It is safe to import multiple times because `startDevelopmentPolling` guards
// against duplicate instances.

console.log('[DEV] dev-bootstrap.ts loaded');

import { startDevelopmentPolling, SpoolWebhookPayload } from './utils/webhook';
import { devPollingBus } from './dev-polling-bus';

// Augment the global namespace to inform TypeScript about our custom global property.
declare global {
  var __spoolPollingActive: boolean | undefined;
  var __spoolWebhookHandlers: ((data: SpoolWebhookPayload) => Promise<void> | void)[] | undefined;
}

console.log('[DEV] Checking dev-bootstrap conditions...');
console.log('[DEV] typeof window:', typeof window);
console.log('[DEV] NODE_ENV:', process.env.NODE_ENV);
console.log('[DEV] __spoolPollingActive:', global.__spoolPollingActive);
console.log('[DEV] SPOOL_API_KEY exists:', !!process.env.SPOOL_API_KEY);
console.log('[DEV] SPOOL_SITE_ID exists:', !!process.env.SPOOL_SITE_ID);

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
    } catch (e) {
      console.error('[DEV] Failed to start Spool development polling.', e);
      // Unset the key if startup fails, allowing a future attempt.
      global.__spoolPollingActive = false;
    }
  }
}
