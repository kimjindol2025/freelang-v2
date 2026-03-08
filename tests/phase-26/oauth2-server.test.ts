/**
 * Phase 26: The Gateway Part 1 (OAuth2) - Authorization Server Tests
 * RFC 6749 + RFC 7636 (PKCE) Compliance Tests
 */

import { AuthorizationServer } from '../../src/oauth2/authorization-server';
import { OAuth2Config, AuthorizationRequest, TokenRequest } from '../../src/oauth2/types';

describe('Phase 26: OAuth2 Authorization Server', () => {
  let server: AuthorizationServer;
  const defaultConfig: OAuth2Config = {
    issuer: 'https://freelang.dclub.kr',
    authorizationEndpoint: 'https://freelang.dclub.kr/oauth2/authorize',
    tokenEndpoint: 'https://freelang.dclub.kr/oauth2/token',
    revocationEndpoint: 'https://freelang.dclub.kr/oauth2/revoke',
    userinfoEndpoint: 'https://freelang.dclub.kr/oauth2/userinfo',
    pkceRequired: true,
    codeChallengeMethod: 'S256',
    authorizationCodeTTL: 10 * 60, // 10 minutes
    accessTokenTTL: 60 * 60, // 1 hour
    refreshTokenTTL: 30 * 24 * 60 * 60, // 30 days
    jwtSecret: 'test-secret-key-minimum-32-characters-needed',
    jwtAlgorithm: 'HS256',
  };

  beforeEach(() => {
    server = new AuthorizationServer(defaultConfig);
  });

  describe('Authorization Code Flow (RFC 6749 §4.1)', () => {
    test('authorize: should generate authorization code with valid request', () => {
      const request: AuthorizationRequest = {
        client_id: 'client-123',
        response_type: 'code',
        redirect_uri: 'https://client.example.com/callback',
        state: 'random-state-string',
        code_challenge: 'E9Mrozoa2owuQ2dYPCt6VvNfWaxPCqgjvJ9UH9Uc_mY', // S256
      };

      const response = server.authorize(request);

      expect(response).toBeDefined();
      expect(response).not.toHaveProperty('error');
      expect((response as any).code).toBeDefined();
      expect((response as any).code.length).toBeGreaterThan(8);
      expect((response as any).state).toBe('random-state-string');
    });

    test('authorize: should reject missing client_id', () => {
      const request: Partial<AuthorizationRequest> = {
        response_type: 'code',
        redirect_uri: 'https://client.example.com/callback',
        state: 'random-state-string',
        code_challenge: 'E9Mrozoa2owuQ2dYPCt6VvNfWaxPCqgjvJ9UH9Uc_mY',
      };

      const response = server.authorize(request as AuthorizationRequest);

      expect(response).toHaveProperty('error', 'invalid_request');
    });

    test('authorize: should reject missing redirect_uri', () => {
      const request: Partial<AuthorizationRequest> = {
        client_id: 'client-123',
        response_type: 'code',
        state: 'random-state-string',
        code_challenge: 'E9Mrozoa2owuQ2dYPCt6VvNfWaxPCqgjvJ9UH9Uc_mY',
      };

      const response = server.authorize(request as AuthorizationRequest);

      expect(response).toHaveProperty('error', 'invalid_request');
    });

    test('authorize: should reject invalid response_type', () => {
      const request: any = {
        client_id: 'client-123',
        response_type: 'token', // Invalid - must be 'code'
        redirect_uri: 'https://client.example.com/callback',
        state: 'random-state-string',
        code_challenge: 'E9Mrozoa2owuQ2dYPCt6VvNfWaxPCqgjvJ9UH9Uc_mY',
      };

      const response = server.authorize(request);

      expect(response).toHaveProperty('error', 'invalid_request');
      expect((response as any).state).toBe('random-state-string');
    });

    test('authorize: should reject invalid code_challenge length (PKCE)', () => {
      const request: AuthorizationRequest = {
        client_id: 'client-123',
        response_type: 'code',
        redirect_uri: 'https://client.example.com/callback',
        state: 'random-state-string',
        code_challenge: 'tooshort', // < 43 chars
      };

      const response = server.authorize(request);

      expect(response).toHaveProperty('error', 'invalid_code_challenge');
    });
  });

  describe('Token Endpoint - Authorization Code Grant (RFC 6749 §4.1.3)', () => {
    test('token: should exchange code for access token', () => {
      // Step 0: Generate PKCE
      const { codeVerifier, codeChallenge } = AuthorizationServer.generatePKCE();

      // Step 1: Get authorization code
      const authRequest: AuthorizationRequest = {
        client_id: 'client-123',
        response_type: 'code',
        redirect_uri: 'https://client.example.com/callback',
        state: 'random-state',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      };

      const authResponse = server.authorize(authRequest);
      expect(authResponse).not.toHaveProperty('error');
      const code = (authResponse as any).code;

      // Step 2: Exchange code for token
      const tokenRequest: TokenRequest = {
        grant_type: 'authorization_code',
        code: code,
        client_id: 'client-123',
        client_secret: 'secret-123',
        redirect_uri: 'https://client.example.com/callback',
        code_verifier: codeVerifier,
      };

      const tokenResponse = server.token(tokenRequest);

      expect(tokenResponse).not.toHaveProperty('error');
      expect(tokenResponse).toHaveProperty('access_token');
      expect(tokenResponse).toHaveProperty('token_type', 'Bearer');
      expect(tokenResponse).toHaveProperty('expires_in', defaultConfig.accessTokenTTL);
      expect(tokenResponse).toHaveProperty('refresh_token');
    });

    test('token: should reject invalid authorization code', () => {
      const tokenRequest: TokenRequest = {
        grant_type: 'authorization_code',
        code: 'invalid-code',
        client_id: 'client-123',
        client_secret: 'secret-123',
        redirect_uri: 'https://client.example.com/callback',
      };

      const response = server.token(tokenRequest);

      expect(response).toHaveProperty('error', 'invalid_grant');
    });

    test('token: should reject mismatched client_id', () => {
      // Get code first
      const authRequest: AuthorizationRequest = {
        client_id: 'client-123',
        response_type: 'code',
        redirect_uri: 'https://client.example.com/callback',
        state: 'random-state',
        code_challenge: 'E9Mrozoa2owuQ2dYPCt6VvNfWaxPCqgjvJ9UH9Uc_mY',
      };

      const authResponse = server.authorize(authRequest);
      const code = (authResponse as any).code;

      // Try to exchange with different client_id
      const tokenRequest: TokenRequest = {
        grant_type: 'authorization_code',
        code: code,
        client_id: 'wrong-client-id', // Mismatch
        client_secret: 'secret-123',
        redirect_uri: 'https://client.example.com/callback',
      };

      const response = server.token(tokenRequest);

      expect(response).toHaveProperty('error', 'invalid_client');
    });

    test('token: should reject invalid code_verifier (PKCE)', () => {
      const authRequest: AuthorizationRequest = {
        client_id: 'client-123',
        response_type: 'code',
        redirect_uri: 'https://client.example.com/callback',
        state: 'random-state',
        code_challenge: 'E9Mrozoa2owuQ2dYPCt6VvNfWaxPCqgjvJ9UH9Uc_mY',
        code_challenge_method: 'S256',
      };

      const authResponse = server.authorize(authRequest);
      const code = (authResponse as any).code;

      const tokenRequest: TokenRequest = {
        grant_type: 'authorization_code',
        code: code,
        client_id: 'client-123',
        client_secret: 'secret-123',
        redirect_uri: 'https://client.example.com/callback',
        code_verifier: 'wrong-verifier', // Doesn't match code_challenge
      };

      const response = server.token(tokenRequest);

      expect(response).toHaveProperty('error', 'invalid_code_verifier');
    });

    test('token: should prevent code reuse (one-time use)', () => {
      // Generate PKCE
      const { codeVerifier, codeChallenge } = AuthorizationServer.generatePKCE();

      // Get code
      const authRequest: AuthorizationRequest = {
        client_id: 'client-123',
        response_type: 'code',
        redirect_uri: 'https://client.example.com/callback',
        state: 'random-state',
        code_challenge: codeChallenge,
      };

      const authResponse = server.authorize(authRequest);
      const code = (authResponse as any).code;

      const tokenRequest: TokenRequest = {
        grant_type: 'authorization_code',
        code: code,
        client_id: 'client-123',
        client_secret: 'secret-123',
        redirect_uri: 'https://client.example.com/callback',
        code_verifier: codeVerifier,
      };

      // First exchange: success
      const firstResponse = server.token(tokenRequest);
      expect(firstResponse).not.toHaveProperty('error');

      // Second exchange with same code: should fail
      const secondResponse = server.token(tokenRequest);
      expect(secondResponse).toHaveProperty('error', 'invalid_grant');
    });
  });

  describe('Token Endpoint - Refresh Token Grant (RFC 6749 §6)', () => {
    test('token: should refresh access token with valid refresh_token', () => {
      // Generate PKCE
      const { codeVerifier, codeChallenge } = AuthorizationServer.generatePKCE();

      // Get authorization code
      const authRequest: AuthorizationRequest = {
        client_id: 'client-123',
        response_type: 'code',
        redirect_uri: 'https://client.example.com/callback',
        state: 'random-state',
        code_challenge: codeChallenge,
      };

      const authResponse = server.authorize(authRequest);
      const code = (authResponse as any).code;

      // Exchange for tokens
      const tokenRequest: TokenRequest = {
        grant_type: 'authorization_code',
        code: code,
        client_id: 'client-123',
        client_secret: 'secret-123',
        redirect_uri: 'https://client.example.com/callback',
        code_verifier: codeVerifier,
      };

      const tokenResponse = server.token(tokenRequest);
      const refreshToken = (tokenResponse as any).refresh_token;

      // Refresh access token
      const refreshRequest: TokenRequest = {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: 'client-123',
        client_secret: 'secret-123',
      };

      const refreshResponse = server.token(refreshRequest);

      expect(refreshResponse).not.toHaveProperty('error');
      expect(refreshResponse).toHaveProperty('access_token');
      expect(refreshResponse).toHaveProperty('token_type', 'Bearer');
      // Note: Tokens might have same value if issued in same millisecond
      // What matters is that both tokens are valid
      const refreshedClaims = server.verifyAccessToken((refreshResponse as any).access_token);
      expect(refreshedClaims).not.toBeNull();
      expect(refreshedClaims).toHaveProperty('client_id', 'client-123');
    });
  });

  describe('Token Revocation (RFC 7009)', () => {
    test('revoke: should revoke valid token', () => {
      // Generate PKCE
      const { codeVerifier, codeChallenge } = AuthorizationServer.generatePKCE();

      // Get token first
      const authRequest: AuthorizationRequest = {
        client_id: 'client-123',
        response_type: 'code',
        redirect_uri: 'https://client.example.com/callback',
        state: 'random-state',
        code_challenge: codeChallenge,
      };

      const authResponse = server.authorize(authRequest);
      const code = (authResponse as any).code;

      const tokenRequest: TokenRequest = {
        grant_type: 'authorization_code',
        code: code,
        client_id: 'client-123',
        client_secret: 'secret-123',
        redirect_uri: 'https://client.example.com/callback',
        code_verifier: codeVerifier,
      };

      const tokenResponse = server.token(tokenRequest);
      const accessToken = (tokenResponse as any).access_token;

      // Revoke token
      const revokeResponse = server.revoke({
        token: accessToken,
        client_id: 'client-123',
        client_secret: 'secret-123',
      });

      expect(revokeResponse).toHaveProperty('success', true);
    });
  });

  describe('Access Token Verification', () => {
    test('verifyAccessToken: should verify valid token', () => {
      // Generate PKCE
      const { codeVerifier, codeChallenge } = AuthorizationServer.generatePKCE();

      // Get valid token first
      const authRequest: AuthorizationRequest = {
        client_id: 'client-123',
        response_type: 'code',
        redirect_uri: 'https://client.example.com/callback',
        state: 'random-state',
        code_challenge: codeChallenge,
      };

      const authResponse = server.authorize(authRequest);
      const code = (authResponse as any).code;

      const tokenRequest: TokenRequest = {
        grant_type: 'authorization_code',
        code: code,
        client_id: 'client-123',
        client_secret: 'secret-123',
        redirect_uri: 'https://client.example.com/callback',
        code_verifier: codeVerifier,
      };

      const tokenResponse = server.token(tokenRequest);
      const accessToken = (tokenResponse as any).access_token;

      // Verify token
      const claims = server.verifyAccessToken(accessToken);

      expect(claims).not.toBeNull();
      expect(claims).toHaveProperty('sub');
      expect(claims).toHaveProperty('client_id', 'client-123');
      expect(claims).toHaveProperty('iss', defaultConfig.issuer);
    });

    test('verifyAccessToken: should reject invalid token', () => {
      const claims = server.verifyAccessToken('invalid-token');

      expect(claims).toBeNull();
    });
  });

  describe('Metrics', () => {
    test('getMetrics: should return server metrics', () => {
      // Create some state
      const authRequest: AuthorizationRequest = {
        client_id: 'client-123',
        response_type: 'code',
        redirect_uri: 'https://client.example.com/callback',
        state: 'random-state',
        code_challenge: 'E9Mrozoa2owuQ2dYPCt6VvNfWaxPCqgjvJ9UH9Uc_mY',
      };

      server.authorize(authRequest);

      const metrics = server.getMetrics();

      expect(metrics).toHaveProperty('pendingAuthorizationCodes', 1);
      expect(metrics).toHaveProperty('activeRefreshTokens', 0);
      expect(metrics).toHaveProperty('revokedTokens', 0);
    });
  });
});
