/**
 * FreeLang CLI Runner
 * Reads program file, compiles to IR, executes on VM
 *
 * Phase 1: Full Lexer-Parser-IRGen-VM Pipeline Connected
 * Replaces regex-based FunctionParser with full AST parser
 */

import * as fs from 'fs';
import * as path from 'path';
import { Lexer } from '../lexer/lexer';
import { TokenBuffer } from '../lexer/lexer';
import { Parser } from '../parser/parser';
import { IRGenerator } from '../codegen/ir-generator';
import { VM } from '../vm';
import { FunctionRegistry } from '../parser/function-registry';
import { Inst, VMResult } from '../types';
import { optimizeIR } from '../phase-14-llvm';
import { registerStdlibFunctions } from '../stdlib-builtins';
import { registerSQLiteNativeFunctions } from '../stdlib/sqlite-native';
import { registerTCPFunctions } from '../stdlib/net/tcp-native';
import { registerSystemExtendedFunctions } from '../stdlib-system-extended';
import { registerFsExtendedFunctions } from '../stdlib-fs-extended';
import { registerTeamDFunctions } from '../stdlib-team-d-http-db';
import { registerVCSFunctions } from '../stdlib/stdlib-vcs';
import { installGate } from '../vcs/vcs-bridge';
import { generateORMMeta } from '../codegen/orm-codegen';
import { registerORMMeta } from '../stdlib/orm-native';
import { generateValidatorMeta } from '../codegen/validator-codegen';
import { registerValidatorMeta, registerValidatorNativeFunctions } from '../stdlib/validator-native';
import { registerRateShieldFunctions } from '../stdlib/rate-shield';
import { HotReloadEngine } from '../hot-reload/hot-reload-engine';
import { registerHotReloadFunctions, setGlobalHotReloadEngine } from '../stdlib/stdlib-hot-reload';
import { proxyRouteTable } from '../stdlib/proxy-tunnel';

export interface RunResult {
  success: boolean;
  output?: unknown;
  error?: string;
  exitCode: number;
  executionTime: number;
}

/**
 * Compile and run a FreeLang program
 */
export class ProgramRunner {
  private gen: IRGenerator;
  private vm: VM;
  private registry: FunctionRegistry;
  private hotReloadEngine: HotReloadEngine;

  constructor(registry?: FunctionRegistry) {
    this.registry = registry || new FunctionRegistry();
    this.gen = new IRGenerator();
    this.vm = new VM(this.registry);
    // Phase 26: VM has already set itself in native registry during construction
    // Register all stdlib functions from Phase A-H after VM creation
    registerStdlibFunctions(this.vm.getNativeFunctionRegistry());
    // Phase H: Register SQLite native functions
    registerSQLiteNativeFunctions(this.vm.getNativeFunctionRegistry());
    // Phase 3 Level 3: Register TCP native functions (net module)
    registerTCPFunctions(this.vm.getNativeFunctionRegistry());
    // Phase C: Register system extended functions (event, logging, scheduler, cache, validation, config)
    registerSystemExtendedFunctions(this.vm.getNativeFunctionRegistry());
    // Phase D: Register file system extended functions (dir_walk, file_stat, etc)
    registerFsExtendedFunctions(this.vm.getNativeFunctionRegistry());
    // Team D: Register HTTP/DB/Cache/Redis functions (24 libraries, 120+ functions)
    registerTeamDFunctions(this.vm.getNativeFunctionRegistry());
    // Commit-Gate: VCS stdlib (git_staged_files, vcs_lint, vcs_test 등)
    registerVCSFunctions(this.vm.getNativeFunctionRegistry());
    // Native-Rate-Shield: shield_init/check/stats/reset/delete
    registerRateShieldFunctions(this.vm.getNativeFunctionRegistry());
    // Native-Hot-Reload: hot_watch/hot_stop/hot_status/server_watch_and_run
    this.hotReloadEngine = new HotReloadEngine(this.registry);
    setGlobalHotReloadEngine(this.hotReloadEngine);
    registerHotReloadFunctions(this.vm.getNativeFunctionRegistry(), this.hotReloadEngine);
    // Compile-Time-Validator: validator_is_valid/get_errors/check_field/list_rules
    registerValidatorNativeFunctions(this.vm.getNativeFunctionRegistry());
  }

  /**
   * Native-Hot-Reload: 파일 감시 시작 (--watch 플래그 또는 FreeLang 코드 내 hot_watch() 호출)
   */
  watchFile(filePath: string): void {
    this.hotReloadEngine.watch(path.resolve(filePath));
  }

  /**
   * Native-Hot-Reload: 엔진 반환 (통계/콜백 등록 등)
   */
  getHotReloadEngine(): HotReloadEngine {
    return this.hotReloadEngine;
  }

  /**
   * Get the function registry (for accessing registered functions)
   */
  getRegistry(): FunctionRegistry {
    return this.registry;
  }

  /**
   * Commit-Gate: VM의 NativeFunctionRegistry 반환 (VCS stdlib 등록용)
   */
  getNativeRegistry() {
    return this.vm.getNativeFunctionRegistry();
  }

