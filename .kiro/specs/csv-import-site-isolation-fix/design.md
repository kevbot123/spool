# Design Document

## Overview

This design addresses the critical site isolation bug in the CSV import functionality. The core issue is in the `ContentManager.createContentBatch()` method, which has a development bypass that can cause cross-site data contamination in production. The fix involves removing the problematic bypass logic and ensuring consistent site-scoped collection lookups across all operations.

## Architecture

The fix involves modifications to the ContentManager class in the CMS layer, specifically the collection lookup logic. The current architecture has these components:

- **Import API Route** (`/api/admin/content/[collection]/import`) - Handles CSV upload and processing
- **ContentManager Class** - Manages content operations including batch creation
- **Collection Lookup Logic** - Currently has a problematic development bypass

The design maintains the existing architecture while fixing the site isolation issue.

## Components and Interfaces

### ContentManager Class Modifications

**Current Problematic Code:**
```typescript
// Build query – in development we use a placeholder site ID. When that
// placeholder is detected we DON'T restrict by `site_id` so any collection
// slug can be matched.
let collectionQuery = supabase
  .from('collections')
  .select('id, site_id')
  .eq('slug', collectionSlug);

if (actualSiteId !== '00000000-0000-0000-0000-000000000000') {
  collectionQuery = collectionQuery.eq('site_id', actualSiteId);
}
```

**Fixed Design:**
```typescript
// Always enforce site isolation - no bypasses
const collectionQuery = supabase
  .from('collections')
  .select('id, site_id')
  .eq('slug', collectionSlug)
  .eq('site_id', actualSiteId);
```

### Collection Lookup Interface

The collection lookup will be standardized to always include site filtering:

```typescript
interface CollectionLookupParams {
  slug: string;
  siteId: string; // Always required, no optional bypasses
}

interface CollectionLookupResult {
  id: string;
  site_id: string;
  slug: string;
}
```

### Error Handling Enhancement

Enhanced error messages will provide clear context about site-specific collection availability:

```typescript
interface CollectionNotFoundError {
  message: string; // e.g., "Collection 'blog' not found in site 'abc-123'"
  collectionSlug: string;
  siteId: string;
  availableCollections?: string[]; // Optional: list collections in this site
}
```

## Data Models

No changes to database schema are required. The fix is purely in the application logic layer.

**Existing Collections Table:**
- `id` (UUID, Primary Key)
- `site_id` (UUID, Foreign Key to sites table)
- `slug` (String, Unique within site)
- `name` (String)
- `schema` (JSONB)

The composite uniqueness constraint `(site_id, slug)` already exists and supports proper site isolation.

## Error Handling

### Collection Not Found Errors

When a collection lookup fails, the system will provide specific error messages:

1. **Collection doesn't exist in target site:**
   - Error: `"Collection 'blog' not found in site '{siteId}'"`
   - HTTP Status: 400 Bad Request

2. **Invalid site ID:**
   - Error: `"Invalid or inaccessible site ID: '{siteId}'"`
   - HTTP Status: 403 Forbidden

3. **Database connection issues:**
   - Error: `"Database error during collection lookup: {details}"`
   - HTTP Status: 500 Internal Server Error

### Batch Import Error Handling

The batch import process will fail fast when collection lookup fails:

1. **Pre-validation:** Verify collection exists before processing any CSV rows
2. **Clear error reporting:** Provide specific error about collection availability
3. **No partial imports:** Don't create any content if collection lookup fails

## Testing Strategy

### Unit Tests

1. **Collection Lookup Tests:**
   - Test collection lookup with valid site ID
   - Test collection lookup with invalid site ID
   - Test collection lookup with non-existent collection
   - Test that development placeholder ID still enforces site isolation

2. **Batch Creation Tests:**
   - Test successful batch creation with valid collection
   - Test batch creation failure with invalid collection
   - Test error message accuracy

### Integration Tests

1. **CSV Import End-to-End:**
   - Create test sites with collections having same slugs
   - Verify imports only affect target site
   - Verify cross-site contamination is prevented

2. **Multi-Site Scenarios:**
   - Test with multiple sites having collections named "blog"
   - Verify each import goes to correct site
   - Test error handling when collection doesn't exist in target site

### Development Environment Testing

1. **Local Development:**
   - Ensure development environment still works after removing bypass
   - Test with proper test site IDs instead of placeholder UUID
   - Verify development workflows aren't broken

## Implementation Notes

### Backward Compatibility

The fix maintains backward compatibility for all legitimate use cases. The only change is removing the problematic development bypass that was causing production issues.

### Development Environment Considerations

Instead of bypassing site filtering in development, the system should use proper test site IDs. This ensures development and production behavior is consistent.

### Performance Impact

The fix has minimal performance impact since it removes conditional logic rather than adding it. All collection lookups will now use the same optimized query path.

## Security Considerations

This fix addresses a significant security issue where data from one site could leak into another site. The changes ensure:

1. **Data Isolation:** Each site's data remains completely isolated
2. **Access Control:** Users can only import into collections they have access to
3. **Audit Trail:** Clear error messages help with debugging and security monitoring

## Migration Strategy

This is a code-only fix with no database migrations required. The deployment strategy:

1. **Deploy the fix** - Update ContentManager class
2. **Monitor logs** - Watch for any collection lookup errors
3. **Verify isolation** - Test CSV imports across multiple sites
4. **Update documentation** - Remove references to development bypass behavior