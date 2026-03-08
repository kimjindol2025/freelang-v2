/**
 * FreeLang v2 Phase 5: Dynamic Optimizer
 * Module C: Parallelization Detector
 *
 * 목적: 병렬화 가능 연산 자동 감지
 */

import type { RuntimeMetrics } from './dynamic-profiler';

export interface DependencyGraph {
  nodes: string[]; // 함수/연산 이름
  edges: Array<{
    from: string;
    to: string;
    type: 'data' | 'control' | 'memory';
  }>;
}

export interface ParallelizationOpportunity {
  functionName: string;
  type: 'data-parallel' | 'task-parallel' | 'pipeline';
  independence: number; // 0-1
  dataSize: number; // 처리할 데이터 크기 (예: 배열 크기)
  speedupEstimate: number; // 예상 가속도
  feasibility: 'high' | 'medium' | 'low';
  reason: string;
  estimatedCoreCount: number; // 권장 코어 수
}

/**
 * 병렬화 감지기
 */
export class ParallelizationDetector {
  private dependencyGraphs: Map<string, DependencyGraph> = new Map();
  private callTraces: Map<string, string[][]> = new Map(); // 함수별 호출 시퀀스

  constructor() {}

  /**
   * 의존성 그래프 구축
   * (실제 구현에서는 AST 분석 필요)
   */
  buildDependencyGraph(functionName: string): DependencyGraph {
    // 이미 구축된 그래프가 있으면 반환
    if (this.dependencyGraphs.has(functionName)) {
      return this.dependencyGraphs.get(functionName)!;
    }

    // 기본 그래프 구조 생성
    const graph: DependencyGraph = {
      nodes: [functionName],
      edges: [],
    };

    this.dependencyGraphs.set(functionName, graph);
    return graph;
  }

  /**
   * 병렬화 기회 감지
   */
  detectOpportunities(metrics: RuntimeMetrics[]): ParallelizationOpportunity[] {
    const opportunities: ParallelizationOpportunity[] = [];

    for (const metric of metrics) {
      const opp = this.analyzeFunction(metric);
      if (opp) {
        opportunities.push(opp);
      }
    }

    // 병렬화 가능성 기준 정렬
    opportunities.sort((a, b) => {
      const scoreA = a.speedupEstimate * a.independence;
      const scoreB = b.speedupEstimate * b.independence;
      return scoreB - scoreA;
    });

    return opportunities;
  }

  /**
   * 개별 함수 분석
   */
  private analyzeFunction(metrics: RuntimeMetrics): ParallelizationOpportunity | null {
    const { functionName, callCount, totalTime, avgTime } = metrics;

    // 병렬화 가능성 판단
    const independence = this.estimateIndependence(functionName);
    const dataSize = this.estimateDataSize(metrics);
    const speedupEstimate = this.estimateSpeedup(avgTime, dataSize);
    const feasibility = this.assessFeasibility(independence, speedupEstimate);

    if (feasibility === 'low' && speedupEstimate < 1.5) {
      return null; // 병렬화 이득이 없음
    }

    let type: ParallelizationOpportunity['type'] = 'task-parallel';
    let reason = '';
    let estimatedCoreCount = 1;

    if (dataSize > 1000) {
      type = 'data-parallel';
      reason = `Data-parallel opportunity: ${dataSize} items`;
      estimatedCoreCount = Math.min(8, Math.ceil(Math.sqrt(dataSize / 100)));
    } else if (callCount > 100 && totalTime > 1000) {
      type = 'task-parallel';
      reason = `Task-parallel opportunity: ${callCount} independent calls`;
      estimatedCoreCount = Math.min(4, Math.ceil(Math.log2(callCount)));
    } else if (totalTime > 500 && avgTime > 50) {
      type = 'pipeline';
      reason = `Pipeline opportunity: Sequential computation`;
      estimatedCoreCount = 2;
    }

    return {
      functionName,
      type,
      independence,
      dataSize,
      speedupEstimate,
      feasibility,
      reason,
      estimatedCoreCount,
    };
  }

  /**
   * 독립성 추정 (0-1)
   * - 1.0: 완전 독립적
   * - 0.0: 완전 의존적
   */
  private estimateIndependence(functionName: string): number {
    // 함수 이름 패턴으로 휴리스틱 판단
    if (
      functionName.includes('map') ||
      functionName.includes('filter') ||
      functionName.includes('forEach')
    ) {
      return 0.9; // 배열 처리는 보통 독립적
    }

    if (
      functionName.includes('reduce') ||
      functionName.includes('fold') ||
      functionName.includes('accumulate')
    ) {
      return 0.2; // 누적 연산은 의존적
    }

    if (
      functionName.includes('sort') ||
      functionName.includes('shuffle') ||
      functionName.includes('shuffle')
    ) {
      return 0.4; // 정렬은 부분적 병렬화 가능
    }

    // 기본값
    return 0.5;
  }

