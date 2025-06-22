import { generateOAuthSignature } from '../utils/oauth-signature.js';
import type { 
  OAuthConfig, 
  OAuthParameters, 
  HttpMethod, 
  RequestParameters 
} from '../types/oauth.js';
import type { ZaimApiResponse } from '../types/zaim-api.js';

/**
 * Zaim API クライアント
 * OAuth 1.0a認証を使用してZaim APIとの通信を行う
 */
export class ZaimApiClient {
  private readonly config: OAuthConfig;
  private readonly baseUrl = 'https://api.zaim.net';

  /**
   * コンストラクタ
   * @param config OAuth認証設定
   */
  constructor(config: OAuthConfig) {
    this.validateConfig(config);
    this.config = config;
  }

  /**
   * 設定値の検証
   * @param config OAuth認証設定
   */
  private validateConfig(config: OAuthConfig): void {
    if (!config.consumerKey) {
      throw new Error('consumerKey is required');
    }
    if (!config.consumerSecret) {
      throw new Error('consumerSecret is required');
    }
    if (!config.accessToken) {
      throw new Error('accessToken is required');
    }
    if (!config.accessTokenSecret) {
      throw new Error('accessTokenSecret is required');
    }
  }

  /**
   * GETリクエストを実行
   * @param endpoint APIエンドポイント
   * @param params クエリパラメータ
   * @returns APIレスポンス
   */
  async get<T = unknown>(
    endpoint: string, 
    params?: RequestParameters
  ): Promise<ZaimApiResponse<T>> {
    return this.request('GET', endpoint, undefined, params);
  }

  /**
   * POSTリクエストを実行
   * @param endpoint APIエンドポイント
   * @param data リクエストボディデータ
   * @returns APIレスポンス
   */
  async post<T = unknown>(
    endpoint: string, 
    data?: RequestParameters
  ): Promise<ZaimApiResponse<T>> {
    return this.request('POST', endpoint, data);
  }

  /**
   * PUTリクエストを実行
   * @param endpoint APIエンドポイント
   * @param data リクエストボディデータ
   * @returns APIレスポンス
   */
  async put<T = unknown>(
    endpoint: string, 
    data?: RequestParameters
  ): Promise<ZaimApiResponse<T>> {
    return this.request('PUT', endpoint, data);
  }

  /**
   * DELETEリクエストを実行
   * @param endpoint APIエンドポイント
   * @returns APIレスポンス
   */
  async delete<T = unknown>(
    endpoint: string
  ): Promise<ZaimApiResponse<T>> {
    return this.request('DELETE', endpoint);
  }

