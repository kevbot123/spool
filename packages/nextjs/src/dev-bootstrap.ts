// Auto-bootstrap Spool CMS development polling
// This file is imported as a side-effect from src/index.ts so that any import
// of `@spoolcms/nextjs` in development automatically starts the polling loop.
// It is safe to import multiple times because `startDevelopmentPolling` guards
// against duplicate instances.

import { startDevelopmentPolling } from './utils/webhook';
import { devPollingBus } from './dev-polling-bus';

// Augment the global namespace to inform TypeScript about our custom global property.
declare global {
  var __spoolPollingActive: boolean | undefined;
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
      startDevelopmentPolling(
        {
          apiKey: process.env.SPOOL_API_KEY,
          siteId: process.env.SPOOL_SITE_ID,
        },
        // Re-emit updates on the local EventEmitter so that user webhook handlers
        // can subscribe without starting a second polling loop.
        (data) => {
          devPollingBus.emit('contentChange', data);
        }
      );
      console.log('[DEV] Development polling started - live updates enabled on localhost');
    } catch (e) {
      console.error('[DEV] Failed to start Spool development polling.', e);
      // Unset the key if startup fails, allowing a future attempt.
      global.__spoolPollingActive = false;
    }
  }
}
