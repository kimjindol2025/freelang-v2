/**
 * KPM-Linker: Module Linker
 *
 * 다중 모듈을 단일 C 코드로 병합 + 심볼 인라이닝 + LTO
 * Webpack 없이 FreeLang 컴파일러가 직접 정적 링크 수행
 */

import * as path from 'path';
import * as fs from 'fs';
import { Lexer, TokenBuffer } from '../lexer/lexer';
import { Parser } from '../parser/parser';
import { IRGenerator } from '../codegen/ir-generator';
import { IRToCGenerator } from '../codegen/ir-to-c';
import { Inst, Op } from '../types';
import { DependencyGraph, GraphNode, DCEResult } from './dependency-graph';
import { ModuleResolver } from '../module/module-resolver';
import { PackageResolver } from '../package/package-resolver';

/**
 * 링크 결과
 */
export interface LinkResult {
  ok: boolean;
  binaryPath?: string;
  cCode?: string;
  modules: number;
  totalSymbols: number;
  dce: DCEResult;
  buildTimeMs: number;
  binarySize?: number;
  error?: string;
}

/**
 * 링크 옵션
 */
export interface LinkOptions {
  entryPoint: string;        // 진입점 .fl 파일
  output?: string;           // 출력 바이너리 경로
  optimize: boolean;         // -O2 최적화
  dce: boolean;              // Dead Code Elimination
  lto: boolean;              // Link Time Optimization (인라이닝)
  target?: string;           // 타겟 (default, termux-aarch64 등)
  emitC?: boolean;           // C 코드 출력
  verbose: boolean;          // 상세 로그
}

const DEFAULT_OPTIONS: LinkOptions = {
  entryPoint: '',
  optimize: true,
  dce: true,
  lto: true,
  verbose: false,
};

/**
 * Module Linker - 핵심 링커
 *
 * 파이프라인:
 * 1. DependencyGraph 빌드 (모든 모듈 수집)
 * 2. DCE (사용하지 않는 코드 제거)
 * 3. 위상 정렬 순서로 IR 생성
 * 4. 모듈 간 심볼 인라이닝 (LTO)
 * 5. 단일 C 코드 병합
 * 6. GCC 컴파일 → 단일 바이너리
 */
export class ModuleLinker {
  private resolver: ModuleResolver;
  private packageResolver?: PackageResolver;
  private graph: DependencyGraph;

  constructor(projectRoot?: string) {
    this.resolver = new ModuleResolver();
    this.graph = new DependencyGraph(this.resolver);

    if (projectRoot) {
      this.packageResolver = new PackageResolver(projectRoot);
      this.resolver.setPackageResolver(this.packageResolver);
      this.resolver.setProjectRoot(projectRoot);
    }
  }

