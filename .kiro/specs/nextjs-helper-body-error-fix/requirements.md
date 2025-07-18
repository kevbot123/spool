# Requirements Document

## Introduction

This feature addresses a critical bug in the SpoolCMS Next.js helper package where the content fetching utility intermittently fails with a "Body is unusable" error. The issue occurs when the HTTP response body is consumed multiple times, which is not allowed in the Fetch API. This causes inconsistent behavior where sometimes the helper returns an empty array and other times it throws an error, making it unreliable for production use.

## Requirements

### Requirement 1

**User Story:** As a developer using the SpoolCMS Next.js helper, I want reliable content fetching that doesn't fail with "Body is unusable" errors, so that my marketing site loads consistently.

#### Acceptance Criteria

1. WHEN the content helper fetches data from the SpoolCMS API THEN the response body SHALL only be consumed once
2. WHEN an HTTP error occurs THEN the helper SHALL handle it gracefully without attempting to read the response body multiple times
3. WHEN the API request fails THEN the helper SHALL return an empty array instead of throwing an error
4. WHEN the helper is called multiple times in quick succession THEN it SHALL work consistently without race conditions

### Requirement 2

**User Story:** As a developer, I want clear error handling in the Next.js helper, so that I can debug issues when they occur.

#### Acceptance Criteria

1. WHEN an HTTP request fails THEN the helper SHALL log appropriate error information for debugging
2. WHEN the response is not OK THEN the helper SHALL throw a descriptive error with the HTTP status code
3. WHEN JSON parsing fails THEN the helper SHALL handle the error gracefully and return an empty array
4. WHEN network errors occur THEN the helper SHALL provide meaningful error messages

### Requirement 3

**User Story:** As a site owner, I want my marketing site to load reliably even when the CMS is temporarily unavailable, so that visitors always see content.

#### Acceptance Criteria

1. WHEN the SpoolCMS API is unavailable THEN the helper SHALL return an empty array instead of crashing the page
2. WHEN there are temporary network issues THEN the helper SHALL fail gracefully without breaking the site
3. WHEN the helper encounters any error THEN it SHALL not prevent the rest of the page from rendering
4. WHEN content fetching fails THEN the site SHALL continue to function with fallback behavior