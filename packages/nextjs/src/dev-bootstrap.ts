// Auto-bootstrap Spool CMS development polling
// This file is imported as a side-effect from src/index.ts so that any import
// of `@spoolcms/nextjs` in development automatically starts the polling loop.
// It is safe to import multiple times because `startDevelopmentPolling` guards
// against duplicate instances.

import { startDevelopmentPolling } from './utils/webhook';

// Only run in non-browser, development environment, and when credentials exist
if (
  typeof window === 'undefined' &&
  process.env.NODE_ENV === 'development' &&
  process.env.SPOOL_API_KEY &&
  process.env.SPOOL_SITE_ID
) {
  try {
    startDevelopmentPolling(
      {
        apiKey: process.env.SPOOL_API_KEY,
        siteId: process.env.SPOOL_SITE_ID,
      },
      // no-op handler – user can still provide a real handler via
      // createSpoolWebhookHandler; the polling util will call both.
      () => {}
    );
  } catch (err) {
    console.error('[DEV] Failed to auto-start Spool development polling:', err);
  }
}
