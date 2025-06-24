import crypto from 'crypto';

/**
 * OAuth 1.0a パラメータを正規化する
 * RFC 5849 Section 3.4.1.3.2 に準拠
 * 
 * @param parameters - パラメータオブジェクト
 * @returns 正規化されたパラメータ文字列
 */
export function normalizeParameters(parameters: Record<string, string>): string {
  const encodedParams = Object.entries(parameters)
    .map(([key, value]) => [
      encodeURIComponent(key),
      encodeURIComponent(value)
    ])
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  return encodedParams;
}

/**
 * OAuth 1.0a ベース文字列を構築する
 * RFC 5849 Section 3.4.1.1 に準拠
 * 
 * @param method - HTTPメソッド
 * @param url - リクエストURL
 * @param normalizedParams - 正規化されたパラメータ文字列
 * @returns ベース文字列
 */
export function constructBaseString(
  method: string,
  url: string,
  normalizedParams: string
): string {
  const baseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(normalizedParams)
  ].join('&');
  
  return baseString;
}

/**
 * OAuth 1.0a 署名キーを構築する
 * RFC 5849 Section 3.4.2 に準拠
 * 
 * @param consumerSecret - コンシューマーシークレット
 * @param tokenSecret - トークンシークレット（オプション）
 * @returns 署名キー
 */
export function constructSigningKey(
  consumerSecret: string,
  tokenSecret?: string
): string {
  const encodedConsumerSecret = encodeURIComponent(consumerSecret);
  const encodedTokenSecret = tokenSecret ? encodeURIComponent(tokenSecret) : '';
  
  return `${encodedConsumerSecret}&${encodedTokenSecret}`;
}

/**
 * OAuth 1.0a HMAC-SHA1署名を生成する
 * RFC 5849 Section 3.4.2 に準拠
 * 
 * @param method - HTTPメソッド
 * @param url - リクエストURL
 * @param parameters - リクエストパラメータ
 * @param consumerSecret - コンシューマーシークレット
 * @param tokenSecret - トークンシークレット（オプション）
 * @returns Base64エンコードされた署名
 */
export function generateOAuthSignature(
  method: string,
  url: string,
  parameters: Record<string, string>,
  consumerSecret: string,
  tokenSecret?: string
): string {
  const normalizedParams = normalizeParameters(parameters);
  const baseString = constructBaseString(method, url, normalizedParams);
  const signingKey = constructSigningKey(consumerSecret, tokenSecret);
  
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(baseString)
    .digest('base64');
  
  return signature;
}