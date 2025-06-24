import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import { getUserIdFromRequest } from '@/lib/server-auth'
import { PLANS } from '@/lib/config/pricing'

/**
 * API route to get the latest subscription data for a user
 * This is called after a successful checkout to ensure we have the latest plan data
 */
export async function GET(req: NextRequest) {
  try {
    // Get the authenticated user
    const userId = await getUserIdFromRequest(req)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Create a Supabase admin client for database operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false },
      }
    )
    
    // Handle a post-checkout refresh by session_id param
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('session_id')
    if (sessionId) {
      // Retrieve the checkout session to get subscription ID and plan
      const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId)
      const subscriptionId = typeof checkoutSession.subscription === 'string'
        ? checkoutSession.subscription
        : checkoutSession.subscription?.id
      // Determine planId from session metadata
      let planId = checkoutSession.metadata?.planId
      if (!planId) {
        planId = PLANS.FREE
      }
      // Update customer record with new subscription
      const { error: updateError } = await supabase
        .from('customers')
        .update({ stripe_subscription_id: subscriptionId, plan_id: planId, status: 'active' })
        .eq('user_id', userId)
      if (updateError) console.error('Error updating subscription record:', updateError)
      return NextResponse.json({ plan_id: planId, status: 'active', subscription_id: subscriptionId, customer_id: checkoutSession.customer })
    }
    
    // Get the customer data
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('stripe_customer_id, stripe_subscription_id, plan_id, status')
      .eq('user_id', userId)
      .single()
    
    if (customerError) {
      console.error('Error getting customer data:', customerError)
      return NextResponse.json(
        { error: 'Customer data not found' },
        { status: 404 }
      )
    }
    
    // If we have a subscription ID, fetch the latest data from Stripe
    if (customerData.stripe_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          customerData.stripe_subscription_id,
          { expand: ['items.data.price.product'] }
        )
        
        // Determine the plan ID from the subscription metadata or price
        let planId = subscription.metadata?.planId;
        if (!planId) {
          const priceId = subscription.items.data[0]?.price.id;
          if (priceId === process.env.STRIPE_HOBBY_PRICE_ID) {
            planId = PLANS.HOBBY;
          } else if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) {
            planId = PLANS.BUSINESS;
          } else {
            planId = PLANS.FREE;
          }
        }
        
        // Update the database with the latest plan and status
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            status: subscription.status,
            plan_id: planId,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
        
        if (updateError) {
          console.error('Error updating customer status:', updateError)
        }
        
        // Return the latest plan data
        return NextResponse.json({
          plan_id: planId,
          status: subscription.status,
          subscription_id: customerData.stripe_subscription_id,
          customer_id: customerData.stripe_customer_id
        })
      } catch (error) {
        console.error('Error retrieving subscription from Stripe:', error)
      }
    }
    
    // If we couldn't get updated data from Stripe, return what we have in the database
    return NextResponse.json({
      plan_id: customerData.plan_id,
      status: customerData.status,
      subscription_id: customerData.stripe_subscription_id,
      customer_id: customerData.stripe_customer_id
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
