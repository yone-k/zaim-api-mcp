import { z } from 'zod';
import { TokenStorage } from '../../utils/token-storage.js';
import type { ToolDefinition } from '../../types/mcp.js';
import type { ZaimCategory, ZaimGenre, ZaimAccount, ZaimCurrency } from '../../types/zaim-api.js';

/**
 * ユーザーカテゴリ取得ツールの入力スキーマ
 */
export const GetUserCategoriesInputSchema = z.object({}).strict();

export type GetUserCategoriesInput = z.infer<typeof GetUserCategoriesInputSchema>;

/**
 * ユーザーカテゴリ取得ツールの出力スキーマ
 */
export const GetUserCategoriesOutputSchema = z.object({
  categories: z.array(z.custom<ZaimCategory>()),
  count: z.number(),
  success: z.boolean(),
  message: z.string()
});

export type GetUserCategoriesOutput = z.infer<typeof GetUserCategoriesOutputSchema>;

/**
 * ユーザージャンル取得ツールの入力スキーマ
 */
export const GetUserGenresInputSchema = z.object({}).strict();

export type GetUserGenresInput = z.infer<typeof GetUserGenresInputSchema>;

/**
 * ユーザージャンル取得ツールの出力スキーマ
 */
export const GetUserGenresOutputSchema = z.object({
  genres: z.array(z.custom<ZaimGenre>()),
  count: z.number(),
  success: z.boolean(),
  message: z.string()
});

export type GetUserGenresOutput = z.infer<typeof GetUserGenresOutputSchema>;

/**
 * ユーザー口座取得ツールの入力スキーマ
 */
export const GetUserAccountsInputSchema = z.object({}).strict();

export type GetUserAccountsInput = z.infer<typeof GetUserAccountsInputSchema>;

/**
 * ユーザー口座取得ツールの出力スキーマ
 */
export const GetUserAccountsOutputSchema = z.object({
  accounts: z.array(z.custom<ZaimAccount>()),
  count: z.number(),
  success: z.boolean(),
  message: z.string()
});

export type GetUserAccountsOutput = z.infer<typeof GetUserAccountsOutputSchema>;

/**
 * デフォルトカテゴリ取得ツールの入力スキーマ
 */
export const GetDefaultCategoriesByModeInputSchema = z.object({
  mode: z.enum(['payment', 'income']).describe('カテゴリのモード（支出/収入）')
}).strict();

export type GetDefaultCategoriesByModeInput = z.infer<typeof GetDefaultCategoriesByModeInputSchema>;

/**
 * デフォルトカテゴリ取得ツールの出力スキーマ
 */
export const GetDefaultCategoriesByModeOutputSchema = z.object({
  categories: z.array(z.custom<ZaimCategory>()),
  count: z.number(),
  success: z.boolean(),
  message: z.string()
});

export type GetDefaultCategoriesByModeOutput = z.infer<typeof GetDefaultCategoriesByModeOutputSchema>;

/**
 * デフォルトジャンル取得ツールの入力スキーマ
 */
export const GetDefaultGenresByModeInputSchema = z.object({
  mode: z.enum(['payment', 'income']).describe('ジャンルのモード（支出/収入）')
}).strict();

export type GetDefaultGenresByModeInput = z.infer<typeof GetDefaultGenresByModeInputSchema>;

/**
 * デフォルトジャンル取得ツールの出力スキーマ
 */
export const GetDefaultGenresByModeOutputSchema = z.object({
  genres: z.array(z.custom<ZaimGenre>()),
  count: z.number(),
  success: z.boolean(),
  message: z.string()
});

export type GetDefaultGenresByModeOutput = z.infer<typeof GetDefaultGenresByModeOutputSchema>;

/**
 * 通貨一覧取得ツールの入力スキーマ
 */
export const GetCurrenciesInputSchema = z.object({}).strict();

export type GetCurrenciesInput = z.infer<typeof GetCurrenciesInputSchema>;

/**
 * 通貨一覧取得ツールの出力スキーマ
 */
export const GetCurrenciesOutputSchema = z.object({
  currencies: z.array(z.custom<ZaimCurrency>()),
  count: z.number(),
  success: z.boolean(),
  message: z.string()
});

export type GetCurrenciesOutput = z.infer<typeof GetCurrenciesOutputSchema>;

/**
 * ツール定義
 */
export const getUserCategoriesToolDefinition: ToolDefinition = {
  name: 'zaim_get_user_categories',
  description: 'Zaimユーザーのカスタムカテゴリ一覧を取得します',
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [],
    additionalProperties: false
  }
};

export const getUserGenresToolDefinition: ToolDefinition = {
  name: 'zaim_get_user_genres',
  description: 'Zaimユーザーのカスタムジャンル一覧を取得します',
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [],
    additionalProperties: false
  }
};

export const getUserAccountsToolDefinition: ToolDefinition = {
  name: 'zaim_get_user_accounts',
  description: 'Zaimユーザーの口座一覧を取得します',
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [],
    additionalProperties: false
  }
};

export const getDefaultCategoriesByModeToolDefinition: ToolDefinition = {
  name: 'zaim_get_default_categories',
  description: 'Zaimのデフォルトカテゴリ一覧を取得します（支出または収入）',
  inputSchema: {
    type: 'object' as const,
    properties: {
      mode: {
        type: 'string',
        enum: ['payment', 'income'],
        description: 'カテゴリのモード（支出/収入）'
      }
    },
    required: ['mode'],
    additionalProperties: false
  }
};

