#!/usr/bin/env node

/**
 * Debug script to test the actual webhook polling functionality
 */

require('dotenv').config({ path: '.env.local' });

async function debugWebhookPolling() {
  console.log('🔍 Debugging Spool webhook polling...\n');
  
  const apiKey = process.env.SPOOL_API_KEY;
  const siteId = process.env.SPOOL_SITE_ID;
  
  if (!apiKey || !siteId) {
    console.error('❌ Missing SPOOL_API_KEY or SPOOL_SITE_ID in environment');
    return;
  }
  
  console.log('📋 Configuration:');
  console.log(`API Key: ${apiKey.substring(0, 20)}...`);
  console.log(`Site ID: ${siteId}`);
  console.log('');
  
  try {
    console.log('📡 Fetching content updates...');
    const response = await fetch(`https://www.spoolcms.com/api/spool/${siteId}/content-updates`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Cache-Control': 'no-cache',
      },
    });
    
    if (!response.ok) {
      console.error(`❌ API request failed: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ API response received');
    console.log(`📊 Found ${data.items?.length || 0} items`);
    
    if (data.items && data.items.length > 0) {
      console.log('\n📝 Sample item structure:');
      const sampleItem = data.items[0];
      console.log(JSON.stringify(sampleItem, null, 2));
      
      // Test hash creation
      console.log('\n🔨 Testing hash creation...');
      const hashData = {
        title: sampleItem.title || '',
        slug: sampleItem.slug || '',
        status: sampleItem.status || 'draft',
        published_at: sampleItem.published_at || null,
        updated_at: sampleItem.updated_at || '',
        data: typeof sampleItem.data === 'object' ? 
          JSON.stringify(sampleItem.data, Object.keys(sampleItem.data || {}).sort()) : 
          sampleItem.data || {}
      };
      
      const hash = JSON.stringify(hashData, Object.keys(hashData).sort());
      console.log('Generated hash:', hash.substring(0, 100) + '...');
      
      // Simulate a change
      console.log('\n🔄 Simulating title change...');
      const modifiedItem = { ...sampleItem, title: sampleItem.title + ' (modified)' };
      const modifiedHashData = {
        title: modifiedItem.title || '',
        slug: modifiedItem.slug || '',
        status: modifiedItem.status || 'draft',
        published_at: modifiedItem.published_at || null,
        updated_at: modifiedItem.updated_at || '',
        data: typeof modifiedItem.data === 'object' ? 
          JSON.stringify(modifiedItem.data, Object.keys(modifiedItem.data || {}).sort()) : 
          modifiedItem.data || {}
      };
      
      const modifiedHash = JSON.stringify(modifiedHashData, Object.keys(modifiedHashData).sort());
      console.log('Modified hash:', modifiedHash.substring(0, 100) + '...');
      console.log('Hashes different:', hash !== modifiedHash ? '✅ YES' : '❌ NO');
    } else {
      console.log('⚠️  No items found - create some content in Spool admin first');
    }
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
}

debugWebhookPolling().catch(console.error);