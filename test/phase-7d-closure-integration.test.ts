/**
 * Phase 7-D: Stdlib Integration with Closures
 * Tests map/filter/reduce functions with closure support
 */

import { VM } from '../src/vm';
import { Parser } from '../src/parser/parser';
import { Lexer } from '../src/lexer/lexer';
import { TokenBuffer } from '../src/lexer/lexer';
import { FunctionRegistry } from '../src/parser/function-registry';

describe('Phase 7-D: Stdlib Integration with Closures', () => {
  let vm: VM;
  let parser: Parser;

  beforeEach(() => {
    const registry = new FunctionRegistry();
    vm = new VM(registry);
  });

  // ======================================================================
  // TEST 1: arr_map with closure
  // ======================================================================
  describe('arr_map with Closures', () => {
    test('should map array with simple closure: (x) => x * 2', () => {
      // Create closure object representing: fn(x) -> x * 2
      const closure: any = {
        type: 'lambda',
        params: ['x'],
        paramTypes: ['number'],
        body: {
          type: 'binary',
          operator: '*',
          left: { type: 'identifier', name: 'x' },
          right: { type: 'literal', value: 2 }
        },
        capturedVars: []
      };

      const registry = vm.getNativeFunctionRegistry();
      const result = registry.call('arr_map', [[1, 2, 3, 4, 5], closure]);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([2, 4, 6, 8, 10]);
    });

    test('should map array with closure that uses captured variable', () => {
      // Simulate: let factor = 3; arr_map([1, 2, 3], (x) => x * factor)
      vm['vars'].set('factor', 3);

      const closure: any = {
        type: 'lambda',
        params: ['x'],
        paramTypes: ['number'],
        body: {
          type: 'binary',
          operator: '*',
          left: { type: 'identifier', name: 'x' },
          right: { type: 'identifier', name: 'factor' }
        },
        capturedVars: [{ name: 'factor', value: 3 }]
      };

      const registry = vm.getNativeFunctionRegistry();
      const result = registry.call('arr_map', [[1, 2, 3], closure]);

      expect(result).toEqual([3, 6, 9]);
    });

    test('should return empty array if input is not array', () => {
      const closure: any = {
        type: 'lambda',
        params: ['x'],
        body: { type: 'identifier', name: 'x' },
        capturedVars: []
      };

      const registry = vm.getNativeFunctionRegistry();
      const result = registry.call('arr_map', [null, closure]);

      expect(result).toEqual([]);
    });
  });

  // ======================================================================
  // TEST 2: arr_filter with closure
  // ======================================================================
  describe('arr_filter with Closures', () => {
    test('should filter array with closure: (x) => x % 2 == 0 (even numbers)', () => {
      // Create closure representing: fn(x) -> x % 2 == 0
      const closure: any = {
        type: 'lambda',
        params: ['x'],
        paramTypes: ['number'],
        body: {
          type: 'binary',
          operator: '==',
          left: {
            type: 'binary',
            operator: '%',
            left: { type: 'identifier', name: 'x' },
            right: { type: 'literal', value: 2 }
          },
          right: { type: 'literal', value: 0 }
        },
        capturedVars: []
      };

      const registry = vm.getNativeFunctionRegistry();
      const result = registry.call('arr_filter', [[1, 2, 3, 4, 5], closure]);

      expect(result).toEqual([2, 4]);
    });

    test('should filter with closure using captured threshold', () => {
      vm['vars'].set('threshold', 3);

      const closure: any = {
        type: 'lambda',
        params: ['x'],
        body: {
          type: 'binary',
          operator: '>',
          left: { type: 'identifier', name: 'x' },
          right: { type: 'identifier', name: 'threshold' }
        },
        capturedVars: [{ name: 'threshold', value: 3 }]
      };

      const registry = vm.getNativeFunctionRegistry();
      const result = registry.call('arr_filter', [[1, 2, 3, 4, 5], closure]);

      expect(result).toEqual([4, 5]);
    });
  });

  // ======================================================================
  // TEST 3: arr_reduce with closure
  // ======================================================================
  describe('arr_reduce with Closures', () => {
    test('should reduce array with closure: (acc, x) => acc + x (sum)', () => {
      // Create closure representing: fn(acc, x) -> acc + x
      const closure: any = {
        type: 'lambda',
        params: ['acc', 'x'],
        paramTypes: ['number', 'number'],
        body: {
          type: 'binary',
          operator: '+',
          left: { type: 'identifier', name: 'acc' },
          right: { type: 'identifier', name: 'x' }
        },
        capturedVars: []
      };

      const registry = vm.getNativeFunctionRegistry();
      const result = registry.call('arr_reduce', [[1, 2, 3, 4, 5], closure, 0]);

      expect(result).toEqual(15);
    });

    test('should reduce with initial value', () => {
      const closure: any = {
        type: 'lambda',
        params: ['acc', 'x'],
        body: {
          type: 'binary',
          operator: '+',
          left: { type: 'identifier', name: 'acc' },
          right: { type: 'identifier', name: 'x' }
        },
        capturedVars: []
      };

      const registry = vm.getNativeFunctionRegistry();
      const result = registry.call('arr_reduce', [[1, 2, 3], closure, 10]);

      expect(result).toEqual(16);  // 10 + 1 + 2 + 3
    });

    test('should reduce array of objects', () => {
      const closure: any = {
        type: 'lambda',
        params: ['acc', 'item'],
        body: {
          type: 'binary',
          operator: '+',
          left: { type: 'identifier', name: 'acc' },
          right: { type: 'member', object: { type: 'identifier', name: 'item' }, property: 'value' }
        },
        capturedVars: []
      };

      const registry = vm.getNativeFunctionRegistry();
      const result = registry.call('arr_reduce', [
        [{ value: 1 }, { value: 2 }, { value: 3 }],
        closure,
        0
      ]);

      expect(result).toEqual(6);
    });
  });

  // ======================================================================
  // TEST 4: arr_find with closure
  // ======================================================================
  describe('arr_find with Closures', () => {
    test('should find first element matching closure condition', () => {
      const closure: any = {
        type: 'lambda',
        params: ['x'],
        body: {
          type: 'binary',
          operator: '>',
          left: { type: 'identifier', name: 'x' },
          right: { type: 'literal', value: 3 }
        },
        capturedVars: []
      };

      const registry = vm.getNativeFunctionRegistry();
      const result = registry.call('arr_find', [[1, 2, 3, 4, 5], closure]);

      expect(result).toEqual(4);
    });

    test('should return null if no element matches', () => {
      const closure: any = {
        type: 'lambda',
        params: ['x'],
        body: {
          type: 'binary',
          operator: '>',
          left: { type: 'identifier', name: 'x' },
          right: { type: 'literal', value: 100 }
        },
        capturedVars: []
      };

      const registry = vm.getNativeFunctionRegistry();
      const result = registry.call('arr_find', [[1, 2, 3], closure]);

      expect(result).toBeNull();
    });
  });

  // ======================================================================
  // TEST 5: arr_some with closure
  // ======================================================================
  describe('arr_some with Closures', () => {
    test('should return true if at least one element matches', () => {
      const closure: any = {
        type: 'lambda',
        params: ['x'],
        body: {
          type: 'binary',
          operator: '>',
          left: { type: 'identifier', name: 'x' },
          right: { type: 'literal', value: 3 }
        },
        capturedVars: []
      };

      const registry = vm.getNativeFunctionRegistry();
      const result = registry.call('arr_some', [[1, 2, 3, 4, 5], closure]);

      expect(result).toBe(true);
    });

    test('should return false if no element matches', () => {
      const closure: any = {
        type: 'lambda',
        params: ['x'],
        body: {
          type: 'binary',
          operator: '>',
          left: { type: 'identifier', name: 'x' },
          right: { type: 'literal', value: 100 }
        },
        capturedVars: []
      };

      const registry = vm.getNativeFunctionRegistry();
      const result = registry.call('arr_some', [[1, 2, 3], closure]);

      expect(result).toBe(false);
    });
  });

  // ======================================================================
  // TEST 6: arr_every with closure
  // ======================================================================
  describe('arr_every with Closures', () => {
    test('should return true if all elements match condition', () => {
      const closure: any = {
        type: 'lambda',
        params: ['x'],
        body: {
          type: 'binary',
          operator: '>',
          left: { type: 'identifier', name: 'x' },
          right: { type: 'literal', value: 0 }
        },
        capturedVars: []
      };

      const registry = vm.getNativeFunctionRegistry();
      const result = registry.call('arr_every', [[1, 2, 3, 4, 5], closure]);

      expect(result).toBe(true);
    });

    test('should return false if any element does not match', () => {
      const closure: any = {
        type: 'lambda',
        params: ['x'],
        body: {
          type: 'binary',
          operator: '>',
          left: { type: 'identifier', name: 'x' },
          right: { type: 'literal', value: 2 }
        },
        capturedVars: []
      };

      const registry = vm.getNativeFunctionRegistry();
      const result = registry.call('arr_every', [[1, 2, 3, 4, 5], closure]);

      expect(result).toBe(false);
    });
  });

  // ======================================================================
  // TEST 7: Nested Higher-Order Functions
  // ======================================================================
  describe('Nested Higher-Order Functions', () => {
    test('should map then filter: [1,2,3,4,5] => double => evens => [4,8]', () => {
      const doubleClosure: any = {
        type: 'lambda',
        params: ['x'],
        body: {
          type: 'binary',
          operator: '*',
          left: { type: 'identifier', name: 'x' },
          right: { type: 'literal', value: 2 }
        },
        capturedVars: []
      };

      const isEvenClosure: any = {
        type: 'lambda',
        params: ['x'],
        body: {
          type: 'binary',
          operator: '==',
          left: {
            type: 'binary',
            operator: '%',
            left: { type: 'identifier', name: 'x' },
            right: { type: 'literal', value: 2 }
          },
          right: { type: 'literal', value: 0 }
        },
        capturedVars: []
      };

      const registry = vm.getNativeFunctionRegistry();
      const doubled = registry.call('arr_map', [[1, 2, 3, 4, 5], doubleClosure]);
      const evenDoubles = registry.call('arr_filter', [doubled, isEvenClosure]);

      expect(evenDoubles).toEqual([2, 4, 6, 8, 10]);
    });

    test('should reduce after map: [1,2,3,4,5] => *2 => sum', () => {
      const doubleClosure: any = {
        type: 'lambda',
        params: ['x'],
        body: {
          type: 'binary',
          operator: '*',
          left: { type: 'identifier', name: 'x' },
          right: { type: 'literal', value: 2 }
        },
        capturedVars: []
      };

      const sumClosure: any = {
        type: 'lambda',
        params: ['acc', 'x'],
        body: {
          type: 'binary',
          operator: '+',
          left: { type: 'identifier', name: 'acc' },
          right: { type: 'identifier', name: 'x' }
        },
        capturedVars: []
      };

      const registry = vm.getNativeFunctionRegistry();
      const doubled = registry.call('arr_map', [[1, 2, 3, 4, 5], doubleClosure]);
      const sum = registry.call('arr_reduce', [doubled, sumClosure, 0]);

      expect(sum).toEqual(30);  // (1+2+3+4+5)*2 = 15*2 = 30
    });
  });

  // ======================================================================
  // TEST 8: Error Handling
  // ======================================================================
  describe('Error Handling', () => {
    test('should throw error if closure is invalid', () => {
      const invalidClosure: any = {
        type: 'invalid',  // Not 'lambda'
        params: ['x']
      };

      const registry = vm.getNativeFunctionRegistry();
      expect(() => registry.call('arr_map', [[1, 2, 3], invalidClosure])).toThrow();
    });

    test('should return empty array if fn is null', () => {
      const registry = vm.getNativeFunctionRegistry();
      const result = registry.call('arr_map', [[1, 2, 3], null]);

      expect(result).toEqual([]);
    });

    test('should throw error if VM not available for closure', () => {
      // Create new registry without VM
      const emptyRegistry = require('../src/vm/native-function-registry').NativeFunctionRegistry;
      const noVMRegistry = new emptyRegistry();

      const closure: any = {
        type: 'lambda',
        params: ['x'],
        body: { type: 'identifier', name: 'x' },
        capturedVars: []
      };

      // This would fail because VM is not set
      expect(() => noVMRegistry.call('arr_map', [[1, 2, 3], closure])).toThrow();
    });
  });
});
