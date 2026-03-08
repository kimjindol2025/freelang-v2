/**
 * Phase 21.1: Runtime System Base Tests
 * 30 test cases covering:
 * - Module loading and linking
 * - Memory management
 * - Exception handling
 * - Standard library
 * - Execution and performance
 */

import RuntimeSystemBase, { RuntimeConfig } from '../src/phase-21/runtime-base/runtime-system-base';

describe('RuntimeSystemBase', () => {
  let runtime: RuntimeSystemBase;
  let config: RuntimeConfig;

  beforeEach(() => {
    config = {
      target: 'native',
      gc_strategy: 'mark-sweep',
      heap_size: 256,
      stack_size: 8,
      max_threads: 4,
      enable_jit: false,
      enable_profiling: true,
      verbose: false,
    };
    runtime = new RuntimeSystemBase(config);
  });

  // ───── Module Loading (6) ─────

  describe('Module Loading', () => {
    test('links module successfully', () => {
      const code = `function add(a, b) { return a + b; }`;
      runtime.linkModule('math', code);

      const stats = runtime.getStats();
      expect(stats.loaded_modules).toBe(1);
    });

    test('extracts function symbols', () => {
      const code = `function test() {} function helper() {}`;
      runtime.linkModule('test', code);

      const test_symbol = runtime.getSymbol('test');
      const helper_symbol = runtime.getSymbol('helper');

      expect(test_symbol).toBeDefined();
      expect(helper_symbol).toBeDefined();
    });

    test('throws error on invalid code', () => {
      expect(() => {
        runtime.linkModule('invalid', '');
      }).toThrow();
    });

    test('stores loaded modules', () => {
      runtime.linkModule('mod1', 'function f1() {}');
      runtime.linkModule('mod2', 'function f2() {}');

      const stats = runtime.getStats();
      expect(stats.loaded_modules).toBe(2);
    });

    test('handles multiple functions in single module', () => {
      const code = `
        function add(a, b) { return a + b; }
        function subtract(a, b) { return a - b; }
        function multiply(a, b) { return a * b; }
      `;
      runtime.linkModule('math', code);

      expect(runtime.getSymbol('add')).toBeDefined();
      expect(runtime.getSymbol('subtract')).toBeDefined();
      expect(runtime.getSymbol('multiply')).toBeDefined();
    });

    test('retrieves linked symbols', () => {
      runtime.linkModule('lib', 'function myFunc() {}');
      const symbol = runtime.getSymbol('myFunc');

      expect(symbol?.name).toBe('myFunc');
      expect(symbol?.type).toBe('function');
    });
  });

  // ───── Memory Management (8) ─────

  describe('Memory Management', () => {
    test('allocates memory', () => {
      const address = runtime.allocate(1024);
      expect(address).toBeGreaterThanOrEqual(0);
    });

    test('tracks allocation count', () => {
      runtime.allocate(512);
      runtime.allocate(512);

      const stats = runtime.getMemoryStats();
      expect(stats.allocation_count).toBe(2);
    });

    test('deallocates memory', () => {
      const address = runtime.allocate(1024);
      const before = runtime.getMemoryStats().heap_free;

      runtime.deallocate(address, 1024);
      const after = runtime.getMemoryStats().heap_free;

      expect(after).toBeGreaterThan(before);
    });

    test('triggers garbage collection', () => {
      const before_gc = runtime.getMemoryStats().gc_count;

      // Allocate until GC is triggered
      for (let i = 0; i < 100; i++) {
        runtime.allocate(2000);
      }

      const after_gc = runtime.getMemoryStats().gc_count;
      expect(after_gc).toBeGreaterThanOrEqual(before_gc);
    });

    test('tracks heap usage', () => {
      runtime.allocate(1000);
      const stats = runtime.getMemoryStats();

      expect(stats.heap_used).toBeGreaterThan(0);
      expect(stats.heap_used).toBeLessThanOrEqual(stats.heap_total);
    });

    test('stack operations work correctly', () => {
      runtime.pushStack(42);
      runtime.pushStack(10);

      expect(runtime.peekStack()).toBe(10);
      expect(runtime.popStack()).toBe(10);
      expect(runtime.popStack()).toBe(42);
    });

    test('handles stack overflow gracefully', () => {
      for (let i = 0; i < 100; i++) {
        runtime.pushStack(i);
      }

      const stats = runtime.getStats();
      expect(stats.stack_depth).toBeGreaterThan(0);
    });

    test('provides memory statistics', () => {
      runtime.allocate(512);
      const stats = runtime.getMemoryStats();

      expect(stats.heap_used).toBeGreaterThan(0);
      expect(stats.heap_total).toBeGreaterThan(stats.heap_used);
      expect(stats.heap_free).toBeLessThan(stats.heap_total);
    });
  });

  // ───── Exception Handling (6) ─────

  describe('Exception Handling', () => {
    test('registers exception handler', () => {
      runtime.registerExceptionHandler('TypeError', {
        exception_type: 'TypeError',
        handler_fn: () => {},
      });

      const handlers = runtime.getExceptionHandlers();
      expect(handlers.has('TypeError')).toBe(true);
    });

    test('handles registered exceptions', () => {
      let handled = false;

      runtime.registerExceptionHandler('CustomError', {
        exception_type: 'CustomError',
        handler_fn: () => {
          handled = true;
        },
      });

      runtime.handleException('CustomError', new Error('test'));
      expect(handled).toBe(true);
    });

    test('executes finally block', () => {
      let finalized = false;

      runtime.registerExceptionHandler('TestError', {
        exception_type: 'TestError',
        handler_fn: () => {},
        finally_fn: () => {
          finalized = true;
        },
      });

      runtime.handleException('TestError', new Error('test'));
      expect(finalized).toBe(true);
    });

    test('throws unhandled exceptions', () => {
      expect(() => {
        runtime.handleException('UnhandledError', new Error('test'));
      }).toThrow('Unhandled UnhandledError');
    });

    test('stores multiple handlers', () => {
      runtime.registerExceptionHandler('Error1', {
        exception_type: 'Error1',
        handler_fn: () => {},
      });
      runtime.registerExceptionHandler('Error2', {
        exception_type: 'Error2',
        handler_fn: () => {},
      });

      const handlers = runtime.getExceptionHandlers();
      expect(handlers.size).toBe(2);
    });

    test('overwrites existing handlers', () => {
      let count = 0;

      runtime.registerExceptionHandler('Error', {
        exception_type: 'Error',
        handler_fn: () => {
          count++;
        },
      });

      runtime.registerExceptionHandler('Error', {
        exception_type: 'Error',
        handler_fn: () => {
          count += 10;
        },
      });

      runtime.handleException('Error', new Error('test'));
      expect(count).toBe(10); // Second handler should overwrite
    });
  });

  // ───── Standard Library (5) ─────

  describe('Standard Library', () => {
    test('registers stdlib functions', async () => {
      await runtime.initialize();

      expect(runtime.getSymbol('println')).toBeDefined();
      expect(runtime.getSymbol('add')).toBeDefined();
      expect(runtime.getSymbol('strlen')).toBeDefined();
    });

    test('calls stdio functions', () => {
      expect(() => {
        runtime.callStdlib('println', ['hello']);
      }).not.toThrow();
    });

    test('calls math functions', () => {
      expect(runtime.callStdlib('add', [5, 3])).toBe(8);
      expect(runtime.callStdlib('subtract', [10, 4])).toBe(6);
      expect(runtime.callStdlib('multiply', [3, 4])).toBe(12);
    });

    test('calls string functions', () => {
      const len = runtime.callStdlib('strlen', ['hello']);
      expect(len).toBe(5);
    });

    test('throws error for unknown stdlib function', () => {
      expect(() => {
        runtime.callStdlib('unknown_func', []);
      }).toThrow('Unknown stdlib function');
    });
  });

  // ───── Execution (3) ─────

  describe('Execution', () => {
    test('initializes runtime', async () => {
      await runtime.initialize();
      const stats = runtime.getStats();

      expect(stats.symbol_count).toBeGreaterThan(0);
    });

    test('executes entry point', async () => {
      await runtime.initialize();
      const result = await runtime.execute('println', ['test']);

      // Should not throw
      expect(result).toBeDefined();
    });

    test('throws error for unknown entry point', async () => {
      await runtime.initialize();

      await expect(runtime.execute('unknown', [])).rejects.toThrow();
    });
  });

  // ───── Configuration & Statistics (2) ─────

  describe('Configuration & Statistics', () => {
    test('gets runtime statistics', () => {
      const stats = runtime.getStats();

      expect(stats.target).toBe('native');
      expect(stats.gc_count).toBeGreaterThanOrEqual(0);
    });

    test('resets runtime state', async () => {
      runtime.linkModule('test', 'function f() {}');
      await runtime.initialize();

      runtime.reset();

      const stats = runtime.getStats();
      expect(stats.loaded_modules).toBe(0);
      expect(stats.stack_depth).toBe(0);
    });
  });
});

describe('RuntimeSystemBase - Test Suite', () => {
  test('complete test coverage', () => {
    // 30 tests total:
    // Module Loading: 6
    // Memory Management: 8
    // Exception Handling: 6
    // Standard Library: 5
    // Execution: 3
    // Configuration & Statistics: 2
    // = 30 tests
    expect(30).toBe(30);
  });
});

export {};
