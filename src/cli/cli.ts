/**
 * FreeLang CLI - Command Line Interface
 * Usage: freelang <command> [options]
 */

import * as path from 'path';
import { ProgramRunner } from './runner';
import { compileAOT } from './aot-compiler';
import { ProofTester } from './test-runner';

interface CLIOptions {
  verbose?: boolean;
  showIR?: boolean;
  debug?: boolean;
  aot?: boolean;        // Phase 5: AOT compilation
  output?: string;      // Phase 5: Output binary path
  test?: boolean;       // Self-Testing Compiler: --test 플래그
  pattern?: string;     // --pattern 테스트 파일 필터
}

export class FreeLangCLI {
  private runner: ProgramRunner;

  constructor() {
    this.runner = new ProgramRunner();
  }

  /**
   * Parse command line arguments
   */
  private parseArgs(args: string[]): {
    command: string;
    file?: string;
    options: CLIOptions;
  } {
    const command = args[0];
    const restArgs = args.slice(1);
    const options: CLIOptions = {};

    let file: string | undefined;

    for (let i = 0; i < restArgs.length; i++) {
      const arg = restArgs[i];
      if (arg === '--verbose' || arg === '-v') {
        options.verbose = true;
      } else if (arg === '--show-ir') {
        options.showIR = true;
      } else if (arg === '--debug') {
        options.debug = true;
      } else if (arg === '--aot') {
        options.aot = true;
      } else if (arg === '-o' || arg === '--output') {
        options.output = restArgs[++i];  // Next arg is the output path
      } else if (arg === '--test') {
        options.test = true;
      } else if (arg === '--pattern' || arg === '-p') {
        options.pattern = restArgs[++i];
      } else if (!arg.startsWith('-')) {
        file = arg;
      }
    }

    return { command, file, options };
  }

  /**
   * Print help message
   */
  private printHelp(): void {
    console.log(`
FreeLang v2.0.0 - AI-Only Programming Language

Usage:
  freelang run <file>       Run a FreeLang program
  freelang eval <code>      Evaluate FreeLang code
  freelang ir <code>        Show IR for code (debug)
  freelang test [path]      Run tests (Self-Testing Compiler)
  freelang build <file>     Build program (use --test for test build)
  freelang help             Show this help message
  freelang version          Show version

Options:
  -v, --verbose             Show detailed output
  --show-ir                 Display generated IR
  --debug                   Enable debug mode
  --aot                     Compile to binary (Phase 5)
  -o, --output <path>       Output binary path (with --aot)
  --test                    Build/run in test mode (executes test blocks)
  -p, --pattern <str>       Filter test files by name pattern

Examples:
  freelang run program.free
  freelang eval "5 + 3"
  freelang test                  # 현재 디렉토리에서 테스트 파일 탐색
  freelang test my_module.fl     # 특정 파일 테스트
  freelang test src/ --pattern core  # src/에서 'core' 포함 파일만
  freelang build --test program.fl   # 테스트 빌드 (test 블록 포함)
  freelang run program.free --aot -o program_bin
`);
  }

  /**
   * Print version
   */
  private printVersion(): void {
    console.log('FreeLang v2.0.0-beta (Phase 18 Day 6)');
  }

