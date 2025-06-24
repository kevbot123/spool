import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getCollectionsManager } from '@/lib/cms/collections';
import { getContentManager } from '@/lib/cms/content';
import { AdminContentProvider } from './provider';

interface PageProps {
  params: Promise<{
    collection: string;
  }>;
}

export const dynamicParams = true; // This is the default, but helps stabilize dev server

// Generate static paths for better performance
export async function generateStaticParams() {
  const collectionsManager = await getCollectionsManager();
  const collections = collectionsManager.getAllCollections();
  
  return collections.map(collection => ({
    collection: collection.slug,
  }));
}

export default async function CollectionPage({ params }: PageProps) {
  const { collection: collectionSlug } = await params;
  const collectionsManager = await getCollectionsManager();
  const contentManager = getContentManager();
  
  const collection = collectionsManager.getCollection(collectionSlug);
  if (!collection) {
    notFound();
  }
  
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // NOTE: Server Components cannot set cookies here.
        // The middleware handles cookie updates based on auth state.
        // set and remove are not needed for read-only session fetching.
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const authToken = session?.access_token || null;
  
  const { items } = await contentManager.listContent(collectionSlug);

  return (
    <div className="h-full">
      <AdminContentProvider
        collection={collection}
        initialItems={items}
        authToken={authToken}
      />
    </div>
  );
}