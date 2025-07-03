import { SpoolConfig } from '@spool/nextjs';

export const spoolConfig: SpoolConfig = {
  apiKey: process.env.SPOOL_API_KEY!,
  siteId: process.env.SPOOL_SITE_ID!,
}; 