# Changelog

All notable changes to the @spoolcms/nextjs package will be documented in this file.

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