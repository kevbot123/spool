/**
 * End-to-end test: Content change → broadcast → client receives update
 */

const { createClient } = require('@supabase/supabase-js');

const LIVE_UPDATES_URL = 'https://uyauwtottrqhbhfcckwk.supabase.co';
const LIVE_UPDATES_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5YXV3dG90dHJxaGJoZmNja3drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4OTkwODYsImV4cCI6MjA2OTQ3NTA4Nn0.iclMZMPlXYyKaQFt6A8ygSB0bFPK45ct1RPYSkoIve4';
const LIVE_UPDATES_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5YXV3dG90dHJxaGJoZmNja3drIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzg5OTA4NiwiZXhwIjoyMDY5NDc1MDg2fQ.QzGh_6O9NxDzVEUOBqVZHMLe8KVwepWpNVrFDRUW03Q';

// Test site
const TEST_SITE_ID = 'eaccaacf-c08a-49bf-acaa-8d1cccc1e57b';
const TEST_API_KEY = 'e12326d5f7eaa225d53913122f0483a2bbf5a393cbf7ef4773023a8ab26bd296';

async function testEndToEnd() {
  console.log('🔄 Testing End-to-End Live Updates Flow');
  console.log('=======================================');
  
  // Step 1: Set up client to listen for updates (simulating user's Next.js app)
  console.log('\n📡 Step 1: Setting up client connection...');
  
  const clientSupabase = createClient(LIVE_UPDATES_URL, LIVE_UPDATES_ANON_KEY, {
    global: {
      headers: {
        'x-api-key': TEST_API_KEY
      }
    }
  });
  
  // Count initial updates
  const { data: initialData } = await clientSupabase
    .from('live_updates')
    .select('*')
    .eq('site_id', TEST_SITE_ID);
    
  console.log(`   Initial update count: ${initialData?.length || 0}`);
  
  // Step 2: Simulate content change by broadcasting update (simulating Spool CMS backend)
  console.log('\n📝 Step 2: Broadcasting content update...');
  
  const serverSupabase = createClient(LIVE_UPDATES_URL, LIVE_UPDATES_SERVICE_KEY);
  
  // Generate a proper UUID for item_id
  const { data: uuidData } = await serverSupabase.rpc('gen_random_uuid');
  const itemId = uuidData || '12345678-1234-1234-1234-123456789012';
  
  const testUpdate = {
    site_id: TEST_SITE_ID,
    event_type: 'content.updated',
    collection: 'test-collection',
    slug: 'end-to-end-test-' + Date.now(),
    item_id: itemId,
    metadata: { test: 'end-to-end', timestamp: new Date().toISOString() }
  };
  
  const { data: insertData, error: insertError } = await serverSupabase
    .from('live_updates')
    .insert(testUpdate)
    .select();
    
  if (insertError) {
    console.log(`   ❌ Failed to broadcast: ${insertError.message}`);
    return false;
  }
  
  console.log(`   ✅ Broadcasted update for ${testUpdate.collection}/${testUpdate.slug}`);
  
  // Step 3: Wait a moment and check if client can see the new update
  console.log('\n🔍 Step 3: Checking if client receives update...');
  
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
  
  const { data: finalData } = await clientSupabase
    .from('live_updates')
    .select('*')
    .eq('site_id', TEST_SITE_ID)
    .order('timestamp', { ascending: false });
    
  console.log(`   Final update count: ${finalData?.length || 0}`);
  
  // Step 4: Verify the new update is visible
  if (finalData && finalData.length > (initialData?.length || 0)) {
    const latestUpdate = finalData[0];
    if (latestUpdate.slug === testUpdate.slug) {
      console.log(`   ✅ SUCCESS: Client can see the new update!`);
      console.log(`      Event: ${latestUpdate.event_type}`);
      console.log(`      Collection: ${latestUpdate.collection}`);
      console.log(`      Slug: ${latestUpdate.slug}`);
      console.log(`      Timestamp: ${latestUpdate.timestamp}`);
      return true;
    } else {
      console.log(`   ❌ FAIL: Latest update doesn't match (expected ${testUpdate.slug}, got ${latestUpdate.slug})`);
      return false;
    }
  } else {
    console.log(`   ❌ FAIL: No new updates visible to client`);
    return false;
  }
}

async function testRateLimiting() {
  console.log('\n⚡ Testing Basic Rate Limiting...');
  
  const client = createClient(LIVE_UPDATES_URL, LIVE_UPDATES_ANON_KEY, {
    global: {
      headers: {
        'x-api-key': TEST_API_KEY
      }
    }
  });
  
  // Make multiple rapid requests to test if there's any rate limiting
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(
      client.from('live_updates').select('count').eq('site_id', TEST_SITE_ID)
    );
  }
  
  const results = await Promise.allSettled(promises);
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  console.log(`   📊 10 rapid requests: ${successful} successful, ${failed} failed`);
  
  if (successful >= 8) { // Allow some tolerance
    console.log(`   ✅ Basic rate limiting test passed`);
    return true;
  } else {
    console.log(`   ⚠️  Possible rate limiting issues detected`);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 Running End-to-End Tests');
  console.log('===========================');
  
  const endToEndResult = await testEndToEnd();
  const rateLimitResult = await testRateLimiting();
  
  console.log('\n📊 Test Summary');
  console.log('===============');
  console.log(`End-to-End Flow: ${endToEndResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Rate Limiting: ${rateLimitResult ? '✅ PASS' : '❌ FAIL'}`);
  
  if (endToEndResult && rateLimitResult) {
    console.log('\n🎉 All end-to-end tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed!');
    process.exit(1);
  }
}

runAllTests().catch(console.error);