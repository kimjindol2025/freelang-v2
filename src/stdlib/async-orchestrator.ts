/**
 * FreeLang v2 - Native Async Orchestrator
 *
 * Bluebird 완전 대체: 외부 npm 0개.
 * Node.js 내장 Promise + WorkStealingScheduler만 사용.
 *
 * 제공 함수:
 *   parallel_map(items, concurrency, fn)   - 동시성 제한 병렬 맵
 *   await_all(promises)                    - 배리어 동기화
 *   await_race(promises)                   - 최초 완료 반환
 *   async_pipeline(item, stages)           - 비동기 파이프라인
 *   async_retry(fn, retries, delay)        - 재시도 래퍼
 *   async_timeout(promise, ms)             - 타임아웃 래퍼
 *   parallel_filter(items, concurrency, fn) - 병렬 필터
 *   parallel_reduce(items, fn, init)       - 병렬 리듀스 (순서 보장)
 *
 * Phase 27: Native-Async-Orchestrator
 */

import { NativeFunctionRegistry } from '../vm/native-function-registry';
import { WorkStealingScheduler, barrierSync, defaultScheduler } from '../runtime/work-stealing-scheduler';

// ═══════════════════════════════════════════════════════════════
// 내부 유틸
// ═══════════════════════════════════════════════════════════════

function toCallable(vm: any, fn: any): ((...args: any[]) => Promise<any>) {
  if (typeof fn === 'function') return fn;

  // FreeLang VM 함수 레퍼런스 (string: 함수명)
  if (typeof fn === 'string' && vm) {
    return (...args: any[]) => {
      const result = vm.callUserFunction(fn, args);
      return Promise.resolve(result);
    };
  }

  // FreeLang 클로저 객체 { __type: 'closure', name, env }
  if (fn && typeof fn === 'object' && fn.__type === 'closure' && vm) {
    return (...args: any[]) => {
      const result = vm.callClosure(fn, args);
      return Promise.resolve(result);
    };
  }

  throw new Error(`parallel_map: fn은 함수 또는 FreeLang 함수명이어야 합니다 (got ${typeof fn})`);
}

// ═══════════════════════════════════════════════════════════════
// 등록 함수
// ═══════════════════════════════════════════════════════════════

