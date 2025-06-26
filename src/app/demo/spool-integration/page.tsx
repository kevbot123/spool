import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Code2, Zap, Database, Search, CheckCircle } from 'lucide-react';

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
        excerpt: { type: 'textarea', required: true },
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

1. Install the package: \`npm install @spool/nextjs\`
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
                <div className="text-sm text-gray-500">Your site fetches content via @spool/nextjs package</div>
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
import { getSpoolContent } from '@spool/nextjs';

export default async function BlogPost({ params }) {
  const config = {
    apiKey: process.env.SPOOL_API_KEY!,
    siteId: process.env.SPOOL_SITE_ID!
  };

  // Fetch content from Spool CMS
  const { item } = await getSpoolContent(config, 'blog', params.slug);

  return (
    <article>
      <h1>{item.data.title}</h1>
      <p>{item.data.excerpt}</p>
      <div dangerouslySetInnerHTML={{ __html: item.data.body }} />
    </article>
  );
}

// Static generation with ISR
export async function generateStaticParams() {
  const { items } = await getSpoolContent(config, 'blog');
  return items.map(item => ({ slug: item.slug }));
}`}</code>
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* SEO Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-500" />
            Built-in SEO Features
          </CardTitle>
          <CardDescription>
            Automatic SEO optimization for better search rankings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Auto-generated meta tags</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Dynamic Open Graph images</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">JSON-LD structured data</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Real-time SEO preview in admin</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Automatic sitemap generation</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Smart robots.txt</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">SEO health checks</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Social media optimization</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function SpoolIntegrationDemo() {
  const content = await getExampleContent();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Spool CMS Integration Demo</h1>
        <p className="text-xl text-gray-600">
          See how Spool CMS works with your Next.js application
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Content Demo */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Live Content Example</h2>
          <Suspense fallback={<div>Loading content...</div>}>
            <ContentDemo content={content} />
          </Suspense>
        </div>

        {/* Integration Flow */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">How It Works</h2>
          <IntegrationFlow />
        </div>
      </div>

      {/* Call to Action */}
      <div className="mt-12 text-center">
        <Card>
          <CardHeader>
            <CardTitle>Ready to Get Started?</CardTitle>
            <CardDescription>
              Set up your Next.js site with Spool CMS in under 30 seconds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center gap-4">
              <Button asChild size="lg">
                <a href="/admin/setup" className="flex items-center gap-2">
                  Connect Your Site
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="/admin/collections" className="flex items-center gap-2">
                  View Collections
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 