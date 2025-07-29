# Spool CMS: Next.js Integration Guide

This guide provides all the necessary steps and code examples to integrate Spool CMS into a Next.js application.

**Core Features:**
-   **Headless CMS:** Manage your content in the Spool admin dashboard.
-   **Real-time API:** Fetch content instantly in your Next.js app.
-   **Simple Setup:** Get started in 5 minutes.

## Setup Guide

### 1. Install the package
```bash
npm install @spoolcms/nextjs@latest
```

> **New in v1.6.3:** Bulletproof localhost live updates! Fixed description field updates, publishing consistency, and deletion timing issues. All content changes now detected reliably.

### 2. Add environment variables
Add your Spool credentials to `.env.local`. You can find these keys in your Spool project settings.

```bash
# .env.local
SPOOL_API_KEY="your_spool_api_key"
SPOOL_SITE_ID="your_spool_site_id"
NEXT_PUBLIC_SITE_URL="https://yoursite.com"
```
> **Important:** Copy the **entire** API key including the `spool_` prefix.

### 3. Create API route
Create `app/api/spool/[...route]/route.ts` (or `pages/api/spool/[...route].ts` for Pages Router):

```typescript
import { createSpoolHandler } from '@spoolcms/nextjs';

export const { GET, POST, PUT, DELETE } = createSpoolHandler();
```

### 4. Create instant updates route
Create `app/api/webhooks/spool/route.ts` for real-time content updates:

```typescript
import { createSpoolWebhookHandler } from '@spoolcms/nextjs';
import { revalidatePath } from 'next/cache';

const handleWebhook = createSpoolWebhookHandler({
  secret: process.env.SPOOL_WEBHOOK_SECRET, // Optional but recommended for security
  
  // ✅ Development mode - enables live updates on localhost!
  developmentConfig: {
    apiKey: process.env.SPOOL_API_KEY!,
    siteId: process.env.SPOOL_SITE_ID!,
  },
  
  onWebhook: async (data, headers) => {
    console.log(`Processing ${data.event} for ${data.collection}${data.slug ? `/${data.slug}` : ''}`);
    
    // More targeted revalidation based on webhook payload
    switch (data.collection) {
      case 'blog':
        revalidatePath('/blog');
        if (data.slug) {
          revalidatePath(`/blog/${data.slug}`);
        }
        break;
      case 'pages':
        if (data.slug) {
          revalidatePath(`/${data.slug}`);
        }
        break;
      default:
        // Revalidate collection-specific paths
        revalidatePath(`/${data.collection}`);
        if (data.slug) {
          revalidatePath(`/${data.collection}/${data.slug}`);
        }
    }
    
    // Always revalidate these common paths
    revalidatePath('/');
    revalidatePath('/sitemap.xml');
  }
});

export const POST = handleWebhook;
```

**Alternative: Manual webhook processing for more control**

```typescript
import { 
  verifySpoolWebhook, 
  parseSpoolWebhook, 
  getSpoolWebhookHeaders 
} from '@spoolcms/nextjs';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  try {
    const payload = await request.text();
    const headers = getSpoolWebhookHeaders(request);
    const secret = process.env.SPOOL_WEBHOOK_SECRET;
    
    // Verify webhook signature for security
    if (secret && headers.signature) {
      const isValid = verifySpoolWebhook(payload, headers.signature, secret);
      if (!isValid) {
        console.error('Invalid webhook signature');
        return new Response('Unauthorized', { status: 401 });
      }
    }
    
    // Parse and validate payload
    const data = parseSpoolWebhook(payload);
    if (!data) {
      return new Response('Invalid payload', { status: 400 });
    }
    
    console.log(`Received webhook: ${data.event} for ${data.collection}${data.slug ? `/${data.slug}` : ''}`);
    
    // Your revalidation logic here...
    revalidatePath('/');
    
    return new Response('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Error processing webhook', { status: 500 });
  }
}
```

### 5. Configure webhook settings
1. Add your webhook URL (`https://yoursite.com/api/webhooks/spool`) in your Spool project settings under **Site Settings > Instant Updates**
2. Generate a webhook secret for security and add it to your environment variables:

```bash
# Add to .env.local
SPOOL_WEBHOOK_SECRET="your_generated_webhook_secret_from_spool_admin"
```

**Security Note:** The webhook secret ensures that only Spool can trigger your webhook endpoint. Always use webhook signature verification in production.

### Development Mode (Localhost Live Updates)

