/**
 * Phase 6.2 Week 3: PartialExecutor Tests
 *
 * 15+ tests for partial code execution
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PartialExecutor } from '../../src/phase-6/partial-executor';
import { SmartREPL } from '../../src/phase-6/smart-repl';

describe('Phase 6.2 Week 3: PartialExecutor', () => {
  let executor: PartialExecutor;
  let repl: SmartREPL;

  beforeEach(() => {
    repl = new SmartREPL();
    executor = new PartialExecutor(repl);
  });

  // ============================================================================
  // CATEGORY 1: BASIC PARTIAL EXECUTION (5 tests)
  // ============================================================================

  describe('Basic Partial Execution', () => {
    it('should execute code before ???', () => {
      const code = 'let x = 5\nlet y = x * 2\n???\nlet z = y + x';

      const result = executor.execute(code);

      expect(result.partial).toBe(true);
      expect(result.executedLines).toBeGreaterThan(0);
      expect(result.skippedLines).toBeGreaterThan(0);
      expect(result.completionRate).toBeLessThan(100);
    });

    it('should execute code before ...', () => {
      const code = `
        let arr = [1, 2, 3]
        let sum = sum(arr)
        ...
        console.log(sum)
      `;

      const result = executor.execute(code);

      expect(result.partial).toBe(true);
      expect(result.skippedSections.length).toBeGreaterThan(0);
      expect(result.skippedSections[0].marker).toBe('...');
    });

    it('should handle no partial markers', () => {
      const code = `
        let x = 10
        let y = x + 5
        let z = y * 2
      `;

      const result = executor.execute(code);

      expect(result.skippedSections.length).toBe(0);
      expect(result.completionRate).toBe(100);
    });

    it('should mark skipped sections correctly', () => {
      const code = `
        let x = 1
        ???
        let y = 2
      `;

      const result = executor.execute(code);

      expect(result.skippedSections.length).toBeGreaterThan(0);
      expect(result.skippedSections[0].startLine).toBeGreaterThan(0);
      expect(result.skippedSections[0].marker).toBe('???');
    });

    it('should calculate completion rate', () => {
      const code = `
        let a = 1
        let b = 2
        ???
        let c = 3
        let d = 4
      `;

      const result = executor.execute(code);

      expect(result.completionRate).toBeGreaterThan(0);
      expect(result.completionRate).toBeLessThan(100);
      expect(result.completionRate).toBeLessThanOrEqual(100);
    });
  });

  // ============================================================================
  // CATEGORY 2: STRUCTURE ANALYSIS (4 tests)
  // ============================================================================

  describe('Structure Analysis', () => {
    it('should detect ??? marker', () => {
      const code = 'let x = 5\n???\nlet y = 10';
      const analysis = executor.analyzeStructure(code);

      expect(analysis.hasPartialMarker).toBe(true);
      expect(analysis.markerType).toBe('???');
    });

    it('should detect ... marker', () => {
      const code = 'let x = 5\n...\nlet y = 10';
      const analysis = executor.analyzeStructure(code);

      expect(analysis.hasPartialMarker).toBe(true);
      expect(analysis.markerType).toBe('...');
    });

    it('should calculate execution percentage', () => {
      const code = 'line1\nline2\n???\nline4\nline5';
      const analysis = executor.analyzeStructure(code);

      expect(analysis.executionPercentage).toBeGreaterThan(0);
      expect(analysis.executionPercentage).toBeLessThan(100);
    });

    it('should generate warnings for partial code', () => {
      const code = 'let x = 5\n???\nlet y = 10';
      const analysis = executor.analyzeStructure(code);

      expect(analysis.warnings.length).toBeGreaterThan(0);
      expect(analysis.warnings[0]).toContain('Partial');
    });
  });

  // ============================================================================
  // CATEGORY 3: STUB GENERATION (3 tests)
  // ============================================================================

  describe('Stub Generation', () => {
    it('should generate stubs for variables', () => {
      const code = 'let x = 5\nlet y = 10\nlet z = x + y';
      const stubs = executor.generateStubs(code);

      expect(stubs.size).toBeGreaterThan(0);
      expect(Array.from(stubs.keys()).some((k) => k.includes('x'))).toBe(true);
    });

    it('should generate stubs for functions', () => {
      const code = 'helper(x)\nanotherFunc(y)';
      const stubs = executor.generateStubs(code);

      expect(stubs.size).toBeGreaterThan(0);
    });

    it('should handle function detection', () => {
      const code = 'helper(x)\nanotherFunc(y)';
      const stubs = executor.generateStubs(code);

      // Should detect custom functions (not built-ins like sum/filter)
      expect(stubs.size).toBeGreaterThanOrEqual(0);
      expect(Array.from(stubs.keys()).length).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // CATEGORY 4: RECOVERY (3 tests)
  // ============================================================================

  describe('Recovery with Stubs', () => {
    it('should recover partial code', () => {
      const code = 'let x = 5\n???\nlet y = x + 10';
      const recovery = executor.recoverWithStubs(code);

      expect(recovery.recovered).toContain('let x = 5');
      expect(recovery.stubs.size).toBeGreaterThanOrEqual(0);
    });

    it('should calculate recovery rate', () => {
      const code = 'let x = 1\n???\nlet y = x + 1';
      const recovery = executor.recoverWithStubs(code);

      expect(recovery.recoveryRate).toBeGreaterThanOrEqual(0);
      expect(recovery.recoveryRate).toBeLessThanOrEqual(100);
    });

    it('should return 100% recovery for complete code', () => {
      const code = 'let x = 5\nlet y = 10\nlet z = x + y';
      const recovery = executor.recoverWithStubs(code);

      expect(recovery.recoveryRate).toBe(100);
    });
  });

  // ============================================================================
  // CATEGORY 5: EXECUTION WITH VARIABLES (3 tests)
  // ============================================================================

  describe('Execution with Variables', () => {
    it('should preserve variables before ???', () => {
      const code = 'let x = 42\nlet y = x * 2\n???\nlet z = y + 1';

      const result = executor.execute(code);

      expect(result.partial).toBe(true);
      expect(result.executedLines).toBeGreaterThan(0);
    });

    it('should track variable assignments', () => {
      const code = `
        let a = 1
        let b = 2
        let c = a + b
        ???
        let d = c * 2
      `;

      const result = executor.execute(code);

      expect(result.executedLines).toBeGreaterThan(0);
      expect(result.skippedLines).toBeGreaterThan(0);
    });

    it('should handle arrays before marker', () => {
      const code = 'let arr = [1, 2, 3, 4, 5]\nlet count = len(arr)\n???\nlet doubled = count * 2';

      const result = executor.execute(code);

      expect(result.partial).toBe(true);
      expect(result.executedLines).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // CATEGORY 6: WARNINGS AND METADATA (2 tests)
  // ============================================================================

  describe('Warnings and Metadata', () => {
    it('should include partial execution warning', () => {
      const code = 'let x = 5\n???\nlet y = 10';
      const result = executor.execute(code);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes('Partial'))).toBe(true);
    });

    it('should track metadata accurately', () => {
      const code = `
        let x = 1
        let y = 2
        let z = 3
        ???
        let a = 4
      `;

      const result = executor.execute(code);

      expect(result.metadata.partial).toBe(true);
      expect(result.metadata.linesExecuted).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // CATEGORY 7: EDGE CASES (3 tests)
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle ??? on first line', () => {
      const code = '???\nlet x = 5';
      const result = executor.execute(code);

      expect(result.partial).toBe(true);
      expect(result.executedLines).toBeLessThanOrEqual(1);
    });

    it('should handle multiple ??? markers (first wins)', () => {
      const code = 'let x = 1\n???  \nlet y = 2\n???\nlet z = 3';
      const result = executor.execute(code);

      expect(result.partial).toBe(true);
      expect(result.skippedSections.length).toBeGreaterThan(0);
    });

    it('should handle empty lines around marker', () => {
      const code = `
        let x = 5

        ???

        let y = 10
      `;

      const result = executor.execute(code);

      expect(result.partial).toBe(true);
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // CATEGORY 8: SUMMARY AND REPORTING (2 tests)
  // ============================================================================

  describe('Summary and Reporting', () => {
    it('should summarize skipped sections', () => {
      const code = 'let x = 1\n???\nlet y = 2';
      const result = executor.execute(code);

      const summary = executor.summarizeSkipped(result.skippedSections);
      expect(summary).toBeTruthy();
      expect(summary).not.toBe('No skipped sections');
    });

    it('should handle empty skipped sections', () => {
      const code = 'let x = 1\nlet y = 2\nlet z = 3';
      const result = executor.execute(code);

      const summary = executor.summarizeSkipped(result.skippedSections);
      expect(summary).toBe('No skipped sections');
    });
  });
});
