# Changelog

All notable changes to the @spoolcms/nextjs package will be documented in this file.

## [1.5.0] - 2025-01-29

### Added
- **Webhook Security**: New `verifySpoolWebhook()` function for webhook signature verification
- **Webhook Parsing**: New `parseSpoolWebhook()` function to validate and parse webhook payloads
- **Webhook Headers**: New `getSpoolWebhookHeaders()` function to extract Spool-specific headers
- **Complete Webhook Handler**: New `createSpoolWebhookHandler()` function for full webhook processing
- **TypeScript Support**: Added `SpoolWebhookPayload` type for webhook data

### Security
- **HMAC-SHA256 Verification**: Secure webhook signature verification to prevent unauthorized requests
- **Payload Validation**: Comprehensive validation of webhook payload structure and event types
- **Error Handling**: Proper error responses for invalid signatures and malformed payloads

### Developer Experience
- **Easy Integration**: Simple utilities for common webhook patterns
- **Comprehensive Testing**: Full test suite for all webhook utilities
- **Better Debugging**: Detailed logging with delivery IDs and processing times
- **Documentation**: Complete examples and usage patterns

### Migration
- Update your webhook endpoints to use the new verification utilities for enhanced security
- See updated integration guide for secure webhook implementation examples

## [0.4.2] - 2025-01-22

### Fixed
- **Image URL Format**: Fixed thumbnail URL generation to use clean format (`filename_thumb.webp` instead of `filename.ext_thumb.webp`)
- **URL Pattern Matching**: Updated regex to properly remove file extensions before adding thumbnail suffixes

### Migration
- Added migration script to rename existing thumbnail files to new clean format
- Backend already generates new uploads in correct format

## [0.4.1] - 2025-01-22

### Fixed
- **Image Thumbnail Processing**: Restored missing logic to convert image URL strings to objects with thumbnail URLs
- **Image Object Generation**: Now properly generates `thumb` and `small` URLs from original image URLs
- **Regression Fix**: Fixed issue where image thumbnails stopped working after simplification changes

## [0.4.0] - 2025-01-22

### Removed (Breaking Changes)
- **Robots.txt Generation**: Removed `getSpoolRobots()` function - robots.txt should be static
- **Client-Side Hooks**: Removed `useSpoolContent()` and `useSpoolCollections()` React hooks
- **Image Helper Functions**: Removed `getImageSizes()` and `hasMultipleSizes()` - kept only `img()`

### Philosophy
- **Simplified for AI Development**: Focused on essential features for developers building fast with AI
- **Reduced Complexity**: Fewer functions to learn, cleaner API surface
- **Server-First**: Optimized for Next.js server components (preferred for SEO)

### Migration
- Replace `getSpoolRobots()` with static `robots.txt` file
- Replace client hooks with server-side `getSpoolContent()` calls
- Replace `getImageSizes()` and `hasMultipleSizes()` with direct `img()` usage

## [0.3.0] - 2025-01-22

### Removed (Breaking Changes)
- **Sitemap Helpers**: Removed `getSpoolSitemapEntries`, `getAllSpoolSitemapEntries`, and `createSpoolSitemap` functions
- **getSpoolSitemap**: Removed deprecated sitemap endpoint function

### Philosophy Change
- **Simplified Approach**: Follow industry standards - let Next.js handle sitemaps, Spool provides content
- **Less Vendor Lock-in**: Use standard Next.js patterns instead of Spool-specific abstractions
- **Easier Maintenance**: Fewer features to maintain, focus on core CMS functionality

### Migration
- Replace sitemap helpers with simple `getSpoolContent` calls in your `app/sitemap.ts` file
- See updated integration guide for the 6-line sitemap implementation

## [0.2.8] - 2025-01-22

### Added
- **Simplified Sitemap Helper**: New `createSpoolSitemap` function for one-line sitemap creation
- **Automatic Homepage**: Automatically includes homepage in sitemap if not provided
- **Better Documentation**: Added explanation of automatic updates and webhook integration

### Improved
- **Developer Experience**: Most sites can now create a complete sitemap with just a few lines of code
- **Automatic Updates**: Clear documentation on how sitemaps update when content is published

## [0.2.7] - 2025-01-22

### Added
- **Next.js Sitemap Integration**: New `getSpoolSitemapEntries` and `getAllSpoolSitemapEntries` helpers for better sitemap integration
- **Industry Standard Approach**: Integrate Spool content into Next.js native sitemap system instead of conflicting separate endpoint

### Deprecated
- **getSpoolSitemap**: Deprecated in favor of Next.js native sitemap integration (still works but not recommended)

### Improved
- **Better SEO**: Comprehensive sitemaps that include both static pages and CMS content
- **No Conflicts**: Works seamlessly with Next.js built-in sitemap features
- **More Flexible**: Full control over sitemap structure, priorities, and change frequencies

## [0.2.6] - 2025-01-22

### Fixed
- **SEO Metadata Bug**: Fixed `generateSpoolMetadata` function not using `content.title` properly
- **Unified Field Access**: Updated metadata generation to work with the new unified field access pattern
- **Title Fallback**: Now correctly prioritizes `content.seoTitle` → `content.title` → 'Untitled'

## [0.2.5] - 2025-01-22

### Fixed
- **React Serialization**: Fixed "Only plain objects can be passed to Client Components" error by making markdown fields fully serializable
- **Simplified API**: Changed from object-based to string-based approach for better Next.js App Router compatibility
- **Updated Documentation**: Updated examples to use the new serializable approach

## [0.2.4] - 2025-01-22

### Improved
- **Smart Markdown Fields**: Markdown fields now default to HTML when used directly (e.g., `post.body` returns HTML)
- **Intuitive Markdown Access**: Access raw markdown with `post.body.markdown` and HTML with `post.body.html`
- **Simplified Developer Experience**: No more remembering `_html` suffixes - just use the field directly!

### Added
- Smart markdown field objects that work seamlessly with string operations
- Updated documentation showing the new simplified markdown interface
- Tests for smart markdown field functionality

## [0.2.3] - 2025-01-22

### Improved
- **Unified Field Access**: All content fields are now accessible directly on the content item (e.g., `post.body` instead of `post.data.body`)
- **Better Developer Experience**: No more confusion between system fields and custom fields - use the same access pattern for all fields
- **Backward Compatibility**: Old `post.data.field` pattern still works for existing code

### Added
- Migration guide for updating from old field access patterns
- Comprehensive tests for content flattening functionality
- Updated documentation with unified field access examples

## [0.2.2] - 2025-01-22

### Fixed
- Fixed "Body is unusable" error that occurred when the same content was requested multiple times due to improper Response caching
- Improved server-side caching to cache parsed JSON data instead of Response objects
- Added retry logic for body-related errors with cache clearing
- Enhanced error handling for text responses (sitemap, robots.txt)

### Added
- Comprehensive tests for body unusable error scenarios
- Integration tests for real API usage

## [0.2.1] - Previous Release
- Previous features and fixes...