/**
 * FreeLang GC Engine
 * Mark-Sweep + Generational GC 구현
 *
 * 특징:
 * - Young/Old Generation 분리
 * - Minor GC: Young Gen만 수집 (빠름)
 * - Major GC: 전체 수집 (느리지만 철저함)
 * - Write Barrier: Old → Young 참조 추적
 * - Incremental GC: 장시간 중단 방지
 */

/**
 * GC 대상 객체
 */
export interface GCObject {
  id: number;
  size: number;
  marked: boolean;
  generation: 'young' | 'old';
  refs: Set<number>;  // 이 객체가 참조하는 다른 객체 ID
  age: number;  // Generation 전환 카운터
}

/**
 * GC 통계
 */
export interface GCStats {
  heapUsedBefore: number;
  heapUsedAfter: number;
  heapFreed: number;
  objectsCollected: number;
  timeMs: number;
  type: 'minor' | 'major' | 'incremental';
}

/**
 * Mark-Sweep GC 엔진
 */
export class GCEngine {
  private heap: Map<number, GCObject> = new Map();
  private roots: Set<number> = new Set();
  private youngGen: Map<number, GCObject> = new Map();
  private oldGen: Map<number, GCObject> = new Map();
  private nextId: number = 1;

  // 통계
  private stats: GCStats[] = [];
  private youngGenPromotionAge: number = 2;  // Age 2 이상 → Old Gen
  private majorGCInterval: number = 10;  // 10회 minor GC마다 major GC
  private minorGCCount: number = 0;

  /**
   * 객체 할당
   */
  allocate(size: number): number {
    const obj: GCObject = {
      id: this.nextId,
      size,
      marked: false,
      generation: 'young',
      refs: new Set(),
      age: 0,
    };

    const id = this.nextId++;
    this.heap.set(id, obj);
    this.youngGen.set(id, obj);

    return id;
  }

  /**
   * 루트 추가 (스택, 레지스터, 전역 변수)
   */
  addRoot(objectId: number): void {
    this.roots.add(objectId);
  }

  /**
   * 참조 설정
   */
  reference(from: number, to: number): void {
    const obj = this.heap.get(from);
    if (obj) {
      obj.refs.add(to);
    }
  }

  /**
   * Young Generation Mark
   */
  private markYoung(): void {
    const worklist: number[] = Array.from(this.roots).filter(
      id => this.youngGen.has(id)
    );

    const visited = new Set<number>();

    while (worklist.length > 0) {
      const id = worklist.pop()!;
      if (visited.has(id)) continue;
      visited.add(id);

      const obj = this.youngGen.get(id);
      if (!obj) continue;

      obj.marked = true;

      const refIds = Array.from(obj.refs);
      for (let i = 0; i < refIds.length; i++) {
        const refId = refIds[i];
        if (this.youngGen.has(refId) && !visited.has(refId)) {
          worklist.push(refId);
        }
      }
    }
  }

  /**
   * 전체 Mark
   */
  private markFull(): void {
    const worklist: number[] = Array.from(this.roots);
    const visited = new Set<number>();

    while (worklist.length > 0) {
      const id = worklist.pop()!;
      if (visited.has(id)) continue;
      visited.add(id);

      const obj = this.heap.get(id);
      if (!obj) continue;

      obj.marked = true;

      const refIds = Array.from(obj.refs);
      for (let i = 0; i < refIds.length; i++) {
        const refId = refIds[i];
        if (!visited.has(refId)) {
          worklist.push(refId);
        }
      }
    }
  }

  /**
   * Young Generation Sweep + Promote
   */
  private sweepYoung(): number {
    const toDelete: number[] = [];
    let collected = 0;

    for (const [id, obj] of Array.from(this.youngGen.entries())) {
      if (!obj.marked) {
        toDelete.push(id);
        this.heap.delete(id);
        collected++;
      } else {
        // Age 증가
        obj.age++;

        // Old Gen으로 승격
        if (obj.age >= this.youngGenPromotionAge) {
          obj.generation = 'old';
          this.youngGen.delete(id);
          this.oldGen.set(id, obj);
        }

        // 다음 사이클을 위해 마크 해제
        obj.marked = false;
      }
    }

    return collected;
  }

