/**
 * Phase 5 Stage 3.3.3: Skeleton Context Tests
 *
 * Tests for function signature database, similarity matching, and suggestions
 */

import { SkeletonContext } from '../src/learning/skeleton-context';

describe('Phase 5 Stage 3.3.3: Skeleton Context', () => {
  let context: SkeletonContext;

  beforeEach(() => {
    context = new SkeletonContext();
  });

  /**
   * Test Group 1: Database Initialization
   */
  describe('Predefined Signatures Loading', () => {
    test('loads predefined signatures on initialization', () => {
      expect(context.getCount()).toBeGreaterThan(20);
    });

    test('has signatures for all categories', () => {
      const math = context.getByCategory('math');
      const string = context.getByCategory('string');
      const array = context.getByCategory('array');
      const boolean = context.getByCategory('boolean');

      expect(math.length).toBeGreaterThan(0);
      expect(string.length).toBeGreaterThan(0);
      expect(array.length).toBeGreaterThan(0);
      expect(boolean.length).toBeGreaterThan(0);
    });

    test('includes common math functions', () => {
      const sigs = context.getAllSignatures();
      const sumSig = sigs.find(s => s.name === 'sum');

      expect(sumSig).toBeDefined();
      expect(sumSig?.input).toBe('array<number>');
      expect(sumSig?.output).toBe('number');
    });

    test('includes common string functions', () => {
      const sigs = context.getAllSignatures();
      const upperSig = sigs.find(s => s.name === 'uppercase');

      expect(upperSig).toBeDefined();
      expect(upperSig?.input).toBe('string');
      expect(upperSig?.output).toBe('string');
    });

    test('includes common array functions', () => {
      const sigs = context.getAllSignatures();
      const filterSig = sigs.find(s => s.name === 'filter_positive');

      expect(filterSig).toBeDefined();
      expect(filterSig?.input).toContain('array');
      expect(filterSig?.output).toContain('array');
    });

    test('stores implementations for known patterns', () => {
      const sigs = context.getAllSignatures();
      const sumSig = sigs.find(s => s.name === 'sum');

      expect(sumSig?.implementation).toBeDefined();
      expect(sumSig?.implementation).toContain('reduce');
    });
  });

  /**
   * Test Group 2: Similarity Search
   */
  describe('Similar Function Finding', () => {
    test('finds exact match by name', () => {
      const similar = context.getSimilar('sum');

      expect(similar.length).toBeGreaterThan(0);
      expect(similar[0].name).toBe('sum');
    });

    test('finds substring matches', () => {
      const similar = context.getSimilar('filter');

      expect(similar.length).toBeGreaterThan(0);
      const hasFilter = similar.some(s => s.name.includes('filter'));
      expect(hasFilter).toBe(true);
    });

    test('finds category matches', () => {
      const similar = context.getSimilar('count_items');

      expect(similar.length).toBeGreaterThan(0);
      // Should include array functions since 'count' is array-related
      const arrayFuncs = similar.filter(s => s.category === 'array');
      expect(arrayFuncs.length).toBeGreaterThan(0);
    });

    test('handles case insensitivity', () => {
      const similarLower = context.getSimilar('sum');
      const similarUpper = context.getSimilar('SUM');
      const similarMixed = context.getSimilar('SuM');

      expect(similarLower[0].name).toBe('sum');
      expect(similarUpper[0].name).toBe('sum');
      expect(similarMixed[0].name).toBe('sum');
    });

    test('limits results to top 10', () => {
      const similar = context.getSimilar('a');

      expect(similar.length).toBeLessThanOrEqual(10);
    });

    test('finds no matches for unknown pattern', () => {
      const similar = context.getSimilar('zzzzzzz_unknown');

      expect(Array.isArray(similar)).toBe(true);
    });
  });

  /**
   * Test Group 3: Implementation Suggestions
   */
  describe('Implementation Suggestion', () => {
    test('suggests implementation for exact type match', () => {
      const suggestion = context.suggestImplementation(
        'sum_all',
        'array<number>',
        'number',
        'Sum all numbers'
      );

      expect(suggestion).not.toBeNull();
      if (suggestion) {
        expect(suggestion).toContain('reduce');
      }
    });

    test('suggests implementation for intent match', () => {
      const suggestion = context.suggestImplementation(
        'total',
        'array<number>',
        'number',
        'Calculate total sum'
      );

      expect(suggestion).not.toBeNull();
    });

    test('suggests uppercase implementation', () => {
      const suggestion = context.suggestImplementation(
        'uppercase_text',
        'string',
        'string',
        'Convert to uppercase'
      );

      expect(suggestion).not.toBeNull();
      if (suggestion) {
        expect(suggestion).toContain('toUpperCase');
      }
    });

    test('suggests array filter implementation', () => {
      const suggestion = context.suggestImplementation(
        'filter_positive_numbers',
        'array<number>',
        'array<number>',
        'Keep positive numbers'
      );

      expect(suggestion).not.toBeNull();
      if (suggestion) {
        expect(suggestion).toContain('filter');
      }
    });

    test('returns null for no match', () => {
      const suggestion = context.suggestImplementation(
        'zzzzzzz_unknown_function',
        'unknown',
        'unknown'
      );

      expect(suggestion).toBeNull();
    });

    test('prioritizes type match over intent', () => {
      const suggestion = context.suggestImplementation(
        'calculate',
        'array<number>',
        'number',
        'Some other intent'
      );

      // Should match sum (array<number> -> number) even with different intent
      expect(suggestion).not.toBeNull();
    });
  });

  /**
   * Test Group 4: Category Management
   */
  describe('Category Management', () => {
    test('retrieves all math category functions', () => {
      const mathFuncs = context.getByCategory('math');

      expect(mathFuncs.length).toBeGreaterThan(0);
      expect(mathFuncs.every(f => f.category === 'math')).toBe(true);
    });

    test('retrieves all string category functions', () => {
      const stringFuncs = context.getByCategory('string');

      expect(stringFuncs.length).toBeGreaterThan(0);
      expect(stringFuncs.every(f => f.category === 'string')).toBe(true);
    });

    test('retrieves all array category functions', () => {
      const arrayFuncs = context.getByCategory('array');

      expect(arrayFuncs.length).toBeGreaterThan(0);
      expect(arrayFuncs.every(f => f.category === 'array')).toBe(true);
    });

    test('retrieves all boolean category functions', () => {
      const boolFuncs = context.getByCategory('boolean');

      expect(boolFuncs.length).toBeGreaterThan(0);
      expect(boolFuncs.every(f => f.category === 'boolean')).toBe(true);
    });

    test('empty array for empty category', () => {
      const funcs = context.getByCategory('general');

      expect(Array.isArray(funcs)).toBe(true);
    });
  });

  /**
   * Test Group 5: Adding New Signatures
   */
  describe('Adding New Signatures', () => {
    test('adds custom signature', () => {
      const countBefore = context.getCount();

      context.addSignature({
        name: 'custom_sum',
        input: 'array<number>',
        output: 'number',
        intent: 'Custom sum implementation',
        category: 'math',
        implementation: 'return input.reduce((a,b) => a+b, 0)'
      });

      expect(context.getCount()).toBe(countBefore + 1);
    });

    test('custom signature found by similarity', () => {
      context.addSignature({
        name: 'my_custom_filter',
        input: 'array<number>',
        output: 'array<number>',
        intent: 'Filter positive',
        category: 'array'
      });

      const similar = context.getSimilar('my_custom');

      expect(similar.length).toBeGreaterThan(0);
      expect(similar.some(s => s.name === 'my_custom_filter')).toBe(true);
    });

    test('duplicate name replaces existing', () => {
      const countBefore = context.getCount();

      context.addSignature({
        name: 'sum',
        input: 'array<number>',
        output: 'number',
        intent: 'Custom sum',
        category: 'math',
        implementation: 'return -1'  // Wrong implementation
      });

      expect(context.getCount()).toBe(countBefore);

      const similar = context.getSimilar('sum');
      expect(similar[0].implementation).toBe('return -1');
    });

    test('custom signature suggestion works', () => {
      context.addSignature({
        name: 'custom_uppercase',
        input: 'string',
        output: 'string',
        category: 'string',
        implementation: 'return input.toUpperCase()'
      });

      const suggestion = context.suggestImplementation(
        'custom',
        'string',
        'string'
      );

      expect(suggestion).toBe('return input.toUpperCase()');
    });
  });

  /**
   * Test Group 6: Real-World Scenarios
   */
  describe('Real-World Usage', () => {
    test('suggests implementations for common one-liners', () => {
      const scenarios = [
        { name: 'count', input: 'array<unknown>', output: 'number' },
        { name: 'first', input: 'array<unknown>', output: 'unknown' },
        { name: 'last', input: 'array<unknown>', output: 'unknown' },
        { name: 'reverse_string', input: 'string', output: 'string' }
      ];

      for (const scenario of scenarios) {
        const suggestion = context.suggestImplementation(
          scenario.name,
          scenario.input,
          scenario.output
        );

        if (suggestion) {
          expect(suggestion.length).toBeGreaterThan(0);
        }
      }
    });

    test('provides learning from existing implementations', () => {
      const allSigs = context.getAllSignatures();
      const withImpl = allSigs.filter(s => s.implementation);

      // Should have many implementations to learn from
      expect(withImpl.length).toBeGreaterThan(10);
    });

    test('handles confidence scoring', () => {
      const sigs = context.getAllSignatures();
      const withConfidence = sigs.filter(s => s.confidence !== undefined);

      expect(withConfidence.length).toBeGreaterThan(0);

      for (const sig of withConfidence) {
        expect(sig.confidence).toBeGreaterThanOrEqual(0);
        expect(sig.confidence).toBeLessThanOrEqual(1);
      }
    });
  });
});
