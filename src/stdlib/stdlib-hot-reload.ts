/**
 * FreeLang v2 - Native-Hot-Reload stdlib 함수
 * FreeLang 코드에서 hot_watch(), server_watch_and_run() 등을 호출 가능하게 함
 *
 * 등록 함수:
 *   hot_watch(file)          - 파일 감시 시작
 *   hot_stop()               - 모든 감시 중지
 *   hot_status()             - 통계 반환 (Map)
 *   hot_functions()          - @hot 함수 이름 목록 (쉼표 구분 string)
 *   hot_version(name)        - 특정 함수의 현재 버전 번호
 *   server_watch_and_run(file) - HTTP 서버 + 파일 감시 동시 시작
 */

import { NativeFunctionRegistry } from '../vm/native-function-registry';
import { HotReloadEngine } from '../hot-reload/hot-reload-engine';
import * as path from 'path';

// 전역 엔진 인스턴스 (ProgramRunner가 init 시 설정)
let globalEngine: HotReloadEngine | null = null;

export function setGlobalHotReloadEngine(engine: HotReloadEngine): void {
  globalEngine = engine;
}

export function registerHotReloadFunctions(
  registry: NativeFunctionRegistry,
  engine?: HotReloadEngine
): void {
  if (engine) globalEngine = engine;

  // hot_watch(file: string) → string
  registry.register({
    name: 'hot_watch',
    module: 'hot_reload',
    executor: (args: any[]) => {
      if (!globalEngine) return 'error:not_initialized';
      const file = String(args[0] ?? '');
      if (!file) return 'error:no_file';
      const abs = path.resolve(file);
      globalEngine.watch(abs);
      return `watching:${abs}`;
    },
  });

  // hot_stop() → string
  registry.register({
    name: 'hot_stop',
    module: 'hot_reload',
    executor: (_args: any[]) => {
      if (!globalEngine) return 'not_initialized';
      globalEngine.stopAll();
      return 'stopped';
    },
  });

  // hot_status() → Map
  registry.register({
    name: 'hot_status',
    module: 'hot_reload',
    executor: (_args: any[]) => {
      if (!globalEngine) return new Map([['error', 'not_initialized']]);
      const s = globalEngine.getStats();
      return new Map<string, any>([
        ['total_reloads', s.totalReloads],
        ['total_patched', s.totalFunctionsPatched],
        ['last_reload_at', s.lastReloadAt ?? 0],
        ['watched_files', s.watchedFiles.length],
        ['hot_functions', s.hotFunctions.join(',')],
      ]);
    },
  });

  // hot_functions() → string (쉼표 구분)
  registry.register({
    name: 'hot_functions',
    module: 'hot_reload',
    executor: (_args: any[]) => {
      if (!globalEngine) return '';
      return globalEngine.getHotFunctions().join(',');
    },
  });

  // hot_version(name: string) → number
  registry.register({
    name: 'hot_version',
    module: 'hot_reload',
    executor: (args: any[]) => {
      if (!globalEngine) return 0;
      const name = String(args[0] ?? '');
      const stats = globalEngine.getStats();
      let ver = 0;
      for (const ev of stats.events) {
        for (const fn of ev.reloadedFunctions) {
          if (fn.startsWith(name + '@v')) {
            const m = fn.match(/@v(\d+)$/);
            if (m) ver = Math.max(ver, parseInt(m[1], 10));
          }
        }
      }
      return ver;
    },
  });

  // server_watch_and_run(file: string) → string
  registry.register({
    name: 'server_watch_and_run',
    module: 'hot_reload',
    executor: (args: any[]) => {
      if (!globalEngine) return 'error:not_initialized';
      const file = String(args[0] ?? '');
      if (file) {
        const abs = path.resolve(file);
        globalEngine.watch(abs);
        process.stdout.write(`[HotReload] Native-Dev-Mode 활성: ${path.basename(abs)} 감시 중\n`);
      }
      return 'dev_mode:on';
    },
  });
}
