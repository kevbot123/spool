import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// POST /api/admin/sites/[siteId]/sync - Force sync site to Convex
export async function POST(
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
      .select('id, name, api_key, user_id')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Check if user is owner or admin collaborator
    if (site.user_id !== user.id) {
      const { data: collaborator } = await supabase
        .from('site_collaborators')
        .select('role')
        .eq('site_id', siteId)
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .not('accepted_at', 'is', null)
        .single();

      if (!collaborator) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    const { action } = await request.json();

    let result = { success: false, message: '', details: {} };

    try {
      const { syncSiteToConvex, removeSiteFromConvex } = await import('@/lib/live-updates');

      switch (action) {
        case 'sync':
          // Force sync site to Convex
          await syncSiteToConvex({
            id: site.id,
            api_key: site.api_key,
            name: site.name,
          });
          
          result = {
            success: true,
            message: `Site "${site.name}" successfully synced to Convex`,
            details: {
              site_id: site.id,
              site_name: site.name,
              synced_at: new Date().toISOString(),
            }
          };
          break;

        case 'remove':
          // Remove site from Convex
          await removeSiteFromConvex(site.id);
          
          result = {
            success: true,
            message: `Site "${site.name}" removed from Convex`,
            details: {
              site_id: site.id,
              site_name: site.name,
              removed_at: new Date().toISOString(),
            }
          };
          break;

        case 'reset':
          // Remove and re-sync site
          await removeSiteFromConvex(site.id);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          await syncSiteToConvex({
            id: site.id,
            api_key: site.api_key,
            name: site.name,
          });
          
          result = {
            success: true,
            message: `Site "${site.name}" reset and re-synced to Convex`,
            details: {
              site_id: site.id,
              site_name: site.name,
              reset_at: new Date().toISOString(),
            }
          };
          break;

        default:
          return NextResponse.json({ error: 'Invalid action. Use: sync, remove, or reset' }, { status: 400 });
      }

      console.log(`[SITE_SYNC] ${action} completed for site: ${site.name}`);
      return NextResponse.json(result);

    } catch (convexError) {
      console.error(`[SITE_SYNC] Failed to ${action} site:`, convexError);
      return NextResponse.json({
        success: false,
        message: `Failed to ${action} site: ${convexError.message}`,
        details: {
          site_id: site.id,
          site_name: site.name,
          error: convexError.message,
          attempted_at: new Date().toISOString(),
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in site sync:', error);
    return NextResponse.json(
      { error: 'Failed to sync site' }, 
      { status: 500 }
    );
  }
}

// GET /api/admin/sites/[siteId]/sync - Get sync status
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
      .select('id, name, api_key, user_id, updated_at')
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

    // Check Convex sync status
    let convexStatus = {
      exists: false,
      last_sync: null,
      is_synced: false,
      needs_sync: false,
      error: null,
    };

    try {
      const { ConvexHttpClient } = await import('convex/browser');
      const convex = new ConvexHttpClient(process.env.CONVEX_URL!);
      
      // Check if site exists in Convex
      const convexSite = await convex.query('sites:getSite', { siteId });
      
      if (convexSite) {
        convexStatus.exists = true;
        convexStatus.last_sync = convexSite.lastSync;
        
        // Check if site data is in sync
        const isNameSynced = convexSite.name === site.name;
        const isApiKeySynced = convexSite.apiKey === site.api_key;
        
        convexStatus.is_synced = isNameSynced && isApiKeySynced;
        convexStatus.needs_sync = !convexStatus.is_synced;
        
        // Check if PostgreSQL was updated after last Convex sync
        if (convexStatus.last_sync) {
          const lastSync = new Date(convexStatus.last_sync);
          const lastUpdate = new Date(site.updated_at);
          if (lastUpdate > lastSync) {
            convexStatus.needs_sync = true;
          }
        }
      } else {
        convexStatus.needs_sync = true;
      }
    } catch (convexError) {
      console.error('[SYNC_STATUS] Failed to check Convex status:', convexError);
      convexStatus.error = convexError.message;
    }

    const syncStatus = {
      site: {
        id: site.id,
        name: site.name,
        last_updated: site.updated_at,
      },
      convex: convexStatus,
      recommendations: [],
      checked_at: new Date().toISOString(),
    };

    // Add recommendations based on status
    if (!convexStatus.exists) {
      syncStatus.recommendations.push({
        action: 'sync',
        message: 'Site not found in Convex. Sync required for live updates.',
        priority: 'high'
      });
    } else if (convexStatus.needs_sync) {
      syncStatus.recommendations.push({
        action: 'sync',
        message: 'Site data is out of sync. Sync recommended.',
        priority: 'medium'
      });
    } else if (convexStatus.error) {
      syncStatus.recommendations.push({
        action: 'reset',
        message: 'Error connecting to Convex. Reset may be required.',
        priority: 'high'
      });
    }

    return NextResponse.json(syncStatus);

  } catch (error) {
    console.error('Error checking sync status:', error);
    return NextResponse.json(
      { error: 'Failed to check sync status' }, 
      { status: 500 }
    );
  }
}