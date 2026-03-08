/**
 * FreeLang v2 - Native-Rate-Shield
 *
 * Token Bucket 알고리즘 (Lock-free Atomic)
 * - SharedArrayBuffer + Atomics.compareExchange 기반 CAS 루프
 * - IP별 독립 버킷, 자동 리필
 * - 외부 라이브러리 0의존
 *
 * Phase Native-Rate-Shield
 */

import { NativeFunctionRegistry } from '../vm/native-function-registry';

// ────────────────────────────────────────────────────────────────────────────
// Token Bucket 내부 구조
//
// SharedArrayBuffer layout (4 x Int32 = 16 bytes):
//   [0] tokens_fixed  : 현재 토큰 수 × FIXED_SCALE (정수 고정소수점)
//   [1] last_ms_hi    : Date.now() 상위 32비트
//   [2] last_ms_lo    : Date.now() 하위 32비트
//   [3] init_flag     : 초기화 완료 플래그 (0=미완, 1=완료)
// ────────────────────────────────────────────────────────────────────────────
const FIXED_SCALE = 1000; // 소수점 3자리 정밀도

interface ShieldDef {
  windowMs: number;   // 슬라이딩 윈도우 (ms)
  max: number;        // 윈도우당 최대 허용 요청 수
  burst: number;      // 순간 버스트 허용량
  refillRate: number; // 토큰/ms (= max / windowMs)
}

// 전역 Shield 정의 맵: shieldName → ShieldDef
const shieldDefs = new Map<string, ShieldDef>();

// 전역 버킷 맵: `${shieldName}:${clientKey}` → SharedArrayBuffer
const buckets = new Map<string, SharedArrayBuffer>();

// 차단 통계: shieldName → { blocked, allowed }
const shieldStats = new Map<string, { blocked: number; allowed: number; created: number }>();

// ────────────────────────────────────────────────────────────────────────────
// 내부 유틸
// ────────────────────────────────────────────────────────────────────────────

function getBucket(shieldName: string, clientKey: string): SharedArrayBuffer | null {
  const def = shieldDefs.get(shieldName);
  if (!def) return null;

  const bucketKey = `${shieldName}:${clientKey}`;
  let sab = buckets.get(bucketKey);
  if (!sab) {
    // 새 버킷 생성: 토큰 꽉 채워서 시작
    sab = new SharedArrayBuffer(16);
    const view = new Int32Array(sab);
    const now = Date.now();
    Atomics.store(view, 0, def.burst * FIXED_SCALE); // tokens = burst (full)
    Atomics.store(view, 1, Math.floor(now / 0x100000000)); // hi
    Atomics.store(view, 2, now >>> 0);                      // lo
    Atomics.store(view, 3, 1); // init done
    buckets.set(bucketKey, sab);
  }
  return sab;
}

function readTimestamp(view: Int32Array): number {
  const hi = Atomics.load(view, 1);
  const lo = Atomics.load(view, 2);
  return hi * 0x100000000 + (lo >>> 0);
}

function writeTimestamp(view: Int32Array, ms: number): void {
  Atomics.store(view, 1, Math.floor(ms / 0x100000000));
  Atomics.store(view, 2, ms >>> 0);
}

// ────────────────────────────────────────────────────────────────────────────
// Token Bucket CAS 루프 (Lock-free)
//
// 1. 현재 토큰 읽기
// 2. 경과 시간만큼 리필 계산
// 3. CAS로 원자적 교환 시도
// 4. 실패 시 재시도 (다른 스레드가 먼저 수정한 경우)
// ────────────────────────────────────────────────────────────────────────────
function atomicConsume(sab: SharedArrayBuffer, def: ShieldDef): boolean {
  const view = new Int32Array(sab);
  const now = Date.now();

  let maxRetries = 64; // 스핀루프 상한
  while (maxRetries-- > 0) {
    const currentTokens = Atomics.load(view, 0);
    const lastMs = readTimestamp(view);

    // 리필: 경과 시간 × refillRate
    const elapsed = Math.max(0, now - lastMs);
    const refill = Math.floor(elapsed * def.refillRate * FIXED_SCALE);
    const capacityFixed = def.burst * FIXED_SCALE;
    const newTokensBeforeConsume = Math.min(capacityFixed, currentTokens + refill);

    if (newTokensBeforeConsume < FIXED_SCALE) {
      // 토큰 부족 → 차단 (타임스탬프는 갱신하지 않음)
      return false;
    }

    // 1토큰 소비
    const afterConsume = newTokensBeforeConsume - FIXED_SCALE;

    // CAS: currentTokens → afterConsume
    const swapped = Atomics.compareExchange(view, 0, currentTokens, afterConsume);
    if (swapped === currentTokens) {
      // 성공: 타임스탬프도 갱신 (근사값 - 완벽한 원자성 불필요)
      writeTimestamp(view, now);
      return true;
    }
    // 실패: 다른 컨텍스트가 먼저 수정 → 재시도
  }
  // 재시도 초과 → 보수적으로 차단
  return false;
}

