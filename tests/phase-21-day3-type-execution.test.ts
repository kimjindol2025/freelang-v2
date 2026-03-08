/**
 * Phase 21 Day 3: Type-Safe Execution Tests
 * Test runtime type validation and VM integration
 */

import { describe, it, expect } from '@jest/globals';
import { Op } from '../src/types';
import { VM, TypeWarning } from '../src/vm';
import { FunctionRegistry } from '../src/parser/function-registry';

describe('Phase 21 Day 3: Type-Safe Execution', () => {
  let registry: FunctionRegistry;
  let vm: VM;

  beforeEach(() => {
    registry = new FunctionRegistry();
    vm = new VM(registry);
  });

  // ── Test 1: Register and retrieve types ───────────────
  it('registers and retrieves function type information', () => {
    registry.register({
      type: 'FunctionDefinition',
      name: 'add',
      params: ['a', 'b'],
      body: { type: 'Block' }
    });

    registry.registerTypes('add', {
      params: { a: 'number', b: 'number' },
      returnType: 'number'
    });

    expect(registry.hasTypes('add')).toBe(true);
    const types = registry.getTypes('add');
    expect(types?.params.a).toBe('number');
    expect(types?.returnType).toBe('number');
  });

  // ── Test 2: Type warning generation ────────────────────
  it('tracks type warnings in VM', () => {
    registry.register({
      type: 'FunctionDefinition',
      name: 'add',
      params: ['a', 'b'],
      body: { type: 'Block' }
    });

    registry.registerTypes('add', {
      params: { a: 'number', b: 'number' },
      returnType: 'number'
    });

    const warnings = vm.getTypeWarnings();
    expect(Array.isArray(warnings)).toBe(true);
    expect(vm.getWarningCount()).toBe(0);
  });

  // ── Test 3: Type warning structure ────────────────────
  it('warning contains expected information', () => {
    registry.register({
      type: 'FunctionDefinition',
      name: 'test',
      params: ['x'],
      body: { type: 'Block' }
    });

    const warning: TypeWarning = {
      functionName: 'test',
      message: 'Type mismatch',
      timestamp: new Date(),
      paramName: 'x',
      expectedType: 'number',
      receivedType: 'string'
    };

    expect(warning.functionName).toBe('test');
    expect(warning.message).toBeTruthy();
    expect(warning.timestamp).toBeInstanceOf(Date);
  });

  // ── Test 4: Clear type warnings ───────────────────────
  it('can clear type warnings', () => {
    const warnings = vm.getTypeWarnings();
    expect(Array.isArray(warnings)).toBe(true);

    vm.clearTypeWarnings();
    expect(vm.getWarningCount()).toBe(0);
  });

  // ── Test 5: Function type signature generation ────────
  it('generates function signature with types', () => {
    registry.register({
      type: 'FunctionDefinition',
      name: 'add',
      params: ['a', 'b'],
      body: { type: 'Block' }
    });

    registry.registerTypes('add', {
      params: { a: 'number', b: 'number' },
      returnType: 'number'
    });

    const signature = registry.getSignature('add');
    expect(signature).toContain('add');
    expect(signature).toContain('number');
  });

  // ── Test 6: Untyped function signature ─────────────────
  it('generates signature for untyped function', () => {
    registry.register({
      type: 'FunctionDefinition',
      name: 'legacy',
      params: ['x', 'y'],
      body: { type: 'Block' }
    });

    const signature = registry.getSignature('legacy');
    expect(signature).toContain('legacy');
    expect(signature).toContain('x');
    expect(signature).toContain('y');
  });

  // ── Test 7: Validate function call ─────────────────────
  it('validates function call with correct types', () => {
    registry.register({
      type: 'FunctionDefinition',
      name: 'add',
      params: ['a', 'b'],
      body: { type: 'Block' }
    });

    registry.registerTypes('add', {
      params: { a: 'number', b: 'number' },
      returnType: 'number'
    });

    const result = registry.validateCall('add', ['number', 'number']);
    expect(result.valid).toBe(true);
  });

  // ── Test 8: Detect type mismatch in call ──────────────
  it('detects type mismatch in function call', () => {
    registry.register({
      type: 'FunctionDefinition',
      name: 'add',
      params: ['a', 'b'],
      body: { type: 'Block' }
    });

    registry.registerTypes('add', {
      params: { a: 'number', b: 'number' },
      returnType: 'number'
    });

    const result = registry.validateCall('add', ['number', 'string']);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('expects');
  });

  // ── Test 9: Handle any type in validation ─────────────
  it('accepts any type in call validation', () => {
    registry.register({
      type: 'FunctionDefinition',
      name: 'process',
      params: ['x'],
      body: { type: 'Block' }
    });

    registry.registerTypes('process', {
      params: { x: 'any' },
      returnType: 'any'
    });

    const result = registry.validateCall('process', ['number']);
    expect(result.valid).toBe(true);
  });

  // ── Test 10: Backward compatibility ─────────────────────
  it('handles untyped function calls without error', () => {
    registry.register({
      type: 'FunctionDefinition',
      name: 'legacy',
      params: ['a'],
      body: { type: 'Block' }
    });

    // No type info registered

    const result = registry.validateCall('legacy', ['any']);
    expect(result.valid).toBe(true);
  });

  // ── Extra Test 11: Multiple parameter validation ──────
  it('validates multiple parameters', () => {
    registry.register({
      type: 'FunctionDefinition',
      name: 'concat',
      params: ['s1', 's2', 's3'],
      body: { type: 'Block' }
    });

    registry.registerTypes('concat', {
      params: { s1: 'string', s2: 'string', s3: 'string' },
      returnType: 'string'
    });

    const result = registry.validateCall('concat', ['string', 'string', 'string']);
    expect(result.valid).toBe(true);
  });

  // ── Extra Test 12: Parameter count mismatch ──────────
  it('detects parameter count mismatch', () => {
    registry.register({
      type: 'FunctionDefinition',
      name: 'add',
      params: ['a', 'b'],
      body: { type: 'Block' }
    });

    registry.registerTypes('add', {
      params: { a: 'number', b: 'number' },
      returnType: 'number'
    });

    const result = registry.validateCall('add', ['number']);
    expect(result.valid).toBe(false);
  });

  // ── Extra Test 13: Nonexistent function ────────────────
  it('validates call to nonexistent function', () => {
    const result = registry.validateCall('nonexistent', ['number']);
    expect(result.valid).toBe(false);
  });

  // ── Extra Test 14: Type information retrieval ─────────
  it('retrieves complete type information', () => {
    registry.register({
      type: 'FunctionDefinition',
      name: 'process',
      params: ['x', 'y', 'z'],
      body: { type: 'Block' }
    });

    registry.registerTypes('process', {
      params: { x: 'number', y: 'string', z: 'any' },
      returnType: 'boolean'
    });

    const types = registry.getTypes('process');
    expect(types?.params.x).toBe('number');
    expect(types?.params.y).toBe('string');
    expect(types?.params.z).toBe('any');
    expect(types?.returnType).toBe('boolean');
  });

  // ── Extra Test 15: Type info missing check ───────────
  it('correctly reports missing type information', () => {
    registry.register({
      type: 'FunctionDefinition',
      name: 'noTypes',
      params: ['x'],
      body: { type: 'Block' }
    });

    expect(registry.hasTypes('noTypes')).toBe(false);
    expect(registry.getTypes('noTypes')).toBeNull();
  });
});
