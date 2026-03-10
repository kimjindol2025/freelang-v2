/**
 * FreeLang v2 - p-map 네이티브 함수
 *
 * npm p-map 패키지 완전 대체
 * 동시성 제한 비동기 map 구현
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

// 스킵 심볼
const pMapSkipSymbol = Symbol('pMapSkip');

export function registerPMapFunctions(registry: NativeFunctionRegistry): void {
  // pmap_run(array, mapFn, concurrency, stopOnError) -> array
  registry.register({
    name: 'pmap_run',
    module: 'p-map',
    executor: async (args: any[]) => {
      const arr = Array.isArray(args[0]) ? args[0] : [];
      const mapFn = args[1];
      const concurrency = Math.max(1, parseInt(String(args[2] || 10)));
      const stopOnError = args[3] !== false;

      if (typeof mapFn !== 'function') {
        throw new Error('pmap_run: mapFn must be a function');
      }

      const results: any[] = new Array(arr.length);
      const errors: any[] = [];
      let index = 0;
      let active = 0;

      await new Promise<void>((resolve, reject) => {
        function next(): void {
          if (index >= arr.length && active === 0) {
            resolve();
            return;
          }

          while (active < concurrency && index < arr.length) {
            const i = index++;
            active++;

            Promise.resolve()
              .then(() => mapFn(arr[i], i, arr))
              .then((result) => {
                // 스킵 처리
                if (result && result.isSkip === true) {
                  results[i] = pMapSkipSymbol;
                } else {
                  results[i] = result;
                }
                active--;
                next();
              })
              .catch((err) => {
                active--;
                if (stopOnError) {
                  reject(err);
                } else {
                  errors.push(err);
                  next();
                }
              });
          }
        }

        next();
      });

      // 스킵된 항목 제거
      return results.filter((r) => r !== pMapSkipSymbol);
    }
  });

  // pmap_series(array, mapFn) -> array
  registry.register({
    name: 'pmap_series',
    module: 'p-map',
    executor: async (args: any[]) => {
      const arr = Array.isArray(args[0]) ? args[0] : [];
      const mapFn = args[1];

      if (typeof mapFn !== 'function') {
        throw new Error('pmap_series: mapFn must be a function');
      }

      const results: any[] = [];
      for (let i = 0; i < arr.length; i++) {
        const result = await Promise.resolve(mapFn(arr[i], i, arr));
        if (!result || result.isSkip !== true) {
          results.push(result);
        }
      }
      return results;
    }
  });
}
