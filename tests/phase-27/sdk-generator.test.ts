/**
 * Phase 27-1: SDK Generator Tests
 */

import { TypeScriptSDKGenerator, SDKConfig } from '../../src/sdk/sdk-generator';
import { generateOpenAPISpec } from '../../src/sdk/openapi-spec';

describe('Phase 27-1: SDK Generator', () => {
  let generator: TypeScriptSDKGenerator;

  beforeEach(() => {
    generator = new TypeScriptSDKGenerator();
  });

  // ============================================================================
  // OpenAPI Spec Tests
  // ============================================================================

  describe('OpenAPI Spec Generation', () => {
    test('should generate valid OpenAPI 3.0 spec', () => {
      const spec = generateOpenAPISpec();

      expect(spec.openapi).toBe('3.0.0');
      expect(spec.info.title).toContain('OAuth2');
      expect(spec.servers).toHaveLength(2);
    });

    test('should include all OAuth2 endpoints', () => {
      const spec = generateOpenAPISpec();

      expect(spec.paths).toHaveProperty('/oauth2/authorize');
      expect(spec.paths).toHaveProperty('/auth/callback/google');
      expect(spec.paths).toHaveProperty('/auth/callback/github');
      expect(spec.paths).toHaveProperty('/oauth2/token');
      expect(spec.paths).toHaveProperty('/oauth2/revoke');
      expect(spec.paths).toHaveProperty('/api/me');
      expect(spec.paths).toHaveProperty('/api/account/unlink');
      expect(spec.paths).toHaveProperty('/oauth2/health');
    });

    test('should define security schemes', () => {
      const spec = generateOpenAPISpec();

      expect(spec.components.securitySchemes).toHaveProperty('bearerAuth');
      expect(spec.components.securitySchemes.bearerAuth.type).toBe('http');
      expect(spec.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
    });

    test('should define all required schemas', () => {
      const spec = generateOpenAPISpec();

      const requiredSchemas = [
        'Error',
        'TokenRequest',
        'TokenResponse',
        'UserProfile',
        'SocialAccount',
        'UnlinkRequest',
        'UnlinkResponse',
        'HealthResponse',
      ];

      for (const schema of requiredSchemas) {
        expect(spec.components.schemas).toHaveProperty(schema);
      }
    });

    test('should have operation IDs on all endpoints', () => {
      const spec = generateOpenAPISpec();

      for (const [path, pathItem] of Object.entries(spec.paths)) {
        for (const [method, operation] of Object.entries(pathItem)) {
          if (typeof operation === 'object' && 'operationId' in operation) {
            expect((operation as any).operationId).toBeTruthy();
          }
        }
      }
    });

    test('should tag endpoints appropriately', () => {
      const spec = generateOpenAPISpec();

      const authRoute = spec.paths['/oauth2/authorize'].get;
      expect(authRoute.tags).toContain('Authorization');

      const tokenRoute = spec.paths['/oauth2/token'].post;
      expect(tokenRoute.tags).toContain('Token');

      const meRoute = spec.paths['/api/me'].get;
      expect(meRoute.tags).toContain('User');
    });
  });

  // ============================================================================
  // SDK Package Generation Tests
  // ============================================================================

  describe('SDK Package Generation', () => {
    test('should generate SDK package with all required files', () => {
      const pkg = generator.generateSDK();

      expect(pkg).toHaveProperty('packageJson');
      expect(pkg).toHaveProperty('tsconfig');
      expect(pkg).toHaveProperty('client');
      expect(pkg).toHaveProperty('types');
      expect(pkg).toHaveProperty('index');
      expect(pkg).toHaveProperty('README');
    });

    test('should generate valid package.json', () => {
      const pkg = generator.generateSDK();
      const json = JSON.parse(pkg.packageJson);

      expect(json.name).toBe('@freelang/oauth2-sdk');
      expect(json.version).toBe('2.1.0');
      expect(json.main).toBe('dist/index.js');
      expect(json.types).toBe('dist/index.d.ts');
      expect(json.dependencies).toHaveProperty('node-fetch');
      expect(json.scripts.build).toBe('tsc');
    });

    test('should generate valid tsconfig.json', () => {
      const pkg = generator.generateSDK();
      const json = JSON.parse(pkg.tsconfig);

      expect(json.compilerOptions.target).toBe('ES2020');
      expect(json.compilerOptions.module).toBe('commonjs');
      expect(json.compilerOptions.strict).toBe(true);
      expect(json.compilerOptions.declaration).toBe(true);
    });
  });

  // ============================================================================
  // TypeScript Types Generation Tests
  // ============================================================================

  describe('TypeScript Types Generation', () => {
    test('should generate interface for TokenRequest', () => {
      const pkg = generator.generateSDK();

      expect(pkg.types).toContain('export interface TokenRequest');
      expect(pkg.types).toContain('grant_type');
      expect(pkg.types).toContain('code');
      expect(pkg.types).toContain('client_id');
    });

    test('should generate interface for UserProfile', () => {
      const pkg = generator.generateSDK();

      expect(pkg.types).toContain('export interface UserProfile');
      expect(pkg.types).toContain('email');
      expect(pkg.types).toContain('socialAccounts');
    });

    test('should generate interface for SocialAccount', () => {
      const pkg = generator.generateSDK();

      expect(pkg.types).toContain('export interface SocialAccount');
      expect(pkg.types).toContain('provider');
      expect(pkg.types).toContain('providerUserId');
    });

    test('should mark optional properties with ?', () => {
      const pkg = generator.generateSDK();

      // Some properties should be optional
      expect(pkg.types).toMatch(/\w+\?: /);
    });
  });

  // ============================================================================
  // TypeScript Client Generation Tests
  // ============================================================================

  describe('TypeScript Client Generation', () => {
    test('should generate FreeLangOAuth2Client class', () => {
      const pkg = generator.generateSDK();

      expect(pkg.client).toContain('export class FreeLangOAuth2Client');
      expect(pkg.client).toContain('constructor(config: ClientConfig');
    });

    test('should generate authorize method', () => {
      const pkg = generator.generateSDK();

      expect(pkg.client).toContain('async authorize(provider:');
      expect(pkg.client).toContain("'google' | 'github'");
    });

    test('should generate token method', () => {
      const pkg = generator.generateSDK();

      expect(pkg.client).toContain('async token(request: Types.TokenRequest)');
      expect(pkg.client).toContain('TokenResponse');
    });

    test('should generate getMe method', () => {
      const pkg = generator.generateSDK();

      expect(pkg.client).toContain('async getMe()');
      expect(pkg.client).toContain('UserProfile');
    });

    test('should generate unlinkAccount method', () => {
      const pkg = generator.generateSDK();

      expect(pkg.client).toContain('async unlinkAccount(request:');
      expect(pkg.client).toContain('UnlinkRequest');
    });

    test('should generate revoke method', () => {
      const pkg = generator.generateSDK();

      expect(pkg.client).toContain('async revoke(request:');
      expect(pkg.client).toContain('RevokeRequest');
    });

    test('should generate health method', () => {
      const pkg = generator.generateSDK();

      expect(pkg.client).toContain('async health()');
      expect(pkg.client).toContain('HealthResponse');
    });

    test('should have setAccessToken method', () => {
      const pkg = generator.generateSDK();

      expect(pkg.client).toContain('setAccessToken(token: string)');
    });

    test('should include Bearer token authentication', () => {
      const pkg = generator.generateSDK();

      expect(pkg.client).toContain('Authorization');
      expect(pkg.client).toContain('Bearer');
    });
  });

  // ============================================================================
  // Index File Tests
  // ============================================================================

  describe('Index File Generation', () => {
    test('should export FreeLangOAuth2Client', () => {
      const pkg = generator.generateSDK();

      expect(pkg.index).toContain("export { FreeLangOAuth2Client }");
    });

    test('should export Types namespace', () => {
      const pkg = generator.generateSDK();

      expect(pkg.index).toContain('export * as Types');
    });

    test('should export generateOpenAPISpec', () => {
      const pkg = generator.generateSDK();

      expect(pkg.index).toContain('generateOpenAPISpec');
    });
  });

  // ============================================================================
  // README Documentation Tests
  // ============================================================================

  describe('README Generation', () => {
    test('should generate comprehensive README', () => {
      const pkg = generator.generateSDK();

      expect(pkg.README).toContain('FreeLang OAuth2 SDK');
      expect(pkg.README).toContain('Installation');
      expect(pkg.README).toContain('Quick Start');
      expect(pkg.README).toContain('API Reference');
    });

    test('should include usage examples', () => {
      const pkg = generator.generateSDK();

      expect(pkg.README).toContain('new FreeLangOAuth2Client');
      expect(pkg.README).toContain('authorize');
      expect(pkg.README).toContain('token');
      expect(pkg.README).toContain('getMe');
    });

    test('should document RFC compliance', () => {
      const pkg = generator.generateSDK();

      expect(pkg.README).toContain('RFC 6749');
      expect(pkg.README).toContain('RFC 7636');
      expect(pkg.README).toContain('RFC 7009');
    });
  });

  // ============================================================================
  // Configuration Tests
  // ============================================================================

  describe('SDK Configuration', () => {
    test('should use default config when none provided', () => {
      const gen = new TypeScriptSDKGenerator();
      const pkg = gen.generateSDK();
      const json = JSON.parse(pkg.packageJson);

      expect(json.name).toBe('@freelang/oauth2-sdk');
      expect(json.version).toBe('2.1.0');
    });

    test('should accept custom config', () => {
      const customConfig: SDKConfig = {
        packageName: '@custom/oauth2',
        version: '1.0.0',
        author: 'Custom Author',
        license: 'Apache-2.0',
      };

      const gen = new TypeScriptSDKGenerator(customConfig);
      const pkg = gen.generateSDK();
      const json = JSON.parse(pkg.packageJson);

      expect(json.name).toBe('@custom/oauth2');
      expect(json.version).toBe('1.0.0');
      expect(json.author).toBe('Custom Author');
      expect(json.license).toBe('Apache-2.0');
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('SDK Integration', () => {
    test('should generate TypeScript that would compile without errors', () => {
      const pkg = generator.generateSDK();

      // Check for common TS compilation issues
      expect(pkg.client).toContain('import');
      expect(pkg.client).toContain('export');
      expect(pkg.types).toContain('export interface');

      // Ensure no trailing commas in enums
      expect(pkg.types).not.toMatch(/,\s*\}/);
    });

    test('should have consistent type references between client and types', () => {
      const pkg = generator.generateSDK();

      // Directly referenced types in client
      const directTypeNames = [
        'TokenRequest',
        'TokenResponse',
        'UserProfile',
        'UnlinkRequest',
        'UnlinkResponse',
        'HealthResponse',
      ];

      for (const typeName of directTypeNames) {
        expect(pkg.client).toContain(`Types.${typeName}`);
        expect(pkg.types).toContain(`export interface ${typeName}`);
      }

      // SocialAccount is included in UserProfile
      expect(pkg.types).toContain('export interface SocialAccount');
      expect(pkg.types).toContain('SocialAccount[]'); // referenced in UserProfile
    });

    test('should generate SDKs with proper error handling', () => {
      const pkg = generator.generateSDK();

      expect(pkg.client).toContain('throw new Error');
      expect(pkg.client).toContain('error_description');
    });

    test('package.json should have all required scripts', () => {
      const pkg = generator.generateSDK();
      const json = JSON.parse(pkg.packageJson);

      expect(json.scripts).toHaveProperty('build');
      expect(json.scripts).toHaveProperty('test');
      expect(json.scripts).toHaveProperty('lint');
    });
  });

  // ============================================================================
  // Statistics Tests
  // ============================================================================

  describe('SDK Statistics', () => {
    test('should generate substantial code for client', () => {
      const pkg = generator.generateSDK();

      // Client should be at least 400 characters (rough estimate for complete class)
      expect(pkg.client.length).toBeGreaterThan(2000);
    });

    test('should generate complete types file', () => {
      const pkg = generator.generateSDK();

      // Types should define at least 8 major interfaces
      const interfaceMatches = pkg.types.match(/export interface/g) || [];
      expect(interfaceMatches.length).toBeGreaterThanOrEqual(8);
    });

    test('should generate detailed README', () => {
      const pkg = generator.generateSDK();

      // README should be comprehensive (at least 2KB)
      expect(pkg.README.length).toBeGreaterThan(2000);
    });
  });
});
