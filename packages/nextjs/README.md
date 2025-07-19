# @spoolcms/nextjs Integration Guide

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

To make this seamless in Next.js you can import the helper exported by `@spoolcms/nextjs`:

```tsx
import { img } from '@spoolcms/nextjs';

// Use thumbnail for fast loading in lists
<Image src={img(item.headerImage, 'thumb')} width={160} height={90} />

// Use small for medium-sized displays  
<Image src={img(item.headerImage, 'small')} width={480} height={270} />

// Use original for full-size displays
<Image src={img(item.headerImage, 'original')} width={1200} height={675} />
```

**Additional utilities:**

```tsx
import { getImageSizes, hasMultipleSizes } from '@spoolcms/nextjs';

// Get all available sizes
const sizes = getImageSizes(item.headerImage);
// Returns: { original: "...", thumb: "...", small: "..." } or null

// Check if image has multiple sizes (vs legacy single URL)
const hasMultiple = hasMultipleSizes(item.headerImage);
// Returns: true for new images, false for legacy single URLs
```

• Pass the image field value (string _or_ object) and the desired size (`'thumb' | 'small' | 'original'`).
• Falls back gracefully so existing content keeps working.
• The admin interface automatically uses thumbnails for fast table rendering.

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
| `ogImage`        | `item.data`   | image URL*               | Optional. Social preview / hero image                                    |
| `title`          | top-level     | string                    | **Required.** Main headline for the item                                 |
| `slug`           | top-level     | string                    | **Required.** URL-friendly identifier set when creating the item         |
| `status`         | top-level     | `draft` \| `published`    | Defaults to `draft`. Controls visibility                                 |
| `published_at`   | top-level     | datetime                  | Automatic. Set the first time `status` becomes `published`               |
| `updated_at`     | top-level     | datetime                  | Automatic. Updated every time you modify the item                        |

* `ogImage` is returned as a full URL string when you request content.

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
import { getSpoolContent } from '@spoolcms/nextjs';
``` 