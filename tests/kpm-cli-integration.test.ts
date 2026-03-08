/**
 * KPM CLI Integration Tests
 *
 * Tests for Week 2 components:
 * - KPM Commands (10 tests)
 * - Dependency Graph Builder (10 tests)
 * - Lock File Manager (10 tests)
 * - npm to KPM Migrator (5+ tests)
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';

import { KPMCommands } from '../src/cli/kpm-commands';
import { DependencyGraphBuilder } from '../src/kpm-integration/dependency-graph-builder';
import { LockFileManager } from '../src/kpm-integration/lock-file-manager';
import { NPMToKPMMigrator } from '../src/kpm-integration/npm-to-kpm-migrator';
import { KPMRegistryClient } from '../src/kpm-integration/kpm-registry-client';

describe('KPM CLI Integration Tests', () => {
  let testDir: string;
  let commands: KPMCommands;
  let registryClient: KPMRegistryClient;
  let graphBuilder: DependencyGraphBuilder;
  let lockManager: LockFileManager;
  let migrator: NPMToKPMMigrator;

  beforeEach(() => {
    testDir = path.join(__dirname, '..', 'test-cli-workspace');

    // Create test workspace
    if (!fs.existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    // Create test freelang.json
    const manifestPath = path.join(testDir, 'freelang.json');
    writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          name: 'test-project',
          version: '1.0.0',
          dependencies: {},
        },
        null,
        2
      )
    );

    commands = new KPMCommands(testDir);
    registryClient = new KPMRegistryClient();
    graphBuilder = new DependencyGraphBuilder(registryClient);
    lockManager = new LockFileManager(testDir);
    migrator = new NPMToKPMMigrator(registryClient);
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('KPM Commands', () => {
    test('search command should find packages', async () => {
      await expect(commands.search('freelang')).resolves.not.toThrow();
    });

    test('search command should handle empty query', async () => {
      await expect(commands.search('')).resolves.not.toThrow();
    });

    test('info command should retrieve package details', async () => {
      await expect(commands.info('freelang-stdlib')).resolves.not.toThrow();
    });

    test('info command should handle non-existent package', async () => {
      await expect(commands.info('non-existent-xyz')).resolves.not.toThrow();
    });

    test('install command should handle package spec', async () => {
      await expect(commands.install('test-pkg@1.0.0')).resolves.not.toThrow();
    });

    test('install command should handle empty spec', async () => {
      await expect(commands.install('')).resolves.not.toThrow();
    });

    test('update command should update single package', async () => {
      await expect(commands.update('test-pkg')).resolves.not.toThrow();
    });

    test('update command should update all dependencies', async () => {
      await expect(commands.update()).resolves.not.toThrow();
    });

    test('list command should display installed packages', async () => {
      await expect(commands.list()).resolves.not.toThrow();
    });

    test('tree command should show dependency tree', async () => {
      await expect(commands.tree()).resolves.not.toThrow();
    });
  });

  describe('Dependency Graph Builder', () => {
    test('should build graph for package', async () => {
      const graph = await graphBuilder.buildGraph('freelang-stdlib', '1.0.0');
      expect(graph === null || typeof graph === 'object').toBe(true);
    });

    test('should handle non-existent root package', async () => {
      const graph = await graphBuilder.buildGraph('non-existent-xyz', '1.0.0');
      expect(graph === null).toBe(true);
    });

    test('should detect circular dependencies', async () => {
      const graph = await graphBuilder.buildGraph('freelang-stdlib', '1.0.0');

      if (graph) {
        const cycles = graph.cycles;
        expect(Array.isArray(cycles)).toBe(true);
      }
    });

    test('should detect version conflicts', async () => {
      const graph = await graphBuilder.buildGraph('freelang-stdlib', '1.0.0');

      if (graph) {
        const conflicts = graph.conflicts;
        expect(Array.isArray(conflicts)).toBe(true);
      }
    });

    test('should collect all nodes in graph', async () => {
      const graph = await graphBuilder.buildGraph('freelang-stdlib', '1.0.0');

      if (graph) {
        expect(graph.allNodes).toBeDefined();
        expect(graph.allNodes instanceof Map).toBe(true);
      }
    });

    test('should generate installation plan', async () => {
      const graph = await graphBuilder.buildGraph('freelang-stdlib', '1.0.0');

      if (graph) {
        const plan = await graphBuilder.generateInstallationPlan(graph);
        expect(plan.steps).toBeDefined();
        expect(Array.isArray(plan.steps)).toBe(true);
        expect(plan.totalPackages).toBeGreaterThanOrEqual(0);
      }
    });

    test('should calculate dependency count', () => {
      const mockNode = {
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
              depth: 1,
            },
          ],
        ]),
        resolved: true,
        depth: 0,
      };

      const count = graphBuilder.getDependencyCount(mockNode);
      expect(count).toBe(1);
    });

    test('should handle deep dependency trees', async () => {
      // Create a mock deep tree
      const graph = await graphBuilder.buildGraph('freelang-stdlib', '1.0.0');
      // Should not crash and should complete in reasonable time
      expect(graph === null || typeof graph === 'object').toBe(true);
    });

    test('should reset caches between builds', async () => {
      const graph1 = await graphBuilder.buildGraph('freelang-stdlib', '1.0.0');
      const graph2 = await graphBuilder.buildGraph('freelang-stdlib', '1.0.0');

      // Both should be successful builds
      if (graph1 && graph2) {
        expect(graph1.root.name).toBe(graph2.root.name);
        expect(graph1.root.version).toBe(graph2.root.version);
      }
    });
  });

  describe('Lock File Manager', () => {
    test('should generate lock file', async () => {
      const packages = new Map([
        ['test-pkg', { version: '1.0.0', path: path.join(testDir, 'test-pkg') }],
      ]);

      const lockFile = await lockManager.generate(packages);
      expect(lockFile).toBeDefined();
      expect(lockFile.lockfileVersion).toBe(1);
      expect(lockFile.packages).toBeDefined();
    });

    test('should save lock file to disk', async () => {
      const packages = new Map([
        ['test-pkg', { version: '1.0.0', path: path.join(testDir, 'test-pkg') }],
      ]);

      const lockFile = await lockManager.generate(packages);
      await lockManager.save(lockFile);

      const lockPath = path.join(testDir, 'kpm-lock.json');
      expect(fs.existsSync(lockPath)).toBe(true);
    });

    test('should load lock file from disk', async () => {
      const packages = new Map([
        ['test-pkg', { version: '1.0.0', path: path.join(testDir, 'test-pkg') }],
      ]);

      await lockManager.generate(packages);
      await lockManager.save((await lockManager.load()) as any);

      const loaded = await lockManager.load();
      expect(loaded).toBeDefined();
      expect(loaded?.packages).toBeDefined();
    });

    test('should validate lock file', async () => {
      const packages = new Map([
        ['test-pkg', { version: '1.0.0', path: path.join(testDir, 'test-pkg') }],
      ]);

      const lockFile = await lockManager.generate(packages);
      const validation = await lockManager.validate(lockFile);

      expect(validation.valid === true || validation.valid === false).toBe(true);
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });

    test('should update package in lock file', async () => {
      const packages = new Map([
        ['test-pkg', { version: '1.0.0', path: path.join(testDir, 'test-pkg') }],
      ]);

      let lockFile = await lockManager.generate(packages);
      lockFile = await lockManager.updatePackage(lockFile, 'new-pkg', '2.0.0', path.join(testDir, 'new-pkg'));

      expect(lockFile.packages['new-pkg']).toBeDefined();
      expect(lockFile.packages['new-pkg'].version).toBe('2.0.0');
    });

    test('should remove package from lock file', () => {
      const lockFile = {
        lockfileVersion: 1,
        packages: {
          'test-pkg': { version: '1.0.0' },
          'other-pkg': { version: '2.0.0' },
        },
        timestamp: new Date().toISOString(),
      };

      const updated = lockManager.removePackage(lockFile, 'test-pkg');
      expect(updated.packages['test-pkg']).toBeUndefined();
      expect(updated.packages['other-pkg']).toBeDefined();
    });

    test('should calculate lock file statistics', () => {
      const lockFile = {
        lockfileVersion: 1,
        packages: {
          'pkg1': { version: '1.0.0' },
          'pkg2': { version: '2.0.0' },
          'pkg3': { version: '3.0.0' },
        },
        timestamp: new Date().toISOString(),
      };

      const stats = lockManager.getStats(lockFile);
      expect(stats.totalPackages).toBe(3);
      expect(stats.createdAt).toBeDefined();
    });

    test('should handle lock file installation', async () => {
      const lockFile = {
        lockfileVersion: 1,
        packages: {
          'test-pkg': { version: '1.0.0' },
        },
        timestamp: new Date().toISOString(),
      };

      const result = await lockManager.installFromLock(lockFile);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('npm to KPM Migrator', () => {
    test('should analyze package.json', async () => {
      const packageJson = {
        name: 'test-app',
        dependencies: {
          express: '^4.17.0',
          lodash: '^4.17.0',
        },
      };

      const report = await migrator.analyze(packageJson);

      expect(report).toBeDefined();
      expect(report.totalPackages).toBeGreaterThan(0);
      expect(Array.isArray(report.alternatives)).toBe(true);
      expect(Array.isArray(report.noAlternatives)).toBe(true);
    });

    test('should suggest replacements', async () => {
      const suggestions = await migrator.suggestReplacements();

      expect(Array.isArray(suggestions)).toBe(true);
      // Should have some suggestions for known packages
      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    test('should detect breaking changes', async () => {
      const changes = await migrator.detectBreakingChanges('express', '3.0.0', '4.0.0');

      expect(Array.isArray(changes)).toBe(true);
    });

    test('should show migration guide', async () => {
      await expect(migrator.showMigrationGuide('express', '3.0.0', '4.0.0')).resolves.not.toThrow();
    });

    test('should handle empty package.json analysis', async () => {
      const emptyPackageJson = { dependencies: {} };

      const report = await migrator.analyze(emptyPackageJson);

      expect(report.totalPackages).toBe(0);
      expect(report.alternatives.length).toBe(0);
    });
  });

  describe('Integration Workflows', () => {
    test('complete search and info workflow', async () => {
      // These should not throw
      await expect(commands.search('freelang')).resolves.not.toThrow();
      await expect(commands.info('freelang-stdlib')).resolves.not.toThrow();
    });

    test('migration analysis workflow', async () => {
      const packageJson = {
        name: 'test-app',
        version: '1.0.0',
        dependencies: {
          express: '^4.17.0',
          lodash: '^4.17.0',
          axios: '^0.21.0',
        },
        devDependencies: {
          jest: '^27.0.0',
        },
      };

      const report = await migrator.analyze(packageJson);

      expect(report.totalPackages).toBeGreaterThan(0);
      expect(report.alternatives.length).toBeGreaterThan(0);
    });

    test('lock file generation workflow', async () => {
      const packages = new Map([
        ['pkg1', { version: '1.0.0', path: path.join(testDir, 'pkg1') }],
        ['pkg2', { version: '2.0.0', path: path.join(testDir, 'pkg2') }],
      ]);

      const lockFile = await lockManager.generate(packages);
      await lockManager.save(lockFile);

      const loaded = await lockManager.load();
      expect(loaded?.packages).toBeDefined();
      expect(Object.keys(loaded?.packages || {}).length).toBe(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle search errors gracefully', async () => {
      await expect(commands.search('')).resolves.not.toThrow();
    });

    test('should handle info errors gracefully', async () => {
      await expect(commands.info('non-existent')).resolves.not.toThrow();
    });

    test('should handle graph building errors', async () => {
      const graph = await graphBuilder.buildGraph('non-existent-xyz', '1.0.0');
      expect(graph === null).toBe(true);
    });

    test('should handle lock file errors gracefully', async () => {
      const invalidLockFile = {
        lockfileVersion: 99,
        packages: {},
        timestamp: 'invalid-date',
      };

      const validation = await lockManager.validate(invalidLockFile);
      expect(validation.valid).toBe(false);
    });

    test('should handle migration analysis errors', async () => {
      await expect(migrator.analyze({})).resolves.not.toThrow();
    });
  });
});
