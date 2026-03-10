/**
 * FreeLang v2 stdlib — stdlib-eventemitter3.ts
 * npm eventemitter3 완전 대체 네이티브 함수 등록
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';
import { randomBytes } from 'crypto';

interface ListenerEntry {
  fn: Function;
  once: boolean;
}

class EventEmitterStore {
  private events: Map<string, ListenerEntry[]> = new Map();

  on(event: string, fn: Function, once = false): void {
    const listeners = this.events.get(event) ?? [];
    listeners.push({ fn, once });
    this.events.set(event, listeners);
  }

  off(event: string, fn: Function): void {
    const listeners = this.events.get(event);
    if (!listeners) return;
    this.events.set(event, listeners.filter(l => l.fn !== fn));
  }

  emit(event: string, args: any[]): boolean {
    const listeners = this.events.get(event);
    if (!listeners || listeners.length === 0) return false;
    const remaining: ListenerEntry[] = [];
    for (const entry of listeners) {
      entry.fn(...args);
      if (!entry.once) remaining.push(entry);
    }
    this.events.set(event, remaining);
    return true;
  }

  removeAll(event: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  count(event: string): number {
    return this.events.get(event)?.length ?? 0;
  }

  list(event: string): Function[] {
    return (this.events.get(event) ?? []).map(l => l.fn);
  }

  names(): string[] {
    return [...this.events.keys()];
  }
}

const emitters = new Map<string, EventEmitterStore>();

export function registerEventEmitter3Functions(registry: NativeFunctionRegistry): void {
  registry.register({
    name: 'ee3_create',
    module: 'eventemitter3',
    paramCount: 0,
    executor: () => {
      const id = randomBytes(8).toString('hex');
      emitters.set(id, new EventEmitterStore());
      return id;
    }
  });

  registry.register({
    name: 'ee3_on',
    module: 'eventemitter3',
    paramCount: 3,
    executor: (args: any[]) => {
      emitters.get(String(args[0]))?.on(String(args[1]), args[2]);
      return null;
    }
  });

  registry.register({
    name: 'ee3_off',
    module: 'eventemitter3',
    paramCount: 3,
    executor: (args: any[]) => {
      emitters.get(String(args[0]))?.off(String(args[1]), args[2]);
      return null;
    }
  });

  registry.register({
    name: 'ee3_emit',
    module: 'eventemitter3',
    paramCount: 3,
    executor: (args: any[]) => {
      const ee = emitters.get(String(args[0]));
      if (!ee) return false;
      return ee.emit(String(args[1]), Array.isArray(args[2]) ? args[2] : []);
    }
  });

  registry.register({
    name: 'ee3_once',
    module: 'eventemitter3',
    paramCount: 3,
    executor: (args: any[]) => {
      emitters.get(String(args[0]))?.on(String(args[1]), args[2], true);
      return null;
    }
  });

  registry.register({
    name: 'ee3_remove_all',
    module: 'eventemitter3',
    paramCount: 2,
    executor: (args: any[]) => {
      emitters.get(String(args[0]))?.removeAll(String(args[1] ?? ''));
      return null;
    }
  });

  registry.register({
    name: 'ee3_listener_count',
    module: 'eventemitter3',
    paramCount: 2,
    executor: (args: any[]) => emitters.get(String(args[0]))?.count(String(args[1])) ?? 0
  });

  registry.register({
    name: 'ee3_listeners',
    module: 'eventemitter3',
    paramCount: 2,
    executor: (args: any[]) => emitters.get(String(args[0]))?.list(String(args[1])) ?? []
  });

  registry.register({
    name: 'ee3_event_names',
    module: 'eventemitter3',
    paramCount: 1,
    executor: (args: any[]) => emitters.get(String(args[0]))?.names() ?? []
  });

  registry.register({
    name: 'ee3_destroy',
    module: 'eventemitter3',
    paramCount: 1,
    executor: (args: any[]) => { emitters.delete(String(args[0])); return null; }
  });
}
