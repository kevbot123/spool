#!/usr/bin/env node

/**
 * Test script to verify Spool webhook setup
 * This script helps users debug their webhook configuration
 */

const crypto = require('crypto');

function generateWebhookSignature(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
}

async function testWebhookSetup() {
  console.log('🔗 Testing Spool webhook setup...\n');
  
  // Check environment variables
  const requiredEnvVars = {
    'SPOOL_API_KEY': process.env.SPOOL_API_KEY,
    'SPOOL_SITE_ID': process.env.SPOOL_SITE_ID,
    'NEXT_PUBLIC_SITE_URL': process.env.NEXT_PUBLIC_SITE_URL,
    'SPOOL_WEBHOOK_SECRET': process.env.SPOOL_WEBHOOK_SECRET
  };
  
  console.log('📋 Environment Variables Check:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  let hasErrors = false;
  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (key === 'SPOOL_WEBHOOK_SECRET') {
      // Optional but recommended
      console.log(`${key}: ${value ? 'Set ✅' : 'Not set ⚠️  (optional but recommended)'}`);
    } else {
      const isSet = value && value.length > 0;
      console.log(`${key}: ${isSet ? 'Set ✅' : 'Missing ❌'}`);
      if (!isSet) hasErrors = true;
    }
  }
  
  if (hasErrors) {
    console.log('\n❌ Missing required environment variables');
    console.log('Please check your .env.local file and ensure all required variables are set.');
    return;
  }
  
  // Test content-updates endpoint
  console.log('\n🧪 Testing content-updates endpoint...');
  
  try {
    const baseUrl = 'https://www.spoolcms.com';
    const response = await fetch(`${baseUrl}/api/spool/${process.env.SPOOL_SITE_ID}/content-updates`, {
      headers: {
        'Authorization': `Bearer ${process.env.SPOOL_API_KEY}`,
        'Cache-Control': 'no-cache',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Content-updates endpoint working - found ${data.items?.length || 0} items`);
    } else {
      console.log(`❌ Content-updates endpoint failed: ${response.status} ${response.statusText}`);
      
      if (response.status === 401) {
        console.log('💡 This usually means your SPOOL_API_KEY or SPOOL_SITE_ID is incorrect');
      }
      return;
    }
  } catch (error) {
    console.log(`❌ Content-updates endpoint error: ${error.message}`);
    return;
  }
  
  // Test webhook endpoint if URL is provided
  const webhookUrl = process.env.NEXT_PUBLIC_SITE_URL 
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/spool`
    : null;
    
  if (webhookUrl) {
    console.log('\n🎯 Testing webhook endpoint...');
    
    const testPayload = {
      event: 'content.updated',
      site_id: process.env.SPOOL_SITE_ID,
      collection: 'test',
      slug: 'test-webhook',
      item_id: 'test-item-id',
      timestamp: new Date().toISOString()
    };
    
    const payloadString = JSON.stringify(testPayload);
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Spool-Webhook-Test/1.0',
      'X-Spool-Delivery': 'test-delivery-' + Date.now(),
      'X-Spool-Event': testPayload.event,
    };
    
    // Add signature if secret is available
    if (process.env.SPOOL_WEBHOOK_SECRET) {
      const signature = generateWebhookSignature(payloadString, process.env.SPOOL_WEBHOOK_SECRET);
      headers['X-Spool-Signature-256'] = `sha256=${signature}`;
    }
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: payloadString,
      });
      
      if (response.ok) {
        console.log('✅ Webhook endpoint working correctly');
      } else {
        console.log(`❌ Webhook endpoint failed: ${response.status} ${response.statusText}`);
        
        if (response.status === 404) {
          console.log('💡 Make sure you have created the webhook route file: app/api/webhooks/spool/route.ts');
        } else if (response.status === 401) {
          console.log('💡 Webhook signature verification failed - check your SPOOL_WEBHOOK_SECRET');
        }
      }
    } catch (error) {
      console.log(`❌ Webhook endpoint error: ${error.message}`);
      
      if (error.code === 'ECONNREFUSED') {
        console.log('💡 Make sure your Next.js development server is running (npm run dev)');
      }
    }
  } else {
    console.log('\n⚠️  Skipping webhook endpoint test - NEXT_PUBLIC_SITE_URL not set');
  }
  
  console.log('\n📚 Next Steps:');
  console.log('1. If all tests pass, your webhook setup is working correctly');
  console.log('2. Configure your webhook URL in Spool admin: Site Settings > Instant Updates');
  console.log('3. Test live updates by editing content in Spool admin');
  console.log('4. Check your Next.js console for webhook processing messages');
  
  console.log('\n🔧 Development Mode:');
  console.log('• Live updates work automatically on localhost with developmentConfig');
  console.log('• No ngrok or tunneling required for development');
  console.log('• Check console for "[DEV]" messages when content changes');
}

// Run the test
testWebhookSetup().catch(console.error);