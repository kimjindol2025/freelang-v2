/**
 * FreeLang v2 - Self-Formatting Compiler: CLI 진입점
 *
 * 사용법:
 *   freelang fmt [옵션] <파일...>
 *
 * 옵션:
 *   --write            파일을 직접 덮어씁니다 (기본: dry-run)
 *   --check            변경사항 있으면 exit 1 (CI/CD 파이프라인용)
 *   --indent=N         들여쓰기 칸 수 (기본: 4)
 *   --semi             세미콜론 추가 (기본: false)
 *   --single-quote     작은따옴표 사용 (기본: false)
 *   --trailing-comma   후행 쉼표 (기본: false)
 *
 * 예시:
 *   freelang fmt main.fl                  # dry-run (미리보기)
 *   freelang fmt --write src/**.fl        # 모든 .fl 파일 포맷팅
 *   freelang fmt --check src/**.fl        # CI 검사
 *   freelang fmt --indent=2 --semi app.fl # 커스텀 정책
 *
 * 셀프호스팅 증명:
 *   freelang fmt --write src/formatter/self-format.ts
 *   → 이 컴파일러가 자기 자신의 소스를 포맷팅합니다.
 */

import { selfFormatter } from '../formatter/self-format';
import { FormatOptions } from '../formatter/pretty-printer';

// ─────────────────────────────────────────────────────────────────
// CLI 인수 파싱
// ─────────────────────────────────────────────────────────────────

export interface FormatCliArgs {
  files: string[];
  write: boolean;
  check: boolean;
  options: Partial<FormatOptions>;
}

export function parseFormatArgs(argv: string[]): FormatCliArgs {
  const args: FormatCliArgs = {
    files: [],
    write: false,
    check: false,
    options: {},
  };

  for (const arg of argv) {
    if (arg === '--write') {
      args.write = true;
    } else if (arg === '--check') {
      args.check = true;
    } else if (arg === '--semi') {
      args.options.semi = true;
    } else if (arg === '--single-quote') {
      args.options.singleQuote = true;
    } else if (arg === '--trailing-comma') {
      args.options.trailingComma = true;
    } else if (arg.startsWith('--indent=')) {
      const n = parseInt(arg.slice('--indent='.length), 10);
      if (!isNaN(n) && n > 0) args.options.indent = n;
    } else if (arg.startsWith('--max-width=')) {
      const n = parseInt(arg.slice('--max-width='.length), 10);
      if (!isNaN(n) && n > 0) args.options.maxWidth = n;
    } else if (!arg.startsWith('--')) {
      args.files.push(arg);
    }
  }

  return args;
}

// ─────────────────────────────────────────────────────────────────
// CLI 실행 핸들러
// ─────────────────────────────────────────────────────────────────

export interface FormatCliResult {
  ok: boolean;
  summary: string;
  details: string[];
  exitCode: number;
}

export function handleFormatCommand(argv: string[]): FormatCliResult {
  const args = parseFormatArgs(argv);

  if (args.files.length === 0) {
    return {
      ok: false,
      summary: '포맷팅할 파일이 없습니다.',
      details: ['사용법: freelang fmt [--write] [--check] <파일...>'],
      exitCode: 1,
    };
  }

  const results = selfFormatter.formatFiles(args.files, args.write, args.options);
  const details: string[] = [];
  let anyChanged = false;
  let anyError = false;

  for (const r of results) {
    if (r.error) {
      details.push(`❌ ${r.filePath}: ${r.error}`);
      anyError = true;
      continue;
    }

    if (r.changed) {
      anyChanged = true;
      const saved = r.stats.charsSaved;
      const action = args.write ? '✏️  포맷됨' : '⚠️  변경 필요';
      details.push(`${action}: ${r.filePath} (${saved > 0 ? '-' : '+'}${Math.abs(saved)}자, ${r.stats.parseTimeMs + r.stats.printTimeMs}ms)`);
    } else {
      details.push(`✅ 변경 없음: ${r.filePath}`);
    }
  }

  // --check 모드: 변경사항 있으면 exit 1
  if (args.check && anyChanged) {
    return {
      ok: false,
      summary: `${results.filter(r => r.changed).length}개 파일에 포맷 변경이 필요합니다.`,
      details,
      exitCode: 1,
    };
  }

  const changedCount = results.filter(r => r.changed).length;
  const okCount = results.filter(r => !r.changed && !r.error).length;
  const errCount = results.filter(r => !!r.error).length;

  const summary = [
    changedCount > 0 && `${changedCount}개 포맷됨`,
    okCount > 0 && `${okCount}개 이미 정상`,
    errCount > 0 && `${errCount}개 오류`,
  ].filter(Boolean).join(', ');

  return {
    ok: !anyError,
    summary: summary || '변경사항 없음',
    details,
    exitCode: anyError ? 1 : 0,
  };
}
