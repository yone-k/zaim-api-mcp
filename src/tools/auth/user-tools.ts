import { z } from 'zod';
import { TokenStorage } from '../../utils/token-storage.js';
import type { ToolDefinition } from '../../types/mcp.js';

/**
 * 認証状態チェックツールの入力スキーマ
 */
export const CheckAuthStatusInputSchema = z.object({}).strict();

export type CheckAuthStatusInput = z.infer<typeof CheckAuthStatusInputSchema>;

/**
 * 認証状態チェックツールの出力スキーマ
 */
export const CheckAuthStatusOutputSchema = z.object({
  isAuthenticated: z.boolean(),
  user: z.object({
    id: z.number(),
    login: z.string(),
    name: z.string()
  }).nullable(),
  message: z.string()
});

export type CheckAuthStatusOutput = z.infer<typeof CheckAuthStatusOutputSchema>;

/**
 * ユーザー情報取得ツールの入力スキーマ
 */
export const GetUserInfoInputSchema = z.object({}).strict();

export type GetUserInfoInput = z.infer<typeof GetUserInfoInputSchema>;

/**
 * ユーザー情報取得ツールの出力スキーマ
 */
export const GetUserInfoOutputSchema = z.object({
  user: z.object({
    id: z.number(),
    login: z.string().optional(),
    name: z.string(),
    profile_image_url: z.string().optional(),
    input_count: z.number().optional(),
    repeat_count: z.number().optional(),
    day: z.string().optional()
  }).nullable(),
  success: z.boolean(),
  message: z.string()
});

export type GetUserInfoOutput = z.infer<typeof GetUserInfoOutputSchema>;

/**
 * 認証状態チェックツールの定義
 */
export const checkAuthStatusToolDefinition: ToolDefinition = {
  name: 'zaim_check_auth_status',
  description: 'Zaim APIの認証状態をチェックし、アクセストークンの有効性を確認します',
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [],
    additionalProperties: false
  }
};

/**
 * ユーザー情報取得ツールの定義
 */
export const getUserInfoToolDefinition: ToolDefinition = {
  name: 'zaim_get_user_info',
  description: 'Zaimユーザーの詳細情報（プロフィール、統計情報等）を取得します',
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [],
    additionalProperties: false
  }
};

/**
 * Zaim APIの認証状態をチェック
 * 
 * @param input - 入力パラメータ（空のオブジェクト）
 * @returns 認証状態の結果
 */
export async function checkAuthStatusTool(input: CheckAuthStatusInput): Promise<CheckAuthStatusOutput> {
  // inputパラメータは空だが、型安全性のために受け取る
  void input;
  try {
    const client = TokenStorage.createZaimApiClient();
    const response = await client.get('/v2/home/user/verify');
    
    // レスポンスの形式をチェック
    if (!response || typeof response !== 'object' || !response.me) {
      return {
        isAuthenticated: false,
        user: null,
        message: '認証に失敗しました: 無効なレスポンス形式'
      };
    }
    
    const userData = response.me;
    
    // 必要最小限のユーザー情報があるかチェック
    if (!userData.id || !userData.name) {
      return {
        isAuthenticated: false,
        user: null,
        message: '認証に失敗しました: 無効なユーザーデータ'
      };
    }
    
    return {
      isAuthenticated: true,
      user: {
        id: userData.id,
        login: userData.login || '',
        name: userData.name
      },
      message: '認証に成功しました'
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    
    return {
      isAuthenticated: false,
      user: null,
      message: `認証に失敗しました: ${errorMessage}`
    };
  }
}

/**
 * Zaimユーザーの詳細情報を取得
 * 
 * @param input - 入力パラメータ（空のオブジェクト）
 * @returns ユーザー情報の取得結果
 */
export async function getUserInfoTool(input: GetUserInfoInput): Promise<GetUserInfoOutput> {
  // inputパラメータは空だが、型安全性のために受け取る
  void input;
  try {
    const client = TokenStorage.createZaimApiClient();
    const response = await client.get('/v2/home/user/verify');
    
    // レスポンスの形式をチェック
    if (!response || typeof response !== 'object' || !response.me) {
      return {
        user: null,
        success: false,
        message: 'ユーザー情報の取得に失敗しました: ユーザーデータが見つかりません'
      };
    }
    
    const userData = response.me;
    
    // ユーザー情報を構築（利用可能なフィールドのみ）
    const userInfo: Record<string, unknown> = {};
    
    if (userData.id !== undefined) userInfo.id = userData.id;
    if (userData.login !== undefined) userInfo.login = userData.login;
    if (userData.name !== undefined) userInfo.name = userData.name;
    if (userData.profile_image_url !== undefined) userInfo.profile_image_url = userData.profile_image_url;
    if (userData.input_count !== undefined) userInfo.input_count = userData.input_count;
    if (userData.repeat_count !== undefined) userInfo.repeat_count = userData.repeat_count;
    if (userData.day !== undefined) userInfo.day = userData.day;
    
    return {
      user: userInfo as any,
      success: true,
      message: 'ユーザー情報を取得しました'
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    
    return {
      user: null,
      success: false,
      message: `ユーザー情報の取得に失敗しました: ${errorMessage}`
    };
  }
}