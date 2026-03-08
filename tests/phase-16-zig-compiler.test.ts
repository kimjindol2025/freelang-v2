/**
 * Phase 16-1: Zig Compiler Tests
 * Tests for IR to Zig code generation
 */

import { Op, Inst } from '../src/types';
import { ZigCompiler, compileToZig } from '../src/compiler/zig-compiler';

describe('Phase 16-1: Zig Compiler', () => {
  const compiler = new ZigCompiler();

  describe('Basic Opcodes', () => {
    it('should compile PUSH instruction', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 42 },
        { op: Op.RET, arg: undefined },
      ];

      const result = compileToZig(instrs);

      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
      expect(result.code).toContain('const std');
      expect(result.stats.operations).toBeGreaterThan(0);
    });

    it('should compile STORE instruction', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 10 },
        { op: Op.STORE, arg: 0 },
        { op: Op.RET, arg: undefined },
      ];

      const result = compileToZig(instrs);

      expect(result.code).toContain('var_0');
      expect(result.stats.variables).toBeGreaterThan(0);
    });

    it('should compile LOAD instruction', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 5 },
        { op: Op.STORE, arg: 0 },
        { op: Op.LOAD, arg: 0 },
        { op: Op.RET, arg: undefined },
      ];

      const result = compileToZig(instrs);

      expect(result.code).toContain('var_0');
    });

    it('should handle unknown opcodes gracefully', () => {
      const instrs: Inst[] = [{ op: Op.HALT, arg: undefined }];

      const result = compileToZig(instrs);

      expect(result.code).toBeDefined();
      expect(result.code.length).toBeGreaterThan(0);
    });

    it('should track variable count', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 1 },
        { op: Op.STORE, arg: 0 },
        { op: Op.PUSH, arg: 2 },
        { op: Op.STORE, arg: 1 },
        { op: Op.RET, arg: undefined },
      ];

      const result = compileToZig(instrs);

      expect(result.stats.variables).toBeGreaterThan(0);
    });
  });

  describe('Arithmetic Operations', () => {
    it('should compile ADD instruction', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 3 },
        { op: Op.PUSH, arg: 5 },
        { op: Op.ADD, arg: undefined },
        { op: Op.RET, arg: undefined },
      ];

      const result = compileToZig(instrs);

      expect(result.code).toBeDefined();
      expect(result.stats.operations).toBe(4);
    });

    it('should compile SUB instruction', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 10 },
        { op: Op.PUSH, arg: 3 },
        { op: Op.SUB, arg: undefined },
        { op: Op.RET, arg: undefined },
      ];

      const result = compileToZig(instrs);

      expect(result.code).toBeDefined();
    });

    it('should compile MUL instruction', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 4 },
        { op: Op.PUSH, arg: 5 },
        { op: Op.MUL, arg: undefined },
        { op: Op.RET, arg: undefined },
      ];

      const result = compileToZig(instrs);

      expect(result.code).toBeDefined();
    });

    it('should compile DIV instruction', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 20 },
        { op: Op.PUSH, arg: 4 },
        { op: Op.DIV, arg: undefined },
        { op: Op.RET, arg: undefined },
      ];

      const result = compileToZig(instrs);

      expect(result.code).toBeDefined();
    });
  });

  describe('Comparison Operations', () => {
    it('should compile EQ instruction', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 5 },
        { op: Op.PUSH, arg: 5 },
        { op: Op.EQ, arg: undefined },
        { op: Op.RET, arg: undefined },
      ];

      const result = compileToZig(instrs);

      expect(result.code).toBeDefined();
    });

    it('should compile LT instruction', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 3 },
        { op: Op.PUSH, arg: 5 },
        { op: Op.LT, arg: undefined },
        { op: Op.RET, arg: undefined },
      ];

      const result = compileToZig(instrs);

      expect(result.code).toBeDefined();
    });
  });

  describe('Function Calls', () => {
    it('should compile CALL instruction', () => {
      const instrs: Inst[] = [
        { op: Op.CALL, arg: 0 },
        { op: Op.RET, arg: undefined },
      ];

      const result = compileToZig(instrs);

      expect(result.code).toContain('fn_0');
    });
  });

  describe('Code Quality', () => {
    it('should always include Zig std import', () => {
      const instrs: Inst[] = [{ op: Op.RET, arg: undefined }];

      const result = compileToZig(instrs);

      expect(result.code).toContain('const std = @import("std")');
    });

    it('should produce valid Zig syntax structure', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 42 },
        { op: Op.RET, arg: undefined },
      ];

      const result = compileToZig(instrs);

      // Basic Zig syntax checks
      expect(result.code).toBeDefined();
      expect(result.code.length).toBeGreaterThan(0);
      expect(result.code).not.toContain('undefined');
    });

    it('should have reasonable line count for IR size', () => {
      const instrs: Inst[] = [];
      for (let i = 0; i < 20; i++) {
        instrs.push({ op: Op.PUSH, arg: i });
      }
      instrs.push({ op: Op.RET, arg: undefined });

      const result = compileToZig(instrs);

      expect(result.stats.linesOfCode).toBeGreaterThan(3);
      expect(result.stats.linesOfCode).toBeLessThan(100);
    });

    it('should track statistics correctly', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 10 },
        { op: Op.STORE, arg: 0 },
        { op: Op.LOAD, arg: 0 },
        { op: Op.RET, arg: undefined },
      ];

      const result = compileToZig(instrs);

      expect(result.stats).toHaveProperty('linesOfCode');
      expect(result.stats).toHaveProperty('functions');
      expect(result.stats).toHaveProperty('variables');
      expect(result.stats).toHaveProperty('operations');
      expect(result.stats.operations).toBe(4);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty instruction list', () => {
      const result = compileToZig([]);

      expect(result.code).toBeDefined();
      expect(result.stats.linesOfCode).toBeGreaterThan(0);
    });

    it('should handle large numbers', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 1_000_000 },
        { op: Op.RET, arg: undefined },
      ];

      const result = compileToZig(instrs);

      expect(result.code).toContain('1000000');
    });

    it('should handle floating point numbers', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 3.14159 },
        { op: Op.RET, arg: undefined },
      ];

      const result = compileToZig(instrs);

      expect(result.code).toContain('3.14159');
    });

    it('should handle string arguments safely', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 'hello' },
        { op: Op.RET, arg: undefined },
      ];

      const result = compileToZig(instrs);

      expect(result.code).toBeDefined();
    });

    it('should handle multiple return statements', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 1 },
        { op: Op.RET, arg: undefined },
      ];

      const result = compileToZig(instrs);

      expect(result.code).toContain('return');
    });
  });

  describe('Performance', () => {
    it('should compile 100 instructions in < 100ms', () => {
      const instrs: Inst[] = [];
      for (let i = 0; i < 100; i++) {
        instrs.push({ op: Op.PUSH, arg: i });
      }
      instrs.push({ op: Op.RET, arg: undefined });

      const start = performance.now();
      const result = compileToZig(instrs);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
      expect(result.stats.operations).toBe(101);
    });

    it('should handle large programs efficiently', () => {
      const instrs: Inst[] = [];
      for (let i = 0; i < 500; i++) {
        instrs.push({ op: Op.PUSH, arg: Math.random() * 1000 });
        if (i % 10 === 0) {
          instrs.push({ op: Op.ADD, arg: undefined });
        }
      }
      instrs.push({ op: Op.RET, arg: undefined });

      const start = performance.now();
      const result = compileToZig(instrs);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(200);
      expect(result.code.length).toBeGreaterThan(0);
    });
  });

  describe('Type System', () => {
    it('should compile with proper Zig imports', () => {
      const instrs: Inst[] = [
        { op: Op.PUSH, arg: 42 },
        { op: Op.RET, arg: undefined },
      ];

      const result = compileToZig(instrs);

      expect(result.code).toContain('@import');
    });
  });
});
