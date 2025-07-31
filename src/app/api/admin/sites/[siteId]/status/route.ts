import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// GET /api/admin/sites/[siteId]/status - Get real-time status for a site
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
      .select('id, name, api_key, user_id, created_at, updated_at')
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

    // Get content statistics
    const { count: totalContent } = await supabase
      .from('content')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', siteId);

    const { count: publishedContent } = await supabase
      .from('content')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .eq('status', 'published');

    const { count: draftContent } = await supabase
      .from('content')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .eq('status', 'draft');

    // Get collections count
    const { count: collectionsCount } = await supabase
      .from('collections')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', siteId);

    // Get recent activity (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { count: recentActivity } = await supabase
      .from('content')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .gte('updated_at', yesterday.toISOString());

    // Get Convex live update status
    let convexStatus = {
      connected: false,
      active_connections: 0,
      last_sync: null,
      error: null,
    };

    try {
      const { ConvexHttpClient } = await import('convex/browser');
      const convex = new ConvexHttpClient(process.env.CONVEX_URL!);
      
      // Check if site exists in Convex and get connection stats
      const convexSite = await convex.query('sites:getSite', { siteId });
      
      if (convexSite) {
        convexStatus.connected = true;
        convexStatus.last_sync = convexSite.lastSync || null;
        
        // Get active connections for this site
        const connections = await convex.query('sites:getActiveConnections', { siteId });
        convexStatus.active_connections = connections?.length || 0;
      }
    } catch (convexError) {
      console.error('[STATUS] Failed to fetch Convex status:', convexError);
      convexStatus.error = 'Failed to connect to live updates service';
    }

    // Calculate health score based on various factors
    let healthScore = 100;
    
    // Reduce score if no content
    if (totalContent === 0) healthScore -= 20;
    
    // Reduce score if no published content
    if (publishedContent === 0 && totalContent > 0) healthScore -= 15;
    
    // Reduce score if no recent activity
    if (recentActivity === 0) healthScore -= 10;
    
    // Reduce score if Convex is not connected
    if (!convexStatus.connected) healthScore -= 25;
    
    // Reduce score if there's a Convex error
    if (convexStatus.error) healthScore -= 15;

    const status = {
      site: {
        id: site.id,
        name: site.name,
        created_at: site.created_at,
        updated_at: site.updated_at,
      },
      health: {
        score: Math.max(0, healthScore),
        status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical',
      },
      content: {
        total: totalContent || 0,
        published: publishedContent || 0,
        draft: draftContent || 0,
        recent_activity: recentActivity || 0,
      },
      collections: {
        total: collectionsCount || 0,
      },
      live_updates: convexStatus,
      api: {
        key_exists: !!site.api_key,
        key_prefix: site.api_key ? site.api_key.substring(0, 10) + '...' : null,
      },
      last_checked: new Date().toISOString(),
    };

    return NextResponse.json(status);

  } catch (error) {
    console.error('Error fetching site status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch site status' }, 
      { status: 500 }
    );
  }
}