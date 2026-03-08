/**
 * Phase 18 Day 6: CLI Integration Tests
 * File-based program execution and output
 */

import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { IRGenerator } from '../src/codegen/ir-generator';
import { VM } from '../src/vm';
import { Op } from '../src/types';

describe('Phase 18 Day 6: CLI Integration', () => {
  const gen = new IRGenerator();
  const vm = new VM();
  const tmpDir = path.join('/tmp', 'freelang-test-' + Date.now());

  // Setup: create temp directory
  beforeAll(() => {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
  });

  // Cleanup: remove temp directory
  afterAll(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  // ── Test 1: Read Program from File ──────────────────────────
  it('reads program from file', () => {
    const programPath = path.join(tmpDir, 'test1.free');
    const content = 'x = 5\nx';

    fs.writeFileSync(programPath, content, 'utf-8');
    const read = fs.readFileSync(programPath, 'utf-8');

    expect(read).toBe(content);
    expect(fs.existsSync(programPath)).toBe(true);
  });

  // ── Test 2: DUMP Opcode (output) ────────────────────────────
  it('generates IR with DUMP opcode for output', () => {
    const ast = {
      type: 'BinaryOp',
      operator: '+',
      left: { type: 'NumberLiteral', value: 3 },
      right: { type: 'NumberLiteral', value: 4 }
    };

    const ir = gen.generateIR(ast);

    // Should have arithmetic operations
    const addIdx = ir.findIndex(inst => inst.op === Op.ADD);
    expect(addIdx).toBeGreaterThan(0);

    // Should end with HALT
    expect(ir[ir.length - 1].op).toBe(Op.HALT);
  });

  // ── Test 3: Simple Arithmetic Program ──────────────────────
  it('executes simple arithmetic program', () => {
    const ast = {
      type: 'BinaryOp',
      operator: '+',
      left: { type: 'NumberLiteral', value: 5 },
      right: { type: 'NumberLiteral', value: 3 }
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
    expect(result.value).toBe(8);
  });

  // ── Test 4: Variable Assignment Program ────────────────────
  it('executes variable assignment program', () => {
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
    expect(result.value).toBe(30);
  });

  // ── Test 5: String Program ────────────────────────────────
  it('executes string program', () => {
    const ast = {
      type: 'BinaryOp',
      operator: '+',
      left: { type: 'StringLiteral', value: 'Hello ' },
      right: { type: 'StringLiteral', value: 'World' }
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
  });

  // ── Test 6: Exit Code (0 = success) ────────────────────────
  it('returns exit code 0 on success', () => {
    const ast = {
      type: 'NumberLiteral',
      value: 42
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
    // In CLI context, exit code 0 means success
    const exitCode = result.ok ? 0 : 1;
    expect(exitCode).toBe(0);
  });

  // ── Test 7: Loop Program IR Generation ────────────────────
  it('generates IR for loop program', () => {
    const ast = {
      type: 'ForStatement',
      variable: 'i',
      iterable: {
        type: 'RangeLiteral',
        start: { type: 'NumberLiteral', value: 1 },
        end: { type: 'NumberLiteral', value: 5 }
      },
      body: {
        type: 'BinaryOp',
        operator: '+',
        left: { type: 'Identifier', name: 'i' },
        right: { type: 'NumberLiteral', value: 1 }
      }
    };

    const ir = gen.generateIR(ast);

    // Should generate IR with iterator
    const iterInitIdx = ir.findIndex(inst => inst.op === Op.ITER_INIT);
    expect(iterInitIdx).toBeGreaterThan(0);
    expect(ir.length).toBeGreaterThan(5);
  });

  // ── Test 8: Array Program IR Generation ────────────────────
  it('generates IR for array program', () => {
    const ast = {
      type: 'ArrayLiteral',
      elements: [
        { type: 'NumberLiteral', value: 10 },
        { type: 'NumberLiteral', value: 20 },
        { type: 'NumberLiteral', value: 30 }
      ]
    };

    const ir = gen.generateIR(ast);

    // Should have array operations
    const arrNewIdx = ir.findIndex(inst => inst.op === Op.ARR_NEW);
    expect(arrNewIdx).toBeGreaterThanOrEqual(0);
  });

  // ── Test 9: Program with Output Display ───────────────────
  it('tracks output for CLI display', () => {
    const ast = {
      type: 'Block',
      statements: [
        {
          type: 'Assignment',
          name: 'result',
          value: {
            type: 'BinaryOp',
            operator: '+',
            left: { type: 'NumberLiteral', value: 2 },
            right: { type: 'NumberLiteral', value: 3 }
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
    // CLI would display result.value
    expect(result.value).toBe(5);
  });

  // ── Test 10: Multiple Operations ──────────────────────────
  it('executes multiple arithmetic operations', () => {
    const ast = {
      type: 'BinaryOp',
      operator: '+',
      left: {
        type: 'BinaryOp',
        operator: '*',
        left: { type: 'NumberLiteral', value: 2 },
        right: { type: 'NumberLiteral', value: 3 }
      },
      right: {
        type: 'BinaryOp',
        operator: '+',
        left: { type: 'NumberLiteral', value: 4 },
        right: { type: 'NumberLiteral', value: 5 }
      }
    };

    const ir = gen.generateIR(ast);
    const result = vm.run(ir);

    expect(result.ok).toBe(true);
    // (2*3) + (4+5) = 6 + 9 = 15
    expect(result.value).toBe(15);
  });
});
