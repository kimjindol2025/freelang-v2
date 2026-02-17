/**
 * Phase 18 Day 4: Array Tests
 * Array IR generation and basic execution
 */

import { describe, it, expect } from '@jest/globals';
import { IRGenerator } from '../src/codegen/ir-generator';
import { VM } from '../src/vm';
import { Op } from '../src/types';

describe('Phase 18 Day 4: Arrays', () => {
  const gen = new IRGenerator();
  const vm = new VM();

  // ── Test 1: Create Empty Array (IR generation) ─────────────
  it('generates IR for empty array', () => {
    const ast = {
      type: 'ArrayLiteral',
      elements: []
    };

    const ir = gen.generateIR(ast);

    expect(ir[0]).toEqual({ op: Op.ARR_NEW });
    expect(ir[ir.length - 1]).toEqual({ op: Op.HALT });
  });

  // ── Test 2: Create Array with Literals (IR) ────────────────
  it('generates IR for array with literals', () => {
    const ast = {
      type: 'ArrayLiteral',
      elements: [
        { type: 'NumberLiteral', value: 1 },
        { type: 'NumberLiteral', value: 2 },
        { type: 'NumberLiteral', value: 3 }
      ]
    };

    const ir = gen.generateIR(ast);

    expect(ir[0]).toEqual({ op: Op.ARR_NEW });
    expect(ir[1]).toEqual({ op: Op.PUSH, arg: 1 });
    expect(ir[2]).toEqual({ op: Op.ARR_PUSH });
    expect(ir[3]).toEqual({ op: Op.PUSH, arg: 2 });
    expect(ir[4]).toEqual({ op: Op.ARR_PUSH });
    expect(ir[5]).toEqual({ op: Op.PUSH, arg: 3 });
    expect(ir[6]).toEqual({ op: Op.ARR_PUSH });
  });

  // ── Test 3: Array with Expression Elements ─────────────────
  it('generates IR for array with expression elements', () => {
    const ast = {
      type: 'ArrayLiteral',
      elements: [
        {
          type: 'BinaryOp',
          operator: '+',
          left: { type: 'NumberLiteral', value: 1 },
          right: { type: 'NumberLiteral', value: 1 }
        }
      ]
    };

    const ir = gen.generateIR(ast);

    expect(ir[0]).toEqual({ op: Op.ARR_NEW });
    // Expression: PUSH 1, PUSH 1, ADD
    expect(ir[1]).toEqual({ op: Op.PUSH, arg: 1 });
    expect(ir[2]).toEqual({ op: Op.PUSH, arg: 1 });
    expect(ir[3]).toEqual({ op: Op.ADD });
    expect(ir[4]).toEqual({ op: Op.ARR_PUSH });
  });

  // ── Test 4: Index Access (IR) ──────────────────────────────
  it('generates IR for array index access', () => {
    const ast = {
      type: 'IndexAccess',
      array: {
        type: 'ArrayLiteral',
        elements: [
          { type: 'NumberLiteral', value: 10 },
          { type: 'NumberLiteral', value: 20 }
        ]
      },
      index: { type: 'NumberLiteral', value: 0 }
    };

    const ir = gen.generateIR(ast);

    // ARR_NEW, PUSH 10, ARR_PUSH, PUSH 20, ARR_PUSH, PUSH 0, ARR_GET
    const arrGetIdx = ir.findIndex(inst => inst.op === Op.ARR_GET);
    expect(arrGetIdx).toBeGreaterThan(0);
    expect(ir[arrGetIdx]).toEqual({ op: Op.ARR_GET });
  });

  // ── Test 5: Function Call with Array Argument (IR) ─────────
  it('generates IR for function call with array argument', () => {
    const ast = {
      type: 'CallExpression',
      callee: 'sum',
      arguments: [
        {
          type: 'ArrayLiteral',
          elements: [
            { type: 'NumberLiteral', value: 1 },
            { type: 'NumberLiteral', value: 2 },
            { type: 'NumberLiteral', value: 3 }
          ]
        }
      ]
    };

    const ir = gen.generateIR(ast);

    const callIdx = ir.findIndex(inst => inst.op === Op.CALL);
    expect(callIdx).toBeGreaterThan(0);
    expect(ir[callIdx].arg).toBe('sum');
  });

  // ── Test 6: Variable Index Access (IR) ──────────────────────
  it('generates IR for array access with variable index', () => {
    const ast = {
      type: 'IndexAccess',
      array: { type: 'Identifier', name: 'arr' },
      index: { type: 'Identifier', name: 'i' }
    };

    const ir = gen.generateIR(ast);

    expect(ir[0]).toEqual({ op: Op.LOAD, arg: 'arr' });
    expect(ir[1]).toEqual({ op: Op.LOAD, arg: 'i' });
    expect(ir[2]).toEqual({ op: Op.ARR_GET });
  });

  // ── Test 7: Array Creation with Variables (IR) ─────────────
  it('generates IR for array using variables', () => {
    const ast = {
      type: 'ArrayLiteral',
      elements: [
        { type: 'Identifier', name: 'x' },
        { type: 'Identifier', name: 'y' }
      ]
    };

    const ir = gen.generateIR(ast);

    expect(ir[0]).toEqual({ op: Op.ARR_NEW });
    expect(ir[1]).toEqual({ op: Op.LOAD, arg: 'x' });
    expect(ir[2]).toEqual({ op: Op.ARR_PUSH });
    expect(ir[3]).toEqual({ op: Op.LOAD, arg: 'y' });
    expect(ir[4]).toEqual({ op: Op.ARR_PUSH });
  });

  // ── Test 8: VM Execution - Create Simple Array ─────────────
  it('executes IR to create simple array', () => {
    const ast = {
      type: 'ArrayLiteral',
      elements: [
        { type: 'NumberLiteral', value: 1 },
        { type: 'NumberLiteral', value: 2 },
        { type: 'NumberLiteral', value: 3 }
      ]
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
  });

  // ── Test 9: Literal Array Then Arithmetic ──────────────────
  it('generates IR for operations after array', () => {
    const ast = {
      type: 'Block',
      statements: [
        {
          type: 'ArrayLiteral',
          elements: [
            { type: 'NumberLiteral', value: 10 }
          ]
        },
        {
          type: 'BinaryOp',
          operator: '+',
          left: { type: 'NumberLiteral', value: 5 },
          right: { type: 'NumberLiteral', value: 3 }
        }
      ]
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
    expect(result.value).toBe(8);
  });

  // ── Test 10: Function Call with Array (Execution) ──────────
  it('executes function call with array argument', () => {
    const ast = {
      type: 'CallExpression',
      callee: 'len',
      arguments: [
        {
          type: 'ArrayLiteral',
          elements: [
            { type: 'NumberLiteral', value: 1 },
            { type: 'NumberLiteral', value: 2 }
          ]
        }
      ]
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
  });
});
