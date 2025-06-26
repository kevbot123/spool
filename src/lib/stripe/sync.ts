import { Redis } from '@upstash/redis';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Initialize Redis for KV storage (optional for development)
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// Initialize Supabase admin client for user lookups
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Custom Stripe subscription type for consistent KV storage
 * Based on the help doc's recommended type structure
 */
export type STRIPE_SUB_CACHE =
  | {
      subscriptionId: string | null;
      status: Stripe.Subscription.Status;
      priceId: string | null;
      currentPeriodStart: number | null;
      currentPeriodEnd: number | null;
      cancelAtPeriodEnd: boolean;
      paymentMethod: {
        brand: string | null; // e.g., "visa", "mastercard"
        last4: string | null; // e.g., "4242"
      } | null;
    }
  | {
      status: "none";
    };

/**
 * The core function that syncs all Stripe data for a customer to KV
 * This is the single source of truth for subscription state
 * 
 * Following the help doc's recommendation to have ONE function that handles all sync
 */
export async function syncStripeDataToKV(customerId: string): Promise<STRIPE_SUB_CACHE> {
  try {
    console.log(`[syncStripeDataToKV] Syncing data for customer: ${customerId}`);
    
    // Fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: "all",
      expand: ["data.default_payment_method"],
    });

    if (subscriptions.data.length === 0) {
      console.log(`[syncStripeDataToKV] No subscriptions found for customer: ${customerId}`);
      const subData: STRIPE_SUB_CACHE = { status: "none" };
      if (redis) {
        await redis.set(`stripe:customer:${customerId}`, subData);
      }
      return subData;
    }

    // If a user can have multiple subscriptions, that's your problem
    const subscription = subscriptions.data[0];
    console.log(`[syncStripeDataToKV] Found subscription: ${subscription.id} with status: ${subscription.status}`);

    // Store complete subscription state
    // Use type assertion for properties that TypeScript might not recognize
    const sub = subscription as unknown as {
      id: string;
      status: Stripe.Subscription.Status;
      current_period_end: number;
      current_period_start: number;
      cancel_at_period_end: boolean;
      default_payment_method: any;
      items: { data: Array<{ price: { id: string } }> };
    };
    
    const subData: STRIPE_SUB_CACHE = {
      subscriptionId: sub.id,
      status: sub.status,
      priceId: sub.items.data[0].price.id,
      currentPeriodEnd: sub.current_period_end,
      currentPeriodStart: sub.current_period_start,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      paymentMethod:
        sub.default_payment_method &&
        typeof sub.default_payment_method !== "string"
          ? {
              brand: sub.default_payment_method.card?.brand ?? null,
              last4: sub.default_payment_method.card?.last4 ?? null,
            }
          : null,
    };

    // Store the data in KV (if available)
    if (redis) {
      await redis.set(`stripe:customer:${customerId}`, subData);
      console.log(`[syncStripeDataToKV] Successfully synced data for customer: ${customerId}`);
    } else {
      console.log(`[syncStripeDataToKV] Redis not available, skipping KV storage for customer: ${customerId}`);
    }
    
    return subData;
  } catch (error) {
    console.error(`[syncStripeDataToKV] Error syncing data for customer ${customerId}:`, error);
    throw error;
  }
}

/**
 * Get subscription data from KV cache
 */
export async function getStripeDataFromKV(customerId: string): Promise<STRIPE_SUB_CACHE | null> {
  try {
    if (!redis) {
      console.log(`[getStripeDataFromKV] Redis not available, returning null for customer: ${customerId}`);
      return null;
    }
    const data = await redis.get(`stripe:customer:${customerId}`);
    return data as STRIPE_SUB_CACHE | null;
  } catch (error) {
    console.error(`[getStripeDataFromKV] Error getting data for customer ${customerId}:`, error);
    return null;
  }
}

/**
 * Get the Stripe customer ID for a user from KV
 */
export async function getStripeCustomerId(userId: string): Promise<string | null> {
  try {
    if (!redis) {
      // Fall back to Supabase database lookup
      const { data: customerData, error } = await supabaseAdmin
        .from('customers')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single();

      if (error || !customerData) {
        return null;
      }
      return customerData.stripe_customer_id;
    }
    
    const customerId = await redis.get(`stripe:user:${userId}`);
    return customerId as string | null;
  } catch (error) {
    console.error(`[getStripeCustomerId] Error getting customer ID for user ${userId}:`, error);
    return null;
  }
}

/**
 * Store the relationship between user and Stripe customer in KV and database
 */
export async function setStripeCustomerId(userId: string, customerId: string): Promise<void> {
  try {
    // Always store in database for persistence
    const { error } = await supabaseAdmin
      .from('customers')
      .update({ stripe_customer_id: customerId })
      .eq('user_id', userId);

    if (error) {
      console.error(`[setStripeCustomerId] Error updating database for user ${userId}:`, error);
      throw error;
    }

    // Also store in Redis if available for faster access
    if (redis) {
      await redis.set(`stripe:user:${userId}`, customerId);
      console.log(`[setStripeCustomerId] Stored customer ID ${customerId} for user ${userId} in Redis and database`);
    } else {
      console.log(`[setStripeCustomerId] Stored customer ID ${customerId} for user ${userId} in database only`);
    }
  } catch (error) {
    console.error(`[setStripeCustomerId] Error storing customer ID for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get user ID from Stripe customer ID (reverse lookup)
 * Falls back to Supabase customers table if not in KV
 */
export async function getUserIdFromCustomerId(customerId: string): Promise<string | null> {
  try {
    // First try to find in Supabase customers table
    const { data: customerData, error } = await supabaseAdmin
      .from('customers')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (error || !customerData) {
      console.error(`[getUserIdFromCustomerId] Could not find user for customer ${customerId}:`, error);
      return null;
    }

    return customerData.user_id;
  } catch (error) {
    console.error(`[getUserIdFromCustomerId] Error getting user ID for customer ${customerId}:`, error);
    return null;
  }
}

/**
 * Get subscription data for a user (for frontend use)
 * This is the main function your components should use to get subscription state
 * 
 * Following Theo's recommendation to have a simple way to expose sub data to frontend
 */
export async function getUserSubscriptionData(userId: string): Promise<STRIPE_SUB_CACHE | null> {
  try {
    // Get the Stripe customer ID for this user
    const customerId = await getStripeCustomerId(userId);
    
    if (!customerId) {
      console.log(`[getUserSubscriptionData] No customer ID found for user ${userId}`);
      return { status: "none" };
    }

    // Try to get cached data from KV first
    let subData = await getStripeDataFromKV(customerId);
    
    // If no cached data, sync from Stripe and return fresh data
    if (!subData) {
      console.log(`[getUserSubscriptionData] No cached data for customer ${customerId}, syncing from Stripe`);
      subData = await syncStripeDataToKV(customerId);
    }
    
    return subData;
  } catch (error) {
    console.error(`[getUserSubscriptionData] Error getting subscription data for user ${userId}:`, error);
    return { status: "none" };
  }
} 