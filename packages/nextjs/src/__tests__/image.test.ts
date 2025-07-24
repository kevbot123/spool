import { img } from '../utils/image';
import type { ImageSizes } from '../types';

describe('Image utilities', () => {
  const mockImageSizes: ImageSizes = {
    original: 'https://example.com/image.jpg',
    thumb: 'https://example.com/image_thumb.webp',
    small: 'https://example.com/image_small.webp',
  };

  const mockLegacyUrl = 'https://example.com/legacy-image.jpg';

  describe('img()', () => {
    it('should return empty string for null/undefined values', () => {
      expect(img(null)).toBe('');
      expect(img(undefined)).toBe('');
    });

    it('should return the original URL for legacy string values', () => {
      expect(img(mockLegacyUrl)).toBe(mockLegacyUrl);
      expect(img(mockLegacyUrl, 'thumb')).toBe(mockLegacyUrl);
      expect(img(mockLegacyUrl, 'small')).toBe(mockLegacyUrl);
      expect(img(mockLegacyUrl, 'original')).toBe(mockLegacyUrl);
    });

    it('should return the correct size for image objects', () => {
      expect(img(mockImageSizes, 'thumb')).toBe(mockImageSizes.thumb);
      expect(img(mockImageSizes, 'small')).toBe(mockImageSizes.small);
      expect(img(mockImageSizes, 'original')).toBe(mockImageSizes.original);
    });

    it('should default to original size when no size specified', () => {
      expect(img(mockImageSizes)).toBe(mockImageSizes.original);
    });

    it('should fallback to original if requested size is missing', () => {
      const partialSizes = { original: 'https://example.com/image.jpg' } as ImageSizes;
      expect(img(partialSizes, 'thumb')).toBe(partialSizes.original);
    });

    it('should return empty string for invalid objects', () => {
      expect(img({} as ImageSizes)).toBe('');
    });
  });
});