// Auto-start Spool dev-mode polling when in development environment
import './dev-bootstrap';

// Main exports for @spoolcms/nextjs package
export { createSpoolHandler } from './handlers/spool-handler';
export { 
  getSpoolContent, 
  getSpoolCollections, 
  generateSpoolMetadata,
  generateSpoolMetadataLegacy,
  getSpoolStaticParams,
  generateSpoolSitemap,
  SpoolError
} from './utils/content';
export { SpoolSEO } from './components/spool-seo';



// Utility functions
export { detectEnvironment, isServerContext, isClientContext } from './utils/environment';
export { resolveConfig } from './utils/config';
export { clearAllCaches } from './utils/cache';
export { img } from './utils/image';

// Webhook utilities (legacy - use live updates hook instead)
export { 
  verifySpoolWebhook, 
  parseSpoolWebhook, 
  getSpoolWebhookHeaders, 
  createSpoolWebhookHandler
} from './utils/webhook';

// Live Updates (Convex-powered real-time updates)
export { 
  useSpoolLiveUpdates,
  SpoolLiveUpdatesProvider
} from './hooks/useSpoolLiveUpdates';

// Types
export type { 
  SpoolConfig, 
  SpoolContent,
  SpoolContentWithDrafts,
  SpoolDraftContent,
  SpoolPublishedContent,
  SpoolContentLegacy,
  SpoolCollection, 
  SpoolCollectionSchema,
  SpoolField,
  BlogPost,
  Page,
  PublishedBlogPost,
  PublishedPage,
  ImageSizes, 
  ImageSize,
  ImageObject,
  GetSpoolContentOptions,
  GetSpoolStaticParamsOptions,
  GenerateSpoolSitemapOptions,
  SpoolMetadata,
  SpoolContentArray,
  SpoolContentSingle,
  CollectionContent
} from './types';

// Webhook types
export type { SpoolWebhookPayload } from './utils/webhook';

// Live Updates types
export type { LiveUpdate, UseSpoolLiveUpdatesConfig } from './hooks/useSpoolLiveUpdates';

// Type guards
export { isPublishedContent, isDraftContent } from './types';
export type { ContentOptions } from './utils/content';
export type { EnvironmentContext } from './utils/environment';
export type { ResolvedConfig } from './utils/config';
 