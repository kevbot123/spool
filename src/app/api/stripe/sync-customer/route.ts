import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserIdFromRequest } from '@/lib/server-auth';
import { getStripeCustomerId, getStripeDataFromKV, syncStripeDataToKV } from '@/lib/stripe/sync';
import { updateUserLimits } from '@/lib/usage-tracking';
import { PLANS } from '@/lib/config/pricing';

/**
 * NEW KV-FIRST CUSTOMER SYNC ENDPOINT
 * This replaces the old database-first sync logic to prevent customer ID mismatches
 * 
 * The KV store is the single source of truth for customer relationships
 */
export async function POST(req: NextRequest) {
  try {
    // Get the authenticated user
    const userId = await getUserIdFromRequest(req);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Create a Supabase admin client for database operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false },
      }
    );
    
    console.log(`[SyncCustomer] KV-First customer sync for user ${userId}`);
    
    // STEP 1: Get customer ID from KV store (single source of truth)
    const kvCustomerId = await getStripeCustomerId(userId);
    
    if (!kvCustomerId) {
      console.log(`[SyncCustomer] No customer ID found in KV store for user ${userId}`);
      return NextResponse.json({
        error: 'No customer found - user may need to go through signup/payment flow',
        action: 'no_customer_found'
      }, { status: 404 });
    }
    
    console.log(`[SyncCustomer] Found customer ID in KV: ${kvCustomerId}`);
    
    // STEP 2: Sync latest Stripe data to KV to ensure it's up to date
    let stripeData;
    try {
      stripeData = await syncStripeDataToKV(kvCustomerId);
      console.log(`[SyncCustomer] Synced latest Stripe data for customer ${kvCustomerId}`);
    } catch (syncError) {
      console.error('[SyncCustomer] Error syncing Stripe data:', syncError);
      return NextResponse.json({ 
        error: 'Failed to sync customer data from Stripe' 
      }, { status: 500 });
    }
    
    // STEP 3: Determine the correct plan and status from KV data
    let planId = PLANS.FREE;
    let dbStatus = 'none';
    
    if (stripeData.status !== 'none') {
      // Map Stripe subscription status and price to our plan system
      if (stripeData.status === 'active' || stripeData.status === 'trialing') {
        // Determine plan from price ID
        if (stripeData.priceId === process.env.STRIPE_HOBBY_PRICE_ID) {
          planId = PLANS.HOBBY;
        } else if (stripeData.priceId === process.env.STRIPE_BUSINESS_PRICE_ID) {
          planId = PLANS.BUSINESS;
        } else {
          console.warn(`[SyncCustomer] Unknown price ID ${stripeData.priceId}, defaulting to HOBBY`);
          planId = PLANS.HOBBY;
        }
        
        dbStatus = stripeData.status;
        
        // Handle canceling subscriptions
        if (stripeData.cancelAtPeriodEnd) {
          dbStatus = 'canceling';
        }
      } else if (stripeData.status === 'canceled' || stripeData.status === 'incomplete_expired') {
        planId = PLANS.POST_TRIAL;
        dbStatus = 'canceled';
      } else {
        // Other statuses (past_due, unpaid, etc.)
        dbStatus = stripeData.status;
        planId = PLANS.FREE;
      }
    }
    
    console.log(`[SyncCustomer] Determined plan: ${planId}, status: ${dbStatus}`);
    
    // STEP 4: Update/sync database with KV data (KV is authoritative)
    const { data: existingCustomer, error: fetchError } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('[SyncCustomer] Error fetching existing customer:', fetchError);
    }
    
    // Prepare customer data based on KV state
    const customerData: any = {
      user_id: userId,
      stripe_customer_id: kvCustomerId,
      plan_id: planId,
      status: dbStatus,
      updated_at: new Date().toISOString(),
    };
    
    // Add subscription ID if active
    if (stripeData.status !== 'none') {
      customerData.stripe_subscription_id = stripeData.subscriptionId;
    } else {
      customerData.stripe_subscription_id = null;
    }
    
    // If no existing record, add creation timestamp
    if (!existingCustomer) {
      customerData.created_at = new Date().toISOString();
    }
    
    // Upsert the customer record (sync database with KV state)
    const { error: upsertError } = await supabase
      .from('customers')
      .upsert(customerData, { onConflict: 'user_id' });
    
    if (upsertError) {
      console.error('[SyncCustomer] Error updating customer record:', upsertError);
      return NextResponse.json(
        { error: 'Failed to update database customer record' },
        { status: 500 }
      );
    }
    
    console.log(`[SyncCustomer] Successfully synced database with KV state for customer ${kvCustomerId}`);
    
    // STEP 5: Ensure user limits match the determined plan
    try {
      console.log(`[SyncCustomer] Updating user limits to ${planId}`);
      await updateUserLimits(supabase, userId, planId);
      console.log(`[SyncCustomer] Successfully updated user limits to ${planId}`);
    } catch (limitsError) {
      console.error('[SyncCustomer] Error updating user limits:', limitsError);
      // Continue with response even if limits update fails
    }
    
    return NextResponse.json({
      customerId: kvCustomerId,
      planId: planId,
      status: dbStatus,
      subscriptionId: stripeData.status !== 'none' ? stripeData.subscriptionId : null,
      action: 'kv_first_sync_completed',
      message: 'Customer record synced with KV store data (single source of truth)'
    });
    
  } catch (error) {
    console.error('[SyncCustomer] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during customer sync' },
      { status: 500 }
    );
  }
}
