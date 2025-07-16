import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

import Papa from 'papaparse';
import TurndownService from 'turndown';
import { createSupabaseRouteHandlerClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import slugify from 'slugify';
import fetch from 'node-fetch';
import { Readable } from 'stream';
import { ContentManager } from '@/lib/cms/content';

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
}

const BATCH_SIZE = 50;

export async function POST(request: NextRequest, { params }: { params: Promise<{ collection: string }> }) {
  const { collection } = await params;

  try {
    const formData = await request.formData();

    const file = formData.get('file') as File | null;
    const mappingJson = formData.get('mapping') as string | null;
    const siteId = formData.get('siteId') as string | null;

    if (!file || !mappingJson || !siteId) {
      return NextResponse.json(
        { error: 'Missing file, mapping, or siteId' },
        { status: 400 },
      );
    }

    

    const mapping: Record<string, string> = JSON.parse(mappingJson);
    const fileStream = Readable.fromWeb(file.stream() as any);

    const supabase = await createSupabaseRouteHandlerClient();
    const storageAdmin = await createSupabaseAdminClient(); // bypass RLS for storage uploads
    const { data: { session } } = await supabase.auth.getSession();

    const contentManager = new ContentManager(supabase);
    const td = new TurndownService();
    const { data: collectionRow, error: collectionErr } = await supabase
      .from('collections')
      .select('schema')
      .eq('slug', collection)
      .eq('site_id', siteId)
      .single();

    if (collectionErr) {
      return NextResponse.json({ error: collectionErr.message }, { status: 400 });
    }

    const fieldTypeMap: Record<string, string> = {};
    const schemaFields: any[] = (collectionRow?.schema as any)?.fields || [];
    const referenceCollectionMap: Record<string,string> = {};
for (const f of schemaFields) {
      if (f && typeof f === 'object' && 'name' in f && 'type' in f) {
        fieldTypeMap[f.name as string] = f.type as string;
      if ((f.type === 'reference' || f.type === 'multi-reference') && (f as any).referenceCollection) {
        referenceCollectionMap[f.name as string] = (f as any).referenceCollection as string;
      }
      }
    }
    const slugIdCache: Record<string, Map<string,string>> = {};
    const importResult: ImportResult = { success: 0, failed: 0, errors: [] };

    // Helper for async string replacement
    async function replaceAsync(
      str: string,
      regex: RegExp,
      asyncFn: (match: string, ...args: any[]) => Promise<string>
    ): Promise<string> {
      const promises: Promise<string>[] = [];
      str.replace(regex, (match, ...args) => {
        promises.push(asyncFn(match, ...args));
        return match; // Return the original match to satisfy string.replace's signature
      });
      const data = await Promise.all(promises);
      return str.replace(regex, () => data.shift()!);
    }
    let batch: any[] = [];
    const rowProcessingPromises: Promise<void>[] = [];

    const processBatch = async () => {
      if (batch.length === 0) return;
      try {
        const { success, failed } = await contentManager.createContentBatch(
          collection,
          batch,
          siteId,
        );
        importResult.success += success;
        importResult.failed += failed;
        // Simplified error reporting for batch
        if (failed > 0) {
          importResult.errors.push({ row: importResult.success + 1, message: `A batch of ${failed} items failed to insert.` });
        }
      } catch (e: any) {
        importResult.failed += batch.length;
        importResult.errors.push({ row: importResult.success + 1, message: e.message });
      }
      batch = [];
    };

    await new Promise<void>((resolve, reject) => {
      Papa.parse(fileStream, {
        header: true,
        skipEmptyLines: true,
        step: (row: any, parser: any) => {
          const rowPromise = (async () => {
            const rowNum = importResult.success + importResult.failed + batch.length + 1;
            try {
              const payload: { data: Record<string, any> } = { data: {} };

              // First pass: Handle dedicated fields
              for (const [csvCol, fieldName] of Object.entries(mapping)) {
                const value = row.data[csvCol];
                if (!fieldName || !value) continue;

                const fieldType = fieldTypeMap[fieldName];
                let processedValue: any = value;

                if (fieldType === 'boolean') {
                  const lowerCaseValue = String(value).toLowerCase().trim();
                  processedValue = lowerCaseValue === 'true' || lowerCaseValue === '1';
                  payload.data[fieldName] = processedValue;
                  continue;
                }

                if (fieldType === 'image' && typeof value === 'string' && value.startsWith('http')) {
                  try {
                    const response = await fetch(value);
                    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
                    const blob = await response.blob();
                    const buffer = await blob.arrayBuffer();
                    const originalFileName = value.split('/').pop()?.split('?')[0] || 'image.jpg';
                    const safeFileName = originalFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
                    const fileName = `${siteId}/${uuidv4()}-${safeFileName}`;

                    const { data: uploadData, error: uploadError } = await storageAdmin.storage
                      .from('media')
                      .upload(fileName, buffer, { contentType: blob.type });

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = storageAdmin.storage.from('media').getPublicUrl(uploadData!.path);
                    payload.data[fieldName] = publicUrl;
                  } catch (e: any) {
                    console.error(`Failed to process dedicated image for row ${rowNum}: ${e.message}`);
                    importResult.errors.push({ row: rowNum, message: `Image download failed for ${value}` });
                    payload.data[fieldName] = null;
                  }
                  continue;
                }

                // Process value based on field type
                if (fieldType === 'markdown' && typeof processedValue === 'string' && /<[^>]+>/.test(processedValue)) {
                  // This is a markdown field with HTML, so process images first
                  const imgRegex = /<img[^>]+src="([^">]+)"/g;
                  const htmlWithReplacedImages = await replaceAsync(processedValue, imgRegex, async (match: string, src: string) => {
                    if (!src.startsWith('http')) return match;
                    try {
                      const response = await fetch(src);
                      if (!response.ok) return match; // Keep original if fetch fails
                      const blob = await response.blob();
                      const buffer = await blob.arrayBuffer();
                      const originalFileName = src.split('/').pop()?.split('?')[0] || 'image.jpg';
                      const safeFileName = originalFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
                      const fileName = `${siteId}/${uuidv4()}-${safeFileName}`;

                      const { data: uploadData, error: uploadError } = await storageAdmin.storage
                        .from('media')
                        .upload(fileName, buffer, { contentType: blob.type });

                      if (uploadError) throw uploadError;

                      const { data: { publicUrl } } = storageAdmin.storage.from('media').getPublicUrl(uploadData!.path);
                      return match.replace(src, publicUrl);
                    } catch (e: any) {
                      console.error(`Failed to replace embedded image ${src}: ${e.message}`);
                      importResult.errors.push({ row: rowNum, message: `Image replacement failed for ${src}` });
                      return match; // Keep original on error
                    }
                  });
                  // Now convert the result to markdown
                  processedValue = td.turndown(htmlWithReplacedImages);
                } else if (typeof processedValue === 'string' && /<[^>]+>/.test(processedValue)) {
                  // This is some other field with HTML, just convert to markdown without image processing
                  processedValue = td.turndown(processedValue);
                }

                // Handle multi-value split for multiselect / multi-reference
if ((fieldType === 'multiselect' || fieldType === 'multi-reference' || fieldType === 'reference') && typeof value === 'string' && value.includes(';')) {
                  processedValue = value.split(';').map((s: string) => s.trim()).filter(Boolean);
                }

                // Resolve reference & multi-reference IDs
if ((fieldType === 'reference' || fieldType === 'multi-reference')) {
  const targetCollection = referenceCollectionMap[fieldName];
  if (targetCollection) {
    const slugArray: string[] = Array.isArray(processedValue) ? processedValue : [processedValue];
    // slug -> id cache per collection
    if (!slugIdCache[targetCollection]) slugIdCache[targetCollection] = new Map<string,string>();
    const cache = slugIdCache[targetCollection];
    const missingSlugs = slugArray.filter(slug => !cache.has(slug));
    if (missingSlugs.length > 0) {
      const { data: items, error: itemsErr } = await supabase
        .from('content_items')
        .select('id, slug, collections!inner(slug)')
        .eq('collections.slug', targetCollection)
        .eq('collections.site_id', siteId)
        .in('slug', missingSlugs);
      if (!itemsErr && items) {
        items.forEach((item: any) => {
          cache.set(item.slug, item.id);
        });
      }
    }
    const idArray = slugArray.map(slug => cache.get(slug)).filter(Boolean);
    processedValue = fieldType === 'reference' ? (idArray[0] || null) : idArray;
  }
}

// Final pass for markdown fields: process any pre-existing markdown images
                if (fieldType === 'markdown' && typeof processedValue === 'string') {
                  const mdImgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
                  processedValue = await replaceAsync(processedValue, mdImgRegex, async (match: string, alt: string, src: string) => {
                    if (!src.startsWith('http')) return match;
                    try {
                      const response = await fetch(src);
                      if (!response.ok) return match;
                      const blob = await response.blob();
                      const buffer = await blob.arrayBuffer();
                      const originalFileName = src.split('/').pop()?.split('?')[0] || 'image.jpg';
                      const safeFileName = originalFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
                      const fileName = `${siteId}/${uuidv4()}-${safeFileName}`;

                      const { data: uploadData, error: uploadError } = await storageAdmin.storage
                        .from('media')
                        .upload(fileName, buffer, { contentType: blob.type });

                      if (uploadError) throw uploadError;

                      const { data: { publicUrl } } = storageAdmin.storage.from('media').getPublicUrl(uploadData!.path);
                      return `![${alt}](${publicUrl})`;
                    } catch (e: any) {
                      console.error(`Failed to replace markdown image ${src}: ${e.message}`);
                      importResult.errors.push({ row: rowNum, message: `Markdown image replacement failed for ${src}` });
                      return match;
                    }
                  });
                }

                payload.data[fieldName] = processedValue;
              }

              // Second pass: Find and replace images embedded in any string field
              for (const fieldName in payload.data) {
                let fieldValue = payload.data[fieldName];
                if (typeof fieldValue === 'string') {
                  const imgRegex = /<img[^>]+src="([^">]+)"/g;
                  payload.data[fieldName] = await replaceAsync(fieldValue, imgRegex, async (match: string, src: string) => {
                    if (!src.startsWith('http')) return match;
                    try {
                      const response = await fetch(src);
                      if (!response.ok) return match;
                      const blob = await response.blob();
                      const buffer = await blob.arrayBuffer();
                      const originalFileName = src.split('/').pop()?.split('?')[0] || 'image.jpg';
                      const safeFileName = originalFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
                      const fileName = `${siteId}/${uuidv4()}-${safeFileName}`;

                      const { data: uploadData, error: uploadError } = await storageAdmin.storage
                        .from('media')
                        .upload(fileName, buffer, { contentType: blob.type });

                      if (uploadError) throw uploadError;

                      const { data: { publicUrl } } = storageAdmin.storage.from('media').getPublicUrl(uploadData!.path);
                      return match.replace(src, publicUrl);
                    } catch (e: any) {
                      console.error(`Failed to replace embedded image ${src}: ${e.message}`);
                      importResult.errors.push({ row: rowNum, message: `Image replacement failed for ${src}` });
                      return match;
                    }
                  });
                }
              }

              (payload as any).title = payload.data.title || `Imported ${rowNum}`;
              (payload as any).slug = slugify(payload.data.title || `Imported ${rowNum}`, { lower: true, strict: true });

              batch.push(payload);
              if (batch.length >= BATCH_SIZE) {
                parser.pause();
                await processBatch();
                parser.resume();
              }
            } catch (e: any) {
              importResult.failed += 1;
              importResult.errors.push({ row: rowNum, message: e.message });
            }
          })();
          rowProcessingPromises.push(rowPromise);
        },
        complete: async () => {
          await Promise.all(rowProcessingPromises);
          await processBatch();
          resolve();
        },
        error: (err: Error) => reject(err),
      });
    });

    return NextResponse.json(importResult);
  } catch (err: any) {
    console.error('Import route error', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
