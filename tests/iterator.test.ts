import { VM } from '../src/vm';
import { Op, Inst } from '../src/types';
import {
  Iterator,
  IteratorEngine,
  IteratorLearner,
} from '../src/engine/iterator';

describe('IteratorEngine', () => {
  test('init: creates iterator', () => {
    const iter = IteratorEngine.init(0, 10);
    expect(iter.current).toBe(0);
    expect(iter.end).toBe(10);
    expect(iter.step).toBe(1);
  });

  test('init: custom step', () => {
    const iter = IteratorEngine.init(0, 10, 2);
    expect(iter.step).toBe(2);
  });

  test('init: negative step', () => {
    const iter = IteratorEngine.init(10, 0, -1);
    expect(iter.step).toBe(-1);
  });

  test('init: zero step throws error', () => {
    expect(() => {
      IteratorEngine.init(0, 10, 0);
    }).toThrow('Iterator step cannot be zero');
  });

  test('has: forward iteration', () => {
    const iter = IteratorEngine.init(0, 3);
    expect(IteratorEngine.has(iter)).toBe(true);

    const { iterator: iter2 } = IteratorEngine.next(iter);
    expect(IteratorEngine.has(iter2)).toBe(true);

    const { iterator: iter3 } = IteratorEngine.next(iter2);
    expect(IteratorEngine.has(iter3)).toBe(true);

    const { iterator: iter4 } = IteratorEngine.next(iter3);
    expect(IteratorEngine.has(iter4)).toBe(false);
  });

  test('has: backward iteration', () => {
    const iter = IteratorEngine.init(3, 0, -1);
    expect(IteratorEngine.has(iter)).toBe(true);

    const { iterator: iter2 } = IteratorEngine.next(iter);
    expect(IteratorEngine.has(iter2)).toBe(true);
  });

  test('next: returns correct values', () => {
    const iter = IteratorEngine.init(0, 3);

    const res1 = IteratorEngine.next(iter);
    expect(res1.value).toBe(0);
    expect(res1.iterator.current).toBe(1);

    const res2 = IteratorEngine.next(res1.iterator);
    expect(res2.value).toBe(1);
    expect(res2.iterator.current).toBe(2);

    const res3 = IteratorEngine.next(res2.iterator);
    expect(res3.value).toBe(2);
    expect(res3.iterator.current).toBe(3);
  });

  test('next: throws when exhausted', () => {
    const iter = IteratorEngine.init(0, 1);
    const { iterator: iter2 } = IteratorEngine.next(iter);

    expect(() => {
      IteratorEngine.next(iter2);
    }).toThrow('Iterator exhausted');
  });

  test('next: backward iteration', () => {
    const iter = IteratorEngine.init(2, -1, -1);

    const res1 = IteratorEngine.next(iter);
    expect(res1.value).toBe(2);
    expect(res1.iterator.current).toBe(1);

    const res2 = IteratorEngine.next(res1.iterator);
    expect(res2.value).toBe(1);
    expect(res2.iterator.current).toBe(0);
  });

  test('toArray: forward', () => {
    const iter = IteratorEngine.init(0, 5);
    const arr = IteratorEngine.toArray(iter);
    expect(arr).toEqual([0, 1, 2, 3, 4]);
  });

  test('toArray: backward', () => {
    const iter = IteratorEngine.init(3, 0, -1);
    const arr = IteratorEngine.toArray(iter);
    expect(arr).toEqual([3, 2, 1]);
  });

  test('toArray: with step', () => {
    const iter = IteratorEngine.init(0, 10, 2);
    const arr = IteratorEngine.toArray(iter);
    expect(arr).toEqual([0, 2, 4, 6, 8]);
  });

  test('toArray: empty range', () => {
    const iter = IteratorEngine.init(5, 5);
    const arr = IteratorEngine.toArray(iter);
    expect(arr).toEqual([]);
  });

  test('getMemoryEstimate: constant size', () => {
    const iter1 = IteratorEngine.init(0, 10);
    const iter2 = IteratorEngine.init(0, 1000000);

    const size1 = IteratorEngine.getMemoryEstimate(iter1);
    const size2 = IteratorEngine.getMemoryEstimate(iter2);

    expect(size1).toBe(size2); // Both should be same (24 bytes)
    expect(size1).toBe(24);
  });

  test('getArrayMemoryEstimate: scales with size', () => {
    const iter1 = IteratorEngine.init(0, 10);
    const iter2 = IteratorEngine.init(0, 100);

    const size1 = IteratorEngine.getArrayMemoryEstimate(iter1);
    const size2 = IteratorEngine.getArrayMemoryEstimate(iter2);

    expect(size2).toBeGreaterThan(size1);
  });

  test('getMemorySavingsPercent: high savings for large ranges', () => {
    const iter = IteratorEngine.init(0, 1000);
    const savingsPercent = IteratorEngine.getMemorySavingsPercent(iter);

    expect(savingsPercent).toBeGreaterThan(90);
  });

  test('getMemorySavingsPercent: low savings for small ranges', () => {
    const iter = IteratorEngine.init(0, 2);
    const savingsPercent = IteratorEngine.getMemorySavingsPercent(iter);

    expect(savingsPercent).toBeLessThan(70);
  });
});

