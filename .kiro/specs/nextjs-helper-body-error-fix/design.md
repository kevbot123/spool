# Design Document

## Overview

This design addresses the "Body is unusable" error in the SpoolCMS Next.js helper package. The core issue is in the content fetching utility at `@spoolcms/nextjs/dist/utils/content.js:63` where the HTTP response body is being consumed multiple times, which violates the Fetch API specification. The fix involves restructuring the error handling to ensure the response body is only read once and implementing proper fallback behavior.

## Architecture

The fix involves modifications to the Next.js helper package, specifically the content fetching utility. The current architecture has these components:

- **Content Utility Function** - Located in `packages/nextjs/src/utils/content.ts`
- **Error Handling Logic** - Currently problematic, attempts to read response body multiple times
- **Response Processing** - Needs to be restructured to consume body only once

The design maintains the existing API interface while fixing the underlying implementation.

## Components and Interfaces

### Current Problematic Pattern

```typescript
// Bad (current implementation):
const response = await fetch(url);
const data = await response.json(); // First consumption
// ... some error handling that tries to read response.json() again // Second consumption = error
```

### Fixed Implementation Design

```typescript
// Good (fixed implementation):
const response = await fetch(url);

// Check response status before consuming body
if (!response.ok) {
  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}

// Only consume body once
const data = await response.json();
return data;
```

### Enhanced Error Handling Structure

```typescript
interface ContentFetchResult<T> {
  data: T[];
  error?: string;
}

async function fetchContent<T>(url: string): Promise<T[]> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`SpoolCMS API error: HTTP ${response.status} ${response.statusText}`);
      return []; // Graceful fallback
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
    
  } catch (error) {
    console.error('SpoolCMS content fetch failed:', error);
    return []; // Always return empty array on error
  }
}
```

### Response Body Consumption Strategy

The design ensures response bodies are consumed exactly once:

1. **Status Check First**: Check `response.ok` before reading body
2. **Single Consumption**: Read `response.json()` only once
3. **Error Boundaries**: Wrap all operations in try-catch
4. **Graceful Fallbacks**: Return empty arrays instead of throwing

## Data Models

No changes to data models are required. The fix maintains the existing API contract:

```typescript
// Existing interface (unchanged)
interface ContentItem {
  id: string;
  slug: string;
  title: string;
  content: any;
  published_at: string;
  // ... other fields
}

// Helper function signature (unchanged)
export async function getContent(
  siteId: string, 
  collection: string, 
  options?: ContentOptions
): Promise<ContentItem[]>
```

## Error Handling

### HTTP Error Handling

1. **4xx Client Errors**:
   - Log error with status code
   - Return empty array
   - Don't attempt to read response body

2. **5xx Server Errors**:
   - Log error with status code
   - Return empty array
   - Don't attempt to read response body

3. **Network Errors**:
   - Log network error details
   - Return empty array
   - Handle fetch rejections

### JSON Parsing Error Handling

```typescript
try {
  const data = await response.json();
  return Array.isArray(data) ? data : [];
} catch (parseError) {
  console.error('SpoolCMS JSON parse error:', parseError);
  return [];
}
```

### Race Condition Prevention

The fix prevents race conditions by:

1. **Atomic Operations**: Each fetch operation is self-contained
2. **No Shared State**: No global variables that could cause conflicts
3. **Proper Async Handling**: Await all promises properly
4. **Error Isolation**: Errors in one call don't affect others

## Testing Strategy

### Unit Tests

1. **Response Body Consumption Tests**:
   - Test successful response handling
   - Test error response handling without double consumption
   - Test JSON parsing error handling
   - Test network error handling

2. **Error Boundary Tests**:
   - Test HTTP 4xx responses return empty array
   - Test HTTP 5xx responses return empty array
   - Test malformed JSON returns empty array
   - Test network failures return empty array

### Integration Tests

1. **Real API Tests**:
   - Test against actual SpoolCMS API endpoints
   - Test with valid and invalid site IDs
   - Test with existing and non-existent collections
   - Test concurrent requests

2. **Error Simulation Tests**:
   - Mock HTTP errors and verify graceful handling
   - Mock network timeouts and verify fallback behavior
   - Mock malformed responses and verify parsing safety

### Load Testing

1. **Concurrent Request Tests**:
   - Test multiple simultaneous requests
   - Verify no race conditions occur
   - Test helper reliability under load

## Implementation Notes

### Backward Compatibility

The fix maintains complete backward compatibility:

- Same function signatures
- Same return types
- Same behavior for successful requests
- Only error handling behavior changes (improves reliability)

### Performance Considerations

The fix has minimal performance impact:

- Removes redundant response body reads
- Adds minimal error checking overhead
- Improves reliability without sacrificing speed

### Development Environment

The fix works consistently across all environments:

- Local development
- Staging environments
- Production deployments
- Different Node.js versions

## Security Considerations

The fix improves security by:

1. **Error Information Disclosure**: Logs errors server-side only, doesn't expose internal details to client
2. **Graceful Degradation**: Prevents crashes that could expose system information
3. **Input Validation**: Ensures returned data is always an array

## Migration Strategy

This is a package update with no breaking changes:

1. **Update Package**: Publish new version of `@spoolcms/nextjs`
2. **Update Documentation**: Document the improved error handling
3. **Test Deployment**: Verify marketing sites work reliably
4. **Monitor Logs**: Watch for any remaining issues

The fix is backward compatible, so existing implementations will automatically benefit from the improved reliability.