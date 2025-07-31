# Spool CMS: Next.js Integration Guide

This guide provides all the necessary steps and code examples to integrate Spool CMS into a Next.js application.

**Core Features:**
-   **Headless CMS:** Manage your content in the Spool admin dashboard.
-   **Real-time API:** Fetch content instantly in your Next.js app.
-   **Simple Setup:** Get started in 5 minutes.

## New in v2.1.0 🚀

- **🔥 CONVEX LIVE UPDATES**: Revolutionary real-time updates using Convex for 55% cost savings and zero configuration
- **⚡ INSTANT FEEDBACK**: Content changes appear immediately with automatic revalidation
- **🌟 WORKS EVERYWHERE**: Development, production, edge functions - no environment-specific setup needed
- **🔧 ZERO CONFIGURATION**: Just use a React hook - no webhook endpoints, no API routes, no complex setup
- **📡 ENTERPRISE-GRADE**: Built on Convex's managed real-time infrastructure with automatic scaling
- **🎯 SMART REVALIDATION**: Automatically revalidates only the paths that changed
- **☁️ SERVERLESS NATIVE**: Perfect for Vercel, Netlify, and all serverless platforms
- **💰 COST EFFECTIVE**: 55% cheaper than traditional approaches at scale

> **🚀 REVOLUTIONARY: v2.1.0 Uses Convex**: Real-time updates are now powered by Convex, providing a much simpler developer experience and significant cost savings. Just wrap your app with a provider and use a hook - no webhook setup required!

## Prerequisites

### 1. Install the package
```bash
npm install @spoolcms/nextjs@2.1.0
```

> **Latest v2.1.0:** CONVEX LIVE UPDATES! Revolutionary real-time updates with 55% cost savings and zero configuration. Just use a React hook - no webhook endpoints needed!

### 2. Add environment variables
Add your Spool credentials to `.env.local`. You can find these keys in your Spool project settings.

```bash
# .env.local
SPOOL_API_KEY="your_spool_api_key"
SPOOL_SITE_ID="your_spool_site_id"
NEXT_PUBLIC_SITE_URL="https://yoursite.com"

# For live updates (v2.1.0+)
NEXT_PUBLIC_SPOOL_API_KEY="your_spool_api_key"
NEXT_PUBLIC_SPOOL_SITE_ID="your_spool_site_id"
NEXT_PUBLIC_SPOOL_CONVEX_URL="https://your-deployment.convex.cloud"
```
> **Important:** Copy the **entire** API key including the `spool_` prefix.

> **New in v2.1.0:** Live updates now use Convex for better performance and cost savings. The public environment variables are safe to expose as they're protected by Convex's built-in authentication.

### 3. Create API route
Create `app/api/spool/[...route]/route.ts` (or `pages/api/spool/[...route].ts` for Pages Router):

```typescript
import { createSpoolHandler } from '@spoolcms/nextjs';

export const { GET, POST, PUT, DELETE } = createSpoolHandler();
```

### 4. Set up live updates (v2.1.0+)
Wrap your app with the live updates provider in `app/layout.tsx`:

```typescript
import { SpoolLiveUpdatesProvider } from '@spoolcms/nextjs';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SpoolLiveUpdatesProvider>
          {children}
        </SpoolLiveUpdatesProvider>
      </body>
    </html>
  );
}
```

### 5. Use live updates in your components
Add the live updates hook to any component that needs real-time updates:

```typescript
'use client';

import { useSpoolLiveUpdates } from '@spoolcms/nextjs';

export default function LiveUpdateStatus() {
  const { isConnected, latestUpdate } = useSpoolLiveUpdates({
    apiKey: process.env.NEXT_PUBLIC_SPOOL_API_KEY!,
    siteId: process.env.NEXT_PUBLIC_SPOOL_SITE_ID!,
    onUpdate: (update) => {
      console.log('Content updated:', update);
      // Automatic revalidation happens behind the scenes
    }
  });

  return (
    <div>
      <p>Live Updates: {isConnected ? '✅ Connected' : '❌ Disconnected'}</p>
      {latestUpdate && (
        <p>Latest: {latestUpdate.collection}/{latestUpdate.slug}</p>
      )}
    </div>
  );
}
```

