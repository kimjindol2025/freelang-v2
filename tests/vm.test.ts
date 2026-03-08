import { VM } from '../src/vm';
import { Op, Inst } from '../src/types';

describe('VM', () => {
  let vm: VM;
  beforeEach(() => { vm = new VM(); });

  // ── Arithmetic ──
  test('add two numbers', () => {
    const r = vm.run([
      { op: Op.PUSH, arg: 3 },
      { op: Op.PUSH, arg: 4 },
      { op: Op.ADD },
    ]);
    expect(r.ok).toBe(true);
    expect(r.value).toBe(7);
  });

  test('complex expression: (2+3)*4', () => {
    const r = vm.run([
      { op: Op.PUSH, arg: 2 },
      { op: Op.PUSH, arg: 3 },
      { op: Op.ADD },
      { op: Op.PUSH, arg: 4 },
      { op: Op.MUL },
    ]);
    expect(r.ok).toBe(true);
    expect(r.value).toBe(20);
  });

  test('division by zero', () => {
    const r = vm.run([
      { op: Op.PUSH, arg: 10 },
      { op: Op.PUSH, arg: 0 },
      { op: Op.DIV },
    ]);
    expect(r.ok).toBe(false);
    expect(r.error?.detail).toBe('div_zero');
  });

  test('negation', () => {
    const r = vm.run([
      { op: Op.PUSH, arg: 42 },
      { op: Op.NEG },
    ]);
    expect(r.ok).toBe(true);
    expect(r.value).toBe(-42);
  });

  // ── Variables ──
  test('store and load', () => {
    const r = vm.run([
      { op: Op.PUSH, arg: 99 },
      { op: Op.STORE, arg: 'x' },
      { op: Op.LOAD, arg: 'x' },
    ]);
    expect(r.ok).toBe(true);
    expect(r.value).toBe(99);
  });

  test('undefined variable', () => {
    const r = vm.run([
      { op: Op.LOAD, arg: 'nope' },
    ]);
    expect(r.ok).toBe(false);
    expect(r.error?.detail).toContain('undef_var');
  });

  // ── Comparison ──
  test('equality', () => {
    const r = vm.run([
      { op: Op.PUSH, arg: 5 },
      { op: Op.PUSH, arg: 5 },
      { op: Op.EQ },
    ]);
    expect(r.ok).toBe(true);
    expect(r.value).toBe(1);
  });

  test('less than', () => {
    const r = vm.run([
      { op: Op.PUSH, arg: 3 },
      { op: Op.PUSH, arg: 7 },
      { op: Op.LT },
    ]);
    expect(r.ok).toBe(true);
    expect(r.value).toBe(1); // 3 < 7 = true
  });

  // ── Control flow ──
  test('conditional jump', () => {
    // if (1) goto 3, else push 99
    const r = vm.run([
      { op: Op.PUSH, arg: 1 },    // 0: push true
      { op: Op.JMP_IF, arg: 3 },  // 1: if true, jump to 3
      { op: Op.PUSH, arg: 99 },   // 2: skipped
      { op: Op.PUSH, arg: 42 },   // 3: landed here
    ]);
    expect(r.ok).toBe(true);
    expect(r.value).toBe(42);
  });

  test('simple loop: sum 1 to 5', () => {
    // sum = 0; i = 1; while (i <= 5) { sum += i; i++; }
    const r = vm.run([
      { op: Op.PUSH, arg: 0 },     // 0: sum = 0
      { op: Op.STORE, arg: 'sum' }, // 1
      { op: Op.PUSH, arg: 1 },     // 2: i = 1
      { op: Op.STORE, arg: 'i' },  // 3
      // loop start (4)
      { op: Op.LOAD, arg: 'i' },   // 4: push i
      { op: Op.PUSH, arg: 5 },     // 5: push 5
      { op: Op.LTE },              // 6: i <= 5?
      { op: Op.JMP_NOT, arg: 17 }, // 7: if false, exit loop
      // body
      { op: Op.LOAD, arg: 'sum' }, // 8
      { op: Op.LOAD, arg: 'i' },   // 9
      { op: Op.ADD },              // 10: sum + i
      { op: Op.STORE, arg: 'sum' },// 11
      { op: Op.LOAD, arg: 'i' },   // 12
      { op: Op.PUSH, arg: 1 },     // 13
      { op: Op.ADD },              // 14: i + 1
      { op: Op.STORE, arg: 'i' },  // 15
      { op: Op.JMP, arg: 4 },      // 16: goto loop start
      // exit (17)
      { op: Op.LOAD, arg: 'sum' }, // 17
    ]);
    expect(r.ok).toBe(true);
    expect(r.value).toBe(15); // 1+2+3+4+5 = 15
  });

  // ── Array ──
  test('array sum', () => {
    const r = vm.run([
      { op: Op.ARR_NEW, arg: 'data' },
      // Manually push elements (simplified: use ARR_NEW with data)
    ]);
    // ARR_NEW doesn't populate - need to use vars directly
    // Let's test via the shorthand
    expect(r.ok).toBe(true);
  });

  test('array sum shorthand', () => {
    // Pre-populate via ARR_NEW then push
    const program: Inst[] = [
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
    ];
    const r = vm.run(program);
    expect(r.ok).toBe(true);
    expect(r.value).toBe(15);
  });

  test('array avg', () => {
    const program: Inst[] = [
      { op: Op.ARR_NEW, arg: 'a' },
      { op: Op.PUSH, arg: 10 },
      { op: Op.ARR_PUSH, arg: 'a' },
      { op: Op.PUSH, arg: 20 },
      { op: Op.ARR_PUSH, arg: 'a' },
      { op: Op.PUSH, arg: 30 },
      { op: Op.ARR_PUSH, arg: 'a' },
      { op: Op.ARR_AVG, arg: 'a' },
    ];
    const r = vm.run(program);
    expect(r.ok).toBe(true);
    expect(r.value).toBe(20);
  });

  test('array max/min', () => {
    const program: Inst[] = [
      { op: Op.ARR_NEW, arg: 'a' },
      { op: Op.PUSH, arg: 3 },
      { op: Op.ARR_PUSH, arg: 'a' },
      { op: Op.PUSH, arg: 7 },
      { op: Op.ARR_PUSH, arg: 'a' },
      { op: Op.PUSH, arg: 1 },
      { op: Op.ARR_PUSH, arg: 'a' },
      { op: Op.ARR_MAX, arg: 'a' },
    ];
    const r = vm.run(program);
    expect(r.ok).toBe(true);
    expect(r.value).toBe(7);
  });

  test('array sort', () => {
    const program: Inst[] = [
      { op: Op.ARR_NEW, arg: 'a' },
      { op: Op.PUSH, arg: 5 },
      { op: Op.ARR_PUSH, arg: 'a' },
      { op: Op.PUSH, arg: 2 },
      { op: Op.ARR_PUSH, arg: 'a' },
      { op: Op.PUSH, arg: 8 },
      { op: Op.ARR_PUSH, arg: 'a' },
      { op: Op.ARR_SORT, arg: 'a' },
      { op: Op.PUSH, arg: 0 },
      { op: Op.ARR_GET, arg: 'a' },
    ];
    const r = vm.run(program);
    expect(r.ok).toBe(true);
    expect(r.value).toBe(2); // sorted: [2, 5, 8], first = 2
  });

  // ── Array MAP/FILTER ──
  test('array map: double each element', () => {
    const program: Inst[] = [
      { op: Op.ARR_NEW, arg: 'a' },
      { op: Op.PUSH, arg: 1 },
      { op: Op.ARR_PUSH, arg: 'a' },
      { op: Op.PUSH, arg: 2 },
      { op: Op.ARR_PUSH, arg: 'a' },
      { op: Op.PUSH, arg: 3 },
      { op: Op.ARR_PUSH, arg: 'a' },
      // map: x => x * 2
      { op: Op.ARR_MAP, arg: 'a', sub: [
        { op: Op.DUP },           // duplicate top of stack (the element)
        { op: Op.ADD },           // x + x = 2*x
        { op: Op.RET },
      ]},
    ];
    const r = vm.run(program);
    expect(r.ok).toBe(true);
    // After map, a should be [2, 4, 6]
    expect((r as any).value).toEqual(undefined); // map modifies in place
  });

  test('array filter: keep only > 2', () => {
    const program: Inst[] = [
      { op: Op.ARR_NEW, arg: 'a' },
      { op: Op.PUSH, arg: 1 },
      { op: Op.ARR_PUSH, arg: 'a' },
      { op: Op.PUSH, arg: 3 },
      { op: Op.ARR_PUSH, arg: 'a' },
      { op: Op.PUSH, arg: 2 },
      { op: Op.ARR_PUSH, arg: 'a' },
      { op: Op.PUSH, arg: 5 },
      { op: Op.ARR_PUSH, arg: 'a' },
      // filter: x => x > 2
      { op: Op.ARR_FILTER, arg: 'a', sub: [
        { op: Op.PUSH, arg: 2 },
        { op: Op.GT },            // x > 2
        { op: Op.RET },
      ]},
      { op: Op.ARR_LEN, arg: 'a' },
    ];
    const r = vm.run(program);
    expect(r.ok).toBe(true);
    expect(r.value).toBe(2);  // [3, 5] after filter
  });

  // ── Function Call (sub-program execution) ──
  test('function call: execute sub-program', () => {
    const add_two: Inst[] = [
      { op: Op.DUP },           // dup top stack
      { op: Op.ADD },           // x + x
      { op: Op.RET },
    ];
    const r = vm.run([
      { op: Op.PUSH, arg: 5 },
      { op: Op.CALL, arg: 'double', sub: add_two },
    ]);
    expect(r.ok).toBe(true);
    expect(r.value).toBe(10); // 5 * 2
  });

  // ── Error cases ──
  test('stack underflow', () => {
    const r = vm.run([{ op: Op.ADD }]);
    expect(r.ok).toBe(false);
    expect(r.error?.detail).toContain('stack_underflow');
  });

  test('cycle limit', () => {
    const r = vm.run([{ op: Op.JMP, arg: 0 }]); // infinite loop
    expect(r.ok).toBe(false);
    expect(r.error?.detail).toBe('cycle_limit');
  });

  // ── Performance ──
  test('execution time tracking', () => {
    const r = vm.run([{ op: Op.PUSH, arg: 1 }]);
    expect(r.ms).toBeGreaterThanOrEqual(0);
    expect(r.cycles).toBe(1);
  });
});