  /**
   * Full Sweep
   */
  private sweepFull(): number {
    const toDelete: number[] = [];
    let collected = 0;

    for (const [id, obj] of Array.from(this.heap.entries())) {
      if (!obj.marked) {
        toDelete.push(id);
        this.heap.delete(id);
        if (this.youngGen.has(id)) {
          this.youngGen.delete(id);
        } else if (this.oldGen.has(id)) {
          this.oldGen.delete(id);
        }
        collected++;
      } else {
        obj.marked = false;  // 다음 사이클 준비
      }
    }

    return collected;
  }

  /**
   * Minor GC (Young Gen만)
   */
  collect(): GCStats {
    const startTime = performance.now();
    const heapBefore = this.heap.size;

    this.markYoung();
    const collected = this.sweepYoung();

    const heapAfter = this.heap.size;

    this.minorGCCount++;

    const stat: GCStats = {
      heapUsedBefore: heapBefore,
      heapUsedAfter: heapAfter,
      heapFreed: heapBefore - heapAfter,
      objectsCollected: collected,
      timeMs: performance.now() - startTime,
      type: 'minor',
    };

    this.stats.push(stat);
    return stat;
  }

  /**
   * Major GC (전체)
   */
  fullCollect(): GCStats {
    const startTime = performance.now();
    const heapBefore = this.heap.size;

    this.markFull();
    const collected = this.sweepFull();

    const heapAfter = this.heap.size;

    this.minorGCCount = 0;  // Major GC 후 카운트 리셋

    const stat: GCStats = {
      heapUsedBefore: heapBefore,
      heapUsedAfter: heapAfter,
      heapFreed: heapBefore - heapAfter,
      objectsCollected: collected,
      timeMs: performance.now() - startTime,
      type: 'major',
    };

    this.stats.push(stat);
    return stat;
  }

  /**
   * 자동 GC 실행 (Minor or Major)
   * - Minor GC: 10회마다 Major GC
   */
  autoCollect(): GCStats {
    if (this.minorGCCount >= this.majorGCInterval) {
      return this.fullCollect();
    }
    return this.collect();
  }

  /**
   * 힙 크기 반환
   */
  getHeapSize(): number {
    return this.heap.size;
  }

  /**
   * Young Gen 크기
   */
  getYoungGenSize(): number {
    return this.youngGen.size;
  }

  /**
   * Old Gen 크기
   */
  getOldGenSize(): number {
    return this.oldGen.size;
  }

  /**
   * GC 통계 조회
   */
  getStats(): GCStats[] {
    return this.stats;
  }

  /**
   * 통계 초기화
   */
  clearStats(): void {
    this.stats = [];
  }
}

/**
 * Incremental GC (시간 예산 기반)
 * 16ms 이내로 분할 실행
 * Phase 1 버그 수정:
 * - 루트 초기화 추가
 * - visited 추적 구현
 * - Mark 로직 완성
 * - Sweep 단계 추가
 */
export class IncrementalGC {
  private engine: GCEngine;
  private markWorklist: number[] = [];
  private visited: Set<number> = new Set();
  private isMarking: boolean = false;
  private isSweeping: boolean = false;
  private sweepIndex: number = 0;
  private heapSnapshot: [number, GCObject][] = [];

  constructor(engine: GCEngine) {
    this.engine = engine;
  }

