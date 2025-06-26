#!/usr/bin/env node

/**
 * Create recurring subscription prices for Spool CMS
 * Usage: node scripts/create-recurring-prices.js
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
require('dotenv').config({ path: '.env.local' });

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ Missing STRIPE_SECRET_KEY environment variable');
  console.log('Please add your Stripe secret key to .env.local');
  process.exit(1);
}

async function createRecurringPrices() {
  console.log('🚀 Creating recurring subscription prices for Spool CMS...\n');

  try {
    // Product IDs from the created products
    const hobbyProductId = 'prod_SYjYZTeOlXA80O';
    const businessProductId = 'prod_SYjYbJhsRuis5Q';

    // Create Hobby Plan Recurring Price
    const hobbyRecurringPrice = await stripe.prices.create({
      product: hobbyProductId,
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

    console.log('✅ Created Hobby recurring price:', hobbyRecurringPrice.id);

    // Create Business Plan Recurring Price
    const businessRecurringPrice = await stripe.prices.create({
      product: businessProductId,
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

    console.log('✅ Created Business recurring price:', businessRecurringPrice.id);

    console.log('\n🎉 Recurring subscription prices created successfully!');
    console.log('\n📋 Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Hobby Plan:     ${hobbyRecurringPrice.id} ($35/month)`);
    console.log(`Business Plan:  ${businessRecurringPrice.id} ($95/month)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\n💡 Next steps:');
    console.log('1. Add these price IDs to your .env.local file');
    console.log('2. Test the checkout flow in your application');
    console.log('3. Configure your webhook endpoints');

    // Output environment variables to add
    console.log('\n🔧 Add these to your .env.local file:');
    console.log(`STRIPE_HOBBY_PRICE_ID=${hobbyRecurringPrice.id}`);
    console.log(`STRIPE_BUSINESS_PRICE_ID=${businessRecurringPrice.id}`);

  } catch (error) {
    console.error('❌ Error creating recurring prices:', error.message);
    if (error.type === 'StripeAuthenticationError') {
      console.log('Please check your STRIPE_SECRET_KEY in .env.local');
    }
    process.exit(1);
  }
}

createRecurringPrices(); 