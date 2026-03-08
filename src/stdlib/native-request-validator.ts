/**
 * FreeLang v2 - Native-Request-Validator
 *
 * express-validator 외부 패키지 0개 대체.
 * Node.js 내장 모듈만 사용 (crypto for regex DFA).
 *
 * 제공 함수 (10개):
 *   validate_schema_register(name, schema_str)  → 스키마 등록
 *   validate_schema_list()                      → 등록된 스키마 목록
 *   validate_request(req, schema_name)          → 요청 검증 → {ok, errors}
 *   validate_field(val, constraint_str)         → 단일 필드 검증 → {ok, errors}
 *   validate_email(val)                         → 이메일 형식 검증 → bool
 *   validate_min_max(val, min, max)             → 길이/값 범위 → bool
 *   validate_range(val, min, max)               → 숫자 범위 → bool
 *   validate_required(val)                      → 필수 필드 → bool
 *   validate_regex(val, pattern)                → 정규식 검증 → bool
 *   validate_violation_list()                   → 최근 위반 목록 (array of map)
 *
 * 스키마 문자열 형식:
 *   "field1:type:constraint1|constraint2,field2:type:constraint"
 *
 *   타입: string | int | float | bool | email | any
 *   제약: required | email | min=N | max=N | range=N..M | regex=pattern | optional
 *
 * 예시:
 *   "email:string:required|email,password:string:required|min=8|max=32,age:int:optional|range=1..150"
 *
 * @validate_schema 어노테이션 형식 (파서가 serialize하여 IR 주입):
 *   @validate_schema(name: "register", schema: "email:string:required|email,password:string:required|min=8")
 */

import { NativeFunctionRegistry } from '../vm/native-function-registry';

// ─────────────────────────────────────────────────────────────
// 내부 타입 정의
// ─────────────────────────────────────────────────────────────

interface FieldSchema {
  name: string;
  type: 'string' | 'int' | 'float' | 'bool' | 'email' | 'any';
  constraints: ConstraintSet;
}

interface ConstraintSet {
  required: boolean;
  email: boolean;
  min?: number;       // string → min length, number → min value
  max?: number;       // string → max length, number → max value
  range?: { from: number; to: number };  // numeric range inclusive
  regex?: RegExp;
}

interface ValidationError {
  field: string;
  rule: string;
  message: string;
}

interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
}

// ─────────────────────────────────────────────────────────────
// 글로벌 스키마 레지스트리 (프로세스 단위)
// ─────────────────────────────────────────────────────────────

const schemaRegistry = new Map<string, FieldSchema[]>();
const MAX_VIOLATIONS = 1000;
const violationLog: Map<string, any>[] = [];

// ─────────────────────────────────────────────────────────────
// 이메일 DFA (RFC 5322 간략화 - 외부 라이브러리 미사용)
// lookahead 없이 단순 선형 스캔
// ─────────────────────────────────────────────────────────────

// 빌드 타임 컴파일: 이메일 패턴을 RegExp 객체로 고정
const EMAIL_REGEX = /^[^\s@"()<>[\]\\,;:]{1,64}@[^\s@"()<>[\]\\,;:]+\.[a-zA-Z]{2,}$/;

function isValidEmail(val: string): boolean {
  if (typeof val !== 'string') return false;
  const s = val.trim();
  if (s.length > 254 || s.length < 5) return false;
  return EMAIL_REGEX.test(s);
}

// ─────────────────────────────────────────────────────────────
// 스키마 문자열 파서
// 형식: "field:type:constraint1|constraint2,field2:type:..."
// ─────────────────────────────────────────────────────────────

function parseSchemaStr(schemaStr: string): FieldSchema[] {
  const fields: FieldSchema[] = [];
  const parts = schemaStr.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const segments = trimmed.split(':');
    if (segments.length < 2) continue;

    const name = segments[0].trim();
    const rawType = segments[1].trim().toLowerCase() as FieldSchema['type'];
    const type: FieldSchema['type'] =
      ['string', 'int', 'float', 'bool', 'email', 'any'].includes(rawType)
        ? rawType as FieldSchema['type']
        : 'any';

    const constraints: ConstraintSet = { required: false, email: false };

    // email 타입이면 email 제약 자동 추가
    if (type === 'email') {
      constraints.email = true;
      constraints.required = true;
    }

    const rawConstraints = segments.slice(2).join(':'); // ':' 포함 regex 대비
    const constraintList = rawConstraints.split('|');
    for (const c of constraintList) {
      const ct = c.trim().toLowerCase();
      if (!ct) continue;
      if (ct === 'required') {
        constraints.required = true;
      } else if (ct === 'optional') {
        constraints.required = false;
      } else if (ct === 'email') {
        constraints.email = true;
      } else if (ct.startsWith('min=')) {
        constraints.min = Number(ct.slice(4));
      } else if (ct.startsWith('max=')) {
        constraints.max = Number(ct.slice(4));
      } else if (ct.startsWith('range=')) {
        // range=1..150 또는 range=1:150
        const rangeStr = ct.slice(6);
        const sep = rangeStr.includes('..') ? '..' : ':';
        const [fromStr, toStr] = rangeStr.split(sep);
        constraints.range = { from: Number(fromStr), to: Number(toStr) };
      } else if (ct.startsWith('regex=')) {
        const pattern = c.trim().slice(6); // 원본 케이스 보존
        try {
          constraints.regex = new RegExp(pattern);
        } catch (_) {
          // 잘못된 regex → 무시
        }
      }
    }

    fields.push({ name, type, constraints });
  }
  return fields;
}

