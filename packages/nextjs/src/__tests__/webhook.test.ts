import { 
  verifySpoolWebhook, 
  parseSpoolWebhook, 
  getSpoolWebhookHeaders, 
  createSpoolWebhookHandler,
  SpoolWebhookPayload 
} from '../utils/webhook';

describe('Webhook Utilities', () => {
  describe('verifySpoolWebhook', () => {
    it('should verify correct signature', () => {
      const payload = '{"test": true}';
      const secret = 'test-secret';
      // Calculate the correct signature for this payload and secret
      const crypto = require('crypto');
      const expectedHash = crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
      const signature = `sha256=${expectedHash}`;
      
      const isValid = verifySpoolWebhook(payload, signature, secret);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect signature', () => {
      const payload = '{"test": true}';
      const secret = 'test-secret';
      const signature = 'sha256=invalid-signature';
      
      const isValid = verifySpoolWebhook(payload, signature, secret);
      expect(isValid).toBe(false);
    });

    it('should return false for missing secret', () => {
      const payload = '{"test": true}';
      const signature = 'sha256=some-signature';
      
      const isValid = verifySpoolWebhook(payload, signature, '');
      expect(isValid).toBe(false);
    });

    it('should return false for missing signature', () => {
      const payload = '{"test": true}';
      const secret = 'test-secret';
      
      const isValid = verifySpoolWebhook(payload, '', secret);
      expect(isValid).toBe(false);
    });
  });

  describe('parseSpoolWebhook', () => {
    const validPayload: SpoolWebhookPayload = {
      event: 'content.updated',
      site_id: 'site-123',
      collection: 'blog',
      slug: 'test-post',
      item_id: 'item-123',
      timestamp: '2024-01-15T10:30:00.000Z'
    };

    it('should parse valid webhook payload', () => {
      const payload = JSON.stringify(validPayload);
      const result = parseSpoolWebhook(payload);
      
      expect(result).toEqual(validPayload);
    });

    it('should return null for invalid JSON', () => {
      const payload = 'invalid json';
      const result = parseSpoolWebhook(payload);
      
      expect(result).toBeNull();
    });

    it('should return null for missing required fields', () => {
      const payload = JSON.stringify({
        event: 'content.updated',
        site_id: 'site-123'
        // missing collection, item_id, timestamp
      });
      const result = parseSpoolWebhook(payload);
      
      expect(result).toBeNull();
    });

    it('should return null for invalid event type', () => {
      const payload = JSON.stringify({
        ...validPayload,
        event: 'invalid.event'
      });
      const result = parseSpoolWebhook(payload);
      
      expect(result).toBeNull();
    });

    it('should handle payload without slug', () => {
      const payloadWithoutSlug = {
        ...validPayload,
        slug: undefined
      };
      delete payloadWithoutSlug.slug;
      
      const payload = JSON.stringify(payloadWithoutSlug);
      const result = parseSpoolWebhook(payload);
      
      expect(result).toEqual(payloadWithoutSlug);
    });
  });

  describe('getSpoolWebhookHeaders', () => {
    it('should extract webhook headers from request', () => {
      const mockRequest = {
        headers: {
          get: jest.fn((name: string) => {
            const headers: Record<string, string> = {
              'x-spool-signature-256': 'sha256=test-signature',
              'x-spool-delivery': 'delivery-123',
              'x-spool-event': 'content.updated',
              'user-agent': 'Spool-CMS-Webhook/1.0'
            };
            return headers[name] || null;
          })
        }
      } as any;

      const headers = getSpoolWebhookHeaders(mockRequest);
      
      expect(headers).toEqual({
        signature: 'sha256=test-signature',
        deliveryId: 'delivery-123',
        event: 'content.updated',
        userAgent: 'Spool-CMS-Webhook/1.0'
      });
    });

    it('should handle missing headers', () => {
      const mockRequest = {
        headers: {
          get: jest.fn(() => null)
        }
      } as any;

      const headers = getSpoolWebhookHeaders(mockRequest);
      
      expect(headers).toEqual({
        signature: undefined,
        deliveryId: undefined,
        event: undefined,
        userAgent: undefined
      });
    });
  });

  describe('createSpoolWebhookHandler', () => {
    const validPayload: SpoolWebhookPayload = {
      event: 'content.updated',
      site_id: 'site-123',
      collection: 'blog',
      slug: 'test-post',
      item_id: 'item-123',
      timestamp: '2024-01-15T10:30:00.000Z'
    };

    it('should create a working webhook handler', async () => {
      const onWebhook = jest.fn();
      const handler = createSpoolWebhookHandler({ onWebhook });

      const mockRequest = {
        text: jest.fn().mockResolvedValue(JSON.stringify(validPayload)),
        headers: {
          get: jest.fn(() => null)
        }
      } as any;

      const response = await handler(mockRequest);
      
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('OK');
      expect(onWebhook).toHaveBeenCalledWith(validPayload, expect.any(Object));
    });

    it('should verify signature when secret is provided', async () => {
      const onWebhook = jest.fn();
      const secret = 'test-secret';
      const handler = createSpoolWebhookHandler({ secret, onWebhook });

      const payload = JSON.stringify(validPayload);
      const mockRequest = {
        text: jest.fn().mockResolvedValue(payload),
        headers: {
          get: jest.fn((name: string) => {
            if (name === 'x-spool-signature-256') {
              return 'sha256=invalid-signature';
            }
            return null;
          })
        }
      } as any;

      const response = await handler(mockRequest);
      
      expect(response.status).toBe(401);
      expect(await response.text()).toBe('Unauthorized');
      expect(onWebhook).not.toHaveBeenCalled();
    });

    it('should handle invalid payload', async () => {
      const onWebhook = jest.fn();
      const handler = createSpoolWebhookHandler({ onWebhook });

      const mockRequest = {
        text: jest.fn().mockResolvedValue('invalid json'),
        headers: {
          get: jest.fn(() => null)
        }
      } as any;

      const response = await handler(mockRequest);
      
      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Invalid payload');
      expect(onWebhook).not.toHaveBeenCalled();
    });

    it('should handle webhook processing errors', async () => {
      const onWebhook = jest.fn().mockRejectedValue(new Error('Processing failed'));
      const handler = createSpoolWebhookHandler({ onWebhook });

      const mockRequest = {
        text: jest.fn().mockResolvedValue(JSON.stringify(validPayload)),
        headers: {
          get: jest.fn(() => null)
        }
      } as any;

      const response = await handler(mockRequest);
      
      expect(response.status).toBe(500);
      expect(await response.text()).toBe('Error processing webhook');
    });

    it('should use custom error handler', async () => {
      const onWebhook = jest.fn().mockRejectedValue(new Error('Processing failed'));
      const onError = jest.fn().mockResolvedValue(new Response('Custom error', { status: 422 }));
      const handler = createSpoolWebhookHandler({ onWebhook, onError });

      const mockRequest = {
        text: jest.fn().mockResolvedValue(JSON.stringify(validPayload)),
        headers: {
          get: jest.fn(() => null)
        }
      } as any;

      const response = await handler(mockRequest);
      
      expect(response.status).toBe(422);
      expect(await response.text()).toBe('Custom error');
      expect(onError).toHaveBeenCalledWith(expect.any(Error), mockRequest);
    });
  });
});