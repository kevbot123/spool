# Spool MVP - Headless CMS for Next.js - Database + API Approach

## Core Value
**Beautiful cloud admin → Real-time API → Database storage → Instant Next.js updates**

## Key Insight
Database-first for performance/simplicity with UI-first collection management. Preserve markdown-native body content for AI compatibility.

## MVP Features (3 weeks)
- ✅ Cloud admin UI with visual collection builder
- ✅ User installs `@spool/nextjs` package (one API route)
- ✅ Content & images stored in Spool database (fast, scalable)
- ✅ Real-time API updates with instant revalidation
- ✅ UI-first collection management (no config files needed)
- ✅ Markdown-native body content (AI-friendly)
- ✅ Draft/publish workflow

## How It Works
```
Spool Admin → User's Next.js API → Spool Database → revalidatePath() → Instant update
```

**Real-time editing with database performance**

## User Setup (15 seconds)
```bash
# 1. Install package
npm install @spool/nextjs

# 2. Add one API route (copy/paste)
# app/api/spool/[...route]/route.ts
import { createSpoolHandler } from '@spool/nextjs';

export const { GET, POST, PUT, DELETE } = createSpoolHandler({
  apiKey: process.env.SPOOL_API_KEY,
  siteId: process.env.SPOOL_SITE_ID
});

# 3. Connect to Spool admin → Create collections visually → Done!
```

**No config files. Works immediately.**

## Database Schema
```sql
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  api_endpoint TEXT NOT NULL,
  api_key TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  schema JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(site_id, slug)
);

CREATE TABLE content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id),
  collection_id UUID REFERENCES collections(id),
  slug TEXT NOT NULL,
  data JSONB NOT NULL,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP,
  UNIQUE(site_id, collection_id, slug)
);

CREATE INDEX idx_content_site_collection ON content_items(site_id, collection_id);
CREATE INDEX idx_content_status ON content_items(status);
CREATE INDEX idx_content_published ON content_items(published_at DESC);
```

## Collection Management
**Visual collection builder in admin UI:**

- ✅ **Drag-and-drop field creation** (text, textarea, markdown, datetime, boolean, etc.)
- ✅ **Real-time preview** of content structure
- ✅ **Collection templates** for common use cases (blog, pages, portfolio)
- ✅ **Field validation rules** (required, min/max length, regex)
- ✅ **URL structure control** (subfolder configuration)

**Example collections created in UI:**
- **Blog**: title (text), excerpt (textarea), body (markdown), publishedAt (datetime), featured (boolean)
- **Pages**: title (text), description (textarea), body (markdown)
- **Portfolio**: title (text), description (textarea), images (media), technologies (tags)

## API Flow
```typescript
// @spool/nextjs package
export function createSpoolHandler(config: { 
  apiKey: string, 
  siteId: string
}) {
  return {
    // Get collection configuration from database
    GET: async (req) => {
      if (req.url.includes('/collections/config')) {
        return Response.json(await spoolAPI.getCollections(config.siteId));
      }
      
      // Get content item
      const { collection, slug } = parseUrl(req.url);
      const item = await spoolAPI.getContent(config.siteId, collection, slug);
      return Response.json(item);
    },
    
    // Save draft (real-time)
    PUT: async (req) => {
      const { collection, slug } = parseUrl(req.url);
      const data = await req.json();
      
      await spoolAPI.saveDraft(config.siteId, collection, slug, data);
      return Response.json({ success: true });
    },
    
    // Publish content
    POST: async (req) => {
      const { collection, slug } = parseUrl(req.url);
      
      await spoolAPI.publishContent(config.siteId, collection, slug);
      
      // Trigger Next.js revalidation
      revalidatePath(`/${collection}/${slug}`);
      revalidatePath(`/${collection}`); // Collection index
      
      return Response.json({ success: true });
    }
  };
}
```

## Draft → Publish Flow
```typescript
// Real-time draft saves
async function saveDraft(siteId: string, collection: string, slug: string, data: any) {
  // Fast database upsert (sub-100ms)
  await db.query(`
    INSERT INTO content_items (site_id, collection_id, slug, data, status)
    VALUES ($1, $2, $3, $4, 'draft')
    ON CONFLICT (site_id, collection_id, slug) 
    DO UPDATE SET data = $4, updated_at = NOW()
  `, [siteId, getCollectionId(collection), slug, data]);
}

// Publish workflow
async function publishContent(siteId: string, collection: string, slug: string) {
  // Mark as published
  await db.query(`
    UPDATE content_items 
    SET status = 'published', published_at = NOW()
    WHERE site_id = $1 AND collection_id = $2 AND slug = $3
  `, [siteId, getCollectionId(collection), slug]);
  
  // Call user's API for revalidation
  const site = await getSite(siteId);
  await fetch(`${site.api_endpoint}/content/${collection}/${slug}/publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${site.api_key}` }
  });
}
```

## Content Structure (AI-Native)
```typescript
// How content is stored (body as markdown)
const contentItem = {
  title: "My Blog Post",
  excerpt: "This is a summary...",
  body: "# Heading\n\nThis is **markdown** content that AI can easily process.",
  publishedAt: "2024-01-15T10:00:00Z",
  featured: true
};

// Perfect for AI workflows
const aiPrompt = `
Here's a blog post in markdown format:
${contentItem.body}

Please summarize this content...
`;
```

## Setup Flow
1. **Install** `@spool/nextjs` package (1 command)
2. **Add API route** (copy/paste 5 lines)
3. **Connect to Spool** → Beautiful admin dashboard opens
4. **Create collections visually** → Drag-and-drop field builder
5. **Start editing** → Content saves in real-time
6. **Publish** → Site updates instantly

## User Benefits
- ✅ **15-second setup** (no configuration files needed)
- ✅ **Lightning fast** (database performance)
- ✅ **Real-time editing** (sub-100ms saves)
- ✅ **Visual collection builder** (no code required)
- ✅ **AI-native** (markdown body content)
- ✅ **Beautiful admin** (drag-and-drop interface)

## Architecture
```
Spool Cloud Platform:
├── Database (supabase + fast queries)
├── /admin/collections (visual collection builder)
├── /admin/[collection] (content management UI)
└── /api/sites/[siteId] (content management API)

User's Next.js Site:
└── /api/spool/[...route] (@spool/nextjs package)
```

## Week 1: Foundation
- Supabase auth + site management
- Basic @spool/nextjs package
- Visual collection builder UI
- Simple content CRUD

## Week 2: Core Admin
- Beautiful content management interface
- Real-time draft saves
- Publish workflow
- Field validation & types

## Week 3: Polish
- Collection templates
- Error handling & validation
- Performance optimization
- Package publishing

## Success Criteria
- User setup in < 30 seconds
- Collection creation in < 2 minutes
- Content saves in < 100ms
- Scales to 10,000+ posts per site
- Beautiful, intuitive admin interface

## Differentiation
**"The fastest headless CMS for Next.js developers"**

- ✅ **15-second setup** (fastest in market)
- ✅ **Database performance** (10x faster than file-based)
- ✅ **Real-time editing** (no delays)
- ✅ **Visual collection builder** (no config files needed)
- ✅ **AI-native content** (markdown body fields)
- ✅ **Beautiful admin** (designed for non-technical users)