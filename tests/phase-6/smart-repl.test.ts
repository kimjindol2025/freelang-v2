/**
 * Phase 6.2 Week 2: SmartREPL Tests
 *
 * 20+ comprehensive tests:
 * - Basic execution (5)
 * - Variables (4)
 * - Functions (5)
 * - Partial execution (3)
 * - Performance metrics (3)
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { SmartREPL, ExecutionResult } from '../../src/phase-6/smart-repl';

describe('Phase 6.2 Week 2: SmartREPL', () => {
  let repl: SmartREPL;

  beforeEach(() => {
    repl = new SmartREPL();
  });

  // ============================================================================
  // CATEGORY 1: BASIC EXECUTION (5 tests)
  // ============================================================================

  describe('Basic Execution', () => {
    it('should execute simple number literal', () => {
      const result = repl.execute('42');

      expect(result.success).toBe(true);
      expect(result.result).toBe(42);
      expect(result.type).toBe('number');
      expect(result.executionTime).toBeLessThan(100);
    });

    it('should execute simple arithmetic', () => {
      const result = repl.execute('2 + 3 * 4');

      expect(result.success).toBe(true);
      expect(result.result).toBe(14);
      expect(result.type).toBe('number');
    });

    it('should execute string literal', () => {
      const result = repl.execute('"hello world"');

      expect(result.success).toBe(true);
      expect(result.result).toBe('hello world');
      expect(result.type).toBe('string');
    });

    it('should execute array literal', () => {
      const result = repl.execute('[1, 2, 3, 4, 5]');

      expect(result.success).toBe(true);
      expect(Array.isArray(result.result)).toBe(true);
      expect(result.result.length).toBe(5);
      expect(result.type).toContain('array');
    });

    it('should return undefined for empty input', () => {
      const result = repl.execute('');

      expect(result.success).toBe(true);
      expect(result.result).toBeUndefined();
    });
  });

  // ============================================================================
  // CATEGORY 2: VARIABLE ASSIGNMENT (4 tests)
  // ============================================================================

  describe('Variable Assignment', () => {
    it('should assign and store variable', () => {
      const result = repl.execute('let x = 42');

      expect(result.success).toBe(true);
      expect(result.result).toBe(42);

      const variables = repl.getVariables();
      expect(variables.get('x')).toBe(42);
    });

    it('should support reassignment', () => {
      repl.execute('let x = 5');
      const result = repl.execute('x = 10');

      expect(result.success).toBe(true);
      expect(repl.getVariables().get('x')).toBe(10);
    });

    it('should assign array to variable', () => {
      const result = repl.execute('let arr = [10, 20, 30]');

      expect(result.success).toBe(true);
      expect(Array.isArray(result.result)).toBe(true);
      expect(result.result.length).toBe(3);
    });

    it('should infer type correctly for assignment', () => {
      const result = repl.execute('let x = [1, 2, 3]');

      expect(result.type).toContain('array');
      expect(result.type).toContain('number');
    });
  });

  // ============================================================================
  // CATEGORY 3: BUILT-IN FUNCTIONS (5 tests)
  // ============================================================================

  describe('Built-in Functions', () => {
    it('should execute sum function', () => {
      const result = repl.execute('sum([1, 2, 3, 4, 5])');

      expect(result.success).toBe(true);
      expect(result.result).toBe(15);
    });

    it('should execute basic operations on arrays', () => {
      const result = repl.execute('[1, 2, 3, 4, 5]');

      expect(result.success).toBe(true);
      expect(Array.isArray(result.result)).toBe(true);
      expect(result.result.length).toBe(5);
    });

    it('should execute len function', () => {
      const result = repl.execute('len([1, 2, 3, 4, 5])');

      expect(result.success).toBe(true);
      expect(result.result).toBe(5);
    });

    it('should handle array operations', () => {
      repl.execute('let arr = [1, 2, 3, 4, 5]');
      const result = repl.execute('len(arr)');

      expect(result.success).toBe(true);
      expect(result.result).toBe(5);
    });

  });

  // ============================================================================
  // CATEGORY 4: PARTIAL EXECUTION (3 tests)
  // ============================================================================

  describe('Partial Execution', () => {
    it('should execute code before ???', () => {
      const code = `
        let x = 5
        let y = x * 2
        ???
        let z = y + x
      `;

      const result = repl.execute(code);

      expect(result.success).toBe(true);
      expect(result.metadata.partial).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should mark partial execution in warnings', () => {
      const result = repl.execute('let x = 5\n???\nlet y = 10');

      expect(result.metadata.partial).toBe(true);
      expect(result.warnings.some(w => w.includes('Partial'))).toBe(true);
    });

    it('should execute code before ...', () => {
      const code = `
        let items = [1, 2, 3]
        let filtered = filter(items, x => x > 1)
        ...
      `;

      const result = repl.execute(code);

      expect(result.success).toBe(true);
      expect(result.metadata.partial).toBe(true);
    });
  });

  // ============================================================================
  // CATEGORY 5: TYPE INFERENCE (4 tests)
  // ============================================================================

  describe('Type Inference', () => {
    it('should infer number type', () => {
      const result = repl.execute('42');
      expect(result.type).toBe('number');
    });

    it('should infer string type', () => {
      const result = repl.execute('"text"');
      expect(result.type).toBe('string');
    });

    it('should infer array<number> type', () => {
      const result = repl.execute('[1, 2, 3]');
      expect(result.type).toBe('array<number>');
    });

    it('should infer empty array type', () => {
      const result = repl.execute('[]');
      expect(result.type).toBe('array<unknown>');
    });
  });

  // ============================================================================
  // CATEGORY 6: PERFORMANCE METRICS (3 tests)
  // ============================================================================

  describe('Performance Metrics', () => {
    it('should measure execution time', () => {
      const result = repl.execute('sum([1, 2, 3, 4, 5])');

      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.executionTime).toBeLessThan(100);
      console.log(`⚡ Execution time: ${result.executionTime.toFixed(2)}ms`);
    });

    it('should estimate memory usage', () => {
      const result = repl.execute('[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]');

      expect(result.memory).toBeGreaterThanOrEqual(0);
      console.log(`💾 Memory used: ${result.memory} bytes`);
    });

    it('should track metadata', () => {
      const result = repl.execute('let x = 5\nlet y = 10\nlet z = x + y');

      expect(result.metadata.linesExecuted).toBeGreaterThan(0);
      expect(result.metadata.statementsExecuted).toBeGreaterThan(0);
      expect(result.metadata.partial).toBe(false);
    });
  });

  // ============================================================================
  // CATEGORY 7: ERROR HANDLING (3 tests)
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle syntax errors gracefully', () => {
      const result = repl.execute('sum([1, 2, 3)'); // missing ]

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should handle undefined variable', () => {
      const result = repl.execute('undefinedVar + 5');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should handle division by zero', () => {
      const result = repl.execute('10 / 0');

      // JavaScript allows Infinity
      expect(result.success).toBe(true);
      expect(isFinite(result.result) || result.result === Infinity).toBe(true);
    });
  });

  // ============================================================================
  // CATEGORY 8: HISTORY & STATE (3 tests)
  // ============================================================================

  describe('History & State', () => {
    it('should track execution history', () => {
      repl.execute('let x = 5');
      repl.execute('let y = 10');
      repl.execute('x + y');

      const history = repl.getHistory();
      expect(history.length).toBe(3);
      expect(history[0].code).toContain('x = 5');
    });

    it('should return state information', () => {
      repl.execute('let x = 5');
      repl.execute('let y = 10');

      const state = repl.getState();
      expect(state.history).toBe(2);
      expect(state.variables).toBe(2);
    });

    it('should clear history', () => {
      repl.execute('let x = 5');
      repl.getHistory(); // 1 item

      repl.clear();

      expect(repl.getHistory().length).toBe(0);
      expect(repl.getVariables().size).toBe(0);
    });
  });

  // ============================================================================
  // CATEGORY 9: COMPLEX OPERATIONS (3 tests)
  // ============================================================================

  describe('Complex Operations', () => {
    it('should support arithmetic on variables', () => {
      repl.execute('let x = 10');
      repl.execute('let y = 20');
      const result = repl.execute('x + y');

      expect(result.success).toBe(true);
      expect(result.result).toBe(30);
    });

    it('should handle sum of array elements', () => {
      repl.execute('let numbers = [1, 2, 3, 4, 5]');
      const result = repl.execute('sum(numbers)');

      expect(result.success).toBe(true);
      expect(result.result).toBe(15);
    });

    it('should track multiple variable assignments', () => {
      repl.execute('let a = 5');
      repl.execute('let b = 10');
      repl.execute('let c = a + b');
      const result = repl.execute('c * 2');

      expect(result.success).toBe(true);
      expect(result.result).toBe(30);
    });
  });

  // ============================================================================
  // CATEGORY 10: PERFORMANCE (2 tests)
  // ============================================================================

  describe('Performance', () => {
    it('should execute code in < 10ms', () => {
      const start = performance.now();

      repl.execute('sum([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])');

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(10);
      console.log(`⚡ SmartREPL execution: ${duration.toFixed(2)}ms`);
    });

    it('should handle 100 consecutive executions quickly', () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        repl.execute(`sum([${i}, ${i + 1}, ${i + 2}])`);
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500); // < 5ms per execution
      console.log(`⚡ 100 executions: ${duration.toFixed(2)}ms (avg: ${(duration / 100).toFixed(2)}ms)`);
    });
  });
});
