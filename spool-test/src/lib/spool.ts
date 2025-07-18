import { SpoolConfig } from '@spoolcms/nextjs';

export const spoolConfig: SpoolConfig = {
  apiKey: process.env.SPOOL_API_KEY || 'demo-key',
  siteId: process.env.SPOOL_SITE_ID || 'demo-site',
}; 