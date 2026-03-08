/**
 * Phase 2 Task 2.2: Auto-Complete Database Tests
 *
 * Tests auto-complete functionality:
 * - Function completions
 * - Method completions
 * - Variable completions
 * - Type completions
 * - Hover information
 */

import { AutoCompleteDB } from '../src/analyzer/autocomplete-db';

describe('Phase 2 Task 2.2: Auto-Complete Database', () => {
  let db: AutoCompleteDB;

  beforeEach(() => {
    db = new AutoCompleteDB();
  });

  /**
   * Test 1: Initialize with built-in functions
   */
  test('Initialize database with built-in functions', () => {
    const functions = db.getAllFunctions();

    expect(functions).toBeDefined();
    expect(functions.length).toBeGreaterThan(0);

    // Check for specific built-ins
    const names = functions.map(f => f.name);
    expect(names).toContain('print');
    expect(names).toContain('parseInt');
    expect(names).toContain('sum');
  });

  /**
   * Test 2: Get function signature
   */
  test('Get function signature', () => {
    const sum = db.getFunction('sum');

    expect(sum).toBeDefined();
    expect(sum?.name).toBe('sum');
    expect(sum?.returnType).toBe('number');
    expect(sum?.params.length).toBe(1);
  });

  /**
   * Test 3: Add custom function
   */
  test('Add custom function to database', () => {
    db.addFunction('multiply', [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }], 'number', 'Multiplies two numbers');

    const multiply = db.getFunction('multiply');

    expect(multiply).toBeDefined();
    expect(multiply?.description).toBe('Multiplies two numbers');
  });

  /**
   * Test 4: Add variable
   */
  test('Add variable to scope', () => {
    db.addVariable('numbers', 'array<number>');

    const type = db.getVariableType('numbers');

    expect(type).toBe('array<number>');
  });

  /**
   * Test 5: Get array methods
   */
  test('Get methods for array type', () => {
    const methods = db.getMethods('array');

    expect(methods.length).toBeGreaterThan(0);

    const names = methods.map(m => m.name);
    expect(names).toContain('map');
    expect(names).toContain('filter');
    expect(names).toContain('reduce');
  });

  /**
   * Test 6: Get string methods
   */
  test('Get methods for string type', () => {
    const methods = db.getMethods('string');

    expect(methods.length).toBeGreaterThan(0);

    const names = methods.map(m => m.name);
    expect(names).toContain('substring');
    expect(names).toContain('split');
    expect(names).toContain('concat');
  });

  /**
   * Test 7: Function completion
   */
  test('Get function completions', () => {
    const completions = db.getCompletions('par', 3);

    expect(completions).toBeDefined();
    expect(completions.length).toBeGreaterThan(0);

    // Should include parseInt, parseFloat
    const labels = completions.map(c => c.label);
    expect(labels).toContain('parseInt');
    expect(labels).toContain('parseFloat');
  });

  /**
   * Test 8: Variable completion
   */
  test('Get variable completions', () => {
    db.addVariable('userArray', 'array<string>');
    db.addVariable('userName', 'string');
    db.addVariable('userId', 'number');

    const completions = db.getCompletions('user', 4);

    expect(completions.length).toBeGreaterThan(0);

    const labels = completions.map(c => c.label);
    expect(labels).toContain('userArray');
    expect(labels).toContain('userName');
    expect(labels).toContain('userId');
  });

  /**
   * Test 9: Method completion for known type
   */
  test('Get method completions for array', () => {
    db.addVariable('numbers', 'array');

    const completions = db.getCompletions('numbers.m', 10);

    expect(completions.length).toBeGreaterThan(0);

    const labels = completions.map(c => c.label);
    expect(labels).toContain('map');
  });

  /**
   * Test 10: Keyword completion
   */
  test('Get keyword completions', () => {
    const completions = db.getCompletions('if', 2);

    expect(completions.length).toBeGreaterThan(0);

    const keywords = completions.filter(c => c.kind === 'keyword');
    expect(keywords.length).toBeGreaterThan(0);
    expect(keywords[0].label).toBe('if');
  });

  /**
   * Test 11: Hover information for function
   */
  test('Get hover information for function', () => {
    const info = db.getHoverInfo('sum');

    expect(info).toBeDefined();
    expect(info).toContain('sum');
    expect(info).toContain('number');
  });

  /**
   * Test 12: Hover information for variable
   */
  test('Get hover information for variable', () => {
    db.addVariable('result', 'number');

    const info = db.getHoverInfo('result');

    expect(info).toBeDefined();
    expect(info).toBe('result: number');
  });

  /**
   * Test 13: Search for symbol
   */
  test('Search for symbol by name', () => {
    const results = db.search('map');

    expect(results.length).toBeGreaterThan(0);

    const labels = results.map(r => r.label);
    expect(labels.some(l => l.includes('map'))).toBe(true);
  });

  /**
   * Test 14: Get all types
   */
  test('Get all types from database', () => {
    const types = db.getAllTypes();

    expect(types).toBeDefined();
    expect(types.length).toBeGreaterThanOrEqual(0);
  });

  /**
   * Test 15: Add custom type
   */
  test('Add custom type to database', () => {
    db.addType('Point', undefined, [], [
      { name: 'x', type: 'number' },
      { name: 'y', type: 'number' },
    ]);

    const point = db.getType('Point');

    expect(point).toBeDefined();
    expect(point?.properties.length).toBe(2);
  });

  /**
   * Test 16: Get completion items with correct kind
   */
  test('Completions have correct kind property', () => {
    db.addFunction('testFunc', [], 'void');
    db.addVariable('testVar', 'string');

    const completions = db.getCompletions('test', 4);

    expect(completions.length).toBeGreaterThan(0);

    const kinds = new Set(completions.map(c => c.kind));
    expect(kinds.has('function') || kinds.has('variable')).toBe(true);
  });

  /**
   * Test 17: Clear variables
   */
  test('Clear variables from scope', () => {
    db.addVariable('temp', 'number');

    let type = db.getVariableType('temp');
    expect(type).toBeDefined();

    db.clearVariables();

    type = db.getVariableType('temp');
    expect(type).toBeUndefined();
  });

  /**
   * Test 18: Get database statistics
   */
  test('Get database statistics', () => {
    const stats = db.getStats();

    expect(stats.functions).toBeGreaterThan(0);
    expect(stats.methods).toBeGreaterThan(0);
    expect(stats.keywords).toBeGreaterThan(0);
  });

  /**
   * Test 19: Method with optional parameters
   */
  test('Handle methods with optional parameters', () => {
    db.addMethod('custom', 'process', [
      { name: 'input', type: 'string' },
      { name: 'options', type: 'object', optional: true },
    ], 'string', 'Processes input with optional options');

    const methods = db.getMethods('custom');
    const process = methods.find(m => m.name === 'process');

    expect(process).toBeDefined();
    expect(process?.params[1].optional).toBe(true);
  });

  /**
   * Test 20: Prefix completion sorting
   */
  test('Completions are sorted alphabetically', () => {
    const completions = db.getCompletions('', 0);

    // Check if sorted
    for (let i = 1; i < completions.length; i++) {
      expect(completions[i].label.localeCompare(completions[i - 1].label)).toBeGreaterThanOrEqual(0);
    }
  });
});
