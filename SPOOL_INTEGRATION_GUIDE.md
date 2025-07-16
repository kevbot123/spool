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
npm install @spool/nextjs

# 2. Run the setup command to create your API route
npx create-spool-route
```

This command automatically creates the file `app/api/spool/[...route]/route.ts` (or `pages/api/spool/[...route].ts` for Pages Router) for you.

---

## 2. Environment Variables

Next, add your Spool credentials to your local environment file (`.env.local`). You can find these keys in your Spool project settings.

```bash
# .env.local

SPOOL_API_KEY="your_spool_api_key"
SPOOL_SITE_ID="your_spool_site_id"
```

> **Note:** Be sure to copy the **entire** API key from your Spool dashboard, including the `spool_` prefix.

---

## 3. Core Concepts & API Helpers

The `@spool/nextjs` package provides simple helpers to fetch your content.

### Shared Configuration (Recommended)

To avoid repeating your API key and Site ID, create a shared config file.

**`lib/spool.ts`**
```typescript
import { SpoolConfig } from '@spool/nextjs/types';

export const spoolConfig: SpoolConfig = {
  apiKey: process.env.SPOOL_API_KEY!,
  siteId: process.env.SPOOL_SITE_ID!,
};
```

### Fetching a List of Content (`getSpoolContent`)

To get all items from a collection, call `getSpoolContent` with just the collection's slug.

```typescript
import { getSpoolContent } from '@spool/nextjs';
import { spoolConfig } from '@/lib/spool';

// Returns an array of all items in the 'blog' collection
const posts = await getSpoolContent(spoolConfig, 'blog');
```

### Fetching a Single Content Item (`getSpoolContent`)

To get a single item by its slug, provide the slug as the third argument.

```typescript
import { getSpoolContent } from '@spool/nextjs';
import { spoolConfig } from '@/lib/spool';

// Returns the single post with the matching slug
const post = await getSpoolContent(spoolConfig, 'blog', 'my-first-post');
```

### Fetching Collection Schemas (`getSpoolCollections`)

If you need the schema or metadata for your collections, use `getSpoolCollections`.

```typescript
import { getSpoolCollections } from '@spool/nextjs';
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

To make this seamless in Next.js you can import the helper exported by `@spool/nextjs`:

```ts
import { img } from '@spool/nextjs';

<Image src={img(item.headerImage, 'thumb')} width={160} height={90} />
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

## 5. Handling Markdown Content

Spool makes it easy to work with markdown. Whenever you have a field in your collection of type `markdown` (e.g., a field named `body`), you can request that Spool process it into HTML on the server.

1.  **Store the Raw Markdown**: The original markdown content is always preserved in the field you created (e.g., `post.data.body`).
2.  **Generate HTML On-Demand**: To receive the processed HTML, pass `{ renderHtml: true }` as the last argument to the `getSpoolContent` function. Spool will then add a new field to your data object with an `_html` suffix (e.g., `post.data.body_html`).

This means you only pay the performance cost of markdown processing when you actually need the HTML.

**Example:**

```typescript
// To get just the raw markdown (default behavior):
const postWithMarkdown = await getSpoolContent(spoolConfig, 'blog', 'my-post');
// postWithMarkdown.data.body_html will be undefined

// To get the processed HTML:
const postWithHtml = await getSpoolContent(spoolConfig, 'blog', 'my-post', { renderHtml: true });

// postWithHtml.data.body contains the raw markdown string
// postWithHtml.data.body_html contains the processed HTML string

// To render the content in React:
<div
  dangerouslySetInnerHTML={{ __html: postWithHtml.data.body_html }}
/>
```

---

## 6. Example: Building a Blog

Here is a complete example for creating a blog list and detail pages.

> **Important Setup Notes:**
> 1. **Dynamic Routes Required:** To enable individual post URLs like `/blog/your-post-slug` you **must** create a dynamic route folder `app/blog/[slug]` with its own `page.tsx`. Without this folder, Next.js will return a 404 even though the content exists in Spool.
> 2. **Add Content First:** Before testing your frontend, make sure to add some content in your Spool admin dashboard and fill in at least the `title` field. Empty titles will cause your blog listing to appear broken.

### Blog Listing Page

This page fetches all posts from the "blog" collection and displays them in a grid.

**`app/blog/page.tsx`**
```typescript
import { getSpoolContent } from '@spool/nextjs';
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
            {post.data.ogImage && (
              <img src={post.data.ogImage} alt={post.title} className="w-full h-48 object-cover" />
            )}
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-2">{post.title || 'Untitled'}</h2>
              <p className="text-gray-600 mb-4">{post.data.description}</p>
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
import { getSpoolContent, generateSpoolMetadata } from '@spool/nextjs';
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
  
  // 1. Fetch the single post using the slug from the URL, requesting HTML
  const post = await getSpoolContent(spoolConfig, 'blog', slug, { renderHtml: true });

  if (!post) {
    return notFound();
  }

  return (
    <article className="container mx-auto px-4 py-8">
      <h1 className="text-5xl font-extrabold mb-4">{post.title}</h1>
      <div className="text-gray-500 mb-8">
        Published on {new Date(post.published_at).toLocaleDateString()}
      </div>
      
      {post.data.ogImage && (
        <img src={post.data.ogImage} alt={post.title} className="w-full h-96 object-cover rounded-lg mb-8" />
      )}
      
      {/* 2. Render the auto-generated HTML */}
      {post.data.body_html && (
        <div
          className="prose lg:prose-xl max-w-none"
          dangerouslySetInnerHTML={{ __html: post.data.body_html }}
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
import { generateSpoolMetadata } from '@spool/nextjs';

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
import { getSpoolSitemap } from '@spool/nextjs';
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
import { getSpoolRobots } from '@spool/nextjs';
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
import { getSpoolContent } from '@spool/nextjs';

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

1.  **404 errors**: Make sure your dynamic route folder structure matches your URL pattern
2.  **Empty content**: Check that content is published (not draft) in the Spool admin
3.  **API errors**: Verify your `SPOOL_API_KEY` and `SPOOL_SITE_ID` are correct. If you receive a `401 Unauthorized` error, double-check that you are sending the *full* API key, including the `spool_` prefix.
4.  **Build errors**: Ensure all environment variables are set in your deployment environment

### Debug Mode

Add debug logging to see what's happening:

```typescript
const posts = await getSpoolContent(spoolConfig, 'blog');
console.log('Fetched posts:', posts.length);
```

---

This guide should provide a complete reference for using Spool as a headless CMS with Next.js. The setup process is now simplified to just 3 commands and works seamlessly with both App Router and Pages Router. 