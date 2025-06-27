/**
 * Migration script to update existing collections that use 'textarea' field types to 'text'
 * 
 * This script can be run against your Supabase database to update any collections
 * that have 'textarea' field types to use 'text' instead.
 * 
 * Usage: node scripts/migrate-textarea-to-text.js
 */

const { createClient } = require('@supabase/supabase-js');

// You'll need to set these environment variables or update them here
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for admin operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateTextareaToText() {
  console.log('Starting migration of textarea fields to text fields...');
  
  try {
    // First, get all collections that have textarea fields
    const { data: collections, error: fetchError } = await supabase
      .from('collections')
      .select('id, slug, schema')
      .not('schema', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch collections: ${fetchError.message}`);
    }

    console.log(`Found ${collections.length} collections to check...`);

    let updatedCount = 0;

    for (const collection of collections) {
      const schema = collection.schema;
      
      if (!schema || !schema.fields || !Array.isArray(schema.fields)) {
        continue;
      }

      // Check if any fields are textarea type
      const hasTextareaFields = schema.fields.some(field => field.type === 'textarea');
      
      if (!hasTextareaFields) {
        continue;
      }

      console.log(`Updating collection: ${collection.slug}`);

      // Update textarea fields to text
      const updatedFields = schema.fields.map(field => {
        if (field.type === 'textarea') {
          return { ...field, type: 'text' };
        }
        return field;
      });

      const updatedSchema = {
        ...schema,
        fields: updatedFields
      };

      // Update the collection in the database
      const { error: updateError } = await supabase
        .from('collections')
        .update({ schema: updatedSchema })
        .eq('id', collection.id);

      if (updateError) {
        console.error(`Failed to update collection ${collection.slug}:`, updateError.message);
        continue;
      }

      updatedCount++;
      console.log(`✓ Updated collection: ${collection.slug}`);
    }

    console.log(`\nMigration complete! Updated ${updatedCount} collections.`);
    
    if (updatedCount === 0) {
      console.log('No collections needed updating - they already use text fields.');
    }

  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
migrateTextareaToText(); 