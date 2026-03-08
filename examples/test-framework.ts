/**
 * FreeLang Test Framework Example
 *
 * Demonstrates how to use the test module
 */

import { test, describe, assert, expect, run, beforeEach, afterEach } from '../dist/stdlib/test';

// Example 1: Simple test suite
describe('Math Operations', () => {
  test('addition should work', () => {
    expect(2 + 2).toBe(4);
  });

  test('subtraction should work', () => {
    expect(5 - 3).toBe(2);
  });

  test('multiplication should work', () => {
    expect(3 * 4).toBe(12);
  });
});

// Example 2: Test with assertions
describe('String Operations', () => {
  test('string concatenation', () => {
    const result = 'Hello' + ' ' + 'World';
    expect(result).toBe('Hello World');
  });

  test('string length', () => {
    const str = 'FreeLang';
    expect(str.length).toBe(8);
  });

  test('string includes', () => {
    const str = 'Welcome to FreeLang';
    expect(str).toContain('FreeLang');
  });
});

// Example 3: Array operations
describe('Array Operations', () => {
  test('array creation', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(arr.length).toBe(5);
  });

  test('array contains', () => {
    const arr = ['apple', 'banana', 'orange'];
    expect(arr).toContain('banana');
  });

  test('array indexing', () => {
    const arr = [10, 20, 30];
    expect(arr[1]).toBe(20);
  });
});

// Example 4: Hooks (beforeEach/afterEach)
describe('Counter Tests', () => {
  let counter = 0;

  beforeEach(() => {
    counter = 0;
  });

  afterEach(() => {
    // Cleanup
  });

  test('counter starts at 0', () => {
    expect(counter).toBe(0);
  });

  test('counter increments', () => {
    counter++;
    expect(counter).toBe(1);
  });

  test('counter can be set', () => {
    counter = 5;
    expect(counter).toBe(5);
  });
});

// Example 5: Advanced assertions
describe('Comparison Operations', () => {
  test('greater than', () => {
    expect(10).toBeGreaterThan(5);
  });

  test('less than', () => {
    expect(3).toBeLessThan(10);
  });

  test('greater or equal', () => {
    expect(5).toBeGreaterThanOrEqual(5);
  });

  test('truthiness', () => {
    expect(true).toBeTruthy();
    expect(false).toBeFalsy();
  });

  test('null and undefined', () => {
    expect(null).toBeNull();
    expect(undefined).toBeUndefined();
  });
});

// Example 6: Object equality
describe('Object Comparison', () => {
  test('object equality', () => {
    const obj1 = { name: 'FreeLang', version: '2.2.0' };
    const obj2 = { name: 'FreeLang', version: '2.2.0' };
    expect(obj1).toEqual(obj2);
  });

  test('array equality', () => {
    const arr1 = [1, 2, 3];
    const arr2 = [1, 2, 3];
    expect(arr1).toEqual(arr2);
  });
});

// Run all tests
run();
