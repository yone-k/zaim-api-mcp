/**
 * OAuth 1.0a認証に必要な設定情報
 */
export interface OAuthConfig {
  /** コンシューマーキー */
  consumerKey: string;
  /** コンシューマーシークレット */
  consumerSecret: string;
  /** アクセストークン */
  accessToken: string;
  /** アクセストークンシークレット */
  accessTokenSecret: string;
}

/**
 * OAuth認証パラメータ
 */
export interface OAuthParameters {
  /** コンシューマーキー */
  oauth_consumer_key: string;
  /** ワンタイムトークン */
  oauth_nonce: string;
  /** 署名方式 */
  oauth_signature_method: string;
  /** タイムスタンプ */
  oauth_timestamp: string;
  /** アクセストークン */
  oauth_token: string;
  /** バージョン */
  oauth_version: string;
  /** 署名 */
  oauth_signature?: string;
}

/**
 * HTTPメソッド
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * リクエストパラメータ
 */
export type RequestParameters = Record<string, string | number | boolean>;