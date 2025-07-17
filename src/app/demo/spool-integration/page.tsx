import { Suspense } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Code2, Zap, Database, Search, CheckCircle, Globe, BookOpen, ArrowRight } from 'lucide-react';

// Simulate how users would fetch content from their Next.js site
async function getExampleContent() {
  // This simulates the API call that would happen in a real Next.js site
  // In reality, this would be: await getSpoolContent(config, 'blog', 'example-post')
  
  return {
    collection: {
      name: 'Blog Posts',
      slug: 'blog',
      schema: {
        title: { type: 'text', required: true },
        excerpt: { type: 'text', required: true },
        body: { type: 'markdown', required: true },
        publishedAt: { type: 'datetime', required: true },
        featured: { type: 'boolean', required: false }
      }
    },
    item: {
      id: 'example-id',
      slug: 'example-post',
      data: {
        title: 'Getting Started with Spool CMS',
        excerpt: 'Learn how to integrate Spool CMS with your Next.js application for seamless content management.',
        body: `# Getting Started with Spool CMS

Welcome to **Spool CMS** - the fastest headless CMS for Next.js developers!

## Why Spool?

- ⚡ **15-second setup** - fastest in market
- 🚀 **Real-time editing** - sub-100ms saves
- 🎨 **Beautiful admin** - designed for non-technical users
- 🤖 **AI-native** - markdown body content
- 📱 **Visual collection builder** - no config files needed

## How It Works

1. Install the package: \`npm install @spoolcms/nextjs\`
2. Add one API route
3. Start creating content!

Your content is stored in our database for lightning-fast performance, and updates are pushed to your site in real-time.`,
        publishedAt: new Date().toISOString(),
        featured: true
      },
      status: 'published',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      published_at: new Date().toISOString()
    }
  };
}

