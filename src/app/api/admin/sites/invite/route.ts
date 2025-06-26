import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerUser } from '@/lib/server-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { siteId, email, role, siteName } = await request.json();

    if (!siteId || !email || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the user has permission to invite collaborators to this site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, name, user_id')
      .eq('id', siteId)
      .eq('user_id', user.id)
      .single();

    if (siteError || !site) {
      // Check if user is an admin collaborator
      const { data: collaborator } = await supabase
        .from('site_collaborators')
        .select('role')
        .eq('site_id', siteId)
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .not('accepted_at', 'is', null)
        .single();

      if (!collaborator) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
      }
    }

    // Check if user already exists in Supabase auth
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser.users.find(user => user.email === email);

    let invitedUserId: string | null = null;

    if (userExists) {
      // User exists, check if already a collaborator
      const { data: existingCollaborator } = await supabase
        .from('site_collaborators')
        .select('id')
        .eq('site_id', siteId)
        .eq('user_id', userExists.id)
        .single();

      if (existingCollaborator) {
        return NextResponse.json({ error: 'User is already a collaborator' }, { status: 400 });
      }

      invitedUserId = userExists.id;
    }

    // Create collaboration invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('site_collaborators')
      .insert({
        site_id: siteId,
        user_id: invitedUserId, // Will be null if user doesn't exist yet
        role: role,
        invited_by: user.id,
        invited_at: new Date().toISOString(),
        accepted_at: null // Will be set when user accepts invitation
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating invitation:', inviteError);
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }

    // Send invitation email
    try {
      await sendInvitationEmail({
        email,
        siteName: siteName || site?.name || 'Site',
        inviterEmail: user.email!,
        role,
        invitationId: invitation.id,
        userExists: !!userExists
      });
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      // Don't fail the request if email fails, invitation is still created
    }

    return NextResponse.json({ 
      success: true, 
      message: userExists 
        ? 'Invitation sent to existing user' 
        : 'Invitation sent to new user' 
    });

  } catch (error) {
    console.error('Error in invite API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function sendInvitationEmail({
  email,
  siteName,
  inviterEmail,
  role,
  invitationId,
  userExists
}: {
  email: string;
  siteName: string;
  inviterEmail: string;
  role: string;
  invitationId: string;
  userExists: boolean;
}) {
  // For now, we'll use a simple console log
  // In production, you'd integrate with an email service like Resend, SendGrid, etc.
  
  const inviteUrl = userExists 
    ? `${process.env.NEXT_PUBLIC_APP_URL}/admin/accept-invite?id=${invitationId}`
    : `${process.env.NEXT_PUBLIC_APP_URL}/sign-up?invite=${invitationId}`;

  console.log(`
    === COLLABORATION INVITATION ===
    To: ${email}
    From: ${inviterEmail}
    Site: ${siteName}
    Role: ${role}
    Action: ${userExists ? 'Accept invitation' : 'Sign up and accept invitation'}
    URL: ${inviteUrl}
    ================================
  `);

  // TODO: Implement actual email sending
  // Example with Resend:
  /*
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: 'invitations@yourdomain.com',
    to: email,
    subject: `You've been invited to collaborate on ${siteName}`,
    html: `
      <h2>You've been invited to collaborate!</h2>
      <p>${inviterEmail} has invited you to be a ${role} on <strong>${siteName}</strong>.</p>
      <p><a href="${inviteUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
        ${userExists ? 'Accept Invitation' : 'Sign Up & Accept'}
      </a></p>
    `
  });
  */
} 