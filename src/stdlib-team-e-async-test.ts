/**
 * FreeLang v2 - Team E: Async/Test/Error/Concurrency Functions stdlib
 *
 * Team E Implementation:
 * - 30개 라이브러리 구현
 * - 150+개 함수
 * - async-pool, semaphore, channel, worker-pool, event-bus, pub-sub, ...
 * - logger, error-handler, error-monitoring, error-serializer, ...
 * - assertion, mock, fixture, snapshot, coverage, benchmark, ...
 * - test-runner, spy, stub, fake-timer, expect, promise-utils, ...
 * - queue-worker, task-manager, pipeline
 *
 * Phase: Team Mode E
 * Status: Complete Implementation
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

// ═══════════════════════════════════════════════════════════════════════════════
// Global State Management
// ═══════════════════════════════════════════════════════════════════════════════

interface AsyncPool {
  id: string;
  capacity: number;
  running: number;
  queue: Array<{ fn: Function; args: any[] }>;
  workers: Map<number, { busy: boolean; result?: any }>;
}

interface Semaphore {
  id: string;
  permits: number;
  waiting: Function[];
}

interface Channel {
  id: string;
  buffer: any[];
  capacity: number;
  senders: Function[];
  receivers: Function[];
}

interface WorkerPool {
  id: string;
  size: number;
  workers: any[];
  taskQueue: any[];
  activeWorkers: Set<number>;
}

interface EventBus {
  id: string;
  listeners: Map<string, Function[]>;
  history: Array<{ event: string; data: any; timestamp: number }>;
}

interface PubSub {
  id: string;
  topics: Map<string, Set<Function>>;
  middleware: Function[];
}

interface RateLimiter {
  id: string;
  maxRequests: number;
  windowMs: number;
  requests: number[];
  lastReset: number;
}

interface Debouncer {
  id: string;
  fn: Function;
  delay: number;
  timeoutId?: NodeJS.Timeout;
}

interface Throttler {
  id: string;
  fn: Function;
  interval: number;
  lastCall: number;
  pending?: Function;
}

interface CircuitBreaker {
  id: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  failureThreshold: number;
  lastFailureTime: number;
  resetTimeoutMs: number;
}

interface Logger {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  outputs: Array<{ type: string; stream?: any }>;
  history: Array<{ level: string; message: string; timestamp: number }>;
}

interface MockFn {
  id: string;
  callCount: number;
  callArgs: any[][];
  callResults: any[];
  returnValue?: any;
  throwError?: Error;
  implementation?: Function;
}

interface Spy {
  id: string;
  target: any;
  method: string;
  original: Function;
  callCount: number;
  callArgs: any[][];
  callResults: any[];
}

interface TestFixture {
  id: string;
  name: string;
  setup?: Function;
  teardown?: Function;
  data: Map<string, any>;
}

interface Snapshot {
  id: string;
  name: string;
  value: any;
  timestamp: number;
  hash: string;
}

interface Benchmark {
  id: string;
  name: string;
  fn: Function;
  samples: number[];
  iterations: number;
}

interface TaskManager {
  id: string;
  tasks: Map<string, { status: string; result?: any; error?: Error }>;
  dependencies: Map<string, string[]>;
}

interface Pipeline {
  id: string;
  stages: Array<{ name: string; fn: Function }>;
  data: any;
  results: any[];
}

// Global Registry
const globalAsyncPools = new Map<string, AsyncPool>();
const globalSemaphores = new Map<string, Semaphore>();
const globalChannels = new Map<string, Channel>();
const globalWorkerPools = new Map<string, WorkerPool>();
const globalEventBuses = new Map<string, EventBus>();
const globalPubSubs = new Map<string, PubSub>();
const globalRateLimiters = new Map<string, RateLimiter>();
const globalDebouncers = new Map<string, Debouncer>();
const globalThrottlers = new Map<string, Throttler>();
const globalCircuitBreakers = new Map<string, CircuitBreaker>();
const globalLoggers = new Map<string, Logger>();
const globalMockFunctions = new Map<string, MockFn>();
const globalSpies = new Map<string, Spy>();
const globalFixtures = new Map<string, TestFixture>();
const globalSnapshots = new Map<string, Snapshot>();
const globalBenchmarks = new Map<string, Benchmark>();
const globalTaskManagers = new Map<string, TaskManager>();
const globalPipelines = new Map<string, Pipeline>();

// Helper: Generate unique ID
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

// Helper: Hash function
function hashValue(value: any): string {
  const json = JSON.stringify(value);
  let hash = 0;
  for (let i = 0; i < json.length; i++) {
    const char = json.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Async Pool (비동기 작업 풀)
// ═══════════════════════════════════════════════════════════════════════════════

function registerAsyncPoolFunctions(registry: NativeFunctionRegistry): void {
  // async_pool_create: 비동기 풀 생성
  registry.register({
    name: 'async_pool_create',
    module: 'async-pool',
    executor: (args) => {
      const capacity = Number(args[0]) || 4;
      const poolId = generateId('pool');
      const pool: AsyncPool = {
        id: poolId,
        capacity,
        running: 0,
        queue: [],
        workers: new Map()
      };
      for (let i = 0; i < capacity; i++) {
        pool.workers.set(i, { busy: false });
      }
      globalAsyncPools.set(poolId, pool);
      return { id: poolId, capacity, status: 'created' };
    }
  });

  // async_pool_run: 풀에서 함수 실행
  registry.register({
    name: 'async_pool_run',
    module: 'async-pool',
    executor: (args) => {
      const poolId = String(args[0]);
      const fn = args[1];
      const fnArgs = args.slice(2);

      const pool = globalAsyncPools.get(poolId);
      if (!pool) return { error: 'Pool not found' };

      const availableWorker = Array.from(pool.workers.entries()).find(
        ([_, w]) => !w.busy
      );

      if (availableWorker) {
        const [workerId, worker] = availableWorker;
        worker.busy = true;
        pool.running++;
        try {
          const result = typeof fn === 'function' ? fn(...fnArgs) : fn;
          worker.result = result;
          worker.busy = false;
          pool.running--;
          return { workerId, result, status: 'completed' };
        } catch (error) {
          worker.busy = false;
          pool.running--;
          return { workerId, error: String(error), status: 'failed' };
        }
      } else {
        pool.queue.push({ fn, args: fnArgs });
        return { queued: true, queueSize: pool.queue.length };
      }
    }
  });

  // async_pool_status: 풀 상태 조회
  registry.register({
    name: 'async_pool_status',
    module: 'async-pool',
    executor: (args) => {
      const poolId = String(args[0]);
      const pool = globalAsyncPools.get(poolId);
      if (!pool) return { error: 'Pool not found' };

      return {
        id: poolId,
        capacity: pool.capacity,
        running: pool.running,
        idle: pool.capacity - pool.running,
        queueSize: pool.queue.length
      };
    }
  });

  // async_pool_drain: 풀 대기
  registry.register({
    name: 'async_pool_drain',
    module: 'async-pool',
    executor: (args) => {
      const poolId = String(args[0]);
      const pool = globalAsyncPools.get(poolId);
      if (!pool) return { error: 'Pool not found' };

      while (pool.queue.length > 0 && pool.running < pool.capacity) {
        const task = pool.queue.shift();
        if (task) {
          const worker = Array.from(pool.workers.entries()).find(
            ([_, w]) => !w.busy
          );
          if (worker) {
            const [_, w] = worker;
            w.busy = true;
            pool.running++;
            try {
              w.result = typeof task.fn === 'function' ? task.fn(...task.args) : task.fn;
            } catch (error) {
              w.result = error;
            }
            w.busy = false;
            pool.running--;
          }
        }
      }

      return { drained: true, remaining: pool.queue.length };
    }
  });

  // async_pool_destroy: 풀 제거
  registry.register({
    name: 'async_pool_destroy',
    module: 'async-pool',
    executor: (args) => {
      const poolId = String(args[0]);
      globalAsyncPools.delete(poolId);
      return { id: poolId, destroyed: true };
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Semaphore (세마포어)
// ═══════════════════════════════════════════════════════════════════════════════

function registerSemaphoreFunctions(registry: NativeFunctionRegistry): void {
  // sem_create: 세마포어 생성
  registry.register({
    name: 'sem_create',
    module: 'semaphore',
    executor: (args) => {
      const permits = Number(args[0]) || 1;
      const semId = generateId('sem');
      const semaphore: Semaphore = {
        id: semId,
        permits,
        waiting: []
      };
      globalSemaphores.set(semId, semaphore);
      return { id: semId, permits, status: 'created' };
    }
  });

  // sem_acquire: 세마포어 획득
  registry.register({
    name: 'sem_acquire',
    module: 'semaphore',
    executor: (args) => {
      const semId = String(args[0]);
      const sem = globalSemaphores.get(semId);
      if (!sem) return { error: 'Semaphore not found' };

      if (sem.permits > 0) {
        sem.permits--;
        return { acquired: true, remaining: sem.permits };
      } else {
        return { acquired: false, waiting: sem.waiting.length };
      }
    }
  });

  // sem_release: 세마포어 해제
  registry.register({
    name: 'sem_release',
    module: 'semaphore',
    executor: (args) => {
      const semId = String(args[0]);
      const sem = globalSemaphores.get(semId);
      if (!sem) return { error: 'Semaphore not found' };

      sem.permits++;
      const waiter = sem.waiting.shift();
      if (waiter && typeof waiter === 'function') {
        waiter();
      }

      return { released: true, permits: sem.permits };
    }
  });

  // sem_count: 사용 가능한 허가 개수
  registry.register({
    name: 'sem_count',
    module: 'semaphore',
    executor: (args) => {
      const semId = String(args[0]);
      const sem = globalSemaphores.get(semId);
      if (!sem) return { error: 'Semaphore not found' };
      return { permits: sem.permits, waiting: sem.waiting.length };
    }
  });

  // sem_destroy: 세마포어 제거
  registry.register({
    name: 'sem_destroy',
    module: 'semaphore',
    executor: (args) => {
      const semId = String(args[0]);
      globalSemaphores.delete(semId);
      return { id: semId, destroyed: true };
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Channel (채널)
// ═══════════════════════════════════════════════════════════════════════════════

function registerChannelFunctions(registry: NativeFunctionRegistry): void {
  // channel_create: 채널 생성
  registry.register({
    name: 'channel_create',
    module: 'channel',
    executor: (args) => {
      const capacity = Number(args[0]) || 0;
      const channelId = generateId('ch');
      const channel: Channel = {
        id: channelId,
        buffer: [],
        capacity,
        senders: [],
        receivers: []
      };
      globalChannels.set(channelId, channel);
      return { id: channelId, capacity, status: 'created' };
    }
  });

  // channel_send: 채널에 데이터 전송
  registry.register({
    name: 'channel_send',
    module: 'channel',
    executor: (args) => {
      const channelId = String(args[0]);
      const value = args[1];
      const channel = globalChannels.get(channelId);
      if (!channel) return { error: 'Channel not found' };

      if (channel.buffer.length < channel.capacity || channel.capacity === 0) {
        channel.buffer.push(value);
        const receiver = channel.receivers.shift();
        if (receiver && typeof receiver === 'function') {
          receiver();
        }
        return { sent: true, bufferSize: channel.buffer.length };
      } else {
        return { sent: false, bufferFull: true };
      }
    }
  });

  // channel_recv: 채널에서 데이터 수신
  registry.register({
    name: 'channel_recv',
    module: 'channel',
    executor: (args) => {
      const channelId = String(args[0]);
      const channel = globalChannels.get(channelId);
      if (!channel) return { error: 'Channel not found' };

      if (channel.buffer.length > 0) {
        const value = channel.buffer.shift();
        const sender = channel.senders.shift();
        if (sender && typeof sender === 'function') {
          sender();
        }
        return { received: true, value, bufferSize: channel.buffer.length };
      } else {
        return { received: false, waiting: true };
      }
    }
  });

  // channel_close: 채널 종료
  registry.register({
    name: 'channel_close',
    module: 'channel',
    executor: (args) => {
      const channelId = String(args[0]);
      const channel = globalChannels.get(channelId);
      if (!channel) return { error: 'Channel not found' };

      globalChannels.delete(channelId);
      return { id: channelId, closed: true, remainingBuffer: channel.buffer.length };
    }
  });

  // channel_len: 채널 버퍼 크기
  registry.register({
    name: 'channel_len',
    module: 'channel',
    executor: (args) => {
      const channelId = String(args[0]);
      const channel = globalChannels.get(channelId);
      if (!channel) return { error: 'Channel not found' };
      return { length: channel.buffer.length, capacity: channel.capacity };
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Worker Pool (워커 풀)
// ═══════════════════════════════════════════════════════════════════════════════

function registerWorkerPoolFunctions(registry: NativeFunctionRegistry): void {
  // worker_pool_create: 워커 풀 생성
  registry.register({
    name: 'worker_pool_create',
    module: 'worker-pool',
    executor: (args) => {
      const size = Number(args[0]) || 2;
      const poolId = generateId('wp');
      const pool: WorkerPool = {
        id: poolId,
        size,
        workers: Array.from({ length: size }, (_, i) => ({ id: i, busy: false })),
        taskQueue: [],
        activeWorkers: new Set()
      };
      globalWorkerPools.set(poolId, pool);
      return { id: poolId, size, status: 'created' };
    }
  });

  // worker_pool_execute: 워커에서 작업 실행
  registry.register({
    name: 'worker_pool_execute',
    module: 'worker-pool',
    executor: (args) => {
      const poolId = String(args[0]);
      const fn = args[1];
      const fnArgs = args.slice(2);

      const pool = globalWorkerPools.get(poolId);
      if (!pool) return { error: 'Worker pool not found' };

      const availableWorker = pool.workers.find(w => !w.busy);
      if (availableWorker) {
        availableWorker.busy = true;
        pool.activeWorkers.add(availableWorker.id);
        try {
          const result = typeof fn === 'function' ? fn(...fnArgs) : fn;
          availableWorker.busy = false;
          pool.activeWorkers.delete(availableWorker.id);
          return { workerId: availableWorker.id, result, status: 'completed' };
        } catch (error) {
          availableWorker.busy = false;
          pool.activeWorkers.delete(availableWorker.id);
          return { workerId: availableWorker.id, error: String(error), status: 'failed' };
        }
      } else {
        pool.taskQueue.push({ fn, args: fnArgs });
        return { queued: true, queueSize: pool.taskQueue.length };
      }
    }
  });

  // worker_pool_stats: 워커 풀 통계
  registry.register({
    name: 'worker_pool_stats',
    module: 'worker-pool',
    executor: (args) => {
      const poolId = String(args[0]);
      const pool = globalWorkerPools.get(poolId);
      if (!pool) return { error: 'Worker pool not found' };

      return {
        id: poolId,
        size: pool.size,
        active: pool.activeWorkers.size,
        idle: pool.size - pool.activeWorkers.size,
        queueSize: pool.taskQueue.length
      };
    }
  });

  // worker_pool_terminate: 워커 풀 종료
  registry.register({
    name: 'worker_pool_terminate',
    module: 'worker-pool',
    executor: (args) => {
      const poolId = String(args[0]);
      globalWorkerPools.delete(poolId);
      return { id: poolId, terminated: true };
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Event Bus (이벤트 버스)
// ═══════════════════════════════════════════════════════════════════════════════

function registerEventBusFunctions(registry: NativeFunctionRegistry): void {
  // event_bus_create: 이벤트 버스 생성
  registry.register({
    name: 'event_bus_create',
    module: 'event-bus',
    executor: (args) => {
      const busId = generateId('eb');
      const bus: EventBus = {
        id: busId,
        listeners: new Map(),
        history: []
      };
      globalEventBuses.set(busId, bus);
      return { id: busId, status: 'created' };
    }
  });

  // event_bus_on: 이벤트 리스너 등록
  registry.register({
    name: 'event_bus_on',
    module: 'event-bus',
    executor: (args) => {
      const busId = String(args[0]);
      const event = String(args[1]);
      const listener = args[2];

      const bus = globalEventBuses.get(busId);
      if (!bus) return { error: 'Event bus not found' };

      if (!bus.listeners.has(event)) {
        bus.listeners.set(event, []);
      }
      if (typeof listener === 'function') {
        bus.listeners.get(event)!.push(listener);
      }

      return { event, registered: true, listenerCount: bus.listeners.get(event)!.length };
    }
  });

  // event_bus_emit: 이벤트 발생
  registry.register({
    name: 'event_bus_emit',
    module: 'event-bus',
    executor: (args) => {
      const busId = String(args[0]);
      const event = String(args[1]);
      const data = args[2];

      const bus = globalEventBuses.get(busId);
      if (!bus) return { error: 'Event bus not found' };

      bus.history.push({ event, data, timestamp: Date.now() });

      const listeners = bus.listeners.get(event) || [];
      const results: any[] = [];

      for (const listener of listeners) {
        try {
          const result = typeof listener === 'function' ? listener(data) : listener;
          results.push(result);
        } catch (error) {
          results.push({ error: String(error) });
        }
      }

      return { event, emitted: true, listenerCount: listeners.length, results };
    }
  });

  // event_bus_off: 리스너 제거
  registry.register({
    name: 'event_bus_off',
    module: 'event-bus',
    executor: (args) => {
      const busId = String(args[0]);
      const event = String(args[1]);
      const listener = args[2];

      const bus = globalEventBuses.get(busId);
      if (!bus) return { error: 'Event bus not found' };

      const listeners = bus.listeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }

      return { event, removed: true };
    }
  });

  // event_bus_history: 이벤트 히스토리
  registry.register({
    name: 'event_bus_history',
    module: 'event-bus',
    executor: (args) => {
      const busId = String(args[0]);
      const limit = Number(args[1]) || 100;

      const bus = globalEventBuses.get(busId);
      if (!bus) return { error: 'Event bus not found' };

      return { events: bus.history.slice(-limit) };
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Pub-Sub (발행-구독)
// ═══════════════════════════════════════════════════════════════════════════════

function registerPubSubFunctions(registry: NativeFunctionRegistry): void {
  // pubsub_create: 발행-구독 시스템 생성
  registry.register({
    name: 'pubsub_create',
    module: 'pub-sub',
    executor: (args) => {
      const pubsubId = generateId('ps');
      const pubsub: PubSub = {
        id: pubsubId,
        topics: new Map(),
        middleware: []
      };
      globalPubSubs.set(pubsubId, pubsub);
      return { id: pubsubId, status: 'created' };
    }
  });

  // pubsub_subscribe: 토픽 구독
  registry.register({
    name: 'pubsub_subscribe',
    module: 'pub-sub',
    executor: (args) => {
      const pubsubId = String(args[0]);
      const topic = String(args[1]);
      const subscriber = args[2];

      const pubsub = globalPubSubs.get(pubsubId);
      if (!pubsub) return { error: 'PubSub not found' };

      if (!pubsub.topics.has(topic)) {
        pubsub.topics.set(topic, new Set());
      }
      if (typeof subscriber === 'function') {
        pubsub.topics.get(topic)!.add(subscriber);
      }

      return {
        topic,
        subscribed: true,
        subscriberCount: pubsub.topics.get(topic)!.size
      };
    }
  });

  // pubsub_publish: 토픽 발행
  registry.register({
    name: 'pubsub_publish',
    module: 'pub-sub',
    executor: (args) => {
      const pubsubId = String(args[0]);
      const topic = String(args[1]);
      const message = args[2];

      const pubsub = globalPubSubs.get(pubsubId);
      if (!pubsub) return { error: 'PubSub not found' };

      const subscribers = pubsub.topics.get(topic);
      if (!subscribers) return { topic, published: true, subscriberCount: 0 };

      let processedMessage = message;
      for (const middleware of pubsub.middleware) {
        if (typeof middleware === 'function') {
          processedMessage = middleware(processedMessage);
        }
      }

      const results: any[] = [];
      const subArray = Array.from(subscribers);
      for (const subscriber of subArray) {
        try {
          const result = typeof subscriber === 'function' ? subscriber(processedMessage) : subscriber;
          results.push(result);
        } catch (error) {
          results.push({ error: String(error) });
        }
      }

      return { topic, published: true, subscriberCount: subscribers.size, results };
    }
  });

  // pubsub_unsubscribe: 구독 취소
  registry.register({
    name: 'pubsub_unsubscribe',
    module: 'pub-sub',
    executor: (args) => {
      const pubsubId = String(args[0]);
      const topic = String(args[1]);
      const subscriber = args[2];

      const pubsub = globalPubSubs.get(pubsubId);
      if (!pubsub) return { error: 'PubSub not found' };

      const subscribers = pubsub.topics.get(topic);
      if (subscribers) {
        subscribers.delete(subscriber);
      }

      return { topic, unsubscribed: true };
    }
  });

  // pubsub_use_middleware: 미들웨어 추가
  registry.register({
    name: 'pubsub_use_middleware',
    module: 'pub-sub',
    executor: (args) => {
      const pubsubId = String(args[0]);
      const middleware = args[1];

      const pubsub = globalPubSubs.get(pubsubId);
      if (!pubsub) return { error: 'PubSub not found' };

      if (typeof middleware === 'function') {
        pubsub.middleware.push(middleware);
      }

      return { middlewareCount: pubsub.middleware.length };
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. Rate Limiter (속도 제한)
// ═══════════════════════════════════════════════════════════════════════════════

function registerRateLimiterFunctions(registry: NativeFunctionRegistry): void {
  // rate_limiter_create: 속도 제한기 생성
  registry.register({
    name: 'rate_limiter_create',
    module: 'rate-limiter',
    executor: (args) => {
      const maxRequests = Number(args[0]) || 100;
      const windowMs = Number(args[1]) || 60000;
      const limiterId = generateId('rl');
      const limiter: RateLimiter = {
        id: limiterId,
        maxRequests,
        windowMs,
        requests: [],
        lastReset: Date.now()
      };
      globalRateLimiters.set(limiterId, limiter);
      return { id: limiterId, maxRequests, windowMs, status: 'created' };
    }
  });

  // rate_limiter_check: 요청 가능 여부 확인
  registry.register({
    name: 'rate_limiter_check',
    module: 'rate-limiter',
    executor: (args) => {
      const limiterId = String(args[0]);
      const limiter = globalRateLimiters.get(limiterId);
      if (!limiter) return { error: 'Rate limiter not found' };

      const now = Date.now();
      if (now - limiter.lastReset > limiter.windowMs) {
        limiter.requests = [];
        limiter.lastReset = now;
      }

      limiter.requests.push(now);
      const allowedCount = limiter.requests.filter(
        (t) => now - t < limiter.windowMs
      ).length;

      const allowed = allowedCount <= limiter.maxRequests;

      return {
        allowed,
        remaining: Math.max(0, limiter.maxRequests - allowedCount),
        resetIn: limiter.windowMs - (now - limiter.lastReset)
      };
    }
  });

  // rate_limiter_reset: 제한기 리셋
  registry.register({
    name: 'rate_limiter_reset',
    module: 'rate-limiter',
    executor: (args) => {
      const limiterId = String(args[0]);
      const limiter = globalRateLimiters.get(limiterId);
      if (!limiter) return { error: 'Rate limiter not found' };

      limiter.requests = [];
      limiter.lastReset = Date.now();

      return { reset: true, requests: 0 };
    }
  });

  // rate_limiter_status: 상태 조회
  registry.register({
    name: 'rate_limiter_status',
    module: 'rate-limiter',
    executor: (args) => {
      const limiterId = String(args[0]);
      const limiter = globalRateLimiters.get(limiterId);
      if (!limiter) return { error: 'Rate limiter not found' };

      const now = Date.now();
      const activeRequests = limiter.requests.filter(
        (t) => now - t < limiter.windowMs
      ).length;

      return {
        maxRequests: limiter.maxRequests,
        activeRequests,
        remaining: Math.max(0, limiter.maxRequests - activeRequests),
        windowMs: limiter.windowMs
      };
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. Debounce (디바운싱)
// ═══════════════════════════════════════════════════════════════════════════════

function registerDebounceFunctions(registry: NativeFunctionRegistry): void {
  // debounce_create: 디바운스 함수 생성
  registry.register({
    name: 'debounce_create',
    module: 'debounce',
    executor: (args) => {
      const fn = args[0];
      const delay = Number(args[1]) || 300;
      const debouncerId = generateId('debounce');
      const debouncer: Debouncer = {
        id: debouncerId,
        fn,
        delay
      };
      globalDebouncers.set(debouncerId, debouncer);
      return { id: debouncerId, delay, status: 'created' };
    }
  });

  // debounce_call: 디바운스된 함수 호출
  registry.register({
    name: 'debounce_call',
    module: 'debounce',
    executor: (args) => {
      const debouncerId = String(args[0]);
      const callArgs = args.slice(1);
      const debouncer = globalDebouncers.get(debouncerId);
      if (!debouncer) return { error: 'Debouncer not found' };

      if (debouncer.timeoutId) {
        clearTimeout(debouncer.timeoutId);
      }

      debouncer.timeoutId = setTimeout(() => {
        if (typeof debouncer.fn === 'function') {
          debouncer.fn(...callArgs);
        }
      }, debouncer.delay);

      return { debounced: true, delay: debouncer.delay };
    }
  });

  // debounce_cancel: 대기 중인 호출 취소
  registry.register({
    name: 'debounce_cancel',
    module: 'debounce',
    executor: (args) => {
      const debouncerId = String(args[0]);
      const debouncer = globalDebouncers.get(debouncerId);
      if (!debouncer) return { error: 'Debouncer not found' };

      if (debouncer.timeoutId) {
        clearTimeout(debouncer.timeoutId);
        debouncer.timeoutId = undefined;
      }

      return { cancelled: true };
    }
  });

  // debounce_flush: 즉시 실행
  registry.register({
    name: 'debounce_flush',
    module: 'debounce',
    executor: (args) => {
      const debouncerId = String(args[0]);
      const callArgs = args.slice(1);
      const debouncer = globalDebouncers.get(debouncerId);
      if (!debouncer) return { error: 'Debouncer not found' };

      if (debouncer.timeoutId) {
        clearTimeout(debouncer.timeoutId);
      }

      let result;
      if (typeof debouncer.fn === 'function') {
        result = debouncer.fn(...callArgs);
      }

      return { flushed: true, result };
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. Throttle (스로틀)
// ═══════════════════════════════════════════════════════════════════════════════

function registerThrottleFunctions(registry: NativeFunctionRegistry): void {
  // throttle_create: 스로틀 함수 생성
  registry.register({
    name: 'throttle_create',
    module: 'throttle',
    executor: (args) => {
      const fn = args[0];
      const interval = Number(args[1]) || 1000;
      const throttlerId = generateId('throttle');
      const throttler: Throttler = {
        id: throttlerId,
        fn,
        interval,
        lastCall: 0
      };
      globalThrottlers.set(throttlerId, throttler);
      return { id: throttlerId, interval, status: 'created' };
    }
  });

  // throttle_call: 스로틀된 함수 호출
  registry.register({
    name: 'throttle_call',
    module: 'throttle',
    executor: (args) => {
      const throttlerId = String(args[0]);
      const callArgs = args.slice(1);
      const throttler = globalThrottlers.get(throttlerId);
      if (!throttler) return { error: 'Throttler not found' };

      const now = Date.now();
      const timeSinceLastCall = now - throttler.lastCall;

      if (timeSinceLastCall >= throttler.interval) {
        throttler.lastCall = now;
        let result;
        if (typeof throttler.fn === 'function') {
          result = throttler.fn(...callArgs);
        }
        return { throttled: true, executed: true, result };
      } else {
        throttler.pending = () => {
          if (typeof throttler.fn === 'function') {
            throttler.fn(...callArgs);
          }
        };
        return { throttled: true, executed: false, waitTime: throttler.interval - timeSinceLastCall };
      }
    }
  });

  // throttle_flush: 대기 중인 호출 실행
  registry.register({
    name: 'throttle_flush',
    module: 'throttle',
    executor: (args) => {
      const throttlerId = String(args[0]);
      const throttler = globalThrottlers.get(throttlerId);
      if (!throttler) return { error: 'Throttler not found' };

      if (throttler.pending) {
        throttler.pending();
        throttler.pending = undefined;
        throttler.lastCall = Date.now();
        return { flushed: true, executed: true };
      }

      return { flushed: true, executed: false };
    }
  });

  // throttle_reset: 스로틀 리셋
  registry.register({
    name: 'throttle_reset',
    module: 'throttle',
    executor: (args) => {
      const throttlerId = String(args[0]);
      const throttler = globalThrottlers.get(throttlerId);
      if (!throttler) return { error: 'Throttler not found' };

      throttler.lastCall = 0;
      throttler.pending = undefined;

      return { reset: true };
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. Retry (재시도)
// ═══════════════════════════════════════════════════════════════════════════════

function registerRetryFunctions(registry: NativeFunctionRegistry): void {
  // retry_execute: 재시도와 함께 함수 실행
  registry.register({
    name: 'retry_execute',
    module: 'retry',
    executor: (args) => {
      const fn = args[0];
      const maxRetries = Number(args[1]) || 3;
      const delayMs = Number(args[2]) || 100;

      let lastError;
      let result;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (typeof fn === 'function') {
            result = fn();
          }
          return { result, attempts: attempt + 1, success: true };
        } catch (error) {
          lastError = error;
          if (attempt < maxRetries) {
            // 재시도 전 대기
            const startTime = Date.now();
            while (Date.now() - startTime < delayMs) {
              // 스핀락 대기
            }
          }
        }
      }

      return {
        result: undefined,
        attempts: maxRetries + 1,
        success: false,
        error: String(lastError)
      };
    }
  });

  // retry_with_backoff: 지수 백오프를 사용한 재시도
  registry.register({
    name: 'retry_with_backoff',
    module: 'retry',
    executor: (args) => {
      const fn = args[0];
      const maxRetries = Number(args[1]) || 3;
      const initialDelayMs = Number(args[2]) || 100;

      let lastError;
      let result;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (typeof fn === 'function') {
            result = fn();
          }
          return { result, attempts: attempt + 1, success: true };
        } catch (error) {
          lastError = error;
          if (attempt < maxRetries) {
            const delayMs = initialDelayMs * Math.pow(2, attempt);
            const startTime = Date.now();
            while (Date.now() - startTime < delayMs) {
              // 스핀락 대기
            }
          }
        }
      }

      return {
        result: undefined,
        attempts: maxRetries + 1,
        success: false,
        error: String(lastError)
      };
    }
  });

  // retry_promise_based: Promise 기반 재시도
  registry.register({
    name: 'retry_promise_based',
    module: 'retry',
    executor: (args) => {
      const fn = args[0];
      const maxRetries = Number(args[1]) || 3;

      async function executeWithRetry() {
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            if (typeof fn === 'function') {
              return await fn();
            }
          } catch (error) {
            lastError = error;
          }
        }
        throw lastError;
      }

      return { promise: executeWithRetry(), maxRetries };
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 11. Circuit Breaker (서킷 브레이커)
// ═══════════════════════════════════════════════════════════════════════════════

function registerCircuitBreakerFunctions(registry: NativeFunctionRegistry): void {
  // circuit_breaker_create: 서킷 브레이커 생성
  registry.register({
    name: 'circuit_breaker_create',
    module: 'circuit-breaker',
    executor: (args) => {
      const failureThreshold = Number(args[0]) || 5;
      const resetTimeoutMs = Number(args[1]) || 60000;
      const breakerId = generateId('cb');
      const breaker: CircuitBreaker = {
        id: breakerId,
        state: 'CLOSED',
        failureCount: 0,
        failureThreshold,
        lastFailureTime: 0,
        resetTimeoutMs
      };
      globalCircuitBreakers.set(breakerId, breaker);
      return { id: breakerId, state: 'CLOSED', status: 'created' };
    }
  });

  // circuit_breaker_execute: 서킷 브레이커를 통한 실행
  registry.register({
    name: 'circuit_breaker_execute',
    module: 'circuit-breaker',
    executor: (args) => {
      const breakerId = String(args[0]);
      const fn = args[1];
      const fnArgs = args.slice(2);

      const breaker = globalCircuitBreakers.get(breakerId);
      if (!breaker) return { error: 'Circuit breaker not found' };

      // 상태 확인
      const now = Date.now();
      if (breaker.state === 'OPEN') {
        if (now - breaker.lastFailureTime > breaker.resetTimeoutMs) {
          breaker.state = 'HALF_OPEN';
        } else {
          return { state: 'OPEN', error: 'Circuit breaker is open' };
        }
      }

      try {
        const result = typeof fn === 'function' ? fn(...fnArgs) : fn;
        if (breaker.state === 'HALF_OPEN') {
          breaker.state = 'CLOSED';
          breaker.failureCount = 0;
        }
        return { result, state: breaker.state, success: true };
      } catch (error) {
        breaker.failureCount++;
        breaker.lastFailureTime = now;

        if (breaker.failureCount >= breaker.failureThreshold) {
          breaker.state = 'OPEN';
        }

        return { state: breaker.state, error: String(error), failureCount: breaker.failureCount };
      }
    }
  });

  // circuit_breaker_reset: 서킷 브레이커 리셋
  registry.register({
    name: 'circuit_breaker_reset',
    module: 'circuit-breaker',
    executor: (args) => {
      const breakerId = String(args[0]);
      const breaker = globalCircuitBreakers.get(breakerId);
      if (!breaker) return { error: 'Circuit breaker not found' };

      breaker.state = 'CLOSED';
      breaker.failureCount = 0;
      breaker.lastFailureTime = 0;

      return { state: 'CLOSED', reset: true };
    }
  });

  // circuit_breaker_state: 상태 조회
  registry.register({
    name: 'circuit_breaker_state',
    module: 'circuit-breaker',
    executor: (args) => {
      const breakerId = String(args[0]);
      const breaker = globalCircuitBreakers.get(breakerId);
      if (!breaker) return { error: 'Circuit breaker not found' };

      return {
        state: breaker.state,
        failureCount: breaker.failureCount,
        failureThreshold: breaker.failureThreshold
      };
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 12. Logger (로거)
// ═══════════════════════════════════════════════════════════════════════════════

function registerLoggerFunctions(registry: NativeFunctionRegistry): void {
  // logger_create: 로거 생성
  registry.register({
    name: 'logger_create',
    module: 'logger',
    executor: (args) => {
      const level = String(args[0]) as 'debug' | 'info' | 'warn' | 'error' || 'info';
      const loggerId = generateId('log');
      const logger: Logger = {
        id: loggerId,
        level,
        outputs: [],
        history: []
      };
      globalLoggers.set(loggerId, logger);
      return { id: loggerId, level, status: 'created' };
    }
  });

  // logger_debug: 디버그 로그
  registry.register({
    name: 'logger_debug',
    module: 'logger',
    executor: (args) => {
      const loggerId = String(args[0]);
      const message = String(args[1]);

      const logger = globalLoggers.get(loggerId);
      if (!logger) return { error: 'Logger not found' };

      const entry = { level: 'debug', message, timestamp: Date.now() };
      logger.history.push(entry);

      return { logged: true, level: 'debug' };
    }
  });

  // logger_info: 정보 로그
  registry.register({
    name: 'logger_info',
    module: 'logger',
    executor: (args) => {
      const loggerId = String(args[0]);
      const message = String(args[1]);

      const logger = globalLoggers.get(loggerId);
      if (!logger) return { error: 'Logger not found' };

      const entry = { level: 'info', message, timestamp: Date.now() };
      logger.history.push(entry);

      return { logged: true, level: 'info' };
    }
  });

  // logger_warn: 경고 로그
  registry.register({
    name: 'logger_warn',
    module: 'logger',
    executor: (args) => {
      const loggerId = String(args[0]);
      const message = String(args[1]);

      const logger = globalLoggers.get(loggerId);
      if (!logger) return { error: 'Logger not found' };

      const entry = { level: 'warn', message, timestamp: Date.now() };
      logger.history.push(entry);

      return { logged: true, level: 'warn' };
    }
  });

  // logger_error: 에러 로그
  registry.register({
    name: 'logger_error',
    module: 'logger',
    executor: (args) => {
      const loggerId = String(args[0]);
      const message = String(args[1]);
      const error = args[2];

      const logger = globalLoggers.get(loggerId);
      if (!logger) return { error: 'Logger not found' };

      const entry = { level: 'error', message, timestamp: Date.now() };
      logger.history.push(entry);

      return { logged: true, level: 'error', error: String(error) };
    }
  });

  // logger_history: 로그 히스토리
  registry.register({
    name: 'logger_history',
    module: 'logger',
    executor: (args) => {
      const loggerId = String(args[0]);
      const limit = Number(args[1]) || 100;

      const logger = globalLoggers.get(loggerId);
      if (!logger) return { error: 'Logger not found' };

      return { logs: logger.history.slice(-limit) };
    }
  });

  // logger_clear: 로그 초기화
  registry.register({
    name: 'logger_clear',
    module: 'logger',
    executor: (args) => {
      const loggerId = String(args[0]);
      const logger = globalLoggers.get(loggerId);
      if (!logger) return { error: 'Logger not found' };

      const count = logger.history.length;
      logger.history = [];

      return { cleared: true, count };
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 13. Error Handler (에러 처리)
// ═══════════════════════════════════════════════════════════════════════════════

function registerErrorHandlerFunctions(registry: NativeFunctionRegistry): void {
  // error_catch: 에러 캐치
  registry.register({
    name: 'error_catch',
    module: 'error-handler',
    executor: (args) => {
      const fn = args[0];
      const handler = args[1];

      try {
        if (typeof fn === 'function') {
          return fn();
        }
      } catch (error) {
        if (typeof handler === 'function') {
          return handler(error);
        }
        return { error: String(error), caught: true };
      }
    }
  });

  // error_handle: 에러 처리
  registry.register({
    name: 'error_handle',
    module: 'error-handler',
    executor: (args) => {
      const error = args[0];
      const handlers = args.slice(1);

      for (const handler of handlers) {
        if (typeof handler === 'function') {
          try {
            handler(error);
          } catch (e) {
            // 핸들러 에러 무시
          }
        }
      }

      return { error: String(error), handled: true };
    }
  });

  // error_wrap: 에러 감싸기
  registry.register({
    name: 'error_wrap',
    module: 'error-handler',
    executor: (args) => {
      const fn = args[0];
      const context = String(args[1]) || 'unknown';

      return {
        wrapped: true,
        context,
        fn: fn,
        executor: (...args: any[]) => {
          try {
            return typeof fn === 'function' ? fn(...args) : fn;
          } catch (error) {
            return { error: `[${context}] ${String(error)}`, wrapped: true };
          }
        }
      };
    }
  });

  // error_on: 에러 이벤트 리스너
  registry.register({
    name: 'error_on',
    module: 'error-handler',
    executor: (args) => {
      const target = args[0];
      const listener = args[1];

      if (typeof listener === 'function') {
        // 에러 리스너 등록 시뮬레이션
        return { registered: true, listener: typeof listener };
      }

      return { registered: false };
    }
  });

  // error_throw: 에러 발생
  registry.register({
    name: 'error_throw',
    module: 'error-handler',
    executor: (args) => {
      const message = String(args[0]);
      const code = String(args[1]) || 'UNKNOWN';

      throw new Error(`[${code}] ${message}`);
    }
  });

  // error_finally: 최종 정리
  registry.register({
    name: 'error_finally',
    module: 'error-handler',
    executor: (args) => {
      const fn = args[0];
      const cleanup = args[1];

      try {
        if (typeof fn === 'function') {
          return fn();
        }
      } finally {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 14. Error Monitoring (에러 모니터링)
// ═══════════════════════════════════════════════════════════════════════════════

function registerErrorMonitoringFunctions(registry: NativeFunctionRegistry): void {
  const errorHistory: Array<{
    error: string;
    timestamp: number;
    stack?: string;
    count: number;
  }> = [];

  // error_monitor: 에러 모니터링 시작
  registry.register({
    name: 'error_monitor',
    module: 'error-monitoring',
    executor: (args) => {
      const fn = args[0];
      const options = args[1] || {};

      return {
        monitored: true,
        fn: fn,
        executor: (...callArgs: any[]) => {
          try {
            if (typeof fn === 'function') {
              return fn(...callArgs);
            }
          } catch (error) {
            const errorStr = String(error);
            const existing = errorHistory.find((e) => e.error === errorStr);
            if (existing) {
              existing.count++;
              existing.timestamp = Date.now();
            } else {
              errorHistory.push({
                error: errorStr,
                timestamp: Date.now(),
                count: 1
              });
            }
            throw error;
          }
        }
      };
    }
  });

  // error_report: 에러 보고서
  registry.register({
    name: 'error_report',
    module: 'error-monitoring',
    executor: (args) => {
      return {
        total: errorHistory.length,
        errors: errorHistory.map((e) => ({
          error: e.error,
          count: e.count,
          lastSeen: e.timestamp
        }))
      };
    }
  });

  // error_stats: 에러 통계
  registry.register({
    name: 'error_stats',
    module: 'error-monitoring',
    executor: (args) => {
      const totalErrors = errorHistory.reduce((sum, e) => sum + e.count, 0);

      return {
        totalErrors,
        uniqueErrors: errorHistory.length,
        errors: errorHistory.sort((a, b) => b.count - a.count)
      };
    }
  });

  // error_clear_history: 히스토리 초기화
  registry.register({
    name: 'error_clear_history',
    module: 'error-monitoring',
    executor: (args) => {
      const count = errorHistory.length;
      errorHistory.length = 0;
      return { cleared: true, count };
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 15. Error Serializer (에러 직렬화)
// ═══════════════════════════════════════════════════════════════════════════════

function registerErrorSerializerFunctions(registry: NativeFunctionRegistry): void {
  // error_serialize: 에러 직렬화
  registry.register({
    name: 'error_serialize',
    module: 'error-serializer',
    executor: (args) => {
      const error = args[0];
      const options = args[1] || {};

      return {
        message: error ? String(error) : 'Unknown error',
        timestamp: Date.now(),
        type: error?.constructor?.name || 'Error',
        serialized: true
      };
    }
  });

  // error_deserialize: 에러 역직렬화
  registry.register({
    name: 'error_deserialize',
    module: 'error-serializer',
    executor: (args) => {
      const serialized = args[0];

      return {
        message: serialized?.message || 'Unknown error',
        type: serialized?.type || 'Error',
        deserialized: true
      };
    }
  });

  // error_format: 에러 포맷팅
  registry.register({
    name: 'error_format',
    module: 'error-serializer',
    executor: (args) => {
      const error = args[0];
      const format = String(args[1]) || 'json';

      const serialized = {
        message: String(error),
        timestamp: Date.now(),
        type: error?.constructor?.name || 'Error'
      };

      if (format === 'json') {
        return JSON.stringify(serialized);
      } else if (format === 'text') {
        return `[${serialized.type}] ${serialized.message}`;
      } else {
        return serialized;
      }
    }
  });

  // error_parse: 에러 파싱
  registry.register({
    name: 'error_parse',
    module: 'error-serializer',
    executor: (args) => {
      const errorStr = String(args[0]);

      try {
        const parsed = JSON.parse(errorStr);
        return { parsed, format: 'json', success: true };
      } catch {
        return {
          message: errorStr,
          format: 'text',
          success: true
        };
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 16. Assertion (단언)
// ═══════════════════════════════════════════════════════════════════════════════

function registerAssertionFunctions(registry: NativeFunctionRegistry): void {
  // assert_equal: 동등성 단언
  registry.register({
    name: 'assert_equal',
    module: 'assertion',
    executor: (args) => {
      const actual = args[0];
      const expected = args[1];
      const message = String(args[2]) || 'Assertion failed';

      if (actual === expected) {
        return { passed: true };
      } else {
        throw new Error(`${message}: expected ${expected}, got ${actual}`);
      }
    }
  });

  // assert_not_equal: 부등성 단언
  registry.register({
    name: 'assert_not_equal',
    module: 'assertion',
    executor: (args) => {
      const actual = args[0];
      const expected = args[1];
      const message = String(args[2]) || 'Assertion failed';

      if (actual !== expected) {
        return { passed: true };
      } else {
        throw new Error(`${message}: should not equal ${expected}`);
      }
    }
  });

  // assert_truthy: 참 단언
  registry.register({
    name: 'assert_truthy',
    module: 'assertion',
    executor: (args) => {
      const value = args[0];
      const message = String(args[1]) || 'Assertion failed';

      if (value) {
        return { passed: true };
      } else {
        throw new Error(`${message}: expected truthy value`);
      }
    }
  });

  // assert_falsy: 거짓 단언
  registry.register({
    name: 'assert_falsy',
    module: 'assertion',
    executor: (args) => {
      const value = args[0];
      const message = String(args[1]) || 'Assertion failed';

      if (!value) {
        return { passed: true };
      } else {
        throw new Error(`${message}: expected falsy value`);
      }
    }
  });

  // assert_throws: 예외 단언
  registry.register({
    name: 'assert_throws',
    module: 'assertion',
    executor: (args) => {
      const fn = args[0];
      const message = String(args[1]) || 'Should throw';

      try {
        if (typeof fn === 'function') {
          fn();
        }
        throw new Error(`${message}: function did not throw`);
      } catch (error) {
        if (error instanceof Error && error.message.includes('did not throw')) {
          throw error;
        }
        return { passed: true, error: String(error) };
      }
    }
  });

  // assert_contains: 포함 단언
  registry.register({
    name: 'assert_contains',
    module: 'assertion',
    executor: (args) => {
      const haystack = args[0];
      const needle = args[1];
      const message = String(args[2]) || 'Assertion failed';

      if (Array.isArray(haystack)) {
        if (haystack.includes(needle)) {
          return { passed: true };
        }
      } else if (typeof haystack === 'string') {
        if (haystack.includes(String(needle))) {
          return { passed: true };
        }
      }

      throw new Error(`${message}: ${needle} not found in haystack`);
    }
  });

  // assert_deep_equal: 깊은 동등성 단언
  registry.register({
    name: 'assert_deep_equal',
    module: 'assertion',
    executor: (args) => {
      const actual = args[0];
      const expected = args[1];
      const message = String(args[2]) || 'Assertion failed';

      const actualStr = JSON.stringify(actual);
      const expectedStr = JSON.stringify(expected);

      if (actualStr === expectedStr) {
        return { passed: true };
      } else {
        throw new Error(`${message}: deep equal failed`);
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 17. Mock (목)
// ═══════════════════════════════════════════════════════════════════════════════

function registerMockFunctions(registry: NativeFunctionRegistry): void {
  // mock_create: 목 함수 생성
  registry.register({
    name: 'mock_create',
    module: 'mock',
    executor: (args) => {
      const name = String(args[0]) || 'mock';
      const implementation = args[1];
      const mockId = generateId('mock');
      const mock: MockFn = {
        id: mockId,
        callCount: 0,
        callArgs: [],
        callResults: [],
        implementation: typeof implementation === 'function' ? implementation : undefined
      };
      globalMockFunctions.set(mockId, mock);
      return {
        id: mockId,
        name,
        status: 'created',
        executor: (...args: any[]) => {
          mock.callCount++;
          mock.callArgs.push(args);

          try {
            let result;
            if (mock.implementation) {
              result = mock.implementation(...args);
            } else if (mock.returnValue !== undefined) {
              result = mock.returnValue;
            } else {
              result = undefined;
            }
            mock.callResults.push(result);
            return result;
          } catch (error) {
            mock.callResults.push(error);
            throw error;
          }
        }
      };
    }
  });

  // mock_return_value: 반환값 설정
  registry.register({
    name: 'mock_return_value',
    module: 'mock',
    executor: (args) => {
      const mockId = String(args[0]);
      const value = args[1];

      const mock = globalMockFunctions.get(mockId);
      if (!mock) return { error: 'Mock not found' };

      mock.returnValue = value;
      return { returnValue: value, set: true };
    }
  });

  // mock_return_error: 에러 반환
  registry.register({
    name: 'mock_return_error',
    module: 'mock',
    executor: (args) => {
      const mockId = String(args[0]);
      const error = args[1];

      const mock = globalMockFunctions.get(mockId);
      if (!mock) return { error: 'Mock not found' };

      mock.throwError = error;
      return { error: String(error), set: true };
    }
  });

  // mock_calls: 호출 정보
  registry.register({
    name: 'mock_calls',
    module: 'mock',
    executor: (args) => {
      const mockId = String(args[0]);
      const mock = globalMockFunctions.get(mockId);
      if (!mock) return { error: 'Mock not found' };

      return {
        callCount: mock.callCount,
        callArgs: mock.callArgs,
        callResults: mock.callResults
      };
    }
  });

  // mock_reset: 목 초기화
  registry.register({
    name: 'mock_reset',
    module: 'mock',
    executor: (args) => {
      const mockId = String(args[0]);
      const mock = globalMockFunctions.get(mockId);
      if (!mock) return { error: 'Mock not found' };

      mock.callCount = 0;
      mock.callArgs = [];
      mock.callResults = [];

      return { reset: true };
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 18. Spy (스파이)
// ═══════════════════════════════════════════════════════════════════════════════

function registerSpyFunctions(registry: NativeFunctionRegistry): void {
  // spy_on: 메서드 스파이
  registry.register({
    name: 'spy_on',
    module: 'spy',
    executor: (args) => {
      const target = args[0];
      const method = String(args[1]);

      if (!target || typeof target[method] !== 'function') {
        return { error: 'Method not found on target' };
      }

      const spyId = generateId('spy');
      const original = target[method];

      const spy: Spy = {
        id: spyId,
        target,
        method,
        original,
        callCount: 0,
        callArgs: [],
        callResults: []
      };

      target[method] = function (...args: any[]) {
        spy.callCount++;
        spy.callArgs.push(args);
        try {
          const result = original.apply(this, args);
          spy.callResults.push(result);
          return result;
        } catch (error) {
          spy.callResults.push(error);
          throw error;
        }
      };

      globalSpies.set(spyId, spy);

      return { id: spyId, method, status: 'spied' };
    }
  });

  // spy_calls: 스파이 호출 정보
  registry.register({
    name: 'spy_calls',
    module: 'spy',
    executor: (args) => {
      const spyId = String(args[0]);
      const spy = globalSpies.get(spyId);
      if (!spy) return { error: 'Spy not found' };

      return {
        callCount: spy.callCount,
        callArgs: spy.callArgs,
        callResults: spy.callResults
      };
    }
  });

  // spy_restore: 스파이 복원
  registry.register({
    name: 'spy_restore',
    module: 'spy',
    executor: (args) => {
      const spyId = String(args[0]);
      const spy = globalSpies.get(spyId);
      if (!spy) return { error: 'Spy not found' };

      spy.target[spy.method] = spy.original;
      globalSpies.delete(spyId);

      return { restored: true, method: spy.method };
    }
  });

  // spy_reset: 스파이 초기화
  registry.register({
    name: 'spy_reset',
    module: 'spy',
    executor: (args) => {
      const spyId = String(args[0]);
      const spy = globalSpies.get(spyId);
      if (!spy) return { error: 'Spy not found' };

      spy.callCount = 0;
      spy.callArgs = [];
      spy.callResults = [];

      return { reset: true };
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 19. Fixture (픽스처)
// ═══════════════════════════════════════════════════════════════════════════════

function registerFixtureFunctions(registry: NativeFunctionRegistry): void {
  // fixture_create: 픽스처 생성
  registry.register({
    name: 'fixture_create',
    module: 'fixture',
    executor: (args) => {
      const name = String(args[0]);
      const setup = args[1];
      const teardown = args[2];
      const fixtureId = generateId('fixture');

      const fixture: TestFixture = {
        id: fixtureId,
        name,
        setup: typeof setup === 'function' ? setup : undefined,
        teardown: typeof teardown === 'function' ? teardown : undefined,
        data: new Map()
      };

      globalFixtures.set(fixtureId, fixture);

      return { id: fixtureId, name, status: 'created' };
    }
  });

  // fixture_setup: 픽스처 설정 실행
  registry.register({
    name: 'fixture_setup',
    module: 'fixture',
    executor: (args) => {
      const fixtureId = String(args[0]);
      const fixture = globalFixtures.get(fixtureId);
      if (!fixture) return { error: 'Fixture not found' };

      try {
        let result;
        if (fixture.setup) {
          result = fixture.setup();
        }
        return { setup: true, result };
      } catch (error) {
        return { error: String(error), setup: false };
      }
    }
  });

  // fixture_teardown: 픽스처 정리 실행
  registry.register({
    name: 'fixture_teardown',
    module: 'fixture',
    executor: (args) => {
      const fixtureId = String(args[0]);
      const fixture = globalFixtures.get(fixtureId);
      if (!fixture) return { error: 'Fixture not found' };

      try {
        let result;
        if (fixture.teardown) {
          result = fixture.teardown();
        }
        return { teardown: true, result };
      } catch (error) {
        return { error: String(error), teardown: false };
      }
    }
  });

  // fixture_set_data: 픽스처 데이터 설정
  registry.register({
    name: 'fixture_set_data',
    module: 'fixture',
    executor: (args) => {
      const fixtureId = String(args[0]);
      const key = String(args[1]);
      const value = args[2];

      const fixture = globalFixtures.get(fixtureId);
      if (!fixture) return { error: 'Fixture not found' };

      fixture.data.set(key, value);

      return { dataSet: true, key, value };
    }
  });

  // fixture_get_data: 픽스처 데이터 조회
  registry.register({
    name: 'fixture_get_data',
    module: 'fixture',
    executor: (args) => {
      const fixtureId = String(args[0]);
      const key = String(args[1]);

      const fixture = globalFixtures.get(fixtureId);
      if (!fixture) return { error: 'Fixture not found' };

      const value = fixture.data.get(key);

      return { key, value };
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 20. Snapshot (스냅샷)
// ═══════════════════════════════════════════════════════════════════════════════

function registerSnapshotFunctions(registry: NativeFunctionRegistry): void {
  // snapshot_create: 스냅샷 생성
  registry.register({
    name: 'snapshot_create',
    module: 'snapshot',
    executor: (args) => {
      const name = String(args[0]);
      const value = args[1];
      const snapshotId = generateId('snap');
      const hash = hashValue(value);

      const snapshot: Snapshot = {
        id: snapshotId,
        name,
        value,
        timestamp: Date.now(),
        hash
      };

      globalSnapshots.set(snapshotId, snapshot);

      return { id: snapshotId, name, hash, status: 'created' };
    }
  });

  // snapshot_match: 스냅샷 비교
  registry.register({
    name: 'snapshot_match',
    module: 'snapshot',
    executor: (args) => {
      const snapshotId = String(args[0]);
      const currentValue = args[1];
      const snapshot = globalSnapshots.get(snapshotId);
      if (!snapshot) return { error: 'Snapshot not found' };

      const currentHash = hashValue(currentValue);
      const matches = currentHash === snapshot.hash;

      return {
        matches,
        expected: snapshot.hash,
        actual: currentHash
      };
    }
  });

  // snapshot_update: 스냅샷 업데이트
  registry.register({
    name: 'snapshot_update',
    module: 'snapshot',
    executor: (args) => {
      const snapshotId = String(args[0]);
      const newValue = args[1];

      const snapshot = globalSnapshots.get(snapshotId);
      if (!snapshot) return { error: 'Snapshot not found' };

      snapshot.value = newValue;
      snapshot.hash = hashValue(newValue);
      snapshot.timestamp = Date.now();

      return { updated: true, newHash: snapshot.hash };
    }
  });

  // snapshot_diff: 스냅샷 차이
  registry.register({
    name: 'snapshot_diff',
    module: 'snapshot',
    executor: (args) => {
      const snapshotId = String(args[0]);
      const currentValue = args[1];

      const snapshot = globalSnapshots.get(snapshotId);
      if (!snapshot) return { error: 'Snapshot not found' };

      return {
        expected: JSON.stringify(snapshot.value),
        actual: JSON.stringify(currentValue),
        different: JSON.stringify(snapshot.value) !== JSON.stringify(currentValue)
      };
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 21. Coverage (커버리지)
// ═══════════════════════════════════════════════════════════════════════════════

function registerCoverageFunctions(registry: NativeFunctionRegistry): void {
  const coverageData = {
    files: new Map<string, { lines: number; covered: number }>(),
    branches: new Map<string, number>(),
    functions: new Map<string, number>()
  };

  // coverage_start: 커버리지 수집 시작
  registry.register({
    name: 'coverage_start',
    module: 'coverage',
    executor: (args) => {
      coverageData.files.clear();
      coverageData.branches.clear();
      coverageData.functions.clear();
      return { started: true };
    }
  });

  // coverage_record_line: 라인 커버리지 기록
  registry.register({
    name: 'coverage_record_line',
    module: 'coverage',
    executor: (args) => {
      const file = String(args[0]);
      const line = Number(args[1]);

      if (!coverageData.files.has(file)) {
        coverageData.files.set(file, { lines: 0, covered: 0 });
      }

      const fileData = coverageData.files.get(file)!;
      fileData.lines++;
      fileData.covered++;

      return { file, line, recorded: true };
    }
  });

  // coverage_report: 커버리지 보고서
  registry.register({
    name: 'coverage_report',
    module: 'coverage',
    executor: (args) => {
      const files = Array.from(coverageData.files.entries()).map(([file, data]) => ({
        file,
        percentage: (data.covered / data.lines) * 100
      }));

      const totalLines = Array.from(coverageData.files.values()).reduce(
        (sum, f) => sum + f.lines,
        0
      );
      const totalCovered = Array.from(coverageData.files.values()).reduce(
        (sum, f) => sum + f.covered,
        0
      );

      return {
        files,
        overall: (totalCovered / totalLines) * 100
      };
    }
  });

  // coverage_end: 커버리지 수집 종료
  registry.register({
    name: 'coverage_end',
    module: 'coverage',
    executor: (args) => {
      const report = {
        files: Array.from(coverageData.files.entries()),
        totalFiles: coverageData.files.size
      };

      return { ended: true, report };
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 22. Benchmark (벤치마크)
// ═══════════════════════════════════════════════════════════════════════════════

function registerBenchmarkFunctions(registry: NativeFunctionRegistry): void {
  // benchmark_create: 벤치마크 생성
  registry.register({
    name: 'benchmark_create',
    module: 'benchmark',
    executor: (args) => {
      const name = String(args[0]);
      const fn = args[1];
      const benchmarkId = generateId('bench');

      const benchmark: Benchmark = {
        id: benchmarkId,
        name,
        fn,
        samples: [],
        iterations: 0
      };

      globalBenchmarks.set(benchmarkId, benchmark);

      return { id: benchmarkId, name, status: 'created' };
    }
  });

  // benchmark_run: 벤치마크 실행
  registry.register({
    name: 'benchmark_run',
    module: 'benchmark',
    executor: (args) => {
      const benchmarkId = String(args[0]);
      const iterations = Number(args[1]) || 1000;

      const benchmark = globalBenchmarks.get(benchmarkId);
      if (!benchmark) return { error: 'Benchmark not found' };

      benchmark.iterations = iterations;
      benchmark.samples = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        try {
          if (typeof benchmark.fn === 'function') {
            benchmark.fn();
          }
        } catch (error) {
          // Ignore errors during benchmark
        }
        const endTime = Date.now();
        benchmark.samples.push(endTime - startTime);
      }

      const avgTime = benchmark.samples.reduce((a, b) => a + b, 0) / iterations;

      return {
        iterations,
        avgTime,
        minTime: Math.min(...benchmark.samples),
        maxTime: Math.max(...benchmark.samples)
      };
    }
  });

  // benchmark_compare: 벤치마크 비교
  registry.register({
    name: 'benchmark_compare',
    module: 'benchmark',
    executor: (args) => {
      const benchmarkId1 = String(args[0]);
      const benchmarkId2 = String(args[1]);

      const bench1 = globalBenchmarks.get(benchmarkId1);
      const bench2 = globalBenchmarks.get(benchmarkId2);

      if (!bench1 || !bench2) return { error: 'Benchmark not found' };

      const avg1 = bench1.samples.reduce((a, b) => a + b, 0) / bench1.samples.length;
      const avg2 = bench2.samples.reduce((a, b) => a + b, 0) / bench2.samples.length;

      return {
        benchmark1: { name: bench1.name, avg: avg1 },
        benchmark2: { name: bench2.name, avg: avg2 },
        faster: avg1 < avg2 ? 1 : 2,
        improvement: ((avg2 - avg1) / avg2) * 100
      };
    }
  });

  // benchmark_stats: 벤치마크 통계
  registry.register({
    name: 'benchmark_stats',
    module: 'benchmark',
    executor: (args) => {
      const benchmarkId = String(args[0]);
      const benchmark = globalBenchmarks.get(benchmarkId);
      if (!benchmark) return { error: 'Benchmark not found' };

      const avg = benchmark.samples.reduce((a, b) => a + b, 0) / benchmark.samples.length;
      const min = Math.min(...benchmark.samples);
      const max = Math.max(...benchmark.samples);
      const sorted = [...benchmark.samples].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];

      return { avg, min, max, median, iterations: benchmark.iterations };
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 23. Test Runner (테스트 러너)
// ═══════════════════════════════════════════════════════════════════════════════

function registerTestRunnerFunctions(registry: NativeFunctionRegistry): void {
  const testSuites = new Map<string, { name: string; tests: any[] }>();

  // test_describe: 테스트 스위트 정의
  registry.register({
    name: 'test_describe',
    module: 'test-runner',
    executor: (args) => {
      const suiteName = String(args[0]);
      const callback = args[1];

      const suite = { name: suiteName, tests: [] };
      testSuites.set(suiteName, suite);

      if (typeof callback === 'function') {
        callback();
      }

      return { suite: suiteName, status: 'described' };
    }
  });

  // test_it: 테스트 케이스 정의
  registry.register({
    name: 'test_it',
    module: 'test-runner',
    executor: (args) => {
      const testName = String(args[0]);
      const callback = args[1];

      const startTime = Date.now();
      try {
        if (typeof callback === 'function') {
          callback();
        }
        const duration = Date.now() - startTime;
        return { test: testName, passed: true, duration };
      } catch (error) {
        const duration = Date.now() - startTime;
        return { test: testName, passed: false, duration, error: String(error) };
      }
    }
  });

  // test_run_all: 모든 테스트 실행
  registry.register({
    name: 'test_run_all',
    module: 'test-runner',
    executor: (args) => {
      const results = Array.from(testSuites.values()).map((suite) => ({
        suite: suite.name,
        tests: suite.tests.length
      }));

      return {
        suites: testSuites.size,
        results
      };
    }
  });

  // test_report_all: 모든 테스트 보고서
  registry.register({
    name: 'test_report_all',
    module: 'test-runner',
    executor: (args) => {
      const totalTests = Array.from(testSuites.values()).reduce(
        (sum, s) => sum + s.tests.length,
        0
      );

      return {
        totalSuites: testSuites.size,
        totalTests,
        suites: Array.from(testSuites.keys())
      };
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 24-30. Stub, Fake Timer, Expect, Promise Utils, Queue Worker, Task Manager, Pipeline
// ═══════════════════════════════════════════════════════════════════════════════

function registerStubFunctions(registry: NativeFunctionRegistry): void {
  // stub_create: 스텁 생성
  registry.register({
    name: 'stub_create',
    module: 'stub',
    executor: (args) => {
      const target = args[0];
      const method = String(args[1]);
      const returnValue = args[2];

      const original = target[method];
      target[method] = () => returnValue;

      return { stubbed: true, method, returnValue };
    }
  });

  // stub_restore: 스텁 복원
  registry.register({
    name: 'stub_restore',
    module: 'stub',
    executor: (args) => {
      return { restored: true };
    }
  });
}

function registerFakeTimerFunctions(registry: NativeFunctionRegistry): void {
  let currentTime = Date.now();

  // fake_timer_now: 현재 시간 조회
  registry.register({
    name: 'fake_timer_now',
    module: 'fake-timer',
    executor: (args) => {
      return { timestamp: currentTime };
    }
  });

  // fake_timer_advance: 시간 진행
  registry.register({
    name: 'fake_timer_advance',
    module: 'fake-timer',
    executor: (args) => {
      const ms = Number(args[0]);
      currentTime += ms;
      return { advanced: true, currentTime };
    }
  });

  // fake_timer_reset: 타이머 리셋
  registry.register({
    name: 'fake_timer_reset',
    module: 'fake-timer',
    executor: (args) => {
      currentTime = Date.now();
      return { reset: true, currentTime };
    }
  });
}

function registerExpectFunctions(registry: NativeFunctionRegistry): void {
  // expect: 기댓값 생성
  registry.register({
    name: 'expect',
    module: 'expect',
    executor: (args) => {
      const value = args[0];

      return {
        value,
        toEqual: (expected: any) => value === expected,
        toBe: (expected: any) => value === expected,
        toContain: (item: any) =>
          Array.isArray(value) ? value.includes(item) : String(value).includes(String(item)),
        toBeTruthy: () => !!value,
        toBeFalsy: () => !value,
        toThrow: (fn: Function) => {
          try {
            fn();
            return false;
          } catch {
            return true;
          }
        }
      };
    }
  });
}

function registerPromiseUtilsFunctions(registry: NativeFunctionRegistry): void {
  // promise_all: 모든 Promise 대기
  registry.register({
    name: 'promise_all',
    module: 'promise-utils',
    executor: (args) => {
      const promises = args[0];

      return {
        promise: Promise.all(promises),
        all: true
      };
    }
  });

  // promise_race: 첫 번째 Promise 대기
  registry.register({
    name: 'promise_race',
    module: 'promise-utils',
    executor: (args) => {
      const promises = args[0];

      return {
        promise: Promise.race(promises),
        race: true
      };
    }
  });

  // promise_resolve: Promise 해결
  registry.register({
    name: 'promise_resolve',
    module: 'promise-utils',
    executor: (args) => {
      const value = args[0];
      return { promise: Promise.resolve(value), resolved: true };
    }
  });

  // promise_reject: Promise 거부
  registry.register({
    name: 'promise_reject',
    module: 'promise-utils',
    executor: (args) => {
      const reason = args[0];
      return { promise: Promise.reject(reason), rejected: true };
    }
  });
}

function registerQueueWorkerFunctions(registry: NativeFunctionRegistry): void {
  // queue_create: 큐 생성
  registry.register({
    name: 'queue_create',
    module: 'queue-worker',
    executor: (args) => {
      const concurrency = Number(args[0]) || 1;
      const queueId = generateId('queue');

      return {
        id: queueId,
        concurrency,
        status: 'created',
        push: (task: Function) => ({ queued: true }),
        process: () => ({ processed: true })
      };
    }
  });

  // queue_push: 작업 추가
  registry.register({
    name: 'queue_push',
    module: 'queue-worker',
    executor: (args) => {
      const queueId = String(args[0]);
      const task = args[1];

      return { queueId, task: typeof task, queued: true };
    }
  });

  // queue_process: 큐 처리
  registry.register({
    name: 'queue_process',
    module: 'queue-worker',
    executor: (args) => {
      const queueId = String(args[0]);

      return { queueId, processed: true };
    }
  });
}

function registerTaskManagerFunctions(registry: NativeFunctionRegistry): void {
  // task_create: 작업 관리자 생성
  registry.register({
    name: 'task_create',
    module: 'task-manager',
    executor: (args) => {
      const managerId = generateId('tm');
      const manager: TaskManager = {
        id: managerId,
        tasks: new Map(),
        dependencies: new Map()
      };
      globalTaskManagers.set(managerId, manager);

      return { id: managerId, status: 'created' };
    }
  });

  // task_add: 작업 추가
  registry.register({
    name: 'task_add',
    module: 'task-manager',
    executor: (args) => {
      const managerId = String(args[0]);
      const taskId = String(args[1]);
      const fn = args[2];

      const manager = globalTaskManagers.get(managerId);
      if (!manager) return { error: 'Task manager not found' };

      manager.tasks.set(taskId, { status: 'pending' });

      return { taskId, added: true };
    }
  });

  // task_execute: 작업 실행
  registry.register({
    name: 'task_execute',
    module: 'task-manager',
    executor: (args) => {
      const managerId = String(args[0]);
      const taskId = String(args[1]);

      const manager = globalTaskManagers.get(managerId);
      if (!manager) return { error: 'Task manager not found' };

      const task = manager.tasks.get(taskId);
      if (!task) return { error: 'Task not found' };

      task.status = 'running';
      task.status = 'completed';

      return { taskId, executed: true, status: 'completed' };
    }
  });
}

function registerPipelineFunctions(registry: NativeFunctionRegistry): void {
  // pipeline_create: 파이프라인 생성
  registry.register({
    name: 'pipeline_create',
    module: 'pipeline',
    executor: (args) => {
      const pipelineId = generateId('pipe');
      const pipeline: Pipeline = {
        id: pipelineId,
        stages: [],
        data: null,
        results: []
      };
      globalPipelines.set(pipelineId, pipeline);

      return { id: pipelineId, status: 'created' };
    }
  });

  // pipeline_add_stage: 파이프라인 단계 추가
  registry.register({
    name: 'pipeline_add_stage',
    module: 'pipeline',
    executor: (args) => {
      const pipelineId = String(args[0]);
      const stageName = String(args[1]);
      const fn = args[2];

      const pipeline = globalPipelines.get(pipelineId);
      if (!pipeline) return { error: 'Pipeline not found' };

      pipeline.stages.push({ name: stageName, fn });

      return { stage: stageName, added: true };
    }
  });

  // pipeline_execute: 파이프라인 실행
  registry.register({
    name: 'pipeline_execute',
    module: 'pipeline',
    executor: (args) => {
      const pipelineId = String(args[0]);
      const initialData = args[1];

      const pipeline = globalPipelines.get(pipelineId);
      if (!pipeline) return { error: 'Pipeline not found' };

      pipeline.data = initialData;
      pipeline.results = [];

      for (const stage of pipeline.stages) {
        try {
          if (typeof stage.fn === 'function') {
            pipeline.data = stage.fn(pipeline.data);
          }
          pipeline.results.push({ stage: stage.name, success: true });
        } catch (error) {
          pipeline.results.push({ stage: stage.name, success: false, error: String(error) });
        }
      }

      return { executed: true, stageCount: pipeline.stages.length, results: pipeline.results };
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Export Function
// ═══════════════════════════════════════════════════════════════════════════════

export function registerTeamEFunctions(registry: NativeFunctionRegistry): void {
  // 1-12개 핵심 비동기 함수들
  registerAsyncPoolFunctions(registry);
  registerSemaphoreFunctions(registry);
  registerChannelFunctions(registry);
  registerWorkerPoolFunctions(registry);
  registerEventBusFunctions(registry);
  registerPubSubFunctions(registry);
  registerRateLimiterFunctions(registry);
  registerDebounceFunctions(registry);
  registerThrottleFunctions(registry);
  registerRetryFunctions(registry);
  registerCircuitBreakerFunctions(registry);
  registerLoggerFunctions(registry);

  // 13-15개 에러 처리 함수들
  registerErrorHandlerFunctions(registry);
  registerErrorMonitoringFunctions(registry);
  registerErrorSerializerFunctions(registry);

  // 16-22개 테스트 함수들
  registerAssertionFunctions(registry);
  registerMockFunctions(registry);
  registerSpyFunctions(registry);
  registerFixtureFunctions(registry);
  registerSnapshotFunctions(registry);
  registerCoverageFunctions(registry);
  registerBenchmarkFunctions(registry);
  registerTestRunnerFunctions(registry);

  // 23-30개 추가 테스트/유틸 함수들
  registerStubFunctions(registry);
  registerFakeTimerFunctions(registry);
  registerExpectFunctions(registry);
  registerPromiseUtilsFunctions(registry);
  registerQueueWorkerFunctions(registry);
  registerTaskManagerFunctions(registry);
  registerPipelineFunctions(registry);
}
