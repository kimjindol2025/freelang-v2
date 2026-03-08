/**
 * KPM-Linker: Dependency Graph
 *
 * 모듈 의존성 그래프 생성, 순환 참조 차단, Dead Code Elimination (DCE)
 * Webpack의 Tree Shaking을 넘어서는 컴파일 타임 코드 제거
 */

import * as path from 'path';
import { ModuleResolver, ExportSymbol } from '../module/module-resolver';
import { Module } from '../parser/ast';

/**
 * 의존성 그래프 노드
 */
export interface GraphNode {
  id: string;             // 절대 경로 (고유 키)
  module: Module;
  imports: string[];      // 이 모듈이 가져오는 모듈 ID들
  importedBy: string[];   // 이 모듈을 가져오는 모듈 ID들
  exports: ExportSymbol[];
  usedSymbols: Set<string>;    // 실제 사용되는 심볼
  isEntryPoint: boolean;
  isPackage: boolean;     // KPM 패키지인지
  packageName?: string;   // KPM 패키지 이름
  size: number;           // 원본 소스 크기 (bytes)
}

/**
 * DCE 결과
 */
export interface DCEResult {
  totalSymbols: number;
  usedSymbols: number;
  eliminatedSymbols: number;
  eliminatedNodes: string[];      // 완전히 제거된 모듈
  reductionPercent: number;
}

/**
 * 순환 참조 오류
 */
export class CircularDependencyError extends Error {
  public readonly cycle: string[];

  constructor(cycle: string[]) {
    const shortNames = cycle.map(p => path.basename(p, '.fl'));
    super(`순환 의존성 감지: ${shortNames.join(' → ')}`);
    this.cycle = cycle;
    this.name = 'CircularDependencyError';
  }
}

/**
 * 의존성 그래프 빌더
 */
export class DependencyGraph {
  private nodes: Map<string, GraphNode> = new Map();
  private resolver: ModuleResolver;
  private topologicalOrder: string[] = [];

  constructor(resolver: ModuleResolver) {
    this.resolver = resolver;
  }

  /**
   * 엔트리 포인트부터 전체 의존성 그래프 빌드
   */
  build(entryPath: string): void {
    this.nodes.clear();
    this.topologicalOrder = [];

    // 재귀적으로 모듈 로드
    this._loadRecursive(entryPath, [], true);

    // 위상 정렬 (순환 참조 시 에러)
    this._topologicalSort();
  }

  /**
   * 재귀적 모듈 로드
   */
  private _loadRecursive(modulePath: string, stack: string[], isEntry: boolean): void {
    const resolved = path.resolve(modulePath);

    // 이미 처리된 노드
    if (this.nodes.has(resolved)) return;

    // 순환 참조 감지
    const cycleIdx = stack.indexOf(resolved);
    if (cycleIdx !== -1) {
      throw new CircularDependencyError([...stack.slice(cycleIdx), resolved]);
    }

    // 모듈 로드
    const mod = this.resolver.loadModule(resolved);

    // 노드 생성
    const node: GraphNode = {
      id: resolved,
      module: mod,
      imports: [],
      importedBy: [],
      exports: this.resolver.getExports(mod),
      usedSymbols: new Set(),
      isEntryPoint: isEntry,
      isPackage: resolved.includes('fl_modules'),
      size: 0,
    };

    // 패키지 이름 추출
    if (node.isPackage) {
      const parts = resolved.split('fl_modules/');
      if (parts.length > 1) {
        node.packageName = parts[1].split('/')[0];
      }
    }

    this.nodes.set(resolved, node);

    // import 처리
    const newStack = [...stack, resolved];
    for (const imp of mod.imports) {
      try {
        const depPath = this.resolver.resolveModulePath(resolved, imp.from);
        const depResolved = path.resolve(depPath);
        node.imports.push(depResolved);

        // 재귀 로드
        this._loadRecursive(depResolved, newStack, false);

        // 역참조 등록
        const depNode = this.nodes.get(depResolved);
        if (depNode) {
          depNode.importedBy.push(resolved);
        }

        // 사용 심볼 수집
        if (imp.imports && imp.imports.length > 0) {
          for (const spec of imp.imports) {
            node.usedSymbols.add(spec.name);
          }
        } else if (imp.isNamespace) {
          // import * as alias → 전체 모듈 사용
          const depExports = this.resolver.getExports(
            this.resolver.loadModule(depResolved)
          );
          for (const exp of depExports) {
            node.usedSymbols.add(exp.name);
          }
        }
      } catch {
        // 해석 실패한 모듈은 스킵 (런타임에서 처리)
      }
    }
  }

