// Main exports for @spoolcms/nextjs package
export { createSpoolHandler } from './handlers/spool-handler';
export { 
  getSpoolContent, 
  getSpoolCollections, 
  getSpoolSitemap, 
  getSpoolRobots, 
  generateSpoolMetadata,
  SpoolError
} from './utils/content';
export { SpoolSEO } from './components/spool-seo';

// React hooks for client components
export { useSpoolContent, useSpoolCollections } from './hooks/useSpoolContent';

// Utility functions
export { detectEnvironment, isServerContext, isClientContext } from './utils/environment';
export { resolveConfig } from './utils/config';
export { clearAllCaches } from './utils/cache';

// Types
export type { SpoolConfig, SpoolContent, SpoolCollection } from './types';
export type { ContentOptions } from './utils/content';
export type { EnvironmentContext } from './utils/environment';
export type { ResolvedConfig } from './utils/config';
export type { UseSpoolContentResult } from './hooks/useSpoolContent'; 