# Spool CMS ✨

**The beautiful headless CMS for Next.js developers**

Real-time content editing • AI-native markdown • Zero-config setup • Beautiful admin interface

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fspool)

## ✨ Features

- **🚀 30-second setup** - One config file, works immediately
- **⚡ Real-time editing** - Content saves in <100ms
- **🎨 Beautiful admin** - Notion-inspired interface for content creators
- **🤖 AI-native** - Markdown content perfect for AI workflows
- **📱 Responsive** - Works perfectly on mobile and desktop
- **🔒 Built-in auth** - Supabase authentication out of the box
- **💳 Monetization ready** - Stripe integration for paid content
- **🎯 SEO optimized** - Built-in meta tags, sitemaps, and structured data

## 🎯 Perfect For

- **SaaS documentation** - Beautiful docs that update instantly
- **Marketing sites** - Landing pages with real-time content updates
- **Blogs & publications** - AI-powered content creation workflows
- **Product catalogs** - Dynamic product pages with rich content
- **Knowledge bases** - Internal wikis and help centers

## 🏃‍♂️ Quick Start

### 1. Install the package

```bash
npm install @spool/nextjs
```

### 2. Create your collections

```json
// collections.json
{
  "blog": {
    "name": "Blog Posts",
    "fields": [
      { "name": "title", "type": "text", "required": true },
      { "name": "body", "type": "markdown", "required": true }
    ]
  }
}
```

### 3. Add the API route

```typescript
// app/api/spool/[...route]/route.ts
import { createSpoolHandler } from '@spool/nextjs';

export const { GET, POST, PUT, DELETE } = createSpoolHandler({
  apiKey: process.env.SPOOL_API_KEY,
  siteId: process.env.SPOOL_SITE_ID
});
```

### 4. Connect to Spool admin

Visit [spool.dev](https://spool.dev) → Connect your site → Start editing!

## 🏗️ Architecture

```
Spool Cloud Admin → Your Next.js API → Spool Database → revalidatePath() → Instant updates
```

- **Database-first** for lightning-fast performance
- **Real-time API** for instant content updates  
- **Zero-config** auto-discovery of your content structure
- **AI-compatible** markdown-native content storage

## 🎨 Admin Interface

Beautiful, intuitive content editing experience:

- **Rich text editor** with markdown support
- **Real-time preview** of your content
- **Drag & drop** image uploads
- **Bulk operations** for managing hundreds of posts
- **Collaborative editing** with conflict resolution
- **Draft/publish workflow** with scheduled publishing

## 🔧 Advanced Features

### SEO Optimization
- Auto-generated meta tags and structured data
- Dynamic OG image generation
- Built-in sitemap and robots.txt
- Performance monitoring with Core Web Vitals

### AI Integration
- Content suggestions powered by GPT-4
- Auto-generated summaries and excerpts
- Smart tagging and categorization
- Markdown-first for AI compatibility

### Developer Experience
- TypeScript types auto-generated from your schema
- Real-time content validation
- Comprehensive REST API
- Webhook support for custom integrations

## 📚 Documentation

- **[Getting Started](https://docs.spool.dev/getting-started)** - Complete setup guide
- **[API Reference](https://docs.spool.dev/api)** - Full API documentation
- **[Examples](https://docs.spool.dev/examples)** - Real-world usage examples
- **[Migration Guide](https://docs.spool.dev/migration)** - Moving from other CMSs

## 🚀 Performance

- **Sub-100ms** content saves
- **Edge-optimized** content delivery
- **Automatic** image optimization
- **Built-in** caching strategies
- **Scales** to millions of posts

## 🔒 Security & Compliance

- **SOC 2 Type II** compliant infrastructure
- **End-to-end encryption** for all content
- **Role-based access** control
- **Audit logs** for all content changes
- **GDPR compliant** data handling

## 💳 Pricing

- **Free**: Up to 3 collections, 100 content items
- **Pro ($29/month)**: Unlimited collections, AI features, priority support
- **Enterprise**: Custom pricing for large teams

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## 🆘 Support

- **📧 Email**: support@spool.dev
- **💬 Discord**: [Join our community](https://discord.gg/spool)
- **📚 Docs**: [docs.spool.dev](https://docs.spool.dev)
- **🐛 Issues**: [GitHub Issues](https://github.com/your-username/spool/issues)

---

Built with ❤️ by developers, for developers. Make content management beautiful again.

[**Get Started →**](https://spool.dev) 