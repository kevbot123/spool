import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe';
import { PLANS, PLAN_DETAILS } from '@/lib/config/pricing';
import { getUserIdFromRequest } from '@/lib/server-auth';
import { createServiceClient } from '@/lib/server-auth';
import { updateUserLimits } from '@/lib/usage-tracking';

/**
 * API route to create a Stripe customer for a user
 * This is called when a user logs in if they don't already have a Stripe customer ID
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
    
    // We don't actually need the user's email - we can get it from the JWT
    // or just create a customer without an email (we can update it later)
    // Let's just proceed with creating the customer
    
    // Check if the user already has a Stripe customer ID
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();
      
    if (customerError && customerError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching customer data:', customerError);
      return NextResponse.json(
        { error: 'Error fetching customer data' },
        { status: 500 }
      );
    }
    
    // If user already has a Stripe customer ID, return it
    if (customerData?.stripe_customer_id) {
      return NextResponse.json({
        customerId: customerData.stripe_customer_id,
        message: 'Existing Stripe customer found'
      });
    }
    
    // Create a new Stripe customer with just the user ID in metadata
    // We don't need the email for Stripe to function properly
    const customer = await stripe.customers.create({
      metadata: {
        userId: userId,
      },
    });
    
    // Get current timestamp for trial end date based on config
    const trialDays = PLAN_DETAILS[PLANS.FREE].trialDays || 7;
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + trialDays);
    
    // Upsert the customer record in the database (handles both insert and update)
    const { error: upsertError } = await supabase
      .from('customers')
      .upsert(
        { 
          user_id: userId, 
          stripe_customer_id: customer.id,
          plan_id: PLANS.FREE, // Start with FREE plan
          status: 'trialing',  // Set initial status as trialing
          trial_ends_at: trialEndDate.toISOString(), // Set trial end date
          created_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }
      );
    
    if (upsertError) {
      console.error('Error upserting customer record:', upsertError);
      return NextResponse.json(
        { error: 'Error updating customer record' },
        { status: 500 }
      );
    }
    
    // Initialize user limits with FREE plan limits (will be updated by webhook if user subscribes)
    try {
      console.log(`Initializing user limits for new user ${userId} with FREE plan limits`);
      await updateUserLimits(supabase, userId, PLANS.FREE);
    } catch (limitsError) {
      console.error('Error initializing user limits:', limitsError);
      // Don't fail the entire request if just the limits update fails
      // The webhook should handle this properly later
    }
    
    return NextResponse.json({
      customerId: customer.id,
      message: 'Stripe customer created successfully'
    });
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    return NextResponse.json(
      { error: 'Failed to create Stripe customer' },
      { status: 500 }
    );
  }
}