// ─────────────────────────────────────────────────────────────
// 단일 값 검증
// ─────────────────────────────────────────────────────────────

function validateValue(
  fieldName: string,
  val: any,
  schema: FieldSchema
): ValidationError[] {
  const errors: ValidationError[] = [];
  const missing = val === undefined || val === null || val === '';

  // required 체크
  if (schema.constraints.required && missing) {
    errors.push({
      field: fieldName,
      rule: 'required',
      message: `'${fieldName}' is required`
    });
    return errors; // 이후 검사 불필요
  }

  // optional이고 값이 없으면 OK
  if (missing) return errors;

  const strVal = String(val);

  // 타입 체크
  if (schema.type === 'int' || schema.type === 'float') {
    const num = Number(val);
    if (isNaN(num)) {
      errors.push({ field: fieldName, rule: 'type', message: `'${fieldName}' must be a number` });
      return errors;
    }
    if (schema.type === 'int' && !Number.isInteger(num)) {
      errors.push({ field: fieldName, rule: 'type', message: `'${fieldName}' must be an integer` });
    }
  } else if (schema.type === 'bool') {
    const lower = strVal.toLowerCase();
    if (!['true', 'false', '1', '0'].includes(lower)) {
      errors.push({ field: fieldName, rule: 'type', message: `'${fieldName}' must be a boolean` });
      return errors;
    }
  }

  // email 형식
  if (schema.constraints.email) {
    if (!isValidEmail(strVal)) {
      errors.push({ field: fieldName, rule: 'email', message: `'${fieldName}' must be a valid email address` });
    }
  }

  // min (string → length, number → value)
  if (schema.constraints.min !== undefined) {
    if (schema.type === 'string' || schema.type === 'email' || schema.type === 'any') {
      if (strVal.length < schema.constraints.min) {
        errors.push({ field: fieldName, rule: 'min', message: `'${fieldName}' must be at least ${schema.constraints.min} characters` });
      }
    } else {
      const num = Number(val);
      if (!isNaN(num) && num < schema.constraints.min) {
        errors.push({ field: fieldName, rule: 'min', message: `'${fieldName}' must be >= ${schema.constraints.min}` });
      }
    }
  }

  // max (string → length, number → value)
  if (schema.constraints.max !== undefined) {
    if (schema.type === 'string' || schema.type === 'email' || schema.type === 'any') {
      if (strVal.length > schema.constraints.max) {
        errors.push({ field: fieldName, rule: 'max', message: `'${fieldName}' must be at most ${schema.constraints.max} characters` });
      }
    } else {
      const num = Number(val);
      if (!isNaN(num) && num > schema.constraints.max) {
        errors.push({ field: fieldName, rule: 'max', message: `'${fieldName}' must be <= ${schema.constraints.max}` });
      }
    }
  }

  // range (숫자 전용)
  if (schema.constraints.range !== undefined) {
    const num = Number(val);
    const { from, to } = schema.constraints.range;
    if (isNaN(num) || num < from || num > to) {
      errors.push({ field: fieldName, rule: 'range', message: `'${fieldName}' must be between ${from} and ${to}` });
    }
  }

  // regex
  if (schema.constraints.regex !== undefined) {
    if (!schema.constraints.regex.test(strVal)) {
      errors.push({ field: fieldName, rule: 'regex', message: `'${fieldName}' does not match required pattern` });
    }
  }

  return errors;
}

// ─────────────────────────────────────────────────────────────
// 요청 맵에서 필드 값 추출
// FreeLang req 객체는 Map<string, any>이며 body는 JSON 문자열 또는 Map
// ─────────────────────────────────────────────────────────────

function extractFields(req: any): Map<string, any> {
  const result = new Map<string, any>();

  if (!(req instanceof Map)) return result;

  // 1) query 파라미터 병합
  const query = req.get('query');
  if (query instanceof Map) {
    query.forEach((v: any, k: string) => result.set(k, v));
  }

  // 2) body 파싱 (JSON 문자열 or Map)
  const body = req.get('body');
  if (body instanceof Map) {
    body.forEach((v: any, k: string) => result.set(k, v));
  } else if (typeof body === 'string' && body.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(body);
      for (const [k, v] of Object.entries(parsed)) {
        result.set(k, v);
      }
    } catch (_) {}
  }

  // 3) form fields 병합
  const fields = req.get('fields');
  if (fields instanceof Map) {
    fields.forEach((v: any, k: string) => result.set(k, v));
  }

  return result;
}

// ─────────────────────────────────────────────────────────────
// NativeFunctionRegistry 등록
// ─────────────────────────────────────────────────────────────

