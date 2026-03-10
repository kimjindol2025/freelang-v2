/**
 * FreeLang v2 stdlib — stdlib-rfdc.ts
 * npm rfdc (Really Fast Deep Clone) 완전 대체 네이티브 함수 등록
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

function rfdcClone(obj: any, circular: boolean, refs?: Map<any, any>): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags);
  if (obj instanceof Buffer) return Buffer.from(obj);

  if (circular) {
    if (!refs) refs = new Map();
    if (refs.has(obj)) return refs.get(obj);
  }

  if (Array.isArray(obj)) {
    const arr: any[] = new Array(obj.length);
    if (circular) refs!.set(obj, arr);
    for (let i = 0; i < obj.length; i++) {
      arr[i] = rfdcClone(obj[i], circular, refs);
    }
    return arr;
  }

  const keys = Object.keys(obj);
  const clone: Record<string, any> = {};
  if (circular) refs!.set(obj, clone);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]!;
    clone[k] = rfdcClone(obj[k], circular, refs);
  }
  return clone;
}

export function registerRfdcFunctions(registry: NativeFunctionRegistry): void {
  registry.register({
    name: 'rfdc_clone',
    module: 'rfdc',
    paramCount: 2,
    executor: (args: any[]) => {
      const circular = Boolean(args[1]);
      return rfdcClone(args[0], circular);
    }
  });

  registry.register({
    name: 'rfdc_clone_proto',
    module: 'rfdc',
    paramCount: 1,
    executor: (args: any[]) => {
      const obj = args[0];
      if (obj === null || typeof obj !== 'object') return obj;
      const clone = Object.create(Object.getPrototypeOf(obj));
      const keys = Object.keys(obj);
      for (const k of keys) {
        clone[k] = rfdcClone(obj[k], false);
      }
      return clone;
    }
  });

  registry.register({
    name: 'rfdc_clone_date',
    module: 'rfdc',
    paramCount: 1,
    executor: (args: any[]) => {
      const d = args[0];
      if (d instanceof Date) return new Date(d.getTime());
      if (typeof d === 'number') return new Date(d);
      if (typeof d === 'string') return new Date(d);
      return new Date();
    }
  });
}
