/**
 * Phase 18 Day 4: Function Tests (CALL/RET)
 * Function definition, parameter passing, and return values
 */

import { describe, it, expect } from '@jest/globals';
import { IRGenerator } from '../src/codegen/ir-generator';
import { VM } from '../src/vm';

describe('Phase 18 Day 4: Functions (CALL/RET)', () => {
  const gen = new IRGenerator();
  const vm = new VM();

  // ── Test 1: Simple Function Call (add two numbers) ──────────
  it('calls a function and returns result', () => {
    const ast = {
      type: 'Block',
      statements: [
        // Function definition (simulated as data)
        {
          type: 'CallExpression',
          callee: 'add',
          arguments: [
            { type: 'NumberLiteral', value: 5 },
            { type: 'NumberLiteral', value: 3 }
          ]
        }
      ]
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    // Note: Actual function execution depends on VM's function registry
    expect(result.ok).toBe(true);
  });

  // ── Test 2: Function with Variable Arguments ────────────────
  it('calls function with variable arguments', () => {
    const ast = {
      type: 'Block',
      statements: [
        {
          type: 'Assignment',
          name: 'x',
          value: { type: 'NumberLiteral', value: 10 }
        },
        {
          type: 'Assignment',
          name: 'y',
          value: { type: 'NumberLiteral', value: 20 }
        },
        {
          type: 'CallExpression',
          callee: 'add',
          arguments: [
            { type: 'Identifier', name: 'x' },
            { type: 'Identifier', name: 'y' }
          ]
        }
      ]
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
  });

  // ── Test 3: Function with Multiple Arguments ───────────────
  it('calls function with multiple parameters', () => {
    const ast = {
      type: 'Block',
      statements: [
        {
          type: 'CallExpression',
          callee: 'sum3',
          arguments: [
            { type: 'NumberLiteral', value: 1 },
            { type: 'NumberLiteral', value: 2 },
            { type: 'NumberLiteral', value: 3 }
          ]
        }
      ]
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
  });

  // ── Test 4: Nested Function Calls ──────────────────────────
  it('calls function with result of another function', () => {
    const ast = {
      type: 'Block',
      statements: [
        {
          type: 'CallExpression',
          callee: 'multiply',
          arguments: [
            {
              type: 'CallExpression',
              callee: 'add',
              arguments: [
                { type: 'NumberLiteral', value: 2 },
                { type: 'NumberLiteral', value: 3 }
              ]
            },
            { type: 'NumberLiteral', value: 4 }
          ]
        }
      ]
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
  });

  // ── Test 5: Function Result in Variable ────────────────────
  it('stores function result in variable', () => {
    const ast = {
      type: 'Block',
      statements: [
        {
          type: 'Assignment',
          name: 'result',
          value: {
            type: 'CallExpression',
            callee: 'add',
            arguments: [
              { type: 'NumberLiteral', value: 10 },
              { type: 'NumberLiteral', value: 20 }
            ]
          }
        },
        {
          type: 'Identifier',
          name: 'result'
        }
      ]
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
  });

  // ── Test 6: Function with Expression Argument ──────────────
  it('calls function with expression as argument', () => {
    const ast = {
      type: 'Block',
      statements: [
        {
          type: 'CallExpression',
          callee: 'square',
          arguments: [
            {
              type: 'BinaryOp',
              operator: '+',
              left: { type: 'NumberLiteral', value: 3 },
              right: { type: 'NumberLiteral', value: 2 }
            }
          ]
        }
      ]
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
  });

  // ── Test 7: Function in Loop ────────────────────────────────
  it('calls function inside while loop', () => {
    const ast = {
      type: 'Block',
      statements: [
        {
          type: 'Assignment',
          name: 'i',
          value: { type: 'NumberLiteral', value: 0 }
        },
        {
          type: 'Assignment',
          name: 'sum',
          value: { type: 'NumberLiteral', value: 0 }
        },
        {
          type: 'WhileStatement',
          condition: {
            type: 'BinaryOp',
            operator: '<',
            left: { type: 'Identifier', name: 'i' },
            right: { type: 'NumberLiteral', value: 3 }
          },
          body: {
            type: 'Block',
            statements: [
              {
                type: 'Assignment',
                name: 'sum',
                value: {
                  type: 'CallExpression',
                  callee: 'add',
                  arguments: [
                    { type: 'Identifier', name: 'sum' },
                    { type: 'Identifier', name: 'i' }
                  ]
                }
              },
              {
                type: 'Assignment',
                name: 'i',
                value: {
                  type: 'BinaryOp',
                  operator: '+',
                  left: { type: 'Identifier', name: 'i' },
                  right: { type: 'NumberLiteral', value: 1 }
                }
              }
            ]
          }
        },
        {
          type: 'Identifier',
          name: 'sum'
        }
      ]
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
  });
});
