import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getMoneyRecordsTool,
  getMoneyRecordsToolDefinition,
  GetMoneyRecordsInput,
  GetMoneyRecordsOutput
} from '../../src/tools/money/money-read-tools.js';
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

describe('Money Read Tools', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      get: vi.fn()
    };
    mockZaimApiClient.mockImplementation(() => mockClient);
    mockTokenStorage.createZaimApiClient.mockReturnValue(mockClient);
  });

  describe('getMoneyRecordsTool', () => {
    it('should fetch money records without filters', async () => {
      const mockResponse = {
        money: [
          {
            id: 1,
            mode: 'payment',
            date: '2024-01-01',
            amount: 1000,
            currency_code: 'JPY',
            category_id: 101,
            place: 'スーパー',
            comment: '食料品'
          },
          {
            id: 2,
            mode: 'income',
            date: '2024-01-02',
            amount: 50000,
            currency_code: 'JPY',
            category_id: 201,
            place: '会社',
            comment: '給料'
          }
        ]
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const input: GetMoneyRecordsInput = {};
      const result = await getMoneyRecordsTool(input);

      expect(mockClient.get).toHaveBeenCalledWith('/v2/home/money', {});
      expect(result).toEqual({
        records: mockResponse.money,
        count: 2,
        success: true,
        message: '2件の記録を取得しました'
      });
    });

    it('should apply date filters correctly', async () => {
      const mockResponse = {
        money: [
          {
            id: 1,
            mode: 'payment',
            date: '2024-01-15',
            amount: 2000,
            currency_code: 'JPY'
          }
        ]
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const input: GetMoneyRecordsInput = {
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };
      const result = await getMoneyRecordsTool(input);

      expect(mockClient.get).toHaveBeenCalledWith('/v2/home/money', {
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      });
      expect(result.count).toBe(1);
    });

    it('should filter by mode (payment/income/transfer)', async () => {
      const mockResponse = {
        money: [
          {
            id: 1,
            mode: 'payment',
            date: '2024-01-01',
            amount: 1000,
            currency_code: 'JPY'
          }
        ]
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const input: GetMoneyRecordsInput = {
        mode: 'payment'
      };
      const result = await getMoneyRecordsTool(input);

      expect(mockClient.get).toHaveBeenCalledWith('/v2/home/money', {
        mode: 'payment'
      });
      expect(result.records[0].mode).toBe('payment');
    });

    it('should handle pagination parameters', async () => {
      const mockResponse = {
        money: Array(20).fill(null).map((_, i) => ({
          id: i + 1,
          mode: 'payment',
          date: '2024-01-01',
          amount: 1000 * (i + 1),
          currency_code: 'JPY'
        }))
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const input: GetMoneyRecordsInput = {
        limit: 20,
        page: 2
      };
      const result = await getMoneyRecordsTool(input);

      expect(mockClient.get).toHaveBeenCalledWith('/v2/home/money', {
        limit: 20,
        page: 2
      });
      expect(result.count).toBe(20);
    });

    it('should filter by category_id', async () => {
      const mockResponse = {
        money: [
          {
            id: 1,
            mode: 'payment',
            date: '2024-01-01',
            amount: 1000,
            currency_code: 'JPY',
            category_id: 101
          }
        ]
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const input: GetMoneyRecordsInput = {
        category_id: 101
      };
      const result = await getMoneyRecordsTool(input);

      expect(mockClient.get).toHaveBeenCalledWith('/v2/home/money', {
        category_id: 101
      });
      expect(result.records[0].category_id).toBe(101);
    });

    it('should handle empty response', async () => {
      const mockResponse = {
        money: []
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await getMoneyRecordsTool({});

      expect(result).toEqual({
        records: [],
        count: 0,
        success: true,
        message: '0件の記録を取得しました'
      });
    });

    it('should handle API errors gracefully', async () => {
      const mockError = new Error('Zaim API Error: 401 - Unauthorized');
      mockClient.get.mockRejectedValue(mockError);

      const result = await getMoneyRecordsTool({});

      expect(result).toEqual({
        records: [],
        count: 0,
        success: false,
        message: '記録の取得に失敗しました: Zaim API Error: 401 - Unauthorized'
      });
    });

    it('should handle invalid response format', async () => {
      const mockResponse = { invalid: 'response' };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await getMoneyRecordsTool({});

      expect(result).toEqual({
        records: [],
        count: 0,
        success: false,
        message: '記録の取得に失敗しました: 無効なレスポンス形式'
      });
    });

    it('should handle multiple filters combined', async () => {
      const mockResponse = {
        money: [
          {
            id: 1,
            mode: 'payment',
            date: '2024-01-15',
            amount: 5000,
            currency_code: 'JPY',
            category_id: 101,
            place: 'レストラン'
          }
        ]
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const input: GetMoneyRecordsInput = {
        mode: 'payment',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        category_id: 101,
        limit: 10
      };
      const result = await getMoneyRecordsTool(input);

      expect(mockClient.get).toHaveBeenCalledWith('/v2/home/money', {
        mode: 'payment',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        category_id: 101,
        limit: 10
      });
      expect(result.count).toBe(1);
    });
  });

  describe('Tool Definition', () => {
    it('should have correct tool definition', () => {
      expect(getMoneyRecordsToolDefinition).toEqual({
        name: 'zaim_get_money_records',
        description: 'Zaim家計簿の支出・収入・振替記録を取得します。日付範囲、カテゴリ、モードでフィルタリング可能です。',
        inputSchema: {
          type: 'object',
          properties: {
            mode: {
              type: 'string',
              enum: ['payment', 'income', 'transfer'],
              description: '記録の種類（支出/収入/振替）'
            },
            start_date: {
              type: 'string',
              description: '開始日（YYYY-MM-DD形式）'
            },
            end_date: {
              type: 'string',
              description: '終了日（YYYY-MM-DD形式）'
            },
            category_id: {
              type: 'number',
              description: 'カテゴリID'
            },
            limit: {
              type: 'number',
              description: '取得件数（最大100件）',
              default: 20
            },
            page: {
              type: 'number',
              description: 'ページ番号（1から開始）',
              default: 1
            }
          },
          required: [],
          additionalProperties: false
        }
      });
    });
  });
});