/**
 * FreeLang v2 - Insight Builtin Functions
 *
 * @monitor 어노테이션이 붙은 함수에 컴파일러가 자동 주입하는 빌트인.
 * VM의 CALL 명령어를 통해 호출됨.
 *
 * 등록 함수 목록 (9개):
 *   insight_enter(fnName)         - 함수 진입 기록 [1 param]
 *   insight_exit(fnName)          - 함수 종료 + 측정 [1 param]
 *   insight_report()              - 터미널 리포트 출력 [0 params]
 *   insight_json()                - JSON 리포트 반환 [0 params]
 *   insight_start_dashboard(port) - 내장 HTTP 대시보드 시작 [1 param]
 *   insight_stop_dashboard()      - 대시보드 중지 [0 params]
 *   insight_enable()              - 모니터링 활성화 [0 params]
 *   insight_disable()             - 모니터링 비활성화 [0 params]
 *   insight_send_gogs(url, token) - Gogs에 리포트 전송 [2 params]
 *
 * 주의: paramCount를 명시적으로 설정 (executor.length 오버라이드)
 */

import { NativeFunctionRegistry } from '../vm/native-function-registry';
import { InsightEngine } from '../runtime/insight-engine';

export function registerInsightFunctions(registry: NativeFunctionRegistry): void {
  const engine = InsightEngine.instance;

  // ── insight_enter(fnName) [1 param] ──────────────────────────────
  registry.register({
    name: 'insight_enter',
    module: 'insight',
    paramCount: 1,
    executor: (args) => {
      engine.enter(String(args[0] ?? 'unknown'));
      return null;
    }
  });

  // ── insight_exit(fnName) [1 param] ───────────────────────────────
  registry.register({
    name: 'insight_exit',
    module: 'insight',
    paramCount: 1,
    executor: (args) => {
      engine.exit(String(args[0] ?? 'unknown'));
      return null;
    }
  });

  // ── insight_report() [0 params] ──────────────────────────────────
  registry.register({
    name: 'insight_report',
    module: 'insight',
    paramCount: 0,
    executor: (_args) => {
      engine.printReport();
      return null;
    }
  });

  // ── insight_json() [0 params] → string ───────────────────────────
  registry.register({
    name: 'insight_json',
    module: 'insight',
    paramCount: 0,
    executor: (_args) => {
      return JSON.stringify(engine.toJSON(), null, 2);
    }
  });

  // ── insight_start_dashboard(port) [1 param] ──────────────────────
  registry.register({
    name: 'insight_start_dashboard',
    module: 'insight',
    paramCount: 1,
    executor: (args) => {
      const port = typeof args[0] === 'number' ? args[0] : 9999;
      engine.startDashboard(port);
      return port;
    }
  });

  // ── insight_stop_dashboard() [0 params] ──────────────────────────
  registry.register({
    name: 'insight_stop_dashboard',
    module: 'insight',
    paramCount: 0,
    executor: (_args) => {
      engine.stopDashboard();
      return null;
    }
  });

  // ── insight_enable() [0 params] ──────────────────────────────────
  registry.register({
    name: 'insight_enable',
    module: 'insight',
    paramCount: 0,
    executor: (_args) => {
      engine.enable();
      return null;
    }
  });

  // ── insight_disable() [0 params] ─────────────────────────────────
  registry.register({
    name: 'insight_disable',
    module: 'insight',
    paramCount: 0,
    executor: (_args) => {
      engine.disable();
      return null;
    }
  });

  // ── insight_send_gogs(url, token) [2 params] ─────────────────────
  registry.register({
    name: 'insight_send_gogs',
    module: 'insight',
    paramCount: 2,
    executor: (args) => {
      const url   = String(args[0] ?? '');
      const token = String(args[1] ?? '');
      if (!url) return 'error:no_url';
      engine.sendToGogs(url, token).catch(() => {});
      return 'sent';
    }
  });
}
