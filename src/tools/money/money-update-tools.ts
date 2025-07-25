import { z } from 'zod';
import { TokenStorage } from '../../utils/token-storage.js';
import type { ToolDefinition } from '../../types/mcp.js';
import type { ZaimMoney } from '../../types/zaim-api.js';

/**
 * 記録更新ツールの入力スキーマ
 */
export const UpdateMoneyRecordInputSchema = z.object({
  id: z.number().describe('更新する記録のID'),
  mode: z.enum(['payment', 'income', 'transfer']).describe('記録の種類'),
  amount: z.number().positive().optional().describe('金額'),
  date: z.string().optional().describe('日付（YYYY-MM-DD形式）'),
  category_id: z.number().optional().describe('カテゴリID'),
  genre_id: z.number().optional().describe('ジャンルID'),
  from_account_id: z.number().optional().describe('出金元口座ID（支出・振替の場合）'),
  to_account_id: z.number().optional().describe('入金先口座ID（収入・振替の場合）'),
  place: z.string().optional().describe('場所・店舗名'),
  comment: z.string().optional().describe('メモ'),
  name: z.string().optional().describe('品名')
}).strict().refine((data) => {
  // paymentモードの場合はgenre_idが必須
  if (data.mode === 'payment' && data.genre_id === undefined) {
    return false;
  }
  return true;
}, {
  message: 'genre_id is required when mode is payment'
});

export type UpdateMoneyRecordInput = z.infer<typeof UpdateMoneyRecordInputSchema>;

/**
 * 記録更新結果の出力スキーマ
 */
export const UpdateMoneyRecordOutputSchema = z.object({
  record: z.custom<ZaimMoney>().nullable(),
  success: z.boolean(),
  message: z.string()
});

export type UpdateMoneyRecordOutput = z.infer<typeof UpdateMoneyRecordOutputSchema>;

/**
 * ツール定義
 */
export const updateMoneyRecordToolDefinition: ToolDefinition = {
  name: 'zaim_update_money_record',
  description: 'Zaimの既存の家計簿記録を更新します',
  inputSchema: {
    type: 'object' as const,
    properties: {
      id: {
        type: 'number',
        description: '更新する記録のID'
      },
      mode: {
        type: 'string',
        enum: ['payment', 'income', 'transfer'],
        description: '記録の種類'
      },
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
        description: 'ジャンルID（paymentモードの場合は必須）'
      },
      from_account_id: {
        type: 'number',
        description: '出金元口座ID（支出・振替の場合）'
      },
      to_account_id: {
        type: 'number',
        description: '入金先口座ID（収入・振替の場合）'
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
    required: ['id', 'mode'],
    additionalProperties: false
  }
};

/**
 * 家計簿記録を更新
 */
export async function updateMoneyRecordTool(input: UpdateMoneyRecordInput): Promise<UpdateMoneyRecordOutput> {
  try {
    const client = TokenStorage.createZaimApiClient();
    
    // 更新するフィールドのみを含むボディを構築
    const body: Record<string, string | number> = {
      mapping: 1
    };
    
    if (input.amount !== undefined) body.amount = input.amount;
    if (input.date !== undefined) body.date = input.date;
    if (input.category_id !== undefined) body.category_id = input.category_id;
    if (input.genre_id !== undefined) body.genre_id = input.genre_id;
    if (input.from_account_id !== undefined) body.from_account_id = input.from_account_id;
    if (input.to_account_id !== undefined) body.to_account_id = input.to_account_id;
    if (input.place !== undefined) body.place = input.place;
    if (input.comment !== undefined) body.comment = input.comment;
    if (input.name !== undefined) body.name = input.name;
    
    // モードに応じたエンドポイントを選択
    const endpoint = `/v2/home/money/${input.mode}/${input.id}`;
    
    const response = await client.put(endpoint, body);
    
    // レスポンスの形式をチェック
    if (!response || typeof response !== 'object' || !response.money) {
      return {
        record: null,
        success: false,
        message: '記録の更新に失敗しました: 無効なレスポンス形式'
      };
    }
    
    return {
      record: Array.isArray(response.money) ? response.money[0] : response.money,
      success: true,
      message: '記録を更新しました'
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    return {
      record: null,
      success: false,
      message: `記録の更新に失敗しました: ${errorMessage}`
    };
  }
}