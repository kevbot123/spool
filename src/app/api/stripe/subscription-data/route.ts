import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/server-auth';
import { getUserSubscriptionData } from '@/lib/stripe/sync';

/**
 * Get subscription data endpoint - uses KV cache for fast access
 * Following Theo's recommendation to have a simple endpoint that exposes sub data
 */
export async function GET(req: NextRequest) {
  try {
    // Get auth token from request
    const token = getAuthFromRequest(req);
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create Supabase client with the token
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: { persistSession: false },
      }
    );

    // Get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    console.log(`[Subscription Data] Getting data for user ${userId}`);
    
    // Get subscription data using our KV-first approach
    const subscriptionData = await getUserSubscriptionData(userId);
    
    if (!subscriptionData) {
      return NextResponse.json({ status: "none" });
    }

    console.log(`[Subscription Data] Returning data for user ${userId}:`, subscriptionData.status);
    return NextResponse.json(subscriptionData);
    
  } catch (error) {
    console.error('Error getting subscription data:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription data' },
      { status: 500 }
    );
  }
} 