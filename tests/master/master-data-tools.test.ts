import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getUserCategoriesTool,
  getUserGenresTool,
  getUserAccountsTool,
  getDefaultCategoriesByModeTool,
  getDefaultGenresByModeTool,
  getCurrenciesTool,
  getUserCategoriesToolDefinition,
  getUserGenresToolDefinition,
  getUserAccountsToolDefinition,
  getDefaultCategoriesByModeToolDefinition,
  getDefaultGenresByModeToolDefinition,
  getCurrenciesToolDefinition
} from '../../src/tools/master/master-data-tools.js';
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

describe('Master Data Tools', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      get: vi.fn()
    };
    mockZaimApiClient.mockImplementation(() => mockClient);
    mockTokenStorage.createZaimApiClient.mockReturnValue(mockClient);
  });

  describe('getUserCategoriesTool', () => {
    it('should fetch user categories', async () => {
      const mockResponse = {
        categories: [
          {
            id: 101,
            name: '食費',
            mode: 'payment',
            sort: 1,
            active: 1,
            parent_category_id: 0
          },
          {
            id: 201,
            name: '給与',
            mode: 'income',
            sort: 1,
            active: 1,
            parent_category_id: 0
          }
        ]
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await getUserCategoriesTool({});

      expect(mockClient.get).toHaveBeenCalledWith('/v2/home/category');
      expect(result).toEqual({
        categories: mockResponse.categories,
        count: 2,
        success: true,
        message: '2件のカテゴリを取得しました'
      });
    });

    it('should handle API errors', async () => {
      const mockError = new Error('API Error');
      mockClient.get.mockRejectedValue(mockError);

      const result = await getUserCategoriesTool({});

      expect(result).toEqual({
        categories: [],
        count: 0,
        success: false,
        message: 'カテゴリの取得に失敗しました: API Error'
      });
    });
  });

  describe('getUserGenresTool', () => {
    it('should fetch user genres', async () => {
      const mockResponse = {
        genres: [
          {
            id: 10101,
            name: '食料品',
            category_id: 101,
            sort: 1,
            active: 1,
            parent_genre_id: 0
          },
          {
            id: 10102,
            name: '外食',
            category_id: 101,
            sort: 2,
            active: 1,
            parent_genre_id: 0
          }
        ]
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await getUserGenresTool({});

      expect(mockClient.get).toHaveBeenCalledWith('/v2/home/genre');
      expect(result).toEqual({
        genres: mockResponse.genres,
        count: 2,
        success: true,
        message: '2件のジャンルを取得しました'
      });
    });

    it('should handle empty response', async () => {
      const mockResponse = { genres: [] };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await getUserGenresTool({});

      expect(result).toEqual({
        genres: [],
        count: 0,
        success: true,
        message: '0件のジャンルを取得しました'
      });
    });
  });

  describe('getUserAccountsTool', () => {
    it('should fetch user accounts', async () => {
      const mockResponse = {
        accounts: [
          {
            id: 1,
            name: '現金',
            sort: 1,
            active: 1,
            modified: '2024-01-01 00:00:00'
          },
          {
            id: 2,
            name: '銀行口座',
            sort: 2,
            active: 1,
            modified: '2024-01-01 00:00:00'
          }
        ]
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await getUserAccountsTool({});

      expect(mockClient.get).toHaveBeenCalledWith('/v2/home/account');
      expect(result).toEqual({
        accounts: mockResponse.accounts,
        count: 2,
        success: true,
        message: '2件の口座を取得しました'
      });
    });
  });

  describe('getDefaultCategoriesByModeTool', () => {
    it('should fetch default payment categories', async () => {
      const mockResponse = {
        categories: [
          {
            id: 101,
            name: '食費',
            mode: 'payment',
            sort: 1,
            active: 1
          },
          {
            id: 102,
            name: '日用品',
            mode: 'payment',
            sort: 2,
            active: 1
          }
        ]
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await getDefaultCategoriesByModeTool({ mode: 'payment' });

      expect(mockClient.get).toHaveBeenCalledWith('/v2/category', { mode: 'payment' });
      expect(result).toEqual({
        categories: mockResponse.categories,
        count: 2,
        success: true,
        message: '2件のデフォルトカテゴリを取得しました'
      });
    });

    it('should fetch default income categories', async () => {
      const mockResponse = {
        categories: [
          {
            id: 201,
            name: '給与',
            mode: 'income',
            sort: 1,
            active: 1
          }
        ]
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await getDefaultCategoriesByModeTool({ mode: 'income' });

      expect(mockClient.get).toHaveBeenCalledWith('/v2/category', { mode: 'income' });
      expect(result.count).toBe(1);
    });
  });

  describe('getDefaultGenresByModeTool', () => {
    it('should fetch default genres for payment mode', async () => {
      const mockResponse = {
        genres: [
          {
            id: 10101,
            name: '食料品',
            category_id: 101,
            sort: 1
          },
          {
            id: 10201,
            name: '洗剤',
            category_id: 102,
            sort: 1
          }
        ]
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await getDefaultGenresByModeTool({ mode: 'payment' });

      expect(mockClient.get).toHaveBeenCalledWith('/v2/genre', { mode: 'payment' });
      expect(result).toEqual({
        genres: mockResponse.genres,
        count: 2,
        success: true,
        message: '2件のデフォルトジャンルを取得しました'
      });
    });
  });

  describe('getCurrenciesTool', () => {
    it('should fetch available currencies', async () => {
      const mockResponse = {
        currencies: [
          {
            currency_code: 'JPY',
            unit: '¥',
            name: '日本円',
            point: 0
          },
          {
            currency_code: 'USD',
            unit: '$',
            name: '米ドル',
            point: 2
          }
        ]
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await getCurrenciesTool({});

      expect(mockClient.get).toHaveBeenCalledWith('/v2/currency');
      expect(result).toEqual({
        currencies: mockResponse.currencies,
        count: 2,
        success: true,
        message: '2件の通貨を取得しました'
      });
    });

    it('should handle invalid response format', async () => {
      const mockResponse = { invalid: 'response' };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await getCurrenciesTool({});

      expect(result).toEqual({
        currencies: [],
        count: 0,
        success: false,
        message: '通貨の取得に失敗しました: 無効なレスポンス形式'
      });
    });
  });

  describe('Tool Definitions', () => {
    it('should have correct getUserCategoriesToolDefinition', () => {
      expect(getUserCategoriesToolDefinition.name).toBe('zaim_get_user_categories');
      expect(getUserCategoriesToolDefinition.inputSchema.properties).toEqual({});
    });

    it('should have correct getUserGenresToolDefinition', () => {
      expect(getUserGenresToolDefinition.name).toBe('zaim_get_user_genres');
      expect(getUserGenresToolDefinition.inputSchema.properties).toEqual({});
    });

    it('should have correct getUserAccountsToolDefinition', () => {
      expect(getUserAccountsToolDefinition.name).toBe('zaim_get_user_accounts');
      expect(getUserAccountsToolDefinition.inputSchema.properties).toEqual({});
    });

    it('should have correct getDefaultCategoriesByModeToolDefinition', () => {
      expect(getDefaultCategoriesByModeToolDefinition.name).toBe('zaim_get_default_categories');
      expect(getDefaultCategoriesByModeToolDefinition.inputSchema.properties.mode).toBeDefined();
      expect(getDefaultCategoriesByModeToolDefinition.inputSchema.required).toContain('mode');
    });

    it('should have correct getDefaultGenresByModeToolDefinition', () => {
      expect(getDefaultGenresByModeToolDefinition.name).toBe('zaim_get_default_genres');
      expect(getDefaultGenresByModeToolDefinition.inputSchema.properties.mode).toBeDefined();
      expect(getDefaultGenresByModeToolDefinition.inputSchema.required).toContain('mode');
    });

    it('should have correct getCurrenciesToolDefinition', () => {
      expect(getCurrenciesToolDefinition.name).toBe('zaim_get_currencies');
      expect(getCurrenciesToolDefinition.inputSchema.properties).toEqual({});
    });
  });
});