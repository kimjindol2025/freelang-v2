/**
 * FreeLang v2 - p-retry 네이티브 함수
 *
 * npm p-retry 패키지 완전 대체
 * exponential backoff 재시도 구현
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

class AbortError extends Error {
  public readonly originalError: Error | null;
  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = 'AbortError';
    this.originalError = originalError || null;
  }
}

function computeDelay(attempt: number, factor: number, minTimeout: number, maxTimeout: number, randomize: boolean): number {
  const random = randomize ? Math.random() + 1 : 1;
  const timeout = Math.min(random * minTimeout * Math.pow(factor, attempt), maxTimeout);
  return Math.round(timeout);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function registerPRetryFunctions(registry: NativeFunctionRegistry): void {
  // pretry_run(task, retries, factor, minTimeout, maxTimeout, randomize, onFailedAttempt) -> any
  registry.register({
    name: 'pretry_run',
    module: 'p-retry',
    executor: async (args: any[]) => {
      const task = args[0];
      const retries = Math.max(0, parseInt(String(args[1] || 10)));
      const factor = parseFloat(String(args[2] || 2));
      const minTimeout = parseInt(String(args[3] || 1000));
      const maxTimeout = parseInt(String(args[4] || 32000));
      const randomize = Boolean(args[5]);
      const onFailedAttempt = args[6];

      if (typeof task !== 'function') {
        throw new Error('pretry_run: task must be a function');
      }

      let lastError: any;

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const result = await Promise.resolve(task(attempt));
          return result;
        } catch (err: any) {
          lastError = err;

          // AbortError는 즉시 중단
          if (err && (err.isAbortError === true || err instanceof AbortError || err.name === 'AbortError')) {
            throw err.originalError || err;
          }

          if (attempt < retries) {
            // onFailedAttempt 콜백 호출
            if (typeof onFailedAttempt === 'function') {
              const attemptError = Object.assign(err, {
                attemptNumber: attempt + 1,
                retriesLeft: retries - attempt
              });
              try {
                await Promise.resolve(onFailedAttempt(attemptError));
              } catch (callbackErr) {
                throw callbackErr;
              }
            }

            const delay = computeDelay(attempt, factor, minTimeout, maxTimeout, randomize);
            await sleep(delay);
          }
        }
      }

      throw lastError;
    }
  });
}
