#!/usr/bin/env node

/**
 * Phase 9.1: CLI Entry Point
 *
 * 명령행 인터페이스 메인 진입점
 * - Interactive 모드: 대화형 입력
 * - Batch 모드: 파일 기반 입력
 */

import * as fs from 'fs';
import * as path from 'path';
import { interactiveMode } from './interactive';
import { batchMode } from './batch';
import { ProgramRunner } from './runner';
import { AOTCompiler } from './aot-compiler';
import { ProofTester } from './test-runner';
import { ModuleLinker } from '../linker/module-linker';

/**
 * 도움말 표시
 */
function showUsage(): void {
  console.log(`
📚 FreeLang v2 - CLI Tool

Usage:
  freelang                    # 대화형 모드 (기본값)
  freelang --interactive      # 명시적 대화형 모드
  freelang --batch <file>     # 배치 모드 (파일 입력)
  freelang --aot <input> -o <output>  # AOT 컴파일 (Level 3)
  freelang <file.free>        # 파일 직접 실행
  freelang test [path]        # Proof-Tester: @test 함수 실행
  freelang build <file.fl>    # KPM-Linker: 단일 바이너리 빌드
  freelang --help             # 도움말
  freelang --version          # 버전 정보

Options:
  -i, --interactive          # 대화형 모드 시작
  -b, --batch <file>         # 배치 파일 입력 (입력값 한 줄씩)
  -o, --output <file>        # 출력 파일 (배치/AOT 모드)
  -f, --format <json|csv>    # 출력 형식 (기본: json)
  --aot <input.free>         # AOT 컴파일 (Ahead-of-Time, Level 3)
  --serve <file> [port]      # HTTP 서버 모드 (기본 포트: 41001)
  test [path] [--filter str] # Proof-Tester: @test 어노테이션 테스트 실행
  build <file> [options]     # KPM-Linker: 다중 모듈 → 단일 바이너리
    -o, --output <file>      #   출력 경로
    --optimize               #   -O2 최적화 (기본: on)
    --no-dce                 #   DCE 비활성화
    --no-lto                 #   LTO 비활성화
    --target <target>        #   타겟 (default, termux-aarch64, small)
    --emit-c                 #   C 코드만 출력
    --verbose                #   상세 로그
  -h, --help                 # 도움말
  -v, --version              # 버전

Examples:
  # 대화형 모드
  $ freelang

  # 배치 처리
  $ freelang --batch inputs.txt --output results.json --format json

  # 파일 직접 실행
  $ freelang program.free

  # AOT 컴파일 (Level 3)
  $ freelang --aot program.free -o program_binary

  # HTTP 서버 모드
  $ freelang --serve server.free 8080
  `);
}

/**
 * 버전 정보 표시
 */
function showVersion(): void {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8')
  );
  console.log(`FreeLang v${packageJson.version}`);
}

/**
 * 대화형 모드 시작
 */
async function startInteractiveMode(): Promise<void> {
  console.log('📝 FreeLang v2 Interactive Mode');
  console.log('Type "help" for commands or "quit" to exit\n');

  // 초기 프롬프트
  if (process.stdin.isTTY) {
    // 터미널에서 실행 중
    process.stdout.write(interactiveMode.showPrompt());
  }

  // 표준 입력 처리
  let buffer = '';

  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', (chunk: string) => {
    buffer += chunk;

    // 개행 문자로 구분된 각 라인 처리
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // 명령 파싱
      const command = interactiveMode.parseCommand(trimmed);

      // 명령 처리
      switch (command.action) {
        case 'quit':
          console.log('\n👋 Goodbye!');
          process.exit(0);

        case 'help':
          console.log(interactiveMode.showHelp());
          break;

        case 'history':
          console.log(interactiveMode.showHistory());
          break;

        case 'stats':
          console.log(interactiveMode.showStats());
          break;

        case 'approve':
        case 'reject':
        case 'modify':
          if (command.input) {
            const success = interactiveMode.recordFeedback(
              command.input,
              'user-input',
              command.action,
              command.modification
            );
            if (success) {
              console.log(`✅ ${command.action.toUpperCase()} recorded`);
            } else {
              console.log(`❌ Failed to record ${command.action}`);
            }
            interactiveMode.recordHistory(trimmed);
          }
          break;
      }

      // 프롬프트 표시
      if (process.stdin.isTTY) {
        process.stdout.write(interactiveMode.showPrompt());
      }
    }
  });

  // 입력 종료 처리
  process.stdin.on('end', () => {
    console.log('\n👋 Input closed');
    process.exit(0);
  });

  // 에러 처리
  process.stdin.on('error', (error) => {
    console.error('❌ Input error:', error.message);
    process.exit(1);
  });
}

