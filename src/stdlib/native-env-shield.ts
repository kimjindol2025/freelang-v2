/**
 * FreeLang v2 - Native-Env-Shield
 *
 * dotenv-safe 외부 패키지 0개 대체.
 * Node.js 내장 process.env만 사용.
 *
 * 핵심 설계:
 *   - Boot-time validation: 유저 코드 실행 전 env_boot_check() 자동 주입
 *   - Spec registry: @require_env 어노테이션 → 컴파일 타임 스펙 등록
 *   - Pattern matching: 정규식 패턴 검증 (내장 RegExp)
 *   - Secret masking: secret: true → 로그에서 마스킹 처리
 *   - process.exit(1): 필수 변수 누락 시 명확한 에러 출력 후 즉시 종료
 *
 * 제공 함수 (10개):
 *   env_define(key, constraints_str)  → 스펙 등록
 *   env_require(key, pattern?, default_val?) → 값 반환 (없으면 즉시 종료)
 *   env_get(key, default_val?)        → 값 반환 (없으면 null/default)
 *   env_validate_all()                → {ok, missing, invalid, count}
 *   env_boot_check()                  → 전체 스펙 검증 + 실패 시 process.exit(1)
 *   env_list()                        → 등록된 스펙 목록 (array of map)
 *   env_loaded()                      → 현재 process.env 전체 map
 *   env_set(key, value)               → process.env 동적 설정
 *   env_violations()                  → 검증 실패 목록 (array of map)
 *   env_shield_stats()                → 통계 map
 *
 * constraints_str 형식:
 *   "required|pattern=^postgres://.*|secret|default=info"
 *
 * @require_env 어노테이션 형식:
 *   @require_env(key: "DATABASE_URL", pattern: "^postgres://.*")
 *   @require_env(key: "API_KEY", secret: true)
 *   @require_env(key: "LOG_LEVEL", default: "info")
 */

import { NativeFunctionRegistry } from '../vm/native-function-registry';

// ─────────────────────────────────────────────────────────────
// 내부 타입 정의
// ─────────────────────────────────────────────────────────────

interface EnvSpec {
  key: string;
  required: boolean;
  pattern?: RegExp;
  patternStr?: string;
  secret: boolean;
  defaultVal?: string;
}

interface EnvViolation {
  key: string;
  rule: 'missing' | 'pattern_mismatch';
  message: string;
  timestamp: string;
}

// ─────────────────────────────────────────────────────────────
// 글로벌 스펙 레지스트리 (프로세스 단위)
// ─────────────────────────────────────────────────────────────

const specRegistry = new Map<string, EnvSpec>();
const violationLog: EnvViolation[] = [];
const MAX_VIOLATIONS = 500;

// ─────────────────────────────────────────────────────────────
// 내부 헬퍼
// ─────────────────────────────────────────────────────────────

/**
 * constraints_str 파싱 → EnvSpec
 * 형식: "required|pattern=^postgres://.*|secret|default=info"
 */
function parseConstraints(key: string, constraintStr: string): EnvSpec {
  const spec: EnvSpec = {
    key,
    required: false,
    secret: false,
  };

  const parts = constraintStr.split('|').map(p => p.trim()).filter(Boolean);
  for (const part of parts) {
    if (part === 'required') {
      spec.required = true;
    } else if (part === 'secret') {
      spec.secret = true;
    } else if (part.startsWith('pattern=')) {
      spec.patternStr = part.slice('pattern='.length);
      try {
        spec.pattern = new RegExp(spec.patternStr);
      } catch {
        // 잘못된 패턴 → 무시
      }
    } else if (part.startsWith('default=')) {
      spec.defaultVal = part.slice('default='.length);
    }
  }

  return spec;
}

/**
 * 단일 스펙 검증 → violations 배열 반환
 */
function validateSpec(spec: EnvSpec): EnvViolation[] {
  const violations: EnvViolation[] = [];
  const val = process.env[spec.key];
  const now = new Date().toISOString();

  if (val === undefined || val === '') {
    if (spec.required && spec.defaultVal === undefined) {
      violations.push({
        key: spec.key,
        rule: 'missing',
        message: `필수 환경변수 '${spec.key}'가 설정되지 않았습니다`,
        timestamp: now,
      });
    }
  } else if (spec.pattern && !spec.pattern.test(val)) {
    const display = spec.secret ? '[MASKED]' : `'${val}'`;
    violations.push({
      key: spec.key,
      rule: 'pattern_mismatch',
      message: `환경변수 '${spec.key}'의 값 ${display}이 패턴 '${spec.patternStr}'에 맞지 않습니다`,
      timestamp: now,
    });
  }

  return violations;
}

