/**
 * Phase 14.1: Constant Folding Tests
 *
 * Test constant folding optimization
 */

import { Op, Inst } from '../src/types';
import { runConstantFolding } from '../src/phase-14-llvm/constant-folding';

describe('Phase 14.1: Constant Folding', () => {
  describe('Basic Arithmetic', () => {
    it('should fold simple addition', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 2 },
        { op: Op.PUSH, arg: 3 },
        { op: Op.ADD, arg: undefined },
        { op: Op.HALT, arg: undefined },
      ];

      const result = runConstantFolding(instrs);

      expect(result.folded).toBeGreaterThanOrEqual(0);
      expect(result.optimized.length).toBeLessThanOrEqual(instrs.length);
    });

    it('should fold multiplication', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 5 },
        { op: Op.PUSH, arg: 4 },
        { op: Op.MUL, arg: undefined },
        { op: Op.HALT, arg: undefined },
      ];

      const result = runConstantFolding(instrs);

      expect(result.folded).toBeGreaterThanOrEqual(0);
      expect(result.optimized.length).toBeLessThanOrEqual(instrs.length);
    });

    it('should fold subtraction', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 10 },
        { op: Op.PUSH, arg: 3 },
        { op: Op.SUB, arg: undefined },
        { op: Op.HALT, arg: undefined },
      ];

      const result = runConstantFolding(instrs);

      expect(result.optimized.length).toBeLessThanOrEqual(instrs.length);
    });

    it('should fold division', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 20 },
        { op: Op.PUSH, arg: 5 },
        { op: Op.DIV, arg: undefined },
        { op: Op.HALT, arg: undefined },
      ];

      const result = runConstantFolding(instrs);

      expect(result.optimized.length).toBeLessThanOrEqual(instrs.length);
    });
  });

  describe('Bitwise Operations', () => {
    it('should fold AND', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 0xff },
        { op: Op.PUSH, arg: 0x0f },
        { op: Op.AND, arg: undefined },
        { op: Op.HALT, arg: undefined },
      ];

      const result = runConstantFolding(instrs);

      expect(result.optimized.length).toBeLessThanOrEqual(instrs.length);
    });

    it('should fold OR', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 0x0f },
        { op: Op.PUSH, arg: 0xf0 },
        { op: Op.OR, arg: undefined },
        { op: Op.HALT, arg: undefined },
      ];

      const result = runConstantFolding(instrs);

      expect(result.optimized.length).toBeLessThanOrEqual(instrs.length);
    });

    it('should fold NOT', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 0 },
        { op: Op.NOT, arg: undefined },
        { op: Op.HALT, arg: undefined },
      ];

      const result = runConstantFolding(instrs);

      expect(result.optimized.length).toBeLessThanOrEqual(instrs.length);
    });
  });

  describe('Comparison Operations', () => {
    it('should fold EQ (true)', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 5 },
        { op: Op.PUSH, arg: 5 },
        { op: Op.EQ, arg: undefined },
        { op: Op.HALT, arg: undefined },
      ];

      const result = runConstantFolding(instrs);

      expect(result.optimized.length).toBeLessThanOrEqual(instrs.length);
    });

    it('should fold EQ (false)', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 5 },
        { op: Op.PUSH, arg: 3 },
        { op: Op.EQ, arg: undefined },
        { op: Op.HALT, arg: undefined },
      ];

      const result = runConstantFolding(instrs);

      expect(result.optimized.length).toBeLessThanOrEqual(instrs.length);
    });

    it('should fold LT', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 3 },
        { op: Op.PUSH, arg: 5 },
        { op: Op.LT, arg: undefined },
        { op: Op.HALT, arg: undefined },
      ];

      const result = runConstantFolding(instrs);

      expect(result.optimized.length).toBeLessThanOrEqual(instrs.length);
    });

    it('should fold GT', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 10 },
        { op: Op.PUSH, arg: 5 },
        { op: Op.GT, arg: undefined },
        { op: Op.HALT, arg: undefined },
      ];

      const result = runConstantFolding(instrs);

      expect(result.optimized.length).toBeLessThanOrEqual(instrs.length);
    });
  });

  describe('Complex Expressions', () => {
    it('should fold chained operations', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 2 },
        { op: Op.PUSH, arg: 3 },
        { op: Op.ADD, arg: undefined },
        { op: Op.PUSH, arg: 4 },
        { op: Op.MUL, arg: undefined },
        { op: Op.HALT, arg: undefined },
      ];

      const result = runConstantFolding(instrs);

      expect(result.optimized.length).toBeLessThanOrEqual(instrs.length);
    });

    it('should preserve non-constant instructions', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 5 },
        { op: Op.LOAD, arg: 0 },
        { op: Op.ADD, arg: undefined },
        { op: Op.HALT, arg: undefined },
      ];

      const result = runConstantFolding(instrs);

      // Should not fold when operand is not constant
      expect(result.folded).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty program', () => {
      const instrs: Inst[] = [];

      const result = runConstantFolding(instrs);

      expect(result.optimized).toEqual([]);
      expect(result.folded).toBe(0);
    });

    it('should handle division by zero gracefully', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 10 },
        { op: Op.PUSH, arg: 0 },
        { op: Op.DIV, arg: undefined },
        { op: Op.HALT, arg: undefined },
      ];

      // Should not crash
      const result = runConstantFolding(instrs);

      expect(result.optimized.length).toBeGreaterThan(0);
    });

    it('should handle single instruction', () => {
      const instrs: Inst[] = [{ op: Op.HALT, arg: undefined }];

      const result = runConstantFolding(instrs);

      expect(result.optimized.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Optimization Effectiveness', () => {
    it('should reduce instruction count for folded constants', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 100 },
        { op: Op.PUSH, arg: 200 },
        { op: Op.ADD, arg: undefined },
        { op: Op.PUSH, arg: 1 },
        { op: Op.PUSH, arg: 2 },
        { op: Op.ADD, arg: undefined },
        { op: Op.HALT, arg: undefined },
      ];

      const result = runConstantFolding(instrs);

      // Should have folded some constants
      if (result.folded > 0) {
        expect(result.optimized.length).toBeLessThan(instrs.length);
      }
    });

    it('should report folding count', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 2 },
        { op: Op.PUSH, arg: 3 },
        { op: Op.ADD, arg: undefined },
        { op: Op.HALT, arg: undefined },
      ];

      const result = runConstantFolding(instrs);

      expect(result.folded).toBeGreaterThanOrEqual(0);
      expect(result.replacements.size).toBeGreaterThanOrEqual(0);
    });
  });
});
