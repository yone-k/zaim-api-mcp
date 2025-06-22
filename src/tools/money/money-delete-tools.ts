import { z } from 'zod';
import { TokenStorage } from '../../utils/token-storage.js';
import type { ToolDefinition } from '../../types/mcp.js';

/**
 * 記録削除ツールの入力スキーマ
 */
export const DeleteMoneyRecordInputSchema = z.object({
  id: z.number().describe('削除する記録のID'),
  mode: z.enum(['payment', 'income', 'transfer']).describe('記録の種類')
}).strict();

export type DeleteMoneyRecordInput = z.infer<typeof DeleteMoneyRecordInputSchema>;

/**
 * 記録削除結果の出力スキーマ
 */
export const DeleteMoneyRecordOutputSchema = z.object({
  deleted_record: z.object({
    id: z.number(),
    mode: z.enum(['payment', 'income', 'transfer']),
    date: z.string(),
    amount: z.number(),
    currency_code: z.string(),
    category_id: z.number().optional(),
    genre_id: z.number().optional(),
    from_account_id: z.number().optional(),
    to_account_id: z.number().optional(),
    place: z.string().optional(),
    place_uid: z.string().optional(),
    comment: z.string().optional(),
    name: z.string().optional(),
    created: z.string().optional(),
    modified: z.string().optional()
  }).nullable(),
  success: z.boolean(),
  message: z.string()
});

export type DeleteMoneyRecordOutput = z.infer<typeof DeleteMoneyRecordOutputSchema>;

/**
 * ツール定義
 */
export const deleteMoneyRecordToolDefinition: ToolDefinition = {
  name: 'zaim_delete_money_record',
  description: 'Zaimの家計簿記録を削除します。削除は永続的で復元できません。',
  inputSchema: {
    type: 'object' as const,
    properties: {
      id: {
        type: 'number',
        description: '削除する記録のID'
      },
      mode: {
        type: 'string',
        enum: ['payment', 'income', 'transfer'],
        description: '記録の種類'
      }
    },
    required: ['id', 'mode'],
    additionalProperties: false
  }
};

/**
 * 家計簿記録を削除
 */
export async function deleteMoneyRecordTool(input: DeleteMoneyRecordInput): Promise<DeleteMoneyRecordOutput> {
  try {
    const client = TokenStorage.createZaimApiClient();
    
    // モードに応じたエンドポイントを構築
    const endpoint = `/v2/home/money/${input.mode}/${input.id}`;
    
    const response = await client.delete(endpoint);
    
    // レスポンスの形式をチェック
    if (!response || typeof response !== 'object' || !response.money) {
      return {
        deleted_record: null,
        success: false,
        message: '記録の削除に失敗しました: 無効なレスポンス形式'
      };
    }
    
    return {
      deleted_record: response.money,
      success: true,
      message: '記録を削除しました'
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    return {
      deleted_record: null,
      success: false,
      message: `記録の削除に失敗しました: ${errorMessage}`
    };
  }
}