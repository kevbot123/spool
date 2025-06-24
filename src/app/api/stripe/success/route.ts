import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/server-auth';
import { getStripeCustomerId, syncStripeDataToKV } from '@/lib/stripe/sync';
import { createServerClient } from '@supabase/ssr';

/**
 * Success endpoint - called when user returns from Stripe checkout
 * Eagerly syncs the latest Stripe data to prevent race conditions with webhooks
 * 
 * Following the help doc's recommendation to not rely on checkout session data
 * but instead sync all customer data using our single syncStripeDataToKV function
 */
export async function GET(req: NextRequest) {
  console.log('[Stripe Success] Starting success endpoint processing');
  
  try {
    // Create Supabase client with proper SSR handling
    const response = new NextResponse();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // Get user from SSR session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('[Stripe Success] No authenticated user found via SSR, redirecting to sign-in');
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('message', 'Please sign in to complete your purchase');
      return NextResponse.redirect(signInUrl);
    }

    const userId = user.id;
    console.log(`[Stripe Success] Processing success for user ${userId}`);
    
    // Get the Stripe customer ID from KV
    const stripeCustomerId = await getStripeCustomerId(userId);
    
    if (!stripeCustomerId) {
      console.log(`[Stripe Success] No Stripe customer ID found for user ${userId}, redirecting`);
      return NextResponse.redirect(new URL('/', req.url));
    }

    console.log(`[Stripe Success] Syncing Stripe data for customer ${stripeCustomerId}`);
    
    // Eagerly sync the latest Stripe data to KV
    // This prevents race conditions where the user gets back before webhooks process
    await syncStripeDataToKV(stripeCustomerId);
    
    console.log(`[Stripe Success] Successfully synced data for customer ${stripeCustomerId}`);
    
    // Create the redirect response with success flag and proper session handling
    const accountUrl = new URL('/account', req.url);
    accountUrl.searchParams.set('stripe_success', 'true');
    
    console.log('[Stripe Success] Redirecting to account page with preserved SSR session');
    return NextResponse.redirect(accountUrl, { headers: response.headers });
    
  } catch (error) {
    console.error('[Stripe Success] Error processing success:', error);
    
    // On error, redirect to home with error flag
    const errorUrl = new URL('/', req.url);
    errorUrl.searchParams.set('stripe_error', 'true');
    return NextResponse.redirect(errorUrl);
  }
} 