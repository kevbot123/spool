import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getCollectionsManager } from '@/lib/cms/collections';

interface RouteParams {
  params: Promise<{
    slug: string;
  }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
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

    // Get user's site
    const { data: sites } = await supabase
      .from('sites')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    const siteId = sites?.[0]?.id;
    if (!siteId) {
      return NextResponse.json({ error: 'No site found' }, { status: 404 });
    }

    const updateData = await request.json();
    const collectionsManager = await getCollectionsManager(siteId);
    
    const updatedCollection = await collectionsManager.updateCollection(slug, updateData);
    
    if (!updatedCollection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }
    
    return NextResponse.json(updatedCollection);
  } catch (error) {
    console.error('Error updating collection:', error);
    return NextResponse.json(
      { error: 'Failed to update collection' }, 
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
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

    // Get user's site
    const { data: sites } = await supabase
      .from('sites')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    const siteId = sites?.[0]?.id;
    if (!siteId) {
      return NextResponse.json({ error: 'No site found' }, { status: 404 });
    }

    const collectionsManager = await getCollectionsManager(siteId);
    await collectionsManager.deleteCollection(slug);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting collection:', error);
    return NextResponse.json(
      { error: 'Failed to delete collection' }, 
      { status: 500 }
    );
  }
} 