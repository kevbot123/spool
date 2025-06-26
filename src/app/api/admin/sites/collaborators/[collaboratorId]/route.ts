import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerUser } from '@/lib/server-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(
  request: NextRequest,
  { params }: { params: { collaboratorId: string } }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { collaboratorId } = params;

    if (!collaboratorId) {
      return NextResponse.json({ error: 'Collaborator ID required' }, { status: 400 });
    }

    // Get the collaboration record to verify permissions
    const { data: collaboration, error: collabError } = await supabase
      .from('site_collaborators')
      .select('site_id, user_id, role')
      .eq('id', collaboratorId)
      .single();

    if (collabError || !collaboration) {
      return NextResponse.json({ error: 'Collaboration not found' }, { status: 404 });
    }

    // Verify the current user has permission to remove this collaborator
    // Either they're the site owner or an admin
    const { data: site } = await supabase
      .from('sites')
      .select('user_id')
      .eq('id', collaboration.site_id)
      .single();

    const isOwner = site?.user_id === user.id;

    if (!isOwner) {
      // Check if current user is an admin collaborator
      const { data: currentUserCollab } = await supabase
        .from('site_collaborators')
        .select('role')
        .eq('site_id', collaboration.site_id)
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .not('accepted_at', 'is', null)
        .single();

      if (!currentUserCollab) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
      }
    }

    // Prevent removing the site owner
    if (collaboration.user_id === site?.user_id) {
      return NextResponse.json({ error: 'Cannot remove site owner' }, { status: 400 });
    }

    // Remove the collaborator
    const { error: deleteError } = await supabase
      .from('site_collaborators')
      .delete()
      .eq('id', collaboratorId);

    if (deleteError) {
      console.error('Error removing collaborator:', deleteError);
      return NextResponse.json({ error: 'Failed to remove collaborator' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Collaborator removed successfully' });

  } catch (error) {
    console.error('Error in remove collaborator API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 