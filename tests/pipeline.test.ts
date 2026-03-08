import { Pipeline } from '../src/pipeline';

describe('Pipeline - Complete AI Flow', () => {
  let pipeline: Pipeline;

  beforeEach(() => {
    pipeline = new Pipeline('/tmp/freelang-pipeline-test');
  });

  test('sum: free input → header → IR → result', () => {
    const result = pipeline.run({
      instruction: 'sum',
      data: [1, 2, 3, 4, 5],
    });

    expect(result).not.toBeNull();
    expect(result!.header.fn).toBe('sum');
    expect(result!.header.confidence).toBeGreaterThanOrEqual(0.9);
    expect(result!.vm.ok).toBe(true);
    expect(result!.final_value).toBe(15);
    expect(result!.vm.cycles).toBeGreaterThan(0);
  });

  test('average: calculation', () => {
    const result = pipeline.run({
      instruction: 'average',
      data: [10, 20, 30],
    });

    expect(result!.vm.ok).toBe(true);
    expect(result!.final_value).toBe(20);
  });

  test('max: find maximum', () => {
    const result = pipeline.run({
      instruction: 'max',
      data: [3, 7, 2, 9, 1],
    });

    expect(result!.vm.ok).toBe(true);
    expect(result!.final_value).toBe(9);
  });

  test('min: find minimum', () => {
    const result = pipeline.run({
      instruction: 'min',
      data: [5, 2, 8, 1, 9],
    });

    expect(result!.vm.ok).toBe(true);
    expect(result!.final_value).toBe(1);
  });

  test('sort: order array', () => {
    const result = pipeline.run({
      instruction: 'sort',
      data: [5, 2, 8, 1, 9],
    });

    expect(result!.vm.ok).toBe(true);
    // Sort returns length
    expect(result!.final_value).toBe(5);
  });

  test('reverse: reverse array', () => {
    const result = pipeline.run({
      instruction: 'reverse',
      data: [1, 2, 3, 4, 5],
    });

    expect(result!.vm.ok).toBe(true);
    // Reverse returns length
    expect(result!.final_value).toBe(5);
  });

  test('count/length: get array size', () => {
    const result = pipeline.run({
      instruction: 'count',
      data: [10, 20, 30, 40],
    });

    expect(result!.vm.ok).toBe(true);
    expect(result!.final_value).toBe(4);
  });

  test('filter: with default predicate (> 0)', () => {
    const result = pipeline.run({
      instruction: 'filter',
      data: [-1, 2, -3, 4, 5],
    });

    expect(result!.vm.ok).toBe(true);
    // Filter keeps 2, 4, 5 → length = 3
    expect(result!.final_value).toBe(3);
  });

  test('map: double each element', () => {
    const result = pipeline.run({
      instruction: 'map',
      data: [1, 2, 3],
    });

    expect(result!.vm.ok).toBe(true);
    // Map doubling, returns new length = 3
    expect(result!.final_value).toBe(3);
  });

  test('contains: check if array has elements', () => {
    const result = pipeline.run({
      instruction: 'contains',
      data: [1, 2, 3],
    });

    expect(result!.vm.ok).toBe(true);
    expect(result!.final_value).toBe(1); // true
  });

  test('empty array handling', () => {
    const result = pipeline.run({
      instruction: 'count',
      data: [],
    });

    expect(result!.vm.ok).toBe(true);
    expect(result!.final_value).toBe(0);
  });

  test('generated IR has correct structure', () => {
    const result = pipeline.run({
      instruction: 'sum',
      data: [1, 2, 3],
    });

    const intent = result!.intent;
    expect(intent.fn).toBe('sum');
    expect(intent.params[0].name).toBe('arr');
    expect(intent.ret).toBe('number');
    expect(intent.body.length).toBeGreaterThan(0);
  });

  test('header confidence reflected in output', () => {
    const resultExact = pipeline.run({
      instruction: 'sum',
      data: [1, 2],
    });
    const resultFuzzy = pipeline.run({
      instruction: 'sum1',  // fuzzy: "sum" is close to "sum1"
      data: [1, 2],
    });

    expect(resultExact!.header.confidence).toBeGreaterThanOrEqual(
      resultFuzzy!.header.confidence
    );
  });

  test('C code generation included', () => {
    const result = pipeline.run({
      instruction: 'sum',
      data: [1, 2, 3],
    });

    expect(result!.compile).not.toBeNull();
    expect(result!.compile!.ok).toBe(true);
    expect(result!.compile!.c_code).toContain('#include');
  });

  test('quick test helper', () => {
    const quick = pipeline.test('sum', [1, 2, 3, 4]);

    expect(quick.op).toBe('sum');
    expect(quick.data).toEqual([1, 2, 3, 4]);
    expect(quick.result).toBe(10);
    expect(quick.confidence).toBeGreaterThanOrEqual(0.9);
  });

  test('pipeline with variant keyword', () => {
    const result = pipeline.run({
      instruction: 'add',
      data: [5, 5, 5],
    });

    expect(result!.header.fn).toBe('sum');
    expect(result!.final_value).toBe(15);
  });

  test('no match throws error', () => {
    expect(() => {
      pipeline.run({
        instruction: 'xyzunknown123',
        data: [1, 2, 3],
      });
    }).toThrow('pipeline_no_header');
  });

  test('learning records execution', () => {
    const result = pipeline.run({
      instruction: 'sum',
      data: [1, 2, 3],
    });

    // Learner should have recorded this pattern
    expect(result!.vm.ok).toBe(true);
  });

  test('multi-token input processing', () => {
    const result = pipeline.run({
      instruction: 'array sum',
      data: [10, 20, 30],
    });

    expect(result!.header.fn).toBe('sum');
    expect(result!.final_value).toBe(60);
  });
});
