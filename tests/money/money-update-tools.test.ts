import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  updateMoneyRecordTool,
  updateMoneyRecordToolDefinition,
  UpdateMoneyRecordInput
} from '../../src/tools/money/money-update-tools.js';
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

describe('Money Update Tools', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      put: vi.fn()
    };
    mockZaimApiClient.mockImplementation(() => mockClient);
    mockTokenStorage.createZaimApiClient.mockReturnValue(mockClient);
  });

  describe('updateMoneyRecordTool', () => {
    it('should update a payment record', async () => {
      const mockResponse = {
        money: {
          id: 12345,
          mode: 'payment',
          date: '2024-01-01',
          amount: 1500,
          currency_code: 'JPY',
          category_id: 101,
          genre_id: 10101,
          place: 'コンビニ',
          comment: '昼食',
          modified: '2024-01-02 10:00:00'
        }
      };
      mockClient.put.mockResolvedValue(mockResponse);

      const input: UpdateMoneyRecordInput = {
        id: 12345,
        mode: 'payment',
        amount: 1500,
        place: 'コンビニ',
        comment: '昼食'
      };
      const result = await updateMoneyRecordTool(input);

      expect(mockClient.put).toHaveBeenCalledWith('/v2/home/money/payment/12345', {
        amount: 1500,
        place: 'コンビニ',
        comment: '昼食'
      });
      expect(result).toEqual({
        record: mockResponse.money,
        success: true,
        message: '記録を更新しました'
      });
    });

    it('should update an income record', async () => {
      const mockResponse = {
        money: {
          id: 12346,
          mode: 'income',
          date: '2024-01-15',
          amount: 250000,
          currency_code: 'JPY',
          category_id: 201,
          place: '会社',
          comment: '給料+ボーナス',
          modified: '2024-01-16 09:00:00'
        }
      };
      mockClient.put.mockResolvedValue(mockResponse);

      const input: UpdateMoneyRecordInput = {
        id: 12346,
        mode: 'income',
        amount: 250000,
        comment: '給料+ボーナス'
      };
      const result = await updateMoneyRecordTool(input);

      expect(mockClient.put).toHaveBeenCalledWith('/v2/home/money/income/12346', {
        amount: 250000,
        comment: '給料+ボーナス'
      });
      expect(result.success).toBe(true);
    });

    it('should update a transfer record', async () => {
      const mockResponse = {
        money: {
          id: 12347,
          mode: 'transfer',
          date: '2024-01-10',
          amount: 20000,
          currency_code: 'JPY',
          from_account_id: 1,
          to_account_id: 2,
          comment: '定期預金へ',
          modified: '2024-01-11 14:00:00'
        }
      };
      mockClient.put.mockResolvedValue(mockResponse);

      const input: UpdateMoneyRecordInput = {
        id: 12347,
        mode: 'transfer',
        amount: 20000,
        comment: '定期預金へ'
      };
      const result = await updateMoneyRecordTool(input);

      expect(mockClient.put).toHaveBeenCalledWith('/v2/home/money/transfer/12347', {
        amount: 20000,
        comment: '定期預金へ'
      });
      expect(result.record?.mode).toBe('transfer');
    });

    it('should update multiple fields at once', async () => {
      const mockResponse = {
        money: {
          id: 12348,
          mode: 'payment',
          date: '2024-01-05',
          amount: 3000,
          currency_code: 'JPY',
          category_id: 102,
          genre_id: 10201,
          from_account_id: 2,
          place: 'スーパー',
          comment: '週末の買い物',
          name: '食料品・日用品',
          modified: '2024-01-06 11:00:00'
        }
      };
      mockClient.put.mockResolvedValue(mockResponse);

      const input: UpdateMoneyRecordInput = {
        id: 12348,
        mode: 'payment',
        amount: 3000,
        date: '2024-01-05',
        category_id: 102,
        genre_id: 10201,
        from_account_id: 2,
        place: 'スーパー',
        comment: '週末の買い物',
        name: '食料品・日用品'
      };
      const result = await updateMoneyRecordTool(input);

      expect(mockClient.put).toHaveBeenCalledWith('/v2/home/money/payment/12348', {
        amount: 3000,
        date: '2024-01-05',
        category_id: 102,
        genre_id: 10201,
        from_account_id: 2,
        place: 'スーパー',
        comment: '週末の買い物',
        name: '食料品・日用品'
      });
      expect(result.record?.place).toBe('スーパー');
    });

    it('should handle API errors', async () => {
      const mockError = new Error('Zaim API Error: 404 - Record not found');
      mockClient.put.mockRejectedValue(mockError);

      const input: UpdateMoneyRecordInput = {
        id: 99999,
        mode: 'payment',
        amount: 1000
      };
      const result = await updateMoneyRecordTool(input);

      expect(result).toEqual({
        record: null,
        success: false,
        message: '記録の更新に失敗しました: Zaim API Error: 404 - Record not found'
      });
    });

    it('should handle invalid response format', async () => {
      const mockResponse = { invalid: 'response' };
      mockClient.put.mockResolvedValue(mockResponse);

      const input: UpdateMoneyRecordInput = {
        id: 12345,
        mode: 'payment',
        amount: 1000
      };
      const result = await updateMoneyRecordTool(input);

      expect(result).toEqual({
        record: null,
        success: false,
        message: '記録の更新に失敗しました: 無効なレスポンス形式'
      });
    });

    it('should only send changed fields', async () => {
      const mockResponse = {
        money: {
          id: 12349,
          mode: 'payment',
          date: '2024-01-01',
          amount: 1000,
          comment: '更新されたコメント',
          modified: '2024-01-02 15:00:00'
        }
      };
      mockClient.put.mockResolvedValue(mockResponse);

      const input: UpdateMoneyRecordInput = {
        id: 12349,
        mode: 'payment',
        comment: '更新されたコメント'
      };
      const result = await updateMoneyRecordTool(input);

      // amount, date, etc. should not be included if not specified
      expect(mockClient.put).toHaveBeenCalledWith('/v2/home/money/payment/12349', {
        comment: '更新されたコメント'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Tool Definition', () => {
    it('should have correct updateMoneyRecordToolDefinition', () => {
      expect(updateMoneyRecordToolDefinition.name).toBe('zaim_update_money_record');
      expect(updateMoneyRecordToolDefinition.description).toContain('既存の家計簿記録を更新');
      expect(updateMoneyRecordToolDefinition.inputSchema.required).toContain('id');
      expect(updateMoneyRecordToolDefinition.inputSchema.required).toContain('mode');
      
      // Check optional fields are present
      const properties = updateMoneyRecordToolDefinition.inputSchema.properties;
      expect(properties).toHaveProperty('amount');
      expect(properties).toHaveProperty('date');
      expect(properties).toHaveProperty('category_id');
      expect(properties).toHaveProperty('genre_id');
      expect(properties).toHaveProperty('place');
      expect(properties).toHaveProperty('comment');
    });

    it('should have mode enum in tool definition', () => {
      const modeProperty = updateMoneyRecordToolDefinition.inputSchema.properties.mode;
      expect(modeProperty?.enum).toEqual(['payment', 'income', 'transfer']);
    });
  });
});