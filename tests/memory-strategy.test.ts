import {
  MemoryStrategy,
  StrategyAwareEmitter,
  StrategyLearner,
  MemoryProfile,
  StrategyMetric,
} from '../src/codegen/memory-strategy';

describe('MemoryStrategy', () => {
  test('getProfile: speed strategy', () => {
    const profile = MemoryStrategy.getProfile('speed');
    expect(profile.stackSize).toBe(1024 * 1024); // 1MB
    expect(profile.boundaryChecks).toBe(false);
    expect(profile.nullChecks).toBe(false);
    expect(profile.optimization).toBe('-O3');
    expect(profile.preAllocate).toBe(true);
  });

  test('getProfile: memory_efficient strategy', () => {
    const profile = MemoryStrategy.getProfile('memory_efficient');
    expect(profile.stackSize).toBe(64 * 1024); // 64KB
    expect(profile.boundaryChecks).toBe(true);
    expect(profile.nullChecks).toBe(false);
    expect(profile.optimization).toBe('-O2');
    expect(profile.preAllocate).toBe(false);
  });

  test('getProfile: safety strategy', () => {
    const profile = MemoryStrategy.getProfile('safety');
    expect(profile.stackSize).toBe(256 * 1024); // 256KB
    expect(profile.boundaryChecks).toBe(true);
    expect(profile.nullChecks).toBe(true);
    expect(profile.optimization).toContain('-g');
    expect(profile.optimization).toContain('-fsanitize=address');
    expect(profile.preAllocate).toBe(false);
  });

  test('getProfile: standard (default) strategy', () => {
    const profile = MemoryStrategy.getProfile('standard');
    expect(profile.stackSize).toBe(256 * 1024);
    expect(profile.boundaryChecks).toBe(true);
    expect(profile.nullChecks).toBe(false);
    expect(profile.optimization).toBe('-O2');
  });

  test('getProfile: unknown directive defaults to standard', () => {
    const profile = MemoryStrategy.getProfile('unknown_directive');
    expect(profile.stackSize).toBe(256 * 1024);
    expect(profile.boundaryChecks).toBe(true);
  });

  test('stack sizes are properly ordered', () => {
    const speed = MemoryStrategy.getProfile('speed');
    const memory_eff = MemoryStrategy.getProfile('memory_efficient');
    const safety = MemoryStrategy.getProfile('safety');
    const standard = MemoryStrategy.getProfile('standard');

    expect(speed.stackSize).toBeGreaterThan(safety.stackSize);
    expect(safety.stackSize).toBeGreaterThan(memory_eff.stackSize);
  });

  test('safety has all checks enabled', () => {
    const profile = MemoryStrategy.getProfile('safety');
    expect(profile.boundaryChecks).toBe(true);
    expect(profile.nullChecks).toBe(true);
  });

  test('speed disables all checks', () => {
    const profile = MemoryStrategy.getProfile('speed');
    expect(profile.boundaryChecks).toBe(false);
    expect(profile.nullChecks).toBe(false);
  });
});

describe('StrategyAwareEmitter', () => {
  test('emitter created for each directive', () => {
    const directives = ['speed', 'memory_efficient', 'safety', 'standard'];
    for (const dir of directives) {
      const emitter = new StrategyAwareEmitter(dir);
      expect(emitter).toBeDefined();
    }
  });

  test('genProlog: speed strategy omits checks', () => {
    const emitter = new StrategyAwareEmitter('speed');
    const prolog = emitter.genProlog();
    const prologText = prolog.join('\n');

    expect(prologText).not.toContain('CHECK_NULL');
    expect(prologText).not.toContain('CHECK_BOUNDS');
    expect(prologText).toContain('STACK_SIZE');
    expect(prologText).toContain('_stack[STACK_SIZE]');
  });

  test('genProlog: safety strategy includes both checks', () => {
    const emitter = new StrategyAwareEmitter('safety');
    const prolog = emitter.genProlog();
    const prologText = prolog.join('\n');

    expect(prologText).toContain('CHECK_NULL');
    expect(prologText).toContain('CHECK_BOUNDS');
    expect(prologText).toContain('NULL pointer');
    expect(prologText).toContain('Index out of bounds');
  });

  test('genProlog: memory_efficient includes boundary check only', () => {
    const emitter = new StrategyAwareEmitter('memory_efficient');
    const prolog = emitter.genProlog();
    const prologText = prolog.join('\n');

    expect(prologText).toContain('CHECK_BOUNDS');
    expect(prologText).not.toContain('CHECK_NULL');
    expect(prologText).toContain('동적 할당');
    expect(prologText).toContain('_stack_capacity');
  });

  test('genArrayAccess: speed has no checks', () => {
    const emitter = new StrategyAwareEmitter('speed');
    const access = emitter.genArrayAccess('arr', 'i', true);
    expect(access).toBe('arr[i]');
  });

  test('genArrayAccess: safety includes bounds check', () => {
    const emitter = new StrategyAwareEmitter('safety');
    const access = emitter.genArrayAccess('arr', 'i', true);
    expect(access).toContain('CHECK_BOUNDS');
    expect(access).toContain('arr[i]');
  });

  test('genArrayAccess: memory_efficient checks bounds', () => {
    const emitter = new StrategyAwareEmitter('memory_efficient');
    const access = emitter.genArrayAccess('arr', 'i', true);
    expect(access).toContain('CHECK_BOUNDS');
  });

  test('genStackPush: speed uses simple array push', () => {
    const emitter = new StrategyAwareEmitter('speed');
    const push = emitter.genStackPush('42.0');
    expect(push).toBe('_stack[_sp++] = 42.0;');
  });

  test('genStackPush: memory_efficient expands stack', () => {
    const emitter = new StrategyAwareEmitter('memory_efficient');
    const push = emitter.genStackPush('42.0');
    expect(push).toContain('_sp >= _stack_capacity');
    expect(push).toContain('realloc');
    expect(push).toContain('_stack[_sp++]');
  });

  test('getOptimizationFlags: speed uses -O3', () => {
    const emitter = new StrategyAwareEmitter('speed');
    expect(emitter.getOptimizationFlags()).toBe('-O3');
  });

  test('getOptimizationFlags: safety includes debug and sanitizer', () => {
    const emitter = new StrategyAwareEmitter('safety');
    const flags = emitter.getOptimizationFlags();
    expect(flags).toContain('-g');
    expect(flags).toContain('fsanitize');
  });

  test('getProfileInfo returns the strategy profile', () => {
    const emitter = new StrategyAwareEmitter('speed');
    const info = emitter.getProfileInfo();
    expect(info.stackSize).toBe(1024 * 1024);
    expect(info.optimization).toBe('-O3');
  });
});