  /**
   * HTTPリクエストを実行
   * @param method HTTPメソッド
   * @param endpoint APIエンドポイント
   * @param data リクエストボディデータ
   * @param queryParams クエリパラメータ
   * @returns APIレスポンス
   */
  private async request<T = unknown>(
    method: HttpMethod,
    endpoint: string,
    data?: RequestParameters,
    queryParams?: RequestParameters
  ): Promise<ZaimApiResponse<T>> {
    try {
      const url = this.buildUrl(endpoint, queryParams);
      const requestParams = this.buildRequestParameters(data);
      const authHeader = this.generateAuthHeader(method, url, requestParams);
      
      const requestOptions: RequestInit = {
        method,
        headers: {
          'Authorization': authHeader,
          'User-Agent': 'Zaim-MCP-Client/1.0'
        }
      };

      // POST/PUTの場合はボディデータを設定
      if ((method === 'POST' || method === 'PUT') && data) {
        requestOptions.headers = {
          ...requestOptions.headers,
          'Content-Type': 'application/x-www-form-urlencoded'
        };
        requestOptions.body = this.encodeFormData(requestParams);
      }

      const response = await fetch(url, requestOptions);
      return await this.handleResponse<T>(response);

    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Zaim API Error')) {
          throw error;
        }
        throw new Error(`Network error occurred: ${error.message}`);
      }
      throw new Error('Unknown network error occurred');
    }
  }

  /**
   * URLを構築
   * @param endpoint APIエンドポイント
   * @param queryParams クエリパラメータ
   * @returns 完全なURL
   */
  private buildUrl(endpoint: string, queryParams?: RequestParameters): string {
    let url = `${this.baseUrl}${endpoint}`;
    
    if (queryParams && Object.keys(queryParams).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
      url += `?${searchParams.toString()}`;
    }
    
    return url;
  }

  /**
   * リクエストパラメータを構築
   * @param data 入力データ
   * @returns 文字列形式のパラメータ
   */
  private buildRequestParameters(data?: RequestParameters): Record<string, string> {
    if (!data) return {};
    
    const params: Record<string, string> = {};
    Object.entries(data).forEach(([key, value]) => {
      params[key] = String(value);
    });
    
    return params;
  }

  /**
   * OAuth認証ヘッダーを生成
   * @param method HTTPメソッド
   * @param url リクエストURL
   * @param requestParams リクエストパラメータ
   * @returns Authorization ヘッダー値
   */
  private generateAuthHeader(
    method: HttpMethod, 
    url: string, 
    requestParams: Record<string, string>
  ): string {
    const oauthParams: OAuthParameters = {
      oauth_consumer_key: this.config.consumerKey,
      oauth_nonce: this.generateNonce(),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: this.generateTimestamp(),
      oauth_token: this.config.accessToken,
      oauth_version: '1.0'
    };

    // URLからクエリパラメータを抽出
    const [baseUrl, queryString] = url.split('?');
    const queryParams: Record<string, string> = {};
    
    if (queryString) {
      const urlParams = new URLSearchParams(queryString);
      urlParams.forEach((value, key) => {
        queryParams[key] = value;
      });
    }

    // 署名対象パラメータを統合
    const allParams = {
      ...oauthParams,
      ...requestParams,
      ...queryParams
    };

    // 署名を生成
    const signature = generateOAuthSignature(
      method,
      baseUrl,
      allParams,
      this.config.consumerSecret,
      this.config.accessTokenSecret
    );

    const oauthParamsWithSignature = {
      ...oauthParams,
      oauth_signature: signature
    };

    // Authorizationヘッダーを構築
    return this.buildAuthorizationHeader(oauthParamsWithSignature);
  }

  /**
   * Authorizationヘッダー文字列を構築
   * @param oauthParams OAuth パラメータ
   * @returns Authorization ヘッダー値
   */
  private buildAuthorizationHeader(oauthParams: OAuthParameters & { oauth_signature: string }): string {
    const headerParts = Object.entries(oauthParams)
      .map(([key, value]) => `${key}="${encodeURIComponent(value)}"`)
      .join(', ');
    
    return `OAuth ${headerParts}`;
  }

  /**
   * フォームデータをエンコード
   * @param params パラメータ
   * @returns URLエンコードされた文字列
   */
  private encodeFormData(params: Record<string, string>): string {
    return Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
  }

  /**
   * ワンタイムトークン（nonce）を生成
   * @returns nonce文字列
   */
  private generateNonce(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * タイムスタンプを生成
   * @returns Unix タイムスタンプ文字列
   */
  private generateTimestamp(): string {
    return Math.floor(Date.now() / 1000).toString();
  }

  /**
   * レスポンスを処理
   * @param response Fetch Response
   * @returns パース済みレスポンス
   */
  private async handleResponse<T>(response: Response): Promise<ZaimApiResponse<T>> {
    let responseData: unknown;
    
    try {
      responseData = await response.json();
    } catch {
      responseData = {};
    }

    if (!response.ok) {
      const errorData = responseData as { message?: string; error?: string };
      const errorMessage = errorData.message || errorData.error || 'Unknown error';
      throw new Error(`Zaim API Error: ${response.status} - ${errorMessage}`);
    }

    return responseData as ZaimApiResponse<T>;
  }
}