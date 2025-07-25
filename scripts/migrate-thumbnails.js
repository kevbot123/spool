/**
 * Migration script to rename thumbnail files from old format to new format
 * 
 * Old format: filename.jpeg_thumb.webp, filename.jpeg_small.webp
 * New format: filename_thumb.webp, filename_small.webp
 * 
 * Usage: node scripts/migrate-thumbnails.js
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration for the Spool project
const supabaseUrl = 'https://atnswfldzgzaqwpkowsj.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key-here';

if (!supabaseServiceKey || supabaseServiceKey === 'your-service-role-key-here') {
  console.error('Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.error('You can find this in your Supabase project settings under API keys');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateThumbnails() {
  console.log('🔍 Finding thumbnail files to migrate...');
  
  // List all files in the media bucket
  const { data: files, error } = await supabase.storage
    .from('media')
    .list('', { limit: 1000 });

  if (error) {
    console.error('Error listing files:', error);
    return;
  }

  // Find files that need migration
  const filesToMigrate = [];
  
  for (const file of files) {
    if (file.name.includes('._thumb.webp') || file.name.includes('._small.webp')) {
      const oldName = file.name;
      let newName;
      
      if (oldName.includes('._thumb.webp')) {
        newName = oldName.replace(/(\.[^.]+)_thumb\.webp$/, '_thumb.webp');
      } else if (oldName.includes('._small.webp')) {
        newName = oldName.replace(/(\.[^.]+)_small\.webp$/, '_small.webp');
      }
      
      if (newName && newName !== oldName) {
        filesToMigrate.push({ oldName, newName });
      }
    }
  }

  console.log(`📋 Found ${filesToMigrate.length} files to migrate`);

  if (filesToMigrate.length === 0) {
    console.log('✅ No files need migration');
    return;
  }

  // Migrate each file
  for (const { oldName, newName } of filesToMigrate) {
    console.log(`📁 Migrating: ${oldName} → ${newName}`);
    
    try {
      // Download the old file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('media')
        .download(oldName);

      if (downloadError) {
        console.error(`❌ Error downloading ${oldName}:`, downloadError);
        continue;
      }

      // Upload with new name
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(newName, fileData, {
          contentType: 'image/webp',
          upsert: false
        });

      if (uploadError) {
        console.error(`❌ Error uploading ${newName}:`, uploadError);
        continue;
      }

      // Delete the old file
      const { error: deleteError } = await supabase.storage
        .from('media')
        .remove([oldName]);

      if (deleteError) {
        console.error(`❌ Error deleting ${oldName}:`, deleteError);
        // Don't continue - we don't want duplicates
        continue;
      }

      console.log(`✅ Successfully migrated: ${oldName} → ${newName}`);
      
    } catch (error) {
      console.error(`❌ Unexpected error migrating ${oldName}:`, error);
    }
  }

  console.log('🎉 Migration complete!');
}

// Run the migration
migrateThumbnails().catch(console.error);