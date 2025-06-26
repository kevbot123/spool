import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getCollectionsManager, CollectionsManager } from '@/lib/cms/collections';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const collectionData = await request.json();
    const siteId = collectionData.siteId;

    if (!siteId) {
      return NextResponse.json({ error: 'Site ID required' }, { status: 400 });
    }

    // Verify user has access to this site
    const { data: siteAccess } = await supabase
      .from('sites')
      .select('id')
      .eq('id', siteId)
      .eq('user_id', user.id)
      .single();

    if (!siteAccess) {
      // Check if user is a collaborator
      const { data: collaboration } = await supabase
        .from('site_collaborators')
        .select('id')
        .eq('site_id', siteId)
        .eq('user_id', user.id)
        .not('accepted_at', 'is', null)
        .single();

      if (!collaboration) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const collectionsManager = new CollectionsManager();
    await collectionsManager.initialize(siteId);
    
    const newCollection = await collectionsManager.createCollection(siteId, collectionData);
    
    return NextResponse.json(newCollection);
  } catch (error) {
    console.error('Error creating collection:', error);
    return NextResponse.json(
      { error: 'Failed to create collection' }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get siteId from query parameter
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');

    if (!siteId) {
      return NextResponse.json({ error: 'Site ID required' }, { status: 400 });
    }

    // Verify user has access to this site
    const { data: siteAccess } = await supabase
      .from('sites')
      .select('id')
      .eq('id', siteId)
      .eq('user_id', user.id)
      .single();

    if (!siteAccess) {
      // Check if user is a collaborator
      const { data: collaboration } = await supabase
        .from('site_collaborators')
        .select('id')
        .eq('site_id', siteId)
        .eq('user_id', user.id)
        .not('accepted_at', 'is', null)
        .single();

      if (!collaboration) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Always get a fresh collections manager to ensure we're getting the right site's collections
    const collectionsManager = new CollectionsManager();
    await collectionsManager.initialize(siteId);
    const collections = collectionsManager.getAllCollections();
    
    return NextResponse.json({ collections });
  } catch (error) {
    console.error('Error fetching collections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collections' }, 
      { status: 500 }
    );
  }
} 