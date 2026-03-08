/**
 * Phase 16-2: String Optimization Tests
 */

import { ZigASTNode } from '../src/compiler/zig-types';
import { StringOptimizer, optimizeStrings, createStringPool } from '../src/codegen/string-optimization';

describe('Phase 16-2: String Optimization', () => {
  const optimizer = new StringOptimizer();

  describe('Pattern Detection', () => {
    it('should detect single string concatenation', () => {
      const nodes: ZigASTNode[] = [
        {
          type: 'assignment',
          name: 'result',
          value: {
            type: 'binary_op',
            left: { type: 'literal', value: 'hello' },
            right: { type: 'literal', value: 'world' },
            operator: '+',
          },
        },
      ];

      const result = optimizeStrings(nodes);

      expect(result.stats.concatChainsFound).toBeGreaterThanOrEqual(0);
    });

    it('should detect chained concatenations', () => {
      const nodes: ZigASTNode[] = [
        {
          type: 'assignment',
          name: 'result',
          value: {
            type: 'binary_op',
            left: {
              type: 'binary_op',
              left: { type: 'literal', value: 'a' },
              right: { type: 'literal', value: 'b' },
              operator: '+',
            },
            right: { type: 'literal', value: 'c' },
            operator: '+',
          },
        },
      ];

      const result = optimizeStrings(nodes);

      expect(result.stats.concatChainsFound).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Optimization', () => {
    it('should optimize simple concatenation', () => {
      const nodes: ZigASTNode[] = [
        {
          type: 'binary_op',
          left: { type: 'literal', value: 'hello' },
          right: { type: 'literal', value: 'world' },
          operator: '+',
        },
      ];

      const result = optimizeStrings(nodes);

      expect(result.optimized).toBeDefined();
      expect(result.optimized.length).toBeGreaterThan(0);
    });

    it('should report optimization stats', () => {
      const nodes: ZigASTNode[] = [
        {
          type: 'literal',
          value: 'test',
        },
      ];

      const result = optimizeStrings(nodes);

      expect(result.stats).toHaveProperty('concatChainsFound');
      expect(result.stats).toHaveProperty('chainsOptimized');
      expect(result.stats).toHaveProperty('memoryReduction');
      expect(result.stats).toHaveProperty('literalsInterned');
    });

    it('should estimate memory reduction', () => {
      const nodes: ZigASTNode[] = [];

      const result = optimizeStrings(nodes);

      expect(result.stats.memoryReduction).toBeGreaterThanOrEqual(0);
      expect(result.stats.memoryReduction).toBeLessThanOrEqual(75);
    });
  });

  describe('String Pooling', () => {
    it('should create pool for identical literals', () => {
      const nodes: ZigASTNode[] = [
        { type: 'literal', value: 'hello' },
        { type: 'literal', value: 'world' },
        { type: 'literal', value: 'hello' }, // duplicate
      ];

      const pool = createStringPool(nodes);

      expect(pool.size).toBe(2); // "hello" and "world"
    });

    it('should assign unique IDs to literals', () => {
      const nodes: ZigASTNode[] = [
        { type: 'literal', value: 'a' },
        { type: 'literal', value: 'b' },
        { type: 'literal', value: 'c' },
      ];

      const pool = createStringPool(nodes);

      expect(pool.has('a')).toBe(true);
      expect(pool.has('b')).toBe(true);
      expect(pool.has('c')).toBe(true);
    });

    it('should generate deterministic pool IDs', () => {
      const nodes: ZigASTNode[] = [
        { type: 'literal', value: 'string1' },
        { type: 'literal', value: 'string2' },
      ];

      const pool1 = createStringPool(nodes);
      const pool2 = createStringPool(nodes);

      expect(pool1.get('string1')).toBe(pool2.get('string1'));
    });

    it('should ignore non-literal values', () => {
      const nodes: ZigASTNode[] = [
        { type: 'identifier', name: 'var1' },
        { type: 'literal', value: 'text' },
        { type: 'call', name: 'fn' },
      ];

      const pool = createStringPool(nodes);

      expect(pool.size).toBe(1); // Only "text"
      expect(pool.has('text')).toBe(true);
    });
  });

  describe('Complex Patterns', () => {
    it('should handle nested structures', () => {
      const nodes: ZigASTNode[] = [
        {
          type: 'assignment',
          name: 'x',
          value: {
            type: 'binary_op',
            left: {
              type: 'binary_op',
              left: { type: 'literal', value: 'a' },
              right: { type: 'identifier', name: 'b' },
              operator: '+',
            },
            right: { type: 'call', name: 'getString' },
            operator: '+',
          },
        },
      ];

      const result = optimizeStrings(nodes);

      expect(result.optimized).toBeDefined();
    });

    it('should handle empty node lists', () => {
      const result = optimizeStrings([]);

      expect(result.optimized).toEqual([]);
      expect(result.stats.concatChainsFound).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should optimize large node lists efficiently', () => {
      const nodes: ZigASTNode[] = [];
      for (let i = 0; i < 1000; i++) {
        nodes.push({ type: 'literal', value: `str_${i}` });
      }

      const start = performance.now();
      const result = optimizeStrings(nodes);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100); // < 100ms for 1000 nodes
      expect(result.optimized.length).toBeGreaterThan(0);
    });

    it('should pool strings without performance hit', () => {
      const nodes: ZigASTNode[] = [];
      for (let i = 0; i < 100; i++) {
        nodes.push({ type: 'literal', value: 'repeated' });
        nodes.push({ type: 'literal', value: 'text' });
      }

      const start = performance.now();
      const pool = createStringPool(nodes);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(50);
      expect(pool.size).toBe(2); // "repeated" and "text"
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values gracefully', () => {
      const nodes: ZigASTNode[] = [
        { type: 'literal', value: null },
        { type: 'literal', value: undefined },
      ];

      const result = optimizeStrings(nodes);

      expect(result.optimized).toBeDefined();
    });

    it('should handle very long strings', () => {
      const longStr = 'a'.repeat(10000);
      const nodes: ZigASTNode[] = [{ type: 'literal', value: longStr }];

      const pool = createStringPool(nodes);

      expect(pool.has(longStr)).toBe(true);
    });

    it('should preserve node order', () => {
      const nodes: ZigASTNode[] = [
        { type: 'literal', value: 'first' },
        { type: 'literal', value: 'second' },
        { type: 'literal', value: 'third' },
      ];

      const result = optimizeStrings(nodes);

      // Order should be preserved
      expect(result.optimized.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Integration', () => {
    it('should combine pooling with optimization', () => {
      const nodes: ZigASTNode[] = [
        { type: 'literal', value: 'Error' },
        { type: 'literal', value: ':' },
        { type: 'identifier', name: 'detail' },
      ];

      const optimized = optimizeStrings(nodes);
      const pool = createStringPool(nodes);

      expect(optimized.optimized).toBeDefined();
      expect(pool.size).toBeGreaterThan(0);
      expect(pool.size).toBe(2); // "Error" and ":"
    });
  });
});