  /**
   * 위상 정렬 (Kahn's algorithm)
   */
  private _topologicalSort(): void {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];

    // 초기 in-degree 계산
    for (const [id, node] of this.nodes) {
      inDegree.set(id, node.imports.filter(i => this.nodes.has(i)).length);
      if (inDegree.get(id) === 0) {
        queue.push(id);
      }
    }

    this.topologicalOrder = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      this.topologicalOrder.push(current);

      const node = this.nodes.get(current)!;
      for (const dependant of node.importedBy) {
        const deg = (inDegree.get(dependant) || 1) - 1;
        inDegree.set(dependant, deg);
        if (deg === 0) {
          queue.push(dependant);
        }
      }
    }

    // 위상 정렬 불완전 = 순환 참조 (이미 _loadRecursive에서 잡히지만 이중 안전장치)
    if (this.topologicalOrder.length !== this.nodes.size) {
      const missing = [...this.nodes.keys()].filter(
        k => !this.topologicalOrder.includes(k)
      );
      throw new CircularDependencyError(missing);
    }
  }

  /**
   * Dead Code Elimination
   *
   * 엔트리 포인트에서 도달 가능한 심볼만 남기고 나머지 제거
   */
  eliminateDeadCode(): DCEResult {
    let totalSymbols = 0;
    const reachable = new Set<string>();  // "moduleId::symbolName" 형식

    // 1단계: 엔트리 포인트의 모든 심볼은 reachable
    for (const [id, node] of this.nodes) {
      totalSymbols += node.exports.length;
      if (node.isEntryPoint) {
        for (const exp of node.exports) {
          reachable.add(`${id}::${exp.name}`);
        }
        // 엔트리 포인트의 비-export 코드도 reachable
        totalSymbols += 1; // main scope
        reachable.add(`${id}::__main__`);
      }
    }

    // 2단계: import 체인 따라가며 사용되는 심볼 마킹
    let changed = true;
    while (changed) {
      changed = false;
      for (const [id, node] of this.nodes) {
        for (const depId of node.imports) {
          const depNode = this.nodes.get(depId);
          if (!depNode) continue;

          for (const symbolName of node.usedSymbols) {
            const key = `${depId}::${symbolName}`;
            if (!reachable.has(key) && depNode.exports.some(e => e.name === symbolName)) {
              reachable.add(key);
              changed = true;
            }
          }
        }
      }
    }

    // 3단계: 사용되지 않는 모듈 식별
    const eliminatedNodes: string[] = [];
    for (const [id, node] of this.nodes) {
      if (node.isEntryPoint) continue;
      const hasReachableSymbol = node.exports.some(
        e => reachable.has(`${id}::${e.name}`)
      );
      if (!hasReachableSymbol) {
        eliminatedNodes.push(id);
      }
    }

    const usedSymbols = reachable.size;
    const eliminatedSymbols = totalSymbols - usedSymbols;

    return {
      totalSymbols,
      usedSymbols,
      eliminatedSymbols,
      eliminatedNodes,
      reductionPercent: totalSymbols > 0
        ? Math.round((eliminatedSymbols / totalSymbols) * 100)
        : 0,
    };
  }

  /**
   * 위상 정렬 순서로 노드 반환 (의존성 먼저)
   */
  getLinkedOrder(): GraphNode[] {
    return this.topologicalOrder
      .map(id => this.nodes.get(id)!)
      .filter(Boolean);
  }

  /**
   * 전체 노드 수
   */
  getNodeCount(): number {
    return this.nodes.size;
  }

  /**
   * 노드 가져오기
   */
  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * 모든 노드 반환
   */
  getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * 의존성 그래프를 텍스트로 시각화
   */
  visualize(): string {
    const lines: string[] = ['=== Dependency Graph ==='];
    for (const node of this.getLinkedOrder()) {
      const name = path.basename(node.id, '.fl');
      const tag = node.isEntryPoint ? ' [ENTRY]' : node.isPackage ? ` [PKG:${node.packageName}]` : '';
      const deps = node.imports.map(i => path.basename(i, '.fl')).join(', ');
      lines.push(`  ${name}${tag} → [${deps}] (exports: ${node.exports.length})`);
    }
    lines.push(`Total: ${this.nodes.size} modules`);
    return lines.join('\n');
  }
}
