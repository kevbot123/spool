import Stripe from 'stripe';
import type { Stripe as StripeType } from 'stripe';
import { PLANS, PLAN_DETAILS } from '../config/pricing';

// Provide a fallback key in tests to avoid missing env errors
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_FAKE';
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY not set; using test placeholder');
}

// Use any valid recent API version
export const stripe = new Stripe(stripeKey as string, {
  apiVersion: '2023-10-16' as StripeType.LatestApiVersion,
  typescript: true,
});

// Re-export pricing configuration for convenience
export { PLANS, PLAN_DETAILS };

// Helper functions for Stripe integration

/**
 * Creates a Stripe Checkout session for the specified plan
 */
export async function createCheckoutSession(
  planId: string,
  customerId?: string,
  returnUrl?: string,
  clientReferenceId?: string,
  existingSubscriptionId?: string,
  isTrialUpgrade: boolean = false
) {
  console.log(`Creating checkout session for plan=${planId}, customerId=${customerId?.substring(0,8) || 'none'}, clientRef=${clientReferenceId?.substring(0,8) || 'none'}, trialUpgrade=${isTrialUpgrade}`);
  const plan = PLAN_DETAILS[planId as keyof typeof PLAN_DETAILS];
  
  if (!plan) {
    throw new Error(`Invalid plan configuration for plan: ${planId}`);
  }
  // Determine Stripe price ID: for free trials, use the convertsToPlanId price
  let stripePriceId = plan.priceId;
  if (!stripePriceId && plan.convertsToPlanId) {
    const convertPlan = PLAN_DETAILS[plan.convertsToPlanId];
    stripePriceId = convertPlan?.priceId;
  }
  if (!stripePriceId) {
    throw new Error(`Missing Stripe price ID for plan: ${planId}`);
  }

  // Create customer or use existing customer
  let finalCustomerId = customerId;
  if (!customerId) {
    try {
      // Create a new customer if one doesn't exist
      console.log('Creating new Stripe customer for checkout...');
      const customer = await stripe.customers.create({
        metadata: clientReferenceId ? {
          userId: clientReferenceId // Store userId in metadata for easy reference
        } : undefined
      });
      finalCustomerId = customer.id;
      console.log(`Created new Stripe customer: ${finalCustomerId}`);
    } catch (error) {
      console.error('Error creating new Stripe customer:', error);
      throw new Error('Could not create customer. Please try again or contact support.');
    }
  }

  // Prepare checkout session parameters
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: stripePriceId,
        quantity: 1,
      },
    ],
    customer: finalCustomerId,
    client_reference_id: clientReferenceId,
    success_url: `${returnUrl || process.env.NEXT_PUBLIC_APP_URL}/api/stripe/success`,
    cancel_url: `${returnUrl || process.env.NEXT_PUBLIC_APP_URL}/account?canceled=true`,
    ...(plan.trialDays && !isTrialUpgrade ? { subscription_data: { trial_period_days: plan.trialDays } } : {}),
    metadata: {
      planId,
      isTrialUpgrade: isTrialUpgrade ? 'true' : 'false',
      userId: clientReferenceId || ''
    },
  };
  
  console.log(`[Stripe Checkout] Using success_url: ${sessionParams.success_url}`);
  console.log(`[Stripe Checkout] NEXT_PUBLIC_APP_URL from env: ${process.env.NEXT_PUBLIC_APP_URL}`);
  console.log(`[Stripe Checkout] returnUrl param: ${returnUrl || 'none'}`);
  
  // For existing subscriptions
  if (existingSubscriptionId && !isTrialUpgrade) {
    console.log(`Using existing subscription: ${existingSubscriptionId}`);
    // For Stripe API v2023-10-16, attach the existing subscription
    // We'll handle the actual upgrade in the webhook
    console.log(`For subscription ${existingSubscriptionId}, setting checkout success URL with subscription reference`);
    
    // Keep the same success URL - the eager sync will handle any subscription changes
    sessionParams.success_url = `${returnUrl || process.env.NEXT_PUBLIC_APP_URL}/api/stripe/success`;
    
    console.log(`[Stripe Checkout] Updated success_url for existing subscription: ${sessionParams.success_url}`);
    
    // Add subscription ID to metadata for webhook processing
    if (sessionParams.metadata) {
      sessionParams.metadata.existingSubscriptionId = existingSubscriptionId;
    }
  }
  
  // Create checkout session
  const session = await stripe.checkout.sessions.create(sessionParams);

  return session;
}

/**
 * Creates a Stripe Customer Portal session for managing subscriptions
 */
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl?: string,
  flowType?: 'subscription_update' | 'subscription_cancel' | null,
  subscriptionId?: string
) {
  // Build portal session parameters
  const params: Stripe.BillingPortal.SessionCreateParams = {
    customer: customerId,
    return_url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/account?from_portal=true`,
  };
  
  // Use configured portal configuration if provided
  if (process.env.STRIPE_BILLING_PORTAL_CONFIG_ID) {
    params.configuration = process.env.STRIPE_BILLING_PORTAL_CONFIG_ID;
  }
  
  // Add flow_data for deep linking to specific flows
  if (flowType === 'subscription_update' && subscriptionId) {
    params.flow_data = {
      type: 'subscription_update',
      subscription_update: {
        subscription: subscriptionId
      }
    };
  } else if (flowType === 'subscription_cancel' && subscriptionId) {
    params.flow_data = {
      type: 'subscription_cancel',
      subscription_cancel: {
        subscription: subscriptionId
      }
    };
  }
  
  const session = await stripe.billingPortal.sessions.create(params);

  return session;
}
