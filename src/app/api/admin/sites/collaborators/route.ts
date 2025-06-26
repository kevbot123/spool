import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');

    if (!siteId) {
      return NextResponse.json({ error: 'Site ID is required' }, { status: 400 });
    }

    // Get collaborators
    const { data: collaborators, error } = await supabaseAdmin
      .from('site_collaborators')
      .select('id, user_id, role, accepted_at, invited_at, invited_by')
      .eq('site_id', siteId);

    if (error) {
      console.error('Error fetching collaborators:', error);
      return NextResponse.json({ error: 'Failed to fetch collaborators' }, { status: 500 });
    }

    // Get the site owner
    const { data: site, error: siteError } = await supabaseAdmin
      .from('sites')
      .select('user_id')
      .eq('id', siteId)
      .single();

    if (siteError) {
      console.error('Error fetching site:', siteError);
      return NextResponse.json({ error: 'Failed to fetch site' }, { status: 500 });
    }

    // Get all unique user IDs
    const userIds = new Set([site.user_id]);
    collaborators?.forEach(collab => {
      userIds.add(collab.user_id);
      if (collab.invited_by) userIds.add(collab.invited_by);
    });

    // Fetch user emails using admin client
    const userEmails: Record<string, string> = {};
    for (const userId of userIds) {
      try {
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (!userError && userData.user?.email) {
          userEmails[userId] = userData.user.email;
        }
      } catch (error) {
        console.error(`Error fetching user ${userId}:`, error);
      }
    }

    // Build response with all collaborators including owner
    const allCollaborators = [];

    // Add site owner
    if (site && userEmails[site.user_id]) {
      allCollaborators.push({
        id: 'owner',
        user_id: site.user_id,
        email: userEmails[site.user_id],
        role: 'owner',
        accepted_at: 'owner',
        invited_at: 'owner'
      });
    }

    // Add collaborators
    if (collaborators) {
      collaborators.forEach(collab => {
        allCollaborators.push({
          id: collab.id,
          user_id: collab.user_id,
          email: userEmails[collab.user_id] || 'Unknown',
          role: collab.role,
          accepted_at: collab.accepted_at,
          invited_at: collab.invited_at,
          invited_by_email: collab.invited_by ? userEmails[collab.invited_by] : undefined
        });
      });
    }

    return NextResponse.json(allCollaborators);
  } catch (error) {
    console.error('Error in collaborators API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 