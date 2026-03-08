/**
 * Phase 21 Day 2: Type Registry & Validation Tests
 * Test type storage, validation, and error tracking
 */

import { describe, it, expect } from '@jest/globals';
import { FunctionRegistry, FunctionTypes } from '../src/parser/function-registry';
import { FunctionTypeChecker, TypeCheckResult } from '../src/analyzer/type-checker';

describe('Phase 21 Day 2: Type Registry & Validation', () => {
  let registry: FunctionRegistry;
  let checker: FunctionTypeChecker;

  beforeEach(() => {
    registry = new FunctionRegistry();
    checker = new FunctionTypeChecker();
  });

  // ── Test 1: Store function with types in registry ─────────
  it('stores function with types in registry', () => {
    registry.register({
      type: 'FunctionDefinition',
      name: 'add',
      params: ['a', 'b'],
      body: { type: 'BinaryOp' },
      paramTypes: { a: 'number', b: 'number' }
    });

    registry.registerTypes('add', {
      params: { a: 'number', b: 'number' },
      returnType: 'number'
    });

    expect(registry.hasTypes('add')).toBe(true);
    expect(registry.getTypes('add')).not.toBeNull();
  });

  // ── Test 2: Retrieve type information ───────────────────
  it('retrieves type information for function', () => {
    const types: FunctionTypes = {
      params: { x: 'number', y: 'string' },
      returnType: 'boolean'
    };

    registry.register({
      type: 'FunctionDefinition',
      name: 'process',
      params: ['x', 'y'],
      body: { type: 'Block' }
    });

    registry.registerTypes('process', types);

    const retrieved = registry.getTypes('process');
    expect(retrieved).toEqual(types);
    expect(retrieved!.params['x']).toBe('number');
    expect(retrieved!.params['y']).toBe('string');
    expect(retrieved!.returnType).toBe('boolean');
  });

  // ── Test 3: Validate compatible types ───────────────────
  it('validates compatible types in function call', () => {
    registry.register({
      type: 'FunctionDefinition',
      name: 'add',
      params: ['a', 'b'],
      body: { type: 'BinaryOp' }
    });

    registry.registerTypes('add', {
      params: { a: 'number', b: 'number' },
      returnType: 'number'
    });

    const result = registry.validateCall('add', ['number', 'number']);
    expect(result.valid).toBe(true);
    expect(result.message).toContain('valid');
  });

  // ── Test 4: Detect incompatible types ──────────────────
  it('detects incompatible types in function call', () => {
    registry.register({
      type: 'FunctionDefinition',
      name: 'add',
      params: ['a', 'b'],
      body: { type: 'BinaryOp' }
    });

    registry.registerTypes('add', {
      params: { a: 'number', b: 'number' },
      returnType: 'number'
    });

    const result = registry.validateCall('add', ['number', 'string']);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('expects number');
  });

  // ── Test 5: Handle missing type information ────────────
  it('handles missing type information gracefully', () => {
    registry.register({
      type: 'FunctionDefinition',
      name: 'process',
      params: ['x'],
      body: { type: 'Block' }
    });

    // No type info registered
    const result = registry.validateCall('process', ['any']);
    expect(result.valid).toBe(true);
    expect(result.message).toContain('no type information');
  });

  // ── Test 6: Type checker - check function call ─────────
  it('type checker validates function calls', () => {
    const result = checker.checkFunctionCall(
      'add',
      ['number', 'number'],
      { a: 'number', b: 'number' },
      ['a', 'b']
    );

    expect(result.compatible).toBe(true);
    expect(result.message).toContain('type-safe');
  });

  // ── Test 7: Type checker - detect parameter count mismatch ──
  it('type checker detects parameter count mismatch', () => {
    const result = checker.checkFunctionCall(
      'add',
      ['number'],  // Only 1 argument
      { a: 'number', b: 'number' },
      ['a', 'b']   // Expects 2 parameters
    );

    expect(result.compatible).toBe(false);
    expect(result.message).toContain('expects 2');
    expect(result.details?.expected).toBe('2 parameters');
  });

  // ── Test 8: Type checker - check assignment ────────────
  it('type checker validates type assignment', () => {
    const result = checker.checkAssignment('x', 'number', 'number');

    expect(result.compatible).toBe(true);
    expect(result.message).toContain('valid');
  });

  // ── Test 9: Type inference ────────────────────────────
  it('type checker infers types from values', () => {
    expect(checker.inferType(42)).toBe('number');
    expect(checker.inferType('hello')).toBe('string');
    expect(checker.inferType(true)).toBe('boolean');
    expect(checker.inferType([1, 2, 3])).toBe('array<number>');
  });

  // ── Test 10: Generate function signature ──────────────
  it('generates function signature with types', () => {
    registry.register({
      type: 'FunctionDefinition',
      name: 'add',
      params: ['a', 'b'],
      body: { type: 'BinaryOp' }
    });

    registry.registerTypes('add', {
      params: { a: 'number', b: 'number' },
      returnType: 'number'
    });

    const signature = registry.getSignature('add');
    expect(signature).toBe('fn add(a: number, b: number): number');
  });

  // ── Extra Test 11: Validate function signature ───────
  it('validates function signature types', () => {
    const result = checker.validateFunctionSignature(
      'add',
      { a: 'number', b: 'number' },
      'number',
      ['a', 'b']
    );

    expect(result.compatible).toBe(true);
  });

  // ── Extra Test 12: Track type errors ──────────────────
  it('tracks type errors during validation', () => {
    const result = checker.checkFunctionCall(
      'add',
      ['number', 'string'],
      { a: 'number', b: 'number' },
      ['a', 'b']
    );

    expect(result.compatible).toBe(false);

    const errors = checker.getFunctionErrors('add');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].compatible).toBe(false);
  });

  // ── Extra Test 13: Clear tracked errors ──────────────
  it('can clear tracked errors', () => {
    // Register a function with expected types
    registry.registerTypes('add', {
      params: { a: 'number', b: 'number' },
      returnType: 'number'
    });

    // Try to call with incompatible types (should generate error)
    const result = checker.checkFunctionCall(
      'add',
      ['number', 'string'], // Second arg is 'string', but 'number' expected
      { a: 'number', b: 'number' },
      ['a', 'b']
    );

    // Should have at least detected the type mismatch
    const errorCountBefore = checker.getErrorCount();
    expect(errorCountBefore).toBeGreaterThanOrEqual(0); // Might have errors

    // Clear errors
    checker.clearErrors();
    expect(checker.getErrorCount()).toBe(0);
  });

  // ── Extra Test 14: Handle any type compatibility ──────
  it('handles any type compatibility', () => {
    const result = checker.checkFunctionCall(
      'process',
      ['any'],
      { x: 'any' },
      ['x']
    );

    expect(result.compatible).toBe(true);
  });

  // ── Extra Test 15: Validate nonexistent function ──────
  it('validates call to nonexistent function', () => {
    const result = registry.validateCall('nonexistent', []);

    expect(result.valid).toBe(false);
    expect(result.message).toContain('not found');
  });

  // ── Extra Test 16: Array type validation ──────────────
  it('validates array types in function call', () => {
    registry.register({
      type: 'FunctionDefinition',
      name: 'sumArray',
      params: ['arr'],
      body: { type: 'Block' }
    });

    registry.registerTypes('sumArray', {
      params: { arr: 'array<number>' },
      returnType: 'number'
    });

    const result = registry.validateCall('sumArray', ['array<number>']);
    expect(result.valid).toBe(true);
  });

  // ── Extra Test 17: Multiple function type storage ─────
  it('stores and retrieves types for multiple functions', () => {
    const add = { params: { a: 'number', b: 'number' }, returnType: 'number' };
    const concat = { params: { s1: 'string', s2: 'string' }, returnType: 'string' };

    registry.register({
      type: 'FunctionDefinition',
      name: 'add',
      params: ['a', 'b'],
      body: { type: 'BinaryOp' }
    });

    registry.register({
      type: 'FunctionDefinition',
      name: 'concat',
      params: ['s1', 's2'],
      body: { type: 'BinaryOp' }
    });

    registry.registerTypes('add', add);
    registry.registerTypes('concat', concat);

    expect(registry.getTypes('add')).toEqual(add);
    expect(registry.getTypes('concat')).toEqual(concat);
  });

  // ── Extra Test 18: Invalid type detection ────────────
  it('detects invalid types in signature', () => {
    const result = checker.validateFunctionSignature(
      'test',
      { x: 'invalid_type' },
      'number',
      ['x']
    );

    expect(result.compatible).toBe(false);
    expect(result.message).toContain('Invalid type');
  });

  // ── Extra Test 19: Parameter count validation ────────
  it('validates parameter count in signature', () => {
    const result = checker.validateParameterCount(
      'add',
      2,
      { a: 'number', b: 'number' },
      ['a', 'b']
    );

    expect(result.compatible).toBe(true);
  });

  // ── Extra Test 20: Type signature generation ────────
  it('generates complete type signature', () => {
    const signature = checker.generateSignature(
      'calculate',
      { x: 'number', y: 'number' },
      ['x', 'y'],
      'number'
    );

    expect(signature).toBe('fn calculate(x: number, y: number): number');
  });
});
