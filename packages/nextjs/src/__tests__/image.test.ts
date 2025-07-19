import { img, getImageSizes, hasMultipleSizes } from '../utils/image';
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

  describe('getImageSizes()', () => {
    it('should return null for null/undefined values', () => {
      expect(getImageSizes(null)).toBeNull();
      expect(getImageSizes(undefined)).toBeNull();
    });

    it('should return legacy format for string URLs', () => {
      const result = getImageSizes(mockLegacyUrl);
      expect(result).toEqual({
        original: mockLegacyUrl,
        thumb: mockLegacyUrl,
        small: mockLegacyUrl,
      });
    });

    it('should return the sizes object as-is for image objects', () => {
      expect(getImageSizes(mockImageSizes)).toBe(mockImageSizes);
    });

    it('should return null for invalid objects', () => {
      expect(getImageSizes({} as any)).toBeNull();
    });
  });

  describe('hasMultipleSizes()', () => {
    it('should return false for null/undefined values', () => {
      expect(hasMultipleSizes(null)).toBe(false);
      expect(hasMultipleSizes(undefined)).toBe(false);
    });

    it('should return false for legacy string URLs', () => {
      expect(hasMultipleSizes(mockLegacyUrl)).toBe(false);
    });

    it('should return true for image objects', () => {
      expect(hasMultipleSizes(mockImageSizes)).toBe(true);
    });

    it('should return false for invalid objects', () => {
      expect(hasMultipleSizes({} as any)).toBe(false);
    });
  });
});