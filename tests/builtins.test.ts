import {
  BUILTINS,
  getBuiltinType,
  getBuiltinImpl,
  getBuiltinC,
  getBuiltinNames,
  isBuiltin,
  validateBuiltins,
} from '../src/engine/builtins';

describe('Builtin Registry', () => {
  test('validation passes', () => {
    const result = validateBuiltins();
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  test('all builtins have required fields', () => {
    for (const [name, spec] of Object.entries(BUILTINS)) {
      expect(spec.name).toBe(name);
      expect(spec.params).toBeDefined();
      expect(spec.return_type).toBeDefined();
      expect(spec.c_name).toBeDefined();
      expect(Array.isArray(spec.headers)).toBe(true);
    }
  });

  test('getBuiltinType: sum', () => {
    const type = getBuiltinType('sum');
    expect(type).not.toBeNull();
    expect(type!.params[0].name).toBe('arr');
    expect(type!.params[0].type).toBe('array<number>');
    expect(type!.return_type).toBe('number');
  });

  test('getBuiltinType: sqrt', () => {
    const type = getBuiltinType('sqrt');
    expect(type!.params[0].name).toBe('x');
    expect(type!.return_type).toBe('number');
  });

  test('getBuiltinImpl: sum works', () => {
    const impl = getBuiltinImpl('sum');
    expect(impl).not.toBeNull();
    expect(impl!([1, 2, 3, 4, 5])).toBe(15);
  });

  test('getBuiltinImpl: average works', () => {
    const impl = getBuiltinImpl('average');
    expect(impl!([10, 20, 30])).toBe(20);
  });

  test('getBuiltinImpl: max works', () => {
    const impl = getBuiltinImpl('max');
    expect(impl!([3, 7, 2, 9, 1])).toBe(9);
  });

  test('getBuiltinImpl: min works', () => {
    const impl = getBuiltinImpl('min');
    expect(impl!([5, 2, 8, 1, 9])).toBe(1);
  });

  test('getBuiltinImpl: sqrt works', () => {
    const impl = getBuiltinImpl('sqrt');
    expect(impl!(16)).toBe(4);
  });

  test('getBuiltinC: sum', () => {
    const c = getBuiltinC('sum');
    expect(c!.c_name).toBe('sum_array');
    expect(c!.headers).toContain('stdlib.h');
  });

  test('getBuiltinC: sqrt', () => {
    const c = getBuiltinC('sqrt');
    expect(c!.c_name).toBe('sqrt');
    expect(c!.headers).toContain('math.h');
  });

  test('getBuiltinNames returns all builtins', () => {
    const names = getBuiltinNames();
    expect(names.length).toBeGreaterThan(10);
    expect(names).toContain('sum');
    expect(names).toContain('average');
    expect(names).toContain('sqrt');
  });

  test('isBuiltin recognizes builtins', () => {
    expect(isBuiltin('sum')).toBe(true);
    expect(isBuiltin('sqrt')).toBe(true);
    expect(isBuiltin('unknown_func')).toBe(false);
  });

  test('multiple builtins work', () => {
    const sum_impl = getBuiltinImpl('sum');
    const avg_impl = getBuiltinImpl('average');
    const max_impl = getBuiltinImpl('max');

    const data = [10, 20, 30, 40];
    expect(sum_impl!(data)).toBe(100);
    expect(avg_impl!(data)).toBe(25);
    expect(max_impl!(data)).toBe(40);
  });

  test('builtin headers are consistent', () => {
    // All array ops should have stdlib.h
    for (const op of ['sum', 'average', 'max', 'min', 'count', 'length']) {
      const c = getBuiltinC(op);
      expect(c!.headers).toContain('stdlib.h');
    }

    // All math ops should have math.h
    for (const op of ['sqrt', 'abs', 'floor', 'ceil', 'round']) {
      const c = getBuiltinC(op);
      expect(c!.headers).toContain('math.h');
    }
  });
});

// ────────────────────────────────────────────────────────────
// Phase 6.2: New Array, String, and Type Functions
// ────────────────────────────────────────────────────────────

describe('Phase 6.2: Array Functions', () => {
  test('array_push works', () => {
    const impl = getBuiltinImpl('array_push');
    expect(impl).not.toBeNull();
    const arr: any[] = [];
    impl!(arr, 1);
    impl!(arr, 2);
    expect(arr.length).toBe(2);
    expect(arr[0]).toBe(1);
    expect(arr[1]).toBe(2);
  });

  test('array_pop works', () => {
    const impl = getBuiltinImpl('array_pop');
    expect(impl).not.toBeNull();
    const arr = [1, 2, 3];
    expect(impl!(arr)).toBe(3);
    expect(arr.length).toBe(2);
  });

  test('array_length works', () => {
    const impl = getBuiltinImpl('array_length');
    expect(impl).not.toBeNull();
    expect(impl!([1, 2, 3])).toBe(3);
    expect(impl!([])).toBe(0);
  });

  test('array_shift works', () => {
    const impl = getBuiltinImpl('array_shift');
    expect(impl).not.toBeNull();
    const arr = [1, 2, 3];
    expect(impl!(arr)).toBe(1);
    expect(arr.length).toBe(2);
  });

  test('array_unshift works', () => {
    const impl = getBuiltinImpl('array_unshift');
    expect(impl).not.toBeNull();
    const arr = [2, 3];
    impl!(arr, 1);
    expect(arr[0]).toBe(1);
    expect(arr.length).toBe(3);
  });

  test('array_join works', () => {
    const impl = getBuiltinImpl('array_join');
    expect(impl).not.toBeNull();
    expect(impl!(['a', 'b', 'c'], ',')).toBe('a,b,c');
    expect(impl!([1, 2, 3], '-')).toBe('1-2-3');
  });
});

describe('Phase 6.2: String Functions', () => {
  test('string_split works', () => {
    const impl = getBuiltinImpl('string_split');
    expect(impl).not.toBeNull();
    const result = impl!('a,b,c', ',');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3);
    expect(result[0]).toBe('a');
  });

  test('string_trim works', () => {
    const impl = getBuiltinImpl('string_trim');
    expect(impl).not.toBeNull();
    expect(impl!('  hello  ')).toBe('hello');
    expect(impl!('world')).toBe('world');
  });

  test('string_replace works', () => {
    const impl = getBuiltinImpl('string_replace');
    expect(impl).not.toBeNull();
    const result = impl!('hello world', 'world', 'freelang');
    expect(result).toBe('hello freelang');
  });

  test('string_contains works', () => {
    const impl = getBuiltinImpl('string_contains');
    expect(impl).not.toBeNull();
    expect(impl!('hello world', 'world')).toBe(true);
    expect(impl!('hello world', 'xyz')).toBe(false);
  });
});

describe('Phase 6.2: Type Functions', () => {
  test('is_null works', () => {
    const impl = getBuiltinImpl('is_null');
    expect(impl).not.toBeNull();
    expect(impl!(null)).toBe(true);
    expect(impl!(undefined)).toBe(true);
    expect(impl!(0)).toBe(false);
    expect(impl!('')).toBe(false);
  });

  test('is_array works', () => {
    const impl = getBuiltinImpl('is_array');
    expect(impl).not.toBeNull();
    expect(impl!([1, 2, 3])).toBe(true);
    expect(impl!([])).toBe(true);
    expect(impl!('not array')).toBe(false);
    expect(impl!({})).toBe(false);
  });

  test('is_map works', () => {
    const impl = getBuiltinImpl('is_map');
    expect(impl).not.toBeNull();
    expect(impl!({})).toBe(true);
    expect(impl!({ a: 1 })).toBe(true);
    expect(impl!([])).toBe(false);
    expect(impl!('string')).toBe(false);
  });

  test('is_string works', () => {
    const impl = getBuiltinImpl('is_string');
    expect(impl).not.toBeNull();
    expect(impl!('hello')).toBe(true);
    expect(impl!('')).toBe(true);
    expect(impl!(123)).toBe(false);
  });

  test('is_number works', () => {
    const impl = getBuiltinImpl('is_number');
    expect(impl).not.toBeNull();
    expect(impl!(123)).toBe(true);
    expect(impl!(0)).toBe(true);
    expect(impl!('123')).toBe(false);
  });

  test('is_bool works', () => {
    const impl = getBuiltinImpl('is_bool');
    expect(impl).not.toBeNull();
    expect(impl!(true)).toBe(true);
    expect(impl!(false)).toBe(true);
    expect(impl!(1)).toBe(false);
  });
});

describe('Phase 6.2: Conversion Functions', () => {
  test('to_string works', () => {
    const impl = getBuiltinImpl('to_string');
    expect(impl).not.toBeNull();
    expect(impl!(123)).toBe('123');
    expect(impl!(true)).toBe('true');
    expect(impl!(null)).toBe('null');
  });

  test('to_number works', () => {
    const impl = getBuiltinImpl('to_number');
    expect(impl).not.toBeNull();
    expect(impl!('123')).toBe(123);
    expect(impl!('45.67')).toBe(45.67);
    expect(impl!('not a number')).toBe(0);
  });
});
