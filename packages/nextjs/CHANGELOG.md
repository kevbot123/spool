# Changelog

All notable changes to the @spoolcms/nextjs package will be documented in this file.

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