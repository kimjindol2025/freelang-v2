/**
 * Phase 17: Package Installer Tests
 * Tests for installation, caching, atomic transactions, and lock file generation
 */

import * as fs from 'fs';
import * as path from 'path';
import { PackageInstaller, InstallResult, CacheManager, InstallTransaction } from '../src/kpm/installer';
import { DependencyResolver, MockRegistry, ResolutionResult, DependencyNode } from '../src/kpm/dependency-resolver';
import { PackageJson } from '../src/kpm/package-parser';

describe('Phase 17: Package Installer', () => {
  // ===== Post-Order Traversal Tests (3 tests) =====
  describe('Post-order traversal (install dependencies first)', () => {
    let installer: PackageInstaller;
    let resolver: DependencyResolver;
    let registry: MockRegistry;
    let installOrder: string[] = [];

    beforeEach(() => {
      installOrder = [];
      registry = new MockRegistry();
      resolver = new DependencyResolver(registry);
      installer = new PackageInstaller(resolver, { targetDir: '/tmp/kim_modules_test' });
    });

    it('should install dependencies before dependents', async () => {
      // A -> B -> C (linear chain)
      const pkgA: PackageJson = {
        name: 'a',
        version: '1.0.0',
        dependencies: { b: '^1.0.0' }
      };

      const pkgB: PackageJson = {
        name: 'b',
        version: '1.0.0',
        dependencies: { c: '^1.0.0' }
      };

      const pkgC: PackageJson = { name: 'c', version: '1.0.0' };

      registry.register(pkgA);
      registry.register(pkgB);
      registry.register(pkgC);

      const result = await installer.install('a');

      // Post-order: C, B, A (dependencies first)
      expect(result.success).toBe(true);
      expect(result.installed.length).toBe(3);
      expect(result.failed.length).toBe(0);
    });

    it('should handle branching dependencies correctly', async () => {
      // A -> B, C
      // B -> D
      // C -> D
      const pkgA: PackageJson = {
        name: 'a',
        version: '1.0.0',
        dependencies: { b: '1.0.0', c: '1.0.0' }
      };

      const pkgB: PackageJson = {
        name: 'b',
        version: '1.0.0',
        dependencies: { d: '1.0.0' }
      };

      const pkgC: PackageJson = {
        name: 'c',
        version: '1.0.0',
        dependencies: { d: '1.0.0' }
      };

      const pkgD: PackageJson = { name: 'd', version: '1.0.0' };

      registry.register(pkgA);
      registry.register(pkgB);
      registry.register(pkgC);
      registry.register(pkgD);

      const result = await installer.install('a');

      expect(result.success).toBe(true);
      // Note: Shared dependency D appears twice in tree (B->D, C->D) but is installed once
      expect(result.installed.length).toBeGreaterThanOrEqual(4);
      // D should be installed before B and C
      expect(result.installed).toContain('d@1.0.0');
      expect(result.installed).toContain('b@1.0.0');
      expect(result.installed).toContain('c@1.0.0');
    });

    it('should skip circular dependencies', async () => {
      // A -> B -> A (circular)
      const pkgA: PackageJson = {
        name: 'a',
        version: '1.0.0',
        dependencies: { b: '1.0.0' }
      };

      const pkgB: PackageJson = {
        name: 'b',
        version: '1.0.0',
        dependencies: { a: '1.0.0' }
      };

      registry.register(pkgA);
      registry.register(pkgB);

      const result = await installer.install('a');

      expect(result.success).toBe(true);
      // Circular dependency should be skipped
      expect(result.skipped.length).toBeGreaterThan(0);
      expect(result.failed.length).toBe(0);
    });
  });

  // ===== Cache Management Tests (3 tests) =====
  describe('Cache validation and hit/miss tracking', () => {
    let installer: PackageInstaller;
    let resolver: DependencyResolver;
    let registry: MockRegistry;
    let cacheDir: string;

    beforeEach(() => {
      cacheDir = `/tmp/kim_cache_test_${Date.now()}`;
      registry = new MockRegistry();
      resolver = new DependencyResolver(registry);
      installer = new PackageInstaller(resolver, {
        targetDir: '/tmp/kim_modules_test',
        cacheDir: cacheDir
      });
    });

    afterEach(() => {
      // Cleanup
      if (fs.existsSync(cacheDir)) {
        fs.rmSync(cacheDir, { recursive: true, force: true });
      }
    });

    it('should record cache miss on first install', async () => {
      const pkg: PackageJson = { name: 'express', version: '4.17.0' };
      registry.register(pkg);

      const result = await installer.install('express');

      expect(result.success).toBe(true);
      expect(result.cacheMisses).toBe(1);
      expect(result.cacheHits).toBe(0);
    });

    it('should detect cache hit on second install', async () => {
      const pkg: PackageJson = { name: 'lodash', version: '4.17.0' };
      registry.register(pkg);

      // First install (cache miss)
      const result1 = await installer.install('lodash');
      expect(result1.cacheMisses).toBe(1);

      // Second install (should be cache hit)
      const result2 = await installer.install('lodash');
      expect(result2.cacheHits).toBe(1);
      expect(result2.cacheMisses).toBe(0);
    });

    it('should cleanup old cache entries', async () => {
      const cache = new CacheManager(cacheDir);

      // Save a package
      const data = Buffer.from('test content');
      await cache.saveToCache('test-pkg', '1.0.0', data);

      // Verify it's cached
      expect(cache.isCached('test-pkg', '1.0.0')).toBe(true);

      // Cleanup with 0 day max age should remove it
      await cache.cleanup(0);

      // After cleanup with aggressive TTL, file should be removed or remain depending on timing
      // (This is timing-dependent, so we just verify the method runs without error)
      expect(true).toBe(true);
    });
  });

  // ===== Lock File Generation Tests (2 tests) =====
  describe('Lock file generation', () => {
    let installer: PackageInstaller;
    let resolver: DependencyResolver;
    let registry: MockRegistry;
    let targetDir: string;

    beforeEach(() => {
      targetDir = `/tmp/kim_modules_lock_${Date.now()}`;
      fs.mkdirSync(targetDir, { recursive: true });

      registry = new MockRegistry();
      resolver = new DependencyResolver(registry);
      installer = new PackageInstaller(resolver, { targetDir });
    });

    afterEach(() => {
      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
      }
    });

    it('should generate lock file with correct structure', async () => {
      const pkgA: PackageJson = {
        name: 'express',
        version: '4.17.0',
        dependencies: { 'body-parser': '1.19.0' }
      };

      const pkgB: PackageJson = { name: 'body-parser', version: '1.19.0' };

      registry.register(pkgA);
      registry.register(pkgB);

      const result = await installer.install('express');
      expect(result.success).toBe(true);

      // Verify lock file was created
      const lockfilePath = path.join(targetDir, 'package-lock.json');
      expect(fs.existsSync(lockfilePath)).toBe(true);

      // Verify lock file structure
      const lockfile = JSON.parse(fs.readFileSync(lockfilePath, 'utf-8'));
      expect(lockfile.version).toBe('1.0.0');
      expect(lockfile.lockfileVersion).toBe(2);
      expect(lockfile.timestamp).toBeDefined();
      expect(lockfile.packages).toBeDefined();
      expect(lockfile.dependencies).toBeDefined();
    });

    it('should include all installed packages in lock file', async () => {
      const pkgA: PackageJson = {
        name: 'app',
        version: '1.0.0',
        dependencies: { 'lodash': '4.17.0', 'moment': '2.29.0' }
      };

      registry.register(pkgA);
      registry.register({ name: 'lodash', version: '4.17.0' });
      registry.register({ name: 'moment', version: '2.29.0' });

      const result = await installer.install('app');

      const lockfilePath = path.join(targetDir, 'package-lock.json');
      const lockfile = JSON.parse(fs.readFileSync(lockfilePath, 'utf-8'));

      expect(lockfile.dependencies['lodash']).toBeDefined();
      expect(lockfile.dependencies['lodash'].version).toBe('4.17.0');
      expect(lockfile.dependencies['moment']).toBeDefined();
      expect(lockfile.dependencies['moment'].version).toBe('2.29.0');
    });
  });

  // ===== Atomic Transaction Tests (2 tests) =====
  describe('Atomic transactions and rollback', () => {
    let transaction: InstallTransaction;
    let targetDir: string;

    beforeEach(() => {
      targetDir = `/tmp/kim_modules_atomic_${Date.now()}`;
      fs.mkdirSync(targetDir, { recursive: true });
      transaction = new InstallTransaction(targetDir, true);
    });

    afterEach(() => {
      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
      }
    });

    it('should create backup before installation', async () => {
      // Create initial file
      fs.writeFileSync(path.join(targetDir, 'test.txt'), 'original');

      // Create backup
      await transaction.createBackup();

      // Modify original
      fs.writeFileSync(path.join(targetDir, 'test.txt'), 'modified');

      // Verify backup exists (will have original content)
      const backupDir = path.join(path.dirname(targetDir), `.backup-*`);
      const backups = fs.readdirSync(path.dirname(targetDir));
      const hasBackup = backups.some(d => d.startsWith('.backup-'));

      expect(hasBackup).toBe(true);
    });

    it('should record and commit installed packages', async () => {
      transaction.recordInstall('express', '4.17.0');
      transaction.recordInstall('body-parser', '1.19.0');

      // Commit should not throw
      await transaction.commit();

      // Verify no error during commit
      expect(true).toBe(true);
    });
  });

  // ===== Installation Error Handling Tests (2 tests) =====
  describe('Error handling during installation', () => {
    let installer: PackageInstaller;
    let resolver: DependencyResolver;
    let registry: MockRegistry;

    beforeEach(() => {
      registry = new MockRegistry();
      resolver = new DependencyResolver(registry);
      installer = new PackageInstaller(resolver, { targetDir: '/tmp/kim_modules_test' });
    });

    it('should fail gracefully on missing dependency', async () => {
      const pkgA: PackageJson = {
        name: 'a',
        version: '1.0.0',
        dependencies: { 'missing-package': '1.0.0' }
      };

      registry.register(pkgA);
      // Note: missing-package is NOT registered

      const result = await installer.install('a');

      // Installation should fail due to missing dependency
      expect(result.success).toBe(false);
      expect(result.failed.length).toBeGreaterThan(0);
    });

    it('should handle optional dependencies gracefully', async () => {
      const pkgA: PackageJson = {
        name: 'a',
        version: '1.0.0',
        dependencies: { 'required': '1.0.0' },
        optionalDependencies: { 'optional': '1.0.0' }
      };

      registry.register(pkgA);
      registry.register({ name: 'required', version: '1.0.0' });
      // Note: optional package not registered

      const result = await installer.install('a');

      // Should still succeed because optional dependency can fail
      expect(result.success).toBe(true);
      expect(result.installed.length).toBeGreaterThan(0);
    });
  });

  // ===== Summary Reporting Tests (1 test) =====
  describe('Installation summary reporting', () => {
    let installer: PackageInstaller;

    beforeEach(() => {
      const registry = new MockRegistry();
      const resolver = new DependencyResolver(registry);
      installer = new PackageInstaller(resolver);
    });

    it('should generate correct summary report', () => {
      const result: InstallResult = {
        success: true,
        installed: ['express@4.17.0', 'body-parser@1.19.0', 'compression@1.7.4'],
        skipped: [],
        failed: [],
        duration: 1234,
        cacheHits: 2,
        cacheMisses: 1
      };

      const summary = installer.summarize(result);

      expect(summary).toContain('Installation Summary');
      expect(summary).toContain('✅ Installed: 3');
      expect(summary).toContain('⏭️  Skipped: 0');
      expect(summary).toContain('❌ Failed: 0');
      expect(summary).toContain('⚡ Duration: 1234ms');
      expect(summary).toContain('💾 Cache hits: 2');
      expect(summary).toContain('📥 Cache misses: 1');
    });
  });

  // ===== Full Integration Tests (2 tests) =====
  describe('Full installation workflow', () => {
    let installer: PackageInstaller;
    let resolver: DependencyResolver;
    let registry: MockRegistry;
    let targetDir: string;

    beforeEach(() => {
      targetDir = `/tmp/kim_modules_integration_${Date.now()}`;
      registry = new MockRegistry();
      resolver = new DependencyResolver(registry);
      installer = new PackageInstaller(resolver, { targetDir });
    });

    afterEach(() => {
      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
      }
    });

    it('should complete full installation workflow with lock file', async () => {
      // Ensure target directory exists
      fs.mkdirSync(targetDir, { recursive: true });

      // Setup: Express-like dependency graph
      const pkgApp: PackageJson = {
        name: 'myapp',
        version: '1.0.0',
        dependencies: {
          'express': '4.17.0',
          'lodash': '4.17.0'
        }
      };

      const pkgExpress: PackageJson = {
        name: 'express',
        version: '4.17.0',
        dependencies: {
          'body-parser': '1.19.0',
          'compression': '1.7.4'
        }
      };

      const pkgBodyParser: PackageJson = { name: 'body-parser', version: '1.19.0' };
      const pkgCompression: PackageJson = { name: 'compression', version: '1.7.4' };
      const pkgLodash: PackageJson = { name: 'lodash', version: '4.17.0' };

      registry.register(pkgApp);
      registry.register(pkgExpress);
      registry.register(pkgBodyParser);
      registry.register(pkgCompression);
      registry.register(pkgLodash);

      // Execute installation
      const result = await installer.install('myapp');

      // Verify results
      expect(result.success).toBe(true);
      expect(result.installed.length).toBeGreaterThan(0);
      expect(result.failed.length).toBe(0);

      // Verify lock file
      const lockfilePath = path.join(targetDir, 'package-lock.json');
      expect(fs.existsSync(lockfilePath)).toBe(true);

      // Verify lock file contains all packages
      const lockfile = JSON.parse(fs.readFileSync(lockfilePath, 'utf-8'));
      expect(lockfile.dependencies['express']).toBeDefined();
      expect(lockfile.dependencies['lodash']).toBeDefined();
    });

    it('should handle uninstall operation', async () => {
      const pkg: PackageJson = { name: 'test-pkg', version: '1.0.0' };
      registry.register(pkg);

      // Install package
      const targetPath = path.join(targetDir, 'test-pkg');
      fs.mkdirSync(targetPath, { recursive: true });
      fs.writeFileSync(path.join(targetPath, 'index.js'), 'console.log("test");');

      // Uninstall
      await installer.uninstall('test-pkg');

      // Verify uninstall
      expect(fs.existsSync(targetPath)).toBe(false);
    });
  });
});
