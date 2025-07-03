import { getSpoolContent } from '@spool/nextjs';
import { spoolConfig } from '@/lib/spool';
import Link from 'next/link';

export default async function BlogPage() {
  try {
    // Test fetching blog posts
    const posts = await getSpoolContent(spoolConfig, 'blog');
    
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Blog Posts</h1>
        
        <div className="grid gap-6">
          {posts && posts.length > 0 ? (
            posts.map((post: any) => (
              <div key={post.id} className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
                <h2 className="text-2xl font-bold mb-2">
                  <Link href={`/blog/${post.slug}`} className="hover:text-blue-600">
                    {post.data?.title || 'Untitled'}
                  </Link>
                </h2>
                <p className="text-gray-600 mb-4">{post.data?.description || post.data?.excerpt}</p>
                <div className="text-sm text-gray-500">
                  {post.published_at && (
                    <span>Published: {new Date(post.published_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No blog posts found. This is expected when testing locally.</p>
              <p className="text-sm text-gray-400 mt-2">
                To test with real data, set up your Spool admin and add some blog posts.
              </p>
            </div>
          )}
        </div>
        
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">🧪 Local Testing Info</h3>
          <p className="text-blue-800 text-sm">
            This page is successfully calling the Spool API functions! 
            To see real content, connect this to your Spool admin dashboard.
          </p>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Blog Posts</h1>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="font-semibold text-red-900 mb-2">⚠️ API Error</h3>
          <p className="text-red-800 text-sm">
            Error fetching content: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
          <p className="text-red-700 text-sm mt-2">
            This is expected when testing locally without a real Spool backend.
          </p>
        </div>
      </div>
    );
  }
} 