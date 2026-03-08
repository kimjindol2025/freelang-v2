/**
 * FreeLang v2 stdlib — dotenv 네이티브 구현
 *
 * npm dotenv 완전 대체 (외부 npm 0개)
 * .env 파일 파싱, 환경변수 로드/검증 네이티브 함수 제공
 *
 * 등록 함수:
 *   dotenv_load_file(path)              → string | null
 *   dotenv_parse_content(content)       → Map<string,string>
 *   dotenv_apply(parsed, override)      → int (로드된 수)
 *   dotenv_expand_map(parsed)           → Map<string,string>
 *   dotenv_validate_vars(varsArray)     → { missing: string[], valid: bool }
 *   dotenv_keys_to_example(parsed)      → string (.env.example 내용)
 *
 * 기존 재사용 (env_shield에서):
 *   env_get(key, default?)              → string | null
 *   env_set(key, value)                 → bool
 */

import { NativeFunctionRegistry } from '../vm/native-function-registry';
import * as fs from 'fs';

// ============================================
// 내부 파싱 로직
// ============================================

/**
 * 한 줄을 파싱하여 [key, value] 반환
 * 파싱 불가 줄은 null 반환
 */
function parseDotenvLine(line: string): [string, string] | null {
  const trimmed = line.trim();

  // 빈 줄 또는 주석 무시
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  // "export KEY=VALUE" → "KEY=VALUE"
  const withoutExport = trimmed.startsWith('export ')
    ? trimmed.slice(7).trim()
    : trimmed;

  const eqIdx = withoutExport.indexOf('=');
  if (eqIdx < 0) return null;

  const key = withoutExport.slice(0, eqIdx).trim();
  if (!key) return null;

  let value = withoutExport.slice(eqIdx + 1);

  // 인라인 주석 제거 (따옴표 없는 경우만)
  const firstChar = value.trimStart()[0];
  if (firstChar !== '"' && firstChar !== "'") {
    const commentIdx = value.indexOf(' #');
    if (commentIdx >= 0) {
      value = value.slice(0, commentIdx);
    }
  }

  value = value.trim();

  // 따옴표 제거
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  // 이스케이프 시퀀스 변환 (큰따옴표 값만)
  if (withoutExport.slice(eqIdx + 1).trim().startsWith('"')) {
    value = value
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\\\/g, '\\');
  }

  return [key, value];
}

/**
 * .env 내용 문자열 전체 파싱 → Map<string,string>
 */
function parseDotenvContent(content: string): Map<string, string> {
  const result = new Map<string, string>();
  const lines = content.split('\n');

  for (const line of lines) {
    const pair = parseDotenvLine(line);
    if (pair) {
      result.set(pair[0], pair[1]);
    }
  }

  return result;
}

/**
 * ${VAR} 참조 확장
 */
function expandDotenvMap(parsed: Map<string, string>): Map<string, string> {
  const result = new Map<string, string>(parsed);

  for (const [key, rawVal] of result.entries()) {
    let value = rawVal;
    let iterations = 0;

    while (iterations < 10) {
      const match = value.match(/\$\{([^}]+)\}/);
      if (!match) break;

      const varName = match[1];
      const replacement = result.get(varName) ?? process.env[varName] ?? '';
      value = value.replace(`\${${varName}}`, replacement);
      iterations++;
    }

    result.set(key, value);
  }

  return result;
}

/**
 * Map → process.env 적용
 * override=false 이면 이미 설정된 키는 건너뜀
 * 반환값: 실제 설정된 변수 수
 */
function applyToEnv(parsed: Map<string, string>, override: boolean): number {
  let count = 0;

  for (const [key, value] of parsed.entries()) {
    if (!override && key in process.env) {
      continue;
    }
    process.env[key] = value;
    count++;
  }

  return count;
}

/**
 * Map → .env.example 포맷 문자열 생성
 */
function mapToExample(parsed: Map<string, string>): string {
  const lines: string[] = [];
  for (const key of parsed.keys()) {
    lines.push(`${key}=`);
  }
  return lines.join('\n') + '\n';
}

// ============================================
// 네이티브 함수 등록
// ============================================

