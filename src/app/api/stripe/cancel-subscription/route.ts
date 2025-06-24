import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { PLANS } from '@/lib/config/pricing';
import { updateUserLimits } from '@/lib/usage-tracking';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
  typescript: true
});

// Initialize Supabase Admin client (use environment variables)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: NextRequest) {
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
    
    console.log(`Authenticated user for cancellation: ${user.id}`);

    const { subscriptionId } = await req.json();

    if (!subscriptionId) {
      // No Stripe subscription ID: treat this as local trial cancellation
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) {
        console.error('CancelSub: Unauthorized or missing user for trial cancellation');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const { error: updateError } = await supabaseAdmin
        .from('customers')
        .update({ status: 'canceled', plan_id: PLANS.POST_TRIAL, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      if (updateError) {
        console.error('CancelSub: Error updating trial cancellation:', updateError);
        return NextResponse.json({ error: 'Failed to cancel trial' }, { status: 500 });
      }
      
      // Update user limits to POST_TRIAL (restricted) limits
      try {
        await updateUserLimits(supabaseAdmin, user.id, PLANS.POST_TRIAL);
        console.log(`Updated user limits to POST_TRIAL for user ${user.id}`);
      } catch (limitsError) {
        console.error('Error updating user limits after trial cancellation:', limitsError);
        // Don't fail the request if limits update fails
      }
      
      return NextResponse.json({ message: 'Trial cancelled successfully' }, { status: 200 });
    }

    console.log(`Attempting to cancel subscription ${subscriptionId} for user ${user.id}`);

    // Fetch the customer record to double-check ownership
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('stripe_subscription_id, status')
      .eq('user_id', user.id)
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    if (customerError) {
      console.error('Customer lookup error:', customerError);
      return NextResponse.json({ error: 'Error retrieving customer information' }, { status: 500 });
    }
    
    if (!customerData) {
      return NextResponse.json({ error: 'Subscription not found or does not belong to user' }, { status: 404 });
    }

    if (customerData.status !== 'trialing') {
      // Check if it's already canceled
      if (customerData.status === 'canceled') {
        return NextResponse.json({ message: 'Subscription already canceled' }, { status: 200 });
      } else if (customerData.status === 'active') {
        return NextResponse.json({ error: 'Cannot cancel an active subscription this way. Use customer portal.' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Subscription is not in a trial state.' }, { status: 400 });
    }

    // Attempt to cancel the subscription in Stripe
    try {
      // First try to retrieve the subscription to verify it exists
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      console.log('Retrieved subscription:', subscription.id, 'Current status:', subscription.status);
      
      // If subscription exists and is not already canceled, cancel it
      if (subscription.status !== 'canceled') {
        const canceledSubscription = await stripe.subscriptions.cancel(subscriptionId);
        console.log('Stripe subscription cancelled:', canceledSubscription.id, 'New status:', canceledSubscription.status);
      } else {
        console.log('Subscription already canceled in Stripe, proceeding with database update');
      }
    } catch (stripeError: any) {
      console.error('Stripe error:', stripeError);
      
      // Special handling for resource_missing errors
      if (stripeError.code === 'resource_missing') {
        // The subscription doesn't exist in Stripe, but we'll still update our database
        console.log('Subscription not found in Stripe, proceeding with database update anyway');
        // Continue with the flow - don't return an error
      } else {
        // For other Stripe errors, return an error response
        return NextResponse.json({ 
          error: `Stripe error: ${stripeError.message || 'Unknown error'}` 
        }, { status: 500 });
      }
    }

    // Update the customer record in Supabase using Admin client
    const { error: updateError } = await supabaseAdmin
      .from('customers')
      .update({
        status: 'canceled', // Mark as canceled
        plan_id: PLANS.POST_TRIAL, // Set to POST_TRIAL plan
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Supabase admin update error after cancellation:', updateError);
      return NextResponse.json({ error: 'Failed to update subscription status in database' }, { status: 500 });
    }

    // Update user limits to POST_TRIAL (restricted) limits
    try {
      await updateUserLimits(supabaseAdmin, user.id, PLANS.POST_TRIAL);
      console.log(`Updated user limits to POST_TRIAL for user ${user.id}`);
    } catch (limitsError) {
      console.error('Error updating user limits after trial cancellation:', limitsError);
      // Don't fail the request if limits update fails
    }

    console.log(`Successfully cancelled trial and updated DB for user ${user.id}`);

    return NextResponse.json({ message: 'Trial cancelled successfully' });

  } catch (error: any) {
    console.error('Error canceling trial subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
