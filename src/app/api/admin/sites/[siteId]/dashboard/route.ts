import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// GET /api/admin/sites/[siteId]/dashboard - Get comprehensive dashboard data
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

    // Verify user has access to the site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, name, domain, api_key, user_id, created_at, updated_at, settings')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Check if user is owner or collaborator
    let userRole = 'none';
    if (site.user_id === user.id) {
      userRole = 'owner';
    } else {
      const { data: collaborator } = await supabase
        .from('site_collaborators')
        .select('role')
        .eq('site_id', siteId)
        .eq('user_id', user.id)
        .not('accepted_at', 'is', null)
        .single();

      if (collaborator) {
        userRole = collaborator.role;
      } else {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Get content statistics
    const [
      { count: totalContent },
      { count: publishedContent },
      { count: draftContent },
      { count: collectionsCount }
    ] = await Promise.all([
      supabase.from('content').select('*', { count: 'exact', head: true }).eq('site_id', siteId),
      supabase.from('content').select('*', { count: 'exact', head: true }).eq('site_id', siteId).eq('status', 'published'),
      supabase.from('content').select('*', { count: 'exact', head: true }).eq('site_id', siteId).eq('status', 'draft'),
      supabase.from('collections').select('*', { count: 'exact', head: true }).eq('site_id', siteId)
    ]);

    // Get recent content activity (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data: recentContent, error: recentError } = await supabase
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
      .gte('updated_at', weekAgo.toISOString())
      .order('updated_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('Error fetching recent content:', recentError);
    }

    // Get collaborators
    const { data: collaborators, error: collabError } = await supabase
      .from('site_collaborators')
      .select('id, user_id, role, accepted_at, invited_at')
      .eq('site_id', siteId)
      .not('accepted_at', 'is', null);

    if (collabError) {
      console.error('Error fetching collaborators:', collabError);
    }

    // Get collections with content counts
    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .select(`
        id,
        name,
        slug,
        schema,
        created_at,
        content (
          id,
          status
        )
      `)
      .eq('site_id', siteId)
      .order('created_at', { ascending: false });

    if (collectionsError) {
      console.error('Error fetching collections:', collectionsError);
    }

    // Get Convex live update status and stats
    let liveUpdates = {
      connected: false,
      active_connections: 0,
      last_sync: null,
      total_updates_today: 0,
      error: null,
    };

    try {
      const { ConvexHttpClient } = await import('convex/browser');
      const convex = new ConvexHttpClient(process.env.CONVEX_URL!);
      
      // Check if site exists in Convex
      const convexSite = await convex.query('sites:getSite', { siteId });
      
      if (convexSite) {
        liveUpdates.connected = true;
        liveUpdates.last_sync = convexSite.lastSync;
        
        // Get active connections
        const connections = await convex.query('sites:getActiveConnections', { siteId });
        liveUpdates.active_connections = connections?.length || 0;
        
        // Get today's update count
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayUpdates = await convex.query('sites:getUpdateCount', { 
          siteId, 
          since: today.toISOString() 
        });
        liveUpdates.total_updates_today = todayUpdates || 0;
      }
    } catch (convexError) {
      console.error('[DASHBOARD] Failed to fetch Convex data:', convexError);
      liveUpdates.error = 'Failed to connect to live updates service';
    }

    // Calculate health metrics
    const healthMetrics = {
      content_health: totalContent > 0 ? (publishedContent / totalContent) * 100 : 0,
      activity_score: Math.min(100, (recentContent?.length || 0) * 10),
      live_updates_health: liveUpdates.connected ? 100 : 0,
      overall_health: 0,
    };

    healthMetrics.overall_health = Math.round(
      (healthMetrics.content_health * 0.4) +
      (healthMetrics.activity_score * 0.3) +
      (healthMetrics.live_updates_health * 0.3)
    );

    // Format collections with stats
    const collectionsWithStats = collections?.map(collection => ({
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      total_items: collection.content?.length || 0,
      published_items: collection.content?.filter(c => c.status === 'published').length || 0,
      draft_items: collection.content?.filter(c => c.status === 'draft').length || 0,
      created_at: collection.created_at,
      schema_fields: collection.schema ? Object.keys(collection.schema).length : 0,
    })) || [];

    // Format recent activity
    const recentActivity = recentContent?.map(item => ({
      id: item.id,
      type: 'content',
      action: item.published_at ? 'published' : (item.created_at === item.updated_at ? 'created' : 'updated'),
      collection: item.collections?.name || item.collection,
      collection_slug: item.collections?.slug || item.collection,
      slug: item.slug,
      status: item.status,
      timestamp: item.updated_at,
    })) || [];

    const dashboard = {
      site: {
        id: site.id,
        name: site.name,
        domain: site.domain,
        created_at: site.created_at,
        updated_at: site.updated_at,
        settings: site.settings || {},
      },
      user: {
        role: userRole,
        permissions: {
          can_edit: ['owner', 'admin', 'editor'].includes(userRole),
          can_manage: ['owner', 'admin'].includes(userRole),
          can_delete: userRole === 'owner',
        }
      },
      stats: {
        content: {
          total: totalContent || 0,
          published: publishedContent || 0,
          draft: draftContent || 0,
        },
        collections: collectionsCount || 0,
        collaborators: (collaborators?.length || 0) + 1, // +1 for owner
        recent_activity: recentContent?.length || 0,
      },
      health: healthMetrics,
      live_updates: liveUpdates,
      collections: collectionsWithStats,
      recent_activity: recentActivity,
      api: {
        key_exists: !!site.api_key,
        key_preview: site.api_key ? `${site.api_key.substring(0, 10)}...` : null,
      },
      generated_at: new Date().toISOString(),
    };

    return NextResponse.json(dashboard);

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' }, 
      { status: 500 }
    );
  }
}