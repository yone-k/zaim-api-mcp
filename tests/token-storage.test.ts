import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TokenStorage } from '../src/utils/token-storage.js';
import type { OAuthConfig } from '../src/types/oauth.js';

describe('TokenStorage', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // 環境変数のバックアップを作成
    originalEnv = { ...process.env };
    
    // テスト用の環境変数をクリア
    delete process.env.ZAIM_CONSUMER_KEY;
    delete process.env.ZAIM_CONSUMER_SECRET;
    delete process.env.ZAIM_ACCESS_TOKEN;
    delete process.env.ZAIM_ACCESS_TOKEN_SECRET;
  });

  afterEach(() => {
    // 環境変数を復元
    process.env = originalEnv;
  });

  describe('getOAuthConfig', () => {
    it('should return valid config when all environment variables are set', () => {
      // テスト用の環境変数を設定
      process.env.ZAIM_CONSUMER_KEY = 'test_consumer_key';
      process.env.ZAIM_CONSUMER_SECRET = 'test_consumer_secret';
      process.env.ZAIM_ACCESS_TOKEN = 'test_access_token';
      process.env.ZAIM_ACCESS_TOKEN_SECRET = 'test_access_token_secret';

      const config = TokenStorage.getOAuthConfig();

      expect(config).toEqual({
        consumerKey: 'test_consumer_key',
        consumerSecret: 'test_consumer_secret',
        accessToken: 'test_access_token',
        accessTokenSecret: 'test_access_token_secret'
      });
    });

    it('should throw error when ZAIM_CONSUMER_KEY is missing', () => {
      process.env.ZAIM_CONSUMER_SECRET = 'test_consumer_secret';
      process.env.ZAIM_ACCESS_TOKEN = 'test_access_token';
      process.env.ZAIM_ACCESS_TOKEN_SECRET = 'test_access_token_secret';

      expect(() => TokenStorage.getOAuthConfig()).toThrow(
        'Missing required environment variable: ZAIM_CONSUMER_KEY'
      );
    });

    it('should throw error when ZAIM_CONSUMER_SECRET is missing', () => {
      process.env.ZAIM_CONSUMER_KEY = 'test_consumer_key';
      process.env.ZAIM_ACCESS_TOKEN = 'test_access_token';
      process.env.ZAIM_ACCESS_TOKEN_SECRET = 'test_access_token_secret';

      expect(() => TokenStorage.getOAuthConfig()).toThrow(
        'Missing required environment variable: ZAIM_CONSUMER_SECRET'
      );
    });

    it('should throw error when ZAIM_ACCESS_TOKEN is missing', () => {
      process.env.ZAIM_CONSUMER_KEY = 'test_consumer_key';
      process.env.ZAIM_CONSUMER_SECRET = 'test_consumer_secret';
      process.env.ZAIM_ACCESS_TOKEN_SECRET = 'test_access_token_secret';

      expect(() => TokenStorage.getOAuthConfig()).toThrow(
        'Missing required environment variable: ZAIM_ACCESS_TOKEN'
      );
    });

    it('should throw error when ZAIM_ACCESS_TOKEN_SECRET is missing', () => {
      process.env.ZAIM_CONSUMER_KEY = 'test_consumer_key';
      process.env.ZAIM_CONSUMER_SECRET = 'test_consumer_secret';
      process.env.ZAIM_ACCESS_TOKEN = 'test_access_token';

      expect(() => TokenStorage.getOAuthConfig()).toThrow(
        'Missing required environment variable: ZAIM_ACCESS_TOKEN_SECRET'
      );
    });

    it('should handle empty string environment variables', () => {
      process.env.ZAIM_CONSUMER_KEY = '';
      process.env.ZAIM_CONSUMER_SECRET = 'test_consumer_secret';
      process.env.ZAIM_ACCESS_TOKEN = 'test_access_token';
      process.env.ZAIM_ACCESS_TOKEN_SECRET = 'test_access_token_secret';

      expect(() => TokenStorage.getOAuthConfig()).toThrow(
        'Missing required environment variable: ZAIM_CONSUMER_KEY'
      );
    });

    it('should handle whitespace-only environment variables', () => {
      process.env.ZAIM_CONSUMER_KEY = 'test_consumer_key';
      process.env.ZAIM_CONSUMER_SECRET = '   ';
      process.env.ZAIM_ACCESS_TOKEN = 'test_access_token';
      process.env.ZAIM_ACCESS_TOKEN_SECRET = 'test_access_token_secret';

      expect(() => TokenStorage.getOAuthConfig()).toThrow(
        'Missing required environment variable: ZAIM_CONSUMER_SECRET'
      );
    });
  });

  describe('validateConfig', () => {
    it('should return true for valid config', () => {
      const validConfig: OAuthConfig = {
        consumerKey: 'test_consumer_key',
        consumerSecret: 'test_consumer_secret',
        accessToken: 'test_access_token',
        accessTokenSecret: 'test_access_token_secret'
      };

      expect(TokenStorage.validateConfig(validConfig)).toBe(true);
    });

    it('should return false for config with missing consumerKey', () => {
      const invalidConfig = {
        consumerKey: '',
        consumerSecret: 'test_consumer_secret',
        accessToken: 'test_access_token',
        accessTokenSecret: 'test_access_token_secret'
      };

      expect(TokenStorage.validateConfig(invalidConfig)).toBe(false);
    });

    it('should return false for config with missing consumerSecret', () => {
      const invalidConfig = {
        consumerKey: 'test_consumer_key',
        consumerSecret: '',
        accessToken: 'test_access_token',
        accessTokenSecret: 'test_access_token_secret'
      };

      expect(TokenStorage.validateConfig(invalidConfig)).toBe(false);
    });

    it('should return false for config with missing accessToken', () => {
      const invalidConfig = {
        consumerKey: 'test_consumer_key',
        consumerSecret: 'test_consumer_secret',
        accessToken: '',
        accessTokenSecret: 'test_access_token_secret'
      };

      expect(TokenStorage.validateConfig(invalidConfig)).toBe(false);
    });

    it('should return false for config with missing accessTokenSecret', () => {
      const invalidConfig = {
        consumerKey: 'test_consumer_key',
        consumerSecret: 'test_consumer_secret',
        accessToken: 'test_access_token',
        accessTokenSecret: ''
      };

      expect(TokenStorage.validateConfig(invalidConfig)).toBe(false);
    });
  });

  describe('getRequiredEnvVars', () => {
    it('should return list of required environment variables', () => {
      const requiredVars = TokenStorage.getRequiredEnvVars();

      expect(requiredVars).toEqual([
        'ZAIM_CONSUMER_KEY',
        'ZAIM_CONSUMER_SECRET',
        'ZAIM_ACCESS_TOKEN',
        'ZAIM_ACCESS_TOKEN_SECRET'
      ]);
    });
  });

  describe('checkEnvironment', () => {
    it('should return success status when all variables are set', () => {
      process.env.ZAIM_CONSUMER_KEY = 'test_consumer_key';
      process.env.ZAIM_CONSUMER_SECRET = 'test_consumer_secret';
      process.env.ZAIM_ACCESS_TOKEN = 'test_access_token';
      process.env.ZAIM_ACCESS_TOKEN_SECRET = 'test_access_token_secret';

      const result = TokenStorage.checkEnvironment();

      expect(result.isValid).toBe(true);
      expect(result.missingVars).toEqual([]);
      expect(result.message).toBe('All required environment variables are set');
    });

    it('should return failure status with missing variables', () => {
      process.env.ZAIM_CONSUMER_KEY = 'test_consumer_key';
      process.env.ZAIM_ACCESS_TOKEN = 'test_access_token';

      const result = TokenStorage.checkEnvironment();

      expect(result.isValid).toBe(false);
      expect(result.missingVars).toEqual([
        'ZAIM_CONSUMER_SECRET',
        'ZAIM_ACCESS_TOKEN_SECRET'
      ]);
      expect(result.message).toBe(
        'Missing required environment variables: ZAIM_CONSUMER_SECRET, ZAIM_ACCESS_TOKEN_SECRET'
      );
    });

    it('should handle all variables missing', () => {
      const result = TokenStorage.checkEnvironment();

      expect(result.isValid).toBe(false);
      expect(result.missingVars).toEqual([
        'ZAIM_CONSUMER_KEY',
        'ZAIM_CONSUMER_SECRET',
        'ZAIM_ACCESS_TOKEN',
        'ZAIM_ACCESS_TOKEN_SECRET'
      ]);
      expect(result.message).toBe(
        'Missing required environment variables: ZAIM_CONSUMER_KEY, ZAIM_CONSUMER_SECRET, ZAIM_ACCESS_TOKEN, ZAIM_ACCESS_TOKEN_SECRET'
      );
    });
  });

  describe('createZaimApiClient', () => {
    it('should create ZaimApiClient with environment variables', () => {
      process.env.ZAIM_CONSUMER_KEY = 'test_consumer_key';
      process.env.ZAIM_CONSUMER_SECRET = 'test_consumer_secret';
      process.env.ZAIM_ACCESS_TOKEN = 'test_access_token';
      process.env.ZAIM_ACCESS_TOKEN_SECRET = 'test_access_token_secret';

      const client = TokenStorage.createZaimApiClient();

      expect(client).toBeDefined();
      // ZaimApiClientのインスタンスかどうかを確認
      expect(client.constructor.name).toBe('ZaimApiClient');
    });

    it('should throw error when environment variables are missing', () => {
      expect(() => TokenStorage.createZaimApiClient()).toThrow(
        'Missing required environment variable: ZAIM_CONSUMER_KEY'
      );
    });
  });
});