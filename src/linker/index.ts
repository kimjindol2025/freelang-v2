/**
 * KPM-Linker: Public API
 *
 * FreeLang 컴파일러 내장 링커
 * - DependencyGraph: 의존성 분석 + DCE
 * - ModuleLinker: 다중 모듈 → 단일 바이너리
 */

export { DependencyGraph, GraphNode, DCEResult, CircularDependencyError } from './dependency-graph';
export { ModuleLinker, LinkResult, LinkOptions } from './module-linker';
