import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  checkAuthStatusTool,
  getUserInfoTool,
  checkAuthStatusToolDefinition,
  getUserInfoToolDefinition
} from '../../src/tools/auth/user-tools.js';
import { ZaimApiClient } from '../../src/core/zaim-api-client.js';
import { TokenStorage } from '../../src/utils/token-storage.js';

// ZaimApiClientのモック
vi.mock('../../src/core/zaim-api-client.js', () => ({
  ZaimApiClient: vi.fn()
}));

// TokenStorageのモック
vi.mock('../../src/utils/token-storage.js', () => ({
  TokenStorage: {
    createZaimApiClient: vi.fn()
  }
}));

const mockZaimApiClient = vi.mocked(ZaimApiClient);
const mockTokenStorage = vi.mocked(TokenStorage);

describe('Auth User Tools', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      get: vi.fn()
    };
    mockZaimApiClient.mockImplementation(() => mockClient);
    mockTokenStorage.createZaimApiClient.mockReturnValue(mockClient);
  });

  describe('checkAuthStatusTool', () => {
    it('should return auth status when credentials are valid', async () => {
      const mockResponse = {
        me: {
          id: 12345,
          login: 'testuser',
          name: 'Test User'
        }
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await checkAuthStatusTool({});

      expect(mockClient.get).toHaveBeenCalledWith('/v2/home/user/verify');
      expect(result).toEqual({
        isAuthenticated: true,
        user: {
          id: 12345,
          login: 'testuser',
          name: 'Test User'
        },
        message: '認証に成功しました'
      });
    });

    it('should return auth failure when API returns error', async () => {
      const mockError = new Error('Zaim API Error: 401 - Unauthorized');
      mockClient.get.mockRejectedValue(mockError);

      const result = await checkAuthStatusTool({});

      expect(result).toEqual({
        isAuthenticated: false,
        user: null,
        message: '認証に失敗しました: Zaim API Error: 401 - Unauthorized'
      });
    });

    it('should handle network errors gracefully', async () => {
      const mockError = new Error('Network error');
      mockClient.get.mockRejectedValue(mockError);

      const result = await checkAuthStatusTool({});

      expect(result).toEqual({
        isAuthenticated: false,
        user: null,
        message: '認証に失敗しました: Network error'
      });
    });

    it('should handle invalid response format', async () => {
      const mockResponse = { invalid: 'response' };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await checkAuthStatusTool({});

      expect(result).toEqual({
        isAuthenticated: false,
        user: null,
        message: '認証に失敗しました: 無効なレスポンス形式'
      });
    });
  });

  describe('getUserInfoTool', () => {
    it('should return detailed user information', async () => {
      const mockResponse = {
        me: {
          id: 12345,
          login: 'testuser',
          name: 'Test User',
          profile_image_url: 'https://example.com/avatar.jpg',
          input_count: 150,
          repeat_count: 30,
          day: '2024-01-01'
        }
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await getUserInfoTool({});

      expect(mockClient.get).toHaveBeenCalledWith('/v2/home/user/verify');
      expect(result).toEqual({
        user: {
          id: 12345,
          login: 'testuser',
          name: 'Test User',
          profile_image_url: 'https://example.com/avatar.jpg',
          input_count: 150,
          repeat_count: 30,
          day: '2024-01-01'
        },
        success: true,
        message: 'ユーザー情報を取得しました'
      });
    });

    it('should handle API errors', async () => {
      const mockError = new Error('Zaim API Error: 401 - Unauthorized');
      mockClient.get.mockRejectedValue(mockError);

      const result = await getUserInfoTool({});

      expect(result).toEqual({
        user: null,
        success: false,
        message: 'ユーザー情報の取得に失敗しました: Zaim API Error: 401 - Unauthorized'
      });
    });

    it('should handle missing user data in response', async () => {
      const mockResponse = {};
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await getUserInfoTool({});

      expect(result).toEqual({
        user: null,
        success: false,
        message: 'ユーザー情報の取得に失敗しました: ユーザーデータが見つかりません'
      });
    });

    it('should handle partial user data', async () => {
      const mockResponse = {
        me: {
          id: 12345,
          name: 'Test User'
          // 他のフィールドが欠落
        }
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await getUserInfoTool({});

      expect(result).toEqual({
        user: {
          id: 12345,
          name: 'Test User'
        },
        success: true,
        message: 'ユーザー情報を取得しました'
      });
    });
  });

  describe('Tool Definitions', () => {
    it('should have correct checkAuthStatusToolDefinition', () => {
      expect(checkAuthStatusToolDefinition).toEqual({
        name: 'zaim_check_auth_status',
        description: 'Zaim APIの認証状態をチェックし、アクセストークンの有効性を確認します',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        }
      });
    });

    it('should have correct getUserInfoToolDefinition', () => {
      expect(getUserInfoToolDefinition).toEqual({
        name: 'zaim_get_user_info',
        description: 'Zaimユーザーの詳細情報（プロフィール、統計情報等）を取得します',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        }
      });
    });
  });

  describe('Input Validation', () => {
    it('should accept empty input for checkAuthStatusTool', async () => {
      mockClient.get.mockResolvedValue({ me: { id: 1, name: 'Test' } });
      
      await expect(checkAuthStatusTool({})).resolves.toBeDefined();
    });

    it('should accept empty input for getUserInfoTool', async () => {
      mockClient.get.mockResolvedValue({ me: { id: 1, name: 'Test' } });
      
      await expect(getUserInfoTool({})).resolves.toBeDefined();
    });
  });
});