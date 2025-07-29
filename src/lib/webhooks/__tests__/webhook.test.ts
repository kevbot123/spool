import { callWebhook, triggerContentWebhook, generateWebhookSecret, verifyWebhookSignature } from '../index';

// Mock fetch globally
global.fetch = jest.fn();

describe('Webhook System', () => {
  const mockSupabase = {
    from: jest.fn().mockReturnValue({
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { settings: { webhook_url: 'https://example.com/webhook' } },
            error: null,
          }),
        }),
      }),
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateWebhookSecret', () => {
    it('should generate a 64-character hex string', () => {
      const secret = generateWebhookSecret();
      expect(secret).toMatch(/^[a-f0-9]{64}$/);
      expect(secret.length).toBe(64);
    });

    it('should generate unique secrets', () => {
      const secret1 = generateWebhookSecret();
      const secret2 = generateWebhookSecret();
      expect(secret1).not.toBe(secret2);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify correct signature', () => {
      const payload = '{"test": true}';
      const secret = 'test-secret';
      const signature = 'sha256=4f0ea5cd0585a23d028abdc1a6684e5a4f90949eddd5f1e36ef2969ba901492a';
      
      const isValid = verifyWebhookSignature(payload, signature, secret);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect signature', () => {
      const payload = '{"test": true}';
      const secret = 'test-secret';
      const signature = 'sha256=invalid-signature';
      
      const isValid = verifyWebhookSignature(payload, signature, secret);
      expect(isValid).toBe(false);
    });
  });

  describe('callWebhook', () => {
    it('should call webhook URL with correct payload and signature', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: jest.fn().mockResolvedValue('OK'),
      } as any);

      const webhookUrl = 'https://example.com/api/webhooks/spool';
      const payload = {
        event: 'content.updated' as const,
        site_id: 'site-123',
        collection: 'blog',
        slug: 'test-post',
        item_id: 'item-123',
        timestamp: '2023-01-01T00:00:00.000Z',
      };
      const secret = 'test-secret';

      const result = await callWebhook(mockSupabase, webhookUrl, payload, secret);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Spool-CMS-Webhook/1.0',
          'X-Spool-Delivery': expect.any(String),
          'X-Spool-Event': 'content.updated',
          'X-Spool-Signature-256': expect.stringMatching(/^sha256=[a-f0-9]{64}$/),
        },
        body: JSON.stringify(payload),
        signal: expect.any(AbortSignal),
      });
    });

    it('should handle webhook failures gracefully', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Server Error'),
      } as any);

      const result = await callWebhook(mockSupabase, 'https://example.com/webhook', {
        event: 'content.updated',
        site_id: 'site-123',
        collection: 'blog',
        item_id: 'item-123',
        timestamp: '2023-01-01T00:00:00.000Z',
      });

      expect(result).toBe(false);
      expect(mockSupabase.from).toHaveBeenCalledWith('webhook_deliveries');
    });

    it('should handle network errors gracefully', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await callWebhook(mockSupabase, 'https://example.com/webhook', {
        event: 'content.updated',
        site_id: 'site-123',
        collection: 'blog',
        item_id: 'item-123',
        timestamp: '2023-01-01T00:00:00.000Z',
      });

      expect(result).toBe(false);
      expect(mockSupabase.from).toHaveBeenCalledWith('webhook_deliveries');
    });
  });

  describe('triggerContentWebhook', () => {
    it('should not call webhook if no URL is configured', async () => {
      const mockSupabaseNoWebhook = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { settings: {} },
                error: null,
              }),
            }),
          }),
        }),
      };

      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

      await triggerContentWebhook(
        mockSupabaseNoWebhook,
        'content.updated',
        'site-123',
        'blog',
        'item-123',
        'test-post'
      );

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should call webhook when URL is configured', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: jest.fn().mockResolvedValue('OK'),
      } as any);

      await triggerContentWebhook(
        mockSupabase,
        'content.updated',
        'site-123',
        'blog',
        'item-123',
        'test-post'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'User-Agent': 'Spool-CMS-Webhook/1.0',
          }),
        })
      );
    });
  });
});