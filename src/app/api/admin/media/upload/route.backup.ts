import { NextRequest, NextResponse } from 'next/server';
import { uploadImageWithSizes } from '@/lib/media';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';

// POST /api/admin/media/upload
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseRouteHandlerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const siteId = formData.get('site_id') as string | null;
  if (!file || !siteId) return NextResponse.json({ error: 'Missing file or site_id' }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const urls = await uploadImageWithSizes(supabase, siteId, file.name, file.type, buf);
    return NextResponse.json({ url: urls.original, sizes: urls });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
import sharp from 'sharp';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';

// POST /api/admin/media/upload
// Generates `thumb` and `small` WebP versions alongside the original upload.
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseRouteHandlerClient();

  // Ensure user is authenticated (you may skip this if not required)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const siteId = formData.get('site_id') as string | null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (!siteId) return NextResponse.json({ error: 'site_id is required' }, { status: 400 });

    const baseName = `${siteId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Helper to upload buffer and return public URL
    const uploadAndGetUrl = async (path: string, buf: Buffer, contentType: string) => {
      let { data, error } = await supabase.storage.from('media').upload(path, buf, { contentType });
      if (error && error.message.includes('Bucket not found')) {
        const { error: bucketErr } = await supabase.storage.createBucket('media', { public: true });
        if (bucketErr) throw bucketErr;
        ({ data, error } = await supabase.storage.from('media').upload(path, buf, { contentType }));
      }
      if (error || !data) throw error;
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(data.path);
      return publicUrl;
    };

    // Original upload
    const originalUrl = await uploadAndGetUrl(baseName, buffer, file.type);

    // Generate resized versions
    const sizeMap: Record<string, number> = { thumb: 160, small: 480 };
    const resizedUrls: Record<string, string> = {};

    await Promise.all(
      Object.entries(sizeMap).map(async ([label, width]) => {
        const resizedBuf = await sharp(buffer).resize({ width }).webp().toBuffer();
        const url = await uploadAndGetUrl(`${baseName}_${label}.webp`, resizedBuf, 'image/webp');
        resizedUrls[label] = url;
      }),
    );

    return NextResponse.json({
      url: originalUrl, // kept for backward-compat
      sizes: { original: originalUrl, ...resizedUrls },
    });
  } catch (err: any) {
    console.error('media upload error', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}

// Handle CORS preflight if necessary
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
import sharp from 'sharp';

import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';

/**
 * POST /api/admin/media/upload
 * Accepts multipart/form-data { file: File, site_id: string }
 * Generates 2 extra sizes (thumb & small) in WebP format alongside the original upload
 * Stores all objects in Supabase Storage bucket `media` and returns public URLs.
 */

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseRouteHandlerClient();

  // Validate session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const siteId = formData.get('site_id') as string | null;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
    if (!siteId) return NextResponse.json({ error: 'site_id required' }, { status: 400 });

    const baseName = `${siteId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Helper to upload and get public URL
    const uploadAndGetUrl = async (path: string, buf: Buffer, contentType: string) => {
      let { data, error } = await supabase.storage.from('media').upload(path, buf, { contentType });
      if (error && error.message.includes('Bucket not found')) {
        const { error: bucketError } = await supabase.storage.createBucket('media', { public: true });
        if (bucketError) throw bucketError;
        ({ data, error } = await supabase.storage.from('media').upload(path, buf, { contentType }));
      }
      if (error || !data) throw error;
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(data.path);
      return publicUrl;
    };

    // Upload original
    const originalUrl = await uploadAndGetUrl(baseName, buffer, file.type);

    // Resize
    const sizes: Record<string, number> = { thumb: 160, small: 480 };
    const resizedUrls: Record<string, string> = {};
    await Promise.all(
      Object.entries(sizes).map(async ([label, width]) => {
        const resized = await sharp(buffer).resize({ width }).webp().toBuffer();
        const url = await uploadAndGetUrl(`${baseName}_${label}.webp`, resized, 'image/webp');
        resizedUrls[label] = url;
      })
    );

    return NextResponse.json({
      url: originalUrl,
      sizes: { original: originalUrl, ...resizedUrls },
    });
  } catch (err: any) {
    console.error('Upload error', err);
    return NextResponse.json({ error: err?.message || 'unknown' }, { status: 500 });
  }
}
  // Use the server client from the customized location
  const supabase = await createSupabaseRouteHandlerClient();

  // Validate user session
  // We need the site_id to create a user-specific folder.
  // The site_id should be passed from the client.
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('Auth error:', userError);
    return NextResponse.json({ error: 'Unauthorized: Invalid session' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const siteId = formData.get('site_id') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!siteId) {
      return NextResponse.json({ error: 'Site ID is required' }, { status: 400 });
    }

    // Generate original and resized versions
    const sizes: Record<string, number> = { thumb: 160, small: 480 };

    // We'll use webp for resized versions for good compression
    const baseName = `${siteId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      .from('media')
      .upload(fileName, buffer, { contentType: file.type });

    if (uploadError && uploadError.message.includes('Bucket not found')) {
      const { error: createError } = await supabase.storage.createBucket('media', { public: true });
      if (createError) {
        console.error('Failed to create bucket:', createError);
        return NextResponse.json({ error: 'Failed to create storage bucket' }, { status: 500 });
      }
      ({ data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, buffer, { contentType: file.type }));
    }

    if (uploadError || !uploadData) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(uploadData.path);
    return NextResponse.json({ url: publicUrl }, { status: 200 });

  } catch (error: any) {
    console.error('Upload API error:', error);
    return NextResponse.json({ error: `An unexpected error occurred: ${error.message}` }, { status: 500 });
  }
}

// Optional: Add OPTIONS method for CORS preflight requests if needed
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*', // Adjust as needed for your security requirements
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