export function registerNativeRequestValidator(registry: NativeFunctionRegistry): void {

  // 1. validate_schema_register(name, schema_str) → bool
  registry.register({
    name: 'validate_schema_register',
    module: 'validator',
    executor: (args) => {
      const name = String(args[0] ?? '');
      const schemaStr = String(args[1] ?? '');
      if (!name || !schemaStr) return false;
      const parsed = parseSchemaStr(schemaStr);
      schemaRegistry.set(name, parsed);
      return true;
    }
  });

  // 2. validate_schema_list() → array of string
  registry.register({
    name: 'validate_schema_list',
    module: 'validator',
    executor: (_args) => {
      return Array.from(schemaRegistry.keys());
    }
  });

  // 3. validate_request(req, schema_name) → map {ok, errors}
  //    - req: FreeLang 요청 맵 (Map<string, any>)
  //    - schema_name: 등록된 스키마 이름
  registry.register({
    name: 'validate_request',
    module: 'validator',
    executor: (args) => {
      const req = args[0];
      const schemaName = String(args[1] ?? '');
      const schema = schemaRegistry.get(schemaName);

      const result = new Map<string, any>();

      if (!schema) {
        result.set('ok', false);
        result.set('errors', [{ field: '__schema__', rule: 'not_found', message: `Schema '${schemaName}' not registered` }]);
        return result;
      }

      const fieldValues = extractFields(req);
      const allErrors: Map<string, any>[] = [];

      for (const fieldSchema of schema) {
        const val = fieldValues.get(fieldSchema.name);
        const errs = validateValue(fieldSchema.name, val, fieldSchema);
        for (const e of errs) {
          const errMap = new Map<string, any>();
          errMap.set('field', e.field);
          errMap.set('rule', e.rule);
          errMap.set('message', e.message);
          allErrors.push(errMap);

          // 위반 로그 기록
          if (violationLog.length < MAX_VIOLATIONS) {
            const viol = new Map<string, any>();
            viol.set('ts', new Date().toISOString());
            viol.set('schema', schemaName);
            viol.set('field', e.field);
            viol.set('rule', e.rule);
            viol.set('message', e.message);
            violationLog.push(viol);
          }
        }
      }

      result.set('ok', allErrors.length === 0);
      result.set('errors', allErrors);
      return result;
    }
  });

  // 4. validate_field(val, constraint_str) → map {ok, errors}
  //    단일 필드를 즉석 검증 (스키마 등록 불필요)
  //    constraint_str 형식: "string:required|email" 또는 "int:range=1..150"
  registry.register({
    name: 'validate_field',
    module: 'validator',
    executor: (args) => {
      const val = args[0];
      const constraintStr = String(args[1] ?? '');

      const syntheticSchema = parseSchemaStr(`_field:${constraintStr}`);
      const result = new Map<string, any>();

      if (syntheticSchema.length === 0) {
        result.set('ok', false);
        result.set('errors', []);
        return result;
      }

      const errs = validateValue('value', val, syntheticSchema[0]);
      const errMaps = errs.map(e => {
        const m = new Map<string, any>();
        m.set('field', e.field);
        m.set('rule', e.rule);
        m.set('message', e.message);
        return m;
      });

      result.set('ok', errs.length === 0);
      result.set('errors', errMaps);
      return result;
    }
  });

  // 5. validate_email(val) → bool
  registry.register({
    name: 'validate_email',
    module: 'validator',
    executor: (args) => isValidEmail(String(args[0] ?? ''))
  });

  // 6. validate_min_max(val, min, max) → bool
  //    문자열이면 길이 검사, 숫자이면 값 범위 검사
  registry.register({
    name: 'validate_min_max',
    module: 'validator',
    executor: (args) => {
      const val = args[0];
      const min = Number(args[1]);
      const max = Number(args[2]);
      if (typeof val === 'string') {
        return val.length >= min && val.length <= max;
      }
      const num = Number(val);
      if (isNaN(num)) return false;
      return num >= min && num <= max;
    }
  });

  // 7. validate_range(val, min, max) → bool (숫자 전용)
  registry.register({
    name: 'validate_range',
    module: 'validator',
    executor: (args) => {
      const num = Number(args[0]);
      const min = Number(args[1]);
      const max = Number(args[2]);
      if (isNaN(num)) return false;
      return num >= min && num <= max;
    }
  });

  // 8. validate_required(val) → bool
  registry.register({
    name: 'validate_required',
    module: 'validator',
    executor: (args) => {
      const val = args[0];
      return val !== undefined && val !== null && val !== '';
    }
  });

  // 9. validate_regex(val, pattern) → bool
  registry.register({
    name: 'validate_regex',
    module: 'validator',
    executor: (args) => {
      const val = String(args[0] ?? '');
      const pattern = String(args[1] ?? '');
      try {
        return new RegExp(pattern).test(val);
      } catch (_) {
        return false;
      }
    }
  });

  // 10. validate_violation_list() → array of map
  registry.register({
    name: 'validate_violation_list',
    module: 'validator',
    executor: (_args) => {
      return violationLog.slice(-100); // 최근 100건
    }
  });
}
