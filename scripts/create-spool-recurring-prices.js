#!/usr/bin/env node

/**
 * Create recurring subscription prices for Spool CMS
 * Usage: node scripts/create-spool-recurring-prices.js
 */

require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ Missing STRIPE_SECRET_KEY environment variable');
  console.log('Please add your Stripe secret key to .env.local');
  process.exit(1);
}

async function createRecurringPrices() {
  try {
    console.log('Creating recurring monthly prices for Spool products...');
    
    // Get the products
    const products = await stripe.products.list({ limit: 10 });
    
    const hobbyProduct = products.data.find(p => p.name === 'Spool Hobby');
    const businessProduct = products.data.find(p => p.name === 'Spool Business');
    
    if (!hobbyProduct || !businessProduct) {
      console.error('Could not find Spool products. Please run setup-stripe-products.js first.');
      return;
    }
    
    console.log(`Found Hobby product: ${hobbyProduct.id}`);
    console.log(`Found Business product: ${businessProduct.id}`);
    
    // Create recurring monthly price for Hobby plan ($49/month)
    console.log('Creating Hobby monthly price...');
    const hobbyPrice = await stripe.prices.create({
      product: hobbyProduct.id,
      unit_amount: 4900, // $49.00 in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        plan: 'hobby',
      },
    });
    
    console.log(`✅ Hobby monthly price created: ${hobbyPrice.id}`);
    
    // Create recurring monthly price for Business plan ($199/month)
    console.log('Creating Business monthly price...');
    const businessPrice = await stripe.prices.create({
      product: businessProduct.id,
      unit_amount: 19900, // $199.00 in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        plan: 'business',
      },
    });
    
    console.log(`✅ Business monthly price created: ${businessPrice.id}`);
    
    console.log('\n🎉 All recurring prices created successfully!');
    console.log('\nAdd these to your .env.local file:');
    console.log(`STRIPE_HOBBY_PRICE_ID=${hobbyPrice.id}`);
    console.log(`STRIPE_BUSINESS_PRICE_ID=${businessPrice.id}`);
    
    // Update the pricing.ts file with the actual price IDs
    console.log('\nAlso update src/lib/config/pricing.ts with these price IDs.');
    
  } catch (error) {
    console.error('Error creating recurring prices:', error);
  }
}

createRecurringPrices(); 