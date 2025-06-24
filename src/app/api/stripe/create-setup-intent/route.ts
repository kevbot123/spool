import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-03-31.basil', // Updated API version based on lint error
  typescript: true,
});

export async function POST(request: Request) {
  try {
    // Potentially, you could receive the user's email here if available
    // const { email } = await request.json(); 
    // And create/retrieve a Stripe customer to associate the setup intent
    // This helps link setup attempts even before the user record/subscription exists
    // For simplicity now, we create it without associating with a customer yet.

    console.log('Creating Stripe SetupIntent...');

    const setupIntent = await stripe.setupIntents.create({
      // usage: 'on_session', // Use 'on_session' if customer confirms immediately, 'off_session' if charging later without customer interaction
      automatic_payment_methods: { enabled: true }, // Let Stripe handle payment method types
    });

    console.log('SetupIntent created:', setupIntent.id);

    return NextResponse.json({ clientSecret: setupIntent.client_secret });

  } catch (error: any) {
    console.error('Error creating Stripe SetupIntent:', error);
    return NextResponse.json({ error: error.message || 'Failed to create SetupIntent' }, { status: 500 });
  }
}
