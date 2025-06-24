import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createCheckoutSession, stripe } from '@/lib/stripe'
import { PLANS } from '@/lib/config/pricing'
import { getStripeCustomerId, setStripeCustomerId } from '@/lib/stripe/sync'

export async function POST(req: NextRequest) {
  try {
    const { planId, existingSubscriptionId, immediateUpgrade } = await req.json()
    
    // Validate the plan ID
    if (!Object.values(PLANS).includes(planId)) {
      return NextResponse.json(
        { error: 'Invalid plan ID' },
        { status: 400 }
      )
    }

    // Get the authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Extract the token
    const token = authHeader.split(' ')[1]

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
    )

    // Get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('Error getting user:', userError)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log(`[Create Checkout] Processing for user ${user.id}, plan ${planId}`)

    // Get the Stripe customer ID from KV store first
    let stripeCustomerId = await getStripeCustomerId(user.id)

    // Create a new Stripe customer if this user doesn't have one
    if (!stripeCustomerId) {
      console.log(`[Create Checkout] Creating new Stripe customer for user ${user.id}`)
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id, // DO NOT FORGET THIS
        },
      })

      // Store the relation between userId and stripeCustomerId in KV
      await setStripeCustomerId(user.id, newCustomer.id)
      stripeCustomerId = newCustomer.id
      console.log(`[Create Checkout] Created and stored customer ${stripeCustomerId} for user ${user.id}`)
    }

    // Get the customer data from Supabase for additional context
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('stripe_customer_id, stripe_subscription_id, status')
      .eq('user_id', user.id)
      .single()

    if (customerError && customerError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error getting customer:', customerError)
    }

    const isTrialUpgrade = immediateUpgrade && customerData?.status === 'trialing'
    
    // If this is an immediate upgrade from a trial, we need to cancel the existing subscription
    // and create a new one with immediate billing
    if (isTrialUpgrade && customerData?.stripe_subscription_id) {
      console.log(`Processing immediate upgrade from trial to ${planId} for user ${user.id}`)
      
      try {
        // Cancel the existing trial subscription
        await stripe.subscriptions.cancel(customerData.stripe_subscription_id)
        console.log(`Cancelled trial subscription ${customerData.stripe_subscription_id}`)
      } catch (cancelError) {
        console.error('Error cancelling trial subscription:', cancelError)
        // Continue with checkout even if cancellation fails - the webhook will handle cleanup
      }
    }

    // ALWAYS create a checkout with a stripeCustomerId. They should enforce this.
    const session = await createCheckoutSession(
      planId,
      stripeCustomerId, // Always use the customer ID
      req.headers.get('origin') || undefined,
      user.id, // pass clientReferenceId for webhook
      existingSubscriptionId, // pass existing subscription ID for proper upgrade handling
      isTrialUpgrade // flag to indicate immediate upgrade from trial
    )

    console.log(`[Create Checkout] Created session ${session.id} for customer ${stripeCustomerId}`)
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Create checkout error:', error)
    
    // Provide more detailed error message for debugging
    const errorMessage = error instanceof Error 
      ? `Failed to create checkout session: ${error.message}` 
      : 'Failed to create checkout session';
      
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
