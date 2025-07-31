/**
 * Test cross-site isolation to ensure users can't see other sites' data
 */

const { createClient } = require('@supabase/supabase-js');

const LIVE_UPDATES_URL = 'https://uyauwtottrqhbhfcckwk.supabase.co';
const LIVE_UPDATES_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5YXV3dG90dHJxaGJoZmNja3drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4OTkwODYsImV4cCI6MjA2OTQ3NTA4Nn0.iclMZMPlXYyKaQFt6A8ygSB0bFPK45ct1RPYSkoIve4';

async function testCrossSiteIsolation() {
  console.log('🔒 Testing Cross-Site Data Isolation');
  console.log('====================================');
  
  // Test with first API key - should only see their own site's data
  const client1 = createClient(LIVE_UPDATES_URL, LIVE_UPDATES_ANON_KEY, {
    global: {
      headers: {
        'x-api-key': 'e12326d5f7eaa225d53913122f0483a2bbf5a393cbf7ef4773023a8ab26bd296'
      }
    }
  });
  
  // Test with second API key - should only see their own site's data  
  const client2 = createClient(LIVE_UPDATES_URL, LIVE_UPDATES_ANON_KEY, {
    global: {
      headers: {
        'x-api-key': 'spool_UvxQt03oBnGrVYrwfnPNLupla6TCAEHF'
      }
    }
  });
  
  console.log('\n🧪 Testing Client 1 (API Key: e12326d5...)');
  const { data: data1, error: error1 } = await client1
    .from('live_updates')
    .select('site_id, collection, slug');
    
  if (error1) {
    console.log(`❌ Error: ${error1.message}`);
  } else {
    console.log(`📊 Client 1 sees ${data1.length} updates:`);
    data1.forEach(update => {
      console.log(`   - Site: ${update.site_id.substring(0, 8)}... Collection: ${update.collection} Slug: ${update.slug}`);
    });
  }
  
  console.log('\n🧪 Testing Client 2 (API Key: spool_UvxQt03o...)');
  const { data: data2, error: error2 } = await client2
    .from('live_updates')
    .select('site_id, collection, slug');
    
  if (error2) {
    console.log(`❌ Error: ${error2.message}`);
  } else {
    console.log(`📊 Client 2 sees ${data2.length} updates:`);
    data2.forEach(update => {
      console.log(`   - Site: ${update.site_id.substring(0, 8)}... Collection: ${update.collection} Slug: ${update.slug}`);
    });
  }
  
  // Verify isolation
  console.log('\n🔍 Isolation Analysis:');
  
  if (data1 && data2) {
    const site1Ids = new Set(data1.map(d => d.site_id));
    const site2Ids = new Set(data2.map(d => d.site_id));
    
    const overlap = [...site1Ids].filter(id => site2Ids.has(id));
    
    if (overlap.length === 0) {
      console.log('✅ PASS: No site ID overlap between clients - perfect isolation!');
    } else {
      console.log(`❌ FAIL: Found ${overlap.length} overlapping site IDs: ${overlap.join(', ')}`);
    }
    
    console.log(`   Client 1 sees sites: ${[...site1Ids].map(id => id.substring(0, 8) + '...').join(', ')}`);
    console.log(`   Client 2 sees sites: ${[...site2Ids].map(id => id.substring(0, 8) + '...').join(', ')}`);
  }
  
  console.log('\n🎯 Cross-site isolation test complete!');
}

testCrossSiteIsolation().catch(console.error);