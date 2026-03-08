import { FreeLang, Op, AIIntent } from '../src/index';

describe('FreeLang E2E', () => {
  let fl: FreeLang;
  beforeEach(() => { fl = new FreeLang('/tmp/freelang-ai-test'); });

  // ── AI generates IR, VM executes ──
  test('sum array via VM', () => {
    const intent: AIIntent = {
      fn: 'sum',
      params: [{ name: 'arr', type: 'array' }],
      ret: 'number',
      body: [
        { op: Op.ARR_NEW, arg: 'arr' },
        { op: Op.PUSH, arg: 1 },
        { op: Op.ARR_PUSH, arg: 'arr' },
        { op: Op.PUSH, arg: 2 },
        { op: Op.ARR_PUSH, arg: 'arr' },
        { op: Op.PUSH, arg: 3 },
        { op: Op.ARR_PUSH, arg: 'arr' },
        { op: Op.ARR_SUM, arg: 'arr' },
        { op: Op.RET },
      ],
    };
    const r = fl.exec(intent);
    expect(r.vm.ok).toBe(true);
    expect(r.vm.value).toBe(6);
  });

  test('arithmetic expression', () => {
    const intent: AIIntent = {
      fn: 'calc',
      params: [],
      ret: 'number',
      body: [
        { op: Op.PUSH, arg: 10 },
        { op: Op.PUSH, arg: 3 },
        { op: Op.MUL },
        { op: Op.PUSH, arg: 5 },
        { op: Op.ADD },
        { op: Op.RET },
      ],
    };
    const r = fl.exec(intent);
    expect(r.vm.ok).toBe(true);
    expect(r.vm.value).toBe(35); // 10*3+5
  });

  // ── Self-Correction ──
  test('auto-correct: undefined variable', () => {
    const intent: AIIntent = {
      fn: 'test_fix',
      params: [],
      ret: 'number',
      body: [
        { op: Op.LOAD, arg: 'x' }, // x not defined → error
        { op: Op.PUSH, arg: 1 },
        { op: Op.ADD },
        { op: Op.RET },
      ],
    };
    const r = fl.exec(intent, { auto_correct: true });
    // Corrector should init x = 0, so result = 0 + 1 = 1
    expect(r.vm.ok).toBe(true);
    expect(r.vm.value).toBe(1);
    expect(r.correction).toBeDefined();
    expect(r.correction!.corrections.length).toBeGreaterThan(0);
  });

  test('auto-correct: div by zero', () => {
    const intent: AIIntent = {
      fn: 'test_div',
      params: [],
      ret: 'number',
      body: [
        { op: Op.PUSH, arg: 10 },
        { op: Op.PUSH, arg: 0 },
        { op: Op.DIV },
        { op: Op.RET },
      ],
    };
    const r = fl.exec(intent, { auto_correct: true });
    expect(r.vm.ok).toBe(true);
    // After correction: 10 / 1 = 10
    expect(r.vm.value).toBe(10);
  });

  // ── C Code Generation ──
  test('generate C code', () => {
    const intent: AIIntent = {
      fn: 'sum',
      params: [{ name: 'arr', type: 'array' }],
      ret: 'number',
      body: [
        { op: Op.ARR_SUM, arg: 'arr' },
        { op: Op.RET },
      ],
    };
    const c = fl.toC(intent);
    expect(c).toContain('#include <stdlib.h>');
    expect(c).toContain('double sum(');
    expect(c).toContain('for');
    expect(c).toContain('_s +=');
    expect(c).toContain('int main');
  });

  // ── Full pipeline: VM + C + GCC + run ──
  test('full pipeline: sum', () => {
    const intent: AIIntent = {
      fn: 'sum_full',
      params: [{ name: 'arr', type: 'array' }],
      ret: 'number',
      body: [
        // VM needs data in body (params are for C codegen only)
        { op: Op.ARR_NEW, arg: 'arr' },
        { op: Op.PUSH, arg: 1 },
        { op: Op.ARR_PUSH, arg: 'arr' },
        { op: Op.PUSH, arg: 2 },
        { op: Op.ARR_PUSH, arg: 'arr' },
        { op: Op.PUSH, arg: 3 },
        { op: Op.ARR_PUSH, arg: 'arr' },
        { op: Op.PUSH, arg: 4 },
        { op: Op.ARR_PUSH, arg: 'arr' },
        { op: Op.PUSH, arg: 5 },
        { op: Op.ARR_PUSH, arg: 'arr' },
        { op: Op.ARR_SUM, arg: 'arr' },
        { op: Op.RET },
      ],
    };
    const r = fl.full(intent);
    expect(r.vm.ok).toBe(true);
    expect(r.vm.value).toBe(15);

    // C compilation
    if (r.compile) {
      if (r.compile.ok) {
        expect(r.native).toBeDefined();
        expect(r.native!.stdout).toContain('result=');
      }
    }
  });

  test('full pipeline: average', () => {
    const intent: AIIntent = {
      fn: 'avg_full',
      params: [{ name: 'data', type: 'array' }],
      ret: 'number',
      body: [
        { op: Op.ARR_NEW, arg: 'data' },
        { op: Op.PUSH, arg: 10 },
        { op: Op.ARR_PUSH, arg: 'data' },
        { op: Op.PUSH, arg: 20 },
        { op: Op.ARR_PUSH, arg: 'data' },
        { op: Op.PUSH, arg: 30 },
        { op: Op.ARR_PUSH, arg: 'data' },
        { op: Op.ARR_AVG, arg: 'data' },
        { op: Op.RET },
      ],
    };
    const r = fl.full(intent);
    expect(r.vm.ok).toBe(true);
  });

  // ── Learning ──
  test('learning records patterns', () => {
    const intent: AIIntent = {
      fn: 'learn_test',
      params: [],
      ret: 'number',
      body: [
        { op: Op.PUSH, arg: 42 },
        { op: Op.RET },
      ],
    };

    // Run multiple times
    fl.exec(intent, { learn: true });
    fl.exec(intent, { learn: true });
    fl.exec(intent, { learn: true });

    const r = fl.exec(intent, { learn: true });
    expect(r.pattern_success_rate).toBeGreaterThan(0);
  });

  test('stats work', () => {
    const s = fl.stats();
    expect(s.patterns).toBeDefined();
    expect(typeof s.patterns.total).toBe('number');
  });
});
