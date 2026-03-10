/**
 * FreeLang v2 stdlib — stdlib-mitt.ts
 * npm mitt 완전 대체 네이티브 함수 등록
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';
import { randomBytes } from 'crypto';

type Handler = (data: any) => void;

class MittStore {
  private all: Map<string, Set<Handler>> = new Map();

  on(event: string, handler: Handler): void {
    if (!this.all.has(event)) this.all.set(event, new Set());
    this.all.get(event)!.add(handler);
  }

  off(event: string, handler?: Handler): void {
    if (!handler) {
      this.all.delete(event);
    } else {
      this.all.get(event)?.delete(handler);
    }
  }

  emit(event: string, data: any): void {
    const handlers = this.all.get(event);
    if (handlers) handlers.forEach(h => h(data));
    if (event !== '*') {
      const wildcards = this.all.get('*');
      if (wildcards) wildcards.forEach(h => h(data));
    }
  }

  clear(): void {
    this.all.clear();
  }

  getAll(): Record<string, Handler[]> {
    const result: Record<string, Handler[]> = {};
    for (const [event, handlers] of this.all) {
      result[event] = [...handlers];
    }
    return result;
  }
}

const mitts = new Map<string, MittStore>();

export function registerMittFunctions(registry: NativeFunctionRegistry): void {
  registry.register({
    name: 'mitt_create',
    module: 'mitt',
    paramCount: 0,
    executor: () => {
      const id = randomBytes(6).toString('hex');
      mitts.set(id, new MittStore());
      return id;
    }
  });

  registry.register({
    name: 'mitt_on',
    module: 'mitt',
    paramCount: 3,
    executor: (args: any[]) => {
      mitts.get(String(args[0]))?.on(String(args[1]), args[2]);
      return null;
    }
  });

  registry.register({
    name: 'mitt_off',
    module: 'mitt',
    paramCount: 3,
    executor: (args: any[]) => {
      mitts.get(String(args[0]))?.off(String(args[1]), args[2]);
      return null;
    }
  });

  registry.register({
    name: 'mitt_emit',
    module: 'mitt',
    paramCount: 3,
    executor: (args: any[]) => {
      mitts.get(String(args[0]))?.emit(String(args[1]), args[2]);
      return null;
    }
  });

  registry.register({
    name: 'mitt_clear',
    module: 'mitt',
    paramCount: 1,
    executor: (args: any[]) => {
      mitts.get(String(args[0]))?.clear();
      return null;
    }
  });

  registry.register({
    name: 'mitt_all',
    module: 'mitt',
    paramCount: 1,
    executor: (args: any[]) => mitts.get(String(args[0]))?.getAll() ?? {}
  });
}