// ────────────────────────────────────────────────────────────────────────────
// 공개 함수 등록
// ────────────────────────────────────────────────────────────────────────────

export function registerRateShieldFunctions(registry: NativeFunctionRegistry): void {

  /**
   * shield_init(name, windowMs, max, burst)
   * - 이미 초기화된 경우 무시 (idempotent)
   */
  registry.register({
    name: 'shield_init',
    module: 'rate_shield',
    executor: (args) => {
      const name     = String(args[0]);
      const windowMs = Number(args[1]) || 1000;
      const max      = Number(args[2]) || 10;
      const burst    = Number(args[3]) || max;

      if (shieldDefs.has(name)) return false; // 이미 존재
      shieldDefs.set(name, {
        windowMs,
        max,
        burst,
        refillRate: max / windowMs,
      });
      shieldStats.set(name, { blocked: 0, allowed: 0, created: Date.now() });
      return true;
    }
  });

  /**
   * shield_check(name, clientKey) → boolean
   * - true: 허용 | false: 차단(429)
   */
  registry.register({
    name: 'shield_check',
    module: 'rate_shield',
    executor: (args) => {
      const name      = String(args[0]);
      const clientKey = String(args[1] ?? 'global');
      const def = shieldDefs.get(name);
      if (!def) return true; // 정의 없으면 통과

      const sab = getBucket(name, clientKey);
      if (!sab) return true;

      const allowed = atomicConsume(sab, def);
      const stat = shieldStats.get(name);
      if (stat) {
        if (allowed) stat.allowed++;
        else stat.blocked++;
      }
      return allowed;
    }
  });

  /**
   * shield_stats(name) → { allowed, blocked, ratio, uptime_ms }
   */
  registry.register({
    name: 'shield_stats',
    module: 'rate_shield',
    executor: (args) => {
      const name = String(args[0]);
      const stat = shieldStats.get(name);
      if (!stat) return null;
      const total = stat.allowed + stat.blocked;
      return {
        allowed:    stat.allowed,
        blocked:    stat.blocked,
        total,
        block_rate: total > 0 ? (stat.blocked / total * 100).toFixed(1) + '%' : '0%',
        uptime_ms:  Date.now() - stat.created,
        buckets:    buckets.size,
      };
    }
  });

  /**
   * shield_reset(name) → boolean
   * - 해당 Shield의 모든 버킷 초기화
   */
  registry.register({
    name: 'shield_reset',
    module: 'rate_shield',
    executor: (args) => {
      const name = String(args[0]);
      if (!shieldDefs.has(name)) return false;
      const prefix = name + ':';
      for (const key of buckets.keys()) {
        if (key.startsWith(prefix)) buckets.delete(key);
      }
      const stat = shieldStats.get(name);
      if (stat) { stat.allowed = 0; stat.blocked = 0; }
      return true;
    }
  });

  /**
   * shield_delete(name) → boolean
   * - Shield 완전 삭제
   */
  registry.register({
    name: 'shield_delete',
    module: 'rate_shield',
    executor: (args) => {
      const name = String(args[0]);
      if (!shieldDefs.has(name)) return false;
      shieldDefs.delete(name);
      shieldStats.delete(name);
      const prefix = name + ':';
      for (const key of buckets.keys()) {
        if (key.startsWith(prefix)) buckets.delete(key);
      }
      return true;
    }
  });
}