/**
 * 값 마스킹 (secret: true인 경우)
 */
function maskValue(spec: EnvSpec, val: string): string {
  if (!spec.secret) return val;
  if (val.length <= 4) return '****';
  return val.slice(0, 4) + '****';
}

// ─────────────────────────────────────────────────────────────
// NativeFunctionRegistry 등록
// ─────────────────────────────────────────────────────────────

export function registerEnvShieldFunctions(registry: NativeFunctionRegistry): void {

  // env_define(key, constraints_str) → bool
  // 스펙 등록. constraints_str: "required|secret|pattern=^postgres://.*|default=info"
  registry.register({
    name: 'env_define',
    module: 'env_shield',
    executor: (args) => {
      const key = String(args[0] || '').trim();
      const constraintStr = String(args[1] || '');
      if (!key) return false;

      const spec = parseConstraints(key, constraintStr);
      specRegistry.set(key, spec);
      return true;
    }
  });

  // env_require(key, pattern?, default_val?) → string
  // 값이 없으면 즉시 process.exit(1)
  registry.register({
    name: 'env_require',
    module: 'env_shield',
    executor: (args) => {
      const key = String(args[0] || '').trim();
      const patternStr = args[1] !== undefined ? String(args[1]) : undefined;
      const defaultVal = args[2] !== undefined ? String(args[2]) : undefined;

      let val = process.env[key];

      if ((val === undefined || val === '') && defaultVal !== undefined) {
        val = defaultVal;
      }

      if (val === undefined || val === '') {
        console.error(`\n[Native-Env-Shield] FATAL: 필수 환경변수 '${key}'가 설정되지 않았습니다.`);
        console.error(`  설정 방법: export ${key}=<값>`);
        console.error(`  또는 .env 파일에 ${key}=<값> 추가\n`);
        process.exit(1);
      }

      if (patternStr) {
        try {
          const re = new RegExp(patternStr);
          if (!re.test(val)) {
            console.error(`\n[Native-Env-Shield] FATAL: 환경변수 '${key}'의 값이 패턴 '${patternStr}'에 맞지 않습니다.`);
            console.error(`  현재 값: '${val}'`);
            console.error(`  예시: export ${key}=<올바른 형식의 값>\n`);
            process.exit(1);
          }
        } catch {
          // 잘못된 패턴 → 검증 스킵
        }
      }

      return val;
    }
  });

  // env_get(key, default_val?) → string | null
  // 없으면 default_val 또는 null 반환 (종료하지 않음)
  registry.register({
    name: 'env_get',
    module: 'env_shield',
    executor: (args) => {
      const key = String(args[0] || '').trim();
      const defaultVal = args[1] !== undefined ? String(args[1]) : null;
      const val = process.env[key];
      if (val === undefined || val === '') return defaultVal;
      return val;
    }
  });

  // env_validate_all() → map { ok, missing, invalid, count }
  // 등록된 모든 스펙 검증 (종료하지 않음)
  registry.register({
    name: 'env_validate_all',
    module: 'env_shield',
    executor: (_args) => {
      const result = new Map<string, any>();
      const missing: string[] = [];
      const invalid: string[] = [];
      let totalViolations = 0;

      for (const spec of specRegistry.values()) {
        const vs = validateSpec(spec);
        for (const v of vs) {
          totalViolations++;
          if (violationLog.length < MAX_VIOLATIONS) {
            violationLog.push(v);
          }
          if (v.rule === 'missing') missing.push(v.key);
          else if (v.rule === 'pattern_mismatch') invalid.push(v.key);
        }
      }

      result.set('ok', totalViolations === 0);
      result.set('missing', missing);
      result.set('invalid', invalid);
      result.set('count', totalViolations);
      return result;
    }
  });

  // env_boot_check() → map { ok, checked } | 실패 시 process.exit(1)
  // 등록된 모든 스펙 검증 + 실패 시 명확한 에러 출력 후 종료
  registry.register({
    name: 'env_boot_check',
    module: 'env_shield',
    executor: (_args) => {
      const violations: EnvViolation[] = [];

      for (const spec of specRegistry.values()) {
        const vs = validateSpec(spec);
        violations.push(...vs);
      }

      const result = new Map<string, any>();

      if (violations.length === 0) {
        result.set('ok', true);
        result.set('checked', specRegistry.size);
        return result;
      }

      // 실패 → 명확한 에러 출력 + 종료
      console.error('\n╔══════════════════════════════════════════════════════════════╗');
      console.error('║      [Native-Env-Shield] 환경변수 검증 실패                 ║');
      console.error('╚══════════════════════════════════════════════════════════════╝');
      console.error(`  총 ${violations.length}개 항목 실패:\n`);

      for (const v of violations) {
        const icon = v.rule === 'missing' ? '✗ MISSING' : '✗ INVALID';
        console.error(`  ${icon}: ${v.key}`);
        console.error(`    → ${v.message}`);
        const spec = specRegistry.get(v.key);
        if (spec) {
          if (spec.defaultVal !== undefined) {
            console.error(`    → 기본값: '${spec.defaultVal}'`);
          }
          if (spec.patternStr) {
            console.error(`    → 필요 패턴: ${spec.patternStr}`);
          }
          console.error(`    → 설정: export ${v.key}=<값>`);
        }
        console.error('');
      }

      console.error('  프로그램을 시작할 수 없습니다. 환경변수를 설정 후 재시작하세요.\n');
      process.exit(1);
    }
  });

  // env_list() → array of map { key, required, secret, pattern, has_default, current_set }
  // 등록된 스펙 목록
  registry.register({
    name: 'env_list',
    module: 'env_shield',
    executor: (_args) => {
      const list: Map<string, any>[] = [];
      for (const spec of specRegistry.values()) {
        const entry = new Map<string, any>();
        entry.set('key', spec.key);
        entry.set('required', spec.required);
        entry.set('secret', spec.secret);
        entry.set('pattern', spec.patternStr || '');
        entry.set('has_default', spec.defaultVal !== undefined);
        entry.set('default', spec.defaultVal || '');
        const val = process.env[spec.key];
        entry.set('current_set', val !== undefined && val !== '');
        list.push(entry);
      }
      return list;
    }
  });

  // env_loaded() → map of key → value (현재 process.env 전체)
  // secret 스펙에 등록된 키는 마스킹 처리
  registry.register({
    name: 'env_loaded',
    module: 'env_shield',
    executor: (_args) => {
      const result = new Map<string, any>();
      for (const [k, v] of Object.entries(process.env)) {
        if (v === undefined) continue;
        const spec = specRegistry.get(k);
        if (spec && spec.secret) {
          result.set(k, maskValue(spec, v));
        } else {
          result.set(k, v);
        }
      }
      return result;
    }
  });

  // env_set(key, value) → bool
  // process.env에 동적 설정 (런타임 주입)
  registry.register({
    name: 'env_set',
    module: 'env_shield',
    executor: (args) => {
      const key = String(args[0] || '').trim();
      const value = String(args[1] ?? '');
      if (!key) return false;
      process.env[key] = value;
      return true;
    }
  });

  // env_violations() → array of map { key, rule, message, timestamp }
  // 최근 env_validate_all() 또는 env_boot_check() 실행에서 수집된 위반 목록
  registry.register({
    name: 'env_violations',
    module: 'env_shield',
    executor: (_args) => {
      return violationLog.map(v => {
        const m = new Map<string, any>();
        m.set('key', v.key);
        m.set('rule', v.rule);
        m.set('message', v.message);
        m.set('timestamp', v.timestamp);
        return m;
      });
    }
  });

  // env_shield_stats() → map { specs, violations, env_count, ok }
  // 통계 정보
  registry.register({
    name: 'env_shield_stats',
    module: 'env_shield',
    executor: (_args) => {
      const result = new Map<string, any>();
      result.set('specs', specRegistry.size);
      result.set('violations', violationLog.length);
      result.set('env_count', Object.keys(process.env).length);

      // 등록된 스펙 중 현재 통과하는 것 수
      let passing = 0;
      for (const spec of specRegistry.values()) {
        if (validateSpec(spec).length === 0) passing++;
      }
      result.set('passing', passing);
      result.set('ok', passing === specRegistry.size);
      return result;
    }
  });
}
