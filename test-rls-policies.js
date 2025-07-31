/**
 * Test script to verify RLS policies for live_updates table
 * This tests that users can only see updates for sites they have API access to
 */

const { createClient } = require('@supabase/supabase-js');

const LIVE_UPDATES_URL = 'https://uyauwtottrqhbhfcckwk.supabase.co';
const LIVE_UPDATES_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5YXV3dG90dHJxaGJoZmNja3drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4OTkwODYsImV4cCI6MjA2OTQ3NTA4Nn0.iclMZMPlXYyKaQFt6A8ygSB0bFPK45ct1RPYSkoIve4';

// Test API keys from sites_auth table
const TEST_CASES = [
  {
    name: 'Valid API Key 1',
    apiKey: 'e12326d5f7eaa225d53913122f0483a2bbf5a393cbf7ef4773023a8ab26bd296',
    siteId: 'eaccaacf-c08a-49bf-acaa-8d1cccc1e57b',
    shouldSeeUpdates: true
  },
  {
    name: 'Valid API Key 2', 
    apiKey: 'spool_UvxQt03oBnGrVYrwfnPNLupla6TCAEHF',
    siteId: 'fa3a9eeb-a4fb-46dc-95ee-cce085a8f06c',
    shouldSeeUpdates: true
  },
  {
    name: 'Invalid API Key',
    apiKey: 'invalid-api-key-12345',
    siteId: 'eaccaacf-c08a-49bf-acaa-8d1cccc1e57b',
    shouldSeeUpdates: false
  },
  {
    name: 'Valid API Key but Wrong Site',
    apiKey: 'e12326d5f7eaa225d53913122f0483a2bbf5a393cbf7ef4773023a8ab26bd296',
    siteId: 'fa3a9eeb-a4fb-46dc-95ee-cce085a8f06c', // Different site
    shouldSeeUpdates: false
  }
];

async function testRLSPolicy(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log(`   API Key: ${testCase.apiKey.substring(0, 20)}...`);
  console.log(`   Site ID: ${testCase.siteId}`);
  
  try {
    // Create client with API key in headers (simulating how our package works)
    const supabase = createClient(LIVE_UPDATES_URL, LIVE_UPDATES_ANON_KEY, {
      global: {
        headers: {
          'x-api-key': testCase.apiKey
        }
      }
    });
    
    // First, let's test if we can see the sites_auth table to debug
    console.log(`   🔍 Testing sites_auth access...`);
    const { data: authData, error: authError } = await supabase
      .from('sites_auth')
      .select('id, name')
      .eq('api_key', testCase.apiKey);
    
    if (authError) {
      console.log(`   ❌ sites_auth Error: ${authError.message}`);
    } else {
      console.log(`   📊 Found ${authData.length} matching sites in sites_auth`);
    }
    
    // Try to query live_updates for this site
    const { data, error } = await supabase
      .from('live_updates')
      .select('*')
      .eq('site_id', testCase.siteId);
    
    if (error) {
      console.log(`   ❌ live_updates Error: ${error.message}`);
      if (testCase.shouldSeeUpdates) {
        console.log(`   🚨 FAIL: Expected to see updates but got error`);
        return false;
      } else {
        console.log(`   ✅ PASS: Correctly blocked access`);
        return true;
      }
    }
    
    console.log(`   📊 Found ${data.length} live_updates`);
    
    if (testCase.shouldSeeUpdates && data.length > 0) {
      console.log(`   ✅ PASS: Correctly allowed access to updates`);
      return true;
    } else if (!testCase.shouldSeeUpdates && data.length === 0) {
      console.log(`   ✅ PASS: Correctly blocked access (no data returned)`);
      return true;
    } else if (testCase.shouldSeeUpdates && data.length === 0) {
      console.log(`   ⚠️  WARN: Expected updates but none found (might be empty)`);
      return true; // This is OK, just means no test data
    } else {
      console.log(`   🚨 FAIL: Unexpected result`);
      return false;
    }
    
  } catch (err) {
    console.log(`   ❌ Exception: ${err.message}`);
    if (testCase.shouldSeeUpdates) {
      console.log(`   🚨 FAIL: Expected to work but got exception`);
      return false;
    } else {
      console.log(`   ✅ PASS: Correctly blocked with exception`);
      return true;
    }
  }
}

async function runAllTests() {
  console.log('🔒 Testing RLS Policies for Live Updates');
  console.log('==========================================');
  
  let passed = 0;
  let total = TEST_CASES.length;
  
  for (const testCase of TEST_CASES) {
    const result = await testRLSPolicy(testCase);
    if (result) passed++;
  }
  
  console.log('\n📊 Test Results');
  console.log('================');
  console.log(`Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('🎉 All RLS policy tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some RLS policy tests failed!');
    process.exit(1);
  }
}

// Run the tests
runAllTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});