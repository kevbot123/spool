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

This command automatically creates the file `app/api/spool/[...route]/route.ts` for you.

---

## 2. Environment Variables

Next, add your Spool credentials to your local environment file (`.env.local`). You can find these keys in your Spool project settings.

```bash
# .env.local

SPOOL_API_KEY="your_spool_api_key"
SPOOL_SITE_ID="your_spool_site_id"
```

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

## 4. Example: Building a Blog

Here is a complete example for creating a blog list and detail pages.

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
            {post.data.image && (
              <img src={post.data.image} alt={post.data.title} className="w-full h-48 object-cover" />
            )}
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-2">{post.data.title}</h2>
              <p className="text-gray-600 mb-4">{post.data.excerpt}</p>
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
import { getSpoolContent } from '@spool/nextjs';
import { spoolConfig } from '@/lib/spool';
import { SpoolSEO } from '@spool/nextjs';
import { notFound } from 'next/navigation';

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  // 1. Fetch the single post using the slug from the URL
  const post = await getSpoolContent(spoolConfig, 'blog', params.slug);

  if (!post) {
    return notFound();
  }

  return (
    <>
      {/* 2. Add automatic SEO meta tags */}
      <SpoolSEO content={post} collection="blog" path={`/blog/${params.slug}`} />

      <article className="container mx-auto px-4 py-8">
        <h1 className="text-5xl font-extrabold mb-4">{post.data.title}</h1>
        <div className="text-gray-500 mb-8">
          Published on {new Date(post.published_at).toLocaleDateString()}
        </div>
        
        {post.data.image && (
          <img src={post.data.image} alt={post.data.title} className="w-full h-96 object-cover rounded-lg mb-8" />
        )}
        
        {/* Render your markdown content here */}
        <div
          className="prose lg:prose-xl max-w-none"
          dangerouslySetInnerHTML={{ __html: post.data.body_html }}
        />
      </article>
    </>
  );
}

// Optional: Generate static paths for better performance
export async function generateStaticParams() {
  const posts = await getSpoolContent(spoolConfig, 'blog');
  return posts.map((post: any) => ({
    slug: post.slug,
  }));
}
```

This guide should provide a complete reference for using Spool as a headless CMS with Next.js. 