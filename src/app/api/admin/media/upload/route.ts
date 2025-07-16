import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
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

    const fileExtension = file.name.split('.').pop();
    // Create a filename that is less predictable and includes a timestamp
    const fileName = `${siteId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    
    const buffer = Buffer.from(await file.arrayBuffer());

    let { data: uploadData, error: uploadError } = await supabase.storage
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
