
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/server-auth'; // Use the server client that reads cookies

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Error getting session in /api/auth/session-info:', error);
      return NextResponse.json({ error: 'Failed to retrieve session information' }, { status: 500 });
    }

    if (!session) {
      console.log('No active session found in /api/auth/session-info');
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Return the access token
    return NextResponse.json({ accessToken: session.access_token });

  } catch (error) {
    console.error('Unexpected error in /api/auth/session-info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
