/**
 * Phase 18 Day 5: Iterator Tests
 * Iterator IR generation for lazy range evaluation
 */

import { describe, it, expect } from '@jest/globals';
import { IRGenerator } from '../src/codegen/ir-generator';
import { VM } from '../src/vm';
import { Op } from '../src/types';

describe('Phase 18 Day 5: Iterators', () => {
  const gen = new IRGenerator();
  const vm = new VM();

  // ── Test 1: Range Iterator Creation ────────────────────────
  it('generates IR for range literal', () => {
    const ast = {
      type: 'RangeLiteral',
      start: { type: 'NumberLiteral', value: 0 },
      end: { type: 'NumberLiteral', value: 10 }
    };

    const ir = gen.generateIR(ast);

    expect(ir[0]).toEqual({ op: Op.PUSH, arg: 0 });
    expect(ir[1]).toEqual({ op: Op.PUSH, arg: 10 });
    expect(ir[2]).toEqual({ op: Op.ITER_INIT });
  });

  // ── Test 2: Iterator in For Loop ───────────────────────────
  it('generates IR for for loop with iterator', () => {
    const ast = {
      type: 'ForStatement',
      variable: 'i',
      iterable: {
        type: 'RangeLiteral',
        start: { type: 'NumberLiteral', value: 1 },
        end: { type: 'NumberLiteral', value: 5 }
      },
      body: {
        type: 'Block',
        statements: [
          {
            type: 'BinaryOp',
            operator: '+',
            left: { type: 'Identifier', name: 'i' },
            right: { type: 'NumberLiteral', value: 1 }
          }
        ]
      }
    };

    const ir = gen.generateIR(ast);

    // Should have: PUSH 1, PUSH 5, ITER_INIT
    const iterInitIdx = ir.findIndex(inst => inst.op === Op.ITER_INIT);
    expect(iterInitIdx).toBeGreaterThan(0);
  });

  // ── Test 3: Iterator in While with ITER_HAS ───────────────
  it('generates IR for iterator with while loop', () => {
    const ast = {
      type: 'Block',
      statements: [
        {
          type: 'Assignment',
          name: 'iter',
          value: {
            type: 'RangeLiteral',
            start: { type: 'NumberLiteral', value: 0 },
            end: { type: 'NumberLiteral', value: 3 }
          }
        },
        {
          type: 'WhileStatement',
          condition: {
            type: 'CallExpression',
            callee: 'has',
            arguments: [{ type: 'Identifier', name: 'iter' }]
          },
          body: {
            type: 'Block',
            statements: [
              {
                type: 'CallExpression',
                callee: 'next',
                arguments: [{ type: 'Identifier', name: 'iter' }]
              }
            ]
          }
        }
      ]
    };

    const ir = gen.generateIR(ast);

    // Should contain ITER_INIT (range creation)
    const iterInitIdx = ir.findIndex(inst => inst.op === Op.ITER_INIT);
    expect(iterInitIdx).toBeGreaterThan(0);
  });

  // ── Test 4: Iterator - Variable Range ──────────────────────
  it('generates IR for iterator with variable bounds', () => {
    const ast = {
      type: 'RangeLiteral',
      start: { type: 'Identifier', name: 'start' },
      end: { type: 'Identifier', name: 'end' }
    };

    const ir = gen.generateIR(ast);

    expect(ir[0]).toEqual({ op: Op.LOAD, arg: 'start' });
    expect(ir[1]).toEqual({ op: Op.LOAD, arg: 'end' });
    expect(ir[2]).toEqual({ op: Op.ITER_INIT });
  });

  // ── Test 5: Iterator - Expression Bounds ──────────────────
  it('generates IR for iterator with expression bounds', () => {
    const ast = {
      type: 'RangeLiteral',
      start: {
        type: 'BinaryOp',
        operator: '+',
        left: { type: 'NumberLiteral', value: 1 },
        right: { type: 'NumberLiteral', value: 2 }
      },
      end: {
        type: 'BinaryOp',
        operator: '*',
        left: { type: 'NumberLiteral', value: 2 },
        right: { type: 'NumberLiteral', value: 5 }
      }
    };

    const ir = gen.generateIR(ast);

    // Should have: PUSH 1, PUSH 2, ADD, PUSH 2, PUSH 5, MUL, ITER_INIT
    const iterInitIdx = ir.findIndex(inst => inst.op === Op.ITER_INIT);
    expect(iterInitIdx).toBeGreaterThan(0);
    expect(ir[iterInitIdx - 1]).toEqual({ op: Op.MUL });
  });

  // ── Test 6: Iterator - Array Range ────────────────────────
  it('generates IR for iterator over array indices', () => {
    const ast = {
      type: 'RangeLiteral',
      start: { type: 'NumberLiteral', value: 0 },
      end: {
        type: 'CallExpression',
        callee: 'len',
        arguments: [{ type: 'Identifier', name: 'arr' }]
      }
    };

    const ir = gen.generateIR(ast);

    expect(ir[0]).toEqual({ op: Op.PUSH, arg: 0 });
    // Should have len() call
    const callIdx = ir.findIndex(inst => inst.op === Op.CALL && inst.arg === 'len');
    expect(callIdx).toBeGreaterThan(0);
    // Then ITER_INIT
    const iterInitIdx = ir.findIndex(inst => inst.op === Op.ITER_INIT);
    expect(iterInitIdx).toBeGreaterThan(callIdx);
  });

  // ── Test 7: VM Execution - Iterator Creation ──────────────
  it('executes IR to create iterator', () => {
    const ast = {
      type: 'RangeLiteral',
      start: { type: 'NumberLiteral', value: 0 },
      end: { type: 'NumberLiteral', value: 5 }
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
  });

  // ── Test 8: Complex Iterator in Loop ───────────────────────
  it('generates IR for iterator used in complex expression', () => {
    const ast = {
      type: 'Block',
      statements: [
        {
          type: 'Assignment',
          name: 'sum',
          value: { type: 'NumberLiteral', value: 0 }
        },
        {
          type: 'ForStatement',
          variable: 'i',
          iterable: {
            type: 'RangeLiteral',
            start: { type: 'NumberLiteral', value: 1 },
            end: { type: 'NumberLiteral', value: 10 }
          },
          body: {
            type: 'Assignment',
            name: 'sum',
            value: {
              type: 'BinaryOp',
              operator: '+',
              left: { type: 'Identifier', name: 'sum' },
              right: { type: 'Identifier', name: 'i' }
            }
          }
        }
      ]
    };

    const ir = gen.generateIR(ast);

    // Should contain range iterator
    const iterInitIdx = ir.findIndex(inst => inst.op === Op.ITER_INIT);
    expect(iterInitIdx).toBeGreaterThan(0);
  });
});
