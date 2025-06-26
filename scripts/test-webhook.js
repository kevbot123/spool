#!/usr/bin/env node

/**
 * Test webhook connectivity for Spool CMS
 * Usage: node scripts/test-webhook.js
 */

require('dotenv').config({ path: '.env.local' });

async function testWebhook() {
  console.log('🔗 Testing Spool webhook configuration...\n');
  
  const webhookUrl = process.env.NEXT_PUBLIC_APP_URL + '/api/stripe/webhook';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  console.log('📋 Configuration Check:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Webhook URL: ${webhookUrl}`);
  console.log(`Webhook Secret: ${webhookSecret ? 'Set ✅' : 'Missing ❌'}`);
  console.log(`App URL: ${process.env.NEXT_PUBLIC_APP_URL || 'Missing ❌'}`);
  
  if (!webhookSecret) {
    console.log('\n❌ Missing STRIPE_WEBHOOK_SECRET in .env.local');
    console.log('Please add it from your Stripe Dashboard > Webhooks > [Your Endpoint] > Signing secret');
    return;
  }
  
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    console.log('\n❌ Missing NEXT_PUBLIC_APP_URL in .env.local');
    console.log('Please add: NEXT_PUBLIC_APP_URL=http://localhost:3000');
    return;
  }
  
  console.log('\n✅ Webhook configuration looks good!');
  console.log('\n💡 To test the webhook:');
  console.log('1. Start your development server: npm run dev');
  console.log('2. Use Stripe CLI to forward events: stripe listen --forward-to localhost:3000/api/stripe/webhook');
  console.log('3. Or create a test subscription in your Stripe Dashboard');
  
  console.log('\n🔧 Stripe Dashboard Links:');
  console.log('• Webhooks: https://dashboard.stripe.com/test/webhooks');
  console.log('• Products: https://dashboard.stripe.com/test/products');
  console.log('• Test Cards: https://docs.stripe.com/testing#cards');
}

testWebhook(); 