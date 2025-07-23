import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// DELETE /api/admin/sites/[siteId]
export async function DELETE(
  _request: NextRequest,
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

    // Auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { siteId } = context.params;

    // Verify that the user is the owner of the site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, user_id')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    if (site.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete site (cascade foreign keys in DB handle related data)
    const { error: deleteError } = await supabase.from('sites').delete().eq('id', siteId);
    if (deleteError) {
      console.error('Error deleting site:', deleteError);
      return NextResponse.json({ error: 'Failed to delete site' }, { status: 500 });
    }

    // Count remaining sites (owned or collaborator)
    const { count: ownedCount } = await supabase
      .from('sites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: collabCount } = await supabase
      .from('site_collaborators')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('accepted_at', 'is', null);

    const remainingSiteCount = (ownedCount || 0) + (collabCount || 0);

    return NextResponse.json({ success: true, remainingSiteCount });
  } catch (error) {
    console.error('Error deleting site:', error);
    return NextResponse.json({ error: 'Failed to delete site' }, { status: 500 });
  }
}