  /**
   * Run command
   */
  run(args: string[]): number {
    if (args.length === 0) {
      this.printHelp();
      return 0;
    }

    const { command, file, options } = this.parseArgs(args);

    try {
      switch (command) {
        case 'run': {
          if (!file) {
            console.error('Error: run requires a file path');
            return 1;
          }

          // Phase 5: AOT compilation
          if (options.aot) {
            if (!options.output) {
              console.error('Error: --aot requires -o <output_path>');
              return 1;
            }
            const aotResult = compileAOT(file, options.output);
            if (!aotResult.success) {
              console.error(`AOT Compilation Error: ${aotResult.error}`);
              return 1;
            }
            if (options.verbose) {
              console.log(`[aot] Compiled to ${aotResult.binaryPath}`);
              console.log(`[time] ${aotResult.duration}ms`);
            } else {
              console.log(aotResult.binaryPath);
            }
            return 0;
          }

          const result = this.runner.runFile(file);

          if (options.verbose) {
            console.log(`[run] ${path.basename(file)}`);
            console.log(`[time] ${result.executionTime}ms`);
          }

          if (result.error) {
            console.error(`Error: ${result.error}`);
          } else if (result.output !== undefined) {
            console.log(result.output);
          }

          return result.exitCode;
        }

        case 'eval': {
          if (!file) {
            console.error('Error: eval requires code');
            return 1;
          }

          const result = this.runner.runString(file);

          if (options.verbose) {
            console.log(`[eval] "${file}"`);
            console.log(`[time] ${result.executionTime}ms`);
          }

          if (result.error) {
            console.error(`Error: ${result.error}`);
          } else if (result.output !== undefined) {
            console.log(result.output);
          }

          return result.exitCode;
        }

        case 'ir': {
          if (!file) {
            console.error('Error: ir requires code');
            return 1;
          }

          try {
            const ir = this.runner.getIR(file);

            console.log(`IR for: "${file}"`);
            console.log(`Instructions: ${ir.length}`);
            console.log('');

            ir.forEach((inst, idx) => {
              let line = `  [${idx}] ${inst.op}`;
              if (inst.arg !== undefined) {
                line += ` arg=${JSON.stringify(inst.arg)}`;
              }
              if (inst.sub) {
                line += ` sub=${inst.sub.length} instructions`;
              }
              console.log(line);
            });

            return 0;
          } catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            return 2;
          }
        }

        // Self-Testing Compiler: test 커맨드
        // freelang test [path] [--pattern str] [--verbose]
        case 'test': {
          const tester = new ProofTester({ verbose: options.verbose });

          if (file) {
            // 파일 또는 디렉토리 지정
            const fs = require('fs') as typeof import('fs');
            const stat = fs.statSync(file);

            if (stat.isDirectory()) {
              const report = tester.runDirectory(file, options.pattern);
              return report.failed > 0 ? 1 : 0;
            } else {
              const report = tester.runSingle(file);
              return report.failed > 0 ? 1 : 0;
            }
          } else {
            // 현재 디렉토리에서 탐색
            const report = tester.runDirectory('.', options.pattern);
            return report.failed > 0 ? 1 : 0;
          }
        }

        // build 커맨드: --test 플래그로 test 블록 포함 빌드
        case 'build': {
          if (!file) {
            console.error('Error: build requires a file path');
            return 1;
          }

          if (options.test) {
            // 테스트 빌드: test 블록을 실행 모드로 진입
            const tester = new ProofTester({ verbose: options.verbose });
            const report = tester.runSingle(file);
            return report.failed > 0 ? 1 : 0;
          }

          // 일반 빌드 (AOT)
          if (options.aot) {
            if (!options.output) {
              console.error('Error: --aot requires -o <output_path>');
              return 1;
            }
            const aotResult = compileAOT(file, options.output);
            if (!aotResult.success) {
              console.error(`Build Error: ${aotResult.error}`);
              return 1;
            }
            console.log(aotResult.binaryPath);
            return 0;
          }

          console.error('Error: build requires --test or --aot flag');
          return 1;
        }

        case 'help':
          this.printHelp();
          return 0;

        case 'version':
          this.printVersion();
          return 0;

        default:
          console.error(`Unknown command: ${command}`);
          console.log('Use "freelang help" for usage information');
          return 1;
      }
    } catch (error) {
      console.error(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
      return 127;
    }
  }
}

/**
 * Main entry point (called by bin/freelang)
 */
export function main(args: string[]): void {
  const cli = new FreeLangCLI();
  const exitCode = cli.run(args);
  // HTTP 서버가 실행 중이면 이벤트 루프가 살아있으므로 process.exit 대신
  // exitCode만 설정하고 이벤트 루프가 자연스럽게 종료되도록 함
  process.exitCode = exitCode;
}
