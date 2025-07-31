#!/usr/bin/env node

/**
 * Sync all existing sites from Supabase to Convex
 * This is needed to ensure live updates work for existing sites
 */

const { createClient } = require('@supabase/supabase-js');
const { ConvexHttpClient } = require('convex/browser');
const { api } = require('../convex/_generated/api.js');

// Get environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const CONVEX_URL = process.env.CONVEX_URL;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

if (!CONVEX_URL) {
  console.error('❌ Missing CONVEX_URL environment variable');
  console.error('Please set CONVEX_URL in your .env.local file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const convex = new ConvexHttpClient(CONVEX_URL);

async function syncSitesToConvex() {
  console.log('🔄 Starting site sync from Supabase to Convex...');
  
  try {
    // Get all sites from Supabase
    const { data: sites, error } = await supabase
      .from('sites')
      .select('id, name, api_key')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching sites from Supabase:', error);
      return;
    }

    if (!sites || sites.length === 0) {
      console.log('📭 No sites found in Supabase');
      return;
    }

    console.log(`📊 Found ${sites.length} sites in Supabase`);

    // Sync each site to Convex
    let successCount = 0;
    let errorCount = 0;

    for (const site of sites) {
      try {
        console.log(`🔄 Syncing site: ${site.name} (${site.id})`);
        
        await convex.mutation(api.sites.syncSite, {
          id: site.id,
          apiKey: site.api_key,
          name: site.name,
        });
        
        console.log(`✅ Synced: ${site.name}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to sync site ${site.name}:`, error);
        errorCount++;
      }
    }

    console.log(`\n📊 Sync Summary:`);
    console.log(`✅ Success: ${successCount} sites`);
    console.log(`❌ Errors: ${errorCount} sites`);

    // Verify sync by listing sites in Convex
    const convexSites = await convex.query(api.sites.listSites, {});
    console.log(`\n🔍 Verification: ${convexSites.length} sites now in Convex`);

  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

// Run the sync
syncSitesToConvex()
  .then(() => {
    console.log('✅ Site sync completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Site sync failed:', error);
    process.exit(1);
  });