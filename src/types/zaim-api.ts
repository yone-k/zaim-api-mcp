/**
 * Zaim APIの基本レスポンス形式
 */
export interface ZaimApiResponse<T = unknown> {
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
}

/**
 * ユーザー情報
 */
export interface ZaimUser {
  /** ユーザーID */
  id: number;
  /** ログイン名 */
  login?: string;
  /** ユーザー名 */
  name: string;
  /** プロフィール画像URL */
  profile_image_url?: string;
  /** 入力ガイドの表示設定 */
  input_count?: number;
  /** 家計簿の継続日数 */
  repeat_count?: number;
  /** 登録日 */
  day?: string;
}

/**
 * 家計簿データ
 */
export interface ZaimMoney {
  /** データID */
  id: number;
  /** 支出種別（payment, income, transfer） */
  mode: 'payment' | 'income' | 'transfer';
  /** ユーザーID */
  user_id: number;
  /** 日付 */
  date: string;
  /** カテゴリーID */
  category_id: number;
  /** ジャンルID */
  genre_id: number;
  /** 口座ID */
  account_id: number;
  /** 金額 */
  amount: number;
  /** コメント */
  comment: string;
  /** 確定フラグ */
  active: number;
  /** 作成日時 */
  created: string;
  /** 通貨コード */
  currency_code: string;
  /** カテゴリー名 */
  category: string;
  /** ジャンル名 */
  genre: string;
  /** 口座名 */
  account: string;
  /** 振替元口座ID（振替の場合） */
  from_account_id?: number;
  /** 振替先口座ID（振替の場合） */
  to_account_id?: number;
}

/**
 * カテゴリー情報
 */
export interface ZaimCategory {
  /** カテゴリーID */
  id: number;
  /** カテゴリー名 */
  name: string;
  /** 支出種別 */
  mode: 'payment' | 'income';
  /** ソート順 */
  sort: number;
  /** アクティブ状態 */
  active: number;
  /** 作成日時 */
  created: string;
  /** 更新日時 */
  modified: string;
}

/**
 * ジャンル情報
 */
export interface ZaimGenre {
  /** ジャンルID */
  id: number;
  /** ジャンル名 */
  name: string;
  /** カテゴリーID */
  category_id: number;
  /** 支出種別 */
  mode: 'payment' | 'income';
  /** ソート順 */
  sort: number;
  /** アクティブ状態 */
  active: number;
  /** 作成日時 */
  created: string;
  /** 更新日時 */
  modified: string;
}

/**
 * 口座情報
 */
export interface ZaimAccount {
  /** 口座ID */
  id: number;
  /** 口座名 */
  name: string;
  /** 口座種別 */
  mode: 'bank' | 'card' | 'cash';
  /** ソート順 */
  sort: number;
  /** アクティブ状態 */
  active: number;
  /** 作成日時 */
  created: string;
  /** 更新日時 */
  modified: string;
}

/**
 * 通貨情報
 */
export interface ZaimCurrency {
  /** 通貨コード */
  code: string;
  /** 通貨名 */
  name: string;
}

/**
 * 家計簿データの検索条件
 */
export interface MoneySearchParams {
  /** 開始日（YYYY-MM-DD） */
  start_date?: string;
  /** 終了日（YYYY-MM-DD） */
  end_date?: string;
  /** カテゴリーID */
  category_id?: number;
  /** ジャンルID */
  genre_id?: number;
  /** 口座ID */
  account_id?: number;
  /** 支出種別 */
  mode?: 'payment' | 'income' | 'transfer';
  /** ページ番号 */
  page?: number;
  /** 1ページあたりの件数（最大100） */
  limit?: number;
}

/**
 * 支出作成パラメータ
 */
export interface CreatePaymentParams {
  /** 金額 */
  amount: number;
  /** 日付（YYYY-MM-DD） */
  date: string;
  /** カテゴリーID */
  category_id: number;
  /** ジャンルID（オプション） */
  genre_id?: number;
  /** 口座ID（オプション） */
  account_id?: number;
  /** コメント（オプション） */
  comment?: string;
  /** 確定フラグ（オプション、デフォルト1） */
  active?: number;
}

/**
 * 収入作成パラメータ
 */
export interface CreateIncomeParams {
  /** 金額 */
  amount: number;
  /** 日付（YYYY-MM-DD） */
  date: string;
  /** カテゴリーID */
  category_id: number;
  /** ジャンルID（オプション） */
  genre_id?: number;
  /** 口座ID（オプション） */
  account_id?: number;
  /** コメント（オプション） */
  comment?: string;
  /** 確定フラグ（オプション、デフォルト1） */
  active?: number;
}

/**
 * 振替作成パラメータ
 */
export interface CreateTransferParams {
  /** 金額 */
  amount: number;
  /** 日付（YYYY-MM-DD） */
  date: string;
  /** 振替元口座ID */
  from_account_id: number;
  /** 振替先口座ID */
  to_account_id: number;
  /** コメント（オプション） */
  comment?: string;
  /** 確定フラグ（オプション、デフォルト1） */
  active?: number;
}

/**
 * データ更新パラメータ
 */
export interface UpdateMoneyParams {
  /** 金額（オプション） */
  amount?: number;
  /** 日付（YYYY-MM-DD、オプション） */
  date?: string;
  /** カテゴリーID（オプション） */
  category_id?: number;
  /** ジャンルID（オプション） */
  genre_id?: number;
  /** 口座ID（オプション） */
  account_id?: number;
  /** コメント（オプション） */
  comment?: string;
  /** 確定フラグ（オプション） */
  active?: number;
}