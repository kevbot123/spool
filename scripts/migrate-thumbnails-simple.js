/**
 * Simple migration script to rename thumbnail files
 * Run with: node scripts/migrate-thumbnails-simple.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://atnswfldzgzaqwpkowsj.supabase.co';

// You need to get this from Supabase Dashboard > Settings > API > service_role key
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.log('❌ Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.log('   Get it from: Supabase Dashboard > Settings > API > service_role key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function migrate() {
  console.log('🔍 Finding files to migrate...');
  
  // Get all .webp files that need migration
  const { data: files, error } = await supabase.storage
    .from('media')
    .list('d61d4b22-0600-4a4c-ab27-aa4ec33cbf41', { limit: 1000 });

  if (error) {
    console.error('❌ Error listing files:', error);
    return;
  }

  const filesToMigrate = files
    .filter(file => file.name.includes('.jpeg_') || file.name.includes('.jpg_') || file.name.includes('.png_'))
    .filter(file => file.name.includes('_thumb.webp') || file.name.includes('_small.webp'));

  console.log(`📋 Found ${filesToMigrate.length} files to migrate`);

  for (const file of filesToMigrate) {
    const oldPath = `d61d4b22-0600-4a4c-ab27-aa4ec33cbf41/${file.name}`;
    
    // Generate new name: remove extension before adding suffix
    let newName = file.name;
    if (newName.includes('.jpeg_thumb.webp')) {
      newName = newName.replace('.jpeg_thumb.webp', '_thumb.webp');
    } else if (newName.includes('.jpeg_small.webp')) {
      newName = newName.replace('.jpeg_small.webp', '_small.webp');
    } else if (newName.includes('.jpg_thumb.webp')) {
      newName = newName.replace('.jpg_thumb.webp', '_thumb.webp');
    } else if (newName.includes('.jpg_small.webp')) {
      newName = newName.replace('.jpg_small.webp', '_small.webp');
    } else if (newName.includes('.png_thumb.webp')) {
      newName = newName.replace('.png_thumb.webp', '_thumb.webp');
    } else if (newName.includes('.png_small.webp')) {
      newName = newName.replace('.png_small.webp', '_small.webp');
    }
    
    const newPath = `d61d4b22-0600-4a4c-ab27-aa4ec33cbf41/${newName}`;
    
    if (newName === file.name) {
      console.log(`⏭️  Skipping ${file.name} (already correct format)`);
      continue;
    }
    
    console.log(`🔄 ${file.name} → ${newName}`);
    
    try {
      // Download old file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('media')
        .download(oldPath);
        
      if (downloadError) {
        console.error(`❌ Download failed: ${downloadError.message}`);
        continue;
      }
      
      // Upload with new name
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(newPath, fileData, { contentType: 'image/webp' });
        
      if (uploadError) {
        console.error(`❌ Upload failed: ${uploadError.message}`);
        continue;
      }
      
      // Delete old file
      const { error: deleteError } = await supabase.storage
        .from('media')
        .remove([oldPath]);
        
      if (deleteError) {
        console.error(`❌ Delete failed: ${deleteError.message}`);
        continue;
      }
      
      console.log(`✅ Migrated successfully`);
      
    } catch (error) {
      console.error(`❌ Error migrating ${file.name}:`, error.message);
    }
  }
  
  console.log('🎉 Migration complete!');
}

migrate().catch(console.error);