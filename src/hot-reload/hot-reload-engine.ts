/**
 * FreeLang v2 - Native-Hot-Reload Engine
 * Nodemon 완전 대체: 프로세스 재시작 없이 @hot 함수만 교체
 *
 * 동작 원리:
 *   fs.watch → 파일 변경 감지 → 재파싱 → @hot 함수 추출
 *   → FunctionRegistry.register() 덮어쓰기 → VM이 다음 호출 시 새 버전 실행
 *
 * State는 보존됨: var/stack/callStack 유지, 함수 body만 교체
 */

import * as fs from 'fs';
import * as path from 'path';
import { FunctionRegistry, FunctionDefinition } from '../parser/function-registry';
import { Lexer, TokenBuffer } from '../lexer/lexer';
import { Parser } from '../parser/parser';

export interface HotReloadEvent {
  file: string;
  timestamp: number;
  reloadedFunctions: string[];
  skippedFunctions: string[];
  parseError?: string;
  latencyMs: number;
}

export interface HotReloadStats {
  totalReloads: number;
  totalFunctionsPatched: number;
  lastReloadAt: number | null;
  watchedFiles: string[];
  hotFunctions: string[];
  events: HotReloadEvent[];
}

/**
 * 파일 변경 디바운서: 연속 저장 이벤트 병합 (기본 80ms)
 */
class Debouncer {
  private timer: ReturnType<typeof setTimeout> | null = null;
  constructor(private readonly delayMs: number = 80) {}

  call(fn: () => void): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.timer = null; fn(); }, this.delayMs);
  }
}

/**
 * Indirection Jump Table: @hot 함수의 현재 활성 버전을 추적
 * VM은 항상 registry.lookup()으로 최신 버전 조회 → 자동 반영
 */
export class HotFunctionTable {
  // 함수명 → 현재 활성 버전 번호
  private versions: Map<string, number> = new Map();
  // 함수명 → 소속 파일
  private fileMap: Map<string, string> = new Map();

  markHot(name: string, file: string): void {
    this.fileMap.set(name, file);
    if (!this.versions.has(name)) this.versions.set(name, 0);
  }

  bumpVersion(name: string): number {
    const next = (this.versions.get(name) ?? 0) + 1;
    this.versions.set(name, next);
    return next;
  }

  isHot(name: string): boolean {
    return this.versions.has(name);
  }

  getVersion(name: string): number {
    return this.versions.get(name) ?? 0;
  }

  getFile(name: string): string | undefined {
    return this.fileMap.get(name);
  }

  allHotNames(): string[] {
    return Array.from(this.versions.keys());
  }
}

/**
 * Native-Hot-Reload Engine
 * fs.watch 기반 파일 감시 + 증분 재컴파일 + FunctionRegistry 패치
 */
export class HotReloadEngine {
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private debouncers: Map<string, Debouncer> = new Map();
  private jumpTable = new HotFunctionTable();
  private stats: HotReloadStats = {
    totalReloads: 0,
    totalFunctionsPatched: 0,
    lastReloadAt: null,
    watchedFiles: [],
    hotFunctions: [],
    events: [],
  };
  private onReloadCallbacks: Array<(event: HotReloadEvent) => void> = [];

  constructor(private readonly registry: FunctionRegistry) {}

  /**
   * 파일 감시 시작
   * @param filePath 감시할 .free 파일 절대경로
   */
  watch(filePath: string): void {
    const abs = path.resolve(filePath);
    if (this.watchers.has(abs)) return; // 중복 방지

    // 최초 로드 시 @hot 함수 스캔 (registry에 이미 있다고 가정)
    this.scanHotFunctions(abs);
    this.stats.watchedFiles.push(abs);

    const debouncer = new Debouncer(80);
    this.debouncers.set(abs, debouncer);

    const watcher = fs.watch(abs, { persistent: true }, (eventType) => {
      if (eventType === 'change' || eventType === 'rename') {
        debouncer.call(() => this.reloadFile(abs));
      }
    });

    watcher.on('error', (err) => {
      process.stderr.write(`[HotReload] watch error on ${abs}: ${err.message}\n`);
    });

    this.watchers.set(abs, watcher);
    process.stdout.write(`[HotReload] Watching: ${path.basename(abs)}\n`);
  }

  /**
   * 모든 감시 중지
   */
  stopAll(): void {
    for (const [file, watcher] of this.watchers) {
      watcher.close();
      process.stdout.write(`[HotReload] Stopped watching: ${path.basename(file)}\n`);
    }
    this.watchers.clear();
    this.debouncers.clear();
  }

  /**
   * 리로드 완료 콜백 등록
   */
  onReload(cb: (event: HotReloadEvent) => void): void {
    this.onReloadCallbacks.push(cb);
  }

