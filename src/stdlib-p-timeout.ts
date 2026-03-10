/**
 * FreeLang v2 - p-timeout 네이티브 함수
 *
 * npm p-timeout 패키지 완전 대체
 * Promise 타임아웃 래퍼 구현
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

class TimeoutError extends Error {
  public readonly ms: number;
  constructor(message: string, ms: number) {
    super(message);
    this.name = 'TimeoutError';
    this.ms = ms;
  }
}

export function registerPTimeoutFunctions(registry: NativeFunctionRegistry): void {
  // ptimeout_run(promise, ms, fallback, message) -> any
  registry.register({
    name: 'ptimeout_run',
    module: 'p-timeout',
    executor: async (args: any[]) => {
      const promiseOrFn = args[0];
      const ms = parseInt(String(args[1] || 0));
      const fallback = args[2] ?? undefined;
      const customMessage = args[3] ? String(args[3]) : undefined;

      if (ms <= 0) {
        throw new Error('ptimeout_run: ms must be a positive number');
      }

      let promise: Promise<any>;
      if (typeof promiseOrFn === 'function') {
        promise = Promise.resolve().then(() => promiseOrFn());
      } else if (promiseOrFn && typeof promiseOrFn.then === 'function') {
        promise = promiseOrFn;
      } else {
        promise = Promise.resolve(promiseOrFn);
      }

      let timeoutHandle: ReturnType<typeof setTimeout>;

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          if (fallback !== undefined) {
            // fallback이 있으면 reject 대신 resolve
            return;
          }
          const message = customMessage || `Promise timed out after ${ms} milliseconds`;
          reject(new TimeoutError(message, ms));
        }, ms);
      });

      // fallback 처리
      if (fallback !== undefined) {
        const fallbackPromise = new Promise<any>((resolve) => {
          timeoutHandle = setTimeout(() => {
            if (typeof fallback === 'function') {
              Promise.resolve().then(() => fallback()).then(resolve).catch(resolve);
            } else {
              resolve(fallback);
            }
          }, ms);
        });

        try {
          const result = await Promise.race([promise, fallbackPromise]);
          clearTimeout(timeoutHandle!);
          return result;
        } catch (err) {
          clearTimeout(timeoutHandle!);
          throw err;
        }
      }

      try {
        const result = await Promise.race([promise, timeoutPromise]);
        clearTimeout(timeoutHandle!);
        return result;
      } catch (err) {
        clearTimeout(timeoutHandle!);
        throw err;
      }
    }
  });
}