Spool automatically handles the localhost problem! When you add `developmentConfig` to your webhook handler, Spool enables intelligent polling during development:

**How it works:**
- ✅ **Production**: Uses real webhooks (fast, efficient)
- ✅ **Development**: Uses smart polling (every 2 seconds, only when content changes)
- ✅ **Zero configuration**: Just add your existing API credentials
- ✅ **Automatic detection**: Only runs in `NODE_ENV=development`

**Benefits:**
- No ngrok or tunnel setup required
- No manual refresh needed during development
- Same code works in both development and production
- Live updates work immediately on `localhost:3000`

```typescript
// ✅ This single configuration enables live updates everywhere
const handleWebhook = createSpoolWebhookHandler({
  secret: process.env.SPOOL_WEBHOOK_SECRET,
  developmentConfig: {
    apiKey: process.env.SPOOL_API_KEY!,    // Same as your existing setup
    siteId: process.env.SPOOL_SITE_ID!,    // Same as your existing setup
  },
  onWebhook: async (data) => {
    revalidatePath('/blog');
  }
});
```

**What you'll see:**
```bash
# In development console:
[DEV] Content change detected: blog/my-new-post (content.updated)
[dev-1643723456789] Processing webhook: content.updated for blog/my-new-post

# When slug changes:
[DEV] Slug change detected: blog/old-slug → new-slug
[dev-1643723456790] Processing webhook: content.updated for blog/old-slug
[dev-1643723456791] Processing webhook: content.updated for blog/new-slug

# When content is unpublished:
[DEV] Content change detected: blog/my-post (content.updated)

# When content is deleted:
[DEV] Content deletion detected: blog/deleted-post

# In production console:
[wh_1234567890] Processing webhook: content.updated for blog/my-new-post
```

**Types of changes detected:**
- ✅ **Any field changes** - title, body, custom fields, etc.
- ✅ **Publishing/unpublishing** - status changes
- ✅ **Slug changes** - revalidates both old and new URLs
- ✅ **Content deletion** - removes from lists immediately
- ✅ **New content** - appears in lists immediately

### Migration from Previous Versions

If you're upgrading from an earlier version, update your webhook endpoint to use the new secure utilities:

```bash
# Update to the latest version
npm install @spoolcms/nextjs@latest
```

**Before (v1.4.x and earlier):**
```typescript
export async function POST(request: Request) {
  const data = await request.json();
  revalidatePath('/');
  return new Response('OK');
}
```

**After (v1.5.0+):**
```typescript
import { createSpoolWebhookHandler } from '@spoolcms/nextjs';

export const POST = createSpoolWebhookHandler({
  secret: process.env.SPOOL_WEBHOOK_SECRET,
  onWebhook: async (data) => {
    revalidatePath('/');
  }
});
```

**That's it!** Your Next.js site is now connected to Spool CMS with real-time updates.

### Quick Test

Test your webhook integration:

```bash
# Test your webhook endpoint
npm run test:webhook

# Or test a specific URL
npm run test:webhook https://yoursite.com/api/webhooks/spool
```

This will verify your webhook endpoint is working correctly and help debug any issues.

---

## Webhook System Deep Dive

Spool's webhook system provides real-time updates to your Next.js application whenever content changes. Here's everything you need to know:

### Webhook Events

Spool sends webhooks for these content events:

| Event | Description | When it's triggered |
|-------|-------------|-------------------|
| `content.created` | New content item created | When you create and save a new item |
| `content.updated` | Existing content modified | When you edit and save an existing item |
| `content.published` | Content status changed to published | When you publish a draft item |
| `content.deleted` | Content item removed | When you delete an item |

### Webhook Payload Structure

Every webhook request includes this JSON payload:

```json
{
  "event": "content.updated",
  "site_id": "your-site-id",
  "collection": "blog",
  "slug": "my-blog-post",
  "item_id": "uuid-of-the-item",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Webhook Headers

Spool includes these headers with every webhook request:

```
Content-Type: application/json
User-Agent: Spool-CMS-Webhook/1.0
X-Spool-Delivery: unique-delivery-id
X-Spool-Event: content.updated
X-Spool-Signature-256: sha256=signature-hash (if secret is configured)
```

### Advanced Webhook Implementation

Here's a more sophisticated webhook handler with logging and error handling:

```typescript
// app/api/webhooks/spool/route.ts
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.SPOOL_WEBHOOK_SECRET;

