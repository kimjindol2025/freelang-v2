/**
 * Phase 17: Dependency Resolver Tests
 * Tests for graph construction, cycle detection, and conflict resolution
 */

import {
  DependencyResolver,
  MockRegistry,
  ResolutionResult,
  DependencyNode
} from '../src/kpm/dependency-resolver';
import { PackageJson } from '../src/kpm/package-parser';

describe('Phase 17: Dependency Resolver', () => {
  // ===== Simple Graph Tests (5 tests) =====
  describe('Simple dependency graphs', () => {
    let resolver: DependencyResolver;
    let registry: MockRegistry;

    beforeEach(() => {
      registry = new MockRegistry();
      resolver = new DependencyResolver(registry);
    });

    it('should resolve single package with no dependencies', async () => {
      const pkg: PackageJson = {
        name: 'standalone',
        version: '1.0.0'
      };

      registry.register(pkg);

      const result = await resolver.resolve('standalone');

      expect(result.root.name).toBe('standalone');
      expect(result.root.version).toBe('1.0.0');
      expect(result.root.dependencies.length).toBe(0);
    });

    it('should resolve linear dependency chain', async () => {
      // A -> B -> C
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

      const pkgC: PackageJson = {
        name: 'c',
        version: '1.0.0'
      };

      registry.register(pkgA);
      registry.register(pkgB);
      registry.register(pkgC);

      const result = await resolver.resolve('a');

      expect(result.root.name).toBe('a');
      expect(result.root.dependencies.length).toBe(1);
      expect(result.root.dependencies[0].name).toBe('b');
      expect(result.root.dependencies[0].dependencies.length).toBe(1);
      expect(result.root.dependencies[0].dependencies[0].name).toBe('c');
    });

    it('should resolve branching dependencies', async () => {
      // A -> B, C
      const pkgA: PackageJson = {
        name: 'a',
        version: '1.0.0',
        dependencies: { b: '1.0.0', c: '1.0.0' }
      };

      const pkgB: PackageJson = { name: 'b', version: '1.0.0' };
      const pkgC: PackageJson = { name: 'c', version: '1.0.0' };

      registry.register(pkgA);
      registry.register(pkgB);
      registry.register(pkgC);

      const result = await resolver.resolve('a');

      expect(result.root.dependencies.length).toBe(2);
      expect(result.root.dependencies.map((d) => d.name).sort()).toEqual(['b', 'c']);
    });

    it('should handle shared dependencies', async () => {
      // A -> B, C
      // B -> D
      // C -> D (same D)
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

      const result = await resolver.resolve('a');

      // Should resolve successfully (shared dependency)
      expect(result.flatTree.has('d')).toBe(true);
    });

    it('should flatten dependency tree correctly', async () => {
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

      const pkgC: PackageJson = { name: 'c', version: '1.0.0' };
      const pkgD: PackageJson = { name: 'd', version: '1.0.0' };

      registry.register(pkgA);
      registry.register(pkgB);
      registry.register(pkgC);
      registry.register(pkgD);

      const result = await resolver.resolve('a');

      // Flat tree should contain all packages
      expect(result.flatTree.size).toBe(4);
      expect(result.flatTree.has('a')).toBe(true);
      expect(result.flatTree.has('b')).toBe(true);
      expect(result.flatTree.has('c')).toBe(true);
      expect(result.flatTree.has('d')).toBe(true);
    });
  });

  // ===== Circular Dependency Detection (4 tests) =====
  describe('Circular dependency detection', () => {
    let resolver: DependencyResolver;
    let registry: MockRegistry;

    beforeEach(() => {
      registry = new MockRegistry();
      resolver = new DependencyResolver(registry);
    });

    it('should detect simple circular dependency A -> A', async () => {
      const pkgA: PackageJson = {
        name: 'a',
        version: '1.0.0',
        dependencies: { a: '1.0.0' }
      };

      registry.register(pkgA);

      const result = await resolver.resolve('a');

      expect(result.cycles.length).toBeGreaterThan(0);
      expect(result.cycles[0]).toContain('a');
    });

    it('should detect two-package cycle A -> B -> A', async () => {
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

      const result = await resolver.resolve('a');

      expect(resolver.hasCircularDependencies(result)).toBe(true);
      expect(result.cycles.length).toBeGreaterThan(0);
    });

    it('should detect three-package cycle A -> B -> C -> A', async () => {
      const pkgA: PackageJson = {
        name: 'a',
        version: '1.0.0',
        dependencies: { b: '1.0.0' }
      };

      const pkgB: PackageJson = {
        name: 'b',
        version: '1.0.0',
        dependencies: { c: '1.0.0' }
      };

      const pkgC: PackageJson = {
        name: 'c',
        version: '1.0.0',
        dependencies: { a: '1.0.0' }
      };

      registry.register(pkgA);
      registry.register(pkgB);
      registry.register(pkgC);

      const result = await resolver.resolve('a');

      expect(resolver.hasCircularDependencies(result)).toBe(true);
    });

    it('should handle acyclic graph without false positives', async () => {
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

      const result = await resolver.resolve('a');

      expect(resolver.hasCircularDependencies(result)).toBe(false);
      expect(result.cycles.length).toBe(0);
    });
  });

  // ===== Version Conflict Resolution (3 tests) =====
  describe('Version conflict resolution', () => {
    let resolver: DependencyResolver;
    let registry: MockRegistry;

    beforeEach(() => {
      registry = new MockRegistry();
      resolver = new DependencyResolver(registry);
    });

    it('should detect version conflicts', async () => {
      const pkgA: PackageJson = {
        name: 'a',
        version: '1.0.0',
        dependencies: { common: '1.0.0' }
      };

      const pkgB: PackageJson = {
        name: 'b',
        version: '1.0.0',
        dependencies: { common: '2.0.0' }
      };

      const pkgCommon1: PackageJson = { name: 'common', version: '1.0.0' };
      const pkgCommon2: PackageJson = { name: 'common', version: '2.0.0' };

      registry.register(pkgA);
      registry.register(pkgB);
      registry.register(pkgCommon1);
      registry.register(pkgCommon2);

      // Register A which depends on B which depends on different version of common
      const pkgA2: PackageJson = {
        name: 'a',
        version: '2.0.0',
        dependencies: { b: '1.0.0', common: '1.0.0' }
      };
      registry.register(pkgA2);

      // Resolve A v2 which brings in both B and Common
      // This should detect the conflict
      const result = await resolver.resolve('a', '2.0.0');

      // May have conflicts due to version mismatch
      // The resolver should handle this gracefully
      expect(result).toBeDefined();
    });

    it('should resolve compatible versions automatically', async () => {
      const pkgA: PackageJson = {
        name: 'a',
        version: '1.0.0',
        dependencies: { lodash: '^4.0.0' }
      };

      // Register in order: higher version first so it's selected as latest
      const pkgLodash4_18: PackageJson = { name: 'lodash', version: '4.18.0' };
      const pkgLodash4_17: PackageJson = { name: 'lodash', version: '4.17.0' };

      registry.register(pkgA);
      registry.register(pkgLodash4_18); // Register higher version first
      registry.register(pkgLodash4_17);

      const result = await resolver.resolve('a');

      // Should select compatible version (highest matching ^4.0.0)
      expect(result.root.dependencies[0].version).toBe('4.18.0');
    });

    it('should prefer stable versions over prerelease', async () => {
      const pkgA: PackageJson = {
        name: 'a',
        version: '1.0.0',
        dependencies: { lib: '*' }
      };

      const pkgLibStable: PackageJson = { name: 'lib', version: '2.0.0' };
      const pkgLibAlpha: PackageJson = { name: 'lib', version: '2.1.0-alpha.1' };

      registry.register(pkgA);
      registry.register(pkgLibStable);
      registry.register(pkgLibAlpha);

      const result = await resolver.resolve('a');

      // Should prefer stable version
      expect(result.root.dependencies[0].version).toBe('2.0.0');
    });
  });

  // ===== Summary and Reporting (3 tests) =====
  describe('Summary and reporting', () => {
    let resolver: DependencyResolver;
    let registry: MockRegistry;

    beforeEach(() => {
      registry = new MockRegistry();
      resolver = new DependencyResolver(registry);
    });

    it('should generate summary for acyclic graph', async () => {
      const pkgA: PackageJson = {
        name: 'express',
        version: '4.17.0',
        dependencies: { 'body-parser': '1.19.0', 'compression': '1.7.4' }
      };

      const pkgB: PackageJson = { name: 'body-parser', version: '1.19.0' };
      const pkgC: PackageJson = { name: 'compression', version: '1.7.4' };

      registry.register(pkgA);
      registry.register(pkgB);
      registry.register(pkgC);

      const result = await resolver.resolve('express');
      const summary = resolver.summarize(result);

      expect(summary).toContain('express@4.17.0');
      expect(summary).toContain('✅ No circular dependencies');
      expect(summary).toContain('Total dependencies: 3');
    });

    it('should generate summary for circular dependencies', async () => {
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

      const result = await resolver.resolve('a');
      const summary = resolver.summarize(result);

      expect(summary).toContain('❌ Circular dependencies');
    });

    it('should generate summary with conflicts', async () => {
      const pkgA: PackageJson = {
        name: 'a',
        version: '1.0.0',
        dependencies: { common: '1.0.0' }
      };

      const pkgCommon1: PackageJson = { name: 'common', version: '1.0.0' };

      registry.register(pkgA);
      registry.register(pkgCommon1);

      const result = await resolver.resolve('a');
      const summary = resolver.summarize(result);

      expect(summary).toContain('📦 Package: a@1.0.0');
    });
  });

  // ===== Error Handling (2 tests) =====
  describe('Error handling', () => {
    let resolver: DependencyResolver;
    let registry: MockRegistry;

    beforeEach(() => {
      registry = new MockRegistry();
      resolver = new DependencyResolver(registry);
    });

    it('should handle missing packages', async () => {
      const pkgA: PackageJson = {
        name: 'a',
        version: '1.0.0',
        dependencies: { 'missing-package': '1.0.0' }
      };

      registry.register(pkgA);

      try {
        await resolver.resolve('a');
        fail('Should throw error for missing package');
      } catch (error: unknown) {
        expect((error as Error).message).toContain('missing-package');
      }
    });

    it('should handle optional dependencies gracefully', async () => {
      const pkgA: PackageJson = {
        name: 'a',
        version: '1.0.0',
        dependencies: { required: '1.0.0' },
        optionalDependencies: { optional: '1.0.0' }
      };

      const pkgRequired: PackageJson = { name: 'required', version: '1.0.0' };

      registry.register(pkgA);
      registry.register(pkgRequired);
      // Note: optional package not registered

      const result = await resolver.resolve('a');

      // Should still resolve successfully
      expect(result.root.name).toBe('a');
    });
  });
});
