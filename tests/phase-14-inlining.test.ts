/**
 * Phase 14.3: Inlining Optimizer Tests
 *
 * Test function inlining optimization
 */

import { Op, Inst } from '../src/types';
import {
  shouldInline,
  estimateCodeSize,
  estimateCallFrequency,
  FreeLangFunction,
} from '../src/phase-14-llvm/inlining';

describe('Phase 14.3: Inlining Optimizer', () => {
  describe('Code Size Estimation', () => {
    it('should estimate code size correctly', () => {
      const funcs = new Map<string, FreeLangFunction>();
      funcs.set('simple', {
        name: 'simple',
        args: ['x'],
        instrs: [
          { op: Op.LOAD, arg: 0 },
          { op: Op.RET, arg: undefined },
        ],
      });

      const size = estimateCodeSize(funcs, 'simple');
      expect(size).toBe(2);
    });

    it('should handle large functions', () => {
      const funcs = new Map<string, FreeLangFunction>();
      const instrs: Inst[] = [];
      for (let i = 0; i < 300; i++) {
        instrs.push({ op: Op.PUSH, arg: i });
      }

      funcs.set('large', {
        name: 'large',
        args: [],
        instrs,
      });

      const size = estimateCodeSize(funcs, 'large');
      expect(size).toBe(300);
    });
  });

  describe('Call Frequency Estimation', () => {
    it('should estimate frequency for non-loop calls', () => {
      const freq = estimateCallFrequency(1, false);
      expect(freq).toBe(1);
    });

    it('should estimate higher frequency for loop calls', () => {
      const freqNoLoop = estimateCallFrequency(1, false);
      const freqLoop = estimateCallFrequency(1, true);

      expect(freqLoop).toBeGreaterThan(freqNoLoop);
    });

    it('should increase frequency with loop depth', () => {
      const freq1 = estimateCallFrequency(1, true);
      const freq2 = estimateCallFrequency(2, true);

      expect(freq2).toBeGreaterThan(freq1);
    });
  });

  describe('Inlining Heuristics', () => {
    it('should inline very small functions', () => {
      const shouldInlineSmall = shouldInline(
        10, // size
        1, // frequency
        false, // recursive
        false // inLoop
      );

      expect(shouldInlineSmall).toBe(true);
    });

    it('should not inline large functions', () => {
      const shouldInlineLarge = shouldInline(
        300, // size > 225
        1, // frequency
        false, // recursive
        false // inLoop
      );

      expect(shouldInlineLarge).toBe(false);
    });

    it('should not inline recursive functions', () => {
      const shouldInlineRecursive = shouldInline(
        50, // size
        100, // frequency
        true, // recursive
        false // inLoop
      );

      expect(shouldInlineRecursive).toBe(false);
    });

    it('should inline high-frequency calls', () => {
      const shouldInlineHighFreq = shouldInline(
        100, // size
        200, // frequency > 100
        false, // recursive
        false // inLoop
      );

      expect(shouldInlineHighFreq).toBe(true);
    });

    it('should inline small functions in loops', () => {
      const shouldInlineLoopSmall = shouldInline(
        100, // size
        1, // frequency
        false, // recursive
        true, // inLoop
        1 // loopDepth
      );

      expect(shouldInlineLoopSmall).toBe(true);
    });

    it('should not inline large functions even in loops', () => {
      const shouldInlineLoopLarge = shouldInline(
        200, // size
        1, // frequency
        false, // recursive
        true, // inLoop
        1 // loopDepth
      );

      expect(shouldInlineLoopLarge).toBe(false);
    });

    it('should adjust threshold for nested loops', () => {
      // With depth=1: threshold = 225/(1+1) = 112.5, size=50 < 112.5 → true
      const shouldInlineDepth1 = shouldInline(
        50, // size
        1, // frequency
        false, // recursive
        true, // inLoop
        1 // loopDepth
      );

      // With depth=5: threshold = 225/(5+1) = 37.5, size=50 > 37.5 → false
      const shouldInlineDepth5 = shouldInline(
        50, // size
        1, // frequency
        false, // recursive
        true, // inLoop
        5 // loopDepth
      );

      // Threshold decreases with loop depth
      expect(shouldInlineDepth1).toBe(true);
      expect(shouldInlineDepth5).toBe(false);
    });
  });

  describe('Inlining Decisions', () => {
    it('should inline utility functions', () => {
      // max(a, b) - simple 10 instruction function
      const shouldInline1 = shouldInline(10, 1, false, false);
      expect(shouldInline1).toBe(true);
    });

    it('should inline frequently-called helpers', () => {
      // is_prime(n) - 50 instructions, called in loop
      const shouldInline2 = shouldInline(50, 100, false, true);
      expect(shouldInline2).toBe(true);
    });

    it('should not inline complex functions', () => {
      // matrix_multiply - 500 instructions
      const shouldInline3 = shouldInline(500, 50, false, true);
      expect(shouldInline3).toBe(false);
    });

    it('should not inline recursive helpers', () => {
      // factorial(n) - 30 instructions, recursive
      const shouldInline4 = shouldInline(30, 100, true, false);
      expect(shouldInline4).toBe(false);
    });
  });

  describe('Boundary Cases', () => {
    it('should handle size == threshold', () => {
      const size = 225;
      const result = shouldInline(size, 1, false, false);
      expect(result).toBe(false); // size > 225 requirement
    });

    it('should handle size == threshold - 1', () => {
      const size = 224;
      const result = shouldInline(size, 1, false, false);
      expect(result).toBe(false); // Still too large
    });

    it('should handle zero-sized function', () => {
      const result = shouldInline(0, 1, false, false);
      expect(result).toBe(true);
    });

    it('should handle frequency == 100', () => {
      const result = shouldInline(100, 100, false, false);
      expect(result).toBe(false); // 100 is not > 100
    });

    it('should handle frequency == 101', () => {
      const result = shouldInline(100, 101, false, false);
      expect(result).toBe(true); // > 100
    });
  });

  describe('Real-World Scenarios', () => {
    it('should inline find_match in compression', () => {
      // zlib find_match: ~20 instructions, called in loop 100+ times
      const shouldInlineMatch = shouldInline(20, 150, false, true, 2);
      expect(shouldInlineMatch).toBe(true);
    });

    it('should inline min/max helpers', () => {
      // min(a, b): 5 instructions
      const shouldInlineMin = shouldInline(5, 1, false, false);
      expect(shouldInlineMin).toBe(true);
    });

    it('should inline sqrt approximation in loop', () => {
      // sqrt_approx: 40 instructions, in hot loop
      const shouldInlineSqrt = shouldInline(40, 200, false, true, 3);
      expect(shouldInlineSqrt).toBe(true);
    });

    it('should not inline JSON parser', () => {
      // json_parse: 500+ instructions
      const shouldInlineJSON = shouldInline(600, 10, false, false);
      expect(shouldInlineJSON).toBe(false);
    });
  });

  describe('Performance Impact', () => {
    it('should inline reduce function call overhead', () => {
      // For small functions, inlining removes CALL/RET overhead
      // Estimated 5-20% improvement for hot loops

      // Small function: likely to be inlined
      const shouldInlineSmall = shouldInline(15, 1, false, false);
      expect(shouldInlineSmall).toBe(true);
    });

    it('should consider code bloat for large functions', () => {
      // Inlining large functions increases code size (instruction cache miss)
      // Better to keep function call

      const shouldInlineLarge = shouldInline(200, 50, false, false);
      expect(shouldInlineLarge).toBe(false);
    });

    it('should balance inline benefits with binary size', () => {
      // Rule 4: Aggressive inlining in loops despite medium size
      const loopThreshold = 225 / 2; // depth=1

      const shouldInlineLoopMedium = shouldInline(100, 1, false, true, 1);
      expect(shouldInlineLoopMedium).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle mixed function types', () => {
      // Combination of:
      // - small helpers (inline)
      // - large functions (don't inline)
      // - recursive functions (never inline)

      expect(shouldInline(10, 1, false, false)).toBe(true); // helper
      expect(shouldInline(300, 1, false, false)).toBe(false); // large
      expect(shouldInline(50, 100, true, false)).toBe(false); // recursive
    });

    it('should handle pipeline with constant folding', () => {
      // After constant folding, more functions become candidates for inlining
      // because their bodies shrink

      // Original size 225 → might become 150 after constant folding
      // Then should_inline decision changes
      const beforeCF = shouldInline(225, 1, false, false);
      const afterCF = shouldInline(150, 1, false, false);

      expect(beforeCF).toBe(false);
      expect(afterCF).toBe(false); // Still too large
    });
  });
});
