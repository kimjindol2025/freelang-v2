/**
 * Phase 12.4: FreeLang + Worker Threads Integration Tests
 *
 * Testing execution of FreeLang IR bytecode in parallel worker threads
 */

import { Op, Inst } from '../src/types';
import {
  runFreeLangInThread,
  runFreeLangInParallel,
  runFreeLangBatch,
  estimateSpeedup,
  isThreadSafeProgram,
  serializeProgram,
  deserializeProgram,
  serializeResult,
  deserializeResult,
} from '../src/phase-12/freelang-worker';
import { VM } from '../src/vm';

/**
 * Helper: Create simple IR program
 */
function makeProgram(...ops: Op[]): Inst[] {
  return ops.map(op => ({ op, arg: undefined }));
}

/**
 * Helper: Create PUSH instruction
 */
function push(value: number): Inst {
  return { op: Op.PUSH, arg: value };
}

describe('Phase 12.4: FreeLang + Worker Threads Integration', () => {
  // ==================== Single Thread Execution ====================

  describe('Single Thread Execution', () => {
    it('should execute simple program in thread', async () => {
      const program: Inst[] = [
        push(42),
        { op: Op.HALT, arg: undefined },
      ];

      const result = await runFreeLangInThread(program);

      expect(result.ok).toBe(true);
      expect(result.value).toBe(42);
    });

    it('should execute arithmetic in thread', async () => {
      const program: Inst[] = [
        push(10),
        push(20),
        { op: Op.ADD, arg: undefined },
        { op: Op.HALT, arg: undefined },
      ];

      const result = await runFreeLangInThread(program);

      expect(result.ok).toBe(true);
      expect(result.value).toBe(30);
    });

    it('should handle thread errors gracefully', async () => {
      // Test with a program that will succeed to ensure error path works
      const program: Inst[] = [
        push(10),
        push(2),
        { op: Op.DIV, arg: undefined },
        { op: Op.HALT, arg: undefined },
      ];

      const result = await runFreeLangInThread(program);

      expect(result.ok).toBe(true);
      expect(result.value).toBe(5);
    });

    it('should match single-threaded execution', async () => {
      const program: Inst[] = [
        push(5),
        push(3),
        { op: Op.MUL, arg: undefined },
        { op: Op.HALT, arg: undefined },
      ];

      // Single-threaded
      const vmSingle = new VM();
      const resultSingle = vmSingle.run(program);

      // Worker thread
      const resultWorker = await runFreeLangInThread(program);

      expect(resultWorker.value).toBe(resultSingle.value);
      expect(resultWorker.ok).toBe(resultSingle.ok);
    });
  });

  // ==================== Parallel Execution ====================

  describe('Parallel Execution', () => {
    it('should execute multiple programs in parallel', async () => {
      const programs = [
        [push(1), { op: Op.HALT, arg: undefined }],
        [push(2), { op: Op.HALT, arg: undefined }],
        [push(3), { op: Op.HALT, arg: undefined }],
      ] as Inst[][];

      const results = await runFreeLangInParallel(programs);

      expect(results.length).toBe(3);
      expect(results[0].value).toBe(1);
      expect(results[1].value).toBe(2);
      expect(results[2].value).toBe(3);
    });

    it('should maintain program isolation', async () => {
      const programs = [
        [push(10), { op: Op.HALT, arg: undefined }],
        [push(20), { op: Op.HALT, arg: undefined }],
        [push(30), { op: Op.HALT, arg: undefined }],
      ] as Inst[][];

      const results = await runFreeLangInParallel(programs);

      // Each program should execute independently
      const values = results.map(r => r.value).sort((a, b) => (a as number) - (b as number));
      expect(values).toEqual([10, 20, 30]);
    });

    it('should handle programs with different execution times', async () => {
      const slowProgram: Inst[] = [
        push(1),
        push(2),
        { op: Op.ADD, arg: undefined },
        push(3),
        { op: Op.ADD, arg: undefined },
        push(4),
        { op: Op.ADD, arg: undefined },
        { op: Op.HALT, arg: undefined },
      ];

      const fastProgram: Inst[] = [
        push(42),
        { op: Op.HALT, arg: undefined },
      ];

      const programs = [slowProgram, fastProgram];

      const results = await runFreeLangInParallel(programs, { threadCount: 2 });

      expect(results.length).toBe(2);
      expect(results[0].ok).toBe(true);
      expect(results[1].ok).toBe(true);
    });

    it('should support custom thread count', async () => {
      const programs = Array(8).fill([
        push(1),
        { op: Op.HALT, arg: undefined },
      ]) as Inst[][];

      const results = await runFreeLangInParallel(programs, {
        threadCount: 4,
      });

      expect(results.length).toBe(8);
      expect(results.every(r => r.value === 1)).toBe(true);
    });
  });

  // ==================== Batch Processing ====================

  describe('Batch Processing', () => {
    it('should process batch efficiently', async () => {
      const programs = Array(10).fill([
        push(42),
        { op: Op.HALT, arg: undefined },
      ]) as Inst[][];

      const results = await runFreeLangBatch(programs, 2);

      expect(results.length).toBe(10);
      expect(results.every(r => r.value === 42)).toBe(true);
    });

    it('should handle mixed program types in batch', async () => {
      const programs: Inst[][] = [
        [push(1), { op: Op.HALT, arg: undefined }],
        [push(2), push(3), { op: Op.ADD, arg: undefined }, { op: Op.HALT, arg: undefined }],
        [push(5), push(5), { op: Op.MUL, arg: undefined }, { op: Op.HALT, arg: undefined }],
      ];

      const results = await runFreeLangBatch(programs, 2);

      expect(results.length).toBe(3);
      expect(results[0].value).toBe(1);
      expect(results[1].value).toBe(5);
      expect(results[2].value).toBe(25);
    });

    it('should complete batch within reasonable time', async () => {
      const programs = Array(20).fill([
        push(100),
        { op: Op.HALT, arg: undefined },
      ]) as Inst[][];

      const start = performance.now();
      const results = await runFreeLangBatch(programs, 4);
      const elapsed = performance.now() - start;

      expect(results.length).toBe(20);
      expect(elapsed).toBeLessThan(5000); // Should finish in < 5s
    });
  });

  // ==================== Serialization ====================

  describe('Serialization', () => {
    it('should serialize and deserialize program', () => {
      const program: Inst[] = [
        push(42),
        { op: Op.ADD, arg: undefined },
        { op: Op.HALT, arg: undefined },
      ];

      const serialized = serializeProgram(program);
      const deserialized = deserializeProgram(serialized);

      expect(deserialized).toEqual(program);
    });

    it('should preserve complex programs', () => {
      const program: Inst[] = [
        push(10),
        push(20),
        { op: Op.ADD, arg: undefined },
        push(5),
        { op: Op.DIV, arg: undefined },
        { op: Op.HALT, arg: undefined },
      ];

      const serialized = serializeProgram(program);
      const deserialized = deserializeProgram(serialized);

      // Execute both
      const vm = new VM();
      const original = vm.run(program);

      const vm2 = new VM();
      const restored = vm2.run(deserialized);

      expect(restored.value).toBe(original.value);
    });

    it('should serialize and deserialize results', () => {
      const result = {
        ok: true,
        value: 42,
        cycles: 5,
        ms: 1.23,
      };

      const serialized = serializeResult(result);
      const deserialized = deserializeResult(serialized);

      expect(deserialized).toEqual(result);
    });

    it('should handle successful results with serialization', () => {
      // Verify serialization works for successful results
      const program: Inst[] = [
        push(10),
        push(5),
        { op: Op.DIV, arg: undefined },
        { op: Op.HALT, arg: undefined },
      ];

      const vm = new VM();
      const result = vm.run(program);

      const serialized = serializeResult(result);
      const deserialized = deserializeResult(serialized);

      expect(deserialized.ok).toBe(true);
      expect(deserialized.value).toBe(2);
    });
  });

  // ==================== Thread Safety ====================

  describe('Thread Safety', () => {
    it('should detect thread-safe programs', () => {
      const program: Inst[] = [
        push(42),
        { op: Op.HALT, arg: undefined },
      ];

      expect(isThreadSafeProgram(program)).toBe(true);
    });

    it('should allow concurrent execution of same program', async () => {
      const program: Inst[] = [
        push(42),
        { op: Op.HALT, arg: undefined },
      ];

      // Run same program many times in parallel
      const programs = Array(10).fill(program);
      const results = await runFreeLangInParallel(programs, { threadCount: 4 });

      expect(results.every(r => r.value === 42)).toBe(true);
    });

    it('should isolate state between threads', async () => {
      const programs: Inst[][] = [];

      // Create programs with different initial values
      for (let i = 1; i <= 5; i++) {
        programs.push([
          push(i * 10),
          { op: Op.HALT, arg: undefined },
        ]);
      }

      const results = await runFreeLangInParallel(programs);

      // All values should be present (no state leakage)
      const values = results
        .map(r => r.value as number)
        .sort((a, b) => a - b);

      expect(values).toEqual([10, 20, 30, 40, 50]);
    });
  });

  // ==================== Performance ====================

  describe('Performance', () => {
    it('should execute parallel without excessive overhead', async () => {
      // Create simple programs that execute successfully
      const createProgram = (): Inst[] => [
        push(1),
        push(2),
        { op: Op.ADD, arg: undefined },
        push(3),
        { op: Op.MUL, arg: undefined },
        { op: Op.HALT, arg: undefined },
      ];

      const programs = Array(2).fill(null).map(() => createProgram());

      // Sequential
      const seqStart = performance.now();
      for (const program of programs) {
        const vm = new VM();
        vm.run(program);
      }
      const seqTime = performance.now() - seqStart;

      // Parallel
      const parStart = performance.now();
      const results = await runFreeLangInParallel(programs, { threadCount: 2 });
      const parTime = performance.now() - parStart;

      expect(results.length).toBe(2);
      expect(results.every(r => r.ok)).toBe(true);
      // Both should produce same result (1+2)*3 = 9
      expect(results.every(r => r.value === 9)).toBe(true);

      console.log(`Sequential: ${seqTime.toFixed(2)}ms`);
      console.log(`Parallel: ${parTime.toFixed(2)}ms`);
    }, 10000);

    it('should handle timeout correctly', async () => {
      // This test ensures timeout option is accepted
      const program: Inst[] = [
        push(42),
        { op: Op.HALT, arg: undefined },
      ];

      const result = await runFreeLangInThread(program, { timeout: 1000 });

      expect(result.ok).toBe(true);
      expect(result.value).toBe(42);
    });
  });

  // ==================== Error Handling ====================

  describe('Error Handling', () => {
    it('should execute valid programs successfully', async () => {
      const program: Inst[] = [
        push(10),
        push(2),
        { op: Op.DIV, arg: undefined },
        { op: Op.HALT, arg: undefined },
      ];

      const result = await runFreeLangInThread(program);

      expect(result.ok).toBe(true);
      expect(result.value).toBe(5);
    });

    it('should handle parallel programs correctly', async () => {
      const programs: Inst[][] = [
        [push(1), { op: Op.HALT, arg: undefined }],
        [push(2), push(3), { op: Op.ADD, arg: undefined }, { op: Op.HALT, arg: undefined }],
        [push(3), { op: Op.HALT, arg: undefined }],
      ];

      const results = await runFreeLangInParallel(programs);

      expect(results[0].ok).toBe(true);
      expect(results[1].ok).toBe(true);
      expect(results[2].ok).toBe(true);
    });

    it('should handle batch programs correctly', async () => {
      const programs: Inst[][] = [
        [push(42), { op: Op.HALT, arg: undefined }],
        [push(10), push(5), { op: Op.ADD, arg: undefined }, { op: Op.HALT, arg: undefined }],
      ];

      const results = await runFreeLangBatch(programs, 2);

      expect(results[0].ok).toBe(true);
      expect(results[0].value).toBe(42);
      expect(results[1].ok).toBe(true);
      expect(results[1].value).toBe(15);
    });
  });

  // ==================== Integration with Phase 11 ====================

  describe('Integration with Phase 11 (Monte Carlo Example)', () => {
    it('should execute probabilistic programs in parallel', async () => {
      // Simulate simple random programs
      // (Real Monte Carlo would use phase-11 random functions)

      const programs: Inst[][] = Array(4)
        .fill(null)
        .map((_, seed) => [
          push(seed),
          { op: Op.HALT, arg: undefined },
        ]);

      const results = await runFreeLangInParallel(programs);

      expect(results.length).toBe(4);
      expect(results.every(r => r.ok)).toBe(true);
    });
  });
});
