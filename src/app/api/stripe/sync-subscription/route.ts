import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PLANS, PLAN_DETAILS } from '@/lib/config/pricing';
import { getStripeCustomerId, getStripeDataFromKV, syncStripeDataToKV } from '@/lib/stripe/sync';
import { updateUserLimits } from '@/lib/usage-tracking';

/**
 * NEW KV-FIRST SYNC ENDPOINT
 * This replaces the old database-first sync logic with KV-first approach
 * following the new Stripe implementation patterns
 */
export async function GET(req: NextRequest) {
  try {
    // Initialize Supabase admin client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Authenticate request
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = user.id;
    console.log(`[SyncSub] KV-First sync for user ${userId}`);

    // Get the Stripe customer ID from KV (single source of truth)
    const stripeCustomerId = await getStripeCustomerId(userId);
    
    if (!stripeCustomerId) {
      console.log(`[SyncSub] No Stripe customer ID found for user ${userId}`);
      return NextResponse.json({
        status: 'none',
        plan_id: PLANS.FREE,
        subscription_id: null,
        customer_id: null,
        synced: true
      });
    }

    // Sync latest Stripe data to KV (this is our single source of truth)
    console.log(`[SyncSub] Syncing latest Stripe data for customer ${stripeCustomerId}`);
    let stripeData;
    
    try {
      stripeData = await syncStripeDataToKV(stripeCustomerId);
    } catch (syncError) {
      console.error('[SyncSub] Error syncing Stripe data to KV:', syncError);
      return NextResponse.json({ error: 'Failed to sync Stripe data' }, { status: 500 });
    }

    // Determine plan ID from KV data
    let planId = PLANS.FREE;
    let dbStatus = 'none';
    
    if (stripeData.status !== 'none') {
      dbStatus = stripeData.status;
      
      // For UI purposes, trial users should show as FREE plan regardless of price ID
      if (stripeData.status === 'trialing') {
        console.log(`[SyncSub] User is trialing, setting plan_id to FREE for UI display`);
        planId = PLANS.FREE;
      } else if (stripeData.status === 'active') {
        // Only active users get the full plan from their price ID
        if (stripeData.priceId === process.env.STRIPE_HOBBY_PRICE_ID) {
          planId = PLANS.HOBBY;
        } else if (stripeData.priceId === process.env.STRIPE_BUSINESS_PRICE_ID) {
          planId = PLANS.BUSINESS;
        } else {
          console.warn(`[SyncSub] Unknown price ID ${stripeData.priceId}, defaulting to HOBBY`);
          planId = PLANS.HOBBY;
        }
      } else if (stripeData.status === 'canceled' || stripeData.status === 'incomplete_expired') {
        planId = PLANS.POST_TRIAL;
        dbStatus = 'canceled';
      } else {
        // Other statuses (past_due, unpaid, etc.)
        planId = PLANS.FREE;
      }
      
      // Handle canceling subscriptions
      if (stripeData.cancelAtPeriodEnd) {
        dbStatus = 'canceling';
      }
    }

    console.log(`[SyncSub] Determined plan: ${planId}, status: ${dbStatus}`);

    // Check and update user limits to match the determined plan
    console.log(`[SyncSub] Checking and updating user limits for user ${userId} to plan ${planId}`);
    
    try {
      // Get current user limits to check if update is needed
      const { data: currentLimits, error: limitsError } = await supabase
        .from('user_limits')
        .select('plan_id')
        .eq('user_id', userId)
        .single();
      
      if (limitsError && limitsError.code !== 'PGRST116') {
        console.error('[SyncSub] Error fetching current user limits:', limitsError);
      }
      
      const currentPlanId = currentLimits?.plan_id;
      
      if (currentPlanId !== planId) {
        console.log(`[SyncSub] User limits out of sync. Current: ${currentPlanId}, Expected: ${planId}. Updating...`);
        await updateUserLimits(supabase, userId, planId);
        console.log(`[SyncSub] Successfully updated user limits to ${planId}`);
      } else {
        console.log(`[SyncSub] User limits already in sync with plan ${planId}`);
      }
    } catch (limitsUpdateError) {
      console.error('[SyncSub] Error updating user limits:', limitsUpdateError);
      // Don't fail the entire request if limits update fails
    }

    // Prepare response data
    const responseData = {
      status: dbStatus,
      plan_id: planId,
      subscription_id: stripeData.status !== 'none' ? stripeData.subscriptionId : null,
      customer_id: stripeCustomerId,
      synced: true,
      current_period_end: stripeData.status !== 'none' && stripeData.currentPeriodEnd ? 
        new Date(stripeData.currentPeriodEnd * 1000).toISOString() : null,
      cancel_at_period_end: stripeData.status !== 'none' ? stripeData.cancelAtPeriodEnd : false,
      payment_method: stripeData.status !== 'none' ? stripeData.paymentMethod : null,
      trial_ends_at: null // Will be set below for trial users
    };

    // Debug logging for date conversion
    if (stripeData.status !== 'none' && stripeData.currentPeriodEnd && responseData.current_period_end) {
      console.log(`[SyncSub] Date conversion debug:`, {
        rawTimestamp: stripeData.currentPeriodEnd,
        convertedDate: responseData.current_period_end,
        daysFromNow: Math.ceil((new Date(responseData.current_period_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      });
    }

    // For trial users, get trial_ends_at from database
    if (dbStatus === 'trialing') {
      try {
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('trial_ends_at')
          .eq('user_id', userId)
          .single();
        
        if (!customerError && customerData?.trial_ends_at) {
          responseData.trial_ends_at = customerData.trial_ends_at;
          console.log(`[SyncSub] Added trial_ends_at for trial user: ${customerData.trial_ends_at}`);
        } else {
          console.warn('[SyncSub] Could not fetch trial_ends_at for trial user:', customerError);
        }
      } catch (trialError) {
        console.error('[SyncSub] Error fetching trial_ends_at:', trialError);
      }
    }

    console.log(`[SyncSub] KV-First sync complete for user ${userId}:`, {
      status: responseData.status,
      plan_id: responseData.plan_id,
      subscription_id: responseData.subscription_id
    });

    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('[SyncSub] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error during sync' 
    }, { status: 500 });
  }
}
