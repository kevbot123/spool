# Spool CMS: Next.js Integration Guide

This guide provides all the necessary steps and code examples to integrate Spool CMS into a Next.js application.

**Core Features:**
-   **Headless CMS:** Manage your content in the Spool admin dashboard.
-   **Real-time API:** Fetch content instantly in your Next.js app.
-   **Simple Setup:** Get started with a single CLI command.

---

## 1. Installation & Setup

First, install the Spool Next.js package and run the setup command from the root of your Next.js project.

```bash
# 1. Install the package
npm install @spoolcms/nextjs

# 2. Create your API route manually
```

Create the file `app/api/spool/[...route]/route.ts` (or `pages/api/spool/[...route].ts` for Pages Router):

**`app/api/spool/[...route]/route.ts`**
```typescript
import { createSpoolHandler } from '@spoolcms/nextjs';

export const { GET, POST, PUT, DELETE } = createSpoolHandler({
  apiKey: process.env.SPOOL_API_KEY!,
  siteId: process.env.SPOOL_SITE_ID!,
});
```

---

## 2. Environment Variables

Next, add your Spool credentials to your local environment file (`.env.local`). You can find these keys in your Spool project settings.

```bash
# .env.local

# Spool CMS credentials (required)
SPOOL_API_KEY="your_spool_api_key"
SPOOL_SITE_ID="your_spool_site_id"

# Your site URL (required for production) - used for SEO and metadata generation
NEXT_PUBLIC_SITE_URL="https://yoursite.com"
```

> **Important Notes:**
> - Be sure to copy the **entire** API key from your Spool dashboard, including the `spool_` prefix.
> - **`NEXT_PUBLIC_SITE_URL` is required** - used for SEO metadata generation and production deployments.
> - The package automatically connects to `spoolcms.com` - no additional URL configuration needed!
> - **CORS is handled automatically** - your localhost development and production deployments will work seamlessly without any additional configuration.

---

## 3. Core Concepts & API Helpers

The `@spoolcms/nextjs` package provides simple helpers to fetch your content.

### Shared Configuration (Recommended)

To avoid repeating your API key and Site ID, create a shared config file.

**`lib/spool.ts`**
```typescript
import { SpoolConfig } from '@spoolcms/nextjs/types';

export const spoolConfig: SpoolConfig = {
  apiKey: process.env.SPOOL_API_KEY!,
  siteId: process.env.SPOOL_SITE_ID!,
};
```

### Fetching a List of Content (`getSpoolContent`)

To get all items from a collection, call `getSpoolContent` with just the collection's slug.

```typescript
import { getSpoolContent } from '@spoolcms/nextjs';
import { spoolConfig } from '@/lib/spool';

// Returns an array of all items in the 'blog' collection
const posts = await getSpoolContent(spoolConfig, 'blog');
```

### Fetching a Single Content Item (`getSpoolContent`)

To get a single item by its slug, provide the slug as the third argument.

```typescript
import { getSpoolContent } from '@spoolcms/nextjs';
import { spoolConfig } from '@/lib/spool';

// Returns the single post with the matching slug
const post = await getSpoolContent(spoolConfig, 'blog', 'my-first-post');
```

## 🎯 Unified Field Access

Spool provides a unified way to access all fields on your content items. Whether it's a system field (like `title`, `slug`, `created_at`) or a custom field you defined in your collection schema (like `body`, `description`, `author`), you can access them all directly on the item:

```typescript
const post = await getSpoolContent(spoolConfig, 'blog', 'my-post');

// ✅ All fields accessible with the same pattern
console.log(post.title);       // System field
console.log(post.slug);        // System field  
console.log(post.created_at);  // System field
console.log(post.body);        // Custom field
console.log(post.description); // Custom field
console.log(post.author);      // Custom field
```

**Before (confusing):**
```typescript
// System fields
post.title
post.slug
post.created_at

// Custom fields - different pattern!
post.data.body
post.data.description  
post.data.author
```

**After (unified):**
```typescript
// All fields use the same pattern
post.title
post.slug
post.created_at
post.body
post.description
post.author
```

> **Backward Compatibility**: The old `post.data.field` pattern still works for existing code, but we recommend migrating to the unified approach for better developer experience.