  /**
   * Run program from string
   * Phase 1: Full Lexer→Parser pipeline
   * Phase 2: Function registration before execution
   */
  runString(source: string): RunResult {
    const startTime = Date.now();

    try {
      // 1. Tokenize: Lexer → TokenBuffer
      const lexer = new Lexer(source);
      const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: false });

      // 2. Parse: TokenBuffer → Module AST (supports fn/let/if/while/for)
      const parser = new Parser(tokenBuffer);
      const module = parser.parseModule() as any;

      // 2.4. Compile-Time-ORM: @db_table struct 스캔 → SQL 컴파일 타임 생성
      // generateORMMeta는 런타임 이전 실행 → 런타임 SQL 파싱 오버헤드 0
      const ormMetas = generateORMMeta(module as any);
      if (ormMetas.length > 0) {
        registerORMMeta(ormMetas);
      }

      // 2.4.1. Compile-Time-Validator: @check struct 스캔 → 검증 함수 컴파일 타임 생성
      // generateValidatorMeta는 런타임 이전 실행 → 런타임 룰 파싱 오버헤드 0
      // SIMD 가속 정규표현식 사전 컴파일 → RegExp JIT 캐시 활용
      const validatorMetas = generateValidatorMeta(module as any);
      if (validatorMetas.length > 0) {
        registerValidatorMeta(validatorMetas);
      }

      // 2.5. Phase 2: Register user-defined functions before execution
      // Extract FunctionStatements from module.statements and register them
      // DEBUG: Log module structure (disabled)
      // console.log('[DEBUG] Module statements:', module.statements?.map((s: any) => ({ type: s.type, name: s.name })));

      if (module.statements) {
        for (const stmt of module.statements) {
          if (stmt && stmt.type === 'function') {
            const fn = stmt as any; // FunctionStatement
            // Register function in FunctionRegistry with params and body
            this.registry.register({
              type: 'FunctionDefinition',
              name: fn.name,
              params: fn.params?.map((p: any) => p.name) || [],  // Extract param names
              body: fn.body,  // BlockStatement
              annotations: fn.annotations || []  // Self-Monitoring Kernel: @monitor 등
            });
          }
        }
      }

