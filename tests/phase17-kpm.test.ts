/**
 * Phase 17: KPM Ecosystem Tests
 * Comprehensive tests for package-parser, semver, and dependency resolution
 */

import { PackageParser, DependencyMap, PackageJson } from '../src/kpm/package-parser';
import { SemVer, SemanticVersion } from '../src/kpm/semver';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 17: KPM Ecosystem', () => {
  const testDir = '/tmp/kpm-test';

  beforeAll(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  // ===== Package Parser Tests (8 tests) =====
  describe('PackageParser', () => {
    const parser = new PackageParser();

    it('should parse valid package.json', () => {
      const testFile = path.join(testDir, 'package1.json');
      const pkg = {
        name: '@freelang/core',
        version: '2.1.0',
        description: 'FreeLang Core Library',
        dependencies: {
          'semver': '^7.0.0'
        }
      };

      fs.writeFileSync(testFile, JSON.stringify(pkg));
      const parsed = parser.parse(testFile);

      expect(parsed.name).toBe('@freelang/core');
      expect(parsed.version).toBe('2.1.0');
      expect(parsed.dependencies).toHaveProperty('semver');
    });

    it('should extract all dependencies', () => {
      const pkg: PackageJson = {
        name: 'test-pkg',
        version: '1.0.0',
        dependencies: { express: '^4.0.0' },
        devDependencies: { jest: '^27.0.0' },
        peerDependencies: { react: '>=16.0.0' }
      };

      const deps = parser.extractDependencies(pkg);

      expect(deps).toHaveProperty('express');
      expect(deps).toHaveProperty('jest');
      expect(deps).toHaveProperty('react');
      expect(deps.express.type).toBe('production');
      expect(deps.jest.type).toBe('dev');
    });

    it('should get only production dependencies', () => {
      const pkg: PackageJson = {
        name: 'test-pkg',
        version: '1.0.0',
        dependencies: { express: '^4.0.0', lodash: '^4.0.0' },
        devDependencies: { jest: '^27.0.0' }
      };

      const prodDeps = parser.getProductionDeps(pkg);

      expect(Object.keys(prodDeps).length).toBe(2);
      expect(prodDeps).toHaveProperty('express');
      expect(prodDeps).toHaveProperty('lodash');
      expect(prodDeps).not.toHaveProperty('jest');
    });

    it('should get package statistics', () => {
      const pkg: PackageJson = {
        name: 'test-pkg',
        version: '1.0.0',
        dependencies: { a: '1.0.0', b: '2.0.0' },
        devDependencies: { jest: '1.0.0' },
        peerDependencies: { react: '16.0.0' }
      };

      const stats = parser.getStats(pkg);

      expect(stats.production).toBe(2);
      expect(stats.dev).toBe(1);
      expect(stats.peer).toBe(1);
      expect(stats.total).toBe(4);
    });

    it('should validate package names', () => {
      expect(parser.isValidName('express')).toBe(true);
      expect(parser.isValidName('@scope/package')).toBe(true);
      expect(parser.isValidName('my-package')).toBe(true);
      expect(parser.isValidName('123-pkg')).toBe(true);

      expect(parser.isValidName('UPPERCASE')).toBe(false);
      expect(parser.isValidName('Invalid Package')).toBe(false);
    });

    it('should validate package.json structure', () => {
      const validPkg: PackageJson = {
        name: 'test-pkg',
        version: '1.0.0'
      };

      const errors = parser.validate(validPkg);
      expect(errors.length).toBe(0);
    });

    it('should detect invalid package.json', () => {
      const invalidPkg = {
        name: 'INVALID',
        version: 'not.a.version'
      };

      const errors = parser.validate(invalidPkg);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should parse multiple package.json files', () => {
      const file1 = path.join(testDir, 'pkg1.json');
      const file2 = path.join(testDir, 'pkg2.json');

      fs.writeFileSync(file1, JSON.stringify({ name: 'pkg1', version: '1.0.0' }));
      fs.writeFileSync(file2, JSON.stringify({ name: 'pkg2', version: '2.0.0' }));

      const pkgs = parser.parseMultiple([file1, file2]);

      expect(pkgs.length).toBe(2);
      expect(pkgs[0].name).toBe('pkg1');
      expect(pkgs[1].name).toBe('pkg2');
    });
  });

  // ===== SemVer Tests (10 tests) =====
  describe('SemVer', () => {
    it('should parse semantic version', () => {
      const ver = SemVer.parse('1.2.3');

      expect(ver.major).toBe(1);
      expect(ver.minor).toBe(2);
      expect(ver.patch).toBe(3);
    });

    it('should parse prerelease version', () => {
      const ver = SemVer.parse('1.0.0-alpha.1');

      expect(ver.prerelease).toEqual(['alpha', '1']);
    });

    it('should compare versions correctly', () => {
      const v1 = SemVer.parse('1.0.0');
      const v2 = SemVer.parse('2.0.0');
      const v3 = SemVer.parse('1.0.0');

      expect(SemVer.compare(v1, v2)).toBe(-1); // v1 < v2
      expect(SemVer.compare(v2, v1)).toBe(1);  // v2 > v1
      expect(SemVer.compare(v1, v3)).toBe(0);  // v1 == v3
    });

    it('should handle caret ranges (^)', () => {
      expect(SemVer.satisfies('1.5.0', '^1.2.3')).toBe(true);
      expect(SemVer.satisfies('1.2.3', '^1.2.3')).toBe(true);
      expect(SemVer.satisfies('2.0.0', '^1.2.3')).toBe(false);
    });

    it('should handle tilde ranges (~)', () => {
      expect(SemVer.satisfies('1.2.5', '~1.2.3')).toBe(true);
      expect(SemVer.satisfies('1.3.0', '~1.2.3')).toBe(false);
      expect(SemVer.satisfies('2.0.0', '~1.2.3')).toBe(false);
    });

    it('should handle comparison operators', () => {
      expect(SemVer.satisfies('2.0.0', '>1.0.0')).toBe(true);
      expect(SemVer.satisfies('1.0.0', '>=1.0.0')).toBe(true);
      expect(SemVer.satisfies('1.0.0', '<2.0.0')).toBe(true);
      expect(SemVer.satisfies('1.5.0', '<=2.0.0')).toBe(true);
    });

    it('should find max satisfying version', () => {
      const versions = ['1.0.0', '1.5.0', '2.0.0', '1.2.0'];
      const max = SemVer.maxSatisfying(versions, '^1.0.0');

      expect(max).toBe('1.5.0');
    });

    it('should detect stable versions', () => {
      expect(SemVer.isStable('1.0.0')).toBe(true);
      expect(SemVer.isStable('1.0.0-alpha')).toBe(false);
    });

    it('should detect version bump levels', () => {
      expect(SemVer.getBumpLevel('1.0.0', '2.0.0')).toBe('major');
      expect(SemVer.getBumpLevel('1.0.0', '1.1.0')).toBe('minor');
      expect(SemVer.getBumpLevel('1.0.0', '1.0.1')).toBe('patch');
    });

    it('should stringify semantic version', () => {
      const ver = SemVer.parse('1.2.3-alpha.1+build.5');
      const str = SemVer.stringify(ver);

      expect(str).toBe('1.2.3-alpha.1+build.5');
    });
  });

  // ===== Integration Tests (7 tests) =====
  describe('Package Parser + SemVer Integration', () => {
    const parser = new PackageParser();

    it('should validate package dependencies have valid versions', () => {
      const pkg: PackageJson = {
        name: 'test-pkg',
        version: '1.0.0',
        dependencies: {
          express: '^4.17.0',
          lodash: '~4.17.0'
        }
      };

      const deps = parser.extractDependencies(pkg);

      for (const [name, spec] of Object.entries(deps)) {
        expect(() => SemVer.parseRange(spec.version)).not.toThrow();
      }
    });

    it('should find compatible versions for dependencies', () => {
      const availableVersions = ['1.0.0', '1.1.0', '1.5.0', '2.0.0', '2.1.0'];
      const pkg: PackageJson = {
        name: 'test-pkg',
        version: '1.0.0',
        dependencies: { express: '^1.0.0' }
      };

      const deps = parser.extractDependencies(pkg);
      const range = deps.express.version;
      const compatible = SemVer.maxSatisfying(availableVersions, range);

      expect(compatible).toBe('1.5.0');
    });

    it('should handle package with specific version constraints', () => {
      const pkg: PackageJson = {
        name: 'test-pkg',
        version: '1.0.0',
        dependencies: {
          'exact-version': '2.3.4',
          'caret-version': '^2.0.0',
          'tilde-version': '~2.3.0'
        }
      };

      const deps = parser.extractDependencies(pkg);

      expect(SemVer.satisfies('2.3.4', deps['exact-version'].version)).toBe(true);
      expect(SemVer.satisfies('2.5.0', deps['caret-version'].version)).toBe(true);
      expect(SemVer.satisfies('2.3.9', deps['tilde-version'].version)).toBe(true);
    });

    it('should detect version mismatches', () => {
      const required = '^2.0.0';
      const installed = ['1.9.0', '1.5.0'];

      const compatible = installed.some((v) => SemVer.satisfies(v, required));

      expect(compatible).toBe(false);
    });

    it('should sort dependencies by semver', () => {
      const versions = ['2.0.0', '1.5.0', '1.0.0', '1.2.0'];
      const sorted = [...versions].sort((a, b) => SemVer.compare(SemVer.parse(a), SemVer.parse(b)));

      expect(sorted[0]).toBe('1.0.0');
      expect(sorted[sorted.length - 1]).toBe('2.0.0');
    });

    it('should handle complex dependency scenarios', () => {
      // Scenario: express requires 3 versions, find the best match
      const expressVersions = ['4.17.0', '4.18.0', '4.18.2', '5.0.0'];
      const constraint = '^4.17.0';

      const best = SemVer.maxSatisfying(expressVersions, constraint);

      expect(best).toBe('4.18.2');
      expect(SemVer.satisfies(best!, constraint)).toBe(true);
    });

    it('should handle peer dependency resolution', () => {
      const pkg: PackageJson = {
        name: 'react-plugin',
        version: '1.0.0',
        peerDependencies: {
          react: '>=16.0.0 <18.0.0'
        }
      };

      const deps = parser.extractDependencies(pkg);
      const reactDep = deps.react;

      expect(reactDep.type).toBe('peer');
      // Note: Complex ranges like ">=16.0.0 <18.0.0" would need advanced parsing
      // This is a placeholder for future enhancement
    });
  });
});
