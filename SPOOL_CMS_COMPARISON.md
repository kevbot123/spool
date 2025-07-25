# Spool CMS vs Other Headless CMS Solutions

This document compares Spool CMS with other popular headless CMS solutions to help you understand the differences and advantages.

## Developer Experience Comparison

| Feature | Spool | Sanity | Contentful | Strapi |
|---------|-------|--------|------------|--------|
| **Setup** | `npm install @spoolcms/nextjs` | `npm install @sanity/client` + config | `npm install contentful` + config | Complex setup |
| **Metadata** | `generateSpoolMetadata(post)` | `generateMetadata(post)` | Manual setup | Manual setup |
| **Static Generation** | `getSpoolStaticParams(config, 'blog')` | Manual mapping | Manual mapping | Manual mapping |
| **Sitemap** | `generateSpoolSitemap(config, {...})` | Manual implementation | Manual implementation | Manual implementation |
| **Image Optimization** | `img(post.image, 'small')` | Manual transforms | Manual transforms | Manual setup |
| **Markdown** | `post.body` (HTML ready) | Manual processing | Manual processing | Manual processing |

## URL Structure Philosophy

**Comparison with Other CMS:**

| CMS | Approach | Flexibility | Framework Support |
|-----|----------|-------------|-------------------|
| **Spool** | Slug-based | ✅ High | ✅ All frameworks |
| Contentful | Path-based | ❌ Low | ✅ All frameworks |
| Sanity | Slug-based | ✅ High | ❌ Requires GROQ knowledge |
| Strapi | Path-based | ❌ Low | ✅ All frameworks |

### Spool's Approach

Spool uses a slug-based approach that gives you maximum flexibility:

```typescript
// ✅ Framework controls URL structure
const post = await getSpoolContent(spoolConfig, 'blog', 'my-post');
// Appears at: /blog/my-post, /articles/my-post, or /news/my-post
// Your choice via Next.js routing
```

**Benefits:**
- ✅ **Framework flexibility** - Works with Next.js, React Router, Vue, etc.
- ✅ **Easy site reorganization** - Change URL structure without touching content
- ✅ **No vendor lock-in** - Your URL structure isn't tied to your CMS
- ✅ **Simple conflict resolution** - Slugs are just identifiers

## Code Examples Comparison

### Fetching Content

**Sanity Example:**
```typescript
// Sanity requires complex GROQ queries
const post = await sanity.fetch(`
  *[_type == "post" && slug.current == $slug][0]{
    title,
    body,
    "slug": slug.current,
    publishedAt
  }
`, { slug });
```

**Contentful Example:**
```typescript
// Contentful requires manual field mapping and locale handling
const post = await contentful.getEntry(entryId);
const title = post.fields.title['en-US'];
const body = await documentToHtmlString(post.fields.body['en-US']);
```

**Strapi Example:**
```typescript
// Strapi requires manual API construction
const response = await fetch(`${STRAPI_URL}/api/posts?filters[slug][$eq]=${slug}&populate=*`);
const data = await response.json();
const post = data.data[0];
```

**Spool Example:**
```typescript
// Spool: Simple and unified
const post = await getSpoolContent(spoolConfig, 'blog', slug);
console.log(post.title); // Just works
console.log(post.body);  // Already HTML, ready to render
```

### Metadata Generation

**Sanity Example:**
```typescript
// Manual metadata construction
export async function generateMetadata({ params }) {
  const post = await sanity.fetch(query, { slug: params.slug });
  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.description,
    openGraph: {
      title: post.ogTitle || post.title,
      description: post.ogDescription || post.description,
      images: post.ogImage ? [{ url: post.ogImage }] : [],
    },
  };
}
```

**Contentful Example:**
```typescript
// Manual metadata with locale handling
export async function generateMetadata({ params }) {
  const post = await contentful.getEntry(entryId);
  return {
    title: post.fields.seoTitle?.['en-US'] || post.fields.title['en-US'],
    description: post.fields.seoDescription?.['en-US'] || post.fields.description?.['en-US'],
    // ... more manual mapping
  };
}
```

**Spool Example:**
```typescript
// One line with auto-detection
export async function generateMetadata({ params }) {
  const post = await getSpoolContent(spoolConfig, 'blog', params.slug);
  return generateSpoolMetadata(post); // Auto-detects everything!
}
```

### Static Generation

**Sanity Example:**
```typescript
// Manual mapping required
export async function generateStaticParams() {
  const posts = await sanity.fetch(`*[_type == "post"]{ "slug": slug.current }`);
  return posts.map((post) => ({ slug: post.slug }));
}
```

**Contentful Example:**
```typescript
// Manual API calls and mapping
export async function generateStaticParams() {
  const response = await contentful.getEntries({ content_type: 'blogPost' });
  return response.items.map((item) => ({ slug: item.fields.slug }));
}
```

**Spool Example:**
```typescript
// One line helper
export async function generateStaticParams() {
  return await getSpoolStaticParams(spoolConfig, 'blog');
}
```

## Key Advantages of Spool

### 1. **Simplicity**
- No query languages to learn (unlike Sanity's GROQ)
- No complex field mapping (unlike Contentful)
- No manual API construction (unlike Strapi)

### 2. **Next.js Optimization**
- Built specifically for Next.js App Router
- Auto-detects site URLs, paths, and configuration
- One-line helpers for common tasks

### 3. **Developer Experience**
- Unified field access (no `post.data.field` vs `post.field` confusion)
- Markdown fields return HTML by default (React-ready)
- Automatic image optimization with multiple sizes

### 4. **Framework Flexibility**
- Slug-based approach works with any routing system
- No vendor lock-in for URL structure
- Easy to migrate between frameworks

### 5. **Real-time Updates**
- Built-in webhook support for instant cache invalidation
- Works seamlessly with Next.js revalidation
- No complex setup required

## When to Choose Each CMS

### Choose Spool When:
- ✅ Building with Next.js (especially App Router)
- ✅ Want the simplest possible developer experience
- ✅ Need real-time updates out of the box
- ✅ Prefer convention over configuration
- ✅ Want automatic SEO and performance optimizations

### Choose Sanity When:
- ✅ Need complex content relationships and queries
- ✅ Have a team comfortable with GROQ
- ✅ Need advanced content modeling features
- ✅ Building content-heavy applications

### Choose Contentful When:
- ✅ Need enterprise-grade features and support
- ✅ Have complex localization requirements
- ✅ Need advanced workflow and approval processes
- ✅ Have a large content team

### Choose Strapi When:
- ✅ Need full control over the backend
- ✅ Want to self-host your CMS
- ✅ Have complex custom requirements
- ✅ Need to integrate with existing systems

## Migration Considerations

### From Sanity to Spool
- **Easier queries**: Replace GROQ with simple function calls
- **Simpler metadata**: One-line metadata generation
- **Better Next.js integration**: Built-in App Router support

### From Contentful to Spool
- **No locale complexity**: Unified field access
- **Simpler setup**: No complex SDK configuration
- **Better performance**: Optimized for Next.js caching

### From Strapi to Spool
- **No backend management**: Fully hosted solution
- **Simpler API**: No manual endpoint construction
- **Better developer experience**: Purpose-built for modern React

## Conclusion

Spool CMS is designed to be the simplest, most developer-friendly headless CMS specifically for Next.js applications. While other solutions offer more complexity and features, Spool focuses on making the 90% use case as simple as possible while still being powerful enough for production applications.

The key differentiator is **developer experience** - Spool eliminates the boilerplate and complexity that other CMSs require, letting you focus on building your application instead of wrestling with your content management system.