  /**
   * 시간 예산 내에서 GC 진행
   * @param budgetMs - 최대 실행 시간 (기본 16ms)
   * @returns true if GC 완료, false if 계속 필요
   */
  step(budgetMs: number = 16): boolean {
    const startTime = performance.now();

    // Phase 1: Mark 단계
    if (!this.isSweeping && !this.isMarking) {
      // 루트로부터 시작
      this.isMarking = true;
      this.visited.clear();
      this.markWorklist = Array.from(this.engine['roots']);
    }

    // Mark 진행: 예산 내에서 처리
    while (
      this.markWorklist.length > 0 &&
      performance.now() - startTime < budgetMs
    ) {
      const id = this.markWorklist.pop()!;

      // 이미 방문했으면 스킵
      if (this.visited.has(id)) continue;
      this.visited.add(id);

      // 객체 마킹
      const obj = this.engine['heap'].get(id);
      if (!obj) continue;

      obj.marked = true;

      // 참조하는 객체를 worklist에 추가
      const refIds = Array.from(obj.refs);
      for (let j = 0; j < refIds.length; j++) {
        const refId = refIds[j];
        if (!this.visited.has(refId)) {
          this.markWorklist.push(refId);
        }
      }
    }

    // Mark 완료 → Sweep으로 전환
    if (this.markWorklist.length === 0 && this.isMarking) {
      this.isMarking = false;
      this.isSweeping = true;
      this.sweepIndex = 0;
      this.heapSnapshot = Array.from(this.engine['heap'].entries());
    }

    // Phase 2: Sweep 단계 (예산 내에서 처리)
    if (this.isSweeping) {
      const budgetRemaining = budgetMs - (performance.now() - startTime);
      const sweepStart = performance.now();

      while (
        this.sweepIndex < this.heapSnapshot.length &&
        performance.now() - sweepStart < Math.max(1, budgetRemaining)
      ) {
        const [id, obj] = this.heapSnapshot[this.sweepIndex];
        this.sweepIndex++;

        if (!obj.marked) {
          // 미마킹 객체 삭제
          this.engine['heap'].delete(id);
          if (this.engine['youngGen'].has(id)) {
            this.engine['youngGen'].delete(id);
          } else if (this.engine['oldGen'].has(id)) {
            this.engine['oldGen'].delete(id);
          }
        } else {
          // 다음 사이클을 위해 마크 해제
          obj.marked = false;
        }
      }

      // Sweep 완료 → GC 종료
      if (this.sweepIndex >= this.heapSnapshot.length) {
        this.isSweeping = false;
        this.visited.clear();
        this.heapSnapshot = [];
        return true; // GC 완료
      }
    }

    return false; // GC 진행 중
  }

  /**
   * GC 상태 초기화 (강제 종료용)
   */
  reset(): void {
    this.isMarking = false;
    this.isSweeping = false;
    this.markWorklist = [];
    this.visited.clear();
    this.heapSnapshot = [];
  }
}

/**
 * Write Barrier (Old → Young 참조 추적)
 * Phase 1 개선:
 * - Old generation 객체에서 Young generation으로의 참조만 추적
 * - 불필요한 참조 추적 최소화 (Young → Young 참조는 minor GC에서 자동 처리)
 * - RememberedSet을 통한 효율적인 추적
 */
export class WriteBarrier {
  private rememberedSet: Set<number> = new Set(); // Old → Young 참조를 기록하는 집합
  private engine: GCEngine;

  constructor(engine: GCEngine) {
    this.engine = engine;
  }

  /**
   * 참조 기록 (Old → Young)
   */
  record(fromId: number, toId: number): void {
    const fromObj = this.engine['heap'].get(fromId);
    const toObj = this.engine['heap'].get(toId);

    // 유효하지 않은 객체는 무시
    if (!fromObj || !toObj) return;

    // Old → Young 참조만 기록
    // (Young → Young 참조는 minor GC에서 Young root로부터 자동 탐색)
    if (fromObj.generation === 'old' && toObj.generation === 'young') {
      this.rememberedSet.add(fromId);
      this.engine.reference(fromId, toId);
    }
    // Old → Old 참조 (필요시)
    else if (fromObj.generation === 'old' && toObj.generation === 'old') {
      this.engine.reference(fromId, toId);
    }
    // Young → Young은 추적하지 않음 (minor GC에서 자동 처리)
  }

  /**
   * Minor GC 전에 RememberedSet 적용
   * Minor GC 시 Young root에 Old → Young 참조를 추가
   */
  getRememberedRoots(): number[] {
    return Array.from(this.rememberedSet).filter(id => {
      const obj = this.engine['heap'].get(id);
      return obj && obj.generation === 'old';
    });
  }

  /**
   * Minor GC 후 RememberedSet 갱신
   * Old → Young 참조 중 여전히 유효한 것만 유지
   */
  updateAfterMinorGC(): void {
    const toDelete: number[] = [];
    const ids = Array.from(this.rememberedSet);

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const obj = this.engine['heap'].get(id);
      if (!obj) {
        toDelete.push(id);
      } else if (obj.generation !== 'old') {
        // Old generation이 아니면 제거
        toDelete.push(id);
      }
    }

    for (let i = 0; i < toDelete.length; i++) {
      this.rememberedSet.delete(toDelete[i]);
    }
  }

  /**
   * Major GC 후 RememberedSet 초기화
   */
  reset(): void {
    this.rememberedSet.clear();
  }
}

/**
 * 사용자 인터페이스 함수: Write Barrier 호출
 * @deprecated WriteBarrier 클래스 사용 권장
 */
export function writeBarrier(
  engine: GCEngine,
  from: number,
  to: number
): void {
  engine.reference(from, to);
}
