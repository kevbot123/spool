import { NextRequest, NextResponse } from 'next/server';
import { uploadImageWithSizes } from '@/lib/media';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';

// Centralized image upload + thumbnail API
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseRouteHandlerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const siteId = formData.get('site_id') as string | null;
  if (!file || !siteId) {
    return NextResponse.json({ error: 'Missing file or site_id' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const urls = await uploadImageWithSizes(supabase, siteId, file.name, file.type, buffer);
    return NextResponse.json({ url: urls.original, sizes: urls });
  } catch (err: any) {
    console.error('upload error', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
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