**How It Works:**
1. Content changes in Spool CMS → Convex receives update
2. Your app automatically receives the update via WebSocket
3. Automatic revalidation happens for affected paths
4. **ZERO CONFIGURATION** - works in development and production!

**Advanced: Custom webhook processing (v1.6.33+)**

If you need custom logic beyond automatic revalidation, you can still use manual webhook processing. However, you should rely on the `/api/revalidate` route for actual revalidation:

```typescript
import { 
  verifySpoolWebhook, 
  parseSpoolWebhook, 
  getSpoolWebhookHeaders 
} from '@spoolcms/nextjs';

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
    
    // Your custom logic here (analytics, notifications, etc.)...
    
    // For revalidation, use HTTP request to avoid render phase issues
    setTimeout(async () => {
      try {
        await fetch('http://localhost:3000/api/revalidate?path=/', { method: 'POST' });
        console.log('Revalidation triggered');
      } catch (err) {
        console.error('Revalidation failed:', err);
      }
    }, 0);
    
    return new Response('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Error processing webhook', { status: 500 });
  }
}
```

### 6. Optional: Set up webhooks for production
While live updates work automatically, you may still want webhooks for production deployments or server-side processing:

```typescript
// app/api/webhooks/spool/route.ts (optional)
import { createSpoolWebhookHandler } from '@spoolcms/nextjs';

const handleWebhook = createSpoolWebhookHandler({
  secret: process.env.SPOOL_WEBHOOK_SECRET, // Optional but recommended for security
  onWebhook: async (data) => {
    // Custom server-side processing
    console.log(`Webhook: ${data.event} for ${data.collection}/${data.slug}`);
  }
});

export const POST = handleWebhook;
```

Add your webhook URL in Spool admin settings if you need server-side processing.

### Live Updates with Convex (v2.1.0+)

Spool now uses **Convex** for revolutionary real-time updates! This provides a much simpler developer experience with significant cost savings.

**How it works:**
- ✅ **All environments**: Uses Convex real-time subscriptions (works everywhere)
- ✅ **Zero configuration**: Just wrap your app and use a hook
- ✅ **Automatic detection**: Works in development and production
- ✅ **Cost effective**: 55% cheaper than traditional approaches at scale

**Benefits:**
- **Instant updates** - content changes appear immediately
- **Works everywhere** - development, production, edge functions, mobile apps
- **Zero setup** - no webhook endpoints, no API routes, no complex configuration
- **Serverless native** - perfect for Vercel, Netlify, and all serverless platforms
- **TypeScript first** - automatic type safety and IntelliSense

```typescript
// ✅ Simple setup - just use the hook
'use client';

import { useSpoolLiveUpdates } from '@spoolcms/nextjs';

export default function MyComponent() {
  const { isConnected, updates, latestUpdate } = useSpoolLiveUpdates({
    apiKey: process.env.NEXT_PUBLIC_SPOOL_API_KEY!,
    siteId: process.env.NEXT_PUBLIC_SPOOL_SITE_ID!,
    onUpdate: (update) => {
      console.log('Content updated:', update);
      // Automatic revalidation happens
    }
  });

  return (
    <div>
      <p>Status: {isConnected ? '✅ Connected' : '❌ Disconnected'}</p>
      {latestUpdate && (
        <p>Latest: {latestUpdate.collection}/{latestUpdate.slug}</p>
      )}
    </div>
  );
}
```

**What you'll see:**
```bash
# In your browser console:
[DEV] ✅ Connected to Spool Realtime for site: your-site-id
[DEV] 🔄 Live update: blog/my-new-post
[DEV] ✅ Revalidated: /blog/my-new-post

# When content is published:
[DEV] 🔄 Live update: blog/my-post
[DEV] ✅ Revalidated: /blog
[DEV] ✅ Revalidated: /blog/my-post

# When content is deleted:
[DEV] 🔄 Live update: blog/deleted-post
[DEV] ✅ Revalidated: /blog
```

