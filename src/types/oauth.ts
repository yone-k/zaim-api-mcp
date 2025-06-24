import { z } from 'zod';

/**
 * OAuth 1.0a認証に必要な設定情報
 */
export const OAuthConfigSchema = z.object({
  /** コンシューマーキー */
  consumerKey: z.string(),
  /** コンシューマーシークレット */
  consumerSecret: z.string(),
  /** アクセストークン */
  accessToken: z.string(),
  /** アクセストークンシークレット */
  accessTokenSecret: z.string(),
}).strict();

export type OAuthConfig = z.infer<typeof OAuthConfigSchema>;

/**
 * OAuth認証パラメータ
 */
export const OAuthParametersSchema = z.object({
  /** コンシューマーキー */
  oauth_consumer_key: z.string(),
  /** ワンタイムトークン */
  oauth_nonce: z.string(),
  /** 署名方式 */
  oauth_signature_method: z.string(),
  /** タイムスタンプ */
  oauth_timestamp: z.string(),
  /** アクセストークン */
  oauth_token: z.string(),
  /** バージョン */
  oauth_version: z.string(),
  /** 署名 */
  oauth_signature: z.string().optional(),
}).strict();

export type OAuthParameters = z.infer<typeof OAuthParametersSchema>;

/**
 * HTTPメソッド
 */
export const HttpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'DELETE']);

export type HttpMethod = z.infer<typeof HttpMethodSchema>;

/**
 * リクエストパラメータ
 */
export const RequestParametersSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]));

export type RequestParameters = z.infer<typeof RequestParametersSchema>;