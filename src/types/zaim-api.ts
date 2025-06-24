import { z } from 'zod';

/**
 * ユーザー情報
 */
export const ZaimUserSchema = z.object({
  /** ユーザーID */
  id: z.number(),
  /** ログイン名 */
  login: z.string().optional(),
  /** ユーザー名 */
  name: z.string(),
  /** プロフィール画像URL */
  profile_image_url: z.string().optional(),
  /** 入力ガイドの表示設定 */
  input_count: z.number().optional(),
  /** 家計簿の継続日数 */
  repeat_count: z.number().optional(),
  /** 登録日 */
  day: z.string().optional(),
}).strict();

export type ZaimUser = z.infer<typeof ZaimUserSchema>;

/**
 * 家計簿データ
 */
export const ZaimMoneySchema = z.object({
  /** データID */
  id: z.number(),
  /** 支出種別（payment, income, transfer） */
  mode: z.enum(['payment', 'income', 'transfer']),
  /** ユーザーID */
  user_id: z.number(),
  /** 日付 */
  date: z.string(),
  /** カテゴリーID */
  category_id: z.number(),
  /** ジャンルID */
  genre_id: z.number(),
  /** 口座ID */
  account_id: z.number(),
  /** 金額 */
  amount: z.number(),
  /** コメント */
  comment: z.string(),
  /** 確定フラグ */
  active: z.number(),
  /** 作成日時 */
  created: z.string(),
  /** 通貨コード */
  currency_code: z.string(),
  /** カテゴリー名 */
  category: z.string(),
  /** ジャンル名 */
  genre: z.string(),
  /** 口座名 */
  account: z.string(),
  /** 振替元口座ID（振替の場合） */
  from_account_id: z.number().optional(),
  /** 振替先口座ID（振替の場合） */
  to_account_id: z.number().optional(),
}).strict();

export type ZaimMoney = z.infer<typeof ZaimMoneySchema>;

/**
 * カテゴリー情報
 */
export const ZaimCategorySchema = z.object({
  /** カテゴリーID */
  id: z.number(),
  /** カテゴリー名 */
  name: z.string(),
  /** 支出種別 */
  mode: z.enum(['payment', 'income']),
  /** ソート順 */
  sort: z.number(),
  /** アクティブ状態 */
  active: z.number(),
  /** 作成日時 */
  created: z.string(),
  /** 更新日時 */
  modified: z.string(),
}).strict();

export type ZaimCategory = z.infer<typeof ZaimCategorySchema>;

/**
 * ジャンル情報
 */
export const ZaimGenreSchema = z.object({
  /** ジャンルID */
  id: z.number(),
  /** ジャンル名 */
  name: z.string(),
  /** カテゴリーID */
  category_id: z.number(),
  /** 支出種別 */
  mode: z.enum(['payment', 'income']),
  /** ソート順 */
  sort: z.number(),
  /** アクティブ状態 */
  active: z.number(),
  /** 作成日時 */
  created: z.string(),
  /** 更新日時 */
  modified: z.string(),
}).strict();

export type ZaimGenre = z.infer<typeof ZaimGenreSchema>;

/**
 * 口座情報
 */
export const ZaimAccountSchema = z.object({
  /** 口座ID */
  id: z.number(),
  /** 口座名 */
  name: z.string(),
  /** 口座種別 */
  mode: z.enum(['bank', 'card', 'cash']),
  /** ソート順 */
  sort: z.number(),
  /** アクティブ状態 */
  active: z.number(),
  /** 作成日時 */
  created: z.string(),
  /** 更新日時 */
  modified: z.string(),
}).strict();

export type ZaimAccount = z.infer<typeof ZaimAccountSchema>;

/**
 * 通貨情報
 */
export const ZaimCurrencySchema = z.object({
  /** 通貨コード */
  code: z.string(),
  /** 通貨名 */
  name: z.string(),
}).strict();

export type ZaimCurrency = z.infer<typeof ZaimCurrencySchema>;

/**
 * Zaim APIの基本レスポンス形式
 */
export const ZaimApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) => z.object({
  /** レスポンスデータ */
  data: dataSchema.optional(),
  /** エラー情報 */
  error: z.string().optional(),
  /** エラーメッセージ */
  message: z.string().optional(),
  /** ステータス */
  status: z.number().optional(),
  /** タイムスタンプ */
  timestamp: z.string().optional(),
  /** ユーザー情報（認証API用） */
  me: ZaimUserSchema.optional(),
  /** 家計簿データ（money関連API用） */
  money: z.array(ZaimMoneySchema).optional(),
  /** カテゴリデータ（categories API用） */
  categories: z.array(ZaimCategorySchema).optional(),
  /** ジャンルデータ（genres API用） */
  genres: z.array(ZaimGenreSchema).optional(),
  /** 口座データ（accounts API用） */
  accounts: z.array(ZaimAccountSchema).optional(),
  /** 通貨データ（currencies API用） */
  currencies: z.array(ZaimCurrencySchema).optional(),
}).strict();

