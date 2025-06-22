import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZaimApiClient } from '../src/core/zaim-api-client.js';

// fetchのモック
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('ZaimApiClient', () => {
  let client: ZaimApiClient;
  const mockConfig = {
    consumerKey: 'test_consumer_key',
    consumerSecret: 'test_consumer_secret',
    accessToken: 'test_access_token',
    accessTokenSecret: 'test_access_token_secret'
  };

  beforeEach(() => {
    client = new ZaimApiClient(mockConfig);
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with valid config', () => {
      expect(client).toBeInstanceOf(ZaimApiClient);
    });

    it('should throw error with invalid config', () => {
      expect(() => {
        new ZaimApiClient({
          consumerKey: '',
          consumerSecret: 'secret',
          accessToken: 'token',
          accessTokenSecret: 'token_secret'
        });
      }).toThrow('consumerKey is required');
    });
  });

  describe('get method', () => {
    it('should make GET request with OAuth signature', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ user: { id: 1, name: 'Test User' } })
      };
      mockFetch.mockResolvedValue(mockResponse);

      await client.get('/v2/home/user/verify');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.zaim.net/v2/home/user/verify',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': expect.stringMatching(/^OAuth /)
          })
        })
      );
    });

    it('should handle query parameters', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ money: [] })
      };
      mockFetch.mockResolvedValue(mockResponse);

      await client.get('/v2/home/money', { 
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.zaim.net/v2/home/money?start_date=2024-01-01&end_date=2024-01-31',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(client.get('/v2/home/user/verify')).rejects.toThrow(
        'Zaim API Error: 401 - Unauthorized'
      );
    });
  });

  describe('post method', () => {
    it('should make POST request with OAuth signature', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ money: { id: 123 } })
      };
      mockFetch.mockResolvedValue(mockResponse);

      await client.post('/v2/home/money/payment', {
        amount: 1000,
        date: '2024-01-15',
        category_id: 101
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.zaim.net/v2/home/money/payment',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': expect.stringMatching(/^OAuth /),
            'Content-Type': 'application/x-www-form-urlencoded'
          }),
          body: 'amount=1000&date=2024-01-15&category_id=101'
        })
      );
    });

    it('should handle POST request errors', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({ error: 'Bad Request', message: 'Invalid amount' })
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(client.post('/v2/home/money/payment', {
        amount: -1000
      })).rejects.toThrow('Zaim API Error: 400 - Invalid amount');
    });
  });

  describe('put method', () => {
    it('should make PUT request with OAuth signature', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ money: { id: 123 } })
      };
      mockFetch.mockResolvedValue(mockResponse);

      await client.put('/v2/home/money/123', {
        amount: 1500,
        comment: 'Updated amount'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.zaim.net/v2/home/money/123',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Authorization': expect.stringMatching(/^OAuth /),
            'Content-Type': 'application/x-www-form-urlencoded'
          }),
          body: 'amount=1500&comment=Updated%20amount'
        })
      );
    });
  });

  describe('delete method', () => {
    it('should make DELETE request with OAuth signature', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      };
      mockFetch.mockResolvedValue(mockResponse);

      await client.delete('/v2/home/money/123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.zaim.net/v2/home/money/123',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Authorization': expect.stringMatching(/^OAuth /)
          })
        })
      );
    });
  });

  describe('OAuth header generation', () => {
    it('should generate proper OAuth authorization header', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({})
      };
      mockFetch.mockResolvedValue(mockResponse);

      await client.get('/v2/home/user/verify');

      const authHeader = mockFetch.mock.calls[0][1].headers.Authorization;
      
      // OAuth headerの基本形式をチェック
      expect(authHeader).toMatch(/^OAuth /);
      expect(authHeader).toContain('oauth_consumer_key="test_consumer_key"');
      expect(authHeader).toContain('oauth_token="test_access_token"');
      expect(authHeader).toContain('oauth_signature_method="HMAC-SHA1"');
      expect(authHeader).toContain('oauth_version="1.0"');
      expect(authHeader).toContain('oauth_signature=');
      expect(authHeader).toContain('oauth_timestamp=');
      expect(authHeader).toContain('oauth_nonce=');
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(client.get('/v2/home/user/verify')).rejects.toThrow(
        'Network error occurred: Network error'
      );
    });

    it('should handle JSON parsing errors', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(client.get('/v2/home/user/verify')).rejects.toThrow(
        'Zaim API Error: 500 - Unknown error'
      );
    });
  });
});