  /**
   * 현재 통계 조회
   */
  getStats(): Readonly<HotReloadStats> {
    this.stats.hotFunctions = this.jumpTable.allHotNames();
    return this.stats;
  }

  /**
   * @hot 함수 이름 목록 (현재 jump table)
   */
  getHotFunctions(): string[] {
    return this.jumpTable.allHotNames();
  }

  // ─── private ───────────────────────────────────────────────────────────────

  /**
   * 파일에서 @hot 어노테이션이 붙은 함수 초기 스캔
   */
  private scanHotFunctions(filePath: string): void {
    try {
      const source = fs.readFileSync(filePath, 'utf8');
      const parsed = this.parseSource(source);
      if (!parsed) return;

      for (const stmt of parsed) {
        if (stmt?.type === 'function' && this.isHotAnnotated(stmt)) {
          this.jumpTable.markHot(stmt.name, filePath);
        }
      }
    } catch {
      // 초기 스캔 실패는 무시 (watch는 계속)
    }
  }

  /**
   * 파일 변경 시 증분 재컴파일 + registry 패치
   * Graceful-Transition: 재파싱 실패 시 기존 버전 유지 (무중단)
   */
  private reloadFile(filePath: string): void {
    const t0 = Date.now();
    const reloaded: string[] = [];
    const skipped: string[] = [];
    let parseError: string | undefined;

    let source: string;
    try {
      source = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      parseError = `파일 읽기 실패: ${(err as Error).message}`;
      this.emitEvent({ file: filePath, timestamp: t0, reloadedFunctions: [], skippedFunctions: [], parseError, latencyMs: Date.now() - t0 });
      return;
    }

    let statements: any[] | null;
    try {
      statements = this.parseSource(source);
    } catch (err) {
      parseError = (err as Error).message;
      // Graceful-Transition: 파싱 에러 → 기존 함수 유지, 로그만 출력
      process.stderr.write(`[HotReload] 파싱 에러 (기존 버전 유지): ${parseError}\n`);
      this.emitEvent({ file: filePath, timestamp: t0, reloadedFunctions: [], skippedFunctions: [], parseError, latencyMs: Date.now() - t0 });
      return;
    }

    if (!statements) return;

    // @hot 함수만 registry 패치 (비-@hot 함수는 건드리지 않음)
    for (const stmt of statements) {
      if (stmt?.type !== 'function') continue;

      const isHot = this.isHotAnnotated(stmt);
      const wasHot = this.jumpTable.isHot(stmt.name);

      if (isHot || wasHot) {
        // @hot이 새로 붙었거나 기존 @hot 함수
        this.jumpTable.markHot(stmt.name, filePath);
        const ver = this.jumpTable.bumpVersion(stmt.name);

        const def: FunctionDefinition = {
          type: 'FunctionDefinition',
          name: stmt.name,
          params: stmt.params?.map((p: any) => p.name) || [],
          body: stmt.body,
          annotations: stmt.annotations || [],
          async: stmt.async,
          returnType: stmt.returnType,
          paramTypes: stmt.paramTypes,
        };

        this.registry.register(def);
        reloaded.push(`${stmt.name}@v${ver}`);
      } else {
        skipped.push(stmt.name);
      }
    }

    const latencyMs = Date.now() - t0;
    this.stats.totalReloads++;
    this.stats.totalFunctionsPatched += reloaded.length;
    this.stats.lastReloadAt = Date.now();

    if (reloaded.length > 0) {
      process.stdout.write(
        `[HotReload] ${path.basename(filePath)} → 교체: [${reloaded.join(', ')}] (${latencyMs}ms)\n`
      );
    } else {
      process.stdout.write(
        `[HotReload] ${path.basename(filePath)} 변경됨 (교체할 @hot 함수 없음, ${latencyMs}ms)\n`
      );
    }

    this.emitEvent({ file: filePath, timestamp: t0, reloadedFunctions: reloaded, skippedFunctions: skipped, parseError, latencyMs });
  }

  /**
   * Lexer → Parser → AST statements 배열 반환
   */
  private parseSource(source: string): any[] | null {
    const lexer = new Lexer(source);
    const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: false });
    const parser = new Parser(tokenBuffer);
    const module = parser.parseModule() as any;
    return module?.statements || null;
  }

  /**
   * stmt에 @hot 어노테이션이 있는지 확인
   */
  private isHotAnnotated(stmt: any): boolean {
    const annotations: string[] = stmt?.annotations || [];
    return annotations.some((a: string) => a === 'hot' || a.startsWith('hot:'));
  }

  private emitEvent(event: HotReloadEvent): void {
    this.stats.events.push(event);
    if (this.stats.events.length > 50) this.stats.events.shift(); // 최근 50개만 유지
    for (const cb of this.onReloadCallbacks) {
      try { cb(event); } catch { /* 콜백 에러 무시 */ }
    }
  }
}
