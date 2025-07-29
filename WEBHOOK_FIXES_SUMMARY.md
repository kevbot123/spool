# Spool CMS Webhook Live Updates - Comprehensive Fix

## Issues Fixed

### 1. **Development Polling Reliability**
- **Problem**: Inconsistent content change detection, missed updates, timing issues
- **Solution**: 
  - Improved content hash calculation with stable JSON serialization
  - Better error handling with retry logic and max retry limits
  - More robust data normalization handling nested data structures
  - Clearer separation between first run and subsequent polling cycles

### 2. **Content Hash Calculation**
- **Problem**: Hash calculation didn't properly handle nested data structures or field changes
- **Solution**:
  - Created `createContentHash()` function with comprehensive field inclusion
  - Handles both `data.data` and flat `data` structures
  - Includes all relevant fields: title, slug, status, published_at, updated_at, and all data fields
  - Stable JSON serialization with sorted keys

### 3. **Slug Change Detection**
- **Problem**: Slug changes weren't properly detected or handled
- **Solution**:
  - Store previous slug in polling state
  - Trigger webhooks for both old and new slugs when slug changes
  - Clear cache for old URLs automatically

### 4. **Race Conditions and Multiple Polling**
- **Problem**: Multiple polling instances could interfere with each other
- **Solution**:
  - Added `isPollingActive` flag to prevent multiple instances
  - Proper cleanup with `stopDevelopmentPolling()`
  - Better initialization timing with `setImmediate` or `setTimeout`

### 5. **Error Handling Gaps**
- **Problem**: Silent failures in development mode, unclear error messages
- **Solution**:
  - Comprehensive error logging with context
  - Retry logic with exponential backoff
  - Clear error messages for common issues (API key, network, etc.)
  - Graceful degradation when max retries reached

### 6. **Content-Updates API Endpoint**
- **Problem**: Incomplete data structure, missing draft data
- **Solution**:
  - Include `draft_data` in API response
  - Better data normalization handling
  - Increased item limit from 200 to 500
  - More comprehensive data structure

## New Features Added

### 1. **Comprehensive Test Script**
- Created `test-spool-webhooks` command
- Validates environment variables
- Tests content-updates endpoint connectivity
- Tests webhook endpoint functionality
- Provides clear troubleshooting guidance

### 2. **Enhanced Webhook Handler**
- Better error boundaries in user webhook handlers
- More detailed response headers for debugging
- Improved signature verification error handling
- Development config validation

### 3. **Complete Example Route**
- Created comprehensive webhook route example
- Includes collection-specific revalidation logic
- Event-specific handling (created, updated, published, deleted)
- Error handling and logging best practices
- CORS handling

### 4. **Improved Documentation**
- Updated integration guide with clearer instructions
- Added troubleshooting section for development mode
- Better examples with comprehensive revalidation logic
- Step-by-step debugging guide

## Technical Improvements

### 1. **Polling Algorithm**
```typescript
// Before: Simple hash comparison
const contentHash = JSON.stringify(item);

// After: Comprehensive, stable hash
function createContentHash(item: any): string {
  const hashData = {
    title: item.title || '',
    slug: item.slug || '',
    status: item.status || 'draft',
    published_at: item.published_at || null,
    updated_at: item.updated_at || '',
    data: typeof item.data === 'object' ? 
      JSON.stringify(item.data, Object.keys(item.data).sort()) : 
      item.data || {}
  };
  return JSON.stringify(hashData, Object.keys(hashData).sort());
}
```

### 2. **Better State Management**
```typescript
// Before: Simple string or object
let lastContentCheck: Record<string, string | { hash: string; slug: string; status: string }> = {};

// After: Comprehensive state tracking
let lastContentCheck: Record<string, { 
  hash: string; 
  slug: string; 
  status: string; 
  title: string; 
  updated_at: string 
}> = {};
```

### 3. **Improved Key Generation**
```typescript
// Before: Fragile key generation
const key = `${update.collection}-${update.item_id}`;

// After: Collision-resistant key generation
const key = `${update.collection}::${update.item_id}`;
```

### 4. **Enhanced Error Recovery**
```typescript
// Added retry logic with max attempts
let pollingRetryCount = 0;
const MAX_RETRY_COUNT = 3;

// Stop polling after max retries to prevent spam
if (pollingRetryCount >= MAX_RETRY_COUNT) {
  console.error('[DEV] Max polling retries reached - stopping development polling');
  stopDevelopmentPolling();
}
```

## User Experience Improvements

### 1. **Clear Console Messages**
```bash
[DEV] Starting Spool development mode polling...
[DEV] Initial content sync complete - tracking 15 items
[DEV] Content updated: blog/my-post
[DEV] Slug changed: blog/old-slug → new-slug
[DEV] Content published: blog/my-post
[DEV] Content deleted: blog/deleted-post
```

### 2. **Better Error Messages**
```bash
[DEV] Missing required developmentConfig: apiKey and siteId are required
[DEV] Polling error (attempt 1/3): HTTP 401: Unauthorized
[DEV] Max polling retries reached - stopping development polling
[DEV] Please check your SPOOL_API_KEY and SPOOL_SITE_ID configuration
```

### 3. **Comprehensive Testing**
```bash
npx test-spool-webhooks
# Validates complete setup and provides actionable feedback
```

## Files Modified

1. **`packages/nextjs/src/utils/webhook.ts`** - Core webhook utilities
2. **`src/app/api/spool/[siteId]/content-updates/route.ts`** - Content updates API
3. **`SPOOL_INTEGRATION_GUIDE.md`** - Updated documentation
4. **`packages/nextjs/src/__tests__/webhook.test.ts`** - Enhanced tests
5. **`packages/nextjs/package.json`** - Added test script

## Files Added

1. **`packages/nextjs/src/scripts/test-webhook-setup.js`** - Comprehensive test script
2. **`packages/nextjs/examples/webhook-route-example.ts`** - Complete example
3. **`WEBHOOK_FIXES_SUMMARY.md`** - This summary document

## Testing

All webhook-related tests are passing:
- ✅ Webhook signature verification
- ✅ Payload parsing and validation
- ✅ Handler creation and configuration
- ✅ Error handling scenarios
- ✅ Development config validation

## Deployment

The fixes are backward compatible and don't require any breaking changes. Users can:

1. Update to the latest package version
2. Run `npx test-spool-webhooks` to verify their setup
3. Optionally update their webhook route using the comprehensive example
4. Enjoy reliable live updates in both development and production

## Result

The live updating functionality now works seamlessly for new users testing Spool on their Next.js sites. The system is:

- **Reliable**: Consistent change detection with proper error handling
- **Fast**: 2-second polling interval with efficient change detection
- **Robust**: Handles network issues, API errors, and edge cases gracefully
- **User-friendly**: Clear console messages and comprehensive testing tools
- **Production-ready**: Works in both development and production environments