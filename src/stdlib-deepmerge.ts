/**
 * FreeLang v2 stdlib — stdlib-deepmerge.ts
 * npm deepmerge 완전 대체 네이티브 함수 등록
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

function deepMerge(target: any, source: any, arrayMode: string = 'concat'): any {
  if (!source || typeof source !== 'object') return target;
  if (!target || typeof target !== 'object') return source;

  if (Array.isArray(target) && Array.isArray(source)) {
    if (arrayMode === 'replace') return [...source];
    if (arrayMode === 'concat') return [...target, ...source];
    return [...target, ...source];
  }

  if (Array.isArray(target) || Array.isArray(source)) return source;

  const output: Record<string, any> = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] !== null &&
      typeof source[key] === 'object' &&
      Object.prototype.hasOwnProperty.call(target, key) &&
      target[key] !== null &&
      typeof target[key] === 'object'
    ) {
      output[key] = deepMerge(target[key], source[key], arrayMode);
    } else {
      output[key] = source[key];
    }
  }
  return output;
}

export function registerDeepmergeFunctions(registry: NativeFunctionRegistry): void {
  registry.register({
    name: 'deepmerge_merge',
    module: 'deepmerge',
    paramCount: 2,
    executor: (args: any[]) => deepMerge(args[0], args[1])
  });

  registry.register({
    name: 'deepmerge_merge_all',
    module: 'deepmerge',
    paramCount: 1,
    executor: (args: any[]) => {
      const objects: any[] = Array.isArray(args[0]) ? args[0] : [];
      return objects.reduce((acc, obj) => deepMerge(acc, obj), {});
    }
  });

  registry.register({
    name: 'deepmerge_merge_with',
    module: 'deepmerge',
    paramCount: 3,
    executor: (args: any[]) => {
      const arrayMode = String(args[2] || 'concat');
      return deepMerge(args[0], args[1], arrayMode);
    }
  });
}
