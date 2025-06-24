import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/server-auth';
import { getStripeCustomerId, getStripeDataFromKV } from '@/lib/stripe/sync';

/**
 * API endpoint to get subscription data from KV cache
 * This replaces the old complex subscription fetching logic
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log(`[Subscription Data] Getting data for user ${userId}`);
    
    // Get the Stripe customer ID from KV
    const stripeCustomerId = await getStripeCustomerId(userId);
    
    if (!stripeCustomerId) {
      console.log(`[Subscription Data] No Stripe customer ID found for user ${userId}`);
      return NextResponse.json({
        status: 'none',
        subscriptionId: null,
        customerId: null,
        priceId: null,
        currentPeriodEnd: null,
        currentPeriodStart: null,
        cancelAtPeriodEnd: false,
        paymentMethod: null
      });
    }

    // Get subscription data from KV cache
    const subData = await getStripeDataFromKV(stripeCustomerId);
    
    if (!subData) {
      console.log(`[Subscription Data] No subscription data in KV for customer ${stripeCustomerId}`);
      return NextResponse.json({
        status: 'none',
        subscriptionId: null,
        customerId: stripeCustomerId,
        priceId: null,
        currentPeriodEnd: null,
        currentPeriodStart: null,
        cancelAtPeriodEnd: false,
        paymentMethod: null
      });
    }

    console.log(`[Subscription Data] Found subscription data for customer ${stripeCustomerId}`);
    
    // Return the cached subscription data
    if (subData.status === 'none') {
      return NextResponse.json({
        status: 'none',
        subscriptionId: null,
        customerId: stripeCustomerId,
        priceId: null,
        currentPeriodEnd: null,
        currentPeriodStart: null,
        cancelAtPeriodEnd: false,
        paymentMethod: null
      });
    }

    return NextResponse.json({
      status: subData.status,
      subscriptionId: subData.subscriptionId,
      customerId: stripeCustomerId,
      priceId: subData.priceId,
      currentPeriodEnd: subData.currentPeriodEnd 
        ? new Date(subData.currentPeriodEnd * 1000).toISOString() 
        : null,
      currentPeriodStart: subData.currentPeriodStart 
        ? new Date(subData.currentPeriodStart * 1000).toISOString() 
        : null,
      cancelAtPeriodEnd: subData.cancelAtPeriodEnd,
      paymentMethod: subData.paymentMethod
    });

  } catch (error) {
    console.error('[Subscription Data] Error getting subscription data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 