**Types of changes detected:**
- ✅ **Any field changes** - title, body, description, custom fields, etc.
- ✅ **Publishing/unpublishing** - status changes trigger appropriate events
- ✅ **Slug changes** - revalidates both old and new URLs automatically
- ✅ **Content deletion** - removes from lists immediately
- ✅ **New content** - appears in lists immediately
- ✅ **Draft changes** - detects changes to draft content on published items

**Troubleshooting Live Updates:**

If live updates aren't working:

1. **Check your environment variables:**
   ```bash
   # Make sure these are set in .env.local
   NEXT_PUBLIC_SPOOL_API_KEY="spool_your_api_key_here"
   NEXT_PUBLIC_SPOOL_SITE_ID="your_site_id_here"
   NEXT_PUBLIC_SPOOL_CONVEX_URL="https://your-deployment.convex.cloud"
   ```

2. **Verify the provider is set up:**
   ```typescript
   // Make sure SpoolLiveUpdatesProvider wraps your app
   <SpoolLiveUpdatesProvider>
     <Component {...pageProps} />
   </SpoolLiveUpdatesProvider>
   ```

3. **Check browser console for errors:**
   ```bash
   # You should see connection messages:
   [DEV] ✅ Connected to Spool Realtime for site: your-site-id
   
   # If you see errors:
   # - Invalid API key or site ID
   # - Convex URL not set correctly
   # - Network connectivity issues
   ```

### Migration from Previous Versions

If you're upgrading from an earlier version:

```bash
# Update to the latest version
npm install @spoolcms/nextjs@2.1.0
```

**Before (v2.0.x and earlier) - Webhook-based approach:**
```typescript
// Complex webhook setup with multiple files
import { createSpoolWebhookHandler } from '@spoolcms/nextjs';

export const POST = createSpoolWebhookHandler({
  secret: process.env.SPOOL_WEBHOOK_SECRET,
  onWebhook: async (data) => {
    // Manual revalidation logic
  }
});

// Plus: app/api/revalidate/route.ts needed
```

**After (v2.1.0+) - Simple hook approach:**
```typescript
// 1. Wrap your app (one time setup)
import { SpoolLiveUpdatesProvider } from '@spoolcms/nextjs';

<SpoolLiveUpdatesProvider>
  <Component {...pageProps} />
</SpoolLiveUpdatesProvider>

// 2. Use the hook anywhere
'use client';
import { useSpoolLiveUpdates } from '@spoolcms/nextjs';

const { isConnected } = useSpoolLiveUpdates({
  apiKey: process.env.NEXT_PUBLIC_SPOOL_API_KEY!,
  siteId: process.env.NEXT_PUBLIC_SPOOL_SITE_ID!,
});
```

**What to Remove:**
- Webhook route files (`app/api/webhooks/spool/route.ts`)
- Revalidation route files (`app/api/revalidate/route.ts`)
- Complex webhook configuration
- Development vs production setup differences

**What to Add:**
- `SpoolLiveUpdatesProvider` wrapper
- `useSpoolLiveUpdates` hook where needed
- Public environment variables for Convex

**Benefits of Migration:**
- ✅ **55% cost savings** at scale
- ✅ **Zero configuration** - works everywhere
- ✅ **Better developer experience** - just use a React hook
- ✅ **TypeScript first** - automatic type safety

**That's it!** Your Next.js site now has much simpler and more cost-effective real-time updates.

## ✅ Setup Checklist

Before testing live updates, ensure you have:

