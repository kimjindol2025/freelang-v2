/**
 * Phase 18: VM Execution Integration Tests
 * Day 1-2: Test IRGenerator output with actual VM
 */

import { describe, it, expect } from '@jest/globals';
import { IRGenerator } from '../src/codegen/ir-generator';
import { VM } from '../src/vm';

describe('Phase 18: VM Execution (IRGenerator → VM)', () => {
  const gen = new IRGenerator();
  const vm = new VM();

  // ── Test 1: Simple Addition (1 + 2 = 3) ──────────────────────
  it('executes 1 + 2 and returns 3', () => {
    const ast = {
      type: 'BinaryOp',
      operator: '+',
      left: { type: 'NumberLiteral', value: 1 },
      right: { type: 'NumberLiteral', value: 2 }
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
    expect(result.value).toBe(3);
  });

  // ── Test 2: Subtraction (10 - 3 = 7) ─────────────────────────
  it('executes 10 - 3 and returns 7', () => {
    const ast = {
      type: 'BinaryOp',
      operator: '-',
      left: { type: 'NumberLiteral', value: 10 },
      right: { type: 'NumberLiteral', value: 3 }
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
    expect(result.value).toBe(7);
  });

  // ── Test 3: Multiplication (5 * 4 = 20) ──────────────────────
  it('executes 5 * 4 and returns 20', () => {
    const ast = {
      type: 'BinaryOp',
      operator: '*',
      left: { type: 'NumberLiteral', value: 5 },
      right: { type: 'NumberLiteral', value: 4 }
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
    expect(result.value).toBe(20);
  });

  // ── Test 4: Division (20 / 4 = 5) ────────────────────────────
  it('executes 20 / 4 and returns 5', () => {
    const ast = {
      type: 'BinaryOp',
      operator: '/',
      left: { type: 'NumberLiteral', value: 20 },
      right: { type: 'NumberLiteral', value: 4 }
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
    expect(result.value).toBe(5);
  });

  // ── Test 5: Modulo (10 % 3 = 1) ──────────────────────────────
  it('executes 10 % 3 and returns 1', () => {
    const ast = {
      type: 'BinaryOp',
      operator: '%',
      left: { type: 'NumberLiteral', value: 10 },
      right: { type: 'NumberLiteral', value: 3 }
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
    expect(result.value).toBe(1);
  });

  // ── Test 6: Nested Expression ((1 + 2) * 3 = 9) ──────────────
  it('executes (1 + 2) * 3 and returns 9', () => {
    const ast = {
      type: 'BinaryOp',
      operator: '*',
      left: {
        type: 'BinaryOp',
        operator: '+',
        left: { type: 'NumberLiteral', value: 1 },
        right: { type: 'NumberLiteral', value: 2 }
      },
      right: { type: 'NumberLiteral', value: 3 }
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
    expect(result.value).toBe(9);
  });

  // ── Test 7: Complex Nested (((2 + 3) * 4) - 5 = 15) ─────────
  it('executes ((2 + 3) * 4) - 5 and returns 15', () => {
    const ast = {
      type: 'BinaryOp',
      operator: '-',
      left: {
        type: 'BinaryOp',
        operator: '*',
        left: {
          type: 'BinaryOp',
          operator: '+',
          left: { type: 'NumberLiteral', value: 2 },
          right: { type: 'NumberLiteral', value: 3 }
        },
        right: { type: 'NumberLiteral', value: 4 }
      },
      right: { type: 'NumberLiteral', value: 5 }
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
    expect(result.value).toBe(15);
  });

  // ── Test 8: Unary Negation (-5 = -5) ─────────────────────────
  it('executes -5 and returns -5', () => {
    const ast = {
      type: 'UnaryOp',
      operator: '-',
      operand: { type: 'NumberLiteral', value: 5 }
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
    expect(result.value).toBe(-5);
  });

  // ── Test 9: Comparison (3 < 5 = 1/true) ──────────────────────
  it('executes 3 < 5 and returns 1 (true)', () => {
    const ast = {
      type: 'BinaryOp',
      operator: '<',
      left: { type: 'NumberLiteral', value: 3 },
      right: { type: 'NumberLiteral', value: 5 }
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
    expect(result.value).toBe(1); // true = 1
  });

  // ── Test 10: Equality (5 == 5 = 1/true) ──────────────────────
  it('executes 5 == 5 and returns 1 (true)', () => {
    const ast = {
      type: 'BinaryOp',
      operator: '==',
      left: { type: 'NumberLiteral', value: 5 },
      right: { type: 'NumberLiteral', value: 5 }
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
    expect(result.value).toBe(1); // true = 1
  });

  // ── Test 11: Inequality (5 != 3 = 1/true) ────────────────────
  it('executes 5 != 3 and returns 1 (true)', () => {
    const ast = {
      type: 'BinaryOp',
      operator: '!=',
      left: { type: 'NumberLiteral', value: 5 },
      right: { type: 'NumberLiteral', value: 3 }
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
    expect(result.value).toBe(1); // true = 1
  });

  // ── Test 12: Performance (< 1ms per operation) ────────────────
  it('completes simple arithmetic in < 1ms', () => {
    const ast = {
      type: 'BinaryOp',
      operator: '+',
      left: { type: 'NumberLiteral', value: 1 },
      right: { type: 'NumberLiteral', value: 2 }
    };

    const ir = gen.generateIR(ast);
    const start = performance.now();
    const result = vm.run(ir);
    const elapsed = performance.now() - start;

    expect(result.ok).toBe(true);
    expect(elapsed).toBeLessThan(1); // < 1ms
  });
});
