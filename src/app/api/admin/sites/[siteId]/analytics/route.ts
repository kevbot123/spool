import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// GET /api/admin/sites/[siteId]/analytics - Get analytics for a site
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
    const period = searchParams.get('period') || '7d'; // 1d, 7d, 30d, 90d
    const timezone = searchParams.get('timezone') || 'UTC';

    // Verify user has access to the site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, name, user_id, created_at')
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

    // Calculate date range based on period
    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '1d':
        startDate.setDate(now.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    // Get content creation/update analytics
    const { data: contentActivity, error: contentError } = await supabase
      .from('content')
      .select('created_at, updated_at, status, collection')
      .eq('site_id', siteId)
      .gte('created_at', startDate.toISOString());

    if (contentError) {
      console.error('Error fetching content analytics:', contentError);
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }

    // Process content activity by day
    const dailyActivity = new Map<string, {
      date: string;
      created: number;
      updated: number;
      published: number;
    }>();

    // Initialize all days in the period
    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      dailyActivity.set(dateKey, {
        date: dateKey,
        created: 0,
        updated: 0,
        published: 0,
      });
    }

    // Process content activity
    contentActivity?.forEach(item => {
      const createdDate = new Date(item.created_at).toISOString().split('T')[0];
      const updatedDate = new Date(item.updated_at).toISOString().split('T')[0];

      // Count creations
      if (dailyActivity.has(createdDate)) {
        dailyActivity.get(createdDate)!.created++;
      }

      // Count updates (only if different from creation date)
      if (createdDate !== updatedDate && dailyActivity.has(updatedDate)) {
        dailyActivity.get(updatedDate)!.updated++;
      }

      // Count publications
      if (item.status === 'published' && dailyActivity.has(createdDate)) {
        dailyActivity.get(createdDate)!.published++;
      }
    });

    // Get collection analytics
    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .select(`
        id,
        name,
        slug,
        content (
          id,
          status,
          created_at
        )
      `)
      .eq('site_id', siteId);

    if (collectionsError) {
      console.error('Error fetching collection analytics:', collectionsError);
    }

    const collectionStats = collections?.map(collection => ({
      name: collection.name,
      slug: collection.slug,
      total_items: collection.content?.length || 0,
      published_items: collection.content?.filter(c => c.status === 'published').length || 0,
      draft_items: collection.content?.filter(c => c.status === 'draft').length || 0,
      recent_items: collection.content?.filter(c => 
        new Date(c.created_at) >= startDate
      ).length || 0,
    })) || [];

    // Get Convex live update analytics
    let liveUpdateAnalytics = {
      total_updates: 0,
      unique_connections: 0,
      avg_connection_time: 0,
      peak_concurrent_connections: 0,
      error_rate: 0,
    };

    try {
      const { ConvexHttpClient } = await import('convex/browser');
      const convex = new ConvexHttpClient(process.env.CONVEX_URL!);
      
      // Get live update analytics for this site
      const analytics = await convex.query('sites:getSiteAnalytics', { 
        siteId,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
      });
      
      if (analytics) {
        liveUpdateAnalytics = analytics;
      }
    } catch (convexError) {
      console.error('[ANALYTICS] Failed to fetch Convex analytics:', convexError);
      // Continue without live update analytics
    }

    // Calculate summary statistics
    const totalCreated = Array.from(dailyActivity.values()).reduce((sum, day) => sum + day.created, 0);
    const totalUpdated = Array.from(dailyActivity.values()).reduce((sum, day) => sum + day.updated, 0);
    const totalPublished = Array.from(dailyActivity.values()).reduce((sum, day) => sum + day.published, 0);

    const analytics = {
      site: {
        id: site.id,
        name: site.name,
        created_at: site.created_at,
      },
      period: {
        start: startDate.toISOString(),
        end: now.toISOString(),
        days: Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
      },
      summary: {
        content_created: totalCreated,
        content_updated: totalUpdated,
        content_published: totalPublished,
        avg_daily_activity: Math.round((totalCreated + totalUpdated) / Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))),
      },
      daily_activity: Array.from(dailyActivity.values()).sort((a, b) => a.date.localeCompare(b.date)),
      collections: collectionStats,
      live_updates: liveUpdateAnalytics,
      generated_at: now.toISOString(),
    };

    return NextResponse.json(analytics);

  } catch (error) {
    console.error('Error fetching site analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch site analytics' }, 
      { status: 500 }
    );
  }
}