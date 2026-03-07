/**
 * FreeLang v2 - parallel_map / await_all 키워드 코드젠
 *
 * FreeLang 소스의 parallel_map / await_all 키워드를
 * VM IR(Instruction)로 변환한다.
 *
 * parallel_map(items, concurrency: N) { id => expr }
 *   → PUSH items
 *     PUSH N
 *     PUSH <closure_id>   // 람다를 클로저로 등록
 *     CALL_NATIVE parallel_map
 *
 * await_all([expr1, expr2, ...])
 *   → PUSH [expr1, expr2, ...]
 *     CALL_NATIVE await_all
 *
 * Phase 27: Native-Async-Orchestrator
 */

import { Op, Inst } from '../types';

// ═══════════════════════════════════════════════════════════════
// AST 노드 정의
// ═══════════════════════════════════════════════════════════════

export interface ParallelMapNode {
  type: 'parallel-map';
  items: any;          // 배열 표현식
  concurrency: number; // 동시성 제한 (기본 0 = 무제한)
  param: string;       // 람다 파라미터명
  body: any;           // 람다 바디 표현식
}

export interface AwaitAllNode {
  type: 'await-all';
  promises: any[];     // Promise 표현식 목록
  failFast?: boolean;  // 기본 true
}

export interface AwaitRaceNode {
  type: 'await-race';
  promises: any[];
}

export interface AsyncPipelineNode {
  type: 'async-pipeline';
  initial: any;
  stages: any[];
}

// ═══════════════════════════════════════════════════════════════
// 코드 생성기
// ═══════════════════════════════════════════════════════════════

export class ParallelCodegen {
  private nextClosureId = 10000; // 클로저 ID 공간 (일반 함수와 분리)
  private closureRegistry = new Map<number, { param: string; body: any }>();

  /**
   * parallel_map 노드 → IR 명령어 배열
   *
   * 생성 패턴:
   *   PUSH items
   *   PUSH concurrency
   *   PUSH closure_id
   *   CALL_NATIVE parallel_map 3
   */
  generateParallelMap(node: ParallelMapNode, emitExpr: (ast: any) => Inst[]): Inst[] {
    const insts: Inst[] = [];

    // 1) items 표현식 평가
    insts.push(...emitExpr(node.items));

    // 2) 동시성 상수 push
    insts.push({ op: Op.PUSH, arg: node.concurrency });

    // 3) 람다 클로저 등록 → ID push
    const closureId = this.nextClosureId++;
    this.closureRegistry.set(closureId, { param: node.param, body: node.body });
    insts.push({ op: Op.PUSH, arg: closureId });

    // 4) 네이티브 함수 호출: Op.CALL + arg=함수명
    //    VM은 CALL 명령어에서 nativeFunctionRegistry 먼저 탐색
    insts.push({ op: Op.CALL, arg: 'parallel_map' });

    return insts;
  }

  /**
   * await_all 노드 → IR 명령어 배열
   *
   * 생성 패턴:
   *   ARR_NEW
   *   PUSH promise_expr_1  → ARR_PUSH
   *   PUSH promise_expr_2  → ARR_PUSH
   *   ...
   *   CALL await_all
   */
  generateAwaitAll(node: AwaitAllNode, emitExpr: (ast: any) => Inst[]): Inst[] {
    const insts: Inst[] = [];

    // 빈 배열 생성
    insts.push({ op: Op.ARR_NEW, arg: 'await_all_args' });

    // 각 promise 표현식 평가 후 배열에 삽입
    for (const p of node.promises) {
      insts.push(...emitExpr(p));
      insts.push({ op: Op.ARR_PUSH });
    }

    // 배열 로드 후 배리어 동기화 호출
    insts.push({ op: Op.LOAD, arg: 'await_all_args' });
    insts.push({ op: Op.CALL, arg: 'await_all' });

    return insts;
  }

