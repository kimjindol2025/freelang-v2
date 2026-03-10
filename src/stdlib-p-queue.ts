/**
 * FreeLang v2 - p-queue 네이티브 함수
 *
 * npm p-queue 패키지 완전 대체
 * 동시 실행 제한 큐 구현
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

interface PQueueTask {
  fn: (...args: any[]) => any;
  priority: number;
  id: string;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

interface PQueueInternal {
  concurrency: number;
  pending: number;
  paused: boolean;
  tasks: PQueueTask[];
  idleResolvers: Array<() => void>;
  emptyResolvers: Array<() => void>;
}

// 내부 큐 저장소
const queueStore = new Map<string, PQueueInternal>();
let queueIdCounter = 0;

function generateQueueId(): string {
  return `pq_${++queueIdCounter}_${Date.now()}`;
}

function runNext(queueId: string): void {
  const q = queueStore.get(queueId);
  if (!q || q.paused) return;

  while (q.pending < q.concurrency && q.tasks.length > 0) {
    // 우선순위 정렬 (높을수록 먼저)
    q.tasks.sort((a, b) => b.priority - a.priority);
    const task = q.tasks.shift()!;
    q.pending++;

    Promise.resolve()
      .then(() => task.fn())
      .then((result) => {
        task.resolve(result);
      })
      .catch((err) => {
        task.reject(err);
      })
      .finally(() => {
        q.pending--;
        if (q.tasks.length === 0) {
          q.emptyResolvers.forEach((r) => r());
          q.emptyResolvers = [];
        }
        if (q.pending === 0 && q.tasks.length === 0) {
          q.idleResolvers.forEach((r) => r());
          q.idleResolvers = [];
        }
        runNext(queueId);
      });
  }
}

export function registerPQueueFunctions(registry: NativeFunctionRegistry): void {
  // pqueue_create(concurrency) -> PQueue
  registry.register({
    name: 'pqueue_create',
    module: 'p-queue',
    executor: (args: any[]) => {
      const concurrency = Math.max(1, parseInt(String(args[0] || 1)));
      const id = generateQueueId();
      const internal: PQueueInternal = {
        concurrency,
        pending: 0,
        paused: false,
        tasks: [],
        idleResolvers: [],
        emptyResolvers: []
      };
      queueStore.set(id, internal);
      return { _id: id, concurrency, size: 0, pending: 0, paused: false, tasks: [] };
    }
  });

  // pqueue_add(queue, task, priority) -> Promise
  registry.register({
    name: 'pqueue_add',
    module: 'p-queue',
    executor: (args: any[]) => {
      const queue = args[0] as any;
      const taskFn = args[1];
      const priority = parseInt(String(args[2] || 0));
      const queueId = queue?._id;

      if (!queueId || !queueStore.has(queueId)) {
        throw new Error('Invalid PQueue instance');
      }

      const q = queueStore.get(queueId)!;

      return new Promise((resolve, reject) => {
        const taskId = `task_${Date.now()}_${Math.random()}`;
        q.tasks.push({ fn: taskFn, priority, id: taskId, resolve, reject });
        runNext(queueId);
      });
    }
  });

  // pqueue_size(queue) -> int
  registry.register({
    name: 'pqueue_size',
    module: 'p-queue',
    executor: (args: any[]) => {
      const queue = args[0] as any;
      const q = queueStore.get(queue?._id);
      return q ? q.tasks.length : 0;
    }
  });

  // pqueue_pending(queue) -> int
  registry.register({
    name: 'pqueue_pending',
    module: 'p-queue',
    executor: (args: any[]) => {
      const queue = args[0] as any;
      const q = queueStore.get(queue?._id);
      return q ? q.pending : 0;
    }
  });

  // pqueue_clear(queue) -> void
  registry.register({
    name: 'pqueue_clear',
    module: 'p-queue',
    executor: (args: any[]) => {
      const queue = args[0] as any;
      const q = queueStore.get(queue?._id);
      if (q) {
        q.tasks.forEach((t) => t.reject(new Error('Queue cleared')));
        q.tasks = [];
      }
      return null;
    }
  });

  // pqueue_pause(queue) -> void
  registry.register({
    name: 'pqueue_pause',
    module: 'p-queue',
    executor: (args: any[]) => {
      const queue = args[0] as any;
      const q = queueStore.get(queue?._id);
      if (q) q.paused = true;
      return null;
    }
  });

  // pqueue_resume(queue) -> void
  registry.register({
    name: 'pqueue_resume',
    module: 'p-queue',
    executor: (args: any[]) => {
      const queue = args[0] as any;
      const queueId = queue?._id;
      const q = queueStore.get(queueId);
      if (q) {
        q.paused = false;
        runNext(queueId);
      }
      return null;
    }
  });

  // pqueue_on_idle(queue) -> Promise<void>
  registry.register({
    name: 'pqueue_on_idle',
    module: 'p-queue',
    executor: (args: any[]) => {
      const queue = args[0] as any;
      const q = queueStore.get(queue?._id);
      if (!q) return Promise.resolve();
      if (q.pending === 0 && q.tasks.length === 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        q.idleResolvers.push(resolve);
      });
    }
  });

  // pqueue_on_empty(queue) -> Promise<void>
  registry.register({
    name: 'pqueue_on_empty',
    module: 'p-queue',
    executor: (args: any[]) => {
      const queue = args[0] as any;
      const q = queueStore.get(queue?._id);
      if (!q) return Promise.resolve();
      if (q.tasks.length === 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        q.emptyResolvers.push(resolve);
      });
    }
  });

  // pqueue_set_concurrency(queue, concurrency) -> void
  registry.register({
    name: 'pqueue_set_concurrency',
    module: 'p-queue',
    executor: (args: any[]) => {
      const queue = args[0] as any;
      const concurrency = Math.max(1, parseInt(String(args[1] || 1)));
      const q = queueStore.get(queue?._id);
      if (q) {
        q.concurrency = concurrency;
        runNext(queue._id);
      }
      return null;
    }
  });
}
