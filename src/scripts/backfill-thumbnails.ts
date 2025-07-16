#!/usr/bin/env ts-node
/*
  Backfill thumbnails for legacy images that are still plain-string URLs.
  Usage: npx ts-node -P tsconfig.scripts.json src/scripts/backfill-thumbnails.ts [--dry-run]
*/
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

import { createSupabaseAdminClient } from '../lib/supabase/server';
import { uploadImageWithSizes } from '../lib/media';
import { Database } from '../lib/supabase/database.types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fetch = require('node-fetch');

const DRY_RUN = process.argv.includes('--dry-run');

(async () => {
  console.log('Starting backfill script...');
  if (DRY_RUN) {
    console.log('** DRY RUN MODE: No changes will be written to the database. **');
  }

  const supabase = await createSupabaseAdminClient();

  // 1. Fetch all collections to map collection_id to site_id
  const { data: collections, error: collErr } = await supabase.from('collections').select('id, site_id');
  if (collErr) {
    console.error('Error fetching collections:', collErr);
    return;
  }
  const collectionMap = new Map(collections.map(c => [c.id, c.site_id]));

  // 2. Fetch all content items
  const { data: items, error: itemsErr } = await supabase.from('content_items').select('*');
  if (itemsErr) {
    console.error('Error fetching content items:', itemsErr);
    return;
  }

  let updatedCount = 0;
  for (const item of items as Database['public']['Tables']['content_items']['Row'][]) {
    const imagesToProcess: { path: string[]; url: string }[] = [];

    // Recursively find string properties that look like image URLs
    function findImageUrls(obj: any, path: string[] = []) {
      if (!obj) return;
      if (typeof obj === 'string' && obj.startsWith('http') && (obj.endsWith('.jpg') || obj.endsWith('.png') || obj.endsWith('.webp'))) {
        // Check if it's a simple URL, not an object with sizes
        imagesToProcess.push({ path, url: obj });
      } else if (Array.isArray(obj)) {
        obj.forEach((el, i) => findImageUrls(el, [...path, i.toString()]));
      } else if (typeof obj === 'object') {
        // Avoid walking through our own 'sizes' object
        if (obj.hasOwnProperty('original') && obj.hasOwnProperty('thumb')) return;
        Object.keys(obj).forEach(key => findImageUrls(obj[key], [...path, key]));
      }
    }

    findImageUrls(item.data);

    if (imagesToProcess.length === 0) {
      continue;
    }

    if (!item.collection_id) {
      console.warn(`Skipping item ${item.id} because it has no collection_id.`);
      continue;
    }

    const siteId = collectionMap.get(item.collection_id);
    if (!siteId) {
      console.warn(`Skipping item ${item.id} because its collection/site could not be found.`);
      continue;
    }

    let updatedData = JSON.parse(JSON.stringify(item.data));
    let hasChanges = false;

    for (const image of imagesToProcess) {
      console.log(`Processing image: ${image.url}`);
      try {
        const response = await fetch(image.url);
        if (!response.ok) {
          console.error(`  -> Failed to fetch: ${response.statusText}`);
          continue;
        }
        const buffer = await response.buffer();
        const mimeType = response.headers.get('content-type') || 'image/jpeg';
        const fileName = image.url.split('/').pop()?.split('?')[0] || 'image.jpg';

        const urls = await uploadImageWithSizes(supabase, siteId, fileName, mimeType, buffer);

        // Update the nested property in the data object
        let current = updatedData;
        for (let i = 0; i < image.path.length - 1; i++) {
          current = current[image.path[i]];
        }
        current[image.path[image.path.length - 1]] = urls;
        hasChanges = true;
        console.log(`  -> Success: Generated thumbnails.`);

      } catch (e: any) {
        console.error(`  -> Error processing image ${image.url}:`, e.message);
      }
    }

    if (hasChanges && !DRY_RUN) {
      const { error: updateError } = await supabase
        .from('content_items')
        .update({ data: updatedData, updated_at: new Date().toISOString() })
        .eq('id', item.id);

      if (updateError) {
        console.error(`Failed to update item ${item.id}:`, updateError.message);
      } else {
        console.log(`Successfully updated item ${item.id}`);
        updatedCount++;
      }
    }
  }

  console.log(`\nBackfill complete. Processed ${items.length} items.`);
  if (DRY_RUN) {
    console.log('DRY RUN: No items were updated in the database.');
  } else {
    console.log(`Updated ${updatedCount} items with new thumbnail data.`);
  }
})();