  /**
   * await_race 노드 → IR
   */
  generateAwaitRace(node: AwaitRaceNode, emitExpr: (ast: any) => Inst[]): Inst[] {
    const insts: Inst[] = [];

    insts.push({ op: Op.ARR_NEW, arg: 'await_race_args' });
    for (const p of node.promises) {
      insts.push(...emitExpr(p));
      insts.push({ op: Op.ARR_PUSH });
    }
    insts.push({ op: Op.LOAD, arg: 'await_race_args' });
    insts.push({ op: Op.CALL, arg: 'await_race' });

    return insts;
  }

  /**
   * async_pipeline 노드 → IR
   */
  generateAsyncPipeline(node: AsyncPipelineNode, emitExpr: (ast: any) => Inst[]): Inst[] {
    const insts: Inst[] = [];

    // 초기값
    insts.push(...emitExpr(node.initial));

    // 각 스테이지 (함수 레퍼런스 문자열 push)
    for (const stage of node.stages) {
      insts.push(...emitExpr(stage));
    }

    // async_pipeline(initial, stage1, stage2, ...) 호출
    // VM의 CALL 핸들러가 native registry에서 탐색
    insts.push({ op: Op.CALL, arg: 'async_pipeline' });

    return insts;
  }

  /**
   * 등록된 클로저 정보 반환 (VM이 클로저 실행 시 참조)
   */
  getClosureBody(closureId: number): { param: string; body: any } | null {
    return this.closureRegistry.get(closureId) ?? null;
  }

  /**
   * 전체 클로저 목록 (디버그용)
   */
  listClosures(): number[] {
    return Array.from(this.closureRegistry.keys());
  }
}

// ═══════════════════════════════════════════════════════════════
// 파서 확장 헬퍼 - FreeLang 소스에서 parallel_map 파싱
// ═══════════════════════════════════════════════════════════════

/**
 * parallel_map 토큰 패턴 감지
 *
 * 문법:
 *   parallel_map(EXPR, concurrency: NUMBER) { PARAM => BODY }
 *   parallel_map(EXPR) { PARAM => BODY }
 */
export function isParallelMapCall(tokenName: string): boolean {
  return tokenName === 'parallel_map';
}

/**
 * await_all 토큰 패턴 감지
 *
 * 문법:
 *   await_all([expr1, expr2, ...])
 *   await_all([expr1, expr2, ...], false)  // failFast=false
 */
export function isAwaitAllCall(tokenName: string): boolean {
  return tokenName === 'await_all';
}

/**
 * 비동기 오케스트레이터 키워드 전체 목록
 */
export const ASYNC_ORCHESTRATOR_KEYWORDS = [
  'parallel_map',
  'await_all',
  'await_race',
  'async_pipeline',
  'async_retry',
  'async_timeout',
  'parallel_filter',
  'parallel_reduce',
  'async_map_batch',
  'work_stealing_stats',
] as const;

export type AsyncOrchestratorKeyword = typeof ASYNC_ORCHESTRATOR_KEYWORDS[number];

// ═══════════════════════════════════════════════════════════════
// FreeLang 소스 → parallel_map 사용 예시 주석
// ═══════════════════════════════════════════════════════════════
//
// FreeLang v2 문법 (사용 예):
//
//   fn process_item(id) {
//     return net_get("/items/" + id)
//   }
//
//   fn main() {
//     let ids = [1, 2, 3, 4, 5, 6, 7, 8]
//
//     // 동시성 3으로 제한, Work-Stealing 스케줄러 자동 적용
//     let results = parallel_map(ids, 3, process_item)
//
//     // 배리어: 모두 완료될 때까지 대기
//     let all = await_all([fetch_a(), fetch_b(), fetch_c()])
//
//     // 파이프라인
//     let final = async_pipeline(raw_data, parse, validate, save)
//
//     println("완료: " + results.length + "개")
//   }
//
// ═══════════════════════════════════════════════════════════════