  /**
   * 데이터 크기 추정
   */
  private estimateDataSize(metrics: RuntimeMetrics): number {
    // 호출 횟수와 메모리 사용량으로 추정
    const estimatedSize = Math.max(
      metrics.callCount,
      Math.ceil(metrics.memoryUsage / 100) // 100 bytes per item 휴리스틱
    );

    return Math.min(10000, Math.max(1, estimatedSize)); // 1~10000 범위
  }

  /**
   * 가속도 추정
   */
  estimateSpeedup(avgTime: number, dataSize: number): number {
    // Amdahl's law 근사
    // 순차 부분: 20%, 병렬화 가능: 80%
    const sequentialFraction = 0.2;

    // 코어 수 추정 (데이터 크기와 시간으로부터)
    const estimatedCores = Math.min(8, Math.ceil(Math.sqrt(dataSize / 100)));

    // 가속도 계산
    const speedup =
      1 / (sequentialFraction + (1 - sequentialFraction) / estimatedCores);

    // 실제 함수 특성 고려
    if (avgTime > 1000) {
      return speedup * 0.8; // 장시간 실행은 오버헤드 더 유리
    } else if (avgTime < 5) {
      return speedup * 0.3; // 짧은 함수는 오버헤드가 더 비쌈
    }

    return speedup;
  }

  /**
   * 병렬화 실행가능성 평가
   */
  private assessFeasibility(independence: number, speedup: number): ParallelizationOpportunity['feasibility'] {
    if (independence > 0.8 && speedup > 2.0) {
      return 'high';
    } else if (independence > 0.5 && speedup > 1.5) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * 병렬화 계획 생성
   */
  generateParallelPlan(opportunities: ParallelizationOpportunity[]): string {
    if (opportunities.length === 0) {
      return 'No parallelization opportunities detected.';
    }

    let plan = '\n=== PARALLELIZATION PLAN ===\n\n';

    // 우선순위별 정렬
    const sorted = [...opportunities].sort((a, b) => {
      const scoreA = a.speedupEstimate * a.independence;
      const scoreB = b.speedupEstimate * b.independence;
      return scoreB - scoreA;
    });

    for (let i = 0; i < Math.min(5, sorted.length); i++) {
      const opp = sorted[i];
      plan += `[${i + 1}] ${opp.functionName} (${opp.feasibility})\n`;
      plan += `    Type: ${opp.type}\n`;
      plan += `    Independence: ${(opp.independence * 100).toFixed(1)}%\n`;
      plan += `    Estimated Speedup: ${opp.speedupEstimate.toFixed(2)}x\n`;
      plan += `    Recommended Cores: ${opp.estimatedCoreCount}\n`;
      plan += `    Reason: ${opp.reason}\n\n`;
    }

    return plan;
  }

  /**
   * 데이터 독립성 확인
   * 호출 이력 기반으로 입력/출력 의존성 분석
   */
  checkDataIndependence(funcName: string, callHistory: Array<{ args: any[]; result: any }>): boolean {
    if (callHistory.length < 2) return true;

    // 간단한 휴리스틱: 같은 입력으로 다른 결과가 나오면 부작용 있음 (비독립적)
    const inputToResults = new Map<string, Set<any>>();

    for (const call of callHistory) {
      const key = JSON.stringify(call.args);
      if (!inputToResults.has(key)) {
        inputToResults.set(key, new Set());
      }
      inputToResults.get(key)!.add(JSON.stringify(call.result));
    }

    // 동일 입력에 대해 다른 결과가 여러 개면 비독립적
    for (const results of inputToResults.values()) {
      if (results.size > 1) {
        return false;
      }
    }

    return true;
  }

  /**
   * 세부 분석 결과 조회
   */
  getDetailedAnalysis(functionName: string): object | null {
    const graph = this.dependencyGraphs.get(functionName);
    if (!graph) return null;

    return {
      functionName,
      dependencyGraph: graph,
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      dataFlowEdges: graph.edges.filter(e => e.type === 'data').length,
      controlFlowEdges: graph.edges.filter(e => e.type === 'control').length,
      memoryEdges: graph.edges.filter(e => e.type === 'memory').length,
    };
  }

  /**
   * 모든 의존성 그래프 조회
   */
  getAllGraphs(): Map<string, DependencyGraph> {
    return new Map(this.dependencyGraphs);
  }

  /**
   * 데이터 독립성 매트릭스
   */
  getIndependenceMatrix(functionNames: string[]): number[][] {
    const n = functionNames.length;
    const matrix: number[][] = Array(n)
      .fill(0)
      .map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1.0; // 자기 자신과는 독립적
        } else {
          // 간단한 휴리스틱: 이름 유사도가 낮으면 독립적
          const similarity = this.calculateNameSimilarity(
            functionNames[i],
            functionNames[j]
          );
          matrix[i][j] = 1 - similarity;
        }
      }
    }

    return matrix;
  }

  /**
   * 함수명 유사도 계산 (Levenshtein distance)
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    const len1 = name1.length;
    const len2 = name2.length;
    const distance = this.levenshteinDistance(name1, name2);
    const maxLen = Math.max(len1, len2);
    return distance / maxLen;
  }

  /**
   * Levenshtein Distance 계산
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}
