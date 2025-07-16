import sharp from 'sharp';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Uploads an image buffer to the `media` bucket and generates additional sizes.
 *
 * @param supabase        Supabase client (service role or auth'd user) with Storage access.
 * @param siteId          Site namespace folder.
 * @param originalName    Original filename, used only to construct a safe path.
 * @param mime            Original mime type (e.g. image/png).
 * @param buf             Raw image buffer.
 * @param sizesMap        Map of label -> width in px. Defaults to { thumb:160, small:480 }.
 * @returns               Object of { original: url, thumb: url, small: url, ... }
 */
export async function uploadImageWithSizes(
  supabase: SupabaseClient,
  siteId: string,
  originalName: string,
  mime: string,
  buf: Buffer,
  sizesMap: Record<string, number> = { thumb: 160, small: 480 },
) {
  const bucket = 'media';
  const baseName = `${siteId}/${Date.now()}-${originalName.replace(/[^a-zA-Z0-9.]/g, '_')}`;

  // ensure bucket exists (idempotent)
  await supabase.storage.createBucket(bucket, { public: true }).catch(() => {});

  const urls: Record<string, string> = {};

  const upload = async (path: string, buffer: Buffer, contentType: string) => {
    const { data, error } = await supabase.storage.from(bucket).upload(path, buffer, {
      contentType,
      upsert: false,
    });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return publicUrl;
  };

  // original
  urls.original = await upload(baseName, buf, mime);

  // resized
  await Promise.all(
    Object.entries(sizesMap).map(async ([label, width]) => {
      const resized = await sharp(buf).resize({ width }).webp().toBuffer();
      urls[label] = await upload(`${baseName}_${label}.webp`, resized, 'image/webp');
    }),
  );

  return urls;
}
