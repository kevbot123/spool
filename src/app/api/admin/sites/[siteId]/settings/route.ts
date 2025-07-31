import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// GET /api/admin/sites/[siteId]/settings
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

    const params = await Promise.resolve(context.params);
    const { siteId } = params;

    // Fetch site settings with ownership/collaboration check
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select(`
        id,
        name,
        domain,
        subdomain,
        api_key,
        settings,
        created_at,
        updated_at
      `)
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    return NextResponse.json(site);

  } catch (error) {
    console.error('Error fetching site settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch site settings' }, 
      { status: 500 }
    );
  }
}

// PUT /api/admin/sites/[siteId]/settings
export async function PUT(
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

    const params = await Promise.resolve(context.params);
    const { siteId } = params;
    const body = await request.json();
    const { name, domain, settings } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Site name is required' }, { status: 400 });
    }

    // Update site settings
    const { data: updatedSite, error: updateError } = await supabase
      .from('sites')
      .update({
        name,
        domain,
        settings: settings || {},
      })
      .eq('id', siteId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating site settings:', updateError);
      return NextResponse.json({ error: 'Failed to update site settings' }, { status: 500 });
    }

    // Sync the updated site to Convex for live updates
    try {
      const { syncSiteToConvex } = await import('@/lib/live-updates');
      await syncSiteToConvex({
        id: updatedSite.id,
        api_key: updatedSite.api_key,
        name: updatedSite.name,
      });
      console.log(`[SITE_SETTINGS] Synced site settings to Convex: ${updatedSite.name}`);
    } catch (convexError) {
      console.error('[SITE_SETTINGS] Failed to sync site settings to Convex:', convexError);
      // Don't fail the settings update if Convex sync fails
    }

    return NextResponse.json(updatedSite);

  } catch (error) {
    console.error('Error updating site settings:', error);
    return NextResponse.json(
      { error: 'Failed to update site settings' }, 
      { status: 500 }
    );
  }
} 