describe('StrategyLearner', () => {
  let learner: StrategyLearner;

  beforeEach(() => {
    learner = new StrategyLearner();
  });

  test('record: saves metric', () => {
    learner.record('speed', 100, 50000, 1024 * 1024, 50);

    const metrics = learner.getMetrics();
    expect(metrics.length).toBe(1);
    expect(metrics[0].directive).toBe('speed');
    expect(metrics[0].compilationTime).toBe(100);
    expect(metrics[0].binarySize).toBe(50000);
  });

  test('record: multiple metrics accumulate', () => {
    learner.record('speed', 100, 50000, 1024 * 1024, 50);
    learner.record('speed', 110, 51000, 1024 * 1024, 52);
    learner.record('memory_efficient', 150, 40000, 64 * 1024, 80);

    const metrics = learner.getMetrics();
    expect(metrics.length).toBe(3);
  });

  test('getAverages: calculates correctly for speed', () => {
    learner.record('speed', 100, 50000, 1024 * 1024, 50);
    learner.record('speed', 110, 51000, 1024 * 1024, 52);

    const avg = learner.getAverages('speed');
    expect(avg).not.toBeNull();
    expect(avg!.avgCompileTime).toBe(105);
    expect(avg!.avgBinarySize).toBe(50500);
    expect(avg!.avgExecTime).toBe(51);
    expect(avg!.count).toBe(2);
  });

  test('getAverages: returns null for non-existent directive', () => {
    learner.record('speed', 100, 50000, 1024 * 1024, 50);

    const avg = learner.getAverages('unknown');
    expect(avg).toBeNull();
  });

  test('compareAll: compares all directives', () => {
    learner.record('speed', 100, 50000, 1024 * 1024, 50);
    learner.record('memory_efficient', 150, 40000, 64 * 1024, 80);
    learner.record('safety', 200, 55000, 256 * 1024, 100);

    const comparison = learner.compareAll();
    expect(comparison.speed).not.toBeNull();
    expect(comparison.memory_efficient).not.toBeNull();
    expect(comparison.safety).not.toBeNull();

    // Speed should be fastest
    expect(comparison.speed!.avgExecTime).toBeLessThan(
      comparison.safety!.avgExecTime
    );
  });

  test('record: includes timestamp', () => {
    const before = Date.now();
    learner.record('speed', 100, 50000, 1024 * 1024, 50);
    const after = Date.now();

    const metrics = learner.getMetrics();
    expect(metrics[0].timestamp).toBeGreaterThanOrEqual(before);
    expect(metrics[0].timestamp).toBeLessThanOrEqual(after);
  });
});

describe('Strategy integration', () => {
  test('emitter for each directive generates different prologs', () => {
    const speed = new StrategyAwareEmitter('speed');
    const safety = new StrategyAwareEmitter('safety');

    const speedProlog = speed.genProlog().join('\n');
    const safetyProlog = safety.genProlog().join('\n');

    expect(speedProlog).not.toEqual(safetyProlog);
    expect(speedProlog.length).toBeLessThan(safetyProlog.length);
  });

  test('array access differs by strategy', () => {
    const speed = new StrategyAwareEmitter('speed');
    const safety = new StrategyAwareEmitter('safety');

    const speedAccess = speed.genArrayAccess('arr', 'i', true);
    const safetyAccess = safety.genArrayAccess('arr', 'i', true);

    expect(speedAccess).toBe('arr[i]');
    expect(safetyAccess).not.toBe('arr[i]');
    expect(safetyAccess).toContain('CHECK_BOUNDS');
  });

  test('stack push differs by strategy', () => {
    const speed = new StrategyAwareEmitter('speed');
    const memEff = new StrategyAwareEmitter('memory_efficient');

    const speedPush = speed.genStackPush('x');
    const memEffPush = memEff.genStackPush('x');

    expect(speedPush).not.toEqual(memEffPush);
    expect(speedPush).not.toContain('realloc');
    expect(memEffPush).toContain('realloc');
  });
});