### Fetching Collection Schemas (`getSpoolCollections`)

If you need the schema or metadata for your collections, use `getSpoolCollections`.

```typescript
import { getSpoolCollections } from '@spoolcms/nextjs';
import { spoolConfig } from '@/lib/spool';

// Returns an array of all collection objects (id, name, slug, schema)
const collections = await getSpoolCollections(spoolConfig);
```

---

## 4. Handling Images & Thumbnails

Spool automatically generates two extra sizes for every uploaded image:

| Label | Width | Format |
|-------|-------|--------|
| `thumb` | 160 px | webp |
| `small` | 480 px | webp |
| `original` | — | original mime |

Image fields now return **either** a plain URL string (legacy items) **or** an object:

```jsonc
{
  "original": "https://media…/foo.jpg",
  "thumb": "https://media…/foo_thumb.webp",
  "small": "https://media…/foo_small.webp"
}
```

To handle this in your components, create a simple helper function:

```typescript
// In your lib/spool.ts file
export function getSpoolImage(imageField: string | { original?: string; thumb?: string; small?: string } | undefined, size: 'thumb' | 'small' | 'original' = 'original'): string {
  if (!imageField) return '';
  
  if (typeof imageField === 'string') {
    return imageField;
  }
  
  if (typeof imageField === 'object') {
    return imageField[size] || imageField.original || '';
  }
  
  return '';
}

// Usage in your components:
<Image src={getSpoolImage(item.headerImage, 'thumb')} width={160} height={90} />
```

• Pass the image field value (string _or_ object) and the desired size (`'thumb' | 'small' | 'original'`).
• Falls back gracefully so existing content keeps working.

---

## 5. Default Fields in Every Collection

Every new collection you create in Spool automatically includes a set of foundational fields so you always have sensible SEO metadata and publication info without any extra configuration.

| **Field**        | **Location**  | **Type**                  | **Notes**                                                                |
|------------------|---------------|---------------------------|--------------------------------------------------------------------------|
| `description`    | `item.data`   | string                    | Optional short summary (used in lists & default meta description)        |
| `seoTitle`       | `item.data`   | string                    | Optional. Overrides `title` for search engines                           |
| `seoDescription` | `item.data`   | string                    | Optional. Overrides `description` for search engines                     |
| `ogTitle`        | `item.data`   | string                    | Optional. Title for social sharing (Open Graph)                          |
| `ogDescription`  | `item.data`   | string                    | Optional. Description for social sharing (Open Graph)                    |
| `ogImage`        | `item.data`   | image URL\*               | Optional. Social preview / hero image                                    |
| `title`          | top-level     | string                    | **Required.** Main headline for the item                                 |
| `slug`           | top-level     | string                    | **Required.** URL-friendly identifier set when creating the item         |
| `status`         | top-level     | `draft` \| `published`    | Defaults to `draft`. Controls visibility                                 |
| `published_at`   | top-level     | datetime                  | Automatic. Set the first time `status` becomes `published`               |
| `updated_at`     | top-level     | datetime                  | Automatic. Updated every time you modify the item                        |

\* `ogImage` is returned as a full URL string when you request content.

You can add any custom fields you like on top of these defaults.

---

## 5. Handling Markdown Content ✨

Spool makes working with markdown incredibly simple and React-friendly! When you have a markdown field in your collection (e.g., `body`), Spool automatically provides both HTML and raw markdown in a fully serializable format.

### Simple Markdown Fields

Markdown fields are now fully compatible with React's serialization requirements:

```typescript
const post = await getSpoolContent(spoolConfig, 'blog', 'my-post');

// ✅ Default behavior: HTML (perfect for rendering, fully serializable)
<div dangerouslySetInnerHTML={{ __html: post.body }} />

// ✅ Raw markdown access (when you need it)
const rawMarkdown = post.body_markdown;
```

### Before vs After

**Before (complex and caused React errors):**
```typescript
const post = await getSpoolContent(spoolConfig, 'blog', 'my-post', { renderHtml: true });

// ❌ This caused "Only plain objects can be passed to Client Components" errors
<div dangerouslySetInnerHTML={{ __html: post.body.html }} />

// Raw markdown access was confusing
const rawMarkdown = post.body.markdown;
```

