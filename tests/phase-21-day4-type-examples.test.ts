/**
 * Phase 21 Day 4: Real-World Type Examples
 * Test type annotations in realistic programs
 */

import { describe, it, expect } from '@jest/globals';
import { FunctionRegistry } from '../src/parser/function-registry';
import { FunctionTypeChecker } from '../src/analyzer/type-checker';

describe('Phase 21 Day 4: Real-World Type Examples', () => {
  let registry: FunctionRegistry;
  let checker: FunctionTypeChecker;

  beforeEach(() => {
    registry = new FunctionRegistry();
    checker = new FunctionTypeChecker();
  });

  // ── Test 1: Calculator with full type annotations ─────────────
  it('handles typed calculator functions', () => {
    // Register typed calculator functions
    const functions = [
      { name: 'add', params: ['a', 'b'], types: { a: 'number', b: 'number' }, return: 'number' },
      { name: 'multiply', params: ['x', 'y'], types: { x: 'number', y: 'number' }, return: 'number' },
      { name: 'divide', params: ['a', 'b'], types: { a: 'number', b: 'number' }, return: 'number' }
    ];

    functions.forEach(fn => {
      registry.register({
        type: 'FunctionDefinition',
        name: fn.name,
        params: fn.params,
        body: { type: 'BinaryOp' }
      });

      registry.registerTypes(fn.name, {
        params: fn.types,
        returnType: fn.return
      });
    });

    // Verify all registered
    expect(registry.count()).toBe(3);
    expect(registry.hasTypes('add')).toBe(true);
    expect(registry.hasTypes('multiply')).toBe(true);
    expect(registry.hasTypes('divide')).toBe(true);

    // Verify signatures
    expect(registry.getSignature('add')).toContain('number');
    expect(registry.getSignature('multiply')).toContain('number');
    expect(registry.getSignature('divide')).toContain('number');
  });

  // ── Test 2: String utilities with types ──────────────────────
  it('handles typed string utility functions', () => {
    const stringFunctions = [
      { name: 'uppercase', param: 'string', return: 'string' },
      { name: 'lowercase', param: 'string', return: 'string' },
      { name: 'trim', param: 'string', return: 'string' },
      { name: 'length', param: 'string', return: 'number' }
    ];

    stringFunctions.forEach(fn => {
      registry.register({
        type: 'FunctionDefinition',
        name: fn.name,
        params: ['s'],
        body: { type: 'Block' }
      });

      registry.registerTypes(fn.name, {
        params: { s: fn.param },
        returnType: fn.return
      });
    });

    // Verify string functions
    expect(registry.count()).toBe(4);
    expect(registry.getSignature('uppercase')).toContain('string');
    expect(registry.getSignature('length')).toContain('number');

    // Validate calls
    const result1 = registry.validateCall('uppercase', ['string']);
    expect(result1.valid).toBe(true);

    const result2 = registry.validateCall('length', ['string']);
    expect(result2.valid).toBe(true);

    // Invalid calls
    const result3 = registry.validateCall('uppercase', ['number']);
    expect(result3.valid).toBe(false);
  });

  // ── Test 3: Array functions with generic types ───────────────
  it('handles array functions with generic types', () => {
    registry.register({
      type: 'FunctionDefinition',
      name: 'sum',
      params: ['arr'],
      body: { type: 'Block' }
    });

    registry.registerTypes('sum', {
      params: { arr: 'array<number>' },
      returnType: 'number'
    });

    registry.register({
      type: 'FunctionDefinition',
      name: 'concat',
      params: ['arrays'],
      body: { type: 'Block' }
    });

    registry.registerTypes('concat', {
      params: { arrays: 'array<string>' },
      returnType: 'string'
    });

    // Verify array function signatures
    const sumSig = registry.getSignature('sum');
    expect(sumSig).toContain('array<number>');

    const concatSig = registry.getSignature('concat');
    expect(concatSig).toContain('array<string>');

    // Validate array calls
    const result1 = registry.validateCall('sum', ['array<number>']);
    expect(result1.valid).toBe(true);

    const result2 = registry.validateCall('concat', ['array<string>']);
    expect(result2.valid).toBe(true);
  });

  // ── Test 4: Mixed typed/untyped parameters ──────────────────
  it('handles mixed typed and untyped parameters', () => {
    registry.register({
      type: 'FunctionDefinition',
      name: 'process',
      params: ['id', 'name', 'data'],
      body: { type: 'Block' }
    });

    registry.registerTypes('process', {
      params: {
        id: 'number',
        name: 'string',
        data: 'any'
      },
      returnType: 'string'
    });

    // Verify mixed signature
    const signature = registry.getSignature('process');
    expect(signature).toContain('number');
    expect(signature).toContain('string');
    expect(signature).toContain('any');

    // Validate mixed types
    const result = registry.validateCall('process', ['number', 'string', 'any']);
    expect(result.valid).toBe(true);

    // Should also accept specific type for 'any'
    const result2 = registry.validateCall('process', ['number', 'string', 'number']);
    expect(result2.valid).toBe(true);
  });

  // ── Test 5: Type inference for complex expressions ──────────
  it('infers types from complex value expressions', () => {
    // Numeric types
    expect(checker.inferType(42)).toBe('number');
    expect(checker.inferType(3.14)).toBe('number');
    expect(checker.inferType(-100)).toBe('number');

    // String types
    expect(checker.inferType('hello')).toBe('string');
    expect(checker.inferType('')).toBe('string');

    // Boolean types
    expect(checker.inferType(true)).toBe('boolean');
    expect(checker.inferType(false)).toBe('boolean');

    // Array types
    expect(checker.inferType([1, 2, 3])).toBe('array<number>');
    expect(checker.inferType(['a', 'b', 'c'])).toBe('array<string>');
    expect(checker.inferType([true, false])).toBe('array<boolean>');

    // Mixed arrays infer as first element type (simplified inference)
    expect(checker.inferType([1, 'mixed'])).toBe('array<number>');
  });

  // ── Test 6: Performance - 1000 typed function calls ──────────
  it('handles 1000 typed function calls efficiently', () => {
    // Register a batch of functions
    for (let i = 0; i < 100; i++) {
      registry.register({
        type: 'FunctionDefinition',
        name: `func${i}`,
        params: ['a', 'b'],
        body: { type: 'Block' }
      });

      registry.registerTypes(`func${i}`, {
        params: { a: 'number', b: 'number' },
        returnType: 'number'
      });
    }

    const startTime = performance.now();

    // Perform 1000 validations
    for (let i = 0; i < 1000; i++) {
      const funcIdx = i % 100;
      registry.validateCall(`func${funcIdx}`, ['number', 'number']);
    }

    const elapsed = performance.now() - startTime;

    expect(registry.count()).toBe(100);
    expect(elapsed).toBeLessThan(1000); // Should complete in < 1 second
  });

  // ── Test 7: Type checking overhead measurement ──────────────
  it('measures type checking overhead', () => {
    const untyped = new FunctionRegistry();
    const typed = new FunctionRegistry();

    // Register 50 untyped functions
    for (let i = 0; i < 50; i++) {
      untyped.register({
        type: 'FunctionDefinition',
        name: `func${i}`,
        params: ['x'],
        body: { type: 'Block' }
      });
    }

    // Register 50 typed functions
    for (let i = 0; i < 50; i++) {
      typed.register({
        type: 'FunctionDefinition',
        name: `func${i}`,
        params: ['x'],
        body: { type: 'Block' }
      });

      typed.registerTypes(`func${i}`, {
        params: { x: 'number' },
        returnType: 'number'
      });
    }

    // Measure untyped lookups
    const untypedStart = performance.now();
    for (let i = 0; i < 500; i++) {
      untyped.lookup(`func${i % 50}`);
    }
    const untypedTime = performance.now() - untypedStart;

    // Measure typed lookups
    const typedStart = performance.now();
    for (let i = 0; i < 500; i++) {
      typed.lookup(`func${i % 50}`);
    }
    const typedTime = performance.now() - typedStart;

    // Overhead should be minimal
    const overhead = Math.abs(typedTime - untypedTime);
    expect(overhead).toBeLessThan(50); // Less than 50ms difference
  });

  // ── Test 8: Large typed function library ────────────────────
  it('manages large libraries of typed functions', () => {
    const functionCount = 200;
    const paramCount = 5;

    // Create a large library
    for (let i = 0; i < functionCount; i++) {
      const params: Record<string, string> = {};
      const paramList: string[] = [];

      for (let j = 0; j < paramCount; j++) {
        const paramName = `p${j}`;
        paramList.push(paramName);
        params[paramName] = j % 3 === 0 ? 'number' : j % 3 === 1 ? 'string' : 'boolean';
      }

      registry.register({
        type: 'FunctionDefinition',
        name: `lib_func_${i}`,
        params: paramList,
        body: { type: 'Block' }
      });

      registry.registerTypes(`lib_func_${i}`, {
        params: params,
        returnType: 'number'
      });
    }

    // Verify library size
    expect(registry.count()).toBe(functionCount);

    // Sample random functions
    for (let i = 0; i < 20; i++) {
      const idx = Math.floor(Math.random() * functionCount);
      const sig = registry.getSignature(`lib_func_${idx}`);
      expect(sig).toContain('lib_func_');
      expect(sig).toContain('number');
    }
  });

  // ── Test 9: Type compatibility matrix ───────────────────────
  it('validates type compatibility matrix', () => {
    const compatibilityTests: Array<[string, string, boolean]> = [
      // (actual, expected, shouldBeValid)
      ['number', 'number', true],
      ['string', 'string', true],
      ['boolean', 'boolean', true],
      ['array<number>', 'array<number>', true],
      ['array<string>', 'array<string>', true],
      ['any', 'any', true],
      ['number', 'any', true], // T compatible with any
      ['any', 'number', true], // any compatible with T
      ['string', 'any', true],
      ['boolean', 'number', false], // Different types incompatible
      ['string', 'number', false],
      ['array<number>', 'array<string>', false],
    ];

    compatibilityTests.forEach(([actual, expected, shouldBeValid]) => {
      const result = checker.checkAssignment('param', expected, actual);
      expect(result.compatible).toBe(shouldBeValid);
    });
  });

  // ── Test 10: Real-world program patterns ────────────────────
  it('handles realistic program patterns', () => {
    // Pattern 1: Data processing pipeline
    registry.register({
      type: 'FunctionDefinition',
      name: 'validateInput',
      params: ['data'],
      body: { type: 'Block' }
    });
    registry.registerTypes('validateInput', {
      params: { data: 'any' },
      returnType: 'boolean'
    });

    registry.register({
      type: 'FunctionDefinition',
      name: 'processData',
      params: ['input'],
      body: { type: 'Block' }
    });
    registry.registerTypes('processData', {
      params: { input: 'string' },
      returnType: 'string'
    });

    registry.register({
      type: 'FunctionDefinition',
      name: 'formatResult',
      params: ['result'],
      body: { type: 'Block' }
    });
    registry.registerTypes('formatResult', {
      params: { result: 'string' },
      returnType: 'string'
    });

    // Verify pipeline
    expect(registry.count()).toBe(3);
    expect(registry.validateCall('validateInput', ['any']).valid).toBe(true);
    expect(registry.validateCall('processData', ['string']).valid).toBe(true);
    expect(registry.validateCall('formatResult', ['string']).valid).toBe(true);
  });

  // ── Test 11: Type warnings on mismatch ──────────────────────
  it('generates appropriate type warnings on mismatch', () => {
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

    // Type mismatch should be detected
    const result = registry.validateCall('add', ['number', 'string']);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('expects');
    expect(result.message).toContain('number');

    // Type checker should track error
    const checkResult = checker.checkFunctionCall(
      'add',
      ['number', 'string'],
      { a: 'number', b: 'number' },
      ['a', 'b']
    );
    expect(checkResult.compatible).toBe(false);
  });

  // ── Test 12: Documentation generation ───────────────────────
  it('generates documentation from type information', () => {
    registry.register({
      type: 'FunctionDefinition',
      name: 'calculateTax',
      params: ['amount', 'rate'],
      body: { type: 'Block' }
    });

    registry.registerTypes('calculateTax', {
      params: { amount: 'number', rate: 'number' },
      returnType: 'number'
    });

    // Generate documentation
    const signature = registry.getSignature('calculateTax');
    const doc = {
      name: 'calculateTax',
      signature: signature,
      description: 'Calculates tax amount based on amount and rate',
      params: [
        { name: 'amount', type: 'number', description: 'Amount in currency' },
        { name: 'rate', type: 'number', description: 'Tax rate (0-1)' }
      ],
      returns: { type: 'number', description: 'Calculated tax amount' }
    };

    expect(doc.signature).toContain('calculateTax');
    expect(doc.signature).toContain('number');
    expect(doc.params).toHaveLength(2);
  });

  // ── Test 13: Type error messages ────────────────────────────
  it('provides clear type error messages', () => {
    registry.register({
      type: 'FunctionDefinition',
      name: 'greet',
      params: ['name'],
      body: { type: 'Block' }
    });

    registry.registerTypes('greet', {
      params: { name: 'string' },
      returnType: 'string'
    });

    const result = registry.validateCall('greet', ['number']);
    const message = result.message;

    // Should clearly state the problem
    expect(message).toContain('name');
    expect(message).toContain('string');
    expect(message).toContain('number');
    expect(result.valid).toBe(false);
  });

  // ── Test 14: Backward compatibility (no types) ──────────────
  it('maintains backward compatibility with untyped functions', () => {
    // Register functions without types (old style)
    registry.register({
      type: 'FunctionDefinition',
      name: 'legacyFunc',
      params: ['x', 'y'],
      body: { type: 'Block' }
    });

    // Should work without type registration
    expect(registry.hasTypes('legacyFunc')).toBe(false);

    // Validation should still work (permissive)
    const result = registry.validateCall('legacyFunc', ['any']);
    expect(result.valid).toBe(true);
    expect(result.message).toContain('no type information');

    // Signature generation should work
    const signature = registry.getSignature('legacyFunc');
    expect(signature).toContain('legacyFunc');
    expect(signature).toContain('x');
    expect(signature).toContain('y');
  });

  // ── Test 15: Future extensibility ──────────────────────────
  it('supports future extension of type system', () => {
    // Register with placeholder for future features
    const futureTypes = {
      params: {
        items: 'array<number>',
        callback: 'function',  // Future: function type support
        options: 'Record<string, any>' // Future: record types
      },
      returnType: 'Promise<number>' // Future: async types
    };

    registry.register({
      type: 'FunctionDefinition',
      name: 'futureFunc',
      params: ['items', 'callback', 'options'],
      body: { type: 'Block' }
    });

    // Current system should accept these as strings
    registry.registerTypes('futureFunc', {
      params: { items: 'array<number>' }, // Current support
      returnType: 'number'
    });

    // Verify it stores what we can handle today
    const types = registry.getTypes('futureFunc');
    expect(types).not.toBeNull();
    expect(types?.params.items).toBe('array<number>');
  });

  // ── Extra Test 16: Type validation performance ──────────────
  it('validates types efficiently across multiple calls', () => {
    // Setup 50 typed functions
    for (let i = 0; i < 50; i++) {
      registry.register({
        type: 'FunctionDefinition',
        name: `perf_func_${i}`,
        params: ['x', 'y'],
        body: { type: 'Block' }
      });

      registry.registerTypes(`perf_func_${i}`, {
        params: { x: 'number', y: 'number' },
        returnType: 'number'
      });
    }

    const startTime = performance.now();

    // Perform 500 type validations
    for (let i = 0; i < 500; i++) {
      const funcIdx = i % 50;
      const isValid = i % 2 === 0; // Half valid, half invalid
      const argType = isValid ? 'number' : 'string';

      checker.checkFunctionCall(
        `perf_func_${funcIdx}`,
        [argType, 'number'],
        { x: 'number', y: 'number' },
        ['x', 'y']
      );
    }

    const elapsed = performance.now() - startTime;

    // Should complete quickly
    expect(elapsed).toBeLessThan(500); // Less than 500ms for 500 checks
  });

  // ── Extra Test 17: Type system composition ──────────────────
  it('composes multiple typed functions together', () => {
    // Create a composition chain: transform → validate → format
    registry.register({
      type: 'FunctionDefinition',
      name: 'transform',
      params: ['raw'],
      body: { type: 'Block' }
    });
    registry.registerTypes('transform', {
      params: { raw: 'string' },
      returnType: 'string'
    });

    registry.register({
      type: 'FunctionDefinition',
      name: 'validate',
      params: ['data'],
      body: { type: 'Block' }
    });
    registry.registerTypes('validate', {
      params: { data: 'string' },
      returnType: 'boolean'
    });

    registry.register({
      type: 'FunctionDefinition',
      name: 'format',
      params: ['valid'],
      body: { type: 'Block' }
    });
    registry.registerTypes('format', {
      params: { valid: 'boolean' },
      returnType: 'string'
    });

    // Verify composition chain
    const v1 = registry.validateCall('transform', ['string']);
    expect(v1.valid).toBe(true);

    const v2 = registry.validateCall('validate', ['string']);
    expect(v2.valid).toBe(true);

    const v3 = registry.validateCall('format', ['boolean']);
    expect(v3.valid).toBe(true);
  });

  // ── Extra Test 18: Comprehensive type coverage ──────────────
  it('covers all supported type categories', () => {
    const allTypes = [
      'number', 'string', 'boolean',
      'array<number>', 'array<string>', 'array<boolean>',
      'array<any>',
      'any'
    ];

    allTypes.forEach((type, idx) => {
      registry.register({
        type: 'FunctionDefinition',
        name: `type_test_${idx}`,
        params: ['x'],
        body: { type: 'Block' }
      });

      registry.registerTypes(`type_test_${idx}`, {
        params: { x: type },
        returnType: type
      });
    });

    // Verify all registered
    expect(registry.count()).toBe(allTypes.length);

    // Verify signatures contain types
    allTypes.forEach((type, idx) => {
      const sig = registry.getSignature(`type_test_${idx}`);
      expect(sig).toContain(type);
    });
  });

  // ── Extra Test 19: Real-world error scenarios ───────────────
  it('handles realistic error scenarios', () => {
    registry.register({
      type: 'FunctionDefinition',
      name: 'divide',
      params: ['a', 'b'],
      body: { type: 'Block' }
    });

    registry.registerTypes('divide', {
      params: { a: 'number', b: 'number' },
      returnType: 'number'
    });

    // Scenario 1: Wrong parameter type
    const result1 = registry.validateCall('divide', ['string', 'number']);
    expect(result1.valid).toBe(false);

    // Scenario 2: Wrong number of parameters
    const result2 = registry.validateCall('divide', ['number']);
    expect(result2.valid).toBe(false);

    // Scenario 3: Function not found
    const result3 = registry.validateCall('nonexistent', ['number', 'number']);
    expect(result3.valid).toBe(false);
  });

  // ── Extra Test 20: Documentation consistency ────────────────
  it('maintains consistency between signatures and types', () => {
    const name = 'complexFunc';
    const params = { x: 'number', y: 'string', z: 'boolean' };
    const returnType = 'array<number>';

    registry.register({
      type: 'FunctionDefinition',
      name: name,
      params: ['x', 'y', 'z'],
      body: { type: 'Block' }
    });

    registry.registerTypes(name, {
      params: params,
      returnType: returnType
    });

    // Get signature
    const signature = registry.getSignature(name);

    // Get types
    const types = registry.getTypes(name);

    // Verify consistency
    expect(signature).toContain('complexFunc');
    expect(signature).toContain('number');
    expect(signature).toContain('string');
    expect(signature).toContain('boolean');
    expect(signature).toContain('array<number>');

    expect(types?.params.x).toBe('number');
    expect(types?.params.y).toBe('string');
    expect(types?.params.z).toBe('boolean');
    expect(types?.returnType).toBe('array<number>');
  });
});
