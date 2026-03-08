import { AutoHeaderEngine } from '../src/engine/auto-header';

describe('Auto Header Engine', () => {
  let engine: AutoHeaderEngine;

  beforeEach(() => {
    engine = new AutoHeaderEngine();
  });

  test('exact match: sum', () => {
    const result = engine.generate('sum');
    expect(result).not.toBeNull();
    expect(result?.fn).toBe('sum');
    expect(result?.input).toBe('array<number>');
    expect(result?.output).toBe('number');
    expect(result?.confidence).toBeGreaterThanOrEqual(0.9);
  });

  test('exact match: average', () => {
    const result = engine.generate('average');
    expect(result?.fn).toBe('average');
    expect(result?.output).toBe('number');
  });

  test('multi-token: array sum', () => {
    const result = engine.generate('array sum');
    expect(result?.fn).toBe('sum');
    expect(result?.confidence).toBeGreaterThanOrEqual(0.9);
  });

  test('variant: add (synonym for sum)', () => {
    const result = engine.generate('add');
    expect(result?.fn).toBe('sum');
  });

  test('variant: max', () => {
    const result = engine.generate('max');
    expect(result?.fn).toBe('max');
    expect(result?.output).toBe('number');
  });

  test('variant: filter', () => {
    const result = engine.generate('filter');
    expect(result?.fn).toBe('filter');
    expect(result?.output).toBe('array<number>');
  });

  test('complex input: array average', () => {
    const result = engine.generate('array average');
    expect(result?.fn).toBe('average');
    expect(result?.reason).toBe('data_analysis');
  });

  test('fuzzy match: avg (variant)', () => {
    const result = engine.generate('avg');
    expect(result?.fn).toBe('average');
    expect(result?.confidence).toBeGreaterThanOrEqual(0.9);
  });

  test('partial match: sort', () => {
    const result = engine.generate('sort');
    expect(result?.fn).toBe('sort');
    expect(result?.complexity).toBe('O(n*log(n))');
  });

  test('no match: unknown', () => {
    const result = engine.generate('xyzabc unknown');
    expect(result).toBeNull();
  });

  test('get operations', () => {
    const ops = engine.getOperations();
    expect(ops.length).toBeGreaterThan(5);
    expect(ops).toContain('sum');
    expect(ops).toContain('filter');
  });

  test('get pattern details', () => {
    const pattern = engine.getPattern('sum');
    expect(pattern).not.toBeNull();
    expect(pattern?.op).toBe('sum');
    expect(pattern?.reason).toBe('statistical_operation');
  });

  test('filter keeps array type', () => {
    const result = engine.generate('filter array');
    expect(result?.input).toBe('array<number>');
    expect(result?.output).toBe('array<number>');
  });

  test('confidence scores vary', () => {
    const exact = engine.generate('sum');
    const fuzzy = engine.generate('sss');
    expect(exact?.confidence).toBeGreaterThan(fuzzy?.confidence || 0);
  });
});
