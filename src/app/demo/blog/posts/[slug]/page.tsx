import { notFound } from 'next/navigation';
import Link from 'next/link';
import { generateSpoolMetadata } from '@/lib/spool/seo-components';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, ArrowLeft, Share2 } from 'lucide-react';
import { Metadata } from 'next';

const DEMO_CONFIG = {
  apiKey: process.env.SPOOL_API_KEY || 'demo-api-key',
  siteId: process.env.SPOOL_SITE_ID || 'demo-site-id',
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
};

// Mock blog posts database
const BLOG_POSTS = {
  'getting-started-with-spool-cms': {
    id: '1',
    slug: 'getting-started-with-spool-cms',
    data: {
      title: 'Getting Started with Spool CMS',
      excerpt: 'Learn how to set up and use Spool CMS for your Next.js projects. This comprehensive guide covers everything from installation to advanced features.',
      body: `# Getting Started with Spool CMS

Welcome to **Spool CMS** - the fastest headless CMS for Next.js developers!

## Why Choose Spool?

Spool CMS is designed specifically for modern Next.js applications, offering:

- ⚡ **15-second setup** - fastest in market
- 🚀 **Real-time editing** - sub-100ms saves
- 🎨 **Beautiful admin** - designed for non-technical users
- 🤖 **AI-native** - markdown body content
- 📱 **Visual collection builder** - no config files needed

## Quick Start Guide

### 1. Installation

First, install the Spool package in your Next.js project:

\`\`\`bash
npm install @spool/nextjs
\`\`\`

### 2. Environment Variables

Add your Spool credentials to your \`.env.local\` file:

\`\`\`env
SPOOL_API_KEY=your_api_key_here
SPOOL_SITE_ID=your_site_id_here
\`\`\`

### 3. Create API Route

Create an API route to handle Spool requests:

\`\`\`typescript
// app/api/spool/[...route]/route.ts
import { createSpoolHandler } from '@spool/nextjs';

const config = {
  apiKey: process.env.SPOOL_API_KEY!,
  siteId: process.env.SPOOL_SITE_ID!
};

const handler = createSpoolHandler(config);

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
\`\`\`

### 4. Fetch Content

Now you can fetch content in your pages:

\`\`\`typescript
import { getSpoolContent } from '@spool/nextjs';

export default async function BlogPost({ params }) {
  const config = {
    apiKey: process.env.SPOOL_API_KEY!,
    siteId: process.env.SPOOL_SITE_ID!
  };
  
  const { item } = await getSpoolContent(config, 'blog', params.slug);
  
  return (
    <article>
      <h1>{item.data.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: item.data.body }} />
    </article>
  );
}
\`\`\`

## Advanced Features

### Real-time Updates

When content is published in the admin, your site automatically revalidates:

\`\`\`typescript
// Automatic revalidation on publish
revalidatePath(\`/blog/\${slug}\`);
\`\`\`

### SEO Optimization

Spool includes built-in SEO features:

\`\`\`typescript
import { generateSpoolMetadata } from '@spool/nextjs';

export async function generateMetadata({ params }) {
  const { item, collection } = await getSpoolContent(config, 'blog', params.slug);
  
  return generateSpoolMetadata({
    content: item,
    collection,
    path: \`/blog/\${params.slug}\`,
    siteUrl: 'https://yoursite.com'
  });
}
\`\`\`

## What's Next?

Now that you have Spool set up, you can:

1. **Create Collections** - Define your content structure
2. **Add Content** - Use the beautiful admin interface
3. **Customize Fields** - Choose from 12+ field types
4. **Optimize SEO** - Built-in meta tags and structured data
5. **Scale** - Handle millions of requests with edge caching

Ready to build something amazing? [Open the admin dashboard](/admin) and start creating!`,
      author: 'Sarah Chen',
      tags: ['tutorial', 'getting-started', 'cms'],
      publishedAt: '2024-01-15T10:00:00Z',
      featured: true,
      readingTime: 8
    },
    status: 'published' as const,
    createdAt: '2024-01-15T09:00:00Z',
    publishedAt: '2024-01-15T10:00:00Z'
  },
  'real-time-editing-features': {
    id: '2',
    slug: 'real-time-editing-features',
    data: {
      title: 'Real-time Editing Features',
      excerpt: 'Discover how Spool\'s real-time editing capabilities can streamline your content workflow and improve collaboration between developers and content creators.',
      body: `# Real-time Editing Features

One of Spool's most powerful features is its real-time editing capabilities. This feature revolutionizes how content teams work together.

## Sub-100ms Saves

Every keystroke is saved automatically with lightning-fast performance:

- **Instant saves** - No "save" button needed
- **Conflict resolution** - Multiple editors can work simultaneously
- **Version history** - Track all changes automatically
- **Undo/redo** - Full editing history preserved

## Live Preview

See your changes instantly as you type:

\`\`\`typescript
// Real-time preview updates
const [content, setContent] = useState(initialContent);
const debouncedSave = useDebounce(content, 200);

useEffect(() => {
  saveContent(debouncedSave);
}, [debouncedSave]);
\`\`\`

## Collaboration Features

Work together seamlessly:

- **Live cursors** - See where teammates are editing
- **Presence indicators** - Know who's online
- **Comment system** - Leave feedback directly on content
- **Review workflow** - Approve changes before publishing

This makes content creation a truly collaborative experience!`,
      author: 'Michael Rodriguez',
      tags: ['features', 'editing', 'collaboration'],
      publishedAt: '2024-01-12T14:30:00Z',
      featured: false,
      readingTime: 6
    },
    status: 'published' as const,
    createdAt: '2024-01-12T13:00:00Z',
    publishedAt: '2024-01-12T14:30:00Z'
  },
  'seo-optimization-best-practices': {
    id: '3',
    slug: 'seo-optimization-best-practices',
    data: {
      title: 'SEO Optimization Best Practices',
      excerpt: 'Learn how to leverage Spool\'s built-in SEO features to improve your website\'s search engine rankings and visibility.',
      body: `# SEO Optimization Best Practices

Spool CMS comes with powerful built-in SEO features that help your content rank better in search engines.

## Automatic Meta Tags

Spool automatically generates:

- **Title tags** - Optimized for search engines
- **Meta descriptions** - Compelling snippets for SERPs
- **Open Graph tags** - Perfect social media previews
- **Twitter Cards** - Rich social sharing
- **Canonical URLs** - Prevent duplicate content issues

## Structured Data

JSON-LD schema markup is generated automatically:

\`\`\`json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Your Article Title",
  "author": {
    "@type": "Person",
    "name": "Author Name"
  },
  "datePublished": "2024-01-15T10:00:00Z",
  "description": "Article description"
}
\`\`\`

## SEO Configuration

Customize SEO settings per collection:

- **Title templates** - Dynamic title generation
- **Default descriptions** - Fallback meta descriptions
- **OG image templates** - Branded social images
- **Sitemap settings** - Control indexing behavior

## Best Practices

1. **Use descriptive titles** - Include target keywords naturally
2. **Write compelling descriptions** - Encourage clicks from search results
3. **Optimize images** - Include alt text and proper file names
4. **Internal linking** - Connect related content
5. **Monitor performance** - Use analytics to track improvements

With Spool's SEO features, you can focus on creating great content while the technical optimization happens automatically.`,
      author: 'Emily Johnson',
      tags: ['seo', 'optimization', 'best-practices'],
      publishedAt: '2024-01-10T16:00:00Z',
      featured: true,
      readingTime: 10
    },
    status: 'published' as const,
    createdAt: '2024-01-10T15:00:00Z',
    publishedAt: '2024-01-10T16:00:00Z'
  }
  // Add more posts as needed
};

