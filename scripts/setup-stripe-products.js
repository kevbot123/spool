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
    // Create Hobby Plan Product
    const hobbyProduct = await stripe.products.create({
      name: 'Spool Hobby',
      description: 'Advanced AI models, 3,000 AI credits, and unlimited content processing',
      metadata: {
        plan: 'hobby',
        features: JSON.stringify([
          'Advanced AI models for content generation',
          '3,000 AI credits per month',
          '35MB AI content data',
          'Unlimited URLs for content processing',
          'AI-powered content suggestions'
        ])
      }
    });

    console.log('✅ Created Hobby product:', hobbyProduct.id);

    // Create Hobby Plan Price (Monthly)
    const hobbyPrice = await stripe.prices.create({
      product: hobbyProduct.id,
      unit_amount: 3500, // $35.00
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      metadata: {
        plan: 'hobby',
        interval: 'monthly'
      }
    });

    console.log('✅ Created Hobby monthly price:', hobbyPrice.id);

    // Create Business Plan Product
    const businessProduct = await stripe.products.create({
      name: 'Spool Business',
      description: 'Premium AI models, 10,000 AI credits, and advanced features for growing businesses',
      metadata: {
        plan: 'business',
        features: JSON.stringify([
          'Premium AI models for content generation',
          '10,000 AI credits per month',
          '35MB AI content data',
          'Unlimited URLs for content processing',
          'AI-powered content optimization',
          'Advanced content analytics',
          'Remove Spool branding',
          'Custom domain support',
          'Additional credits $5 per 1,000 credits'
        ])
      }
    });

    console.log('✅ Created Business product:', businessProduct.id);

    // Create Business Plan Price (Monthly)
    const businessPrice = await stripe.prices.create({
      product: businessProduct.id,
      unit_amount: 9500, // $95.00
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      metadata: {
        plan: 'business',
        interval: 'monthly'
      }
    });

    console.log('✅ Created Business monthly price:', businessPrice.id);

    console.log('\n🎉 Stripe products created successfully!');
    console.log('\n📋 Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Hobby Plan:     ${hobbyPrice.id} ($35/month)`);
    console.log(`Business Plan:  ${businessPrice.id} ($95/month)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\n💡 Next steps:');
    console.log('1. Update your .env.local file with these price IDs');
    console.log('2. Test the checkout flow in your application');
    console.log('3. Configure your webhook endpoints');
    console.log('4. Set up billing portal settings in Stripe Dashboard');

    // Output environment variables to add
    console.log('\n🔧 Add these to your .env.local file:');
    console.log(`STRIPE_HOBBY_PRICE_ID=${hobbyPrice.id}`);
    console.log(`STRIPE_BUSINESS_PRICE_ID=${businessPrice.id}`);

  } catch (error) {
    console.error('❌ Error setting up Stripe products:', error.message);
    process.exit(1);
  }
}

setupStripeProducts(); 