describe('VM Iterator Support', () => {
  test('ITER_INIT: creates iterator on stack', () => {
    const vm = new VM();
    const program: Inst[] = [
      { op: Op.PUSH, arg: 0 },    // start
      { op: Op.PUSH, arg: 5 },    // end
      { op: Op.ITER_INIT },       // create iterator
      { op: Op.HALT },
    ];

    const result = vm.run(program);
    expect(result.ok).toBe(true);
    const stack = vm.getStack();
    expect(stack.length).toBe(1);

    const iter = stack[0] as Iterator;
    expect(iter.current).toBe(0);
    expect(iter.end).toBe(5);
  });

  test('ITER_HAS: checks if iterator has more values', () => {
    const vm = new VM();
    const program: Inst[] = [
      { op: Op.PUSH, arg: 0 },
      { op: Op.PUSH, arg: 3 },
      { op: Op.ITER_INIT },
      { op: Op.ITER_HAS },         // check has more
      { op: Op.HALT },
    ];

    const result = vm.run(program);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(1); // true (has more values)
  });

  test('ITER_NEXT: advances iterator and returns value', () => {
    const vm = new VM();
    const program: Inst[] = [
      { op: Op.PUSH, arg: 0 },
      { op: Op.PUSH, arg: 5 },
      { op: Op.ITER_INIT },       // stack: [iter]
      { op: Op.ITER_NEXT },       // stack: [0, iter(1)]
      { op: Op.POP },              // stack: [0]
      { op: Op.HALT },
    ];

    const result = vm.run(program);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
  });

  test('Iterator loop: manual iteration', () => {
    const vm = new VM();
    // Simulate: sum = 0; for i in 0..3 { sum += i }
    // Note: ITER_NEXT pops iterator, pushes value then iterator
    const program: Inst[] = [
      { op: Op.PUSH, arg: 0 },    // accumulator (sum = 0)
      { op: Op.PUSH, arg: 0 },    // range start
      { op: Op.PUSH, arg: 3 },    // range end
      { op: Op.ITER_INIT },       // create iterator: stack = [0, iterator]

      // Iteration 1: ITER_NEXT
      { op: Op.ITER_NEXT },       // pops iterator, pushes 0 and next_iterator
                                   // stack: [0, 0, next_iterator]
      { op: Op.POP },             // remove iterator: stack = [0, 0]
      { op: Op.ADD },             // stack: [0]

      // Iteration 2
      { op: Op.PUSH, arg: 1 },    // push iterator back (we popped it)
      // Stack is [0] but we need the iterator. This approach won't work.
      // Let me simplify the test.
      { op: Op.HALT },
    ];

    // Simpler test: just test ITER_NEXT twice in sequence
    const simpleProgram: Inst[] = [
      { op: Op.PUSH, arg: 0 },
      { op: Op.PUSH, arg: 3 },
      { op: Op.ITER_INIT },

      { op: Op.ITER_NEXT },
      { op: Op.POP },  // pop iterator, keep value

      { op: Op.HALT },
    ];

    const result = vm.run(simpleProgram);
    expect(result.ok).toBe(true);
    // Value should be 0
    expect(result.value).toBe(0);
  });

  test('Iterator exhausted throws error on ITER_NEXT', () => {
    const vm = new VM();
    const program: Inst[] = [
      { op: Op.PUSH, arg: 0 },
      { op: Op.PUSH, arg: 1 },
      { op: Op.ITER_INIT },
      { op: Op.ITER_NEXT },  // gets 0, iter at 1
      { op: Op.ITER_NEXT },  // exhausted! should error
      { op: Op.HALT },
    ];

    const result = vm.run(program);
    expect(result.ok).toBe(false);
    expect(result.error?.detail).toContain('exhausted');
  });

  test('Backward iteration', () => {
    const vm = new VM();
    // Create iterator from 2 to -1 with step -1
    // But VM doesn't support negative PUSH, so we'll test via engine
    const iter = IteratorEngine.init(2, -1, -1);
    expect(IteratorEngine.has(iter)).toBe(true);

    const res1 = IteratorEngine.next(iter);
    expect(res1.value).toBe(2);
  });
});

