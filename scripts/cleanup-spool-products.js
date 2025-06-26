#!/usr/bin/env node

/**
 * Cleanup script to archive accidentally created Spool products from WIST Stripe account
 * Usage: node scripts/cleanup-spool-products.js
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
require('dotenv').config({ path: '.env.local' });

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ Missing STRIPE_SECRET_KEY environment variable');
  console.log('Please add your Stripe secret key to .env.local');
  process.exit(1);
}

async function cleanupSpoolProducts() {
  console.log('🧹 Cleaning up accidentally created Spool products...\n');

  try {
    // Product IDs that were accidentally created for Spool
    const spoolProductIds = [
      'prod_SYjYZTeOlXA80O', // Spool Hobby
      'prod_SYjYbJhsRuis5Q'  // Spool Business
    ];

    for (const productId of spoolProductIds) {
      try {
        // Get product details first
        const product = await stripe.products.retrieve(productId);
        console.log(`📋 Found product: "${product.name}" (${productId})`);

        // Archive the product (sets active=false)
        const archivedProduct = await stripe.products.update(productId, {
          active: false
        });

        console.log(`✅ Archived product: "${archivedProduct.name}"`);

        // List and archive associated prices
        const prices = await stripe.prices.list({
          product: productId,
          active: true
        });

        if (prices.data.length > 0) {
          console.log(`   📄 Found ${prices.data.length} active price(s) for this product`);
          
          for (const price of prices.data) {
            await stripe.prices.update(price.id, {
              active: false
            });
            console.log(`   ✅ Archived price: ${price.id} ($${price.unit_amount / 100})`);
          }
        } else {
          console.log(`   📄 No active prices found for this product`);
        }

        console.log(''); // Empty line for readability
        
      } catch (error) {
        if (error.code === 'resource_missing') {
          console.log(`⚠️  Product ${productId} not found (may have been deleted already)`);
        } else {
          console.error(`❌ Error processing product ${productId}:`, error.message);
        }
      }
    }

    console.log('🎉 Cleanup completed successfully!');
    console.log('\n📋 Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('• Spool products have been archived (deactivated)');
    console.log('• Associated prices have been archived');
    console.log('• Products remain in Stripe for record-keeping');
    console.log('• They cannot be used for new purchases');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n💡 Next steps for Spool CMS:');
    console.log('1. Create a separate Stripe account for Spool');
    console.log('2. Set up proper environment configuration');
    console.log('3. Create Spool products in the correct account');

  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    if (error.type === 'StripeAuthenticationError') {
      console.log('Please check your STRIPE_SECRET_KEY in .env.local');
    }
    process.exit(1);
  }
}

cleanupSpoolProducts(); 