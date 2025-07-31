#!/usr/bin/env node

/**
 * Test script for Supabase Realtime live updates
 * This script tests the end-to-end flow of live updates
 */

import { sendTestUpdate } from '../src/lib/live-updates.js';

async function testLiveUpdates() {
  console.log('🧪 Testing Spool live updates...');
  
  // Test with a real site ID from your database
  const testSiteId = 'fa3a9eeb-a4fb-46dc-95ee-cce085a8f06c'; // Wist site
  
  try {
    console.log(`📡 Sending test update to site: ${testSiteId}`);
    await sendTestUpdate(testSiteId);
    console.log('✅ Test update sent successfully!');
    console.log('💡 Check your Next.js dev server logs to see if the update was received');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testLiveUpdates();