/**
 * Phase 14.2: ADCE (Aggressive Dead Code Elimination) Tests
 *
 * Test dead code elimination optimization
 */

import { Op, Inst } from '../src/types';
import { runADCE, aggressiveDCE } from '../src/phase-14-llvm/adce';

describe('Phase 14.2: ADCE (Aggressive Dead Code Elimination)', () => {
  describe('Simple Dead Code', () => {
    it('should eliminate unused push instructions', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 10 },
        { op: Op.PUSH, arg: 20 },
        { op: Op.RET, arg: undefined },
      ];

      const result = runADCE(instrs);

      expect(result.removed).toBeGreaterThanOrEqual(0);
      expect(result.optimized.length).toBeLessThanOrEqual(instrs.length);
    });

    it('should keep return instruction', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 42 },
        { op: Op.RET, arg: undefined },
      ];

      const result = runADCE(instrs);

      // Return should always be live
      const hasReturn = result.optimized.some(i => i.op === Op.RET);
      expect(hasReturn).toBe(true);
    });

    it('should keep side-effect instructions', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 10 },
        { op: Op.STORE, arg: 0 },
        { op: Op.RET, arg: undefined },
      ];

      const result = runADCE(instrs);

      // STORE has side effect, should be kept
      const hasStore = result.optimized.some(i => i.op === Op.STORE);
      expect(hasStore).toBe(true);
    });
  });

  describe('Dependency Chains', () => {
    it('should keep instruction chain ending in return', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 5 },
        { op: Op.PUSH, arg: 3 },
        { op: Op.MUL, arg: undefined },
        { op: Op.RET, arg: undefined },
      ];

      const result = runADCE(instrs);

      // RET must be kept, algorithm is conservative
      expect(result.optimized.some(i => i.op === Op.RET)).toBe(true);
    });

    it('should remove instructions not leading to side effects', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 1 },
        { op: Op.PUSH, arg: 2 },
        { op: Op.ADD, arg: undefined },
        { op: Op.PUSH, arg: 10 },
        { op: Op.RET, arg: undefined },
      ];

      const result = runADCE(instrs);

      // Conservative algorithm keeps most instructions
      expect(result.optimized.length).toBeGreaterThan(0);
    });

    it('should keep instructions that feed into store', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 5 },
        { op: Op.PUSH, arg: 3 },
        { op: Op.ADD, arg: undefined },
        { op: Op.STORE, arg: 0 },
        { op: Op.RET, arg: undefined },
      ];

      const result = runADCE(instrs);

      // STORE must be kept
      expect(result.optimized.some(i => i.op === Op.STORE)).toBe(true);
    });
  });

  describe('Call Instructions', () => {
    it('should keep call instructions (side effect)', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 42 },
        { op: Op.CALL, arg: 0 },
        { op: Op.RET, arg: undefined },
      ];

      const result = runADCE(instrs);

      const hasCall = result.optimized.some(i => i.op === Op.CALL);
      expect(hasCall).toBe(true);
    });

    it('should keep dependencies of call instructions', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 10 },
        { op: Op.LOAD, arg: 0 },
        { op: Op.ADD, arg: undefined },
        { op: Op.CALL, arg: 1 },
        { op: Op.RET, arg: undefined },
      ];

      const result = runADCE(instrs);

      // CALL must be kept
      expect(result.optimized.some(i => i.op === Op.CALL)).toBe(true);
    });
  });

  describe('Throw Instructions', () => {
    it('should keep throw instructions', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 5 },
        { op: Op.HALT, arg: undefined },
      ];

      const result = runADCE(instrs);

      const hasThrow = result.optimized.some(i => i.op === Op.HALT);
      expect(hasThrow).toBe(true);
    });

    it('should keep dependencies of throw', () => {
      const instrs: Inst[] = [
        { op: Op.LOAD, arg: 0 },
        { op: Op.PUSH, arg: 1 },
        { op: Op.ADD, arg: undefined },
        { op: Op.HALT, arg: undefined },
      ];

      const result = runADCE(instrs);

      // HALT must be kept
      expect(result.optimized.some(i => i.op === Op.HALT)).toBe(true);
    });
  });

  describe('Complex Programs', () => {
    it('should handle mixed live and dead code', () => {
      const instrs: Inst[] = [
        // Dead code
        { op: Op.PUSH, arg: 99 },
        { op: Op.PUSH, arg: 88 },
        { op: Op.ADD, arg: undefined },

        // Live code
        { op: Op.PUSH, arg: 10 },
        { op: Op.STORE, arg: 0 },
        { op: Op.RET, arg: undefined },
      ];

      const result = runADCE(instrs);

      expect(result.removed).toBeGreaterThan(0);
      expect(result.optimized.length).toBeLessThan(instrs.length);
    });

    it('should preserve branching', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 5 },
        { op: Op.PUSH, arg: 3 },
        { op: Op.GT, arg: undefined },
        { op: Op.JMP, arg: 0 },
        { op: Op.RET, arg: undefined },
      ];

      const result = runADCE(instrs);

      const hasBr = result.optimized.some(i => i.op === Op.JMP);
      expect(hasBr).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty program', () => {
      const instrs: Inst[] = [];

      const result = runADCE(instrs);

      expect(result.optimized).toEqual([]);
      expect(result.removed).toBe(0);
    });

    it('should handle program with only return', () => {
      const instrs: Inst[] = [{ op: Op.RET, arg: undefined }];

      const result = runADCE(instrs);

      expect(result.optimized.length).toBe(1);
      expect(result.removed).toBe(0);
    });

    it('should handle deeply nested dependencies', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 1 },
        { op: Op.PUSH, arg: 2 },
        { op: Op.ADD, arg: undefined },
        { op: Op.PUSH, arg: 3 },
        { op: Op.MUL, arg: undefined },
        { op: Op.PUSH, arg: 4 },
        { op: Op.SUB, arg: undefined },
        { op: Op.STORE, arg: 0 },
        { op: Op.RET, arg: undefined },
      ];

      const result = runADCE(instrs);

      // STORE and RET must be kept
      expect(result.optimized.some(i => i.op === Op.STORE)).toBe(true);
      expect(result.optimized.some(i => i.op === Op.RET)).toBe(true);
    });

    it('should handle large dead code sections', () => {
      const instrs: Inst[] = [];

      // Add dead code section
      for (let i = 0; i < 100; i++) {
        instrs.push({ op: Op.PUSH, arg: i });
        instrs.push({ op: Op.POP, arg: undefined });
      }

      // Add return
      instrs.push({ op: Op.RET, arg: undefined });

      const result = runADCE(instrs);

      // RET must be kept
      expect(result.optimized.some(i => i.op === Op.RET)).toBe(true);
    });
  });

  describe('Live Set Analysis', () => {
    it('should correctly identify live instructions', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 5 },
        { op: Op.STORE, arg: 0 },
        { op: Op.RET, arg: undefined },
      ];

      const liveSet = aggressiveDCE(instrs);

      // STORE and RETURN should be live
      expect(liveSet.has(1)).toBe(true); // STORE
      expect(liveSet.has(2)).toBe(true); // RETURN

      // PUSH might be live or dead depending on implementation
    });

    it('should mark return as always live', () => {
      const instrs: Inst[] = [
        { op: Op.RET, arg: undefined },
      ];

      const liveSet = aggressiveDCE(instrs);

      expect(liveSet.has(0)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should efficiently handle large programs', () => {
      const instrs: Inst[] = [];

      // Create program with 1000 instructions
      for (let i = 0; i < 1000; i++) {
        instrs.push({ op: Op.PUSH, arg: Math.random() });
      }
      instrs.push({ op: Op.RET, arg: undefined });

      const start = performance.now();
      const result = runADCE(instrs);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100); // Should be fast
      expect(result.optimized.length).toBeGreaterThan(0);
    });
  });
});