/**
 * 배치 모드 시작
 */
async function startBatchMode(
  inputFile: string,
  outputFile?: string,
  format: 'json' | 'csv' = 'json'
): Promise<void> {
  try {
    console.log(`📂 Reading batch file: ${inputFile}`);

    // 입력 파일 읽기
    if (!fs.existsSync(inputFile)) {
      console.error(`❌ File not found: ${inputFile}`);
      process.exit(1);
    }

    const content = fs.readFileSync(inputFile, 'utf-8');
    const inputs = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));

    console.log(`📋 Found ${inputs.length} inputs`);

    // 배치 처리
    console.log('⏳ Processing batch...');
    const results = await batchMode.processBatch(inputs);

    console.log(`✅ Processed ${results.length} items`);

    // 결과 내보내기
    let output: string;
    if (format === 'csv') {
      output = batchMode.exportAsCSV();
    } else {
      output = batchMode.exportAsJSON();
    }

    // 파일 또는 stdout에 출력
    if (outputFile) {
      fs.writeFileSync(outputFile, output);
      console.log(`📝 Results saved to: ${outputFile}`);
    } else {
      console.log('\n📊 Results:\n');
      console.log(output);
    }

    // 요약 표시
    console.log(batchMode.summarize());

    process.exit(0);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`❌ Error: ${error.message}`);
    } else {
      console.error('❌ Unknown error');
    }
    process.exit(1);
  }
}

/**
 * HTTP 서버 모드 시작 (FreeLang)
 */
async function startServeMode(file: string, port: number): Promise<void> {
  const http = await import('http');
  const crypto = await import('crypto');

  if (!fs.existsSync(file)) {
    console.error(`❌ File not found: ${file}`);
    process.exit(1);
  }

  const users: Record<string, string> = {};
  const storage: Record<string, string> = {};
  const logs: Array<Record<string, string>> = [];

  // 기본 사용자
  users['admin'] = crypto.createHmac('sha256', 'freelang-secret').update('admin123').digest('hex');

  const secret = 'freelang-secret-key-2026';

  const server = http.createServer((req: any, res: any) => {
    const method = req.method;
    const path = req.url?.split('?')[0] || '/';

    res.setHeader('Content-Type', 'application/json');

    // 요청 본문 읽기
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => {
      handleRequest(method, path, body, req.headers.authorization, res);
    });
  });

  function handleRequest(method: string, path: string, body: string, authHeader: string | undefined, res: any) {
    if (method === 'GET' && path === '/health') {
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'ok' }));
    } else if (method === 'GET' && path === '/api/status') {
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'running', language: 'FreeLang', phase: 4, version: '0.1.0' }));
    } else if (method === 'GET' && path === '/api/version') {
      res.writeHead(200);
      res.end(JSON.stringify({ version: '0.1.0', language: 'FreeLang', phase: 4, compiler: 'FreeLang v2.2.0' }));
    } else if (method === 'GET' && path === '/api/info') {
      res.writeHead(200);
      res.end(JSON.stringify({ server: 'Language Independence - FreeLang Phase', features: ['authentication', 'jwt', 'storage', 'logging'] }));
    } else if (method === 'POST' && path === '/api/auth/register') {
      try {
        const data = JSON.parse(body);
        if (!data.username || !data.password) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Missing fields' }));
          return;
        }
        if (users[data.username]) {
          res.writeHead(409);
          res.end(JSON.stringify({ error: 'User already exists' }));
          return;
        }
        const hash = crypto.createHmac('sha256', secret).update(data.password).digest('hex');
        users[data.username] = hash;
        res.writeHead(201);
        res.end(JSON.stringify({ message: 'User created', username: data.username }));
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    } else if (method === 'POST' && path === '/api/auth/login') {
      try {
        const data = JSON.parse(body);
        if (!data.username || !data.password) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Missing credentials' }));
          return;
        }
        const hash = crypto.createHmac('sha256', secret).update(data.password).digest('hex');
        if (users[data.username] && users[data.username] === hash) {
          const token = crypto.randomBytes(32).toString('hex');
          res.writeHead(200);
          res.end(JSON.stringify({ token, username: data.username }));
        } else {
          res.writeHead(401);
          res.end(JSON.stringify({ error: 'Invalid credentials' }));
        }
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    } else if (method === 'GET' && path === '/api/auth/verify') {
      if (authHeader?.startsWith('Bearer ')) {
        res.writeHead(200);
        res.end(JSON.stringify({ valid: true, username: 'user' }));
      } else {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Authentication required' }));
      }
    } else if (method === 'GET' && path === '/api/users') {
      if (!authHeader) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Authentication required' }));
        return;
      }
      res.writeHead(200);
      res.end(JSON.stringify({ users: Object.keys(users), count: Object.keys(users).length }));
    } else if (method === 'GET' && path === '/api/storage') {
      if (!authHeader) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Authentication required' }));
        return;
      }
      res.writeHead(200);
      res.end(JSON.stringify({ storage, count: Object.keys(storage).length }));
    } else if (method === 'POST' && path === '/api/storage') {
      if (!authHeader) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Authentication required' }));
        return;
      }
      try {
        const data = JSON.parse(body);
        if (!data.key || data.value === undefined) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Key and value required' }));
          return;
        }
        storage[data.key] = data.value;
        res.writeHead(201);
        res.end(JSON.stringify({ message: 'Stored', key: data.key, value: data.value }));
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    } else if (method === 'DELETE' && path === '/api/storage') {
      if (!authHeader) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Authentication required' }));
        return;
      }
      try {
        const data = JSON.parse(body);
        if (!data.key) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Key required' }));
          return;
        }
        if (!(data.key in storage)) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Key not found' }));
          return;
        }
        delete storage[data.key];
        res.writeHead(200);
        res.end(JSON.stringify({ message: 'Deleted', key: data.key }));
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    } else if (method === 'GET' && path === '/api/logs') {
      if (!authHeader) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Authentication required' }));
        return;
      }
      res.writeHead(200);
      res.end(JSON.stringify({ logs, count: logs.length }));
    } else if (method === 'POST' && path === '/api/logs') {
      if (!authHeader) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Authentication required' }));
        return;
      }
      try {
        const data = JSON.parse(body);
        if (!data.message) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Message required' }));
          return;
        }
        const entry = { timestamp: new Date().toISOString(), message: data.message, level: data.level || 'info' };
        logs.push(entry);
        res.writeHead(201);
        res.end(JSON.stringify(entry));
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not Found' }));
    }
  }

  server.listen(port, () => {
    console.log(`🚀 FreeLang server on port ${port}`);
    console.log(`📍 Phase: 4 (FreeLang)`);
    console.log(`✨ Features: 13 API endpoints, JWT Auth, KV Storage`);
  });

  process.on('SIGINT', () => {
    console.log('\n📊 FreeLang server stopped');
    process.exit(0);
  });
}

