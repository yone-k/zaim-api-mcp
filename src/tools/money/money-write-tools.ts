import { z } from 'zod';
import { TokenStorage } from '../../utils/token-storage.js';
import type { ToolDefinition } from '../../types/mcp.js';
import type { ZaimMoney } from '../../types/zaim-api.js';

/**
 * 支出記録作成ツールの入力スキーマ
 */
export const CreatePaymentInputSchema = z.object({
  amount: z.number().positive().describe('金額'),
  date: z.string().describe('日付（YYYY-MM-DD形式）'),
  category_id: z.number().describe('カテゴリID'),
  genre_id: z.number().optional().describe('ジャンルID'),
  from_account_id: z.number().optional().describe('出金元口座ID'),
  place: z.string().optional().describe('場所・店舗名'),
  comment: z.string().optional().describe('メモ'),
  name: z.string().optional().describe('品名')
}).strict();

export type CreatePaymentInput = z.infer<typeof CreatePaymentInputSchema>;

/**
 * 収入記録作成ツールの入力スキーマ
 */
export const CreateIncomeInputSchema = z.object({
  amount: z.number().positive().describe('金額'),
  date: z.string().describe('日付（YYYY-MM-DD形式）'),
  category_id: z.number().describe('カテゴリID'),
  to_account_id: z.number().optional().describe('入金先口座ID'),
  place: z.string().optional().describe('場所・会社名'),
  comment: z.string().optional().describe('メモ')
}).strict();

export type CreateIncomeInput = z.infer<typeof CreateIncomeInputSchema>;

/**
 * 振替記録作成ツールの入力スキーマ
 */
export const CreateTransferInputSchema = z.object({
  amount: z.number().positive().describe('金額'),
  date: z.string().describe('日付（YYYY-MM-DD形式）'),
  from_account_id: z.number().describe('出金元口座ID'),
  to_account_id: z.number().describe('入金先口座ID'),
  comment: z.string().optional().describe('メモ')
}).strict();

export type CreateTransferInput = z.infer<typeof CreateTransferInputSchema>;

/**
 * 記録作成結果の出力スキーマ
 */
export const CreateMoneyRecordOutputSchema = z.object({
  record: z.custom<ZaimMoney>().nullable(),
  success: z.boolean(),
  message: z.string()
});

export type CreateMoneyRecordOutput = z.infer<typeof CreateMoneyRecordOutputSchema>;

/**
 * ツール定義
 */
export const createPaymentToolDefinition: ToolDefinition = {
  name: 'zaim_create_payment',
  description: 'Zaimに支出記録を作成します',
  inputSchema: {
    type: 'object' as const,
    properties: {
      amount: {
        type: 'number',
        description: '金額'
      },
      date: {
        type: 'string',
        description: '日付（YYYY-MM-DD形式）'
      },
      category_id: {
        type: 'number',
        description: 'カテゴリID'
      },
      genre_id: {
        type: 'number',
        description: 'ジャンルID'
      },
      from_account_id: {
        type: 'number',
        description: '出金元口座ID'
      },
      place: {
        type: 'string',
        description: '場所・店舗名'
      },
      comment: {
        type: 'string',
        description: 'メモ'
      },
      name: {
        type: 'string',
        description: '品名'
      }
    },
    required: ['amount', 'date', 'category_id'],
    additionalProperties: false
  }
};

export const createIncomeToolDefinition: ToolDefinition = {
  name: 'zaim_create_income',
  description: 'Zaimに収入記録を作成します',
  inputSchema: {
    type: 'object' as const,
    properties: {
      amount: {
        type: 'number',
        description: '金額'
      },
      date: {
        type: 'string',
        description: '日付（YYYY-MM-DD形式）'
      },
      category_id: {
        type: 'number',
        description: 'カテゴリID'
      },
      to_account_id: {
        type: 'number',
        description: '入金先口座ID'
      },
      place: {
        type: 'string',
        description: '場所・会社名'
      },
      comment: {
        type: 'string',
        description: 'メモ'
      }
    },
    required: ['amount', 'date', 'category_id'],
    additionalProperties: false
  }
};