export const getDefaultGenresByModeToolDefinition: ToolDefinition = {
  name: 'zaim_get_default_genres',
  description: 'Zaimのデフォルトジャンル一覧を取得します（支出または収入）',
  inputSchema: {
    type: 'object' as const,
    properties: {
      mode: {
        type: 'string',
        enum: ['payment', 'income'],
        description: 'ジャンルのモード（支出/収入）'
      }
    },
    required: ['mode'],
    additionalProperties: false
  }
};

export const getCurrenciesToolDefinition: ToolDefinition = {
  name: 'zaim_get_currencies',
  description: 'Zaimで利用可能な通貨一覧を取得します',
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [],
    additionalProperties: false
  }
};

/**
 * ツール実装
 */
export async function getUserCategoriesTool(input: GetUserCategoriesInput): Promise<GetUserCategoriesOutput> {
  void input;
  try {
    const client = TokenStorage.createZaimApiClient();
    const response = await client.get('/v2/home/category');
    
    if (!response || typeof response !== 'object' || !Array.isArray(response.categories)) {
      return {
        categories: [],
        count: 0,
        success: false,
        message: 'カテゴリの取得に失敗しました: 無効なレスポンス形式'
      };
    }
    
    return {
      categories: response.categories,
      count: response.categories.length,
      success: true,
      message: `${response.categories.length}件のカテゴリを取得しました`
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    return {
      categories: [],
      count: 0,
      success: false,
      message: `カテゴリの取得に失敗しました: ${errorMessage}`
    };
  }
}

export async function getUserGenresTool(input: GetUserGenresInput): Promise<GetUserGenresOutput> {
  void input;
  try {
    const client = TokenStorage.createZaimApiClient();
    const response = await client.get('/v2/home/genre');
    
    if (!response || typeof response !== 'object' || !Array.isArray(response.genres)) {
      return {
        genres: [],
        count: 0,
        success: false,
        message: 'ジャンルの取得に失敗しました: 無効なレスポンス形式'
      };
    }
    
    return {
      genres: response.genres,
      count: response.genres.length,
      success: true,
      message: `${response.genres.length}件のジャンルを取得しました`
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    return {
      genres: [],
      count: 0,
      success: false,
      message: `ジャンルの取得に失敗しました: ${errorMessage}`
    };
  }
}

export async function getUserAccountsTool(input: GetUserAccountsInput): Promise<GetUserAccountsOutput> {
  void input;
  try {
    const client = TokenStorage.createZaimApiClient();
    const response = await client.get('/v2/home/account');
    
    if (!response || typeof response !== 'object' || !Array.isArray(response.accounts)) {
      return {
        accounts: [],
        count: 0,
        success: false,
        message: '口座の取得に失敗しました: 無効なレスポンス形式'
      };
    }
    
    return {
      accounts: response.accounts,
      count: response.accounts.length,
      success: true,
      message: `${response.accounts.length}件の口座を取得しました`
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    return {
      accounts: [],
      count: 0,
      success: false,
      message: `口座の取得に失敗しました: ${errorMessage}`
    };
  }
}

export async function getDefaultCategoriesByModeTool(input: GetDefaultCategoriesByModeInput): Promise<GetDefaultCategoriesByModeOutput> {
  try {
    const client = TokenStorage.createZaimApiClient();
    const response = await client.get('/v2/category', { mode: input.mode });
    
    if (!response || typeof response !== 'object' || !Array.isArray(response.categories)) {
      return {
        categories: [],
        count: 0,
        success: false,
        message: 'デフォルトカテゴリの取得に失敗しました: 無効なレスポンス形式'
      };
    }
    
    return {
      categories: response.categories,
      count: response.categories.length,
      success: true,
      message: `${response.categories.length}件のデフォルトカテゴリを取得しました`
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    return {
      categories: [],
      count: 0,
      success: false,
      message: `デフォルトカテゴリの取得に失敗しました: ${errorMessage}`
    };
  }
}

export async function getDefaultGenresByModeTool(input: GetDefaultGenresByModeInput): Promise<GetDefaultGenresByModeOutput> {
  try {
    const client = TokenStorage.createZaimApiClient();
    const response = await client.get('/v2/genre', { mode: input.mode });
    
    if (!response || typeof response !== 'object' || !Array.isArray(response.genres)) {
      return {
        genres: [],
        count: 0,
        success: false,
        message: 'デフォルトジャンルの取得に失敗しました: 無効なレスポンス形式'
      };
    }
    
    return {
      genres: response.genres,
      count: response.genres.length,
      success: true,
      message: `${response.genres.length}件のデフォルトジャンルを取得しました`
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    return {
      genres: [],
      count: 0,
      success: false,
      message: `デフォルトジャンルの取得に失敗しました: ${errorMessage}`
    };
  }
}

export async function getCurrenciesTool(input: GetCurrenciesInput): Promise<GetCurrenciesOutput> {
  void input;
  try {
    const client = TokenStorage.createZaimApiClient();
    const response = await client.get('/v2/currency');
    
    if (!response || typeof response !== 'object' || !Array.isArray(response.currencies)) {
      return {
        currencies: [],
        count: 0,
        success: false,
        message: '通貨の取得に失敗しました: 無効なレスポンス形式'
      };
    }
    
    return {
      currencies: response.currencies,
      count: response.currencies.length,
      success: true,
      message: `${response.currencies.length}件の通貨を取得しました`
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    return {
      currencies: [],
      count: 0,
      success: false,
      message: `通貨の取得に失敗しました: ${errorMessage}`
    };
  }
}