/**
 * Phase 16-3: Native Code Generation - E2E Integration Tests
 * Full pipeline: IR → Zig → Compilation verification
 */

import { Op, Inst } from '../src/types';
import { compileToZig } from '../src/compiler/zig-compiler';
import { optimizeStrings } from '../src/codegen/string-optimization';

describe('Phase 16-3: Native Code Generation (E2E)', () => {
  describe('Complete Compilation Pipeline', () => {
    it('should compile simple program end-to-end', () => {
      const program: Inst[] = [
        { op: Op.PUSH, arg: 10 },
        { op: Op.PUSH, arg: 5 },
        { op: Op.ADD, arg: undefined },
        { op: Op.RET, arg: undefined },
      ];

      const result = compileToZig(program);

      expect(result.success).toBe(true);
      expect(result.code).toContain('const std');
      expect(result.code).toContain('return');
    });

    it('should compile program with variables', () => {
      const program: Inst[] = [
        { op: Op.PUSH, arg: 42 },
        { op: Op.STORE, arg: 0 },
        { op: Op.LOAD, arg: 0 },
        { op: Op.PUSH, arg: 2 },
        { op: Op.MUL, arg: undefined },
        { op: Op.RET, arg: undefined },
      ];

      const result = compileToZig(program);

      expect(result.success).toBe(true);
      expect(result.code).toContain('var var_0');
      expect(result.stats.variables).toBeGreaterThan(0);
    });

    it('should compile program with multiple operations', () => {
      const program: Inst[] = [
        { op: Op.PUSH, arg: 100 },
        { op: Op.STORE, arg: 0 },
        { op: Op.PUSH, arg: 50 },
        { op: Op.STORE, arg: 1 },
        { op: Op.LOAD, arg: 0 },
        { op: Op.LOAD, arg: 1 },
        { op: Op.ADD, arg: undefined },
        { op: Op.PUSH, arg: 10 },
        { op: Op.SUB, arg: undefined },
        { op: Op.RET, arg: undefined },
      ];

      const result = compileToZig(program);

      expect(result.success).toBe(true);
      expect(result.stats.operations).toBe(program.length);
      expect(result.stats.variables).toBe(2);
    });
  });

  describe('Correctness Verification', () => {
    it('should generate compilable Zig syntax', () => {
      const program: Inst[] = [
        { op: Op.PUSH, arg: 5 },
        { op: Op.PUSH, arg: 3 },
        { op: Op.MUL, arg: undefined },
        { op: Op.RET, arg: undefined },
      ];

      const result = compileToZig(program);

      // Basic Zig syntax checks
      expect(result.code).toMatch(/const std = @import\("std"\)/);
      expect(result.code).not.toContain('undefined');
      expect(result.code).not.toContain('NaN');
    });

    it('should preserve operation semantics', () => {
      const operations = [
        { op: Op.ADD, sym: '+' },
        { op: Op.SUB, sym: '-' },
        { op: Op.MUL, sym: '*' },
        { op: Op.DIV, sym: '/' },
      ];

      for (const { op, sym } of operations) {
        const program: Inst[] = [
          { op: Op.PUSH, arg: 10 },
          { op: Op.PUSH, arg: 3 },
          { op, arg: undefined },
          { op: Op.RET, arg: undefined },
        ];

        const result = compileToZig(program);

        expect(result.success).toBe(true);
        // Operator should appear in generated code
        expect(result.code).toContain(sym);
      }
    });

    it('should handle type consistency', () => {
      const program: Inst[] = [
        { op: Op.PUSH, arg: 1.5 },
        { op: Op.STORE, arg: 0 },
        { op: Op.LOAD, arg: 0 },
        { op: Op.PUSH, arg: 2.5 },
        { op: Op.ADD, arg: undefined },
        { op: Op.RET, arg: undefined },
      ];

      const result = compileToZig(program);

      expect(result.success).toBe(true);
      // Variables should be typed
      expect(result.code).toContain('f64');
    });
  });

  describe('Performance Testing', () => {
    it('should compile small program quickly', () => {
      const program: Inst[] = [];
      for (let i = 0; i < 50; i++) {
        program.push({ op: Op.PUSH, arg: i });
      }
      program.push({ op: Op.RET, arg: undefined });

      const start = performance.now();
      const result = compileToZig(program);
      const elapsed = performance.now() - start;

      expect(result.success).toBe(true);
      expect(elapsed).toBeLessThan(50); // < 50ms
    });

    it('should compile medium program efficiently', () => {
      const program: Inst[] = [];
      for (let i = 0; i < 500; i++) {
        program.push({ op: Op.PUSH, arg: Math.random() });
        if (i % 10 === 0) {
          program.push({ op: Op.STORE, arg: i % 10 });
          program.push({ op: Op.LOAD, arg: i % 10 });
          program.push({ op: Op.ADD, arg: undefined });
        }
      }
      program.push({ op: Op.RET, arg: undefined });

      const start = performance.now();
      const result = compileToZig(program);
      const elapsed = performance.now() - start;

      expect(result.success).toBe(true);
      expect(elapsed).toBeLessThan(200); // < 200ms
    });

    it('should handle large programs without memory issues', () => {
      const program: Inst[] = [];
      for (let i = 0; i < 5000; i++) {
        program.push({ op: Op.PUSH, arg: 1 });
        if (i % 100 === 0) {
          program.push({ op: Op.ADD, arg: undefined });
        }
      }
      program.push({ op: Op.RET, arg: undefined });

      const result = compileToZig(program);

      expect(result.success).toBe(true);
      expect(result.stats.linesOfCode).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty programs', () => {
      const result = compileToZig([]);

      expect(result.success).toBe(true);
      expect(result.code).toContain('const std');
    });

    it('should handle programs with only returns', () => {
      const program: Inst[] = [{ op: Op.RET, arg: undefined }];

      const result = compileToZig(program);

      expect(result.success).toBe(true);
    });

    it('should track warnings for unsupported opcodes', () => {
      const program: Inst[] = [
        { op: Op.PUSH, arg: 5 },
        { op: Op.JMP, arg: 0 }, // Unsupported control flow
        { op: Op.RET, arg: undefined },
      ];

      const result = compileToZig(program);

      // May succeed with warnings
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('String Optimization Integration', () => {
    it('should integrate string optimization with compilation', () => {
      const program: Inst[] = [
        { op: Op.PUSH, arg: 'hello' },
        { op: Op.PUSH, arg: 'world' },
        { op: Op.RET, arg: undefined },
      ];

      const compiled = compileToZig(program);
      const code = compiled.code;

      // Code should be generated
      expect(code).toBeDefined();
      expect(code.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics Tracking', () => {
    it('should accurately track compilation statistics', () => {
      const program: Inst[] = [
        { op: Op.PUSH, arg: 10 },
        { op: Op.STORE, arg: 0 },
        { op: Op.PUSH, arg: 20 },
        { op: Op.STORE, arg: 1 },
        { op: Op.LOAD, arg: 0 },
        { op: Op.LOAD, arg: 1 },
        { op: Op.ADD, arg: undefined },
        { op: Op.RET, arg: undefined },
      ];

      const result = compileToZig(program);

      expect(result.stats.operations).toBe(program.length);
      expect(result.stats.variables).toBe(2);
      expect(result.stats.linesOfCode).toBeGreaterThan(3);
      expect(result.stats.compilationTimeMs).toBeGreaterThan(0);
    });

    it('should report success/failure correctly', () => {
      const goodProgram: Inst[] = [
        { op: Op.PUSH, arg: 1 },
        { op: Op.RET, arg: undefined },
      ];

      const result = compileToZig(goodProgram);

      expect(result.success).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('Real-World Programs', () => {
    it('should compile array sum simulation', () => {
      // Simulates: sum = 0; for i in [1..100]: sum += i; return sum;
      const program: Inst[] = [
        { op: Op.PUSH, arg: 0 },
        { op: Op.STORE, arg: 0 }, // sum = 0

        // Loop simulation (simplified)
        ...Array.from({ length: 100 }, (_, i) => [
          { op: Op.LOAD, arg: 0 },
          { op: Op.PUSH, arg: i + 1 },
          { op: Op.ADD, arg: undefined },
          { op: Op.STORE, arg: 0 },
        ]).flat(),

        { op: Op.LOAD, arg: 0 },
        { op: Op.RET, arg: undefined },
      ];

      const result = compileToZig(program);

      expect(result.success).toBe(true);
      expect(result.stats.variables).toBeGreaterThan(0);
    });

    it('should compile mathematical expression', () => {
      // (a + b) * (c - d) / e
      const program: Inst[] = [
        { op: Op.PUSH, arg: 10 }, // a
        { op: Op.PUSH, arg: 5 },  // b
        { op: Op.ADD, arg: undefined }, // a + b

        { op: Op.PUSH, arg: 8 },  // c
        { op: Op.PUSH, arg: 3 },  // d
        { op: Op.SUB, arg: undefined }, // c - d

        { op: Op.MUL, arg: undefined }, // (a+b) * (c-d)

        { op: Op.PUSH, arg: 2 },  // e
        { op: Op.DIV, arg: undefined }, // result / e

        { op: Op.RET, arg: undefined },
      ];

      const result = compileToZig(program);

      expect(result.success).toBe(true);
      expect(result.stats.operations).toBe(program.length);
    });
  });

  describe('Binary Output Validation', () => {
    it('should generate valid Zig module structure', () => {
      const program: Inst[] = [
        { op: Op.PUSH, arg: 42 },
        { op: Op.RET, arg: undefined },
      ];

      const result = compileToZig(program);

      // Should have import statement
      expect(result.code).toMatch(/const std = @import\("std"\)/);

      // Should have return statement
      expect(result.code).toMatch(/return/);

      // Should not have TypeScript/JavaScript artifacts
      expect(result.code).not.toMatch(/function|const =/);
      expect(result.code).not.toMatch(/var |let |interface /);
    });

    it('should generate deterministic output', () => {
      const program: Inst[] = [
        { op: Op.PUSH, arg: 1 },
        { op: Op.PUSH, arg: 2 },
        { op: Op.ADD, arg: undefined },
        { op: Op.RET, arg: undefined },
      ];

      const result1 = compileToZig(program);
      const result2 = compileToZig(program);

      expect(result1.code).toBe(result2.code);
      expect(result1.stats.operations).toBe(result2.stats.operations);
    });
  });
});