- [ ] **Installed the package**: `npm install @spoolcms/nextjs@2.1.0` (or `@latest`)
- [ ] **Set environment variables** in `.env.local`:
  - `SPOOL_API_KEY="spool_your_api_key_here"`
  - `SPOOL_SITE_ID="your_site_id_here"`
  - `NEXT_PUBLIC_SPOOL_API_KEY="spool_your_api_key_here"`
  - `NEXT_PUBLIC_SPOOL_SITE_ID="your_site_id_here"`
  - `NEXT_PUBLIC_SPOOL_CONVEX_URL="https://your-deployment.convex.cloud"`
- [ ] **Created API route**: `app/api/spool/[...route]/route.ts`
- [ ] **Added provider**: `SpoolLiveUpdatesProvider` wrapping your app
- [ ] **Used the hook**: `useSpoolLiveUpdates` in components that need real-time updates

**🧪 Test your setup**: Check browser console for connection messages

### Quick Test

Test your live updates setup by checking the browser console:

1. **Start your development server**: `npm run dev`
2. **Open browser console** and look for connection messages
3. **Make a content change** in Spool admin
4. **Watch for live update messages** in the console

You should see:
```bash
[DEV] ✅ Connected to Spool Realtime for site: your-site-id
[DEV] 🔄 Live update: blog/my-post
[DEV] ✅ Revalidated: /blog/my-post
```

### Troubleshooting Live Updates

**Live updates not working?** Here's how to debug:

1. **Check browser console** - Look for connection and error messages
2. **Verify environment variables** - Make sure all `NEXT_PUBLIC_*` variables are set
3. **Check provider setup** - Ensure `SpoolLiveUpdatesProvider` wraps your app
4. **Test hook usage** - Make sure you're using `useSpoolLiveUpdates` in a client component

**Common Issues:**

- **No connection messages** → Environment variables not set or provider missing
- **"Invalid API key" errors** → Check your API key is correct and includes `spool_` prefix
- **Connection refused** → Convex URL not set correctly
- **Hook not working** → Make sure component is marked with `'use client'`

---

## Live Updates System Deep Dive

Spool's live updates system provides real-time updates to your Next.js application whenever content changes. Here's everything you need to know:

### Live Updates vs Webhooks

**Live Updates (v2.1.0+) - Recommended:**
- ✅ **Zero configuration** - just use a React hook
- ✅ **Works everywhere** - development, production, edge functions
- ✅ **Real-time** - instant updates via WebSocket
- ✅ **Cost effective** - 55% cheaper at scale
- ✅ **TypeScript first** - automatic type safety

**Webhooks (Legacy) - Optional:**
- ⚠️ **Server-side only** - requires API routes and configuration
- ⚠️ **Environment specific** - different setup for dev vs production
- ⚠️ **More expensive** - higher infrastructure costs
- ✅ **Good for** - server-side processing, analytics, notifications

### Live Updates Deep Dive

### Live Update Events

Spool sends live updates for these content events:

| Event | Description | When it's triggered |
|-------|-------------|-------------------|
| `content.created` | New content item created | When you create and save a new item |
| `content.updated` | Existing content modified | When you edit and save an existing item |
| `content.published` | Content status changed to published | When you publish a draft item |
| `content.deleted` | Content item removed | When you delete an item |

### Live Update Payload Structure

Every live update includes this data structure:

```typescript
interface LiveUpdate {
  _id: string;
  siteId: string;
  event: 'content.created' | 'content.updated' | 'content.published' | 'content.deleted';
  collection: string;
  slug?: string;
  itemId: string;
  metadata?: {
    title?: string;
    author?: string;
    tags?: string[];
  };
  timestamp: number;
}
```

### Advanced Live Updates Usage

Here's how to use live updates with custom logic and error handling:

