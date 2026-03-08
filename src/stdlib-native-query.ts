// Native-State-Hydration: FreeLang v2 네이티브 쿼리 캐시 엔진
// react-query 대체: LRU 캐시 + 요청 중복제거 + Hardware-Timestamp 신선도 검증
// 외부 npm 의존성 0개 (Node.js 내장 모듈만 사용)

import { NativeFunctionRegistry } from './vm/native-function-registry';

// ─── LRU 캐시 엔트리 ────────────────────────────────────────────────
interface CacheEntry {
  value: any;
  fetchedAt: bigint;      // process.hrtime.bigint() 나노초 타임스탬프
  ttlNs: bigint;          // TTL (나노초)
  staleNs: bigint;        // stale_time (나노초)
  hits: number;
  key: string;
  prev: CacheEntry | null;
  next: CacheEntry | null;
}

// ─── LRU 더블링크드 리스트 캐시 ─────────────────────────────────────
class LRUQueryCache {
  private map = new Map<string, CacheEntry>();
  private head: CacheEntry | null = null; // MRU
  private tail: CacheEntry | null = null; // LRU
  private capacity: number;
  private totalHits = 0;
  private totalMisses = 0;
  private totalEvictions = 0;

  constructor(capacity = 256) {
    this.capacity = capacity;
  }

  get(key: string): CacheEntry | null {
    const entry = this.map.get(key);
    if (!entry) return null;
    this.moveToHead(entry);
    return entry;
  }

  set(key: string, value: any, ttlMs: number, staleMs: number): CacheEntry {
    const now = process.hrtime.bigint();
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      existing.fetchedAt = now;
      existing.ttlNs = BigInt(ttlMs) * 1_000_000n;
      existing.staleNs = BigInt(staleMs) * 1_000_000n;
      existing.hits++;
      this.moveToHead(existing);
      return existing;
    }

    const entry: CacheEntry = {
      value, key,
      fetchedAt: now,
      ttlNs: BigInt(ttlMs) * 1_000_000n,
      staleNs: BigInt(staleMs) * 1_000_000n,
      hits: 0,
      prev: null, next: null,
    };

    this.map.set(key, entry);
    this.addToHead(entry);

    if (this.map.size > this.capacity) {
      const evicted = this.removeTail();
      if (evicted) {
        this.map.delete(evicted.key);
        this.totalEvictions++;
      }
    }
    return entry;
  }

  isFresh(entry: CacheEntry): boolean {
    const age = process.hrtime.bigint() - entry.fetchedAt;
    return age < entry.ttlNs;
  }

  isStale(entry: CacheEntry): boolean {
    const age = process.hrtime.bigint() - entry.fetchedAt;
    return age >= entry.staleNs && age < entry.ttlNs;
  }

  isExpired(entry: CacheEntry): boolean {
    const age = process.hrtime.bigint() - entry.fetchedAt;
    return age >= entry.ttlNs;
  }

  delete(key: string): boolean {
    const entry = this.map.get(key);
    if (!entry) return false;
    this.removeNode(entry);
    this.map.delete(key);
    return true;
  }

  clear() { this.map.clear(); this.head = null; this.tail = null; }

  stats() {
    return {
      size: this.map.size,
      capacity: this.capacity,
      hits: this.totalHits,
      misses: this.totalMisses,
      evictions: this.totalEvictions,
      hit_rate: this.totalHits + this.totalMisses > 0
        ? ((this.totalHits / (this.totalHits + this.totalMisses)) * 100).toFixed(1) + '%'
        : '0%',
    };
  }

  recordHit()  { this.totalHits++; }
  recordMiss() { this.totalMisses++; }

  private addToHead(e: CacheEntry) {
    e.prev = null; e.next = this.head;
    if (this.head) this.head.prev = e;
    this.head = e;
    if (!this.tail) this.tail = e;
  }

  private moveToHead(e: CacheEntry) { this.removeNode(e); this.addToHead(e); }

  private removeNode(e: CacheEntry) {
    if (e.prev) e.prev.next = e.next; else this.head = e.next;
    if (e.next) e.next.prev = e.prev; else this.tail = e.prev;
    e.prev = null; e.next = null;
  }

  private removeTail(): CacheEntry | null {
    if (!this.tail) return null;
    const t = this.tail;
    this.removeNode(t);
    return t;
  }
}

