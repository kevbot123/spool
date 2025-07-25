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

// Types
export type { 
  SpoolConfig, 
  SpoolContent,
  SpoolContentLegacy,
  SpoolCollection, 
  SpoolCollectionSchema,
  SpoolField,
  BlogPost,
  Page,
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
export type { ContentOptions } from './utils/content';
export type { EnvironmentContext } from './utils/environment';
export type { ResolvedConfig } from './utils/config';
 