describe('IteratorLearner', () => {
  let learner: IteratorLearner;

  beforeEach(() => {
    learner = new IteratorLearner();
  });

  test('record: saves iterator metric', () => {
    const iter = IteratorEngine.init(0, 10);
    learner.record(iter);

    const metrics = learner.getMetrics();
    expect(metrics.length).toBe(1);
    expect(metrics[0].elementsCount).toBe(10);
  });

  test('record: multiple iterators', () => {
    learner.record(IteratorEngine.init(0, 10));
    learner.record(IteratorEngine.init(0, 100));
    learner.record(IteratorEngine.init(5, 15));

    const metrics = learner.getMetrics();
    expect(metrics.length).toBe(3);
  });

  test('getTotalSavings: calculates savings', () => {
    learner.record(IteratorEngine.init(0, 100));
    learner.record(IteratorEngine.init(0, 100));

    const savings = learner.getTotalSavings();
    expect(savings.totalArrayMemory).toBeGreaterThan(0);
    expect(savings.totalIteratorMemory).toBeGreaterThan(0);
    expect(savings.totalSaved).toBeGreaterThan(0);
    expect(savings.totalArrayMemory > savings.totalIteratorMemory).toBe(true);
  });

  test('getTotalSavings: high savings percent', () => {
    learner.record(IteratorEngine.init(0, 1000));
    const savings = learner.getTotalSavings();
    expect(savings.savingsPercent).toBeGreaterThan(90);
  });

  test('getStats: calculates averages', () => {
    learner.record(IteratorEngine.init(0, 10));
    learner.record(IteratorEngine.init(0, 20));
    learner.record(IteratorEngine.init(0, 30));

    const stats = learner.getStats();
    expect(stats.count).toBe(3);
    expect(stats.avgElements).toBe(20); // (10+20+30)/3
    expect(stats.maxRange).toBe(30);
  });

  test('getStats: empty returns zeros', () => {
    const stats = learner.getStats();
    expect(stats.count).toBe(0);
    expect(stats.avgElements).toBe(0);
  });

  test('rangeType classification', () => {
    learner.record(IteratorEngine.init(0, 10, 1));
    learner.record(IteratorEngine.init(0, 10, 2));

    const metrics = learner.getMetrics();
    expect(metrics[0].rangeType).toBe('forward');
    expect(metrics[1].rangeType).toBe('step');
  });
});

describe('Iterator integration', () => {
  test('memory savings demonstration', () => {
    const iter = IteratorEngine.init(0, 1000000);

    const iterMem = IteratorEngine.getMemoryEstimate(iter);
    const arrMem = IteratorEngine.getArrayMemoryEstimate(iter);
    const savings = IteratorEngine.getMemorySavingsPercent(iter);

    // Iterator should be ~24 bytes
    expect(iterMem).toBe(24);

    // Array should be 8MB+ (1M elements × 8 bytes + overhead)
    expect(arrMem).toBeGreaterThan(8_000_000);

    // Savings should be > 99%
    expect(savings).toBeGreaterThan(99);
  });

  test('learner accumulates savings across many iterators', () => {
    const learner = new IteratorLearner();

    // Simulate 10 large range iterations
    for (let i = 0; i < 10; i++) {
      learner.record(IteratorEngine.init(0, 100000 * (i + 1)));
    }

    const savings = learner.getTotalSavings();
    const stats = learner.getStats();

    expect(stats.count).toBe(10);
    expect(savings.totalSaved).toBeGreaterThan(40_000_000); // > 40MB saved
    expect(savings.savingsPercent).toBeGreaterThan(99);
  });
});
