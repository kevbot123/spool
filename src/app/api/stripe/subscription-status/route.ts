import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function GET(req: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Extract the token
    const token = authHeader.split(' ')[1];

    // Create a Supabase client with the token
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
      console.error('Error getting user:', userError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the subscription ID from the query parameters
    const url = new URL(req.url);
    const subscriptionId = url.searchParams.get('subscription_id');

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Missing subscription_id parameter' },
        { status: 400 }
      );
    }

    // Verify that the subscription belongs to the user
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    if (customerError || !customerData) {
      console.error('Error verifying subscription ownership:', customerError);
      return NextResponse.json(
        { error: 'Subscription not found or does not belong to user' },
        { status: 404 }
      );
    }

    // Retrieve the subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription;

    // Return the subscription status with cancellation info
    // Use type assertion to access Stripe subscription properties
    const subData = subscription as unknown as {
      id: string;
      status: string;
      cancel_at_period_end: boolean;
      current_period_end: number;
      canceled_at: number | null;
    };
    
    return NextResponse.json({
      id: subData.id,
      status: subData.status,
      cancel_at_period_end: subData.cancel_at_period_end,
      current_period_end: subData.current_period_end 
        ? new Date(subData.current_period_end * 1000).toISOString() 
        : null,
      canceled_at: subData.canceled_at 
        ? new Date(subData.canceled_at * 1000).toISOString() 
        : null
    });
  } catch (error: any) {
    console.error('Error retrieving subscription status:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve subscription status' },
      { status: 500 }
    );
  }
}