export function registerDotenvFunctions(registry: NativeFunctionRegistry): void {

  // dotenv_load_file(path) → string | "ERROR: ..."
  // .env 파일을 읽어 내용 반환 (파싱 X)
  registry.register({
    name: 'dotenv_load_file',
    module: 'dotenv',
    executor: (args) => {
      const filepath = String(args[0] || '.env');
      try {
        if (!fs.existsSync(filepath)) {
          return null;
        }
        return fs.readFileSync(filepath, 'utf-8');
      } catch (e: any) {
        return `ERROR: ${e.message}`;
      }
    }
  });

  // dotenv_parse_content(content) → Map<string,string>
  // .env 포맷 문자열을 파싱하여 map 반환
  registry.register({
    name: 'dotenv_parse_content',
    module: 'dotenv',
    executor: (args) => {
      const content = String(args[0] || '');
      return parseDotenvContent(content);
    }
  });

  // dotenv_apply(parsed, override) → int
  // 파싱된 map을 process.env에 적용
  registry.register({
    name: 'dotenv_apply',
    module: 'dotenv',
    executor: (args) => {
      const parsed = args[0] as Map<string, string>;
      const override = Boolean(args[1]);
      if (!(parsed instanceof Map)) return 0;
      return applyToEnv(parsed, override);
    }
  });

  // dotenv_expand_map(parsed) → Map<string,string>
  // ${VAR} 참조 확장
  registry.register({
    name: 'dotenv_expand_map',
    module: 'dotenv',
    executor: (args) => {
      const parsed = args[0] as Map<string, string>;
      if (!(parsed instanceof Map)) return parsed;
      return expandDotenvMap(parsed);
    }
  });

  // dotenv_validate_vars(varsArray) → { missing: string[], valid: bool }
  // 필수 환경변수 존재 여부 검증
  registry.register({
    name: 'dotenv_validate_vars',
    module: 'dotenv',
    executor: (args) => {
      const vars = args[0] as string[];
      if (!Array.isArray(vars)) {
        return { missing: [], valid: true };
      }

      const missing = vars.filter(k => !(k in process.env) || process.env[k] === '');
      return {
        missing,
        valid: missing.length === 0
      };
    }
  });

  // dotenv_keys_to_example(parsed) → string
  // 파싱된 map의 키만 추출하여 .env.example 포맷 반환
  registry.register({
    name: 'dotenv_keys_to_example',
    module: 'dotenv',
    executor: (args) => {
      const parsed = args[0] as Map<string, string>;
      if (!(parsed instanceof Map)) return '';
      return mapToExample(parsed);
    }
  });

  // dotenv_load(path, override, debug, expand) → { parsed, error, loaded }
  // 원스톱 로드 (FL에서 직접 호출 가능한 단일 진입점)
  registry.register({
    name: 'dotenv_load',
    module: 'dotenv',
    executor: (args) => {
      const filepath = String(args[0] || '.env');
      const override = Boolean(args[1] ?? false);
      const debug   = Boolean(args[2] ?? false);
      const doExpand = Boolean(args[3] ?? false);

      try {
        if (!fs.existsSync(filepath)) {
          return { parsed: null, error: `ENOENT: 파일 없음: ${filepath}`, loaded: 0 };
        }

        const content = fs.readFileSync(filepath, 'utf-8');
        if (debug) process.stdout.write(`[dotenv] 파일 로드: ${filepath}\n`);

        let parsed = parseDotenvContent(content);
        if (doExpand) parsed = expandDotenvMap(parsed);

        const loaded = applyToEnv(parsed, override);
        if (debug) process.stdout.write(`[dotenv] 로드 완료: ${loaded}개\n`);

        return { parsed, error: '', loaded };
      } catch (e: any) {
        return { parsed: null, error: e.message, loaded: 0 };
      }
    }
  });

  // dotenv_load_default() → { parsed, error, loaded }
  // .env 기본 경로 로드 (override=false, expand=false)
  registry.register({
    name: 'dotenv_load_default',
    module: 'dotenv',
    executor: (_args) => {
      try {
        if (!fs.existsSync('.env')) {
          return { parsed: null, error: 'ENOENT: .env 파일 없음', loaded: 0 };
        }
        const content = fs.readFileSync('.env', 'utf-8');
        const parsed = parseDotenvContent(content);
        const loaded = applyToEnv(parsed, false);
        return { parsed, error: '', loaded };
      } catch (e: any) {
        return { parsed: null, error: e.message, loaded: 0 };
      }
    }
  });
}
