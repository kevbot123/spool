# Migration Guide: Unified Field Access

## Overview

Starting with version 0.2.0, Spool provides unified field access for all content fields. You no longer need to remember whether a field is a system field or custom field - all fields are accessible directly on the content item.

## What Changed

### Before (v0.1.x)
```typescript
// System fields - direct access
post.id
post.slug
post.title
post.status
post.created_at

// Custom fields - nested in data object
post.data.body
post.data.description
post.data.author
post.data.featured
```

### After (v0.2.0+)
```typescript
// All fields - unified access pattern
post.id           // System field
post.slug         // System field
post.title        // System field
post.status       // System field
post.created_at   // System field

post.body         // Custom field
post.description  // Custom field
post.author       // Custom field
post.featured     // Custom field
```

## Migration Steps

### 1. Update Field Access
Replace `post.data.fieldName` with `post.fieldName`:

```typescript
// ❌ Old way
const title = post.data.title;
const body = post.data.body;
const author = post.data.author;

// ✅ New way
const title = post.title;
const body = post.body;
const author = post.author;
```

### 2. Update Markdown HTML Fields
```typescript
// ❌ Old way
<div dangerouslySetInnerHTML={{ __html: post.data.body_html }} />

// ✅ New way
<div dangerouslySetInnerHTML={{ __html: post.body_html }} />
```

### 3. Update Conditional Checks
```typescript
// ❌ Old way
{post.data.featured && <Badge>Featured</Badge>}

// ✅ New way
{post.featured && <Badge>Featured</Badge>}
```

### 4. Update Array Operations
```typescript
// ❌ Old way
const featuredPosts = posts.filter(post => post.data.featured);
const tags = posts.flatMap(post => post.data.tags || []);

// ✅ New way
const featuredPosts = posts.filter(post => post.featured);
const tags = posts.flatMap(post => post.tags || []);
```

### 5. Update Markdown Field Usage
```typescript
// ❌ Old way
<div dangerouslySetInnerHTML={{ __html: post.data.body_html }} />
const rawMarkdown = post.data.body;

// ✅ New way (with renderHtml: true)
<div dangerouslySetInnerHTML={{ __html: post.body }} />
const rawMarkdown = post.body.markdown;
```

## Backward Compatibility

The old `post.data.fieldName` pattern still works and won't break your existing code. However, we recommend migrating to the new unified pattern for:

- **Better Developer Experience**: Consistent field access pattern
- **Reduced Cognitive Load**: No need to remember field types
- **Future-Proofing**: Aligns with our long-term API design

## Automated Migration

You can use find-and-replace in your editor to quickly migrate:

1. **Find**: `\.data\.([a-zA-Z_][a-zA-Z0-9_]*)`
2. **Replace**: `.$1`
3. **Use Regex**: Enable regex mode in your editor

This will convert patterns like `post.data.body` to `post.body`.

## TypeScript Support

If you're using TypeScript, the types automatically support both patterns:

```typescript
interface Post {
  // System fields
  id: string;
  slug: string;
  title: string;
  
  // Custom fields (flattened)
  body: string;
  author: string;
  featured: boolean;
  
  // Backward compatibility
  data: {
    body: string;
    author: string;
    featured: boolean;
    // ... other custom fields
  };
}
```

## Need Help?

If you encounter any issues during migration:

1. Check that you're using `@spoolcms/nextjs@0.2.0` or later
2. Verify your field names match your collection schema
3. Remember that custom fields take precedence over system fields if there's a naming conflict

The old pattern will continue to work, so you can migrate gradually at your own pace.