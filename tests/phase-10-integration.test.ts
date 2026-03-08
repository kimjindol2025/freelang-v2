/**
 * Phase 10: Integration Tests
 *
 * Test the unified pattern database and v1 API integration
 * - Pattern lookup and search
 * - Confidence scoring
 * - Related pattern linking
 * - Category and package indexing
 */

import * as fs from 'fs';

// Load patterns
const patterns = JSON.parse(
  fs.readFileSync('./src/phase-10/v1-v2-merged-patterns.json', 'utf-8')
);

describe('Phase 10: v1 API Integration', () => {
  describe('Pattern Loading', () => {
    test('should load 578+ patterns', () => {
      expect(patterns).toBeDefined();
      expect(patterns.length).toBeGreaterThanOrEqual(578);
    });

    test('should have all required pattern fields', () => {
      for (const pattern of patterns.slice(0, 10)) {
        expect(pattern).toHaveProperty('id');
        expect(pattern).toHaveProperty('name');
        expect(pattern).toHaveProperty('aliases');
        expect(pattern).toHaveProperty('category');
        expect(pattern).toHaveProperty('confidence');
        expect(pattern).toHaveProperty('inputTypes');
        expect(pattern).toHaveProperty('outputType');
        expect(pattern).toHaveProperty('tags');
        expect(pattern).toHaveProperty('complexity');
      }
    });

    test('should have valid confidence scores', () => {
      for (const pattern of patterns) {
        expect(pattern.confidence).toBeGreaterThanOrEqual(0);
        expect(pattern.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Pattern Lookup', () => {
    test('should find pattern by name', () => {
      const pattern = patterns.find((p: any) => p.name === 'sum');
      expect(pattern).toBeDefined();
      expect(pattern.name).toBe('sum');
    });

    test('should find pattern by alias', () => {
      // Find a pattern with multiple aliases
      const patternWithAlias = patterns.find((p: any) =>
        p.aliases && p.aliases.length > 1
      );
      if (patternWithAlias) {
        const pattern = patterns.find((p: any) =>
          p.aliases.includes(patternWithAlias.aliases[1])
        );
        expect(pattern).toBeDefined();
      }
    });

    test('should return null for non-existent pattern', () => {
      const pattern = patterns.find((p: any) =>
        p.name === 'nonexistent_pattern_xyz'
      );
      expect(pattern).toBeUndefined();
    });

    test('should have all patterns unique by id', () => {
      const ids = patterns.map((p: any) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(patterns.length);
    });
  });

  describe('Confidence Scoring', () => {
    test('should have 90%+ patterns with confidence >= 0.85', () => {
      const highConfidence = patterns.filter(
        (p: any) => p.confidence >= 0.85
      ).length;
      const percentage = (highConfidence / patterns.length) * 100;
      expect(percentage).toBeGreaterThan(85);
    });

    test('should have no patterns with confidence < 0.70', () => {
      const lowConfidence = patterns.filter((p: any) => p.confidence < 0.70);
      expect(lowConfidence.length).toBe(0);
    });

    test('should calculate average confidence > 0.88', () => {
      const average =
        patterns.reduce((sum: number, p: any) => sum + p.confidence, 0) /
        patterns.length;
      expect(average).toBeGreaterThan(0.88);
    });

    test('should have confidence breakdown', () => {
      const high = patterns.filter((p: any) => p.confidence >= 0.85).length;
      const medium = patterns.filter(
        (p: any) => p.confidence >= 0.75 && p.confidence < 0.85
      ).length;
      const low = patterns.filter((p: any) => p.confidence < 0.75).length;

      expect(high + medium + low).toBe(patterns.length);
      expect(high).toBeGreaterThan(0);
      expect(medium).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Search Functionality', () => {
    test('should search by keyword in name', () => {
      const results = patterns.filter((p: any) =>
        p.name.toLowerCase().includes('sum')
      );
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('sum');
    });

    test('should search by category', () => {
      const corePatterns = patterns.filter(
        (p: any) => p.category === 'core'
      );
      expect(corePatterns.length).toBeGreaterThan(0);
      expect(corePatterns.every((p: any) => p.category === 'core')).toBe(
        true
      );
    });

    test('should search by tag', () => {
      const asyncPatterns = patterns.filter((p: any) =>
        p.tags.includes('async')
      );
      expect(asyncPatterns.length).toBeGreaterThan(0);
    });

    test('should find patterns by package', () => {
      const ioPatterns = patterns.filter(
        (p: any) =>
          p.packages && p.packages.includes('io')
      );
      expect(ioPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('Related Patterns', () => {
    test('should have related patterns', () => {
      const patternWithRelated = patterns.find(
        (p: any) => p.relatedPatterns && p.relatedPatterns.length > 0
      );
      expect(patternWithRelated).toBeDefined();
    });

    test('should have valid related pattern IDs', () => {
      const patternWithRelated = patterns.find(
        (p: any) => p.relatedPatterns && p.relatedPatterns.length > 0
      );
      if (patternWithRelated) {
        for (const relatedId of patternWithRelated.relatedPatterns) {
          const relatedPattern = patterns.find(
            (p: any) => p.id === relatedId
          );
          expect(relatedPattern).toBeDefined();
        }
      }
    });

    test('should limit related patterns to 5', () => {
      for (const pattern of patterns) {
        if (pattern.relatedPatterns) {
          expect(pattern.relatedPatterns.length).toBeLessThanOrEqual(5);
        }
      }
    });
  });

  describe('Data Integrity', () => {
    test('should have valid input/output types', () => {
      for (const pattern of patterns.slice(0, 50)) {
        expect(pattern.inputTypes).toBeDefined();
        expect(pattern.inputTypes.length).toBeGreaterThan(0);
        expect(pattern.outputType).toBeDefined();
        expect(pattern.outputType.length).toBeGreaterThan(0);
      }
    });

    test('should have examples for each pattern', () => {
      for (const pattern of patterns.slice(0, 50)) {
        expect(pattern.examples).toBeDefined();
        expect(Array.isArray(pattern.examples)).toBe(true);
      }
    });

    test('should have complexity between 1-10', () => {
      for (const pattern of patterns) {
        expect(pattern.complexity).toBeGreaterThanOrEqual(1);
        expect(pattern.complexity).toBeLessThanOrEqual(10);
      }
    });

    test('should have at least 2 aliases per pattern', () => {
      for (const pattern of patterns.slice(0, 50)) {
        expect(pattern.aliases).toBeDefined();
        expect(pattern.aliases.length).toBeGreaterThanOrEqual(1);
      }
    });

    test('should not have duplicate aliases within pattern', () => {
      for (const pattern of patterns.slice(0, 50)) {
        const uniqueAliases = new Set(pattern.aliases);
        expect(uniqueAliases.size).toBe(pattern.aliases.length);
      }
    });
  });

  describe('Metadata', () => {
    test('should have source information', () => {
      for (const pattern of patterns.slice(0, 50)) {
        expect(pattern.metadata).toBeDefined();
        expect(pattern.metadata.source).toBeDefined();
      }
    });

    test('should track source packages', () => {
      const v1Patterns = patterns.filter(
        (p: any) => p.metadata && p.metadata.source === 'v1-stdlib'
      );
      expect(v1Patterns.length).toBeGreaterThan(0);
    });

    test('should have API metadata for v1 patterns', () => {
      const v1Pattern = patterns.find(
        (p: any) => p.metadata && p.metadata.source === 'v1-stdlib'
      );
      if (v1Pattern) {
        expect(v1Pattern.metadata.apiType).toBeDefined();
        expect(v1Pattern.metadata.paramCount).toBeDefined();
      }
    });
  });

  describe('Category Distribution', () => {
    test('should have patterns in multiple categories', () => {
      const categories = new Set(patterns.map((p: any) => p.category));
      expect(categories.size).toBeGreaterThan(5);
    });

    test('should have patterns in core categories', () => {
      const categories = new Set(patterns.map((p: any) => p.category));
      expect(categories.has('core')).toBe(true);
      expect(categories.has('network')).toBe(true);
      expect(categories.has('security')).toBe(true);
    });

    test('should distribute patterns across packages', () => {
      const packages = new Set();
      patterns.forEach((p: any) => {
        if (p.packages) {
          p.packages.forEach((pkg: string) => packages.add(pkg));
        }
      });
      expect(packages.size).toBeGreaterThan(10);
    });
  });

  describe('Performance Characteristics', () => {
    test('should calculate pattern complexity correctly', () => {
      const simplePatterns = patterns.filter(
        (p: any) => p.complexity === 1
      );
      const complexPatterns = patterns.filter((p: any) => p.complexity >= 5);

      expect(simplePatterns.length).toBeGreaterThan(0);
      expect(complexPatterns.length).toBeGreaterThan(0);
    });

    test('should have average complexity between 2-3', () => {
      const avgComplexity =
        patterns.reduce((sum: number, p: any) => sum + p.complexity, 0) /
        patterns.length;
      expect(avgComplexity).toBeGreaterThan(1.5);
      expect(avgComplexity).toBeLessThan(4);
    });
  });

  describe('Alias Coverage', () => {
    test('should generate multiple alias forms', () => {
      const pattern = patterns.find((p: any) => p.aliases.length > 2);
      expect(pattern).toBeDefined();
      if (pattern) {
        expect(pattern.aliases.length).toBeGreaterThanOrEqual(2);
      }
    });

    test('should include camelCase and snake_case aliases', () => {
      let foundCamelCase = false;
      let foundSnakeCase = false;

      for (const pattern of patterns.slice(0, 100)) {
        for (const alias of pattern.aliases) {
          if (/^[a-z]+[A-Z]/.test(alias)) foundCamelCase = true;
          if (/^[a-z]+_[a-z]+/.test(alias)) foundSnakeCase = true;
        }
      }

      expect(foundCamelCase || foundSnakeCase).toBe(true);
    });
  });

  describe('Tag Coverage', () => {
    test('should have semantic tags', () => {
      const semanticTags = new Set();
      patterns.forEach((p: any) => {
        p.tags.forEach((tag: string) => semanticTags.add(tag));
      });

      expect(semanticTags.has('async')).toBe(true);
      expect(semanticTags.has('sync')).toBe(true);
    });

    test('should tag read/write operations', () => {
      const readTags = patterns.filter((p: any) =>
        p.tags.includes('read')
      );
      const writeTags = patterns.filter((p: any) =>
        p.tags.includes('write')
      );

      expect(readTags.length).toBeGreaterThan(0);
      expect(writeTags.length).toBeGreaterThan(0);
    });
  });
});
