import { ZaimApiClient } from '../core/zaim-api-client.js';
import type { OAuthConfig } from '../types/oauth.js';

/**
 * 環境変数チェック結果
 */
export interface EnvironmentCheckResult {
  /** 環境変数が正しく設定されているか */
  isValid: boolean;
  /** 不足している環境変数の一覧 */
  missingVars: string[];
  /** 結果メッセージ */
  message: string;
}

/**
 * トークンストレージクラス
 * 環境変数からOAuth認証情報を管理する
 */
export class TokenStorage {
  /** 必要な環境変数の一覧 */
  private static readonly REQUIRED_ENV_VARS = [
    'ZAIM_CONSUMER_KEY',
    'ZAIM_CONSUMER_SECRET',
    'ZAIM_ACCESS_TOKEN',
    'ZAIM_ACCESS_TOKEN_SECRET'
  ] as const;

  /**
   * 環境変数からOAuth設定を取得
   * @returns OAuth認証設定
   * @throws {Error} 必要な環境変数が設定されていない場合
   */
  static getOAuthConfig(): OAuthConfig {
    const consumerKey = this.getRequiredEnvVar('ZAIM_CONSUMER_KEY');
    const consumerSecret = this.getRequiredEnvVar('ZAIM_CONSUMER_SECRET');
    const accessToken = this.getRequiredEnvVar('ZAIM_ACCESS_TOKEN');
    const accessTokenSecret = this.getRequiredEnvVar('ZAIM_ACCESS_TOKEN_SECRET');

    return {
      consumerKey,
      consumerSecret,
      accessToken,
      accessTokenSecret
    };
  }

  /**
   * OAuth設定の検証
   * @param config OAuth設定
   * @returns 設定が有効かどうか
   */
  static validateConfig(config: OAuthConfig): boolean {
    return Boolean(
      config.consumerKey &&
      config.consumerSecret &&
      config.accessToken &&
      config.accessTokenSecret &&
      config.consumerKey.trim() !== '' &&
      config.consumerSecret.trim() !== '' &&
      config.accessToken.trim() !== '' &&
      config.accessTokenSecret.trim() !== ''
    );
  }

  /**
   * 必要な環境変数の一覧を取得
   * @returns 環境変数名の配列
   */
  static getRequiredEnvVars(): readonly string[] {
    return this.REQUIRED_ENV_VARS;
  }

  /**
   * 環境変数の設定状況をチェック
   * @returns チェック結果
   */
  static checkEnvironment(): EnvironmentCheckResult {
    const missingVars: string[] = [];

    for (const varName of this.REQUIRED_ENV_VARS) {
      const value = process.env[varName];
      if (!value || value.trim() === '') {
        missingVars.push(varName);
      }
    }

    if (missingVars.length === 0) {
      return {
        isValid: true,
        missingVars: [],
        message: 'All required environment variables are set'
      };
    }

    return {
      isValid: false,
      missingVars,
      message: `Missing required environment variables: ${missingVars.join(', ')}`
    };
  }

  /**
   * Zaim APIクライアントを作成
   * @returns ZaimApiClientインスタンス
   * @throws {Error} 必要な環境変数が設定されていない場合
   */
  static createZaimApiClient(): ZaimApiClient {
    const config = this.getOAuthConfig();
    return new ZaimApiClient(config);
  }

  /**
   * 必要な環境変数を取得（内部使用）
   * @param varName 環境変数名
   * @returns 環境変数の値
   * @throws {Error} 環境変数が設定されていない場合
   */
  private static getRequiredEnvVar(varName: string): string {
    const value = process.env[varName];
    
    if (!value || value.trim() === '') {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
    
    return value.trim();
  }
}