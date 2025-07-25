import { callWebhook, triggerContentWebhook } from '../index';

// Mock fetch globally
global.fetch = jest.fn();

describe('Webhook System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('callWebhook', () => {
    it('should call webhook URL with correct payload', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
      } as Response);

      const webhookUrl = 'https://example.com/api/webhooks/spool';
      const payload = {
        event: 'content.updated' as const,
        site_id: 'site-123',
        collection: 'blog',
        slug: 'test-post',
        item_id: 'item-123',
        timestamp: '2023-01-01T00:00:00.000Z',
      };

      const result = await callWebhook(webhookUrl, payload);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Spool-CMS-Webhook/1.0',
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
      } as Response);

      const result = await callWebhook('https://example.com/webhook', {
        event: 'content.updated',
        site_id: 'site-123',
        collection: 'blog',
        item_id: 'item-123',
        timestamp: '2023-01-01T00:00:00.000Z',
      });

      expect(result).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await callWebhook('https://example.com/webhook', {
        event: 'content.updated',
        site_id: 'site-123',
        collection: 'blog',
        item_id: 'item-123',
        timestamp: '2023-01-01T00:00:00.000Z',
      });

      expect(result).toBe(false);
    });
  });

  describe('triggerContentWebhook', () => {
    it('should not call webhook if no URL is configured', async () => {
      const mockSupabase = {
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
        mockSupabase,
        'content.updated',
        'site-123',
        'blog',
        'item-123',
        'test-post'
      );

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});