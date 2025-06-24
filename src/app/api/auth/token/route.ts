import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/database.types';

/**
 * API route to get the user's JWT token
 * Used by client-side components that need to make authenticated requests
 */
export async function GET() {
  try {
    // Create a Supabase client
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });
    
    // Get the user's session
    const { data: { session } } = await supabase.auth.getSession();
    
    // If no session, return null token for smoke tests
    if (!session) {
      return NextResponse.json({ token: null });
    }
    
    // Return the access token or null
    return NextResponse.json({ token: session.access_token ?? null });
  } catch (error) {
    console.error('Error getting auth token:', error);
    return NextResponse.json(
      { error: 'Failed to get authentication token' },
      { status: 500 }
    );
  }
}
