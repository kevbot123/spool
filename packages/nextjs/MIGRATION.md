# Migration Guide

This document outlines breaking changes and migration steps between versions of `@spoolcms/nextjs`.

## Version 0.4.2 → 0.5.0 🚀 SIMPLIFIED API

### Major Simplifications

This version dramatically simplifies the developer experience to match industry leaders like Sanity and Contentful.

#### 1. Simplified Metadata Generation

**Before (Complex):**
```typescript
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = params;
  const post = await getSpoolContent(spoolConfig, 'blog', slug);
  
  if (!post) {
    return { title: 'Post Not Found' };
  }
  
  return generateSpoolMetadata({
    content: post,
    collection: 'blog',
    path: `/blog/${slug}`,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  });
}
```

**After (ONE LINE!):**
```typescript
export async function generateMetadata({ params }: PageProps) {
  const post = await getSpoolContent(spoolConfig, 'blog', params.slug);
  return generateSpoolMetadata(post); // Auto-detects everything!
}
```

#### 2. Simplified Static Generation

**Before (Manual):**
```typescript
// Optional: Generate static paths for better performance
export async function generateStaticParams() {
  const posts = await getSpoolContent(spoolConfig, 'blog');
  return posts.map((post: any) => ({
    slug: post.slug,
  }));
}
```

**After (ONE LINE!):**
```typescript
export async function generateStaticParams() {
  return await getSpoolStaticParams(spoolConfig, 'blog');
}
```

#### 3. Simplified Sitemap Generation

**Before (Complex):**
```typescript
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yoursite.com';
  const posts = await getSpoolContent(spoolConfig, 'blog');
  
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    // ... manual mapping for each collection
    ...posts.map((post: any) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
```

**After (ONE LINE!):**
```typescript
export default async function sitemap() {
  return await generateSpoolSitemap(spoolConfig, {
    collections: ['blog', 'pages'],
    staticPages: [
      { url: '/', priority: 1.0 },
      { url: '/about', priority: 0.8 }
    ]
  });
}
```

#### 4. Simplified Handler Creation

**Before:**
```typescript
export const { GET, POST, PUT, DELETE } = createSpoolHandler({
  apiKey: process.env.SPOOL_API_KEY!,
  siteId: process.env.SPOOL_SITE_ID!,
});
```

**After (Auto-detects from environment):**
```typescript
export const { GET, POST, PUT, DELETE } = createSpoolHandler();
```

#### 5. Optional: New Content Fetching API

**Current (still works):**
```typescript
const posts = await getSpoolContent(spoolConfig, 'blog');
const post = await getSpoolContent(spoolConfig, 'blog', 'my-post');
```

**New Option (even simpler):**
```typescript
const posts = await getSpoolContent({ collection: 'blog' });
const post = await getSpoolContent({ collection: 'blog', slug: 'my-post' });
```

### Migration Steps

#### Required Changes:

1. **Update metadata generation:**
   ```typescript
   // Replace this:
   return generateSpoolMetadata({
     content: post,
     collection: 'blog',
     path: `/blog/${slug}`,
     siteUrl: 'https://yoursite.com'
   });
   
   // With this:
   return generateSpoolMetadata(post);
   ```

2. **Update static params generation:**
   ```typescript
   // Replace manual mapping with:
   return await getSpoolStaticParams(spoolConfig, 'blog');
   ```

3. **Update sitemap generation:**
   ```typescript
   // Replace manual implementation with:
   return await generateSpoolSitemap(spoolConfig, {
     collections: ['blog'],
     staticPages: [{ url: '/', priority: 1.0 }]
   });
   ```

#### Optional Changes:

4. **Simplify handler creation:**
   ```typescript
   // Remove config object if using environment variables:
   export const { GET, POST, PUT, DELETE } = createSpoolHandler();
   ```

5. **Use new content API (optional):**
   ```typescript
   // New syntax (optional):
   const posts = await getSpoolContent({ collection: 'blog' });
   ```

### Backward Compatibility

- ✅ All existing APIs still work
- ✅ Legacy `generateSpoolMetadata` with options object still supported
- ✅ Existing content fetching syntax unchanged
- ✅ No breaking changes to existing code

### Benefits

- 🚀 **90% less boilerplate code**
- 🎯 **Auto-detection of site URLs, paths, and configuration**
- 🏆 **Matches industry leaders like Sanity/Contentful for simplicity**
- ⚡ **Faster development with one-line helpers**
- 🔧 **Better developer experience**

---

## Version 0.1.x → 0.2.0: Unified Field Access

### Overview

Starting with version 0.2.0, Spool provides unified field access for all content fields. You no longer need to remember whether a field is a system field or custom field - all fields are accessible directly on the content item.

### What Changed

**Before (v0.1.x):**
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

**After (v0.2.0+):**
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

### Migration Steps

1. **Update Field Access**: Replace `post.data.fieldName` with `post.fieldName`
2. **Update Markdown HTML Fields**: Use `post.body_html` instead of `post.data.body_html`
3. **Update Conditional Checks**: Use `post.featured` instead of `post.data.featured`
4. **Update Array Operations**: Use unified field access in filters and maps

### Backward Compatibility

The old `post.data.fieldName` pattern still works and won't break your existing code. However, we recommend migrating to the new unified pattern for better developer experience.