import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  createPaymentTool,
  createIncomeTool,
  createTransferTool,
  createPaymentToolDefinition,
  createIncomeToolDefinition,
  createTransferToolDefinition,
  CreatePaymentInput,
  CreateIncomeInput,
  CreateTransferInput,
  CreatePaymentInputSchema
} from '../../src/tools/money/money-write-tools.js';
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

describe('Money Write Tools', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      post: vi.fn()
    };
    mockZaimApiClient.mockImplementation(() => mockClient);
    mockTokenStorage.createZaimApiClient.mockReturnValue(mockClient);
  });

  describe('createPaymentTool', () => {
    it('should create a payment record', async () => {
      const mockResponse = {
        money: {
          id: 12345,
          mode: 'payment',
          date: '2024-01-01',
          amount: 1000,
          currency_code: 'JPY',
          category_id: 101,
          genre_id: 10101,
          place: 'スーパー',
          comment: '食料品',
          created: '2024-01-01 12:00:00',
          modified: '2024-01-01 12:00:00'
        }
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const input: CreatePaymentInput = {
        amount: 1000,
        date: '2024-01-01',
        category_id: 101,
        genre_id: 10101,
        place: 'スーパー',
        comment: '食料品'
      };
      const result = await createPaymentTool(input);

      expect(mockClient.post).toHaveBeenCalledWith('/v2/home/money/payment', {
        mapping: 1,
        amount: 1000,
        date: '2024-01-01',
        category_id: 101,
        genre_id: 10101,
        place: 'スーパー',
        comment: '食料品'
      });
      expect(result).toEqual({
        record: mockResponse.money,
        success: true,
        message: '支出記録を作成しました'
      });
    });

    it('should create payment with minimum required fields', async () => {
      const mockResponse = {
        money: {
          id: 12346,
          mode: 'payment',
          date: '2024-01-02',
          amount: 500,
          currency_code: 'JPY',
          category_id: 102,
          genre_id: 10201,
          created: '2024-01-02 10:00:00'
        }
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const input: CreatePaymentInput = {
        amount: 500,
        date: '2024-01-02',
        category_id: 102,
        genre_id: 10201
      };
      const result = await createPaymentTool(input);

      expect(mockClient.post).toHaveBeenCalledWith('/v2/home/money/payment', {
        mapping: 1,
        amount: 500,
        date: '2024-01-02',
        category_id: 102,
        genre_id: 10201
      });
      expect(result.success).toBe(true);
    });

    it('should handle API errors', async () => {
      const mockError = new Error('Zaim API Error: 400 - Invalid request');
      mockClient.post.mockRejectedValue(mockError);

      const input: CreatePaymentInput = {
        amount: 1000,
        date: '2024-01-01',
        category_id: 101
      };
      const result = await createPaymentTool(input);

      expect(result).toEqual({
        record: null,
        success: false,
        message: '支出記録の作成に失敗しました: Zaim API Error: 400 - Invalid request'
      });
    });

    it('should handle invalid response format', async () => {
      const mockResponse = { invalid: 'response' };
      mockClient.post.mockResolvedValue(mockResponse);

      const input: CreatePaymentInput = {
        amount: 1000,
        date: '2024-01-01',
        category_id: 101
      };
      const result = await createPaymentTool(input);

      expect(result).toEqual({
        record: null,
        success: false,
        message: '支出記録の作成に失敗しました: 無効なレスポンス形式'
      });
    });
  });

  describe('createIncomeTool', () => {
    it('should create an income record', async () => {
      const mockResponse = {
        money: {
          id: 12347,
          mode: 'income',
          date: '2024-01-15',
          amount: 200000,
          currency_code: 'JPY',
          category_id: 201,
          place: '会社',
          comment: '給料',
          created: '2024-01-15 09:00:00'
        }
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const input: CreateIncomeInput = {
        amount: 200000,
        date: '2024-01-15',
        category_id: 201,
        place: '会社',
        comment: '給料'
      };
      const result = await createIncomeTool(input);

      expect(mockClient.post).toHaveBeenCalledWith('/v2/home/money/income', {
        mapping: 1,
        amount: 200000,
        date: '2024-01-15',
        category_id: 201,
        place: '会社',
        comment: '給料'
      });
      expect(result).toEqual({
        record: mockResponse.money,
        success: true,
        message: '収入記録を作成しました'
      });
    });

    it('should create income with account_id', async () => {
      const mockResponse = {
        money: {
          id: 12348,
          mode: 'income',
          date: '2024-01-20',
          amount: 50000,
          currency_code: 'JPY',
          category_id: 202,
          to_account_id: 1,
          created: '2024-01-20 15:00:00'
        }
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const input: CreateIncomeInput = {
        amount: 50000,
        date: '2024-01-20',
        category_id: 202,
        to_account_id: 1
      };
      const result = await createIncomeTool(input);

      expect(mockClient.post).toHaveBeenCalledWith('/v2/home/money/income', {
        mapping: 1,
        amount: 50000,
        date: '2024-01-20',
        category_id: 202,
        to_account_id: 1
      });
      expect(result.record?.to_account_id).toBe(1);
    });
  });

  describe('createTransferTool', () => {
    it('should create a transfer record', async () => {
      const mockResponse = {
        money: {
          id: 12349,
          mode: 'transfer',
          date: '2024-01-10',
          amount: 10000,
          currency_code: 'JPY',
          from_account_id: 1,
          to_account_id: 2,
          comment: 'ATM振替',
          created: '2024-01-10 14:00:00'
        }
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const input: CreateTransferInput = {
        amount: 10000,
        date: '2024-01-10',
        from_account_id: 1,
        to_account_id: 2,
        comment: 'ATM振替'
      };
      const result = await createTransferTool(input);

      expect(mockClient.post).toHaveBeenCalledWith('/v2/home/money/transfer', {
        mapping: 1,
        amount: 10000,
        date: '2024-01-10',
        from_account_id: 1,
        to_account_id: 2,
        comment: 'ATM振替'
      });
      expect(result).toEqual({
        record: mockResponse.money,
        success: true,
        message: '振替記録を作成しました'
      });
    });

    it('should require both from and to account IDs', async () => {
      const mockResponse = {
        money: {
          id: 12350,
          mode: 'transfer',
          date: '2024-01-11',
          amount: 5000,
          currency_code: 'JPY',
          from_account_id: 2,
          to_account_id: 3
        }
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const input: CreateTransferInput = {
        amount: 5000,
        date: '2024-01-11',
        from_account_id: 2,
        to_account_id: 3
      };
      const result = await createTransferTool(input);

      expect(result.record?.from_account_id).toBe(2);
      expect(result.record?.to_account_id).toBe(3);
    });

    it('should handle transfer creation errors', async () => {
      const mockError = new Error('Zaim API Error: 400 - Invalid account');
      mockClient.post.mockRejectedValue(mockError);

      const input: CreateTransferInput = {
        amount: 1000,
        date: '2024-01-01',
        from_account_id: 99,
        to_account_id: 100
      };
      const result = await createTransferTool(input);

      expect(result).toEqual({
        record: null,
        success: false,
        message: '振替記録の作成に失敗しました: Zaim API Error: 400 - Invalid account'
      });
    });
  });

  describe('Tool Definitions', () => {
    it('should have correct createPaymentToolDefinition', () => {
      expect(createPaymentToolDefinition.name).toBe('zaim_create_payment');
      expect(createPaymentToolDefinition.description).toContain('支出記録を作成');
      expect(createPaymentToolDefinition.inputSchema.required).toContain('amount');
      expect(createPaymentToolDefinition.inputSchema.required).toContain('date');
      expect(createPaymentToolDefinition.inputSchema.required).toContain('category_id');
      expect(createPaymentToolDefinition.inputSchema.required).toContain('genre_id');
    });

    it('should require genre_id for payment creation', () => {
      // genre_idが必須であることを確認するテスト
      const input = {
        amount: 1000,
        date: '2024-01-01',
        category_id: 101
        // genre_id を意図的に省略
      };
      
      // Zodスキーマでバリデーションしたときにエラーになることを期待
      const result = CreatePaymentInputSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('genre_id'))).toBe(true);
      }
    });

    it('should have correct createIncomeToolDefinition', () => {
      expect(createIncomeToolDefinition.name).toBe('zaim_create_income');
      expect(createIncomeToolDefinition.description).toContain('収入記録を作成');
      expect(createIncomeToolDefinition.inputSchema.required).toContain('amount');
      expect(createIncomeToolDefinition.inputSchema.required).toContain('date');
      expect(createIncomeToolDefinition.inputSchema.required).toContain('category_id');
    });

    it('should have correct createTransferToolDefinition', () => {
      expect(createTransferToolDefinition.name).toBe('zaim_create_transfer');
      expect(createTransferToolDefinition.description).toContain('振替記録を作成');
      expect(createTransferToolDefinition.inputSchema.required).toContain('amount');
      expect(createTransferToolDefinition.inputSchema.required).toContain('date');
      expect(createTransferToolDefinition.inputSchema.required).toContain('from_account_id');
      expect(createTransferToolDefinition.inputSchema.required).toContain('to_account_id');
    });
  });
});