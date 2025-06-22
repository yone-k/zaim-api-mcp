import { describe, it, expect } from 'vitest';
import { 
  generateOAuthSignature, 
  normalizeParameters, 
  constructBaseString, 
  constructSigningKey 
} from '../src/utils/oauth-signature.js';

describe('OAuth 1.0a Signature Generation', () => {
  describe('normalizeParameters', () => {
    it('should normalize parameters according to OAuth 1.0a spec', () => {
      const params = {
        'oauth_consumer_key': 'test_consumer_key',
        'oauth_nonce': 'test_nonce',
        'oauth_signature_method': 'HMAC-SHA1',
        'oauth_timestamp': '1234567890',
        'oauth_version': '1.0',
        'test_param': 'test_value'
      };
      
      const normalized = normalizeParameters(params);
      
      // Parameters should be percent-encoded and sorted
      expect(normalized).toBe(
        'oauth_consumer_key=test_consumer_key&' +
        'oauth_nonce=test_nonce&' +
        'oauth_signature_method=HMAC-SHA1&' +
        'oauth_timestamp=1234567890&' +
        'oauth_version=1.0&' +
        'test_param=test_value'
      );
    });

    it('should handle special characters in parameters', () => {
      const params = {
        'test_param': 'test value with spaces',
        'special_chars': 'test&param=value'
      };
      
      const normalized = normalizeParameters(params);
      
      expect(normalized).toBe(
        'special_chars=test%26param%3Dvalue&' +
        'test_param=test%20value%20with%20spaces'
      );
    });
  });

  describe('constructBaseString', () => {
    it('should construct base string according to OAuth 1.0a spec', () => {
      const method = 'POST';
      const url = 'https://api.zaim.net/v2/home/money/payment';
      const normalizedParams = 'oauth_consumer_key=test_key&oauth_nonce=test_nonce&oauth_signature_method=HMAC-SHA1';
      
      const baseString = constructBaseString(method, url, normalizedParams);
      
      expect(baseString).toBe(
        'POST&https%3A%2F%2Fapi.zaim.net%2Fv2%2Fhome%2Fmoney%2Fpayment&oauth_consumer_key%3Dtest_key%26oauth_nonce%3Dtest_nonce%26oauth_signature_method%3DHMAC-SHA1'
      );
    });

    it('should handle GET method', () => {
      const method = 'GET';
      const url = 'https://api.zaim.net/v2/home/user/verify';
      const normalizedParams = 'oauth_consumer_key=test_key';
      
      const baseString = constructBaseString(method, url, normalizedParams);
      
      expect(baseString).toBe(
        'GET&https%3A%2F%2Fapi.zaim.net%2Fv2%2Fhome%2Fuser%2Fverify&oauth_consumer_key%3Dtest_key'
      );
    });
  });

  describe('constructSigningKey', () => {
    it('should construct signing key with consumer secret only', () => {
      const consumerSecret = 'test_consumer_secret';
      
      const signingKey = constructSigningKey(consumerSecret);
      
      expect(signingKey).toBe('test_consumer_secret&');
    });

    it('should construct signing key with both consumer secret and token secret', () => {
      const consumerSecret = 'test_consumer_secret';
      const tokenSecret = 'test_token_secret';
      
      const signingKey = constructSigningKey(consumerSecret, tokenSecret);
      
      expect(signingKey).toBe('test_consumer_secret&test_token_secret');
    });

    it('should handle special characters in secrets', () => {
      const consumerSecret = 'consumer&secret';
      const tokenSecret = 'token=secret';
      
      const signingKey = constructSigningKey(consumerSecret, tokenSecret);
      
      expect(signingKey).toBe('consumer%26secret&token%3Dsecret');
    });
  });

  describe('generateOAuthSignature', () => {
    it('should generate valid HMAC-SHA1 signature', () => {
      const method = 'POST';
      const url = 'https://api.zaim.net/v2/home/money/payment';
      const parameters = {
        'oauth_consumer_key': 'test_consumer_key',
        'oauth_nonce': 'test_nonce',
        'oauth_signature_method': 'HMAC-SHA1',
        'oauth_timestamp': '1234567890',
        'oauth_version': '1.0',
        'amount': '1000',
        'date': '2024-01-15'
      };
      const consumerSecret = 'test_consumer_secret';
      const tokenSecret = 'test_token_secret';
      
      const signature = generateOAuthSignature(
        method, 
        url, 
        parameters, 
        consumerSecret, 
        tokenSecret
      );
      
      // Should return a base64-encoded string
      expect(signature).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(signature.length).toBeGreaterThan(20);
    });

    it('should generate consistent signatures for same inputs', () => {
      const method = 'GET';
      const url = 'https://api.zaim.net/v2/home/user/verify';
      const parameters = {
        'oauth_consumer_key': 'test_consumer_key',
        'oauth_nonce': 'test_nonce',
        'oauth_signature_method': 'HMAC-SHA1',
        'oauth_timestamp': '1234567890',
        'oauth_version': '1.0'
      };
      const consumerSecret = 'test_consumer_secret';
      const tokenSecret = 'test_token_secret';
      
      const signature1 = generateOAuthSignature(
        method, 
        url, 
        parameters, 
        consumerSecret, 
        tokenSecret
      );
      
      const signature2 = generateOAuthSignature(
        method, 
        url, 
        parameters, 
        consumerSecret, 
        tokenSecret
      );
      
      expect(signature1).toBe(signature2);
    });

    it('should generate different signatures for different inputs', () => {
      const baseParams = {
        'oauth_consumer_key': 'test_consumer_key',
        'oauth_nonce': 'test_nonce',
        'oauth_signature_method': 'HMAC-SHA1',
        'oauth_timestamp': '1234567890',
        'oauth_version': '1.0'
      };
      
      const signature1 = generateOAuthSignature(
        'GET', 
        'https://api.zaim.net/v2/home/user/verify', 
        baseParams, 
        'test_consumer_secret', 
        'test_token_secret'
      );
      
      const signature2 = generateOAuthSignature(
        'POST', 
        'https://api.zaim.net/v2/home/money/payment', 
        baseParams, 
        'test_consumer_secret', 
        'test_token_secret'
      );
      
      expect(signature1).not.toBe(signature2);
    });
  });
});