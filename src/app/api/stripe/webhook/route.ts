import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { syncStripeDataToKV } from '@/lib/stripe/sync'
import { tryCatch } from '@/lib/utils/try-catch'
import Stripe from 'stripe'

// This is your Stripe webhook secret for production
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

/**
 * Events we track and sync - following the help doc's recommendation
 * If there are more events that should trigger syncing, add them here
 */
const allowedEvents: Stripe.Event.Type[] = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.pending_update_applied",
  "customer.subscription.pending_update_expired",
  "customer.subscription.trial_will_end",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "invoice.upcoming",
  "invoice.marked_uncollectible",
  "invoice.payment_succeeded",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
]

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = (await headers()).get("Stripe-Signature")

  if (!signature) return NextResponse.json({}, { status: 400 })

  async function doEventProcessing() {
    if (typeof signature !== "string") {
      throw new Error("[STRIPE HOOK] Header isn't a string???")
    }

    if (!webhookSecret) {
      throw new Error("[STRIPE HOOK] Missing webhook secret")
    }

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    )

    console.log(`[STRIPE HOOK] Processing event: ${event.type} (${event.id})`)
    
    // Process the event
    await processEvent(event)
  }

  const { error } = await tryCatch(doEventProcessing)

  if (error) {
    console.error("[STRIPE HOOK] Error processing event", error)
  }

  return NextResponse.json({ received: true })
}

/**
 * Process Stripe events by syncing customer data to KV
 * Following the help doc's pattern of having ONE sync function handle all updates
 */
async function processEvent(event: Stripe.Event) {
  // Skip processing if the event isn't one we're tracking
  if (!allowedEvents.includes(event.type)) {
    console.log(`[STRIPE HOOK] Skipping untracked event: ${event.type}`)
    return
  }

  // All the events we track have a customerId
  const eventData = event?.data?.object as { customer?: string }
  const customerId = eventData?.customer

  // This helps make it typesafe and also lets us know if our assumption is wrong
  if (typeof customerId !== "string") {
    throw new Error(
      `[STRIPE HOOK][ERROR] Customer ID isn't string.\nEvent type: ${event.type}\nEvent ID: ${event.id}`
    )
  }

  console.log(`[STRIPE HOOK] Syncing data for customer: ${customerId} (event: ${event.type})`)
  
  // Use our single sync function to update KV with latest Stripe data
  try {
    await syncStripeDataToKV(customerId)
    console.log(`[STRIPE HOOK] Successfully synced customer ${customerId} for event ${event.type}`)
  } catch (syncError) {
    console.error(`[STRIPE HOOK] Error syncing customer ${customerId}:`, syncError)
    throw syncError
  }
}
