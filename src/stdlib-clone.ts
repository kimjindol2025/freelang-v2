/**
 * FreeLang v2 stdlib — stdlib-clone.ts
 * npm clone 완전 대체 네이티브 함수 등록
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

function deepCloneValue(obj: any, seen: WeakMap<object, any> = new WeakMap()): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags);
  if (seen.has(obj)) return seen.get(obj);

  if (Array.isArray(obj)) {
    const arr: any[] = [];
    seen.set(obj, arr);
    for (let i = 0; i < obj.length; i++) {
      arr[i] = deepCloneValue(obj[i], seen);
    }
    return arr;
  }

  const clone: Record<string, any> = Object.create(Object.getPrototypeOf(obj));
  seen.set(obj, clone);
  for (const key of Object.keys(obj)) {
    clone[key] = deepCloneValue(obj[key], seen);
  }
  return clone;
}

function shallowClone(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return [...obj];
  return { ...obj };
}

export function registerCloneFunctions(registry: NativeFunctionRegistry): void {
  registry.register({
    name: 'clone_deep',
    module: 'clone',
    paramCount: 1,
    executor: (args: any[]) => deepCloneValue(args[0])
  });

  registry.register({
    name: 'clone_shallow',
    module: 'clone',
    paramCount: 1,
    executor: (args: any[]) => shallowClone(args[0])
  });

  registry.register({
    name: 'clone_prototype',
    module: 'clone',
    paramCount: 1,
    executor: (args: any[]) => {
      const obj = args[0];
      if (obj === null || typeof obj !== 'object') return obj;
      const clone = Object.create(Object.getPrototypeOf(obj));
      return Object.assign(clone, deepCloneValue(obj));
    }
  });
}