function ContentDemo({ content }: { content: any }) {
  return (
    <div className="space-y-6">
      {/* Collection Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Collection: {content.collection.name}
          </CardTitle>
          <CardDescription>
            Schema-driven content structure with real-time validation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(content.collection.schema).map(([key, field]: [string, any]) => (
              <div key={key} className="text-sm">
                <div className="font-medium">{key}</div>
                <div className="text-gray-500">
                  {field.type} {field.required && <Badge variant="outline" className="ml-1">required</Badge>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Content Item */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Live Content Example
          </CardTitle>
          <CardDescription>
            This is how content from Spool would appear in your Next.js site
          </CardDescription>
        </CardHeader>
        <CardContent>
          <article className="prose prose-gray max-w-none">
            <div className="mb-4">
              <h1 className="text-3xl font-bold mb-2">{content.item.data.title}</h1>
              <p className="text-lg text-gray-600 mb-4">{content.item.data.excerpt}</p>
              
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
                <span>Published: {new Date(content.item.data.publishedAt).toLocaleDateString()}</span>
                {content.item.data.featured && (
                  <Badge variant="secondary">Featured</Badge>
                )}
                <Badge variant="outline">{content.item.status}</Badge>
              </div>
            </div>
            
            <div className="prose prose-lg">
              <div dangerouslySetInnerHTML={{ 
                __html: content.item.data.body.replace(/\n/g, '<br/>') 
              }} />
            </div>
          </article>
        </CardContent>
      </Card>
    </div>
  );
}

function IntegrationFlow() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Real-time Integration Flow
          </CardTitle>
          <CardDescription>
            How Spool CMS connects to your Next.js application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div>
                <div className="font-medium">Content Created in Admin</div>
                <div className="text-sm text-gray-500">Editor creates/updates content in beautiful Spool admin</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <div className="font-medium">Saved to Database</div>
                <div className="text-sm text-gray-500">Content stored in Spool database with sub-100ms saves</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <div className="font-medium">API Request from Next.js</div>
                <div className="text-sm text-gray-500">Your site fetches content via @spoolcms/nextjs package</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                4
              </div>
              <div>
                <div className="font-medium">Real-time Revalidation</div>
                <div className="text-sm text-gray-500">When published, Next.js pages revalidate instantly</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Code Example</CardTitle>
          <CardDescription>
            How you'd use Spool in your Next.js pages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">
              <code>{`// app/blog/[slug]/page.tsx
import { getSpoolContent } from '@spoolcms/nextjs';

export default async function BlogPost({ params }) {
  const config = {
    apiKey: process.env.SPOOL_API_KEY!,
    siteId: process.env.SPOOL_SITE_ID!
  };
  
  const { item, collection } = await getSpoolContent(
    config, 
    'blog', 
    params.slug
  );
  
  return (
    <article>
      <h1>{item.data.title}</h1>
      <div dangerouslySetInnerHTML={{ 
        __html: item.data.body 
      }} />
    </article>
  );
}

// Generate SEO metadata
export async function generateMetadata({ params }) {
  const { item, collection } = await getSpoolContent(
    config, 
    'blog', 
    params.slug
  );
  
  return {
    title: item.data.title,
    description: item.data.excerpt,
    openGraph: {
      title: item.data.title,
      description: item.data.excerpt,
      type: 'article'
    }
  };
}`}</code>
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Demo Blog Section
function DemoBlogSection() {
  return (
    <Card className="border-2 border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-600" />
          🆕 Live Demo Blog
        </CardTitle>
        <CardDescription>
          See Spool CMS in action with a complete blog implementation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-600">
          We've built a complete demo blog that showcases all Spool CMS features in a real-world scenario. 
          This includes content management, SEO optimization, and the full Next.js integration.
        </p>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-500" />
              Demo Features
            </h4>
            <ul className="text-sm space-y-1 text-gray-600">
              <li>• Real blog with multiple posts</li>
              <li>• SEO metadata & Open Graph</li>
              <li>• Sitemap & robots.txt generation</li>
              <li>• Responsive design</li>
            </ul>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Test Everything
            </h4>
            <ul className="text-sm space-y-1 text-gray-600">
              <li>• Create content in admin</li>
              <li>• See changes live on blog</li>
              <li>• Test API integration</li>
              <li>• Verify SEO features</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Link href="/demo/blog">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <BookOpen className="h-4 w-4 mr-2" />
              Visit Demo Blog
            </Button>
          </Link>
          <Link href="/demo/blog/demo-setup">
            <Button variant="outline">
              Setup Guide
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function CodeIntegrationSection() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Installation & Setup</CardTitle>
          <CardDescription>
            Get started with Spool in your Next.js project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">1. Install the package</h4>
              <div className="bg-gray-900 text-gray-100 p-3 rounded text-sm">
                <code>npm install @spoolcms/nextjs</code>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">2. Add environment variables</h4>
              <div className="bg-gray-900 text-gray-100 p-3 rounded text-sm">
                <code>{`SPOOL_API_KEY=your_api_key
SPOOL_SITE_ID=your_site_id`}</code>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">3. Create API route</h4>
              <div className="bg-gray-900 text-gray-100 p-3 rounded text-sm">
                <code>{`// app/api/spool/[...route]/route.ts
import { createSpoolHandler } from '@spoolcms/nextjs';

const config = {
  apiKey: process.env.SPOOL_API_KEY!,
  siteId: process.env.SPOOL_SITE_ID!
};

const handler = createSpoolHandler(config);
export { handler as GET, handler as POST, handler as PUT, handler as DELETE };`}</code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fetching Content</CardTitle>
          <CardDescription>
            Use Spool's helper functions to get your content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 text-gray-100 p-4 rounded text-sm overflow-x-auto">
            <pre><code>{`// List all posts
const { items } = await getSpoolContent(config, 'blog');

// Get specific post
const { item } = await getSpoolContent(config, 'blog', 'my-post-slug');

// Get collections
const { collections } = await getSpoolCollections(config);

// Generate sitemap
const sitemap = await getSpoolSitemap(config);`}</code></pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function SpoolIntegrationDemo() {
  const content = await getExampleContent();

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <Badge variant="secondary" className="mb-4">
          Integration Demo
        </Badge>
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          Spool CMS Next.js Integration
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          See how Spool CMS integrates seamlessly with Next.js to provide real-time content management, 
          automatic SEO optimization, and lightning-fast performance.
        </p>
      </div>

      {/* Demo Blog Highlight */}
      <div className="mb-12">
        <DemoBlogSection />
      </div>

      {/* Integration Flow */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">How It Works</h2>
        <IntegrationFlow />
      </div>

      {/* Live Content Demo */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Live Content Example</h2>
        <Suspense fallback={<div>Loading content...</div>}>
          <ContentDemo content={content} />
        </Suspense>
      </div>

      {/* Code Integration */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Code Integration</h2>
        <CodeIntegrationSection />
      </div>

      {/* Feature Grid */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Key Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Real-time Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">
                Content updates are pushed to your site instantly when published, 
                with automatic page revalidation.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-500" />
                SEO Optimized
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">
                Automatic meta tags, Open Graph images, sitemaps, and 
                structured data for better search rankings.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-green-500" />
                Developer Friendly
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">
                TypeScript support, beautiful APIs, and seamless integration 
                with Next.js App Router and Server Components.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Ready to build with Spool?
        </h2>
        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
          Start creating content and see how easy it is to build fast, 
          SEO-optimized websites with Spool CMS and Next.js.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/demo/blog">
            <Button size="lg">
              <BookOpen className="h-5 w-5 mr-2" />
              Explore Demo Blog
            </Button>
          </Link>
          <Link href="/admin">
            <Button variant="outline" size="lg">
              <ExternalLink className="h-5 w-5 mr-2" />
              Open CMS Admin
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
} 