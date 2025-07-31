import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// GET /api/admin/sites/[siteId]/activity - Get real-time activity for a site
export async function GET(
  request: NextRequest,
  context: { params: { siteId: string } }
) {
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

    const { siteId } = context.params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const since = searchParams.get('since'); // ISO timestamp

    // Verify user has access to the site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, name, user_id')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Check if user is owner or collaborator
    if (site.user_id !== user.id) {
      const { data: collaborator } = await supabase
        .from('site_collaborators')
        .select('role')
        .eq('site_id', siteId)
        .eq('user_id', user.id)
        .not('accepted_at', 'is', null)
        .single();

      if (!collaborator) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Get recent content activity
    let contentQuery = supabase
      .from('content')
      .select(`
        id,
        slug,
        collection,
        status,
        created_at,
        updated_at,
        published_at,
        collections!inner (
          name,
          slug
        )
      `)
      .eq('site_id', siteId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (since) {
      contentQuery = contentQuery.gte('updated_at', since);
    }

    const { data: contentActivity, error: contentError } = await contentQuery;

    if (contentError) {
      console.error('Error fetching content activity:', contentError);
      return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
    }

    // Get Convex live update stats
    let liveUpdateStats = null;
    try {
      const { ConvexHttpClient } = await import('convex/browser');
      const convex = new ConvexHttpClient(process.env.CONVEX_URL!);
      
      // Get live update statistics for this site
      liveUpdateStats = await convex.query('sites:getSiteStats', { siteId });
    } catch (convexError) {
      console.error('[ACTIVITY] Failed to fetch Convex stats:', convexError);
      // Continue without live update stats
    }

    // Format activity data
    const activity = contentActivity?.map(item => ({
      id: item.id,
      type: 'content',
      action: item.published_at ? 'published' : (item.created_at === item.updated_at ? 'created' : 'updated'),
      collection: item.collections?.name || item.collection,
      collection_slug: item.collections?.slug || item.collection,
      slug: item.slug,
      status: item.status,
      timestamp: item.updated_at,
      created_at: item.created_at,
      published_at: item.published_at,
    })) || [];

    return NextResponse.json({
      site: {
        id: site.id,
        name: site.name,
      },
      activity,
      stats: {
        total_items: activity.length,
        live_updates: liveUpdateStats,
        last_updated: activity[0]?.timestamp || null,
      }
    });

  } catch (error) {
    console.error('Error fetching site activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch site activity' }, 
      { status: 500 }
    );
  }
}