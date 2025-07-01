import { Suspense } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, Clock, ArrowRight, Search, Filter } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'All Posts - Spool Demo Blog',
  description: 'Browse all blog posts from the Spool CMS demo. Learn about headless CMS features, Next.js integration, and content management best practices.',
  openGraph: {
    title: 'All Posts - Spool Demo Blog',
    description: 'Browse all blog posts from the Spool CMS demo. Learn about headless CMS features, Next.js integration, and content management best practices.',
    type: 'website',
    url: '/demo/blog/posts',
  },
};

async function getAllBlogPosts() {
  try {
    // Mock data representing what would come from the Spool API
    return {
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
            readingTime: 8
          },
          status: 'published'
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
            readingTime: 6
          },
          status: 'published'
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
            readingTime: 10
          },
          status: 'published'
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
            readingTime: 12
          },
          status: 'published'
        },
        {
          id: '5',
          slug: 'api-integration-guide',
          data: {
            title: 'Complete API Integration Guide',
            excerpt: 'Step-by-step instructions for integrating Spool\'s headless API with your Next.js application, including authentication and caching strategies.',
            author: 'Sarah Chen',
            tags: ['api', 'integration', 'authentication'],
            publishedAt: '2024-01-05T09:15:00Z',
            featured: false,
            readingTime: 15
          },
          status: 'published'
        },
        {
          id: '6',
          slug: 'content-modeling-strategies',
          data: {
            title: 'Content Modeling Strategies',
            excerpt: 'Best practices for designing flexible content structures that grow with your business needs and maintain consistency across your site.',
            author: 'Emily Johnson',
            tags: ['content-modeling', 'strategy', 'planning'],
            publishedAt: '2024-01-03T13:45:00Z',
            featured: false,
            readingTime: 9
          },
          status: 'published'
        }
      ],
      total: 6,
      pagination: {
        page: 1,
        limit: 20,
        hasMore: false
      }
    };
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return { items: [], total: 0, pagination: { page: 1, limit: 20, hasMore: false } };
  }
}

function PostCard({ post }: { post: any }) {
  const publishedDate = new Date(post.data.publishedAt);

  return (
    <Card className="group hover:shadow-lg transition-all duration-200">
      <CardHeader>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
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
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <CalendarDays className="h-4 w-4" />
            {publishedDate.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {post.data.readingTime} min read
          </div>
          <span className="font-medium text-gray-700">
            by {post.data.author}
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex gap-1 flex-wrap">
            {post.data.tags?.slice(0, 3).map((tag: string) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
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

function PostsSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex gap-2 mt-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default async function AllPostsPage() {
  const { items: posts, total } = await getAllBlogPosts();
  const allTags = Array.from(new Set(posts.flatMap(post => post.data.tags || [])));
  const featuredPosts = posts.filter(post => post.data.featured);
  const regularPosts = posts.filter(post => !post.data.featured);

  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            All Blog Posts
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Explore all our content about Spool CMS features, tutorials, and best practices.
          </p>
          <div className="mt-6 text-sm text-gray-500">
            {total} posts total
          </div>
        </div>

        {/* Filters & Search (Demo UI - functionality would be added with client components) */}
        <div className="bg-white rounded-lg border p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search posts..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled
                />
              </div>
            </div>
            <Button variant="outline" disabled>
              <Filter className="h-4 w-4 mr-2" />
              Filter by tags
            </Button>
          </div>
          
          {/* Available tags */}
          <div className="mt-4">
            <div className="text-sm text-gray-500 mb-2">Available tags:</div>
            <div className="flex flex-wrap gap-2">
              {allTags.slice(0, 10).map((tag) => (
                <Badge key={tag} variant="outline" className="cursor-pointer hover:bg-gray-50">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Featured Posts */}
        {featuredPosts.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Featured Posts</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {featuredPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        )}

        {/* All Posts */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {featuredPosts.length > 0 ? 'More Posts' : 'All Posts'}
          </h2>
          
          <Suspense fallback={<PostsSkeleton />}>
            <div className="space-y-6">
              {regularPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </Suspense>

          {/* Pagination placeholder */}
          <div className="mt-12 text-center">
            <p className="text-gray-500 text-sm">
              Showing all {total} posts
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Want to create your own blog?
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Use the CMS admin to create new blog posts, edit existing content, and see how easy it is to manage content with Spool.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/admin">
              <Button size="lg">
                Open CMS Admin
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link href="/demo/spool-integration">
              <Button variant="outline" size="lg">
                View Integration Guide
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 