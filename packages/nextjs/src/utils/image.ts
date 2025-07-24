/**
 * Image utility functions for Spool CMS
 */

export type ImageSize = 'thumb' | 'small' | 'original';

export interface ImageSizes {
  original: string;
  thumb: string;
  small: string;
}

/**
 * Helper function to get the appropriate image URL from Spool image field
 * 
 * @param imageValue - The image field value (can be a string URL or an object with sizes)
 * @param size - The desired image size ('thumb' | 'small' | 'original')
 * @returns The appropriate image URL
 * 
 * @example
 * ```tsx
 * import { img } from '@spoolcms/nextjs';
 * 
 * // Use thumbnail for fast loading in lists
 * <Image src={img(item.headerImage, 'thumb')} width={160} height={90} />
 * 
 * // Use small for medium-sized displays
 * <Image src={img(item.headerImage, 'small')} width={480} height={270} />
 * 
 * // Use original for full-size displays
 * <Image src={img(item.headerImage, 'original')} width={1200} height={675} />
 * ```
 */
export function img(imageValue: string | ImageSizes | null | undefined, size: ImageSize = 'original'): string {
  // Handle null/undefined values
  if (!imageValue) {
    return '';
  }

  // If it's a string (legacy format), return as-is
  if (typeof imageValue === 'string') {
    return imageValue;
  }

  // If it's an object with sizes, return the requested size
  if (typeof imageValue === 'object' && imageValue !== null) {
    return imageValue[size] || imageValue.original || '';
  }

  return '';
}

