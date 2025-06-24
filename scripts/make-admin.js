#!/usr/bin/env node

/**
 * Make a user an admin in Spool CMS
 * Usage: node scripts/make-admin.js user@example.com
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function makeAdmin(email) {
  if (!email) {
    console.error('❌ Please provide an email address');
    console.log('Usage: node scripts/make-admin.js user@example.com');
    process.exit(1);
  }

  try {
    // Find user by email
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      throw userError;
    }

    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    // Update user metadata to include admin role
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          role: 'admin'
        }
      }
    );

    if (updateError) {
      throw updateError;
    }

    // Also update in profiles table if it exists
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', user.id);

    // Ignore profile error if table doesn't exist
    
    console.log(`✅ Successfully made ${email} an admin`);
    console.log(`User ID: ${user.id}`);
    
  } catch (error) {
    console.error('❌ Error making user admin:', error.message);
    process.exit(1);
  }
}

const email = process.argv[2];
makeAdmin(email); 