async function getBlogPost(slug: string) {
  // In a real implementation, this would fetch from the Spool API
  const post = BLOG_POSTS[slug as keyof typeof BLOG_POSTS];
  
  if (!post) {
    return null;
  }
  
  return {
    collection: {
      name: 'Blog Posts',
      slug: 'blog',
      schema: {
        title: { type: 'text', required: true },
        excerpt: { type: 'text', required: true },
        body: { type: 'markdown', required: true },
        author: { type: 'text', required: true },
        tags: { type: 'multiselect', required: false },
        publishedAt: { type: 'datetime', required: true },
        featured: { type: 'boolean', required: false }
      }
    },
    item: post
  };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const result = await getBlogPost(params.slug);
  
  if (!result) {
    return {
      title: 'Post Not Found - Spool Demo Blog',
      description: 'The requested blog post could not be found.'
    };
  }

  const { item } = result;
  
  return {
    title: `${item.data.title} - Spool Demo Blog`,
    description: item.data.excerpt,
    authors: [{ name: item.data.author }],
    openGraph: {
      title: item.data.title,
      description: item.data.excerpt,
      type: 'article',
      publishedTime: item.data.publishedAt,
      authors: [item.data.author],
      tags: item.data.tags,
      url: `/demo/blog/posts/${params.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: item.data.title,
      description: item.data.excerpt,
    },
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const result = await getBlogPost(params.slug);
  
  if (!result) {
    notFound();
  }

  const { item } = result;
  const publishedDate = new Date(item.data.publishedAt);
  
  return (
    <div className="py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Back Navigation */}
        <div className="mb-8">
          <Link href="/demo/blog/posts">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to all posts
            </Button>
          </Link>
        </div>

        {/* Article Header */}
        <header className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            {item.data.tags?.slice(0, 3).map((tag: string) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
            {item.data.featured && <Badge variant="secondary">Featured</Badge>}
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            {item.data.title}
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            {item.data.excerpt}
          </p>
          
          <div className="flex items-center justify-between py-6 border-t border-b border-gray-200">
            <div className="flex items-center gap-6 text-gray-600">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                <span className="text-sm">
                  {publishedDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm">{item.data.readingTime} min read</span>
              </div>
              <span className="text-sm font-medium">by {item.data.author}</span>
            </div>
            
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </header>

        {/* Article Content */}
        <article className="prose prose-lg prose-gray max-w-none">
          <div 
            dangerouslySetInnerHTML={{ 
              __html: item.data.body
                .replace(/\n/g, '<br/>')
                .replace(/#{3} /g, '<h3>')
                .replace(/#{2} /g, '<h2>')
                .replace(/# /g, '<h1>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            }} 
          />
        </article>

        {/* Article Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-200">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-8 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to try Spool CMS?
            </h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Experience the fastest headless CMS for Next.js. Create content, edit in real-time, and publish instantly.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/admin">
                <Button size="lg">
                  Open CMS Admin
                </Button>
              </Link>
              <Link href="/demo/blog">
                <Button variant="outline" size="lg">
                  Read More Posts
                </Button>
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
} 