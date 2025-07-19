// Main exports for @spoolcms/nextjs package
export { createSpoolHandler } from './handlers/spool-handler';
export { getSpoolContent, getSpoolCollections, getSpoolSitemap, getSpoolRobots, generateSpoolMetadata } from './utils/content';
export { SpoolSEO } from './components/spool-seo';

// Types
export type { SpoolConfig, SpoolContent, SpoolCollection } from './types'; 