**After (simple and React-compatible):**
```typescript
const post = await getSpoolContent(spoolConfig, 'blog', 'my-post');

// ✅ Just use the field directly - it's HTML and fully serializable!
<div dangerouslySetInnerHTML={{ __html: post.body }} />

// ✅ Raw markdown is easily accessible
const rawMarkdown = post.body_markdown;
```

### How It Works

1. **Markdown fields contain HTML by default** - ready for rendering
2. **Raw markdown is available** via the `_markdown` suffix (e.g., `body_markdown`)
3. **Fully serializable** - works perfectly with Next.js App Router and React Server Components
4. **No more complex objects** - just simple strings that work everywhere
```

---

## 6. Server Components (Recommended Approach)

**Spool CMS is optimized for Next.js App Router server components.** This provides the best performance, SEO, and developer experience.

### Server Components (Default and Recommended)

Use server components for all content fetching - this is the standard approach:

```typescript
// ✅ Recommended: Server component (default in App Router)
export default async function BlogPage() {
  const posts = await getSpoolContent(spoolConfig, 'blog');
  return (
    <div>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.description}</p>
        </article>
      ))}
    </div>
  );
}
```

**Benefits of Server Components:**
- ✅ **Better SEO** - Content is rendered on the server
- ✅ **Faster loading** - No client-side JavaScript needed for content
- ✅ **Automatic caching** - Next.js handles caching automatically
- ✅ **No CORS issues** - Server-to-server communication

### Client Components (Only When Needed)

Only use client components when you need browser-specific features like:
- User interactions (forms, buttons)
- Browser APIs (localStorage, geolocation)
- Real-time updates (WebSockets)

```typescript
'use client';

import { useState } from 'react';

// ✅ Client component for interactivity only
export default function BlogInteraction({ post }) {
  const [liked, setLiked] = useState(false);

  return (
    <button onClick={() => setLiked(!liked)}>
      {liked ? '❤️' : '🤍'} Like this post
    </button>
  );
}
```

> **💡 Best Practice:** Fetch content in server components and pass it as props to client components that need interactivity.

---

## 7. Example: Building a Blog

Here is a complete example for creating a blog list and detail pages.

> **Important Setup Notes:**
> 1. **Dynamic Routes Required:** To enable individual post URLs like `/blog/your-post-slug` you **must** create a dynamic route folder `app/blog/[slug]` with its own `page.tsx`. Without this folder, Next.js will return a 404 even though the content exists in Spool.
> 2. **Add Content First:** Before testing your frontend, make sure to add some content in your Spool admin dashboard and fill in at least the `title` field. Empty titles will cause your blog listing to appear broken.

### Blog Listing Page

This page fetches all posts from the "blog" collection and displays them in a grid.

**`app/blog/page.tsx`**
```typescript
import { getSpoolContent } from '@spoolcms/nextjs';
import { spoolConfig } from '@/lib/spool';
import Link from 'next/link';

