# Spool CMS Setup Guide

Welcome to Spool! This guide will walk you through setting up your headless CMS platform.

## Overview

Spool is a beautiful, headless CMS built for Next.js developers. It provides:
- Real-time content editing
- AI-native markdown content
- Beautiful admin interface
- Stripe integration for monetization
- Supabase backend for scalability

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Git
- Supabase account
- Vercel account (for deployment)
- Stripe account (for payments)

## Quick Start

### 1. Repository Setup

```bash
# Clone and setup the repository
cd /Users/kevin/Sites/spool
git init
git add .
git commit -m "Initial Spool CMS setup"

# Create GitHub repository (replace with your username)
gh repo create your-username/spool --public --source=. --remote=origin --push
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_PROJECT_ID=your_supabase_project_id

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
SITE_URL=http://localhost:3000

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OpenAI (for AI features)
OPENAI_API_KEY=sk-...

# Email (for transactional emails)
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@yourdomain.com

# Admin
ADMIN_EMAIL=your@email.com
```

### 3. Database Setup (Supabase)

#### Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key
4. Generate a service role key from Settings > API

#### Install Supabase CLI
```bash
npm install -g @supabase/cli
supabase login
```

#### Link Project and Run Migrations
```bash
# Link to your Supabase project
supabase link --project-ref your-project-id

# Push database schema
supabase db push

# Generate TypeScript types
npm run db:generate-types
```

### 4. Stripe Setup

#### Create Stripe Account
1. Go to [stripe.com](https://stripe.com)
2. Create account and get API keys
3. Create products and prices for your plans

#### Configure Webhook
1. In Stripe Dashboard, go to Developers > Webhooks
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated` 
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook secret to environment variables

#### Create Products
```bash
# Run the Stripe setup script
node scripts/setup-stripe-products.js
```

### 5. Install Dependencies

```bash
npm install
```

### 6. Development

```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

## Deployment (Vercel)

### 1. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Update NEXT_PUBLIC_APP_URL and SITE_URL to your production domain
```

### 2. Update Stripe Webhook

Update your Stripe webhook endpoint to point to your production domain:
`https://your-domain.vercel.app/api/stripe/webhook`

### 3. Update Supabase Auth Settings

In Supabase Dashboard > Authentication > Settings:
- Add your production domain to "Site URL"
- Add your domain to "Redirect URLs"

## Database Schema

The core tables for Spool CMS:

```sql
-- Sites (each user can have multiple sites)
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  domain TEXT,
  api_key TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Collections (content types)
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  schema JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(site_id, slug)
);

-- Content Items
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
```

## Admin Access

### Create Admin User

```bash
# Make your user an admin
node scripts/make-admin.js your@email.com
```

### Access Admin Panel

Visit `/admin` to access the beautiful content management interface.

## Content Management

### Collections Configuration

Edit `content/collections.json` to define your content types:

```json
{
  "blog": {
    "name": "Blog Posts",
    "subfolder": "blog",
    "fields": [
      { "name": "title", "type": "text", "required": true },
      { "name": "body", "type": "markdown", "required": true },
      { "name": "publishedAt", "type": "datetime" }
    ]
  }
}
```

### Content API

Access your content via API:

```bash
# Get all blog posts
GET /api/content/blog

# Get specific post
GET /api/content/blog/my-post-slug

# Create/update (requires auth)
POST /api/content/blog/my-post-slug
```

## Package Development (@spool/nextjs)

The `@spool/nextjs` package will be built from this codebase:

### Package Structure
```
packages/
├── nextjs/
│   ├── src/
│   │   ├── index.ts          # Main export
│   │   ├── components/       # React components
│   │   ├── hooks/           # React hooks
│   │   └── utils/           # Utilities
│   ├── package.json
│   └── README.md
```

### Build Package
```bash
# Build the npm package
npm run build:package

# Publish to npm
npm publish packages/nextjs
```

## Monitoring & Analytics

### Error Monitoring
- Set up Sentry for error tracking
- Configure alerts for critical issues

### Performance
- Monitor Core Web Vitals
- Track API response times
- Database query optimization

### Usage Analytics
- Track content creation/editing
- Monitor API usage
- User engagement metrics

## Support

- 📧 Email: support@spool.dev
- 📚 Documentation: https://docs.spool.dev
- 💬 Discord: https://discord.gg/spool
- 🐛 Issues: https://github.com/your-username/spool/issues

## Next Steps

1. **Complete Environment Setup** - Fill in all environment variables
2. **Run Database Migrations** - Set up your Supabase database
3. **Configure Stripe** - Set up payment processing
4. **Deploy to Vercel** - Get your CMS live
5. **Create Admin User** - Access the admin panel
6. **Customize Collections** - Define your content structure
7. **Build Your First Site** - Start creating content!

---

🎉 **Welcome to Spool!** You're now ready to build beautiful, fast websites with the power of a headless CMS. 