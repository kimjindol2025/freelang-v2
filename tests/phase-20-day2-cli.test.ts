/**
 * Phase 20 Day 2: CLI Integration
 * Test CLI commands with functions: run, eval, ir
 */

import { describe, it, expect } from '@jest/globals';
import { ProgramRunner } from '../src/cli/runner';
import { FunctionParser } from '../src/cli/parser';
import { FunctionRegistry } from '../src/parser/function-registry';

describe('Phase 20 Day 2: CLI Integration', () => {
  // ── Test 1: Parse simple program with function ──────────────────
  it('parses program with function definition', () => {
    const source = `fn add(a, b) {
      return a + b
    }`;

    const parsed = FunctionParser.parseProgram(source);

    expect(parsed.functionDefs).toHaveLength(1);
    expect(parsed.functionDefs[0].name).toBe('add');
    expect(parsed.functionDefs[0].params).toEqual(['a', 'b']);
  });

  // ── Test 2: Detect functions in program ──────────────────────────
  it('detects function definitions in program', () => {
    const withFunctions = `fn double(x) { return x * 2 }`;
    const withoutFunctions = `result = 5 + 3`;

    expect(FunctionParser.hasFunctionDefinitions(withFunctions)).toBe(true);
    expect(FunctionParser.hasFunctionDefinitions(withoutFunctions)).toBe(false);
  });

  // ── Test 3: Extract function names ─────────────────────────────────
  it('extracts all function names from program', () => {
    const source = `
      fn add(a, b) { return a + b }
      fn subtract(a, b) { return a - b }
      fn multiply(a, b) { return a * b }
    `;

    const names = FunctionParser.getFunctionNames(source);

    expect(names).toEqual(['add', 'subtract', 'multiply']);
  });

  // ── Test 4: Extract all parameters ─────────────────────────────────
  it('extracts all function parameters', () => {
    const source = `
      fn add(a, b) { return a + b }
      fn greet(first, last) { return first + last }
      fn getValue() { return 42 }
    `;

    const params = FunctionParser.getAllParameters(source);

    expect(params['add']).toEqual(['a', 'b']);
    expect(params['greet']).toEqual(['first', 'last']);
    expect(params['getValue']).toEqual([]);
  });

  // ── Test 5: Runner registers functions ─────────────────────────────
  it('ProgramRunner registers functions from source', () => {
    const runner = new ProgramRunner();
    const source = `fn test(x) { return x }`;

    const parsed = FunctionParser.parseProgram(source);
    for (const fnDef of parsed.functionDefs) {
      runner.getRegistry().register({
        type: 'FunctionDefinition',
        name: fnDef.name,
        params: fnDef.params,
        body: { type: 'Identifier', name: fnDef.body }
      });
    }

    expect(runner.getRegistry().exists('test')).toBe(true);
    expect(runner.getRegistry().count()).toBe(1);
  });

  // ── Test 6: Function lookup ────────────────────────────────────────
  it('runner can lookup registered functions', () => {
    const runner = new ProgramRunner();
    const source = `fn double(x) { return x * 2 }`;

    const parsed = FunctionParser.parseProgram(source);
    for (const fnDef of parsed.functionDefs) {
      runner.getRegistry().register({
        type: 'FunctionDefinition',
        name: fnDef.name,
        params: fnDef.params,
        body: {
          type: 'BinaryOp',
          operator: '*',
          left: { type: 'Identifier', name: 'x' },
          right: { type: 'NumberLiteral', value: 2 }
        }
      });
    }

    const fn = runner.getRegistry().lookup('double');
    expect(fn).not.toBeNull();
    expect(fn?.name).toBe('double');
    expect(fn?.params).toEqual(['x']);
  });

  // ── Test 7: Multiple functions registration ────────────────────────
  it('registers multiple functions from source', () => {
    const runner = new ProgramRunner();
    const source = `
      fn add(a, b) { return a + b }
      fn sub(a, b) { return a - b }
    `;

    const parsed = FunctionParser.parseProgram(source);
    expect(parsed.functionDefs).toHaveLength(2);

    for (const fnDef of parsed.functionDefs) {
      runner.getRegistry().register({
        type: 'FunctionDefinition',
        name: fnDef.name,
        params: fnDef.params,
        body: { type: 'NumberLiteral', value: 0 }
      });
    }

    expect(runner.getRegistry().count()).toBe(2);
    expect(runner.getRegistry().exists('add')).toBe(true);
    expect(runner.getRegistry().exists('sub')).toBe(true);
  });

  // ── Test 8: Shared registry between runners ────────────────────────
  it('shares function registry when provided', () => {
    const sharedRegistry = new FunctionRegistry();
    const runner1 = new ProgramRunner(sharedRegistry);
    const runner2 = new ProgramRunner(sharedRegistry);

    // Register function in first runner
    sharedRegistry.register({
      type: 'FunctionDefinition',
      name: 'shared',
      params: [],
      body: { type: 'NumberLiteral', value: 42 }
    });

    // Second runner should see it
    expect(runner2.getRegistry().exists('shared')).toBe(true);
  });

  // ── Test 9: Function statistics ────────────────────────────────────
  it('tracks function registration statistics', () => {
    const runner = new ProgramRunner();
    const source = `
      fn f1() { return 1 }
      fn f2() { return 2 }
      fn f3() { return 3 }
    `;

    const parsed = FunctionParser.parseProgram(source);
    for (const fnDef of parsed.functionDefs) {
      runner.getRegistry().register({
        type: 'FunctionDefinition',
        name: fnDef.name,
        params: fnDef.params,
        body: { type: 'NumberLiteral', value: 0 }
      });
    }

    const stats = runner.getRegistry().getStats();
    expect(stats.totalFunctions).toBe(3);
    expect(stats.totalCalls).toBe(0);
  });

  // ── Test 10: Registry clear functionality ──────────────────────────
  it('clears all functions from registry', () => {
    const runner = new ProgramRunner();

    // Register some functions
    runner.getRegistry().register({
      type: 'FunctionDefinition',
      name: 'fn1',
      params: [],
      body: { type: 'NumberLiteral', value: 1 }
    });

    runner.getRegistry().register({
      type: 'FunctionDefinition',
      name: 'fn2',
      params: [],
      body: { type: 'NumberLiteral', value: 2 }
    });

    expect(runner.getRegistry().count()).toBe(2);

    // Clear
    runner.getRegistry().clear();

    expect(runner.getRegistry().count()).toBe(0);
    expect(runner.getRegistry().exists('fn1')).toBe(false);
  });
});