export default async function BlogIndexPage() {
  // 1. Fetch all posts from the 'blog' collection
  const posts = await getSpoolContent(spoolConfig, 'blog');

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">From the Blog</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {posts.map((post: any) => (
          <Link href={`/blog/${post.slug}`} key={post.id} className="block border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
            {post.ogImage && (
              <img src={post.ogImage} alt={post.title} className="w-full h-48 object-cover" />
            )}
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-2">{post.title || 'Untitled'}</h2>
              <p className="text-gray-600 mb-4">{post.description}</p>
              <div className="text-sm text-gray-500">
                <span>{new Date(post.published_at).toLocaleDateString()}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

### Single Post Page

This page fetches a single post by its slug from the URL parameters.

**`app/blog/[slug]/page.tsx`**
```typescript
import { getSpoolContent, generateSpoolMetadata } from '@spoolcms/nextjs';
import { spoolConfig } from '@/lib/spool';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = params;
  
  // 1. Fetch the single post using the slug from the URL
  const post = await getSpoolContent(spoolConfig, 'blog', slug);

  if (!post) {
    return notFound();
  }

  return (
    <article className="container mx-auto px-4 py-8">
      <h1 className="text-5xl font-extrabold mb-4">{post.title}</h1>
      <div className="text-gray-500 mb-8">
        Published on {new Date(post.published_at).toLocaleDateString()}
      </div>
      
      {post.ogImage && (
        <img src={post.ogImage} alt={post.title} className="w-full h-96 object-cover rounded-lg mb-8" />
      )}
      
      {/* 2. Render the markdown as HTML - simple and React-compatible! */}
      {post.body && (
        <div
          className="prose lg:prose-xl max-w-none"
          dangerouslySetInnerHTML={{ __html: post.body }}
        />
      )}
    </article>
  );
}

// Optional: Generate static paths for better performance
export async function generateStaticParams() {
  const posts = await getSpoolContent(spoolConfig, 'blog');
  return posts.map((post: any) => ({
    slug: post.slug,
  }));
}

// Generate metadata for SEO (App Router)
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = params;
  const post = await getSpoolContent(spoolConfig, 'blog', slug);
  
  if (!post) {
    return {
      title: 'Post Not Found'
    };
  }
  
  return generateSpoolMetadata({
    content: post,
    collection: 'blog',
    path: `/blog/${slug}`,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  });
}
```

---

## 7. SEO and Metadata

### Automatic SEO with App Router

For Next.js App Router, use the `generateSpoolMetadata` helper:

```typescript
import { generateSpoolMetadata } from '@spoolcms/nextjs';

export async function generateMetadata({ params }: PageProps) {
  const post = await getSpoolContent(spoolConfig, 'blog', params.slug);
  
  return generateSpoolMetadata({
    content: post,
    collection: 'blog',
    path: `/blog/${params.slug}`,
    siteUrl: 'https://yoursite.com'
  });
}
```

### Sitemap Generation

**`app/sitemap.xml/route.ts`**
```typescript
import { getSpoolSitemap } from '@spoolcms/nextjs';
import { spoolConfig } from '@/lib/spool';

export async function GET() {
  const sitemap = await getSpoolSitemap(spoolConfig);
  
  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}
```

### Robots.txt Generation

**`app/robots.txt/route.ts`**
```typescript
import { getSpoolRobots } from '@spoolcms/nextjs';
import { spoolConfig } from '@/lib/spool';

export async function GET() {
  const robots = await getSpoolRobots(spoolConfig);
  
  return new Response(robots, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
```

---

## 8. Advanced Features

### Real-time Content Updates

When content is published in the Spool admin, your Next.js site automatically revalidates the affected pages using Next.js's `revalidatePath` function.

### Draft Content

By default, only published content is returned. To fetch draft content (for preview purposes), you can modify the API calls to include draft status.

### Error Handling

```typescript
import { getSpoolContent } from '@spoolcms/nextjs';

export default async function BlogPage() {
  try {
    const posts = await getSpoolContent(spoolConfig, 'blog');
    // Handle success
  } catch (error) {
    console.error('Failed to fetch posts:', error);
    // Handle error - show fallback UI
  }
}
```

---

## 9. Troubleshooting

### Common Issues

1.  **"Body is unusable" errors**: This usually happens when the helper can't connect to Spool CMS. The package automatically connects to `spoolcms.com` - ensure your internet connection is working and the service is available.

2.  **Empty content or connection errors**: 
    - Check that `SPOOL_API_KEY` and `SPOOL_SITE_ID` are correct
    - Ensure content is published (not draft) in the Spool admin
    - Verify that `spoolcms.com` is accessible from your deployment environment

3.  **404 errors**: Make sure your dynamic route folder structure matches your URL pattern

4.  **API authentication errors**: If you receive a `401 Unauthorized` error, double-check that you are sending the *full* API key, including the `spool_` prefix.

5.  **Build errors**: Ensure all environment variables are set in your deployment environment

### Debug Mode

Add debug logging to see what's happening:

```typescript
const posts = await getSpoolContent(spoolConfig, 'blog');
console.log('Fetched posts:', posts.length);
```

---

This guide should provide a complete reference for using Spool as a headless CMS with Next.js. The setup process is now simplified to just 3 commands and works seamlessly with both App Router and Pages Router. 