  /**
   * 전체 링크 파이프라인 실행
   */
  link(options: Partial<LinkOptions> & { entryPoint: string }): LinkResult {
    const opts: LinkOptions = { ...DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();

    try {
      // 1. 의존성 그래프 빌드
      if (opts.verbose) console.log('[linker] Building dependency graph...');
      this.graph.build(opts.entryPoint);

      if (opts.verbose) {
        console.log(this.graph.visualize());
      }

      // 2. DCE
      let dceResult: DCEResult = {
        totalSymbols: 0, usedSymbols: 0, eliminatedSymbols: 0,
        eliminatedNodes: [], reductionPercent: 0,
      };

      if (opts.dce) {
        if (opts.verbose) console.log('[linker] Running Dead Code Elimination...');
        dceResult = this.graph.eliminateDeadCode();
        if (opts.verbose) {
          console.log(`[linker] DCE: ${dceResult.eliminatedSymbols}/${dceResult.totalSymbols} symbols eliminated (${dceResult.reductionPercent}%)`);
        }
      }

      // 3. 위상 정렬 순서로 노드 수집 (DCE 제거 노드 제외)
      const linkedNodes = this.graph.getLinkedOrder().filter(
        node => !dceResult.eliminatedNodes.includes(node.id)
      );

      // 4. IR 생성 + 병합
      if (opts.verbose) console.log(`[linker] Generating IR for ${linkedNodes.length} modules...`);
      const mergedInstructions = this._mergeModules(linkedNodes, opts);

      // 5. C 코드 생성
      if (opts.verbose) console.log('[linker] Generating C code...');
      const cCode = this._generateMergedC(mergedInstructions, linkedNodes, opts);

      // C 코드만 출력 모드
      if (opts.emitC) {
        const cPath = opts.output
          ? opts.output.replace(/\.[^.]+$/, '.c')
          : path.join(process.cwd(), '.freelang-ai-out', 'linked.c');
        fs.mkdirSync(path.dirname(cPath), { recursive: true });
        fs.writeFileSync(cPath, cCode);

        return {
          ok: true,
          cCode,
          modules: linkedNodes.length,
          totalSymbols: dceResult.usedSymbols,
          dce: dceResult,
          buildTimeMs: Date.now() - startTime,
        };
      }

      // 6. GCC 컴파일
      if (opts.verbose) console.log('[linker] Compiling to binary...');
      const outputName = opts.output
        ? path.basename(opts.output)
        : path.basename(opts.entryPoint, '.fl') || 'app';

      const gccFlags = this._getGCCFlags(opts);
      const compileResult = this._compileWithFlags(cCode, outputName, gccFlags);

      if (!compileResult.ok) {
        return {
          ok: false,
          cCode,
          modules: linkedNodes.length,
          totalSymbols: dceResult.usedSymbols,
          dce: dceResult,
          buildTimeMs: Date.now() - startTime,
          error: compileResult.error,
        };
      }

      // 바이너리 크기 측정
      let binarySize: number | undefined;
      if (compileResult.binary_path && fs.existsSync(compileResult.binary_path)) {
        binarySize = fs.statSync(compileResult.binary_path).size;

        // 출력 경로가 지정된 경우 이동
        if (opts.output && compileResult.binary_path !== opts.output) {
          fs.mkdirSync(path.dirname(opts.output), { recursive: true });
          fs.copyFileSync(compileResult.binary_path, opts.output);
          fs.chmodSync(opts.output, 0o755);
        }
      }

      return {
        ok: true,
        binaryPath: opts.output || compileResult.binary_path,
        cCode,
        modules: linkedNodes.length,
        totalSymbols: dceResult.usedSymbols,
        dce: dceResult,
        buildTimeMs: Date.now() - startTime,
        binarySize,
      };
    } catch (error) {
      return {
        ok: false,
        modules: this.graph.getNodeCount(),
        totalSymbols: 0,
        dce: { totalSymbols: 0, usedSymbols: 0, eliminatedSymbols: 0, eliminatedNodes: [], reductionPercent: 0 },
        buildTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 모듈들의 IR을 위상 정렬 순서로 병합
   */
  private _mergeModules(nodes: GraphNode[], opts: LinkOptions): Inst[] {
    const allInstructions: Inst[] = [];
    const functionMap = new Map<string, Inst[]>();  // LTO용 함수 IR 맵

    for (const node of nodes) {
      try {
        // 모듈별 IR 생성
        const source = fs.readFileSync(node.id, 'utf-8');
        const lexer = new Lexer(source);
        const tokens = new TokenBuffer(lexer);
        const parser = new Parser(tokens);
        const ast = parser.parseModule() as any;
        const irGen = new IRGenerator();
        const instructions = irGen.generateModuleIR(ast);

        if (opts.lto) {
          // LTO: 함수별 IR 분리 저장
          this._extractFunctions(instructions, node.id, functionMap);
        }

        // 네임스페이스 prefix 추가 (충돌 방지)
        const prefixed = this._prefixSymbols(instructions, node);
        allInstructions.push(...prefixed);
      } catch {
        // IR 생성 실패한 모듈은 스킵
      }
    }

    // LTO: 한 번만 호출되는 함수 인라이닝
    if (opts.lto && functionMap.size > 0) {
      return this._applyLTO(allInstructions, functionMap);
    }

    return allInstructions;
  }

  /**
   * 함수별 IR 추출 (LTO 준비)
   */
  private _extractFunctions(
    instructions: Inst[],
    moduleId: string,
    functionMap: Map<string, Inst[]>
  ): void {
    let currentFunc: string | null = null;
    let funcInsts: Inst[] = [];

    for (const inst of instructions) {
      if (inst.op === Op.STORE && inst.arg && typeof inst.arg === 'string') {
        // 함수 정의 시작 감지 (LAMBDA_NEW 이후 STORE)
        if (currentFunc) {
          functionMap.set(`${moduleId}::${currentFunc}`, funcInsts);
        }
        currentFunc = inst.arg;
        funcInsts = [inst];
      } else if (currentFunc) {
        funcInsts.push(inst);
        if (inst.op === Op.RET) {
          functionMap.set(`${moduleId}::${currentFunc}`, funcInsts);
          currentFunc = null;
          funcInsts = [];
        }
      }
    }
  }

  /**
   * LTO: 인라이닝 적용
   * 한 번만 호출되는 작은 함수를 호출 지점에 인라이닝
   */
  private _applyLTO(instructions: Inst[], functionMap: Map<string, Inst[]>): Inst[] {
    // 호출 횟수 카운트
    const callCount = new Map<string, number>();
    for (const inst of instructions) {
      if (inst.op === Op.CALL && inst.arg && typeof inst.arg === 'string') {
        callCount.set(inst.arg, (callCount.get(inst.arg) || 0) + 1);
      }
    }

    // 인라이닝 대상: 1회 호출 + 명령어 10개 이하
    const inlineable = new Set<string>();
    for (const [funcKey, funcInsts] of functionMap) {
      const funcName = funcKey.split('::').pop() || '';
      if ((callCount.get(funcName) || 0) <= 1 && funcInsts.length <= 10) {
        inlineable.add(funcName);
      }
    }

    if (inlineable.size === 0) return instructions;

    // 인라이닝 적용
    const result: Inst[] = [];
    for (const inst of instructions) {
      if (inst.op === Op.CALL && inst.arg && inlineable.has(String(inst.arg))) {
        // CALL을 함수 본문으로 대체
        for (const [key, body] of functionMap) {
          if (key.endsWith(`::${inst.arg}`)) {
            // RET 제거하고 본문 삽입
            result.push(...body.filter(i => i.op !== Op.RET));
            break;
          }
        }
      } else {
        result.push(inst);
      }
    }

    return result;
  }

  /**
   * 심볼 네임스페이스 prefix 추가
   */
  private _prefixSymbols(instructions: Inst[], node: GraphNode): Inst[] {
    if (node.isEntryPoint) return instructions;  // 엔트리는 prefix 없음

    const prefix = node.packageName || path.basename(node.id, '.fl');

    return instructions.map(inst => {
      if (inst.op === Op.STORE && inst.arg && typeof inst.arg === 'string') {
        return { ...inst, arg: `${prefix}__${inst.arg}` };
      }
      if (inst.op === Op.LOAD && inst.arg && typeof inst.arg === 'string') {
        // 엔트리에서 import한 심볼 참조는 prefix 추가
        if (node.exports.some(e => e.name === inst.arg)) {
          return { ...inst, arg: `${prefix}__${inst.arg}` };
        }
      }
      return inst;
    });
  }

  /**
   * 병합된 IR을 단일 C 코드로 변환
   */
  private _generateMergedC(instructions: Inst[], nodes: GraphNode[], opts: LinkOptions): string {
    // 기본 IRToCGenerator 사용
    let cCode = IRToCGenerator.generate(instructions);

    // 헤더에 메타데이터 주석 추가
    const header = [
      '/* ============================================',
      ' * KPM-Linker: Single-Binary Output',
      ` * Entry: ${path.basename(opts.entryPoint)}`,
      ` * Modules: ${nodes.length}`,
      ` * Generated: ${new Date().toISOString()}`,
      ` * Target: ${opts.target || 'default'}`,
      ` * DCE: ${opts.dce ? 'enabled' : 'disabled'}`,
      ` * LTO: ${opts.lto ? 'enabled' : 'disabled'}`,
      ' * ============================================ */',
      '',
    ].join('\n');

    return header + cCode;
  }

  /**
   * 타겟별 GCC 플래그 생성
   */
  private _getGCCFlags(opts: LinkOptions): string[] {
    const flags: string[] = [];

    if (opts.optimize) {
      flags.push('-O2');
    }

    if (opts.lto) {
      flags.push('-flto');  // GCC Link Time Optimization
    }

    // 타겟별 플래그
    switch (opts.target) {
      case 'termux-aarch64':
        flags.push('-march=armv8-a', '-mtune=cortex-a53');
        break;
      case 'termux-armv7':
        flags.push('-march=armv7-a', '-mfpu=neon');
        break;
      case 'x86_64':
        flags.push('-march=x86-64', '-mtune=generic');
        break;
      case 'small':
        flags.push('-Os', '-s');  // 크기 최적화 + strip
        break;
      default:
        // 기본: 호스트 네이티브
        break;
    }

    // 정적 링크 (단일 바이너리)
    flags.push('-static', '-lm');

    return flags;
  }

  /**
   * GCC 컴파일 (커스텀 플래그)
   */
  private _compileWithFlags(
    cCode: string,
    name: string,
    flags: string[]
  ): { ok: boolean; binary_path?: string; error?: string } {
    const { execSync } = require('child_process');
    const outDir = path.join(process.cwd(), '.freelang-ai-out');

    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const cPath = path.join(outDir, `${name}.c`);
    const binPath = path.join(outDir, name);

    try {
      fs.writeFileSync(cPath, cCode);
      const flagStr = flags.join(' ');
      // -static이 실패할 수 있으므로 fallback
      try {
        execSync(`gcc ${flagStr} -o "${binPath}" "${cPath}" 2>&1`, {
          encoding: 'utf-8',
          timeout: 30_000,
        });
      } catch {
        // -static 없이 재시도
        const fallbackFlags = flags.filter(f => f !== '-static').join(' ');
        execSync(`gcc ${fallbackFlags} -o "${binPath}" "${cPath}" 2>&1`, {
          encoding: 'utf-8',
          timeout: 30_000,
        });
      }
      return { ok: true, binary_path: binPath };
    } catch (e: unknown) {
      const msg = e instanceof Error ? (e as any).stderr ?? e.message : String(e);
      return { ok: false, error: msg };
    }
  }

  /**
   * 의존성 그래프 반환
   */
  getGraph(): DependencyGraph {
    return this.graph;
  }
}
