#!/usr/bin/env node

/**
 * Setup Stripe products and prices for Spool CMS
 * Usage: node scripts/setup-stripe-products.js
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
require('dotenv').config({ path: '.env.local' });

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ Missing STRIPE_SECRET_KEY environment variable');
  process.exit(1);
}

async function setupStripeProducts() {
  console.log('🚀 Setting up Stripe products for Spool CMS...\n');

  try {
    // Create Pro Plan Product
    const proProduct = await stripe.products.create({
      name: 'Spool Pro',
      description: 'Unlimited collections, AI features, and priority support',
      metadata: {
        plan: 'pro',
        features: JSON.stringify([
          'Unlimited collections',
          'Unlimited content items',
          'AI-powered content suggestions',
          'Advanced SEO tools',
          'Priority support',
          'Custom domains',
          'Team collaboration'
        ])
      }
    });

    console.log('✅ Created Pro product:', proProduct.id);

    // Create Pro Plan Price (Monthly)
    const proMonthlyPrice = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 2900, // $29.00
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      metadata: {
        plan: 'pro',
        interval: 'monthly'
      }
    });

    console.log('✅ Created Pro monthly price:', proMonthlyPrice.id);

    // Create Pro Plan Price (Yearly - 20% discount)
    const proYearlyPrice = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 27900, // $279.00 (20% discount)
      currency: 'usd',
      recurring: {
        interval: 'year'
      },
      metadata: {
        plan: 'pro',
        interval: 'yearly'
      }
    });

    console.log('✅ Created Pro yearly price:', proYearlyPrice.id);

    // Create Enterprise Product (contact for pricing)
    const enterpriseProduct = await stripe.products.create({
      name: 'Spool Enterprise',
      description: 'Custom pricing for large teams and organizations',
      metadata: {
        plan: 'enterprise',
        features: JSON.stringify([
          'Everything in Pro',
          'White-label CMS',
          'Dedicated support',
          'Custom integrations',
          'SSO/SAML',
          'Advanced analytics',
          'Custom SLA'
        ])
      }
    });

    console.log('✅ Created Enterprise product:', enterpriseProduct.id);

    // Create One-time Setup Fee (optional)
    const setupProduct = await stripe.products.create({
      name: 'Spool Setup & Migration',
      description: 'Professional setup and migration service',
      metadata: {
        type: 'setup'
      }
    });

    const setupPrice = await stripe.prices.create({
      product: setupProduct.id,
      unit_amount: 49900, // $499.00
      currency: 'usd',
      metadata: {
        type: 'setup'
      }
    });

    console.log('✅ Created setup service:', setupPrice.id);

    console.log('\n🎉 Stripe products created successfully!');
    console.log('\n📋 Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Pro Monthly:    ${proMonthlyPrice.id} ($29/month)`);
    console.log(`Pro Yearly:     ${proYearlyPrice.id} ($279/year)`);
    console.log(`Setup Service:  ${setupPrice.id} ($499 one-time)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\n💡 Next steps:');
    console.log('1. Update your pricing configuration with these price IDs');
    console.log('2. Test the checkout flow in your application');
    console.log('3. Configure your webhook endpoints');
    console.log('4. Set up billing portal settings in Stripe Dashboard');

    // Output environment variables to add
    console.log('\n🔧 Add these to your environment variables:');
    console.log(`STRIPE_PRO_MONTHLY_PRICE_ID=${proMonthlyPrice.id}`);
    console.log(`STRIPE_PRO_YEARLY_PRICE_ID=${proYearlyPrice.id}`);
    console.log(`STRIPE_SETUP_PRICE_ID=${setupPrice.id}`);

  } catch (error) {
    console.error('❌ Error setting up Stripe products:', error.message);
    process.exit(1);
  }
}

setupStripeProducts(); 