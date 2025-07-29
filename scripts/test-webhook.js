#!/usr/bin/env node

/**
 * Test webhook connectivity for Spool CMS
 * Usage: node scripts/test-webhook.js [webhook-url]
 */

require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');

function generateWebhookSignature(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
}

async function testWebhook() {
  console.log('🔗 Testing Spool webhook configuration...\n');
  
  const webhookUrl = process.argv[2] || (process.env.NEXT_PUBLIC_APP_URL + '/api/webhooks/spool');
  const webhookSecret = process.env.SPOOL_WEBHOOK_SECRET;
  
  console.log('📋 Configuration Check:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Webhook URL: ${webhookUrl}`);
  console.log(`Webhook Secret: ${webhookSecret ? 'Set ✅' : 'Missing ⚠️'}`);
  console.log(`App URL: ${process.env.NEXT_PUBLIC_APP_URL || 'Missing ❌'}`);
  
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    console.log('\n❌ Missing NEXT_PUBLIC_APP_URL in .env.local');
    console.log('Please add: NEXT_PUBLIC_APP_URL=http://localhost:3000');
    return;
  }
  
  // Test webhook endpoint
  console.log('\n🧪 Testing webhook endpoint...');
  
  const testPayload = {
    event: 'content.updated',
    site_id: 'test-site-id',
    collection: 'blog',
    slug: 'test-post',
    item_id: 'test-item-id',
    timestamp: new Date().toISOString()
  };
  
  const payloadString = JSON.stringify(testPayload);
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Spool-CMS-Webhook/1.0',
    'X-Spool-Delivery': 'test-delivery-' + Date.now(),
    'X-Spool-Event': testPayload.event,
  };
  
  // Add signature if secret is available
  if (webhookSecret) {
    const signature = generateWebhookSignature(payloadString, webhookSecret);
    headers['X-Spool-Signature-256'] = `sha256=${signature}`;
    console.log(`🔐 Using webhook signature: sha256=${signature.substring(0, 16)}...`);
  } else {
    console.log('⚠️  No webhook secret - signature verification will be skipped');
  }
  
  try {
    console.log(`📤 Sending test webhook to: ${webhookUrl}`);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: payloadString,
    });
    
    const responseText = await response.text();
    
    console.log('\n📥 Response:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
    console.log(`Body: ${responseText}`);
    
    if (response.ok) {
      console.log('\n✅ Webhook test successful!');
      console.log('Your webhook endpoint is working correctly.');
    } else {
      console.log('\n❌ Webhook test failed!');
      console.log('Check your webhook endpoint implementation.');
      
      if (response.status === 404) {
        console.log('\n💡 Troubleshooting:');
        console.log('• Make sure the webhook route file exists: app/api/webhooks/spool/route.ts');
        console.log('• Verify your Next.js server is running');
        console.log('• Check the webhook URL is correct');
      } else if (response.status === 401) {
        console.log('\n💡 Troubleshooting:');
        console.log('• Webhook signature verification failed');
        console.log('• Check your SPOOL_WEBHOOK_SECRET matches the one in Spool admin');
        console.log('• Verify signature verification logic in your webhook handler');
      } else if (response.status === 500) {
        console.log('\n💡 Troubleshooting:');
        console.log('• Check your server logs for error details');
        console.log('• Verify your webhook handler code is correct');
        console.log('• Make sure all required dependencies are installed');
      }
    }
    
  } catch (error) {
    console.log('\n❌ Webhook test failed with error:');
    console.log(error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Troubleshooting:');
      console.log('• Make sure your Next.js development server is running');
      console.log('• Start it with: npm run dev');
      console.log('• Verify the webhook URL is accessible');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Troubleshooting:');
      console.log('• Check the webhook URL is correct');
      console.log('• Make sure the domain is accessible');
      console.log('• For local testing, use http://localhost:3000');
    }
  }
  
  console.log('\n🔧 Next Steps:');
  console.log('1. Configure webhook URL in Spool admin: Site Settings > Instant Updates');
  console.log('2. Generate and save webhook secret for security');
  console.log('3. Add SPOOL_WEBHOOK_SECRET to your .env.local file');
  console.log('4. Monitor webhook deliveries in Spool admin dashboard');
  
  console.log('\n📚 Documentation:');
  console.log('• Integration Guide: Check SPOOL_INTEGRATION_GUIDE.md');
  console.log('• Webhook Monitoring: Admin > Webhook Deliveries');
  console.log('• Security: Always use webhook signature verification in production');
}

testWebhook().catch(console.error); 