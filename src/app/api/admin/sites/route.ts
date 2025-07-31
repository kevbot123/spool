import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SiteManager } from '@/lib/site-management';

// GET /api/admin/sites - List all sites for the authenticated user
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

    const siteManager = new SiteManager(supabase);
    const sites = await siteManager.listUserSites(user.id);

    // Also get sites where user is a collaborator
    const { data: collaboratorSites, error: collabError } = await supabase
      .from('site_collaborators')
      .select(`
        site_id,
        role,
        accepted_at,
        sites!inner (
          id,
          name,
          domain,
          created_at,
          updated_at,
          user_id
        )
      `)
      .eq('user_id', user.id)
      .not('accepted_at', 'is', null);

    if (collabError) {
      console.error('Error fetching collaborator sites:', collabError);
    }

    // Combine owned and collaborator sites
    const allSites = [
      ...sites.map(site => ({ ...site, role: 'owner', is_owner: true })),
      ...(collaboratorSites || []).map(collab => ({
        ...collab.sites,
        role: collab.role,
        is_owner: false,
        collaboration_accepted_at: collab.accepted_at
      }))
    ];

    // Sort by creation date
    allSites.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ sites: allSites });

  } catch (error) {
    console.error('Error fetching sites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sites' }, 
      { status: 500 }
    );
  }
}

// POST /api/admin/sites - Create a new site
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

    const { name, domain, settings } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Site name is required' }, { status: 400 });
    }

    const siteManager = new SiteManager(supabase);
    const site = await siteManager.createSite({
      name,
      user_id: user.id,
    });

    // Update with additional settings if provided
    if (domain || settings) {
      const { data: updatedSite, error: updateError } = await supabase
        .from('sites')
        .update({
          domain,
          settings: settings || {},
        })
        .eq('id', site.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating site settings:', updateError);
        // Continue with the created site even if settings update fails
      } else {
        // Sync updated site to Convex
        try {
          const { syncSiteToConvex } = await import('@/lib/live-updates');
          await syncSiteToConvex({
            id: updatedSite.id,
            api_key: updatedSite.api_key,
            name: updatedSite.name,
          });
        } catch (convexError) {
          console.error('[SITE_CREATE] Failed to sync updated site to Convex:', convexError);
        }
        
        return NextResponse.json({ site: updatedSite });
      }
    }

    return NextResponse.json({ site });

  } catch (error) {
    console.error('Error creating site:', error);
    return NextResponse.json(
      { error: 'Failed to create site' }, 
      { status: 500 }
    );
  }
}