      // ── Native-Proxy-Tunnel: @proxy_to 어노테이션 감지 → proxyRouteTable 자동 등록 ──
      // @proxy_to(path: "/api", target: "http://backend:3000")
      // fn handle_api() { ... }
      // 컴파일 타임에 라우트 테이블 등록 → 런타임 O(1) 조회
      if (module.statements) {
        for (const stmt of (module.statements as any[])) {
          if (!stmt || stmt.type !== 'function') continue;
          const fn = stmt as any;
          const annotations: string[] = fn.annotations || [];
          for (const ann of annotations) {
            if (!ann.startsWith('proxy_to')) continue;
            // 패턴: proxy_to(path: "/api", target: "http://backend:3000")
            const pathMatch = ann.match(/path:\s*["']([^"']+)["']/);
            const targetMatch = ann.match(/target:\s*["']([^"']+)["']/);
            if (pathMatch && targetMatch) {
              proxyRouteTable.set(pathMatch[1], targetMatch[1]);
            }
          }
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      // ── Commit-Gate: @git_hook 어노테이션 감지 → Gate 자동 등록 ───────────
      // @git_hook(event: .pre_commit) fn validate_before_save() { ... }
      // 파일 실행 시 Gate를 자동 설치 (freelang gate install 없이도 동작)
      if (module.statements && (this as any).__sourceFile) {
        const gitHookFns = (module.statements as any[]).filter(
          (s: any) => s?.type === 'function' &&
            s?.annotations?.some((a: string) => a.startsWith('git_hook'))
        );
        if (gitHookFns.length > 0) {
          const srcFile = (this as any).__sourceFile as string;
          const source = (this as any).__sourceCode as string;
          const projectRoot = path.dirname(srcFile);
          try {
            installGate(srcFile, source, projectRoot);
          } catch { /* Gate 설치 실패 시 조용히 무시 (실행은 계속) */ }
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      // ── Native-Core-Multiplexing: @parallel 어노테이션 감지 ──────────────
      // fn main에 @parallel이 있으면 OS 수준 fork 부트스트랩 실행
      // Primary: 워커 N개 생성 + Watchdog → 자신은 대기
      // Worker:  @parallel 감지해도 cluster.isPrimary=false → 아래로 통과 → main 실행
      //
      // 설계 원칙:
      //   - cluster.fork() = SO_REUSEPORT 자동 활성화 (커널이 요청 분배)
      //   - Copy-on-Write: 워커 별 독립 힙, 공통 상수는 읽기 전용 공유
      //   - Watchdog: 워커 비정상 종료 시 즉시 재시작 (0 다운타임)
      //   - CPU Affinity: os.cpus() 기반 코어 수 자동 감지 (Core-Aware-Binary)
      // ─────────────────────────────────────────────────────────────────────
      const mainFn = (module.statements as any[])?.find(
        (s: any) => s?.type === 'function' && s?.name === 'main'
      );
      if (mainFn?.annotations?.includes('parallel')) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const clusterMod = require('cluster') as any;
        if (clusterMod.isPrimary) {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const os = require('os') as typeof import('os');
          const workerCount = os.cpus().length;
          process.stdout.write(
            `[Native-Core-Multiplexing] Bootstrap: Core×${workerCount} (SO_REUSEPORT=auto, Watchdog=ON)\n`
          );

          // Core-Aware-Binary: CPU 코어 수만큼 워커 포크
          for (let i = 0; i < workerCount; i++) {
            clusterMod.fork();
          }

          // Watchdog: 워커 비정상 종료 → 즉시 재시작 (자가 회복)
          clusterMod.on('exit', (worker: any, code: number, signal: string) => {
            process.stdout.write(
              `[NCM Watchdog] Worker PID-${worker.process.pid} exit(${signal || code}) → respawn\n`
            );
            clusterMod.fork();
          });

          // Primary는 워커를 관리하며 대기 (main 실행하지 않음)
          return {
            success: true,
            output: `NCM:primary pid=${process.pid} workers=${workerCount}`,
            exitCode: 0,
            executionTime: Date.now() - startTime
          };
        }
        // Worker 프로세스: 아래로 통과 → main 정상 실행
      }

      // 3. Generate IR: Module → IR instructions
      const ir = this.gen.generateModuleIR(module);

      // 3.5. Optimize IR: Apply LLVM optimizations (ADCE, Constant Folding, Inlining)
      // Temporarily disabled for debugging
      // const { optimized } = optimizeIR(ir);

      // 4. Execute: Optimized IR → VM results
      const result = this.vm.run(ir); // Use unoptimized for now

      const executionTime = Date.now() - startTime;

      return {
        success: result.ok,
        output: result.value,
        error: result.error ? `VM Error: ${result.error.detail}` : undefined,
        exitCode: result.ok ? 0 : 1,
        executionTime
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: `Compilation Error: ${error instanceof Error ? error.message : String(error)}`,
        exitCode: 2,
        executionTime
      };
    }
  }

  /**
   * Phase 2: Preload imported modules recursively
   * Extracts import statements and loads them first to register functions
   */
  private preloadImports(filePath: string, loadedFiles = new Set<string>(), isMainFile = true): void {
    try {
      // Avoid circular imports
      const absolutePath = path.resolve(filePath);
      if (loadedFiles.has(absolutePath)) {
        return;
      }
      loadedFiles.add(absolutePath);

      // Check file exists
      if (!fs.existsSync(filePath)) {
        return;
      }

      // Read file
      const source = fs.readFileSync(filePath, 'utf-8');

      // Extract import statements: import "path/to/module"
      const importPattern = /import\s+["']([^"']+)["']/g;
      let match;
      const importedFiles: string[] = [];

      while ((match = importPattern.exec(source)) !== null) {
        const importPath = match[1];
        // Resolve relative to current file
        const resolvedPath = path.resolve(path.dirname(filePath), importPath);
        // Add .fl extension if missing
        const fullPath = resolvedPath.endsWith('.fl') ? resolvedPath : resolvedPath + '.fl';

        if (fs.existsSync(fullPath)) {
          importedFiles.push(fullPath);
        }
      }

      // Recursively preload imported files first
      for (const importedFile of importedFiles) {
        this.preloadImports(importedFile, loadedFiles, false);
      }

      // Only run imported modules to register functions, NOT the main file
      // (The main file will be run separately in runFile)
      if (!isMainFile) {
        const result = this.runString(source);
        if (!result.success && result.error) {
          // Log import loading error but don't fail
          console.warn(`⚠️ Warning loading import ${filePath}: ${result.error}`);
        }
      }
    } catch (error) {
      // Silent fail on import loading
      console.warn(`⚠️ Warning preloading ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Run program from file
   */
  runFile(filePath: string): RunResult {
    const startTime = Date.now();

    try {
      // 1. Check file exists
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: `File not found: ${filePath}`,
          exitCode: 3,
          executionTime: Date.now() - startTime
        };
      }

      // Phase 2: Preload all imported modules first (for function registration)
      this.preloadImports(filePath);

      // 2. Read file
      const source = fs.readFileSync(filePath, 'utf-8');

      // 3. Run program
      return this.runString(source);
    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: `File Error: ${error instanceof Error ? error.message : String(error)}`,
        exitCode: 3,
        executionTime
      };
    }
  }

  /**
   * Get IR for a program (for debugging)
   */
  getIR(source: string): Inst[] {
    try {
      // Tokenize → Parse → Generate IR
      const lexer = new Lexer(source);
      const tokenBuffer = new TokenBuffer(lexer);
      const parser = new Parser(tokenBuffer);
      const module = parser.parseModule() as any;
      return this.gen.generateModuleIR(module);
    } catch (error) {
      throw new Error(`IR Generation Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
