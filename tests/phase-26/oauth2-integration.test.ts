/**
 * Phase 26-2: OAuth2 Integration Tests
 * End-to-end OAuth2 flow with Express routes
 */

import { AuthorizationServer } from '../../src/oauth2/authorization-server';
import { GoogleOAuth2Provider } from '../../src/oauth2/providers/google-provider';
import { GitHubOAuth2Provider } from '../../src/oauth2/providers/github-provider';
import { AccountLinker } from '../../src/oauth2/account-linker';
import { OAuth2Config } from '../../src/oauth2/types';

describe('Phase 26-2: OAuth2 Integration Tests', () => {
  let authServer: AuthorizationServer;
  let accountLinker: AccountLinker;

  const defaultConfig: OAuth2Config = {
    issuer: 'https://freelang.dclub.kr',
    authorizationEndpoint: 'https://freelang.dclub.kr/oauth2/authorize',
    tokenEndpoint: 'https://freelang.dclub.kr/oauth2/token',
    revocationEndpoint: 'https://freelang.dclub.kr/oauth2/revoke',
    userinfoEndpoint: 'https://freelang.dclub.kr/oauth2/userinfo',
    pkceRequired: true,
    codeChallengeMethod: 'S256',
    authorizationCodeTTL: 10 * 60,
    accessTokenTTL: 60 * 60,
    refreshTokenTTL: 30 * 24 * 60 * 60,
    jwtSecret: 'test-secret-key-minimum-32-characters-needed',
    jwtAlgorithm: 'HS256',
  };

  beforeEach(() => {
    authServer = new AuthorizationServer(defaultConfig);
    accountLinker = new AccountLinker();
  });

  // ============================================================================
  // End-to-End OAuth2 Flows
  // ============================================================================

  describe('Complete Google OAuth2 Flow', () => {
    test('should complete full Google login and account creation', () => {
      // Step 1: User initiates login
      const { codeVerifier, codeChallenge } = AuthorizationServer.generatePKCE();
      const state = 'random-state-string';

      // Step 2: Authorization server generates code
      const authResponse = authServer.authorize({
        client_id: 'freelang-web',
        response_type: 'code',
        redirect_uri: 'http://localhost:3000/auth/callback/google',
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });

      expect(authResponse).not.toHaveProperty('error');
      const code = (authResponse as any).code;

      // Step 3: Backend exchanges code for tokens
      const tokenResponse = authServer.token({
        grant_type: 'authorization_code',
        code,
        client_id: 'freelang-web',
        client_secret: 'secret',
        redirect_uri: 'http://localhost:3000/auth/callback/google',
        code_verifier: codeVerifier,
      });

      expect(tokenResponse).not.toHaveProperty('error');
      expect(tokenResponse).toHaveProperty('access_token');

      // Step 4: User info linking
      const userInfo = {
        sub: 'google-user-123',
        email: 'user@gmail.com',
        name: 'Google User',
        picture: 'https://...',
        email_verified: true,
        provider: 'google' as const,
        providerUserId: 'google-user-123',
      };

      const linkingResult = accountLinker.linkAccount(userInfo);

      expect(linkingResult.isNewUser).toBe(true);
      expect(linkingResult.user.email).toBe('user@gmail.com');
      expect(linkingResult.user.socialAccounts).toHaveLength(1);
      expect(linkingResult.linkedAccount.provider).toBe('google');

      // Step 5: Verify token and user claims
      const accessToken = (tokenResponse as any).access_token;
      const claims = authServer.verifyAccessToken(accessToken);

      expect(claims).not.toBeNull();
      expect(claims).toHaveProperty('sub');
      expect(claims).toHaveProperty('client_id', 'freelang-web');
    });

    test('should recognize existing Google account on second login', () => {
      const userInfo = {
        sub: 'google-user-123',
        email: 'user@gmail.com',
        name: 'Google User',
        email_verified: true,
        provider: 'google' as const,
        providerUserId: 'google-user-123',
      };

      // First login
      const firstResult = accountLinker.linkAccount(userInfo);
      const firstUserId = firstResult.user.id;
      const firstLoginTime = firstResult.user.lastLoginAt;

      // Second login with same Google account
      const secondResult = accountLinker.linkAccount(userInfo);

      expect(secondResult.isNewUser).toBe(false);
      expect(secondResult.user.id).toBe(firstUserId);
      // Note: If happen in same millisecond, timestamps could be identical
      // What matters is that same user was recognized
      expect(secondResult.user.socialAccounts).toHaveLength(1);
    });
  });

  describe('Complete GitHub OAuth2 Flow', () => {
    test('should complete full GitHub login and account creation', () => {
      // Generate PKCE
      const { codeVerifier, codeChallenge } = AuthorizationServer.generatePKCE();
      const state = 'github-state-string';

      // Authorization code generation
      const authResponse = authServer.authorize({
        client_id: 'freelang-web',
        response_type: 'code',
        redirect_uri: 'http://localhost:3000/auth/callback/github',
        state,
        code_challenge: codeChallenge,
      });

      const code = (authResponse as any).code;

      // Token exchange
      const tokenResponse = authServer.token({
        grant_type: 'authorization_code',
        code,
        client_id: 'freelang-web',
        client_secret: 'secret',
        redirect_uri: 'http://localhost:3000/auth/callback/github',
        code_verifier: codeVerifier,
      });

      expect(tokenResponse).not.toHaveProperty('error');

      // Account linking
      const userInfo = {
        sub: 'github-user-456',
        email: 'user@github.com',
        name: 'GitHub User',
        picture: 'https://avatars.githubusercontent.com/...',
        email_verified: true,
        provider: 'github' as const,
        providerUserId: 'githubuser',
      };

      const linkingResult = accountLinker.linkAccount(userInfo);

      expect(linkingResult.isNewUser).toBe(true);
      expect(linkingResult.user.email).toBe('user@github.com');
      expect(linkingResult.linkedAccount.provider).toBe('github');
    });
  });

  // ============================================================================
  // Multi-Account Linking
  // ============================================================================

  describe('Multi-Account Linking', () => {
    test('should link Google and GitHub to same user', () => {
      // First: Google login
      const googleInfo = {
        sub: 'google-user-123',
        email: 'user@example.com',
        name: 'User',
        email_verified: true,
        provider: 'google' as const,
        providerUserId: 'google-user-123',
      };

      const googleResult = accountLinker.linkAccount(googleInfo);
      const userId = googleResult.user.id;

      // Second: GitHub login with same email
      const githubInfo = {
        sub: 'github-user-456',
        email: 'user@example.com', // Same email
        name: 'User',
        email_verified: true,
        provider: 'github' as const,
        providerUserId: 'githubuser',
      };

      const githubResult = accountLinker.linkAccount(githubInfo);

      expect(githubResult.user.id).toBe(userId); // Same user
      expect(githubResult.user.socialAccounts).toHaveLength(2); // Two accounts linked
      expect(githubResult.isNewUser).toBe(false);
    });
  });

  // ============================================================================
  // Account Unlink & Recovery
  // ============================================================================

  describe('Account Management', () => {
    test('should unlink social account', () => {
      // Create user with Google
      const userInfo = {
        sub: 'google-user-123',
        email: 'user@gmail.com',
        name: 'User',
        email_verified: true,
        provider: 'google' as const,
        providerUserId: 'google-user-123',
      };

      const result = accountLinker.linkAccount(userInfo);
      const userId = result.user.id;

      // Unlink Google
      const unlinkResult = accountLinker.unlinkAccount(userId, 'google');

      expect(unlinkResult).not.toBeNull();
      expect(unlinkResult?.socialAccounts).toHaveLength(0);
    });

    test('should recover account via social login', () => {
      // Create user with Google
      const googleInfo = {
        sub: 'google-user-123',
        email: 'user@example.com',
        name: 'User',
        email_verified: true,
        provider: 'google' as const,
        providerUserId: 'google-user-123',
      };

      const createResult = accountLinker.linkAccount(googleInfo);
      const userId = createResult.user.id;

      // Link GitHub with same email
      const githubInfo = {
        sub: 'github-user-456',
        email: 'user@example.com', // Same email - links to same account
        name: 'User GitHub',
        email_verified: true,
        provider: 'github' as const,
        providerUserId: 'githubuser',
      };

      const linkResult = accountLinker.linkAccount(githubInfo);
      expect(linkResult.user.id).toBe(userId); // Same user

      // Unlink Google
      accountLinker.unlinkAccount(userId, 'google');

      // Recover via GitHub
      const recoveryInfo = {
        sub: 'github-user-456',
        email: 'recovered@github.com',
        name: 'Recovered User',
        email_verified: true,
        provider: 'github' as const,
        providerUserId: 'githubuser',
      };

      const recovered = accountLinker.recoverAccount(recoveryInfo);

      expect(recovered).not.toBeNull();
      expect(recovered?.id).toBe(userId);
      expect(recovered?.email).toBe('recovered@github.com');
    });
  });

  // ============================================================================
  // Session & Token Management
  // ============================================================================

  describe('Session & Token Lifecycle', () => {
    test('should handle refresh token flow', () => {
      const { codeVerifier, codeChallenge } = AuthorizationServer.generatePKCE();

      // Get authorization code
      const authResponse = authServer.authorize({
        client_id: 'freelang-web',
        response_type: 'code',
        redirect_uri: 'http://localhost:3000/auth/callback/google',
        state: 'state',
        code_challenge: codeChallenge,
      });

      const code = (authResponse as any).code;

      // Exchange for tokens
      const tokenResponse = authServer.token({
        grant_type: 'authorization_code',
        code,
        client_id: 'freelang-web',
        client_secret: 'secret',
        redirect_uri: 'http://localhost:3000/auth/callback/google',
        code_verifier: codeVerifier,
      });

      const refreshToken = (tokenResponse as any).refresh_token;
      const originalAccessToken = (tokenResponse as any).access_token;

      // Refresh token to get new access token
      const refreshResponse = authServer.token({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: 'freelang-web',
        client_secret: 'secret',
      });

      expect(refreshResponse).not.toHaveProperty('error');
      expect((refreshResponse as any).access_token).toBeDefined();

      // Both tokens should be valid
      const originalClaims = authServer.verifyAccessToken(originalAccessToken);
      const refreshedClaims = authServer.verifyAccessToken((refreshResponse as any).access_token);

      expect(originalClaims).not.toBeNull();
      expect(refreshedClaims).not.toBeNull();
    });

    test('should revoke tokens', () => {
      const { codeVerifier, codeChallenge } = AuthorizationServer.generatePKCE();

      // Get token
      const authResponse = authServer.authorize({
        client_id: 'freelang-web',
        response_type: 'code',
        redirect_uri: 'http://localhost:3000/auth/callback/google',
        state: 'state',
        code_challenge: codeChallenge,
      });

      const tokenResponse = authServer.token({
        grant_type: 'authorization_code',
        code: (authResponse as any).code,
        client_id: 'freelang-web',
        client_secret: 'secret',
        redirect_uri: 'http://localhost:3000/auth/callback/google',
        code_verifier: codeVerifier,
      });

      const token = (tokenResponse as any).access_token;

      // Verify token works
      const claimsBefore = authServer.verifyAccessToken(token);
      expect(claimsBefore).not.toBeNull();

      // Revoke token
      const revokeResponse = authServer.revoke({
        token,
        client_id: 'freelang-web',
        client_secret: 'secret',
      });

      expect(revokeResponse).toHaveProperty('success', true);

      // Token should no longer be valid
      const claimsAfter = authServer.verifyAccessToken(token);
      expect(claimsAfter).toBeNull();
    });
  });

  // ============================================================================
  // Error Scenarios
  // ============================================================================

  describe('Error Handling', () => {
    test('should handle missing email gracefully', () => {
      const invalidUserInfo = {
        sub: 'user-123',
        // email: undefined,
        email_verified: true,
        provider: 'google' as const,
        providerUserId: 'user-123',
      };

      // Should handle gracefully (fallback email)
      const result = accountLinker.linkAccount(invalidUserInfo as any);
      expect(result.user).toBeDefined();
      expect(result.user.email).toContain('google');
    });

    test('should handle invalid provider in authorization', () => {
      const response = authServer.authorize({
        client_id: 'freelang-web',
        response_type: 'invalid_type' as any,
        redirect_uri: 'http://localhost:3000/callback',
        state: 'state',
      });

      expect(response).toHaveProperty('error');
    });
  });

  // ============================================================================
  // Statistics
  // ============================================================================

  describe('Account Statistics', () => {
    test('should track account linking statistics', () => {
      // Create multiple users with different providers
      accountLinker.linkAccount({
        sub: 'user1',
        email: 'user1@gmail.com',
        email_verified: true,
        provider: 'google' as const,
        providerUserId: 'user1-google',
      });

      accountLinker.linkAccount({
        sub: 'user2',
        email: 'user2@github.com',
        email_verified: true,
        provider: 'github' as const,
        providerUserId: 'user2-github',
      });

      const stats = accountLinker.getStats();

      expect(stats.totalUsers).toBe(2);
      expect(stats.googleLinked).toBe(1);
      expect(stats.githubLinked).toBe(1);
    });
  });
});
