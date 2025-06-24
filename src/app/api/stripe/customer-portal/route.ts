import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PLANS } from '@/lib/config/pricing'
import { stripe, createCustomerPortalSession } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
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
    
    // Parse request body for optional flow parameters
    const body = await req.json().catch(() => ({}))
    const { flow_type, subscription_id } = body

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

    // Get or create the Stripe customer ID
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('user_id', user.id)
      .single()

    let stripeCustomerId: string | undefined
    if (customerError && customerError.code !== 'PGRST116') {
      console.error('Error getting customer:', customerError)
      return NextResponse.json({ error: 'Error retrieving customer information' }, { status: 500 })
    }
    if (customerData?.stripe_customer_id) {
      stripeCustomerId = customerData.stripe_customer_id
    } else {
      // Create a new Stripe customer and save
      console.log('No Stripe customer found; creating new one for user:', user.id)
      const customer = await stripe.customers.create({ metadata: { userId: user.id } })
      stripeCustomerId = customer.id
      const { error: upsertError } = await supabase
        .from('customers')
        .upsert({ user_id: user.id, stripe_customer_id: stripeCustomerId }, { onConflict: 'user_id' })
      if (upsertError) {
        console.error('Error upserting customer record:', upsertError)
        return NextResponse.json({ error: 'Error creating customer record' }, { status: 500 })
      }
    }

    // Sync local plan to Stripe subscription before portal
    const { data: custRec } = await supabase
      .from('customers')
      .select('stripe_subscription_id, plan_id')
      .eq('user_id', user.id)
      .single()
    if (custRec?.stripe_subscription_id) {
      try {
        const sub = await stripe.subscriptions.retrieve(custRec.stripe_subscription_id, { expand: ['items.data.price'] })
        const priceId = sub.items.data[0]?.price.id
        let planId = priceId === process.env.STRIPE_HOBBY_PRICE_ID
          ? PLANS.HOBBY
          : priceId === process.env.STRIPE_BUSINESS_PRICE_ID
            ? PLANS.BUSINESS
            : custRec.plan_id || PLANS.FREE
        await supabase
          .from('customers')
          .update({ plan_id: planId, status: sub.status, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
      } catch (syncErr) {
        console.warn('Portal sync failed:', syncErr)
      }
    }

    // Create a customer portal session
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'; // Get origin or fallback
    const portalReturnUrl = `${origin}/account?from_portal=true`; // Construct the full return URL

    const session = await createCustomerPortalSession(
      stripeCustomerId!,
      portalReturnUrl, // Pass the constructed URL
      flow_type,
      subscription_id
    )

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Customer portal error:', error)
    // Catch missing portal configuration error
    if (error.rawType === 'invalid_request_error' && error.message.includes('default configuration')) {
      return NextResponse.json(
        { error: 'Billing portal is not configured. Please save your Customer Portal settings in the Stripe Dashboard.' },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create customer portal session' },
      { status: 500 }
    )
  }
}
