import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { PLANS, PLAN_DETAILS } from '@/lib/config/pricing';
import { setStripeCustomerId, syncStripeDataToKV } from '@/lib/stripe/sync';

// Lazy initialization for Stripe client
let stripeClient: any = null;

// Function to get or initialize the Stripe client
function getStripe() {
  if (stripeClient) return stripeClient; // Return existing instance if already initialized
  
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error('Stripe Secret Key is missing');
  }
  
  stripeClient = new Stripe(stripeSecretKey, {
    apiVersion: '2025-05-28.basil',
  });
  return stripeClient;
}

// Lazy initialization for Supabase Admin Client
let supabaseAdminClient: any = null;

// Function to get or initialize the Supabase Admin client
function getSupabaseAdmin() {
  if (supabaseAdminClient) return supabaseAdminClient; // Return existing instance if already initialized
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase URL or Service Role Key is missing');
  }
  
  supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey);
  return supabaseAdminClient;
}

export async function POST(request: Request) {
  try {
    const { id, email, name, paymentMethodId } = await request.json();

    if (!id || !email || !paymentMethodId) {
      return NextResponse.json({ error: 'Missing required fields: id, email, paymentMethodId' }, { status: 400 });
    }

    console.log(`Processing profile/subscription for user: ${id}, email: ${email}`);

    // --- Stripe Operations --- 

    // Initialize Stripe client
    const stripe = getStripe();
    
    // 1. Create Stripe Customer
    console.log('Creating Stripe customer...');
    const customer = await stripe.customers.create({
      email: email,
      name: name, // Use the name provided during sign up
      // Add metadata to link Stripe Customer to Supabase User ID
      metadata: {
        supabaseUserId: id,
      },
    });
    console.log('Stripe customer created:', customer.id);

    // 🔥 CRITICAL FIX: Store customer mapping in KV store
    console.log('Storing customer mapping in KV store...');
    await setStripeCustomerId(id, customer.id);
    console.log('✅ Customer mapping stored in KV store');

    // 2. Attach Payment Method and set as default
    console.log('Attaching payment method...');
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.id,
    });
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
    console.log('Payment method attached and set as default.');

    // 3. Create Stripe Subscription with Trial
    const hobbyPriceId = process.env.STRIPE_HOBBY_PRICE_ID;
    const trialDays = PLAN_DETAILS[PLANS.FREE].trialDays; // Get trial days from config

    if (!hobbyPriceId) {
      throw new Error('STRIPE_HOBBY_PRICE_ID environment variable is not set.');
    }
    if (!trialDays) {
      throw new Error('Trial days not configured for the free/trial plan.');
    }

    console.log(`Creating Stripe subscription for price ${hobbyPriceId} with ${trialDays}-day trial...`);
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: hobbyPriceId }],
      trial_period_days: trialDays,
      // Important: Prevent Stripe from automatically sending invoices for the $0 trial
      // You might want to handle invoices upon actual charge later
      // collection_method: 'charge_automatically', 
      // expand: ['latest_invoice.payment_intent'] // Optional: Useful if you need immediate payment intent status
    });
    console.log('Stripe subscription created:', subscription.id);

    // 🔥 CRITICAL FIX: Sync subscription data to KV store
    console.log('Syncing subscription data to KV store...');
    await syncStripeDataToKV(customer.id);
    console.log('✅ Subscription data synced to KV store');

    // --- Supabase Operations --- 

    // Initialize Supabase Admin client
    const supabaseAdmin = getSupabaseAdmin();
    
    // Note: User is already created in auth.users by Supabase Auth signup
    console.log('User already exists in auth.users from Supabase signup process');

    // Check if customer record already exists for this user
    console.log('Checking for existing customer record...');
    const { data: existingCustomer, error: checkError } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('user_id', id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error checking for existing customer:', checkError);
      throw new Error(`Failed to check for existing customer: ${checkError.message}`);
    }

    if (existingCustomer) {
      console.log('Customer record already exists, updating with new subscription...');
      const { error: updateError } = await supabaseAdmin
        .from('customers')
        .update({
          stripe_customer_id: customer.id,
          stripe_subscription_id: subscription.id,
          plan_id: PLANS.FREE,
          status: 'trialing',
        })
        .eq('user_id', id);

      if (updateError) {
        console.error('Supabase customer record update error:', updateError);
        throw new Error(`Failed to update customer record: ${updateError.message}`);
      }
      console.log('Existing customer record updated successfully.');
    } else {
      console.log('Creating new Supabase customer record...');
      const { error: customerError } = await supabaseAdmin
        .from('customers')
        .insert({
          user_id: id,
          stripe_customer_id: customer.id,
          stripe_subscription_id: subscription.id,
          plan_id: PLANS.FREE,
          status: 'trialing',
        });

      if (customerError) {
        console.error('Supabase customer record insert error:', customerError);
        throw new Error(`Failed to create customer record: ${customerError.message}`);
      }
      console.log('New customer record created successfully.');
    }

    console.log('🎉 User signup complete with KV-first architecture!');
    // --- Success --- 
    return NextResponse.json({ success: true, customerId: customer.id, subscriptionId: subscription.id });

  } catch (error: any) {
    console.error('Error in create-profile-and-subscription:', error);
    // Provide a more specific error message if available
    const errorMessage = error.message || 'An unexpected error occurred during signup processing.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
