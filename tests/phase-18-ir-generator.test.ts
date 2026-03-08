/**
 * Phase 18: IRGenerator Tests
 * Day 1-2 MVP: Literals + Arithmetic
 */

import { describe, it, expect } from '@jest/globals';
import { IRGenerator } from '../src/codegen/ir-generator';
import { Op } from '../src/types';

describe('Phase 18: IRGenerator MVP', () => {
  const gen = new IRGenerator();

  // ── Test 1: Number Literal ──────────────────────────────────
  it('generates PUSH for number literal', () => {
    const ast = { type: 'NumberLiteral', value: 42 };
    const ir = gen.generateIR(ast);

    expect(ir).toEqual([
      { op: Op.PUSH, arg: 42 },
      { op: Op.HALT }
    ]);
  });

  // ── Test 2: String Literal ──────────────────────────────────
  it('generates STR_NEW for string literal', () => {
    const ast = { type: 'StringLiteral', value: 'hello' };
    const ir = gen.generateIR(ast);

    expect(ir).toEqual([
      { op: Op.STR_NEW, arg: 'hello' },
      { op: Op.HALT }
    ]);
  });

  // ── Test 3: Boolean Literal ────────────────────────────────
  it('generates PUSH for boolean literal (true → 1)', () => {
    const ast = { type: 'BoolLiteral', value: true };
    const ir = gen.generateIR(ast);

    expect(ir).toEqual([
      { op: Op.PUSH, arg: 1 },
      { op: Op.HALT }
    ]);
  });

  it('generates PUSH for boolean literal (false → 0)', () => {
    const ast = { type: 'BoolLiteral', value: false };
    const ir = gen.generateIR(ast);

    expect(ir).toEqual([
      { op: Op.PUSH, arg: 0 },
      { op: Op.HALT }
    ]);
  });

  // ── Test 4: Binary Operations ───────────────────────────────
  it('generates ADD for 1 + 2', () => {
    const ast = {
      type: 'BinaryOp',
      operator: '+',
      left: { type: 'NumberLiteral', value: 1 },
      right: { type: 'NumberLiteral', value: 2 }
    };
    const ir = gen.generateIR(ast);

    expect(ir).toEqual([
      { op: Op.PUSH, arg: 1 },
      { op: Op.PUSH, arg: 2 },
      { op: Op.ADD },
      { op: Op.HALT }
    ]);
  });

  it('generates SUB for 10 - 3', () => {
    const ast = {
      type: 'BinaryOp',
      operator: '-',
      left: { type: 'NumberLiteral', value: 10 },
      right: { type: 'NumberLiteral', value: 3 }
    };
    const ir = gen.generateIR(ast);

    expect(ir[0]).toEqual({ op: Op.PUSH, arg: 10 });
    expect(ir[1]).toEqual({ op: Op.PUSH, arg: 3 });
    expect(ir[2]).toEqual({ op: Op.SUB });
  });

  it('generates MUL for 5 * 4', () => {
    const ast = {
      type: 'BinaryOp',
      operator: '*',
      left: { type: 'NumberLiteral', value: 5 },
      right: { type: 'NumberLiteral', value: 4 }
    };
    const ir = gen.generateIR(ast);

    expect(ir[2]).toEqual({ op: Op.MUL });
  });

  it('generates DIV for 20 / 4', () => {
    const ast = {
      type: 'BinaryOp',
      operator: '/',
      left: { type: 'NumberLiteral', value: 20 },
      right: { type: 'NumberLiteral', value: 4 }
    };
    const ir = gen.generateIR(ast);

    expect(ir[2]).toEqual({ op: Op.DIV });
  });

  it('generates MOD for 10 % 3', () => {
    const ast = {
      type: 'BinaryOp',
      operator: '%',
      left: { type: 'NumberLiteral', value: 10 },
      right: { type: 'NumberLiteral', value: 3 }
    };
    const ir = gen.generateIR(ast);

    expect(ir[2]).toEqual({ op: Op.MOD });
  });

  // ── Test 5: Comparison Operations ───────────────────────────
  it('generates EQ for 5 == 5', () => {
    const ast = {
      type: 'BinaryOp',
      operator: '==',
      left: { type: 'NumberLiteral', value: 5 },
      right: { type: 'NumberLiteral', value: 5 }
    };
    const ir = gen.generateIR(ast);

    expect(ir[2]).toEqual({ op: Op.EQ });
  });

  it('generates NEQ for 5 != 3', () => {
    const ast = {
      type: 'BinaryOp',
      operator: '!=',
      left: { type: 'NumberLiteral', value: 5 },
      right: { type: 'NumberLiteral', value: 3 }
    };
    const ir = gen.generateIR(ast);

    expect(ir[2]).toEqual({ op: Op.NEQ });
  });

  it('generates LT for 3 < 5', () => {
    const ast = {
      type: 'BinaryOp',
      operator: '<',
      left: { type: 'NumberLiteral', value: 3 },
      right: { type: 'NumberLiteral', value: 5 }
    };
    const ir = gen.generateIR(ast);

    expect(ir[2]).toEqual({ op: Op.LT });
  });

  // ── Test 6: Unary Operations ────────────────────────────────
  it('generates NEG for -5', () => {
    const ast = {
      type: 'UnaryOp',
      operator: '-',
      operand: { type: 'NumberLiteral', value: 5 }
    };
    const ir = gen.generateIR(ast);

    expect(ir).toEqual([
      { op: Op.PUSH, arg: 5 },
      { op: Op.NEG },
      { op: Op.HALT }
    ]);
  });

  it('generates NOT for !true', () => {
    const ast = {
      type: 'UnaryOp',
      operator: '!',
      operand: { type: 'BoolLiteral', value: true }
    };
    const ir = gen.generateIR(ast);

    expect(ir[1]).toEqual({ op: Op.NOT });
  });

  // ── Test 7: Nested Expressions ──────────────────────────────
  it('generates IR for (1 + 2) * 3', () => {
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

    // Expected: PUSH 1, PUSH 2, ADD, PUSH 3, MUL, HALT
    expect(ir.length).toBe(6); // 5 instructions + 1 HALT
    expect(ir[0]).toEqual({ op: Op.PUSH, arg: 1 });
    expect(ir[1]).toEqual({ op: Op.PUSH, arg: 2 });
    expect(ir[2]).toEqual({ op: Op.ADD });
    expect(ir[3]).toEqual({ op: Op.PUSH, arg: 3 });
    expect(ir[4]).toEqual({ op: Op.MUL });
    expect(ir[5]).toEqual({ op: Op.HALT });
  });

  // ── Test 8: Build AIIntent ──────────────────────────────────
  it('builds AIIntent for simple expression', () => {
    const ast = {
      type: 'BinaryOp',
      operator: '+',
      left: { type: 'NumberLiteral', value: 10 },
      right: { type: 'NumberLiteral', value: 20 }
    };

    const intent = gen.buildIntent('main', [], ast);

    expect(intent.fn).toBe('main');
    expect(intent.params).toEqual([]);
    expect(intent.ret).toBe('number');
    expect(intent.body[0]).toEqual({ op: Op.PUSH, arg: 10 });
    expect(intent.body[1]).toEqual({ op: Op.PUSH, arg: 20 });
    expect(intent.body[2]).toEqual({ op: Op.ADD });
  });

  it('builds AIIntent with parameters', () => {
    const ast = {
      type: 'Block',
      statements: [
        {
          type: 'Assignment',
          name: 'result',
          value: {
            type: 'BinaryOp',
            operator: '+',
            left: { type: 'Identifier', name: 'a' },
            right: { type: 'Identifier', name: 'b' }
          }
        }
      ]
    };

    const intent = gen.buildIntent('add', ['a', 'b'], ast);

    expect(intent.fn).toBe('add');
    expect(intent.params.length).toBe(2);
    expect(intent.params[0].name).toBe('a');
    expect(intent.params[1].name).toBe('b');
  });

  // ── Test 9: Error Handling ──────────────────────────────────
  it('throws error for unknown operator', () => {
    const ast = {
      type: 'BinaryOp',
      operator: '**', // exponentiation not supported in MVP
      left: { type: 'NumberLiteral', value: 2 },
      right: { type: 'NumberLiteral', value: 3 }
    };

    expect(() => gen.generateIR(ast)).toThrow('Unknown binary operator');
  });

  it('throws error for unknown AST node type', () => {
    const ast = { type: 'UnknownNode', value: 42 };

    expect(() => gen.generateIR(ast)).toThrow('Unknown AST node type');
  });

  // ── Test 10: Null/Empty Handling ────────────────────────────
  it('handles null node gracefully', () => {
    const ir = gen.generateIR(null as any);

    expect(ir).toEqual([
      { op: Op.PUSH, arg: 0 },
      { op: Op.HALT }
    ]);
  });
});