export const createTransferToolDefinition: ToolDefinition = {
  name: 'zaim_create_transfer',
  description: 'Zaimに振替記録を作成します（口座間の資金移動）',
  inputSchema: {
    type: 'object' as const,
    properties: {
      amount: {
        type: 'number',
        description: '金額'
      },
      date: {
        type: 'string',
        description: '日付（YYYY-MM-DD形式）'
      },
      from_account_id: {
        type: 'number',
        description: '出金元口座ID'
      },
      to_account_id: {
        type: 'number',
        description: '入金先口座ID'
      },
      comment: {
        type: 'string',
        description: 'メモ'
      }
    },
    required: ['amount', 'date', 'from_account_id', 'to_account_id'],
    additionalProperties: false
  }
};

/**
 * 支出記録を作成
 */
export async function createPaymentTool(input: CreatePaymentInput): Promise<CreateMoneyRecordOutput> {
  try {
    const client = TokenStorage.createZaimApiClient();
    
    // リクエストボディの構築
    const body: Record<string, string | number> = {
      amount: input.amount,
      date: input.date,
      category_id: input.category_id
    };
    
    if (input.genre_id !== undefined) body.genre_id = input.genre_id;
    if (input.from_account_id !== undefined) body.from_account_id = input.from_account_id;
    if (input.place !== undefined) body.place = input.place;
    if (input.comment !== undefined) body.comment = input.comment;
    if (input.name !== undefined) body.name = input.name;
    
    const response = await client.post('/v2/home/money/payment', body);
    
    // レスポンスの形式をチェック
    if (!response || typeof response !== 'object' || !response.money) {
      return {
        record: null,
        success: false,
        message: '支出記録の作成に失敗しました: 無効なレスポンス形式'
      };
    }
    
    return {
      record: Array.isArray(response.money) ? response.money[0] : response.money,
      success: true,
      message: '支出記録を作成しました'
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    return {
      record: null,
      success: false,
      message: `支出記録の作成に失敗しました: ${errorMessage}`
    };
  }
}

/**
 * 収入記録を作成
 */
export async function createIncomeTool(input: CreateIncomeInput): Promise<CreateMoneyRecordOutput> {
  try {
    const client = TokenStorage.createZaimApiClient();
    
    // リクエストボディの構築
    const body: Record<string, string | number> = {
      amount: input.amount,
      date: input.date,
      category_id: input.category_id
    };
    
    if (input.to_account_id !== undefined) body.to_account_id = input.to_account_id;
    if (input.place !== undefined) body.place = input.place;
    if (input.comment !== undefined) body.comment = input.comment;
    
    const response = await client.post('/v2/home/money/income', body);
    
    // レスポンスの形式をチェック
    if (!response || typeof response !== 'object' || !response.money) {
      return {
        record: null,
        success: false,
        message: '収入記録の作成に失敗しました: 無効なレスポンス形式'
      };
    }
    
    return {
      record: Array.isArray(response.money) ? response.money[0] : response.money,
      success: true,
      message: '収入記録を作成しました'
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    return {
      record: null,
      success: false,
      message: `収入記録の作成に失敗しました: ${errorMessage}`
    };
  }
}

/**
 * 振替記録を作成
 */
export async function createTransferTool(input: CreateTransferInput): Promise<CreateMoneyRecordOutput> {
  try {
    const client = TokenStorage.createZaimApiClient();
    
    // リクエストボディの構築
    const body: Record<string, string | number> = {
      amount: input.amount,
      date: input.date,
      from_account_id: input.from_account_id,
      to_account_id: input.to_account_id
    };
    
    if (input.comment !== undefined) body.comment = input.comment;
    
    const response = await client.post('/v2/home/money/transfer', body);
    
    // レスポンスの形式をチェック
    if (!response || typeof response !== 'object' || !response.money) {
      return {
        record: null,
        success: false,
        message: '振替記録の作成に失敗しました: 無効なレスポンス形式'
      };
    }
    
    return {
      record: Array.isArray(response.money) ? response.money[0] : response.money,
      success: true,
      message: '振替記録を作成しました'
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    return {
      record: null,
      success: false,
      message: `振替記録の作成に失敗しました: ${errorMessage}`
    };
  }
}