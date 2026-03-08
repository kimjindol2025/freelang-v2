/**
 * Phase 18 Day 3: Variables + Control Flow Tests
 * IRGenerator + VM integration for variable operations
 */

import { describe, it, expect } from '@jest/globals';
import { IRGenerator } from '../src/codegen/ir-generator';
import { VM } from '../src/vm';

describe('Phase 18 Day 3: Variables (LOAD/STORE)', () => {
  const gen = new IRGenerator();
  const vm = new VM();

  // ── Test 1: Simple Assignment (x = 5) ───────────────────────
  it('executes x = 5 and stores value', () => {
    const ast = {
      type: 'Block',
      statements: [
        {
          type: 'Assignment',
          name: 'x',
          value: { type: 'NumberLiteral', value: 5 }
        }
      ]
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
    // After assignment, x should be 5 (stored in variable)
    expect(result.value).toBeUndefined(); // Assignment returns undefined
  });

  // ── Test 2: Assignment then Load (x = 5; x) ────────────────
  it('executes x = 5; x and loads variable', () => {
    const ast = {
      type: 'Block',
      statements: [
        {
          type: 'Assignment',
          name: 'x',
          value: { type: 'NumberLiteral', value: 5 }
        },
        {
          type: 'Identifier',
          name: 'x'
        }
      ]
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
    expect(result.value).toBe(5);
  });

  // ── Test 3: Multiple Assignments (x = 5; x = 10) ───────────
  it('executes multiple assignments correctly', () => {
    const ast = {
      type: 'Block',
      statements: [
        {
          type: 'Assignment',
          name: 'x',
          value: { type: 'NumberLiteral', value: 5 }
        },
        {
          type: 'Assignment',
          name: 'x',
          value: { type: 'NumberLiteral', value: 10 }
        },
        {
          type: 'Identifier',
          name: 'x'
        }
      ]
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
    expect(result.value).toBe(10);
  });

  // ── Test 4: Variable in Expression (x = 5; x + 3) ─────────
  it('executes variable in binary operation', () => {
    const ast = {
      type: 'Block',
      statements: [
        {
          type: 'Assignment',
          name: 'x',
          value: { type: 'NumberLiteral', value: 5 }
        },
        {
          type: 'BinaryOp',
          operator: '+',
          left: { type: 'Identifier', name: 'x' },
          right: { type: 'NumberLiteral', value: 3 }
        }
      ]
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
    expect(result.value).toBe(8);
  });

  // ── Test 5: Multiple Variables (x = 5; y = 10; x + y) ────────
  it('executes multiple variables in expression', () => {
    const ast = {
      type: 'Block',
      statements: [
        {
          type: 'Assignment',
          name: 'x',
          value: { type: 'NumberLiteral', value: 5 }
        },
        {
          type: 'Assignment',
          name: 'y',
          value: { type: 'NumberLiteral', value: 10 }
        },
        {
          type: 'BinaryOp',
          operator: '+',
          left: { type: 'Identifier', name: 'x' },
          right: { type: 'Identifier', name: 'y' }
        }
      ]
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
    expect(result.value).toBe(15);
  });

  // ── Test 6: Variable Update (x = 5; x = x + 3; x) ──────────
  it('executes variable update (x = x + 3)', () => {
    const ast = {
      type: 'Block',
      statements: [
        {
          type: 'Assignment',
          name: 'x',
          value: { type: 'NumberLiteral', value: 5 }
        },
        {
          type: 'Assignment',
          name: 'x',
          value: {
            type: 'BinaryOp',
            operator: '+',
            left: { type: 'Identifier', name: 'x' },
            right: { type: 'NumberLiteral', value: 3 }
          }
        },
        {
          type: 'Identifier',
          name: 'x'
        }
      ]
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
    expect(result.value).toBe(8);
  });

  // ── Test 7: Multiple Operations (x = 2; y = 3; x * y + 5) ───
  it('executes complex variable expression', () => {
    const ast = {
      type: 'Block',
      statements: [
        {
          type: 'Assignment',
          name: 'x',
          value: { type: 'NumberLiteral', value: 2 }
        },
        {
          type: 'Assignment',
          name: 'y',
          value: { type: 'NumberLiteral', value: 3 }
        },
        {
          type: 'BinaryOp',
          operator: '+',
          left: {
            type: 'BinaryOp',
            operator: '*',
            left: { type: 'Identifier', name: 'x' },
            right: { type: 'Identifier', name: 'y' }
          },
          right: { type: 'NumberLiteral', value: 5 }
        }
      ]
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
    expect(result.value).toBe(11); // 2 * 3 + 5 = 11
  });
});
