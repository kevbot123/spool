# Implementation Plan

- [x] 1. Fix the response body consumption bug in content utility
  - Locate and examine the current implementation in `packages/nextjs/src/utils/content.ts`
  - Restructure error handling to check response.ok before consuming body
  - Ensure response.json() is only called once per request
  - Add proper try-catch blocks around all fetch operations
  - _Requirements: 1.1, 1.2, 2.2_

- [x] 2. Implement graceful error handling and fallback behavior
  - Replace error throwing with empty array returns for all error cases
  - Add proper logging for debugging while maintaining graceful degradation
  - Handle JSON parsing errors without crashing
  - Ensure network errors return empty arrays instead of throwing
  - _Requirements: 1.3, 2.1, 2.3, 3.1, 3.2, 3.3_

- [x] 3. Add comprehensive unit tests for error scenarios
  - Create tests for HTTP error responses (4xx, 5xx) without double body consumption
  - Test JSON parsing errors return empty arrays
  - Test network errors return empty arrays
  - Test successful responses still work correctly
  - _Requirements: 1.1, 1.4, 2.4, 3.4_

- [x] 4. Add integration tests for real-world scenarios
  - Test concurrent requests to verify no race conditions
  - Test with actual SpoolCMS API endpoints
  - Test error simulation with mocked responses
  - Verify marketing site loads consistently after fixes
  - _Requirements: 1.4, 3.1, 3.2, 3.3_

- [x] 5. Update package build and verify distribution
  - Build the updated Next.js helper package
  - Verify the fix is properly included in the distribution files
  - Test the built package in a sample Next.js application
  - Ensure no regressions in existing functionality
  - _Requirements: 1.1, 1.2, 1.3_