interface WebhookPayload {
  event: 'content.created' | 'content.updated' | 'content.published' | 'content.deleted';
  site_id: string;
  collection: string;
  slug?: string;
  item_id: string;
  timestamp: string;
}

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  if (!secret) return true;
  
  try {
    const expectedSignature = `sha256=${crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex')}`;
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

export async function POST(request: Request) {
  const startTime = Date.now();
  const headersList = headers();
  const deliveryId = headersList.get('x-spool-delivery');
  
  try {
    const payload = await request.text();
    const signature = headersList.get('x-spool-signature-256');
    
    // Verify webhook signature
    if (WEBHOOK_SECRET && signature) {
      const isValid = verifyWebhookSignature(payload, signature, WEBHOOK_SECRET);
      if (!isValid) {
        console.error(`[${deliveryId}] Invalid webhook signature`);
        return new Response('Unauthorized', { status: 401 });
      }
    }
    
    const data: WebhookPayload = JSON.parse(payload);
    const { event, collection, slug, item_id } = data;
    
    console.log(`[${deliveryId}] Processing webhook: ${event} for ${collection}${slug ? `/${slug}` : ''} (${item_id})`);
    
    // Collection-specific revalidation logic
    const pathsToRevalidate: string[] = [];
    
    switch (collection) {
      case 'blog':
        pathsToRevalidate.push('/blog');
        if (slug) pathsToRevalidate.push(`/blog/${slug}`);
        break;
        
      case 'pages':
        if (slug) pathsToRevalidate.push(`/${slug}`);
        break;
        
      case 'products':
        pathsToRevalidate.push('/products');
        if (slug) pathsToRevalidate.push(`/products/${slug}`);
        break;
        
      default:
        // Generic collection handling
        pathsToRevalidate.push(`/${collection}`);
        if (slug) pathsToRevalidate.push(`/${collection}/${slug}`);
    }
    
    // Always revalidate these paths
    pathsToRevalidate.push('/', '/sitemap.xml');
    
    // Revalidate all paths
    for (const path of pathsToRevalidate) {
      revalidatePath(path);
      console.log(`[${deliveryId}] Revalidated: ${path}`);
    }
    
    const duration = Date.now() - startTime;
    console.log(`[${deliveryId}] Webhook processed successfully in ${duration}ms`);
    
    return new Response('OK', {
      headers: {
        'X-Spool-Processed': 'true',
        'X-Processing-Time': `${duration}ms`
      }
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${deliveryId}] Webhook error after ${duration}ms:`, error);
    
    return new Response('Error processing webhook', { 
      status: 500,
      headers: {
        'X-Spool-Error': 'true',
        'X-Processing-Time': `${duration}ms`
      }
    });
  }
}
```

### Webhook Security Best Practices

1. **Always verify webhook signatures** in production:
   ```typescript
   if (!verifyWebhookSignature(payload, signature, WEBHOOK_SECRET)) {
     return new Response('Unauthorized', { status: 401 });
   }
   ```

2. **Use environment variables** for secrets:
   ```bash
   SPOOL_WEBHOOK_SECRET="your-secret-from-spool-admin"
   ```

3. **Implement proper error handling** and logging for debugging

4. **Return appropriate HTTP status codes**:
   - `200 OK` - Webhook processed successfully
   - `401 Unauthorized` - Invalid signature
   - `500 Internal Server Error` - Processing error

### Testing Webhooks

You can test your webhook endpoint using the test button in Spool admin settings, or manually with curl:

```bash
# Test without signature (if no secret configured)
curl -X POST https://yoursite.com/api/webhooks/spool \
  -H "Content-Type: application/json" \
  -H "X-Spool-Delivery: test-delivery-123" \
  -H "X-Spool-Event: content.updated" \
  -d '{
    "event": "content.updated",
    "site_id": "your-site-id",
    "collection": "blog",
    "slug": "test-post",
    "item_id": "test-item-id",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }'
```

### Webhook Monitoring

Spool provides webhook delivery monitoring in the admin dashboard:

1. Go to **Admin > Webhook Deliveries** to see all webhook attempts
2. View delivery status (success/failed), response codes, and error messages
3. Debug failed deliveries with detailed error information
4. Monitor webhook performance and reliability

### Troubleshooting Webhooks

**Common Issues:**

1. **405 Method Not Allowed**: Your webhook endpoint doesn't exist or doesn't handle POST requests
2. **401 Unauthorized**: Webhook signature verification failed - check your secret
3. **500 Internal Server Error**: Error in your webhook processing code
4. **Timeout**: Your webhook takes too long to respond (>10 seconds)

**Debug Steps:**

1. Check your webhook URL is correct and accessible
2. Verify your webhook secret matches what's in Spool admin
3. Check your server logs for error details
4. Use the webhook test button in Spool admin settings
5. Monitor webhook deliveries in the admin dashboard

---

## Example: Building a Blog

Here is a complete example for creating a blog list and detail pages.

> **Important Setup Notes:**
> 1. **Dynamic Routes Required:** To enable individual post URLs like `/blog/your-post-slug` you **must** create a dynamic route folder `app/blog/[slug]` with its own `page.tsx`. Without this folder, Next.js will return a 404 even though the content exists in Spool.
> 2. **Add Content First:** Before testing your frontend, make sure to add some content in your Spool admin dashboard and fill in at least the `title` field. Empty titles will cause your blog listing to appear broken.

### Blog Listing Page

This page fetches all posts from the "blog" collection and displays them in a grid.

**`app/blog/page.tsx`**
```typescript
import { getSpoolContent, SpoolContent } from '@spoolcms/nextjs';
import Link from 'next/link';

export default async function BlogIndexPage() {
  // 1. Fetch all posts from the 'blog' collection - automatically typed as SpoolContent[]
  const posts = await getSpoolContent({ collection: 'blog' });

  return (
    <div>
      <h1>The Blog</h1>
      <div>
        {posts.map((post) => (
          <Link href={`/blog/${post.slug}`} key={post.id}>
            <article>
              <img src={post.ogImage} alt={post.title} />
              <div>
                <h2>{post.title}</h2>
                <p>{post.description}</p>
                <div>{new Date(post.published_at).toLocaleDateString()}</div>
              </div>
            </article>
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
import { getSpoolContent, generateSpoolMetadata, getSpoolStaticParams, SpoolContent } from '@spoolcms/nextjs';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = params;
  
  // Fetch the single post using the slug from the URL - automatically typed as SpoolContent
  const post = await getSpoolContent({ collection: 'blog', slug });

  if (!post) {
    return notFound();
  }

  return (
    <article>
      <h1>{post.title}</h1>
      <div>
        Published {new Date(post.published_at).toLocaleDateString()}
      </div>
      
      <img src={post.ogImage} alt={post.title} />
      
      {/* Markdown fields can be rendered as HTML automatically - simple and React-compatible! */}
      <div dangerouslySetInnerHTML={{ __html: post.body }} />
    </article>
  );
}

// Generate static paths (recommended for better SEO and performance)
export async function generateStaticParams() {
  return await getSpoolStaticParams({ collection: 'blog' }); // ONE LINE
}

// Generate metadata for SEO (App Router) - ONE LINE!
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const post = await getSpoolContent({ collection: 'blog', slug: params.slug });
  return generateSpoolMetadata(post); // Auto-detects everything from Next.js context
}
```

### Automatic SEO with App Router

For Next.js App Router, use the `generateSpoolMetadata` helper (shown in the example above) - it's just one line:

```typescript
import { generateSpoolMetadata } from '@spoolcms/nextjs';

export async function generateMetadata({ params }: PageProps) {
  const post = await getSpoolContent({ collection: 'blog', slug: params.slug });
  return generateSpoolMetadata(post); // Auto-detects path, site URL, everything!
}
```

**What it auto-detects:**
- ✅ **Site URL** - from `NEXT_PUBLIC_SITE_URL` or Next.js config
- ✅ **Current path** - from Next.js routing context  
- ✅ **Collection name** - from the content metadata
- ✅ **All SEO fields** - title, description, Open Graph, Twitter cards

### Sitemap Generation

Use Next.js's native sitemap system to include Spool content alongside static pages.

**`app/sitemap.ts`** (Next.js App Router)
```typescript
import { generateSpoolSitemap } from '@spoolcms/nextjs';

export default async function sitemap() {
  return await generateSpoolSitemap({
    collections: ['blog', 'pages'], // Which collections to include
    staticPages: [
      { url: '/', priority: 1.0 },
      { url: '/about', priority: 0.8 }
    ]
  });
}
```

**That's it!** Auto-generates URLs, handles `lastModified` dates, sets appropriate priorities.

---

## TypeScript Support

Spool provides comprehensive TypeScript support with proper type definitions for all content and functions.

### Automatic Type Safety

```typescript
import { getSpoolContent, SpoolContent } from '@spoolcms/nextjs';

// ✅ Automatically typed as SpoolContent[] - only published content by default!
const posts = await getSpoolContent({ collection: 'blog' });

// ✅ Full autocomplete and type safety - published_at is guaranteed to exist
posts[0].title;        // string
posts[0].body;         // string | undefined
posts[0].author;       // string | undefined
posts[0].tags;         // string[] | undefined
posts[0].ogImage;      // string | ImageObject | undefined
posts[0].published_at; // string (always present - no undefined check needed!)
posts[0].status;       // 'published' (always published)

// ✅ Use published_at directly - no type guards needed!
const publishDate = new Date(posts[0].published_at);
console.log(`Published on ${publishDate.toLocaleDateString()}`);
```

### Default Behavior: Published Content Only

By default, `getSpoolContent` only returns published content, which means:

```typescript
// ✅ Default behavior - only published content
const posts = await getSpoolContent({ collection: 'blog' });

// TypeScript knows these are all published posts
posts[0].status;       // 'published' (always)
posts[0].published_at; // string (guaranteed to exist)

// No type guards needed - use published_at directly!
posts.forEach(post => {
  console.log(`Published: ${new Date(post.published_at).toLocaleDateString()}`);
});
```

### Including Draft Content

When you need draft content (e.g., in admin interfaces), use `includeDrafts: true`:

```typescript
import { getSpoolContent, SpoolContentWithDrafts, isPublishedContent } from '@spoolcms/nextjs';

// ✅ Include both draft and published content
const allPosts = await getSpoolContent<SpoolContentWithDrafts[]>({ 
  collection: 'blog', 
  includeDrafts: true 
});

// Now you need type guards since drafts are included
allPosts.forEach(post => {
  if (isPublishedContent(post)) {
    console.log(`Published: ${new Date(post.published_at).toLocaleDateString()}`);
  } else {
    console.log(`Draft: ${post.title}`);
  }
});
```

### Custom Content Types

Create your own interfaces for collection-specific fields:

```typescript
interface Product extends SpoolContent {
  price: number;
  category: string;
  inStock: boolean;
  images: string[];
}

const products = await getSpoolContent<Product[]>({ collection: 'products' });

// Type-safe access to custom fields
products[0].price;        // number
products[0].category;     // string
products[0].inStock;      // boolean
products[0].published_at; // string (guaranteed - no type guard needed!)

// Use published_at directly since only published content is returned
const publishDate = new Date(products[0].published_at);
```

### Built-in Specialized Types

- `SpoolContent` - Published content only (default) - `published_at` guaranteed
- `SpoolContentWithDrafts` - Union type including both draft and published content
- `SpoolDraftContent` - Draft content (published_at is undefined)
- `SpoolPublishedContent` - Published content (published_at guaranteed)
- `BlogPost` - Blog-specific interface with body, author, tags
- `Page` - Page-specific interface with body and template
- `ImageObject` - Image object with original, thumb, small sizes
- `SpoolMetadata` - Complete SEO metadata structure
- `isPublishedContent()` - Type guard for published content (when using `includeDrafts: true`)
- `isDraftContent()` - Type guard for draft content (when using `includeDrafts: true`)

---

## Unified Field Access

Spool provides a unified way to access all fields on your content items. Whether it's a system field (like `title`, `slug`, `created_at`) or a custom field you defined in your collection schema (like `body`, `description`, `author`), you can access them all directly on the item:

```typescript
const post = await getSpoolContent({ collection: 'blog', slug: 'my-post' });

// ✅ All fields accessible with the same pattern
console.log(post.title);       // System field
console.log(post.slug);        // System field  
console.log(post.created_at);  // System field
console.log(post.body);        // Custom field
console.log(post.description); // Custom field
console.log(post.author);      // Custom field
```

No need to remember different patterns for different field types - everything is accessible directly on the content item.

### Fetching Collection Schemas (`getSpoolCollections`)

If you need the schema or metadata for your collections, use `getSpoolCollections`.

```typescript
import { getSpoolCollections } from '@spoolcms/nextjs';

// Returns an array of all collection objects (id, name, slug, schema)
const collections = await getSpoolCollections();
```

---

## Handling Images & Thumbnails

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

Use the built-in `img()` helper to easily access different image sizes:

```typescript
import { img } from '@spoolcms/nextjs';

// Usage in your components:
<Image src={img(item.headerImage)} width={1200} height={675} />           // original (default)
<Image src={img(item.headerImage, 'small')} width={480} height={270} />   // 480px optimized
<Image src={img(item.headerImage, 'thumb')} width={160} height={90} />    // 160px thumbnail
```

• Pass the image field value (string _or_ object) and the desired size (`'thumb' | 'small' | 'original'`).
• Falls back gracefully so existing content keeps working.

---

## Default Fields in Every Collection

Every new collection you create in Spool automatically includes a set of foundational fields so you always have sensible SEO metadata and publication info without any extra configuration.

| **Field**        | **Type**                  | **Notes**                                                                |
|------------------|---------------------------|--------------------------------------------------------------------------|
| `title`          | string                    | **Required.** Main headline for the item                                 |
| `slug`           | string                    | **Required.** URL-friendly identifier set when creating the item         |
| `description`    | string                    | Optional short summary (used in lists & default meta description)        |
| `seoTitle`       | string                    | Optional. Overrides `title` for search engines                           |
| `seoDescription` | string                    | Optional. Overrides `description` for search engines                     |
| `ogTitle`        | string                    | Optional. Title for social sharing (Open Graph)                          |
| `ogDescription`  | string                    | Optional. Description for social sharing (Open Graph)                    |
| `ogImage`        | image URL\*               | Optional. Social preview / hero image                                    |
| `status`         | `draft` \| `published`    | Defaults to `draft`. Controls visibility                                 |
| `published_at`   | datetime                  | Automatic. Set the first time `status` becomes `published`               |
| `updated_at`     | datetime                  | Automatic. Updated every time you modify the item                        |

\* `ogImage` is returned as a full URL string when you request content.

You can add any custom fields you like on top of these defaults.

---

## Handling Markdown Content ✨

Spool makes working with markdown incredibly simple and React-friendly! When you have a markdown field in your collection (e.g., `body`), Spool automatically provides both HTML and raw markdown in a fully serializable format.

### Simple Markdown Fields

Markdown fields are fully compatible with React's serialization requirements:

```typescript
const post = await getSpoolContent({ collection: 'blog', slug: 'my-post' });

// ✅ Default behavior: HTML (perfect for rendering, fully serializable)
<div dangerouslySetInnerHTML={{ __html: post.body }} />

// ✅ Raw markdown access (when you need it)
const rawMarkdown = post.body_markdown;
```

### How It Works

1. **Markdown fields contain HTML by default** - ready for rendering
2. **Raw markdown is available** via the `_markdown` suffix (e.g., `body_markdown`)
3. **Fully serializable** - works perfectly with Next.js App Router and React Server Components
4. **Simple strings** - no complex objects to deal with

---

## Server Components (Recommended Approach)

**Spool CMS is optimized for Next.js App Router server components.** This provides the best performance, SEO, and developer experience.

### Server Components (Default and Recommended)

Use server components for all content fetching - this is the standard approach:

```typescript
// ✅ Recommended: Server component (default in App Router)
export default async function BlogPage() {
  const posts = await getSpoolContent({ collection: 'blog' });
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

## Advanced Features

### Draft Content

By default, only published content is returned. To fetch draft content (for preview purposes), you can modify the API calls to include draft status.

### Error Handling

```typescript
import { getSpoolContent } from '@spoolcms/nextjs';

export default async function BlogPage() {
  try {
    const posts = await getSpoolContent({ collection: 'blog' });
    // Handle success
  } catch (error) {
    console.error('Failed to fetch posts:', error);
    // Handle error - show fallback UI
  }
}
```



---

## Troubleshooting

### Common Issues

1.  **"Body is unusable" errors**: This usually happens when the helper can't connect to Spool CMS. The package automatically connects to `spoolcms.com` - ensure your internet connection is working and the service is available.

2.  **Empty content or connection errors**: 
    - Check that `SPOOL_API_KEY` and `SPOOL_SITE_ID` are correct
    - Ensure content is published (not draft) in the Spool admin
    - Verify that `spoolcms.com` is accessible from your deployment environment

3.  **SEO metadata showing "Untitled"**: Make sure your content has a `title` field set in the Spool admin dashboard.

4.  **404 errors**: Make sure your dynamic route folder structure matches your URL pattern

5.  **API authentication errors**: If you receive a `401 Unauthorized` error, double-check that you are sending the *full* API key, including the `spool_` prefix.

6.  **Build errors**: Ensure all environment variables are set in your deployment environment

### Debug Mode

Add debug logging to see what's happening:

```typescript
const posts = await getSpoolContent({ collection: 'blog' });
console.log('Fetched posts:', posts.length);
```

---

This guide should provide a complete reference for using Spool as a headless CMS with Next.js. The setup process is now simplified to just 5 steps and works seamlessly with both App Router and Pages Router.