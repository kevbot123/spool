# Spool CMS Demo Blog

A comprehensive demo blog built to showcase all features of Spool CMS including headless API integration, real-time editing, SEO optimization, and seamless Next.js integration.

## 🚀 Quick Start

1. **Visit the Demo Blog**
   ```
   http://localhost:3000/demo/blog
   ```

2. **Access the Setup Guide**
   ```
   http://localhost:3000/demo/blog/demo-setup
   ```

3. **Open CMS Admin**
   ```
   http://localhost:3000/admin
   ```

## 📁 Demo Structure

```
src/app/demo/blog/
├── layout.tsx              # Blog layout with navigation
├── page.tsx                # Homepage with featured posts
├── posts/
│   ├── page.tsx           # All posts listing page
│   └── [slug]/
│       └── page.tsx       # Individual blog post pages
├── sitemap.xml/
│   └── route.ts           # Auto-generated sitemap
├── robots.txt/
│   └── route.ts           # SEO robots.txt
└── demo-setup/
    └── page.tsx           # Setup guide and instructions

src/app/demo/api/spool/[...route]/
└── route.ts               # Demo API that simulates @spool/nextjs
```

## ✨ Features Demonstrated

### 1. **Headless CMS Integration**
- Fetches content from Spool API
- Dynamic page generation
- Collection-based content structure
- Real-time content updates

### 2. **SEO Optimization**
- Automatic meta tag generation
- Open Graph tags for social sharing
- Twitter Card support
- Structured data (JSON-LD)
- Dynamic sitemap generation
- SEO-optimized robots.txt

### 3. **Content Management**
- Blog post creation and editing
- Draft and publish workflow
- Rich markdown content
- Author attribution
- Tag-based categorization
- Featured post highlighting

### 4. **Developer Experience**
- TypeScript support
- Next.js App Router integration
- Automatic revalidation on publish
- Beautiful, responsive UI
- Component-based architecture

## 🔧 How to Test

### Option 1: Use Mock Data (Default)
The demo works out of the box with realistic mock data that demonstrates all features.

1. Visit `/demo/blog` to see the blog homepage
2. Browse posts at `/demo/blog/posts`
3. View individual posts at `/demo/blog/posts/[slug]`
4. Check SEO features at `/demo/blog/sitemap.xml`

### Option 2: Connect to Real CMS (Recommended)

1. **Create a Blog Collection in Admin**
   - Go to `/admin/collections`
   - Create a new collection named "Blog Posts" with slug "blog"
   - Add the required fields (see schema below)

2. **Add Sample Content**
   - Go to `/admin` and create blog posts
   - Test both draft and published states
   - Add tags, authors, and featured posts

3. **Configure Environment Variables**
   ```env
   SPOOL_API_KEY=your_actual_api_key
   SPOOL_SITE_ID=your_actual_site_id
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Update Blog Pages (Optional)**
   - Replace mock data functions with real API calls
   - Use `getSpoolContent()` from `@/lib/spool/nextjs-package`

## 📋 Required Collection Schema

The demo blog expects a collection with the following schema:

```typescript
{
  name: "Blog Posts",
  slug: "blog", 
  fields: [
    { name: "title", type: "text", required: true },
    { name: "excerpt", type: "text", required: true },
    { name: "body", type: "markdown", required: true },
    { name: "author", type: "text", required: true },
    { name: "tags", type: "multiselect", required: false },
    { name: "publishedAt", type: "datetime", required: true },
    { name: "featured", type: "boolean", required: false }
  ]
}
```

## 🎯 Testing Checklist

### Content Management
- [ ] Create new blog posts in admin
- [ ] Edit existing content
- [ ] Test draft → publish workflow
- [ ] Test real-time auto-save
- [ ] Add tags and categorization
- [ ] Set featured posts

### Frontend Features
- [ ] Homepage displays featured posts
- [ ] All posts page shows complete listing
- [ ] Individual post pages render correctly
- [ ] Navigation works between pages
- [ ] Responsive design on mobile

### SEO Features
- [ ] Page titles include post titles
- [ ] Meta descriptions are generated
- [ ] Open Graph tags for social sharing
- [ ] Sitemap includes all posts
- [ ] Robots.txt is accessible
- [ ] Structured data is present

### API Integration
- [ ] Content fetches from Spool API
- [ ] Pages revalidate on publish
- [ ] Error handling for missing content
- [ ] Pagination works (if implemented)

## 🔌 API Endpoints Tested

The demo tests these Spool API endpoints:

- `GET /api/spool/{siteId}/collections` - List collections
- `GET /api/spool/{siteId}/content/blog` - List blog posts
- `GET /api/spool/{siteId}/content/blog/{slug}` - Get specific post
- `POST /api/spool/{siteId}/content/blog/{slug}/publish` - Publish post

## 📱 Demo Pages

### Homepage (`/demo/blog`)
- Hero section with CTA buttons
- Featured posts grid
- Recent posts section
- Feature highlights
- Call-to-action sections

### All Posts (`/demo/blog/posts`)
- Complete post listing
- Search and filter UI (demo)
- Tag cloud
- Pagination placeholder
- Post metadata display

### Individual Posts (`/demo/blog/posts/[slug]`)
- Full post content
- Author and publish date
- Reading time estimate
- Tag display
- Social sharing button
- Related content CTA

### SEO Pages
- Sitemap: `/demo/blog/sitemap.xml`
- Robots: `/demo/blog/robots.txt`

## 💡 Implementation Notes

### Mock Data
The demo includes realistic mock data that represents what would come from the Spool API:
- 6 sample blog posts
- Multiple authors
- Various tags and categories
- Mix of featured and regular posts
- Realistic publish dates

### SEO Implementation
- Uses Next.js 13+ metadata API
- Generates Open Graph images (placeholder)
- Includes JSON-LD structured data
- Follows SEO best practices

### Styling
- Uses Tailwind CSS for styling
- Responsive design patterns
- Consistent with main app design system
- Beautiful typography and spacing

## 🚀 Production Notes

When moving to production:

1. **Replace Mock Data**
   - Update all data fetching functions
   - Use real `getSpoolContent()` calls
   - Remove mock data constants

2. **Environment Configuration**
   - Set proper API keys
   - Configure production URLs
   - Update sitemap base URLs

3. **Performance Optimization**
   - Add proper caching headers
   - Implement ISR for posts
   - Optimize images and assets

4. **Security**
   - Validate API responses
   - Sanitize user content
   - Add proper error boundaries

## 📝 Adding New Features

To extend the demo blog:

1. **Add New Content Types**
   - Create additional collections
   - Update schema definitions
   - Add new page templates

2. **Enhance SEO**
   - Add schema markup
   - Implement Open Graph image generation
   - Add breadcrumb navigation

3. **Improve UX**
   - Add search functionality
   - Implement tag filtering
   - Add comment system

This demo blog provides a complete testing environment for all Spool CMS features and serves as a reference implementation for Next.js integration. 