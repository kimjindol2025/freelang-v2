/**
 * FreeLang v2 - Validator Native Runtime
 *
 * 컴파일 타임에 생성된 ValidatorMeta를 사용하여
 * 구조체 검증 함수를 VM 네이티브로 등록합니다.
 *
 * Joi 완전 대체 - 외부 의존성 0%
 *
 * 등록 함수:
 *   validator_is_valid(struct_name, instance_map) → bool
 *   validator_get_errors(struct_name, instance_map) → array<string>
 *   validator_check_field(struct_name, field_name, value) → string | null
 *
 * .free 파일에서 사용:
 *   let ok = validator_is_valid("UserRegistration", user)
 *   let errs = validator_get_errors("UserRegistration", user)
 *
 * 또는 is_valid() 메서드 방식 (struct 인스턴스):
 *   if (input.is_valid()) { ... }
 *   let errs = input.get_errors()
 */

import { NativeFunctionRegistry } from '../vm/native-function-registry';
import { ValidatorMeta } from '../codegen/validator-codegen';

// 전역 Validator 메타데이터 레지스트리 (컴파일 타임에 채워짐)
const validatorRegistry = new Map<string, ValidatorMeta>();

/**
 * 컴파일 타임에 생성된 Validator 메타데이터를 등록합니다.
 * runner.ts에서 generateValidatorMeta() 결과를 전달합니다.
 */
export function registerValidatorMeta(metas: ValidatorMeta[]): void {
  for (const meta of metas) {
    validatorRegistry.set(meta.structName, meta);
    if (process.env.DEBUG_VALIDATOR) {
      console.log(
        `[VALIDATOR-NATIVE] Registered: ${meta.structName} (${meta.fields.length}개 필드 규칙)`
      );
    }
  }
}

function getMeta(structName: string): ValidatorMeta | null {
  return validatorRegistry.get(structName) || null;
}

/**
 * FreeLang map 인스턴스를 JS Record로 변환
 * VM이 map을 Map<string, unknown> 또는 일반 객체로 저장하므로 모두 처리
 */
function toRecord(instance: unknown): Record<string, unknown> {
  if (instance instanceof Map) {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of instance) {
      obj[String(k)] = v;
    }
    return obj;
  }
  if (instance && typeof instance === 'object') {
    return instance as Record<string, unknown>;
  }
  return {};
}

/**
 * Validator 네이티브 함수 등록
 */
export function registerValidatorNativeFunctions(registry: NativeFunctionRegistry): void {

  // ── validator_is_valid(struct_name, instance) → bool ────────────────────
  // 컴파일 타임 생성 isValidFn 호출 → 런타임 룰 파싱 오버헤드 0
  registry.register({
    name: 'validator_is_valid',
    module: 'validator',
    executor: (args) => {
      try {
        const structName = String(args[0]);
        const instance = toRecord(args[1]);
        const meta = getMeta(structName);
        if (!meta) return false; // 등록된 검증 규칙 없음 → 통과
        return meta.isValidFn(instance);
      } catch {
        return false;
      }
    },
  });

  // ── validator_get_errors(struct_name, instance) → array<string> ─────────
  // 모든 실패 필드 + 위반 규칙 수집 (Error-Trace-Context)
  registry.register({
    name: 'validator_get_errors',
    module: 'validator',
    executor: (args) => {
      try {
        const structName = String(args[0]);
        const instance = toRecord(args[1]);
        const meta = getMeta(structName);
        if (!meta) return [];
        return meta.getErrorsFn(instance);
      } catch {
        return [];
      }
    },
  });

  // ── validator_check_field(struct_name, field_name, value) → string | null
  // 단일 필드 검증 (null = 통과, string = 에러 메시지)
  registry.register({
    name: 'validator_check_field',
    module: 'validator',
    executor: (args) => {
      try {
        const structName = String(args[0]);
        const fieldName = String(args[1]);
        const value = args[2];
        const meta = getMeta(structName);
        if (!meta) return null;
        const fieldMeta = meta.fields.find(f => f.fieldName === fieldName);
        if (!fieldMeta || !fieldMeta.validatorFn) return null;
        return fieldMeta.validatorFn(value);
      } catch {
        return null;
      }
    },
  });

  // ── validator_list_rules(struct_name) → array<string> ───────────────────
  // 디버그용: 등록된 검증 규칙 목록 반환
  registry.register({
    name: 'validator_list_rules',
    module: 'validator',
    executor: (args) => {
      try {
        const structName = String(args[0]);
        const meta = getMeta(structName);
        if (!meta) return [`${structName}: 등록된 검증 규칙 없음`];
        return meta.fields.map(f => {
          const parts: string[] = [`${f.fieldName} (${f.fieldType})`];
          if (f.constraint.min !== undefined) parts.push(`min=${f.constraint.min}`);
          if (f.constraint.max !== undefined) parts.push(`max=${f.constraint.max}`);
          if (f.constraint.pattern) parts.push(`pattern=${f.constraint.pattern}`);
          return parts.join(', ');
        });
      } catch {
        return [];
      }
    },
  });
}
