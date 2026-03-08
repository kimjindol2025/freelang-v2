/**
 * FreeLang v2 - Self-Profiling Builtin Functions
 *
 * @profile 어노테이션이 붙은 함수에 VM이 자동 주입하는 빌트인.
 * NativeFunctionRegistry를 통해 VM에 등록됨.
 *
 * 등록 함수 목록 (10개):
 *   profiler_enter(fnName)             - 함수 진입 (RDTSC 기록) [1 param]
 *   profiler_exit(fnName)              - 함수 종료 + 측정 [1 param]
 *   profiler_enable(rate_ms)           - 활성화 + 샘플링 레이트 설정 [1 param]
 *   profiler_disable()                 - 비활성화 [0 params]
 *   profiler_report()                  - ASCII Flame Graph 터미널 출력 [0 params]
 *   profiler_json()                    - JSON 리포트 반환 [0 params]
 *   profiler_flame_json()              - D3 호환 Flame Graph JSON [0 params]
 *   profiler_folded_stacks()           - folded stacks 문자열 반환 [0 params]
 *   profiler_save(path)                - JSON 파일로 저장 [1 param]
 *   profiler_send_gogs(url, token)     - Gogs HTTP POST [2 params]
 */

import { NativeFunctionRegistry } from '../vm/native-function-registry';
import { SelfProfiler } from '../runtime/self-profiler';

export function registerProfilerFunctions(registry: NativeFunctionRegistry): void {
  const profiler = SelfProfiler.instance;

  // ── profiler_enter(fnName) [1 param] ─────────────────────────────
  registry.register({
    name: 'profiler_enter',
    module: 'profiler',
    paramCount: 1,
    executor: (args) => {
      profiler.enter(String(args[0] ?? 'unknown'));
      return null;
    }
  });

  // ── profiler_exit(fnName) [1 param] ──────────────────────────────
  registry.register({
    name: 'profiler_exit',
    module: 'profiler',
    paramCount: 1,
    executor: (args) => {
      profiler.exit(String(args[0] ?? 'unknown'));
      return null;
    }
  });

  // ── profiler_enable(rate_ms) [1 param] ───────────────────────────
  registry.register({
    name: 'profiler_enable',
    module: 'profiler',
    paramCount: 1,
    executor: (args) => {
      const rateMs = typeof args[0] === 'number' ? args[0] : 10;
      profiler.enable(rateMs, 'both');
      return null;
    }
  });

  // ── profiler_disable() [0 params] ────────────────────────────────
  registry.register({
    name: 'profiler_disable',
    module: 'profiler',
    paramCount: 0,
    executor: (_args) => {
      profiler.disable();
      return null;
    }
  });

  // ── profiler_report() [0 params] ─────────────────────────────────
  registry.register({
    name: 'profiler_report',
    module: 'profiler',
    paramCount: 0,
    executor: (_args) => {
      profiler.printReport();
      return null;
    }
  });

  // ── profiler_json() [0 params] → string ──────────────────────────
  registry.register({
    name: 'profiler_json',
    module: 'profiler',
    paramCount: 0,
    executor: (_args) => {
      return JSON.stringify(profiler.toJSON(), null, 2);
    }
  });

  // ── profiler_flame_json() [0 params] → string ────────────────────
  registry.register({
    name: 'profiler_flame_json',
    module: 'profiler',
    paramCount: 0,
    executor: (_args) => {
      return JSON.stringify(profiler.toFlameJSON(), null, 2);
    }
  });

  // ── profiler_folded_stacks() [0 params] → string ─────────────────
  registry.register({
    name: 'profiler_folded_stacks',
    module: 'profiler',
    paramCount: 0,
    executor: (_args) => {
      return profiler.toFoldedStacks();
    }
  });

  // ── profiler_save(path) [1 param] ────────────────────────────────
  registry.register({
    name: 'profiler_save',
    module: 'profiler',
    paramCount: 1,
    executor: (args) => {
      const outputPath = String(args[0] ?? '/tmp/freelang-profile.json');
      profiler.saveFlameJSON(outputPath);
      return outputPath;
    }
  });

  // ── profiler_send_gogs(url, token) [2 params] ────────────────────
  registry.register({
    name: 'profiler_send_gogs',
    module: 'profiler',
    paramCount: 2,
    executor: (args) => {
      const url = String(args[0] ?? '');
      const token = String(args[1] ?? '');
      if (!url) return 'error: url required';
      // 비동기이지만 executor는 동기 → Promise 반환 (VM이 SimplePromise로 처리)
      return profiler.sendToGogs(url, token)
        .then(result => result)
        .catch(err => `error: ${err.message}`);
    }
  });
}
