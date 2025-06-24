import { z } from 'zod';
import { TokenStorage } from '../../utils/token-storage.js';
import type { ToolDefinition } from '../../types/mcp.js';
import type { ZaimMoney } from '../../types/zaim-api.js';

/**
 * 家計簿記録取得ツールの入力スキーマ
 */
export const GetMoneyRecordsInputSchema = z.object({
  mode: z.enum(['payment', 'income', 'transfer'])
    .optional()
    .describe('記録の種類（支出/収入/振替）'),
  start_date: z.string()
    .optional()
    .describe('開始日（YYYY-MM-DD形式）'),
  end_date: z.string()
    .optional()
    .describe('終了日（YYYY-MM-DD形式）'),
  category_id: z.number()
    .optional()
    .describe('カテゴリID'),
  limit: z.number()
    .optional()
    .default(20)
    .describe('取得件数（最大100件）'),
  page: z.number()
    .optional()
    .default(1)
    .describe('ページ番号（1から開始）')
}).strict();

export type GetMoneyRecordsInput = z.infer<typeof GetMoneyRecordsInputSchema>;

/**
 * 家計簿記録取得ツールの出力スキーマ
 */
export const GetMoneyRecordsOutputSchema = z.object({
  records: z.array(z.custom<ZaimMoney>()),
  count: z.number(),
  success: z.boolean(),
  message: z.string()
});

export type GetMoneyRecordsOutput = z.infer<typeof GetMoneyRecordsOutputSchema>;

/**
 * 家計簿記録取得ツールの定義
 */
export const getMoneyRecordsToolDefinition: ToolDefinition = {
  name: 'zaim_get_money_records',
  description: 'Zaim家計簿の支出・収入・振替記録を取得します。日付範囲、カテゴリ、モードでフィルタリング可能です。',
  inputSchema: {
    type: 'object' as const,
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
};

/**
 * Zaim家計簿の記録を取得
 * 
 * @param input - 検索条件
 * @returns 家計簿記録の取得結果
 */
export async function getMoneyRecordsTool(input: GetMoneyRecordsInput): Promise<GetMoneyRecordsOutput> {
  try {
    const client = TokenStorage.createZaimApiClient();
    
    // クエリパラメータの構築
    const params: Record<string, string | number> = {};
    
    if (input.mode) {
      params.mode = input.mode;
    }
    if (input.start_date) {
      params.start_date = input.start_date;
    }
    if (input.end_date) {
      params.end_date = input.end_date;
    }
    if (input.category_id) {
      params.category_id = input.category_id;
    }
    if (input.limit) {
      params.limit = input.limit;
    }
    if (input.page) {
      params.page = input.page;
    }
    
    const response = await client.get('/v2/home/money', params);
    
    // レスポンスの形式をチェック
    if (!response || typeof response !== 'object' || !Array.isArray(response.money)) {
      return {
        records: [],
        count: 0,
        success: false,
        message: '記録の取得に失敗しました: 無効なレスポンス形式'
      };
    }
    
    const records = response.money;
    
    return {
      records: records,
      count: records.length,
      success: true,
      message: `${records.length}件の記録を取得しました`
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    
    return {
      records: [],
      count: 0,
      success: false,
      message: `記録の取得に失敗しました: ${errorMessage}`
    };
  }
}