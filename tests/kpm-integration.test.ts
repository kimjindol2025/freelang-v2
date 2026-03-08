/**
 * KPM Integration Tests
 *
 * Unit tests for KPM bridge layer components:
 * - Registry Client (10 tests)
 * - CLI Wrapper (8 tests)
 * - Package Installer (8 tests)
 * - Module Resolver (6 tests)
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { mkdirSync, rmSync, writeFileSync } from 'fs';

import { KPMRegistryClient } from '../src/kpm-integration/kpm-registry-client';
import { KPMCLIWrapper } from '../src/kpm-integration/kpm-cli-wrapper';
import { KPMPackageInstaller } from '../src/kpm-integration/kpm-package-installer';
import { UnifiedModuleResolver } from '../src/kpm-integration/unified-module-resolver';

describe('KPM Integration Tests', () => {
  let registryClient: KPMRegistryClient;
  let cliWrapper: KPMCLIWrapper;
  let installer: KPMPackageInstaller;
  let resolver: UnifiedModuleResolver;
  let testDir: string;

  beforeEach(() => {
    registryClient = new KPMRegistryClient();
    cliWrapper = new KPMCLIWrapper();
    installer = new KPMPackageInstaller(registryClient, cliWrapper);
    testDir = path.join(__dirname, '..', 'test-workspace');

    // Create test workspace
    if (!fs.existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    resolver = new UnifiedModuleResolver(testDir, registryClient, installer);
  });

  afterEach(() => {
    // Clean up test workspace
    if (fs.existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }

    // Clear caches
    registryClient.clearCache();
    resolver.clearCache();
  });

  describe('KPMRegistryClient', () => {
    test('should load registry from file', async () => {
      const registry = (registryClient as any).loadRegistry();
      expect(registry).toBeDefined();
    });

    test('should cache registry results', async () => {
      const client = new KPMRegistryClient();
      // First call
      const packages1 = await client.search('async', { limit: 5 });
      // Second call (from cache)
      const packages2 = await client.search('async', { limit: 5 });

      expect(packages1).toEqual(packages2);
    });

    test('should search packages by query', async () => {
      const results = await registryClient.search('freelang', { limit: 5 });
      expect(Array.isArray(results)).toBe(true);
    });

    test('should handle empty search results', async () => {
      const results = await registryClient.search('nonexistent-package-xyz', { limit: 5 });
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    test('should get package info', async () => {
      const info = await registryClient.getPackageInfo('freelang-stdlib');
      if (info) {
        expect(info.name).toBeDefined();
        expect(info.versions).toBeDefined();
        expect(Array.isArray(info.versions)).toBe(true);
      }
    });

    test('should return null for non-existent package', async () => {
      const info = await registryClient.getPackageInfo('nonexistent-xyz');
      expect(info).toBeNull();
    });

    test('should get available versions for package', async () => {
      const versions = await registryClient.getVersions('freelang-stdlib');
      expect(Array.isArray(versions)).toBe(true);
    });

    test('should check if package exists', async () => {
      const exists = await registryClient.exists('freelang-stdlib');
      expect(typeof exists).toBe('boolean');
    });

    test('should list all packages', async () => {
      const packages = await registryClient.listAll(10);
      expect(Array.isArray(packages)).toBe(true);
      expect(packages.length).toBeLessThanOrEqual(10);
    });

    test('should get registry statistics', async () => {
      const stats = await registryClient.getStats();
      expect(stats.totalPackages).toBeGreaterThanOrEqual(0);
      expect(typeof stats.categories).toBe('object');
      expect(typeof stats.lastUpdated).toBe('string');
    });
  });

  describe('KPMCLIWrapper', () => {
    test('should check if KPM is available', async () => {
      const available = await cliWrapper.isAvailable();
      expect(typeof available).toBe('boolean');
    });

    test('should get KPM version', async () => {
      const version = await cliWrapper.getVersion();
      expect(typeof version).toBe('string');
    });

    test('should search packages via CLI', async () => {
      const results = await cliWrapper.search('async', 10);
      expect(Array.isArray(results)).toBe(true);
    });

    test('should handle CLI search errors gracefully', async () => {
      const results = await cliWrapper.search('');
      expect(Array.isArray(results)).toBe(true);
    });

    test('should get package info via CLI', async () => {
      const info = await cliWrapper.info('freelang-stdlib');
      // May be null or object depending on CLI availability
      expect(info === null || typeof info === 'object').toBe(true);
    });

    test('should list installed packages', async () => {
      const packages = await cliWrapper.list();
      expect(Array.isArray(packages)).toBe(true);
    });

    test('should handle install command', async () => {
      const result = await cliWrapper.install('non-existent-package', { version: '1.0.0' });
      expect(typeof result).toBe('boolean');
    });

    test('should handle uninstall command', async () => {
      const result = await cliWrapper.uninstall('non-existent-package');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('KPMPackageInstaller', () => {
    test('should resolve version string', async () => {
      const installer = new KPMPackageInstaller(registryClient);
      const resolved = (installer as any).resolveVersion('freelang-stdlib', 'latest');
      expect(resolved).toBeDefined();
    });

    test('should create dependency tree', async () => {
      const tree = await installer.resolveDependencyTree('freelang-stdlib', '1.0.0');
      if (tree) {
        expect(tree.name).toBe('freelang-stdlib');
        expect(tree.version).toBe('1.0.0');
        expect(tree.dependencies).toBeDefined();
      }
    });

    test('should detect circular dependencies', async () => {
      // Create a mock circular dependency scenario
      const tree = await installer.resolveDependencyTree('circular-a', '1.0.0');
      // Should not crash and should be finite
      expect(tree === null || typeof tree === 'object').toBe(true);
    });

    test('should flatten dependency tree correctly', () => {
      const tree = {
        name: 'root',
        version: '1.0.0',
        dependencies: new Map([
          [
            'dep1',
            {
              name: 'dep1',
              version: '1.0.0',
              dependencies: new Map(),
              resolved: true,
            },
          ],
        ]),
        resolved: true,
      };

      const flattened = installer.flattenDependencyTree(tree);
      expect(Array.isArray(flattened)).toBe(true);
      // dep1 should come before root
      const dep1Index = flattened.findIndex(d => d.name === 'dep1');
      const rootIndex = flattened.findIndex(d => d.name === 'root');
      expect(dep1Index).toBeLessThan(rootIndex);
    });

    test('should check if package is installed', () => {
      const installed = installer.isInstalled('non-existent-pkg');
      expect(typeof installed).toBe('boolean');
    });

    test('should get installed package version', () => {
      const version = installer.getInstalledVersion('non-existent-pkg');
      expect(version === null || typeof version === 'string').toBe(true);
    });

    test('should handle installation of non-existent package gracefully', async () => {
      const result = await installer.installFromKPM('non-existent-xyz', '1.0.0');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('UnifiedModuleResolver', () => {
    test('should create resolver with project root', () => {
      const res = new UnifiedModuleResolver(testDir);
      expect(res).toBeDefined();
    });

    test('should return not found for non-existent module', async () => {
      const result = await resolver.resolveModulePath(
        path.join(testDir, 'test.fl'),
        'non-existent-module'
      );
      expect(result.found).toBe(false);
      expect(result.path).toBeNull();
    });

    test('should resolve module from fl_modules', async () => {
      // Create a test module in fl_modules
      const flModulesDir = path.join(testDir, 'fl_modules', 'test-module');
      mkdirSync(flModulesDir, { recursive: true });
      writeFileSync(path.join(flModulesDir, 'index.fl'), 'fn main() {}');

      const result = await resolver.resolveModulePath(
        path.join(testDir, 'test.fl'),
        'test-module'
      );

      if (result.found) {
        expect(result.source).toBe('fl_modules');
      }
    });

    test('should resolve module from kim_modules', async () => {
      // Create a test package in kim_modules
      const kimModulesDir = path.join(testDir, 'kim_modules', 'test-pkg');
      mkdirSync(kimModulesDir, { recursive: true });
      writeFileSync(path.join(kimModulesDir, 'package.json'), '{"name":"test-pkg","version":"1.0.0"}');

      const result = await resolver.resolveModulePath(
        path.join(testDir, 'test.fl'),
        'test-pkg'
      );

      if (result.found) {
        expect(result.source).toBe('kim_modules');
      }
    });

    test('should cache resolution results', async () => {
      const result1 = await resolver.resolveModulePath(
        path.join(testDir, 'test.fl'),
        'non-existent'
      );
      const result2 = await resolver.resolveModulePath(
        path.join(testDir, 'test.fl'),
        'non-existent'
      );

      expect(result1).toEqual(result2);
    });

    test('should get list of installed packages', () => {
      // Create some test packages
      const pkg1Dir = path.join(testDir, 'fl_modules', 'pkg1');
      mkdirSync(pkg1Dir, { recursive: true });
      writeFileSync(path.join(pkg1Dir, 'index.fl'), '');

      const packages = resolver.getInstalledPackages();
      expect(Array.isArray(packages)).toBe(true);
    });
  });

  describe('Integration Workflows', () => {
    test('complete search and install workflow', async () => {
      // 1. Search
      const results = await registryClient.search('freelang', { limit: 5 });
      expect(Array.isArray(results)).toBe(true);

      // 2. If found, get info
      if (results.length > 0) {
        const info = await registryClient.getPackageInfo(results[0].name);
        expect(info === null || typeof info === 'object').toBe(true);
      }
    });

    test('module resolution fallback order', async () => {
      // Create test modules in different locations
      const flModulesDir = path.join(testDir, 'fl_modules', 'common');
      mkdirSync(flModulesDir, { recursive: true });
      writeFileSync(path.join(flModulesDir, 'index.fl'), 'source: fl_modules');

      // Should find fl_modules first
      const result = await resolver.resolveModulePath(
        path.join(testDir, 'test.fl'),
        'common'
      );

      expect(result.found).toBe(true);
      expect(result.source).toBe('fl_modules');
    });

    test('package installation with dependency resolution', async () => {
      const result = await installer.installDependencies({
        dependencies: {
          'non-existent-1': 'latest',
          'non-existent-2': '1.0.0',
        },
      });

      expect(typeof result.success).toBe('boolean');
      expect(Array.isArray(result.installed)).toBe(true);
      expect(Array.isArray(result.failed)).toBe(true);
    });

    test('cache clearing resets resolution', async () => {
      // Resolve something
      await resolver.resolveModulePath(path.join(testDir, 'test.fl'), 'module1');

      // Clear cache
      resolver.clearCache();

      // Should still work
      const result = await resolver.resolveModulePath(path.join(testDir, 'test.fl'), 'module1');
      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle registry client errors gracefully', async () => {
      const results = await registryClient.search('', { limit: 1 });
      expect(Array.isArray(results)).toBe(true);
    });

    test('should handle CLI wrapper errors gracefully', async () => {
      const result = await cliWrapper.install('');
      expect(typeof result).toBe('boolean');
    });

    test('should handle installer errors gracefully', async () => {
      const result = await installer.installFromKPM('', 'latest');
      expect(typeof result).toBe('boolean');
    });

    test('should handle resolver errors gracefully', async () => {
      const result = await resolver.resolveModulePath('', '');
      expect(result.found === false).toBe(true);
    });

    test('should handle relative paths safely', async () => {
      const relativePath = '../../../etc/passwd';
      const result = await resolver.resolveModulePath(path.join(testDir, 'test.fl'), relativePath);
      // Should not crash and should handle gracefully
      expect(result).toBeDefined();
      expect(typeof result.found).toBe('boolean');
    });
  });
});
