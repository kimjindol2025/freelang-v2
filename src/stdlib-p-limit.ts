/**
 * FreeLang v2 stdlib — stdlib-p-limit.ts
 * npm p-limit 완전 대체 네이티브 함수 등록
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';
import { randomBytes } from 'crypto';

class PLimitQueue {
  private concurrency: number;
  private activeCount_ = 0;
  private queue: Array<() => void> = [];

  constructor(concurrency: number) {
    this.concurrency = Math.max(1, concurrency);
  }

  get active(): number { return this.activeCount_; }
  get pending(): number { return this.queue.length; }

  setConcurrency(n: number): void {
    this.concurrency = Math.max(1, n);
    this.drain();
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const execute = async () => {
        this.activeCount_++;
        try {
          resolve(await fn());
        } catch (e) {
          reject(e);
        } finally {
          this.activeCount_--;
          this.drain();
        }
      };

      if (this.activeCount_ < this.concurrency) {
        execute();
      } else {
        this.queue.push(execute);
      }
    });
  }

  private drain(): void {
    while (this.activeCount_ < this.concurrency && this.queue.length > 0) {
      const next = this.queue.shift()!;
      next();
    }
  }

  clearQueue(): void {
    this.queue.length = 0;
  }
}

const limiters = new Map<string, PLimitQueue>();

async function runConcurrent<T>(fns: Array<() => Promise<T>>, concurrency: number): Promise<T[]> {
  const queue = new PLimitQueue(concurrency);
  return Promise.all(fns.map(fn => queue.run(fn)));
}

export function registerPLimitFunctions(registry: NativeFunctionRegistry): void {
  registry.register({
    name: 'plimit_create',
    module: 'p-limit',
    paramCount: 1,
    executor: (args: any[]) => {
      const id = randomBytes(8).toString('hex');
      limiters.set(id, new PLimitQueue(Number(args[0]) || 1));
      return id;
    }
  });

  registry.register({
    name: 'plimit_run',
    module: 'p-limit',
    paramCount: 3,
    executor: async (args: any[]) => {
      const limiter = limiters.get(String(args[0]));
      if (!limiter) throw new Error('p-limit: limiter not found');
      const fn = args[1] as Function;
      const fnArgs = Array.isArray(args[2]) ? args[2] : [];
      return limiter.run(() => Promise.resolve(fn(...fnArgs)));
    }
  });

  registry.register({
    name: 'plimit_all',
    module: 'p-limit',
    paramCount: 2,
    executor: async (args: any[]) => {
      const fns = args[0] as Function[];
      const concurrency = Number(args[1]) || 1;
      return runConcurrent(fns.map(fn => () => Promise.resolve(fn())), concurrency);
    }
  });

  registry.register({
    name: 'plimit_map',
    module: 'p-limit',
    paramCount: 3,
    executor: async (args: any[]) => {
      const items = args[0] as any[];
      const fn = args[1] as Function;
      const concurrency = Number(args[2]) || 1;
      return runConcurrent(items.map(item => () => Promise.resolve(fn(item))), concurrency);
    }
  });

  registry.register({
    name: 'plimit_filter',
    module: 'p-limit',
    paramCount: 3,
    executor: async (args: any[]) => {
      const items = args[0] as any[];
      const fn = args[1] as Function;
      const concurrency = Number(args[2]) || 1;
      const results = await runConcurrent(
        items.map((item, i) => async () => ({ item, keep: await fn(item), i })),
        concurrency
      );
      return results.sort((a, b) => a.i - b.i).filter(r => r.keep).map(r => r.item);
    }
  });

  registry.register({
    name: 'plimit_each',
    module: 'p-limit',
    paramCount: 3,
    executor: async (args: any[]) => {
      const items = args[0] as any[];
      const fn = args[1] as Function;
      const concurrency = Number(args[2]) || 1;
      await runConcurrent(items.map(item => () => Promise.resolve(fn(item))), concurrency);
      return null;
    }
  });

  registry.register({
    name: 'plimit_active_count',
    module: 'p-limit',
    paramCount: 1,
    executor: (args: any[]) => limiters.get(String(args[0]))?.active ?? 0
  });

  registry.register({
    name: 'plimit_pending_count',
    module: 'p-limit',
    paramCount: 1,
    executor: (args: any[]) => limiters.get(String(args[0]))?.pending ?? 0
  });

  registry.register({
    name: 'plimit_clear_queue',
    module: 'p-limit',
    paramCount: 1,
    executor: (args: any[]) => { limiters.get(String(args[0]))?.clearQueue(); return null; }
  });

  registry.register({
    name: 'plimit_set_concurrency',
    module: 'p-limit',
    paramCount: 2,
    executor: (args: any[]) => {
      limiters.get(String(args[0]))?.setConcurrency(Number(args[1]));
      return null;
    }
  });
}