// ─── 글로벌 싱글톤 ──────────────────────────────────────────────────
const globalCache = new LRUQueryCache(512);

// ─── 캐시 키 생성 ───────────────────────────────────────────────────
function makeCacheKey(funcName: string, args: any[]): string {
  try {
    return `${funcName}::${JSON.stringify(args)}`;
  } catch {
    return `${funcName}::${String(args)}`;
  }
}

// ─── 함수 등록 ──────────────────────────────────────────────────────
export function registerNativeQueryFunctions(registry: NativeFunctionRegistry): void {

  // query_cache_get(key) → value | null
  registry.register({
    name: 'query_cache_get',
    module: 'native_query',
    paramCount: 1,
    executor: (args) => {
      const entry = globalCache.get(String(args[0]));
      if (!entry || globalCache.isExpired(entry)) {
        globalCache.recordMiss();
        return null;
      }
      globalCache.recordHit();
      entry.hits++;
      return entry.value;
    },
  });

  // query_cache_set(key, value, ttl_ms, stale_ms)
  registry.register({
    name: 'query_cache_set',
    module: 'native_query',
    paramCount: 4,
    executor: (args) => {
      globalCache.set(String(args[0]), args[1], Number(args[2]) || 300000, Number(args[3]) || 30000);
      return true;
    },
  });

  // query_cache_del(key) → bool
  registry.register({
    name: 'query_cache_del',
    module: 'native_query',
    paramCount: 1,
    executor: (args) => globalCache.delete(String(args[0])),
  });

  // query_cache_fresh(key) → bool
  registry.register({
    name: 'query_cache_fresh',
    module: 'native_query',
    paramCount: 1,
    executor: (args) => {
      const entry = globalCache.get(String(args[0]));
      return entry ? globalCache.isFresh(entry) : false;
    },
  });

  // query_cache_stale(key) → bool
  registry.register({
    name: 'query_cache_stale',
    module: 'native_query',
    paramCount: 1,
    executor: (args) => {
      const entry = globalCache.get(String(args[0]));
      return entry ? globalCache.isStale(entry) : false;
    },
  });

  // query_cache_stats() → map {size, hits, misses, hit_rate, evictions}
  registry.register({
    name: 'query_cache_stats',
    module: 'native_query',
    paramCount: 0,
    executor: (_args) => globalCache.stats(),
  });

  // query_cache_clear()
  registry.register({
    name: 'query_cache_clear',
    module: 'native_query',
    paramCount: 0,
    executor: (_args) => { globalCache.clear(); return true; },
  });

  // query_make_key(func_name, arg) → string
  registry.register({
    name: 'query_make_key',
    module: 'native_query',
    paramCount: 2,
    executor: (args) => makeCacheKey(
      String(args[0]),
      Array.isArray(args[1]) ? args[1] : [args[1]]
    ),
  });
}

// ─── VM 캐시 인터셉터 (vm.ts에서 직접 호출) ─────────────────────────

export interface CachedQueryConfig {
  ttlMs: number;
  staleMs: number;
}

export function parseCachedQueryAnnot(annot: string): CachedQueryConfig {
  const cfg: CachedQueryConfig = { ttlMs: 300_000, staleMs: 30_000 };
  if (!annot.includes(':')) return cfg;
  const paramStr = annot.slice(annot.indexOf(':') + 1);
  paramStr.split(',').forEach(kv => {
    const [k, v] = kv.split('=');
    if (!k || !v) return;
    const num = Number(v.trim());
    if (k.trim() === 'ttl')   cfg.ttlMs   = num;
    if (k.trim() === 'stale') cfg.staleMs = num;
  });
  return cfg;
}

export function cacheQueryBefore(
  funcName: string,
  args: any[],
  annot: string
): { hit: true; value: any } | { hit: false; key: string; cfg: CachedQueryConfig } {
  const cfg = parseCachedQueryAnnot(annot);
  const key = makeCacheKey(funcName, args);
  const entry = globalCache.get(key);

  if (entry && !globalCache.isExpired(entry)) {
    globalCache.recordHit();
    entry.hits++;
    return { hit: true, value: entry.value };
  }

  globalCache.recordMiss();
  return { hit: false, key, cfg };
}

export function cacheQueryAfter(key: string, value: any, cfg: CachedQueryConfig): void {
  globalCache.set(key, value, cfg.ttlMs, cfg.staleMs);
}

export function getQueryCacheStats() { return globalCache.stats(); }
