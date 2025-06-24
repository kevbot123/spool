import { getCollectionsManager } from '@/lib/cms/collections';
import { getContentManager } from '@/lib/cms/content';
import Link from 'next/link';

export default async function AdminDashboard() {
  const collectionsManager = await getCollectionsManager();
  const contentManager = getContentManager();
  const collections = collectionsManager.getAllCollections();
  
  // Get content counts for each collection
  const collectionStats = await Promise.all(
    collections.map(async (collection) => {
      const { total } = await contentManager.listContent(collection.slug);
      return {
        collection,
        count: total
      };
    })
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Welcome to your CMS admin panel. Manage your content collections below.
        </p>
      </div>

      {/* Collection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {collectionStats.map(({ collection, count }) => (
          <Link
            key={collection.slug}
            href={`/admin/collections/${collection.slug}`}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {collection.name}
              </h3>
              <span className="text-2xl font-bold text-primary">
                {count}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {count === 1 ? 'item' : 'items'} in collection
            </p>
            <div className="mt-4 flex items-center text-sm text-primary">
              <span>Manage collection</span>
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-12">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/admin/collections/blog"
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Blog Post
          </Link>
          <Link
            href="/admin/collections/docs"
            className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            New Documentation
          </Link>
          <Link
            href="/sitemap.xml"
            target="_blank"
            className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            View Sitemap
          </Link>
        </div>
      </div>
    </div>
  );
} 