export function registerAsyncOrchestratorFunctions(registry: NativeFunctionRegistry): void {

  // ─────────────────────────────────────────────────────────────
  // parallel_map(items, concurrency, fn) -> list
  //
  // 예: let results = parallel_map([1,2,3,4,5], 3, process_item)
  // ─────────────────────────────────────────────────────────────
  registry.register({
    name: 'parallel_map',
    module: 'async_orchestrator',
    async: true,
    executor: async (args) => {
      const [items, concurrency, fn] = args;

      if (!Array.isArray(items)) {
        throw new Error('parallel_map: 첫 번째 인수는 배열이어야 합니다');
      }
      const limit = typeof concurrency === 'number' ? concurrency : 0;
      const vm = registry.getVM();
      const callable = toCallable(vm, fn);

      const sched = new WorkStealingScheduler(Math.min(4, items.length || 1));
      const tasks = items.map((item: any) => () => callable(item));
      const results = await sched.dispatch(tasks, limit);
      return results;
    },
  });

  // ─────────────────────────────────────────────────────────────
  // await_all(promise_list) -> list
  //
  // Barrier synchronization: 모두 완료될 때까지 대기
  // 예: let all = await_all([fetch("/a"), fetch("/b"), fetch("/c")])
  // ─────────────────────────────────────────────────────────────
  registry.register({
    name: 'await_all',
    module: 'async_orchestrator',
    async: true,
    executor: async (args) => {
      const items: any[] = Array.isArray(args[0]) ? args[0] : args;
      const failFast: boolean = args[1] !== false; // 기본 true

      // FreeLang SimplePromise → 네이티브 Promise 변환
      const promises = items.map((p: any) => {
        if (p && typeof p.then === 'function') return p;
        return Promise.resolve(p);
      });

      const { results, errors } = await barrierSync(promises, failFast);
      if (!failFast && errors.length > 0) {
        // 실패 정보 포함 반환
        return { results, errors, hasErrors: true };
      }
      return results;
    },
  });

  // ─────────────────────────────────────────────────────────────
  // await_race(promise_list) -> first_result
  //
  // 가장 먼저 완료된 값 반환
  // ─────────────────────────────────────────────────────────────
  registry.register({
    name: 'await_race',
    module: 'async_orchestrator',
    async: true,
    executor: async (args) => {
      const items: any[] = Array.isArray(args[0]) ? args[0] : args;
      const promises = items.map((p: any) =>
        p && typeof p.then === 'function' ? p : Promise.resolve(p)
      );
      return Promise.race(promises);
    },
  });

  // ─────────────────────────────────────────────────────────────
  // async_pipeline(item, stage1, stage2, ...) -> result
  //
  // 데이터를 순차 비동기 파이프라인으로 변환
  // 예: let result = async_pipeline(raw, parse, validate, save)
  // ─────────────────────────────────────────────────────────────
  registry.register({
    name: 'async_pipeline',
    module: 'async_orchestrator',
    async: true,
    executor: async (args) => {
      const [initial, ...stages] = args;
      const vm = registry.getVM();
      let value = initial;

      for (const stage of stages) {
        const callable = toCallable(vm, stage);
        value = await callable(value);
      }

      return value;
    },
  });

  // ─────────────────────────────────────────────────────────────
  // async_retry(fn, retries, delay_ms) -> result
  //
  // 실패 시 재시도 (지수 백오프 없음, 고정 딜레이)
  // ─────────────────────────────────────────────────────────────
  registry.register({
    name: 'async_retry',
    module: 'async_orchestrator',
    async: true,
    executor: async (args) => {
      const [fn, maxRetries = 3, delayMs = 100] = args;
      const vm = registry.getVM();
      const callable = toCallable(vm, fn);

      let lastError: any;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await callable();
        } catch (err) {
          lastError = err;
          if (attempt < maxRetries && delayMs > 0) {
            await new Promise<void>(r => setTimeout(r, delayMs));
          }
        }
      }
      throw lastError;
    },
  });

  // ─────────────────────────────────────────────────────────────
  // async_timeout(promise_or_fn, timeout_ms) -> result
  //
  // 타임아웃 초과 시 에러
  // ─────────────────────────────────────────────────────────────
  registry.register({
    name: 'async_timeout',
    module: 'async_orchestrator',
    async: true,
    executor: async (args) => {
      const [target, timeoutMs = 5000] = args;
      const vm = registry.getVM();

      let workPromise: Promise<any>;
      if (typeof target === 'function' || typeof target === 'string' ||
          (target && target.__type === 'closure')) {
        workPromise = Promise.resolve(toCallable(vm, target)());
      } else if (target && typeof target.then === 'function') {
        workPromise = target;
      } else {
        workPromise = Promise.resolve(target);
      }

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`async_timeout: ${timeoutMs}ms 초과`)), timeoutMs)
      );

      return Promise.race([workPromise, timeoutPromise]);
    },
  });

  // ─────────────────────────────────────────────────────────────
  // parallel_filter(items, concurrency, predicate) -> filtered_list
  //
  // 병렬 필터: predicate가 true인 항목만 유지 (순서 보장)
  // ─────────────────────────────────────────────────────────────
  registry.register({
    name: 'parallel_filter',
    module: 'async_orchestrator',
    async: true,
    executor: async (args) => {
      const [items, concurrency, fn] = args;
      if (!Array.isArray(items)) throw new Error('parallel_filter: 배열 필요');

      const vm = registry.getVM();
      const callable = toCallable(vm, fn);
      const limit = typeof concurrency === 'number' ? concurrency : 0;

      const sched = new WorkStealingScheduler(Math.min(4, items.length || 1));
      const tasks = items.map((item: any) => async () => {
        const keep = await callable(item);
        return { item, keep: Boolean(keep) };
      });

      const results = await sched.dispatch(tasks, limit);
      return results.filter((r: any) => r.keep).map((r: any) => r.item);
    },
  });

  // ─────────────────────────────────────────────────────────────
  // parallel_reduce(items, fn, initial) -> reduced_value
  //
  // 병렬로 처리하되 최종 reduce는 순서 보장
  // ─────────────────────────────────────────────────────────────
  registry.register({
    name: 'parallel_reduce',
    module: 'async_orchestrator',
    async: true,
    executor: async (args) => {
      const [items, fn, initial] = args;
      if (!Array.isArray(items)) throw new Error('parallel_reduce: 배열 필요');

      const vm = registry.getVM();
      const callable = toCallable(vm, fn);

      // 먼저 모든 항목을 병렬 처리한 후 순서대로 reduce
      const processed = await Promise.all(items.map((item: any) => callable(item)));
      return processed.reduce((acc: any, val: any) => {
        if (typeof fn === 'function') return fn(acc, val);
        return acc; // FreeLang 함수의 경우 처리된 값 그대로 누적
      }, initial);
    },
  });

  // ─────────────────────────────────────────────────────────────
  // work_stealing_stats() -> stats_map
  //
  // 기본 스케줄러 통계 반환 (셀프호스팅 증명용)
  // ─────────────────────────────────────────────────────────────
  registry.register({
    name: 'work_stealing_stats',
    module: 'async_orchestrator',
    executor: (_args) => {
      const stats = defaultScheduler.getStats();
      return {
        workers: stats.length,
        workerStats: stats,
        queueDepths: defaultScheduler.getQueueDepths(),
      };
    },
  });

  // ─────────────────────────────────────────────────────────────
  // async_map_batch(items, batch_size, fn) -> results
  //
  // 배치 단위로 묶어 병렬 처리 (메모리 효율)
  // ─────────────────────────────────────────────────────────────
  registry.register({
    name: 'async_map_batch',
    module: 'async_orchestrator',
    async: true,
    executor: async (args) => {
      const [items, batchSize, fn] = args;
      if (!Array.isArray(items)) throw new Error('async_map_batch: 배열 필요');

      const vm = registry.getVM();
      const callable = toCallable(vm, fn);
      const size = typeof batchSize === 'number' && batchSize > 0 ? batchSize : 10;

      const allResults: any[] = [];

      for (let i = 0; i < items.length; i += size) {
        const batch = items.slice(i, i + size);
        const batchResults = await Promise.all(batch.map((item: any) => callable(item)));
        allResults.push(...batchResults);
      }

      return allResults;
    },
  });
}