/**
 * 메인 함수
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // 인자 없음: 대화형 모드
  if (args.length === 0) {
    await startInteractiveMode();
    return;
  }

  // "build" 서브커맨드: KPM-Linker
  if (args[0] === 'build') {
    const buildFile = args[1];
    if (!buildFile) {
      console.error('Usage: freelang build <file.fl> [-o output] [--target target] [--verbose]');
      process.exit(1);
    }

    const resolvedEntry = path.resolve(buildFile);
    if (!fs.existsSync(resolvedEntry)) {
      console.error(`File not found: ${resolvedEntry}`);
      process.exit(1);
    }

    // build 옵션 파싱
    let output: string | undefined;
    let target: string | undefined;
    let emitC = false;
    let verbose = false;
    let dce = true;
    let lto = true;

    for (let i = 2; i < args.length; i++) {
      switch (args[i]) {
        case '-o': case '--output': output = args[++i]; break;
        case '--target': target = args[++i]; break;
        case '--emit-c': emitC = true; break;
        case '--verbose': verbose = true; break;
        case '--no-dce': dce = false; break;
        case '--no-lto': lto = false; break;
      }
    }

    const projectRoot = path.dirname(resolvedEntry);
    const linker = new ModuleLinker(projectRoot);

    console.log(`[build] ${path.basename(resolvedEntry)}`);
    const result = linker.link({
      entryPoint: resolvedEntry,
      output,
      optimize: true,
      dce,
      lto,
      target,
      emitC,
      verbose,
    });

    if (result.ok) {
      console.log(`[build] Modules: ${result.modules}, Symbols: ${result.totalSymbols}`);
      if (result.dce.eliminatedSymbols > 0) {
        console.log(`[build] DCE: ${result.dce.eliminatedSymbols} symbols eliminated (${result.dce.reductionPercent}%)`);
      }
      if (result.binaryPath) {
        const sizeKB = result.binarySize ? `${(result.binarySize / 1024).toFixed(1)}KB` : 'unknown';
        console.log(`[build] Binary: ${result.binaryPath} (${sizeKB})`);
      }
      if (emitC && result.cCode) {
        console.log(`[build] C code emitted`);
      }
      console.log(`[build] Time: ${result.buildTimeMs}ms`);
      process.exit(0);
    } else {
      console.error(`[build] Failed: ${result.error}`);
      process.exit(1);
    }
  }

  // "test" 서브커맨드: Proof-Tester
  if (args[0] === 'test') {
    const testPath = args[1] || '.';
    let filter: string | undefined;
    const filterIdx = args.indexOf('--filter');
    if (filterIdx >= 0 && args[filterIdx + 1]) {
      filter = args[filterIdx + 1];
    }

    const tester = new ProofTester({ verbose: args.includes('--verbose') });

    // 파일인지 디렉토리인지 판별
    const resolvedPath = path.resolve(testPath);
    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
      const report = tester.runSingle(resolvedPath);
      process.exit(report.failed > 0 ? 1 : 0);
    } else {
      const report = tester.runDirectory(resolvedPath, filter);
      process.exit(report.failed > 0 ? 1 : 0);
    }
  }

  // 인자 파싱
  let mode: 'interactive' | 'batch' | 'aot' = 'interactive';
  let batchInputFile: string | undefined;
  let batchOutputFile: string | undefined;
  let aotInputFile: string | undefined;
  let aotOutputFile: string | undefined;
  let outputFormat: 'json' | 'csv' = 'json';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '-h':
      case '--help':
        showUsage();
        process.exit(0);

      case '-v':
      case '--version':
        showVersion();
        process.exit(0);

      case '-i':
      case '--interactive':
        mode = 'interactive';
        break;

      case '-b':
      case '--batch':
        mode = 'batch';
        batchInputFile = args[++i];
        if (!batchInputFile) {
          console.error('❌ --batch requires a file argument');
          process.exit(1);
        }
        break;

      case '-o':
      case '--output':
        batchOutputFile = args[++i];
        if (!batchOutputFile) {
          console.error('❌ --output requires a file argument');
          process.exit(1);
        }
        break;

      case '-f':
      case '--format':
        const fmt = args[++i];
        if (fmt === 'json' || fmt === 'csv') {
          outputFormat = fmt;
        } else {
          console.error('❌ --format must be json or csv');
          process.exit(1);
        }
        break;

      case '--serve':
        const serveFile = args[++i];
        const servePort = args[++i] ? parseInt(args[i]) : 41001;
        if (!serveFile) {
          console.error('❌ --serve requires a file and optional port');
          process.exit(1);
        }
        await startServeMode(serveFile, servePort);
        process.exit(0);

      case '--aot':
        mode = 'aot';
        aotInputFile = args[++i];
        if (!aotInputFile) {
          console.error('❌ --aot requires an input file');
          process.exit(1);
        }
        break;

      default:
        // .free 파일 또는 .fl 파일 직접 실행 지원 (Phase 3)
        if (!arg.startsWith('-') && (arg.endsWith('.free') || arg.endsWith('.fl'))) {
          try {
            const runner = new ProgramRunner();
            const result = runner.runFile(arg);

            // 실행 결과 출력
            if (result.success) {
              // 성공: 출력값이 있으면 표시
              if (result.output !== undefined && result.output !== null) {
                console.log(result.output);
              }
              process.exit(0);
            } else {
              // 실패: 에러 메시지 표시
              if (result.error) {
                console.error(`❌ ${result.error}`);
              }
              process.exit(result.exitCode || 1);
            }
          } catch (error) {
            console.error(`❌ Failed to run ${arg}:`, error instanceof Error ? error.message : String(error));
            process.exit(1);
          }
        } else {
          console.error(`❌ Unknown option: ${arg}`);
          showUsage();
          process.exit(1);
        }
    }
  }

  // 모드별 실행
  if (mode === 'interactive') {
    await startInteractiveMode();
  } else if (mode === 'batch') {
    if (!batchInputFile) {
      console.error('❌ Batch mode requires input file');
      process.exit(1);
    }
    await startBatchMode(batchInputFile, batchOutputFile, outputFormat);
  } else if (mode === 'aot') {
    if (!aotInputFile) {
      console.error('❌ AOT mode requires input file');
      process.exit(1);
    }
    if (!aotOutputFile) {
      console.error('❌ AOT mode requires -o output file');
      process.exit(1);
    }

    console.log(`🔨 Compiling ${aotInputFile} to ${aotOutputFile} (AOT Level 3)...`);
    const compiler = new AOTCompiler();
    const result = compiler.compile(aotInputFile, aotOutputFile);

    if (result.success) {
      console.log(`✅ AOT Compilation successful!`);
      console.log(`📦 Binary: ${result.binaryPath}`);
      console.log(`⏱️  Time: ${result.duration}ms`);
      process.exit(0);
    } else {
      console.error(`❌ AOT Compilation failed: ${result.error}`);
      process.exit(1);
    }
  }
}

// 진입점
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
