/**
 * FreeLang v2 stdlib — stdlib-deep-equal.ts
 * npm deep-equal 완전 대체 네이티브 함수 등록
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

function deepCompare(a: any, b: any, strict: boolean): boolean {
  if (strict ? a === b : a == b) return true;
  if (a === null || b === null) return false;
  if (a === undefined || b === undefined) return false;
  if (typeof a !== typeof b) {
    if (!strict && typeof a !== 'object' && typeof b !== 'object') {
      return a == b;
    }
    return false;
  }
  if (typeof a !== 'object') return strict ? a === b : a == b;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepCompare(a[i], b[i], strict)) return false;
    }
    return true;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepCompare(a[key], b[key], strict)) return false;
  }
  return true;
}

function shallowCompare(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (a === null || b === null) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

export function registerDeepEqualFunctions(registry: NativeFunctionRegistry): void {
  registry.register({
    name: 'deep_equal_compare',
    module: 'deep-equal',
    paramCount: 3,
    executor: (args: any[]) => {
      const strict = Boolean(args[2]);
      return deepCompare(args[0], args[1], strict);
    }
  });

  registry.register({
    name: 'deep_equal_loose',
    module: 'deep-equal',
    paramCount: 2,
    executor: (args: any[]) => deepCompare(args[0], args[1], false)
  });

  registry.register({
    name: 'deep_equal_shallow',
    module: 'deep-equal',
    paramCount: 2,
    executor: (args: any[]) => shallowCompare(args[0], args[1])
  });
}
