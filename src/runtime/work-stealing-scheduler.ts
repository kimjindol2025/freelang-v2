/**
 * FreeLang v2 - Work-Stealing Scheduler
 *
 * Node.js 단일 스레드 위에서 동작하는 가상 멀티 워커 스케줄러.
 * 각 워커는 독립적인 태스크 큐를 가지며, 큐가 비면 가장 바쁜
 * 워커의 큐 뒤쪽(tail)에서 태스크를 훔쳐 실행한다.
 *
 * Phase 27: Native-Async-Orchestrator
 */

export interface ScheduledTask<T = any> {
  id: number;
  fn: () => Promise<T> | T;
  resolve: (value: T) => void;
  reject: (reason: any) => void;
  workerId: number;    // 최초 배정 워커
  stolenFrom?: number; // work-steal 발생 시 원래 워커
}

export interface WorkerStats {
  id: number;
  executed: number;
  stolen: number;
  idle: number;
}

/**
 * Work-Stealing 스케줄러
 *
 * 사용 예:
 *   const sched = new WorkStealingScheduler(4); // 워커 4개
 *   const results = await sched.dispatch([fn1, fn2, fn3, ...]);
 */
export class WorkStealingScheduler {
  private workerCount: number;
  private queues: ScheduledTask[][];   // 워커별 태스크 큐 (deque 역할)
  private stats: WorkerStats[];
  private nextTaskId = 0;

  constructor(workerCount: number = 4) {
    this.workerCount = Math.max(1, workerCount);
    this.queues = Array.from({ length: this.workerCount }, () => []);
    this.stats = Array.from({ length: this.workerCount }, (_, i) => ({
      id: i,
      executed: 0,
      stolen: 0,
      idle: 0,
    }));
  }

  /**
   * 태스크 배열을 받아 Work-Stealing 방식으로 병렬 실행
   * concurrency: 동시에 실행 가능한 최대 개수 (0 = 무제한)
   */
  async dispatch<T>(
    tasks: Array<() => Promise<T> | T>,
    concurrency: number = 0
  ): Promise<T[]> {
    if (tasks.length === 0) return [];

    // 초기 배분: 라운드-로빈으로 태스크를 워커 큐에 배정
    const scheduled = this._distribute(tasks);

    // 동시성 제한 적용
    const limit = concurrency > 0 ? concurrency : tasks.length;
    return this._runWithStealing(scheduled, limit);
  }

  /**
   * 태스크를 워커 큐에 라운드-로빈 배분
   */
  private _distribute<T>(tasks: Array<() => Promise<T> | T>): ScheduledTask<T>[] {
    // 기존 큐 초기화
    for (let i = 0; i < this.workerCount; i++) {
      this.queues[i] = [];
    }

    const scheduled: ScheduledTask<T>[] = [];

    tasks.forEach((fn, idx) => {
      const workerId = idx % this.workerCount;
      let res!: (v: T) => void;
      let rej!: (r: any) => void;

      const task: ScheduledTask<T> = {
        id: this.nextTaskId++,
        fn,
        workerId,
        resolve: (v) => res(v),
        reject: (r) => rej(r),
      };

      // resolve/reject를 태스크 내부에서 덮어써야 하므로 클로저로 연결
      const promise = new Promise<T>((r, j) => {
        task.resolve = r;
        task.reject = j;
      });

      (task as any)._promise = promise;
      this.queues[workerId].push(task as any);
      scheduled.push(task);
    });

    return scheduled;
  }

  /**
   * Work-Stealing 실행 루프
   */
  private async _runWithStealing<T>(
    scheduled: ScheduledTask<T>[],
    concurrency: number
  ): Promise<T[]> {
    const results: T[] = new Array(scheduled.length);
    const idxMap = new Map<number, number>(); // taskId -> 결과 인덱스
    scheduled.forEach((t, i) => idxMap.set(t.id, i));

    let running = 0;
    let done = 0;
    const total = scheduled.length;

    return new Promise<T[]>((resolveAll, rejectAll) => {
      const tick = () => {
        // 실행 슬롯이 남아있는 동안 태스크 꺼내기
        while (running < concurrency && done + running < total) {
          const task = this._pickTask<T>();
          if (!task) break;

          running++;
          this.stats[task.workerId].executed++;

          Promise.resolve()
            .then(() => task.fn())
            .then((value) => {
              const idx = idxMap.get(task.id)!;
              results[idx] = value;
              task.resolve(value);
              running--;
              done++;
              if (done === total) {
                resolveAll(results);
              } else {
                tick(); // 슬롯 확보 → 다음 태스크
              }
            })
            .catch((err) => {
              task.reject(err);
              rejectAll(err);
            });
        }
      };

      tick();
    });
  }

  /**
   * 태스크 선택: 자기 큐가 비면 가장 긴 큐에서 훔침 (Work-Steal)
   */
  private _pickTask<T>(): ScheduledTask<T> | null {
    // 라운드-로빈으로 워커 순회하며 비어있지 않은 큐 탐색
    for (let i = 0; i < this.workerCount; i++) {
      if (this.queues[i].length > 0) {
        return this.queues[i].shift() as ScheduledTask<T>;
      }
    }

    // 모든 큐가 비어있으면 가장 긴 큐에서 tail steal
    const victim = this._findVictimQueue();
    if (victim === -1) return null;

    const stolen = this.queues[victim].pop() as ScheduledTask<T>;
    if (stolen) {
      this.stats[victim].stolen++;
      stolen.stolenFrom = stolen.workerId;
    }
    return stolen ?? null;
  }

  /**
   * Work-Steal 대상: 가장 많은 태스크를 가진 워커 큐 인덱스
   */
  private _findVictimQueue(): number {
    let maxLen = 0;
    let victimId = -1;
    for (let i = 0; i < this.workerCount; i++) {
      if (this.queues[i].length > maxLen) {
        maxLen = this.queues[i].length;
        victimId = i;
      }
    }
    return victimId;
  }

  /**
   * 스케줄러 통계 반환
   */
  getStats(): WorkerStats[] {
    return this.stats.map(s => ({ ...s }));
  }

  /**
   * 큐 상태 스냅샷
   */
  getQueueDepths(): number[] {
    return this.queues.map(q => q.length);
  }

  /**
   * 스케줄러 리셋
   */
  reset(): void {
    for (let i = 0; i < this.workerCount; i++) {
      this.queues[i] = [];
      this.stats[i] = { id: i, executed: 0, stolen: 0, idle: 0 };
    }
    this.nextTaskId = 0;
  }
}

/**
 * Barrier Synchronization - 모든 작업이 완료될 때까지 대기
 * Promise.all의 네이티브 래퍼 (에러 집계 포함)
 */
export async function barrierSync<T>(
  promises: Array<Promise<T>>,
  failFast: boolean = true
): Promise<{ results: (T | null)[]; errors: any[] }> {
  const results: (T | null)[] = new Array(promises.length).fill(null);
  const errors: any[] = [];

  if (failFast) {
    const vals = await Promise.all(promises);
    vals.forEach((v, i) => (results[i] = v));
    return { results, errors };
  }

  // allSettled 방식 - 실패해도 계속 진행
  const settled = await Promise.allSettled(promises);
  settled.forEach((s, i) => {
    if (s.status === 'fulfilled') {
      results[i] = s.value;
    } else {
      errors.push({ index: i, reason: s.reason });
    }
  });

  return { results, errors };
}

// 싱글톤 기본 스케줄러 (4 워커)
export const defaultScheduler = new WorkStealingScheduler(4);
