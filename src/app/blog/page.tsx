import { getSpoolContent, img, SpoolContent } from '@spoolcms/nextjs';
import Link from 'next/link';
import { Metadata } from 'next';

// Force dynamic rendering and disable all caching
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

export const metadata: Metadata = {
  title: 'From the Blog - Audienceful',
  description: 'Latest posts from the Audienceful blog',
};

export default async function BlogPage() {
  // Add cache-busting timestamp to ensure fresh data
  const timestamp = Date.now();
  console.log(`[BLOG PAGE] Fetching blog content at ${timestamp}`);
  
  const posts: SpoolContent[] = await getSpoolContent({ 
    collection: 'blog',
    // Force no cache
    cache: 'no-store'
  });
  
  console.log(`[BLOG PAGE] Fetched ${posts.length} posts`);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">From the Blog</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/blog/${post.slug}`}
            className="block border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
          >
            {post.image && (
              <img 
                src={img(post.image)} 
                alt={post.title}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-2">{post.title}</h2>
              {post.description && (
                <p className="text-gray-600 mb-4">{post.description}</p>
              )}
              <div className="text-sm text-gray-500">
                <span>{new Date(post.published_at || post.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
} 