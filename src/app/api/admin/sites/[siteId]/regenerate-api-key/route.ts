import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';

// POST /api/admin/sites/[siteId]/regenerate-api-key
export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string } }
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

    const { siteId } = params;

    // Verify user has access to the site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, user_id')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Check if user is the owner or has admin access
    if (site.user_id !== user.id) {
      // Check if user is a collaborator with admin role
      const { data: collaborator } = await supabase
        .from('site_collaborators')
        .select('role')
        .eq('site_id', siteId)
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (!collaborator) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    // Generate new API key
    const newApiKey = `spool_${nanoid(32)}`;

    // Update the site with new API key
    const { data: updatedSite, error: updateError } = await supabase
      .from('sites')
      .update({ api_key: newApiKey })
      .eq('id', siteId)
      .select('api_key, name')
      .single();

    if (updateError) {
      console.error('Error updating API key:', updateError);
      return NextResponse.json({ error: 'Failed to regenerate API key' }, { status: 500 });
    }

    // Sync the updated API key to Convex for live updates
    try {
      const { syncSiteToConvex } = await import('@/lib/live-updates');
      await syncSiteToConvex({
        id: siteId,
        api_key: updatedSite.api_key,
        name: updatedSite.name,
      });
      console.log(`[API_KEY_REGEN] Synced new API key to Convex: ${updatedSite.name}`);
    } catch (convexError) {
      console.error('[API_KEY_REGEN] Failed to sync API key to Convex:', convexError);
      // Don't fail the API key regeneration if Convex sync fails
    }

    return NextResponse.json({ api_key: updatedSite.api_key });

  } catch (error) {
    console.error('Error regenerating API key:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate API key' }, 
      { status: 500 }
    );
  }
} 