import { Suspense } from 'react';
import Link from 'next/link';
import { getSpoolContent, getSpoolCollections } from '@/lib/spool/nextjs-package';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, ExternalLink, ArrowRight } from 'lucide-react';
import { Metadata } from 'next';

const DEMO_CONFIG = {
  apiKey: process.env.SPOOL_API_KEY || 'demo-api-key',
  siteId: process.env.SPOOL_SITE_ID || 'demo-site-id',
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
};

export const metadata: Metadata = {
  title: 'Spool Demo Blog - Headless CMS for Next.js',
  description: 'A demo blog showcasing Spool CMS features including real-time editing, SEO optimization, and seamless Next.js integration.',
  openGraph: {
    title: 'Spool Demo Blog - Headless CMS for Next.js',
    description: 'A demo blog showcasing Spool CMS features including real-time editing, SEO optimization, and seamless Next.js integration.',
    type: 'website',
    url: '/demo/blog',
  },
};

async function getBlogPosts() {
  try {
    // In a real implementation, this would fetch from the actual Spool API
    // For demo purposes, we'll return mock data that represents what would come from the API
    
    return {
      collection: {
        name: 'Blog Posts',
        slug: 'blog',
        schema: {
          title: { type: 'text', required: true },
          excerpt: { type: 'text', required: true },
          body: { type: 'markdown', required: true },
          featuredImage: { type: 'image', required: false },
          author: { type: 'text', required: true },
          tags: { type: 'multiselect', required: false },
          publishedAt: { type: 'datetime', required: true },
          featured: { type: 'boolean', required: false }
        }
      },
      items: [
        {
          id: '1',
          slug: 'getting-started-with-spool-cms',
          data: {
            title: 'Getting Started with Spool CMS',
            excerpt: 'Learn how to set up and use Spool CMS for your Next.js projects. This comprehensive guide covers everything from installation to advanced features.',
            author: 'Sarah Chen',
            tags: ['tutorial', 'getting-started', 'cms'],
            publishedAt: '2024-01-15T10:00:00Z',
            featured: true,
            featuredImage: '/api/placeholder/800/400'
          },
          status: 'published',
          createdAt: '2024-01-15T09:00:00Z',
          publishedAt: '2024-01-15T10:00:00Z'
        },
        {
          id: '2',
          slug: 'real-time-editing-features',
          data: {
            title: 'Real-time Editing Features',
            excerpt: 'Discover how Spool\'s real-time editing capabilities can streamline your content workflow and improve collaboration between developers and content creators.',
            author: 'Michael Rodriguez',
            tags: ['features', 'editing', 'collaboration'],
            publishedAt: '2024-01-12T14:30:00Z',
            featured: false,
            featuredImage: '/api/placeholder/800/400'
          },
          status: 'published',
          createdAt: '2024-01-12T13:00:00Z',
          publishedAt: '2024-01-12T14:30:00Z'
        },
        {
          id: '3',
          slug: 'seo-optimization-best-practices',
          data: {
            title: 'SEO Optimization Best Practices',
            excerpt: 'Learn how to leverage Spool\'s built-in SEO features to improve your website\'s search engine rankings and visibility.',
            author: 'Emily Johnson',
            tags: ['seo', 'optimization', 'best-practices'],
            publishedAt: '2024-01-10T16:00:00Z',
            featured: true,
            featuredImage: '/api/placeholder/800/400'
          },
          status: 'published',
          createdAt: '2024-01-10T15:00:00Z',
          publishedAt: '2024-01-10T16:00:00Z'
        },
        {
          id: '4',
          slug: 'building-dynamic-pages',
          data: {
            title: 'Building Dynamic Pages with Collections',
            excerpt: 'A deep dive into creating flexible, schema-driven content structures that scale with your application needs.',
            author: 'David Kim',
            tags: ['collections', 'dynamic-pages', 'architecture'],
            publishedAt: '2024-01-08T11:00:00Z',
            featured: false,
            featuredImage: '/api/placeholder/800/400'
          },
          status: 'published',
          createdAt: '2024-01-08T10:00:00Z',
          publishedAt: '2024-01-08T11:00:00Z'
        }
      ]
    };
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return { collection: null, items: [] };
  }
}

function PostCard({ post }: { post: any }) {
  const publishedDate = new Date(post.data.publishedAt);
  const readingTime = Math.ceil(post.data.excerpt.length / 200); // Rough estimate

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 h-full">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CalendarDays className="h-4 w-4" />
            {publishedDate.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            {readingTime} min read
          </div>
        </div>
        
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CardTitle className="group-hover:text-blue-600 transition-colors">
              {post.data.title}
            </CardTitle>
            {post.data.featured && <Badge variant="secondary">Featured</Badge>}
          </div>
          <CardDescription className="text-base leading-relaxed">
            {post.data.excerpt}
          </CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">
              by {post.data.author}
            </span>
            <div className="flex gap-1">
              {post.data.tags?.slice(0, 2).map((tag: string) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          
          <Link href={`/demo/blog/posts/${post.slug}`}>
            <Button variant="ghost" size="sm" className="group-hover:bg-blue-50 group-hover:text-blue-600">
              Read more
              <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Hero() {
  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20">
      <div className="container mx-auto px-4 text-center">
        <Badge variant="secondary" className="mb-4">
          Spool CMS Demo
        </Badge>
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Welcome to the Demo Blog
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
          This blog demonstrates all the features of Spool CMS including headless API integration, 
          real-time content editing, SEO optimization, and seamless Next.js integration.
        </p>
        
        <div className="flex items-center justify-center gap-4 mb-12">
          <Link href="/admin">
            <Button size="lg" className="shadow-lg">
              <ExternalLink className="h-5 w-5 mr-2" />
              Open CMS Admin
            </Button>
          </Link>
          <Link href="/demo/blog/posts">
            <Button variant="outline" size="lg">
              View All Posts
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
        </div>

        {/* Feature highlights */}
        <div className="grid md:grid-cols-3 gap-6 text-left max-w-4xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg border">
            <h3 className="font-semibold text-gray-900 mb-2">Real-time API</h3>
            <p className="text-gray-600 text-sm">
              Content fetched directly from Spool's headless API with automatic revalidation.
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg border">
            <h3 className="font-semibold text-gray-900 mb-2">SEO Optimized</h3>
            <p className="text-gray-600 text-sm">
              Built-in metadata generation, Open Graph tags, and structured data.
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg border">
            <h3 className="font-semibold text-gray-900 mb-2">Developer Friendly</h3>
            <p className="text-gray-600 text-sm">
              Simple integration with Next.js App Router and TypeScript support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function DemoBlogHome() {
  const { collection, items: posts } = await getBlogPosts();
  const featuredPosts = posts.filter(post => post.data.featured);
  const recentPosts = posts.slice(0, 3);

  return (
    <div>
      <Hero />
      
      {/* Featured Posts */}
      {featuredPosts.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Featured Posts</h2>
              <Link href="/demo/blog/posts">
                <Button variant="outline">
                  View all posts
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              {featuredPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recent Posts */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Recent Posts</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {recentPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Try the CMS Admin</h2>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            See how easy it is to create and manage content with Spool's intuitive admin interface. 
            Create new blog posts, edit existing content, and publish changes in real-time.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/admin">
              <Button size="lg" variant="secondary">
                Open Admin Dashboard
                <ExternalLink className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <Link href="/demo/spool-integration">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-gray-900">
                View Integration Docs
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
} 