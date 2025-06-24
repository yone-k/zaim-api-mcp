import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  deleteMoneyRecordTool,
  deleteMoneyRecordToolDefinition,
  DeleteMoneyRecordInput
} from '../../src/tools/money/money-delete-tools.js';
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

describe('Money Delete Tools', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      delete: vi.fn()
    };
    mockZaimApiClient.mockImplementation(() => mockClient);
    mockTokenStorage.createZaimApiClient.mockReturnValue(mockClient);
  });

  describe('deleteMoneyRecordTool', () => {
    it('should delete a payment record', async () => {
      const mockResponse = {
        money: {
          id: 12345,
          mode: 'payment',
          date: '2024-01-01',
          amount: 1000,
          currency_code: 'JPY',
          category_id: 101,
          place: 'スーパー',
          comment: '削除された記録'
        }
      };
      mockClient.delete.mockResolvedValue(mockResponse);

      const input: DeleteMoneyRecordInput = {
        id: 12345,
        mode: 'payment'
      };
      const result = await deleteMoneyRecordTool(input);

      expect(mockClient.delete).toHaveBeenCalledWith('/v2/home/money/payment/12345');
      expect(result).toEqual({
        deleted_record: mockResponse.money,
        success: true,
        message: '記録を削除しました'
      });
    });

    it('should delete an income record', async () => {
      const mockResponse = {
        money: {
          id: 12346,
          mode: 'income',
          date: '2024-01-15',
          amount: 200000,
          currency_code: 'JPY',
          category_id: 201,
          place: '会社',
          comment: '給料'
        }
      };
      mockClient.delete.mockResolvedValue(mockResponse);

      const input: DeleteMoneyRecordInput = {
        id: 12346,
        mode: 'income'
      };
      const result = await deleteMoneyRecordTool(input);

      expect(mockClient.delete).toHaveBeenCalledWith('/v2/home/money/income/12346');
      expect(result).toEqual({
        deleted_record: mockResponse.money,
        success: true,
        message: '記録を削除しました'
      });
    });

    it('should delete a transfer record', async () => {
      const mockResponse = {
        money: {
          id: 12347,
          mode: 'transfer',
          date: '2024-01-10',
          amount: 10000,
          currency_code: 'JPY',
          from_account_id: 1,
          to_account_id: 2,
          comment: 'ATM振替'
        }
      };
      mockClient.delete.mockResolvedValue(mockResponse);

      const input: DeleteMoneyRecordInput = {
        id: 12347,
        mode: 'transfer'
      };
      const result = await deleteMoneyRecordTool(input);

      expect(mockClient.delete).toHaveBeenCalledWith('/v2/home/money/transfer/12347');
      expect(result).toEqual({
        deleted_record: mockResponse.money,
        success: true,
        message: '記録を削除しました'
      });
    });

    it('should handle API errors (record not found)', async () => {
      const mockError = new Error('Zaim API Error: 404 - Record not found');
      mockClient.delete.mockRejectedValue(mockError);

      const input: DeleteMoneyRecordInput = {
        id: 99999,
        mode: 'payment'
      };
      const result = await deleteMoneyRecordTool(input);

      expect(result).toEqual({
        deleted_record: null,
        success: false,
        message: '記録の削除に失敗しました: Zaim API Error: 404 - Record not found'
      });
    });

    it('should handle permission errors', async () => {
      const mockError = new Error('Zaim API Error: 403 - Forbidden');
      mockClient.delete.mockRejectedValue(mockError);

      const input: DeleteMoneyRecordInput = {
        id: 12345,
        mode: 'payment'
      };
      const result = await deleteMoneyRecordTool(input);

      expect(result).toEqual({
        deleted_record: null,
        success: false,
        message: '記録の削除に失敗しました: Zaim API Error: 403 - Forbidden'
      });
    });

    it('should handle invalid response format', async () => {
      const mockResponse = { invalid: 'response' };
      mockClient.delete.mockResolvedValue(mockResponse);

      const input: DeleteMoneyRecordInput = {
        id: 12345,
        mode: 'payment'
      };
      const result = await deleteMoneyRecordTool(input);

      expect(result).toEqual({
        deleted_record: null,
        success: false,
        message: '記録の削除に失敗しました: 無効なレスポンス形式'
      });
    });

    it('should handle network errors', async () => {
      const mockError = new Error('Network error');
      mockClient.delete.mockRejectedValue(mockError);

      const input: DeleteMoneyRecordInput = {
        id: 12345,
        mode: 'payment'
      };
      const result = await deleteMoneyRecordTool(input);

      expect(result).toEqual({
        deleted_record: null,
        success: false,
        message: '記録の削除に失敗しました: Network error'
      });
    });

    it('should construct correct endpoint URLs for different modes', async () => {
      const mockResponse = { money: { id: 123, mode: 'payment' } };
      mockClient.delete.mockResolvedValue(mockResponse);

      // Test payment endpoint
      await deleteMoneyRecordTool({ id: 123, mode: 'payment' });
      expect(mockClient.delete).toHaveBeenLastCalledWith('/v2/home/money/payment/123');

      // Test income endpoint
      await deleteMoneyRecordTool({ id: 456, mode: 'income' });
      expect(mockClient.delete).toHaveBeenLastCalledWith('/v2/home/money/income/456');

      // Test transfer endpoint
      await deleteMoneyRecordTool({ id: 789, mode: 'transfer' });
      expect(mockClient.delete).toHaveBeenLastCalledWith('/v2/home/money/transfer/789');
    });
  });

  describe('Tool Definition', () => {
    it('should have correct deleteMoneyRecordToolDefinition', () => {
      expect(deleteMoneyRecordToolDefinition.name).toBe('zaim_delete_money_record');
      expect(deleteMoneyRecordToolDefinition.description).toContain('家計簿記録を削除');
      expect(deleteMoneyRecordToolDefinition.inputSchema.required).toContain('id');
      expect(deleteMoneyRecordToolDefinition.inputSchema.required).toContain('mode');
    });

    it('should have correct input schema properties', () => {
      const properties = deleteMoneyRecordToolDefinition.inputSchema.properties;
      expect(properties).toHaveProperty('id');
      expect(properties).toHaveProperty('mode');
      
      // Check id property
      expect(properties.id?.type).toBe('number');
      expect(properties.id?.description).toContain('削除する記録のID');
      
      // Check mode property
      expect(properties.mode?.type).toBe('string');
      expect(properties.mode?.enum).toEqual(['payment', 'income', 'transfer']);
      expect(properties.mode?.description).toContain('記録の種類');
    });

    it('should have correct required fields', () => {
      expect(deleteMoneyRecordToolDefinition.inputSchema.required).toEqual(['id', 'mode']);
      expect(deleteMoneyRecordToolDefinition.inputSchema.additionalProperties).toBe(false);
    });
  });
});