/**
 * FreeLang v2 - CLI 라이브러리 네이티브 함수
 *
 * Commander 완전 대체 (npm zero-dependency)
 * - 인자 파싱
 * - 헬프 생성
 * - 서브커맨드 관리
 * - 스타일 출력 (색상, 스피너, 진행표시)
 * - 대화형 입력 (prompt, confirm, select)
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';
import * as readline from 'readline';

/**
 * CLI 함수 등록
 */
export function registerCLIFunctions(registry: NativeFunctionRegistry): void {
  // cli_parse(cmd, args) -> ParseResult
  // 커맨드라인 인자를 파싱
  registry.register({
    name: 'cli_parse',
    module: 'cli',
    executor: (args) => {
      const cmd = args[0] as any;
      const rawArgs = (args[1] as any[]) || [];

      const result = {
        command: '',
        args: {} as any,
        flags: {} as any,
        rest: [] as any[]
      };

      let i = 0;
      let positionalIndex = 0;

      while (i < rawArgs.length) {
        const arg = String(rawArgs[i]);

        if (arg.startsWith('--')) {
          // Long flag: --name=value or --name value
          const eqIdx = arg.indexOf('=');
          let flagName: string;
          let flagValue: any = true;

          if (eqIdx > 0) {
            flagName = arg.substring(2, eqIdx);
            flagValue = arg.substring(eqIdx + 1);
          } else {
            flagName = arg.substring(2);
            // Check next arg for value
            if (i + 1 < rawArgs.length && !String(rawArgs[i + 1]).startsWith('-')) {
              flagValue = rawArgs[i + 1];
              i++;
            }
          }

          // Find flag definition
          const flagDef = (cmd.flags || []).find((f: any) =>
            f.name === flagName || f.alias === flagName
          );

          if (flagDef) {
            if (flagDef.type === 'int') {
              flagValue = parseInt(String(flagValue)) || flagDef.defaultVal;
            } else if (flagDef.type === 'bool') {
              flagValue = flagValue === 'true' || flagValue === '1' || flagValue === true;
            }
          }

          result.flags[flagName] = flagValue;
        } else if (arg.startsWith('-') && arg.length > 1) {
          // Short flags: -abc or -a value
          const flags = arg.substring(1);

          for (let j = 0; j < flags.length; j++) {
            const shortFlag = flags[j];
            const flagDef = (cmd.flags || []).find((f: any) => f.alias === shortFlag);

            if (flagDef) {
              let flagValue: any = true;

              if (flagDef.type !== 'bool' && j === flags.length - 1) {
                // Last flag in group, can take next arg as value
                if (i + 1 < rawArgs.length && !String(rawArgs[i + 1]).startsWith('-')) {
                  flagValue = rawArgs[i + 1];
                  i++;
                }
              }

              if (flagDef.type === 'int') {
                flagValue = parseInt(String(flagValue)) || flagDef.defaultVal;
              }

              result.flags[flagDef.name] = flagValue;
            }
          }
        } else {
          // Positional arg or subcommand
          if (result.command === '' && positionalIndex === 0) {
            result.command = arg;
          } else {
            if (positionalIndex < (cmd.args || []).length) {
              const argDef = cmd.args[positionalIndex];
              result.args[argDef.name] = arg;
              positionalIndex++;
            } else {
              result.rest.push(arg);
            }
          }
        }

        i++;
      }

      // Apply defaults
      for (const flagDef of cmd.flags || []) {
        if (!(flagDef.name in result.flags)) {
          result.flags[flagDef.name] = flagDef.defaultVal;
        }
      }

      return result;
    }
  });

  // proc_args() -> array
  // 프로세스 인자 반환
  registry.register({
    name: 'proc_args',
    module: 'cli',
    executor: () => {
      return process.argv.slice(2);
    }
  });

  // cli_help(cmd) -> string
  // 헬프 텍스트 생성
  registry.register({
    name: 'cli_help',
    module: 'cli',
    executor: (args) => {
      const cmd = args[0] as any;
      const lines: string[] = [];

      // Usage line
      let usage = `Usage: ${cmd.name}`;
      if ((cmd.flags || []).length > 0) {
        usage += ' [OPTIONS]';
      }
      if ((cmd.args || []).length > 0) {
        usage += ' ' + (cmd.args || [])
          .map((a: any) => a.required ? `<${a.name}>` : `[${a.name}]`)
          .join(' ');
      }
      if ((cmd.subcommands || []).length > 0) {
        usage += ' [COMMAND]';
      }
      lines.push(usage);
      lines.push('');

      // Description
      if (cmd.description) {
        lines.push(cmd.description);
        lines.push('');
      }

      // Subcommands
      if ((cmd.subcommands || []).length > 0) {
        lines.push('Commands:');
        for (const sub of cmd.subcommands) {
          lines.push(`  ${sub.name.padEnd(16)}  ${sub.description || ''}`);
        }
        lines.push('');
      }

      // Arguments
      if ((cmd.args || []).length > 0) {
        lines.push('Arguments:');
        for (const arg of cmd.args) {
          const argStr = arg.required ? `<${arg.name}>` : `[${arg.name}]`;
          lines.push(`  ${argStr.padEnd(16)}  ${arg.description || ''}`);
        }
        lines.push('');
      }

      // Flags/Options
      if ((cmd.flags || []).length > 0) {
        lines.push('Options:');
        for (const flag of cmd.flags) {
          let flagStr = `  --${flag.name}`;
          if (flag.alias) {
            flagStr += `, -${flag.alias}`;
          }
          lines.push(`${flagStr.padEnd(20)}  ${flag.description || ''}`);
        }
        lines.push('');
      }

      // Version
      if (cmd.version) {
        lines.push(`Version: ${cmd.version}`);
      }

      return lines.join('\n');
    }
  });

  // proc_print(msg) -> void
  // 표준출력 (줄바꿈 없음)
  registry.register({
    name: 'proc_print',
    module: 'cli',
    executor: (args) => {
      process.stdout.write(String(args[0] || ''));
      return null;
    }
  });

  // cli_print(msg) -> void
  registry.register({
    name: 'cli_print',
    module: 'cli',
    executor: (args) => {
      process.stdout.write(String(args[0] || ''));
      return null;
    }
  });

  // cli_println(msg) -> void
  registry.register({
    name: 'cli_println',
    module: 'cli',
    executor: (args) => {
      console.log(String(args[0] || ''));
      return null;
    }
  });

  // cli_err(msg) -> void
  // 표준에러 출력
  registry.register({
    name: 'cli_err',
    module: 'cli',
    executor: (args) => {
      console.error(String(args[0] || ''));
      return null;
    }
  });

  // cli_run(cmd, handlers) -> void
  // 커맨드 실행 (핸들러 매핑)
  registry.register({
    name: 'cli_run',
    module: 'cli',
    executor: (args) => {
      const cmd = args[0] as any;
      const handlers = args[1] as any;

      try {
        // Parse current args
        const parseResult = {
          command: '',
          args: {} as any,
          flags: {} as any,
          rest: [] as any[]
        };

        // 핸들러 실행
        if (handlers && typeof handlers === 'object') {
          if (parseResult.command && handlers[parseResult.command]) {
            handlers[parseResult.command](parseResult);
          } else if (handlers.default) {
            handlers.default(parseResult);
          }
        }
      } catch (error) {
        console.error('Error running command:', error);
      }

      return null;
    }
  });

  // cli_spinner(msg) -> spinner
  // 로딩 스피너 시작
  registry.register({
    name: 'cli_spinner',
    module: 'cli',
    executor: (args) => {
      const msg = String(args[0] || 'Loading...');
      const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

      let frameIdx = 0;
      const spinner = {
        intervalId: setInterval(() => {
          process.stdout.write(`\r${frames[frameIdx % frames.length]} ${msg}`);
          frameIdx++;
        }, 80),
        message: msg
      };

      return spinner;
    }
  });

  // cli_spinner_stop(spinner, finalMsg) -> void
  registry.register({
    name: 'cli_spinner_stop',
    module: 'cli',
    executor: (args) => {
      const spinner = args[0] as any;
      const finalMsg = String(args[1] || 'Done');

      if (spinner && spinner.intervalId) {
        clearInterval(spinner.intervalId);
      }

      process.stdout.write(`\r✓ ${finalMsg}\n`);
      return null;
    }
  });

  // cli_progress(total, label) -> progress
  // 진행 표시 시작
  registry.register({
    name: 'cli_progress',
    module: 'cli',
    executor: (args) => {
      const total = parseInt(String(args[0])) || 100;
      const label = String(args[1] || 'Progress');

      return {
        total,
        label,
        current: 0,
        width: 30
      };
    }
  });

  // cli_progress_tick(progress, n) -> void
  registry.register({
    name: 'cli_progress_tick',
    module: 'cli',
    executor: (args) => {
      const progress = args[0] as any;
      const n = parseInt(String(args[1])) || 1;

      progress.current = Math.min(progress.current + n, progress.total);

      const ratio = progress.current / progress.total;
      const filledLen = Math.round(ratio * progress.width);
      const emptyLen = progress.width - filledLen;

      const bar = '█'.repeat(filledLen) + '░'.repeat(emptyLen);
      const percent = Math.round(ratio * 100);

      process.stdout.write(
        `\r${progress.label} [${bar}] ${percent}% (${progress.current}/${progress.total})`
      );

      return null;
    }
  });

  // cli_progress_done(progress) -> void
  registry.register({
    name: 'cli_progress_done',
    module: 'cli',
    executor: (args) => {
      process.stdout.write('\n');
      return null;
    }
  });

  // cli_prompt(question) -> string
  // 사용자 입력 받기
  registry.register({
    name: 'cli_prompt',
    module: 'cli',
    executor: async (args) => {
      const question = String(args[0] || 'Input: ');

      return new Promise((resolve) => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        rl.question(question, (answer) => {
          rl.close();
          resolve(answer);
        });
      });
    }
  });

  // cli_confirm(question) -> bool
  // yes/no 확인
  registry.register({
    name: 'cli_confirm',
    module: 'cli',
    executor: async (args) => {
      const question = String(args[0] || 'Confirm? (y/n) ');

      return new Promise((resolve) => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        rl.question(question, (answer) => {
          rl.close();
          resolve(answer.toLowerCase()[0] === 'y');
        });
      });
    }
  });

  // cli_select(question, choices) -> string
  // 선택지 중 선택
  registry.register({
    name: 'cli_select',
    module: 'cli',
    executor: async (args) => {
      const question = String(args[0] || 'Choose: ');
      const choices = (args[1] as any[]) || [];

      return new Promise((resolve) => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        console.log(question);
        for (let i = 0; i < choices.length; i++) {
          console.log(`  ${i + 1}. ${choices[i]}`);
        }

        rl.question('Select (1-' + choices.length + '): ', (answer) => {
          rl.close();
          const idx = parseInt(answer) - 1;
          const selected = idx >= 0 && idx < choices.length
            ? choices[idx]
            : choices[0];
          resolve(selected);
        });
      });
    }
  });

  // cli_table(headers, rows) -> void
  // 테이블 출력
  registry.register({
    name: 'cli_table',
    module: 'cli',
    executor: (args) => {
      const headers = (args[0] as any[]) || [];
      const rows = (args[1] as any[]) || [];

      if (headers.length === 0) return null;

      // Calculate column widths
      const widths = headers.map((h: any) => String(h).length);
      for (const row of rows) {
        for (let i = 0; i < headers.length; i++) {
          const cellWidth = String(row[i] || '').length;
          widths[i] = Math.max(widths[i], cellWidth);
        }
      }

      // Print table
      const sep = '+' + widths.map(w => '-'.repeat(w + 2)).join('+') + '+';
      console.log(sep);

      // Headers
      const headerLine = '| ' +
        headers.map((h: any, i: number) => String(h).padEnd(widths[i])).join(' | ') +
        ' |';
      console.log(headerLine);
      console.log(sep);

      // Rows
      for (const row of rows) {
        const rowLine = '| ' +
          row.map((cell: any, i: number) => String(cell || '').padEnd(widths[i])).join(' | ') +
          ' |';
        console.log(rowLine);
      }

      console.log(sep);
      return null;
    }
  });

  // cli_box(content, title) -> void
  // 테두리 박스 출력
  registry.register({
    name: 'cli_box',
    module: 'cli',
    executor: (args) => {
      const content = String(args[0] || '');
      const title = String(args[1] || '');

      const lines = content.split('\n');
      const maxWidth = Math.max(
        ...lines.map(l => l.length),
        title.length
      );

      console.log('╭' + '─'.repeat(maxWidth + 2) + '╮');
      if (title) {
        console.log('│ ' + title.padEnd(maxWidth) + ' │');
        console.log('├' + '─'.repeat(maxWidth + 2) + '┤');
      }

      for (const line of lines) {
        console.log('│ ' + line.padEnd(maxWidth) + ' │');
      }

      console.log('╰' + '─'.repeat(maxWidth + 2) + '╯');
      return null;
    }
  });

  // cli_clear() -> void
  // 화면 초기화
  registry.register({
    name: 'cli_clear',
    module: 'cli',
    executor: () => {
      console.clear();
      return null;
    }
  });
}

// Helper to store parse result
let lastParseResult: any = null;