```typescript
'use client';

import { useSpoolLiveUpdates, LiveUpdate } from '@spoolcms/nextjs';
import { useState, useEffect } from 'react';

export default function AdvancedLiveUpdates() {
  const [updateHistory, setUpdateHistory] = useState<LiveUpdate[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { isConnected, updates, latestUpdate } = useSpoolLiveUpdates({
    apiKey: process.env.NEXT_PUBLIC_SPOOL_API_KEY!,
    siteId: process.env.NEXT_PUBLIC_SPOOL_SITE_ID!,
    onUpdate: (update) => {
      console.log(`Live update received:`, update);
      
      // Add to history
      setUpdateHistory(prev => [update, ...prev.slice(0, 9)]); // Keep last 10
      
      // Custom logic based on update type
      switch (update.event) {
        case 'content.created':
          console.log(`New ${update.collection} created: ${update.slug}`);
          break;
        case 'content.updated':
          console.log(`${update.collection} updated: ${update.slug}`);
          break;
        case 'content.published':
          console.log(`${update.collection} published: ${update.slug}`);
          // Could trigger analytics event, notification, etc.
          break;
        case 'content.deleted':
          console.log(`${update.collection} deleted: ${update.slug}`);
          break;
      }
      
      // Collection-specific handling
      if (update.collection === 'blog') {
        // Handle blog-specific updates
        console.log('Blog content changed, updating blog state...');
      }
    },
    enabled: true, // Can be controlled dynamically
  });

  // Handle connection errors
  useEffect(() => {
    if (!isConnected) {
      setError('Disconnected from live updates');
    } else {
      setError(null);
    }
  }, [isConnected]);

  return (
    <div className="p-4 border rounded">
      <h3>Live Updates Status</h3>
      
      <div className="mb-4">
        <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`} />
        {isConnected ? 'Connected' : 'Disconnected'}
        {error && <span className="text-red-500 ml-2">{error}</span>}
      </div>

      {latestUpdate && (
        <div className="mb-4 p-2 bg-blue-50 rounded">
          <strong>Latest Update:</strong> {latestUpdate.event} on {latestUpdate.collection}/{latestUpdate.slug}
          <br />
          <small>{new Date(latestUpdate.timestamp).toLocaleString()}</small>
        </div>
      )}

      <div>
        <h4>Recent Updates ({updateHistory.length})</h4>
        <div className="max-h-40 overflow-y-auto">
          {updateHistory.map((update, index) => (
            <div key={`${update._id}-${index}`} className="text-sm p-1 border-b">
              <span className="font-mono text-xs">{update.event}</span> - 
              {update.collection}/{update.slug} - 
              <span className="text-gray-500">
                {new Date(update.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Live Updates Security

Live updates are secured through Convex's built-in authentication system:

1. **API key validation**: Each connection is authenticated using your Spool API key
2. **Site isolation**: Users can only see updates for sites they have access to
3. **Rate limiting**: Convex provides built-in rate limiting and abuse protection
4. **Secure WebSockets**: All connections use secure WebSocket protocols

### Testing Live Updates

Testing live updates is simple:

1. **Start your development server** with the live updates hook
2. **Open your browser console** to see connection messages
3. **Make a content change** in Spool admin
4. **Watch for live update messages** in real-time

You should see:
```bash
[DEV] ✅ Connected to Spool Realtime for site: your-site-id
[DEV] 🔄 Live update: blog/my-post
[DEV] ✅ Revalidated: /blog/my-post
```

### Live Updates Monitoring

Monitor your live updates through:

1. **Browser console**: See connection status and update messages
2. **Convex dashboard**: View function execution logs and performance metrics
3. **Network tab**: Monitor WebSocket connection health
4. **Custom logging**: Add your own logging in the `onUpdate` callback

### Troubleshooting Live Updates

**Common Issues:**

1. **Connection failed**: Check your API key and Convex URL
2. **No updates received**: Verify the provider is set up correctly
3. **Updates not triggering revalidation**: Check browser console for errors
4. **Performance issues**: Monitor the Convex dashboard for function execution times

**Debug Steps:**

1. Check browser console for connection and error messages
2. Verify all environment variables are set correctly
3. Ensure `SpoolLiveUpdatesProvider` wraps your app
4. Test with a simple component using `useSpoolLiveUpdates`
5. Check the Convex dashboard for function execution logs

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