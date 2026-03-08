/**
 * Phase 18 Day 3: Control Flow Tests (if/while)
 * IRGenerator + VM integration for control flow operations
 */

import { describe, it, expect } from '@jest/globals';
import { IRGenerator } from '../src/codegen/ir-generator';
import { VM } from '../src/vm';

describe('Phase 18 Day 3: Control Flow (if/while)', () => {
  const gen = new IRGenerator();
  const vm = new VM();

  // ── Test 1: Simple if true (if (5 > 3) { x = 10 }; x) ──────
  it('executes if statement (true condition)', () => {
    const ast = {
      type: 'Block',
      statements: [
        {
          type: 'IfStatement',
          condition: {
            type: 'BinaryOp',
            operator: '>',
            left: { type: 'NumberLiteral', value: 5 },
            right: { type: 'NumberLiteral', value: 3 }
          },
          consequent: {
            type: 'Block',
            statements: [
              {
                type: 'Assignment',
                name: 'x',
                value: { type: 'NumberLiteral', value: 10 }
              }
            ]
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
    expect(result.value).toBe(10);
  });

  // ── Test 2: Simple if false (if (3 > 5) { x = 10 }; x is undefined) ─
  it('executes if statement (false condition)', () => {
    const ast = {
      type: 'Block',
      statements: [
        {
          type: 'IfStatement',
          condition: {
            type: 'BinaryOp',
            operator: '>',
            left: { type: 'NumberLiteral', value: 3 },
            right: { type: 'NumberLiteral', value: 5 }
          },
          consequent: {
            type: 'Block',
            statements: [
              {
                type: 'Assignment',
                name: 'x',
                value: { type: 'NumberLiteral', value: 10 }
              }
            ]
          }
        }
      ]
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
    // x is not assigned, so it should be undefined
  });

  // ── Test 3: if with else (x = (5 > 3) ? 10 : 20) ──────────
  it('executes if-else statement (true condition)', () => {
    const ast = {
      type: 'Block',
      statements: [
        {
          type: 'IfStatement',
          condition: {
            type: 'BinaryOp',
            operator: '>',
            left: { type: 'NumberLiteral', value: 5 },
            right: { type: 'NumberLiteral', value: 3 }
          },
          consequent: {
            type: 'Block',
            statements: [
              {
                type: 'Assignment',
                name: 'x',
                value: { type: 'NumberLiteral', value: 10 }
              }
            ]
          },
          alternate: {
            type: 'Block',
            statements: [
              {
                type: 'Assignment',
                name: 'x',
                value: { type: 'NumberLiteral', value: 20 }
              }
            ]
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
    expect(result.value).toBe(10);
  });

  // ── Test 4: if-else (false condition) ──────────────────────
  it('executes if-else statement (false condition)', () => {
    const ast = {
      type: 'Block',
      statements: [
        {
          type: 'IfStatement',
          condition: {
            type: 'BinaryOp',
            operator: '<',
            left: { type: 'NumberLiteral', value: 5 },
            right: { type: 'NumberLiteral', value: 3 }
          },
          consequent: {
            type: 'Block',
            statements: [
              {
                type: 'Assignment',
                name: 'x',
                value: { type: 'NumberLiteral', value: 10 }
              }
            ]
          },
          alternate: {
            type: 'Block',
            statements: [
              {
                type: 'Assignment',
                name: 'x',
                value: { type: 'NumberLiteral', value: 20 }
              }
            ]
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
    expect(result.value).toBe(20);
  });

  // ── Test 5: Simple while loop (count up) ────────────────────
  it('executes while loop (count from 0 to 3)', () => {
    const ast = {
      type: 'Block',
      statements: [
        {
          type: 'Assignment',
          name: 'count',
          value: { type: 'NumberLiteral', value: 0 }
        },
        {
          type: 'WhileStatement',
          condition: {
            type: 'BinaryOp',
            operator: '<',
            left: { type: 'Identifier', name: 'count' },
            right: { type: 'NumberLiteral', value: 3 }
          },
          body: {
            type: 'Block',
            statements: [
              {
                type: 'Assignment',
                name: 'count',
                value: {
                  type: 'BinaryOp',
                  operator: '+',
                  left: { type: 'Identifier', name: 'count' },
                  right: { type: 'NumberLiteral', value: 1 }
                }
              }
            ]
          }
        },
        {
          type: 'Identifier',
          name: 'count'
        }
      ]
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
    expect(result.value).toBe(3);
  });

  // ── Test 6: While with multiplication (accumulate) ──────────
  it('executes while loop with accumulation', () => {
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
            right: { type: 'NumberLiteral', value: 5 }
          },
          body: {
            type: 'Block',
            statements: [
              {
                type: 'Assignment',
                name: 'sum',
                value: {
                  type: 'BinaryOp',
                  operator: '+',
                  left: { type: 'Identifier', name: 'sum' },
                  right: { type: 'Identifier', name: 'i' }
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
    // sum = 0 + 1 + 2 + 3 + 4 = 10
    expect(result.value).toBe(10);
  });

  // ── Test 7: if inside while ────────────────────────────────
  it('executes if statement inside while loop', () => {
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
          name: 'evenSum',
          value: { type: 'NumberLiteral', value: 0 }
        },
        {
          type: 'WhileStatement',
          condition: {
            type: 'BinaryOp',
            operator: '<',
            left: { type: 'Identifier', name: 'i' },
            right: { type: 'NumberLiteral', value: 5 }
          },
          body: {
            type: 'Block',
            statements: [
              {
                type: 'IfStatement',
                condition: {
                  type: 'BinaryOp',
                  operator: '==',
                  left: {
                    type: 'BinaryOp',
                    operator: '%',
                    left: { type: 'Identifier', name: 'i' },
                    right: { type: 'NumberLiteral', value: 2 }
                  },
                  right: { type: 'NumberLiteral', value: 0 }
                },
                consequent: {
                  type: 'Block',
                  statements: [
                    {
                      type: 'Assignment',
                      name: 'evenSum',
                      value: {
                        type: 'BinaryOp',
                        operator: '+',
                        left: { type: 'Identifier', name: 'evenSum' },
                        right: { type: 'Identifier', name: 'i' }
                      }
                    }
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
          name: 'evenSum'
        }
      ]
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
    // evenSum = 0 + 2 + 4 = 6
    expect(result.value).toBe(6);
  });

  // ── Test 8: Nested if statements ───────────────────────────
  it('executes nested if statements', () => {
    const ast = {
      type: 'Block',
      statements: [
        {
          type: 'Assignment',
          name: 'x',
          value: { type: 'NumberLiteral', value: 5 }
        },
        {
          type: 'IfStatement',
          condition: {
            type: 'BinaryOp',
            operator: '>',
            left: { type: 'Identifier', name: 'x' },
            right: { type: 'NumberLiteral', value: 3 }
          },
          consequent: {
            type: 'Block',
            statements: [
              {
                type: 'IfStatement',
                condition: {
                  type: 'BinaryOp',
                  operator: '<',
                  left: { type: 'Identifier', name: 'x' },
                  right: { type: 'NumberLiteral', value: 10 }
                },
                consequent: {
                  type: 'Block',
                  statements: [
                    {
                      type: 'Assignment',
                      name: 'result',
                      value: { type: 'NumberLiteral', value: 1 }
                    }
                  ]
                }
              }
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
    expect(result.value).toBe(1);
  });
});
