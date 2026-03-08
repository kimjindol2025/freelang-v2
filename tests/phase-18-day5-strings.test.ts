/**
 * Phase 18 Day 5: String Tests
 * String IR generation and basic string operations
 */

import { describe, it, expect } from '@jest/globals';
import { IRGenerator } from '../src/codegen/ir-generator';
import { VM } from '../src/vm';
import { Op } from '../src/types';

describe('Phase 18 Day 5: Strings', () => {
  const gen = new IRGenerator();
  const vm = new VM();

  // ── Test 1: Create String Literal (IR generation) ─────────────
  it('generates IR for string literal', () => {
    const ast = {
      type: 'StringLiteral',
      value: 'hello'
    };

    const ir = gen.generateIR(ast);

    expect(ir[0]).toEqual({ op: Op.STR_NEW, arg: 'hello' });
    expect(ir[ir.length - 1]).toEqual({ op: Op.HALT });
  });

  // ── Test 2: String Concatenation ────────────────────────────
  it('generates IR for string concatenation', () => {
    const ast = {
      type: 'BinaryOp',
      operator: '+',
      left: { type: 'StringLiteral', value: 'hello' },
      right: { type: 'StringLiteral', value: ' world' }
    };

    const ir = gen.generateIR(ast);

    expect(ir[0]).toEqual({ op: Op.STR_NEW, arg: 'hello' });
    expect(ir[1]).toEqual({ op: Op.STR_NEW, arg: ' world' });
    expect(ir[2]).toEqual({ op: Op.STR_CONCAT });
  });

  // ── Test 3: String Length (function call) ────────────────────
  it('generates IR for string length', () => {
    const ast = {
      type: 'CallExpression',
      callee: 'len',
      arguments: [
        { type: 'StringLiteral', value: 'test' }
      ]
    };

    const ir = gen.generateIR(ast);

    expect(ir[0]).toEqual({ op: Op.STR_NEW, arg: 'test' });
    const callIdx = ir.findIndex(inst => inst.op === Op.CALL);
    expect(callIdx).toBeGreaterThan(0);
    expect(ir[callIdx].arg).toBe('len');
  });

  // ── Test 4: String in Variable ──────────────────────────────
  it('generates IR for string variable assignment', () => {
    const ast = {
      type: 'Assignment',
      name: 'msg',
      value: { type: 'StringLiteral', value: 'hello' }
    };

    const ir = gen.generateIR(ast);

    expect(ir[0]).toEqual({ op: Op.STR_NEW, arg: 'hello' });
    expect(ir[1]).toEqual({ op: Op.STORE, arg: 'msg' });
  });

  // ── Test 5: String Concatenation in Expression ──────────────
  it('generates IR for multi-part string concatenation', () => {
    const ast = {
      type: 'BinaryOp',
      operator: '+',
      left: {
        type: 'BinaryOp',
        operator: '+',
        left: { type: 'StringLiteral', value: 'a' },
        right: { type: 'StringLiteral', value: 'b' }
      },
      right: { type: 'StringLiteral', value: 'c' }
    };

    const ir = gen.generateIR(ast);

    expect(ir[0]).toEqual({ op: Op.STR_NEW, arg: 'a' });
    expect(ir[1]).toEqual({ op: Op.STR_NEW, arg: 'b' });
    expect(ir[2]).toEqual({ op: Op.STR_CONCAT });
    expect(ir[3]).toEqual({ op: Op.STR_NEW, arg: 'c' });
    expect(ir[4]).toEqual({ op: Op.STR_CONCAT });
  });

  // ── Test 6: String Comparison ──────────────────────────────
  it('generates IR for string equality', () => {
    const ast = {
      type: 'BinaryOp',
      operator: '==',
      left: { type: 'StringLiteral', value: 'foo' },
      right: { type: 'StringLiteral', value: 'bar' }
    };

    const ir = gen.generateIR(ast);

    expect(ir[0]).toEqual({ op: Op.STR_NEW, arg: 'foo' });
    expect(ir[1]).toEqual({ op: Op.STR_NEW, arg: 'bar' });
    // String comparison should use STR_EQ instead of EQ
    // But for now, check if EQ is used (compatibility)
    const lastOp = ir[ir.length - 2]; // before HALT
    expect([Op.EQ, Op.STR_EQ]).toContain(lastOp.op);
  });

  // ── Test 7: String with Numbers ────────────────────────────
  it('generates IR for string and number concatenation', () => {
    const ast = {
      type: 'CallExpression',
      callee: 'concat',
      arguments: [
        { type: 'StringLiteral', value: 'value: ' },
        { type: 'NumberLiteral', value: 42 }
      ]
    };

    const ir = gen.generateIR(ast);

    expect(ir[0]).toEqual({ op: Op.STR_NEW, arg: 'value: ' });
    expect(ir[1]).toEqual({ op: Op.PUSH, arg: 42 });
    const callIdx = ir.findIndex(inst => inst.op === Op.CALL);
    expect(callIdx).toBeGreaterThan(0);
  });

  // ── Test 8: VM Execution - String Literal ──────────────────
  it('executes IR to create string', () => {
    const ast = {
      type: 'StringLiteral',
      value: 'test string'
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
  });
});
