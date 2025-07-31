#!/usr/bin/env node

const { execSync } = require('child_process');

async function testLiveUpdates() {
  console.log('🧪 Testing Spool live updates setup...\n');
  
  // Detect the app URL
  const port = process.env.PORT || process.env.NEXT_PUBLIC_PORT || '3000';
  const baseUrl = `http://localhost:${port}`;
  
  console.log(`📍 Testing against: ${baseUrl}\n`);
  
  // Step 1: Test revalidate endpoint
  console.log('1. Testing /api/revalidate endpoint...');
  try {
    const revalidateResponse = execSync(`curl -s -X POST "${baseUrl}/api/revalidate?path=/test" -w "%{http_code}"`, { encoding: 'utf8' });
    const statusCode = revalidateResponse.slice(-3);
    
    if (statusCode === '200') {
      console.log('   ✅ /api/revalidate endpoint is working');
    } else if (statusCode === '404') {
      console.log('   ❌ /api/revalidate endpoint not found (404)');
      console.log('   💡 Create app/api/revalidate/route.ts in your Next.js app');
      console.log('   📖 See: https://docs.spoolcms.com/nextjs-integration#revalidate-route');
    } else {
      console.log(`   ⚠️  /api/revalidate returned status ${statusCode}`);
    }
  } catch (error) {
    console.log('   ❌ Failed to connect to your Next.js app');
    console.log('   💡 Make sure your dev server is running on the correct port');
    console.log(`   🔧 Expected URL: ${baseUrl}`);
  }
  
  console.log();
  
  // Step 2: Test webhook endpoint
  console.log('2. Testing /api/webhooks/spool endpoint...');
  try {
    const webhookResponse = execSync(`curl -s -X POST "${baseUrl}/api/webhooks/spool" -w "%{http_code}"`, { encoding: 'utf8' });
    const statusCode = webhookResponse.slice(-3);
    
    if (statusCode === '200' || statusCode === '400') {
      console.log('   ✅ Webhook endpoint is accessible');
    } else if (statusCode === '404') {
      console.log('   ❌ Webhook endpoint not found (404)');
      console.log('   💡 Create app/api/webhooks/spool/route.ts in your Next.js app');
      console.log('   📖 See: https://docs.spoolcms.com/nextjs-integration#webhook-setup');
    } else {
      console.log(`   ⚠️  Webhook endpoint returned status ${statusCode}`);
    }
  } catch (error) {
    console.log('   ❌ Failed to test webhook endpoint');
  }
  
  console.log();
  
  // Step 3: Check environment variables
  console.log('3. Checking environment variables...');
  const requiredEnvVars = ['SPOOL_API_KEY', 'SPOOL_SITE_ID'];
  let envVarsOk = true;
  
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`   ✅ ${envVar} is set`);
    } else {
      console.log(`   ❌ ${envVar} is missing`);
      envVarsOk = false;
    }
  }
  
  if (!envVarsOk) {
    console.log('   💡 Add missing environment variables to your .env.local file');
    console.log('   📖 See: https://docs.spoolcms.com/nextjs-integration#environment-variables');
  }
  
  console.log();
  
  // Summary
  console.log('📋 Summary:');
  console.log('   For live updates to work, you need:');
  console.log('   1. ✅ /api/revalidate route created');
  console.log('   2. ✅ /api/webhooks/spool route created');
  console.log('   3. ✅ Environment variables configured');
  console.log('   4. ✅ Development server running');
  console.log();
  console.log('🚀 If all checks pass, live updates should work!');
  console.log('📝 Edit content in your Spool admin to test live updates.');
}

testLiveUpdates().catch(console.error);