export type ZaimApiResponse<T = unknown> = {
  /** レスポンスデータ */
  data?: T;
  /** エラー情報 */
  error?: string;
  /** エラーメッセージ */
  message?: string;
  /** ステータス */
  status?: number;
  /** タイムスタンプ */
  timestamp?: string;
  /** ユーザー情報（認証API用） */
  me?: ZaimUser;
  /** 家計簿データ（money関連API用） */
  money?: ZaimMoney[];
  /** カテゴリデータ（categories API用） */
  categories?: ZaimCategory[];
  /** ジャンルデータ（genres API用） */
  genres?: ZaimGenre[];
  /** 口座データ（accounts API用） */
  accounts?: ZaimAccount[];
  /** 通貨データ（currencies API用） */
  currencies?: ZaimCurrency[];
};

/**
 * 家計簿データの検索条件
 */
export const MoneySearchParamsSchema = z.object({
  /** 開始日（YYYY-MM-DD） */
  start_date: z.string().optional(),
  /** 終了日（YYYY-MM-DD） */
  end_date: z.string().optional(),
  /** カテゴリーID */
  category_id: z.number().optional(),
  /** ジャンルID */
  genre_id: z.number().optional(),
  /** 口座ID */
  account_id: z.number().optional(),
  /** 支出種別 */
  mode: z.enum(['payment', 'income', 'transfer']).optional(),
  /** ページ番号 */
  page: z.number().optional(),
  /** 1ページあたりの件数（最大100） */
  limit: z.number().optional(),
}).strict();

export type MoneySearchParams = z.infer<typeof MoneySearchParamsSchema>;

/**
 * 支出作成パラメータ
 */
export const CreatePaymentParamsSchema = z.object({
  /** 金額 */
  amount: z.number(),
  /** 日付（YYYY-MM-DD） */
  date: z.string(),
  /** カテゴリーID */
  category_id: z.number(),
  /** ジャンルID（オプション） */
  genre_id: z.number().optional(),
  /** 口座ID（オプション） */
  account_id: z.number().optional(),
  /** コメント（オプション） */
  comment: z.string().optional(),
  /** 確定フラグ（オプション、デフォルト1） */
  active: z.number().optional(),
}).strict();

export type CreatePaymentParams = z.infer<typeof CreatePaymentParamsSchema>;

/**
 * 収入作成パラメータ
 */
export const CreateIncomeParamsSchema = z.object({
  /** 金額 */
  amount: z.number(),
  /** 日付（YYYY-MM-DD） */
  date: z.string(),
  /** カテゴリーID */
  category_id: z.number(),
  /** ジャンルID（オプション） */
  genre_id: z.number().optional(),
  /** 口座ID（オプション） */
  account_id: z.number().optional(),
  /** コメント（オプション） */
  comment: z.string().optional(),
  /** 確定フラグ（オプション、デフォルト1） */
  active: z.number().optional(),
}).strict();

export type CreateIncomeParams = z.infer<typeof CreateIncomeParamsSchema>;

/**
 * 振替作成パラメータ
 */
export const CreateTransferParamsSchema = z.object({
  /** 金額 */
  amount: z.number(),
  /** 日付（YYYY-MM-DD） */
  date: z.string(),
  /** 振替元口座ID */
  from_account_id: z.number(),
  /** 振替先口座ID */
  to_account_id: z.number(),
  /** コメント（オプション） */
  comment: z.string().optional(),
  /** 確定フラグ（オプション、デフォルト1） */
  active: z.number().optional(),
}).strict();

export type CreateTransferParams = z.infer<typeof CreateTransferParamsSchema>;

/**
 * データ更新パラメータ
 */
export const UpdateMoneyParamsSchema = z.object({
  /** 金額（オプション） */
  amount: z.number().optional(),
  /** 日付（YYYY-MM-DD、オプション） */
  date: z.string().optional(),
  /** カテゴリーID（オプション） */
  category_id: z.number().optional(),
  /** ジャンルID（オプション） */
  genre_id: z.number().optional(),
  /** 口座ID（オプション） */
  account_id: z.number().optional(),
  /** コメント（オプション） */
  comment: z.string().optional(),
  /** 確定フラグ（オプション） */
  active: z.number().optional(),
}).strict();

export type UpdateMoneyParams = z.infer<typeof UpdateMoneyParamsSchema>;