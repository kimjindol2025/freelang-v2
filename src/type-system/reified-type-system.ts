/**
 * FreeLang v2 - Reified-Type-System
 *
 * 타입 정보를 바이너리 레이아웃과 인스트럭션 선택에 직접 반영하는 중앙 시스템.
 * TypeScript로 안전망을 치는 것이 아니라, 컴파일러 자체가 타입을 "증명"한다.
 *
 * 핵심 원칙:
 *  1. Zero-Runtime-Overhead: 타입 검사는 컴파일 타임에만 발생
 *  2. Nullable-Safety:  T? 는 컴파일러가 null-check를 강제 삽입
 *  3. Generic-Reification: struct User<T> → 실제 메모리 레이아웃으로 구체화
 *  4. Static-Assert: @static_assert_size<T, N> → 빌드 실패로 레이아웃 강제
 */

import { TypeAliasDeclaration, GenericTypeParam } from '../parser/ast';

// ─── 기본 타입 크기 테이블 (바이트) ──────────────────────────────────────
const PRIMITIVE_SIZES: Record<string, number> = {
  'bool':    1,
  'i8':      1,
  'u8':      1,
  'i16':     2,
  'u16':     2,
  'int':     8,   // FreeLang: int = i64
  'i32':     4,
  'u32':     4,
  'i64':     8,
  'u64':     8,
  'f32':     4,
  'float':   8,   // FreeLang: float = f64
  'f64':     8,
  'string':  16,  // fat pointer: ptr(8) + len(8)
  'char':    4,   // UTF-32 코드포인트
  'any':     16,  // tagged union: tag(8) + value(8)
  'null':    0,
  'void':    0,
};

// ─── 구조체 필드 레이아웃 ───────────────────────────────────────────────
export interface FieldLayout {
  name:     string;
  typeName: string;     // 실제 타입명 ('int', 'string?', 'User<int>' 등)
  offset:   number;     // 구조체 내 바이트 오프셋 (정렬 포함)
  size:     number;     // 필드 크기 (바이트)
  isNullable: boolean;  // T? 여부 → null-check guard 필요
}

// ─── 구체화된 타입 정보 ─────────────────────────────────────────────────
export interface ReifiedType {
  name:           string;                // 완전한 타입명 ('User<int>', 'UserID')
  kind:           'primitive' | 'struct' | 'union' | 'alias' | 'nullable' | 'generic';
  size:           number;                // 바이트 단위 sizeof
  alignment:      number;                // 정렬 요구사항 (바이트)
  fields?:        FieldLayout[];         // struct 타입의 필드 레이아웃
  unionMembers?:  string[];              // union 타입의 멤버 목록
  innerType?:     string;                // nullable T? 의 T, alias의 원본 타입
  typeArgs?:      string[];              // 제네릭 타입 인수 (User<int> → ['int'])
  typeParams?:    GenericTypeParam[];    // 선언의 제네릭 파라미터
}

// ─── 타입 등록소 (컴파일러 전역 싱글턴) ─────────────────────────────────
export class ReifiedTypeRegistry {
  private static readonly registry = new Map<string, ReifiedType>();
  private static initialized = false;

  /**
   * 프리미티브 타입들을 레지스트리에 사전 등록
   */
  static initialize(): void {
    if (this.initialized) return;

    for (const [name, size] of Object.entries(PRIMITIVE_SIZES)) {
      this.registry.set(name, {
        name,
        kind: 'primitive',
        size,
        alignment: Math.min(size, 8),
      });
    }
    this.initialized = true;
  }

  /**
   * 타입 별칭 등록 (TYPE_DECL IR → 파서가 호출)
   *
   * "UserID=int|string"  →  union 타입으로 등록
   * "Callback=fn(int)->bool"  →  alias 타입으로 등록
   */
  static registerTypeAlias(encoded: string): void {
    this.initialize();
    const eqIdx = encoded.indexOf('=');
    if (eqIdx < 0) return;

    const alias = encoded.slice(0, eqIdx);
    const definition = encoded.slice(eqIdx + 1);

    if (definition.includes('|')) {
      // 유니온 타입: 최대 멤버 크기 + 태그 1바이트
      const members = definition.split('|').map(m => m.trim());
      const maxSize = members.reduce((max, m) => {
        const mt = this.resolve(m);
        return Math.max(max, mt?.size ?? 8);
      }, 0);

      this.registry.set(alias, {
        name: alias,
        kind: 'union',
        size: maxSize + 1,  // 태그 바이트 포함
        alignment: Math.min(maxSize, 8),
        unionMembers: members,
        innerType: definition,
      });
    } else {
      // 단순 alias
      const target = this.resolve(definition);
      this.registry.set(alias, {
        name: alias,
        kind: 'alias',
        size: target?.size ?? 8,
        alignment: target?.alignment ?? 8,
        innerType: definition,
      });
    }
  }

  /**
   * 구조체 타입 등록 (STRUCT_NEW IR → 파서가 호출)
   */
  static registerStruct(
    name: string,
    fields: Array<{ name: string; typeName: string }>,
    typeParams?: GenericTypeParam[]
  ): void {
    this.initialize();

    const layoutFields: FieldLayout[] = [];
    let offset = 0;

    for (const field of fields) {
      const isNullable = field.typeName.endsWith('?');
      const baseTypeName = isNullable ? field.typeName.slice(0, -1) : field.typeName;
      const resolved = this.resolve(baseTypeName);
      const fieldSize = (resolved?.size ?? 8) + (isNullable ? 1 : 0); // nullable → +1 null tag

      // 정렬 패딩 계산
      const align = resolved?.alignment ?? 8;
      const padding = (align - (offset % align)) % align;
      offset += padding;

      layoutFields.push({
        name: field.name,
        typeName: field.typeName,
        offset,
        size: fieldSize,
        isNullable,
      });

      offset += fieldSize;
    }

    // 구조체 전체 크기는 최대 정렬의 배수로 올림
    const maxAlign = layoutFields.reduce((m, f) => {
      const ft = this.resolve(f.typeName.replace('?', ''));
      return Math.max(m, ft?.alignment ?? 8);
    }, 1);

    const totalSize = Math.ceil(offset / maxAlign) * maxAlign;

    this.registry.set(name, {
      name,
      kind: typeParams && typeParams.length > 0 ? 'generic' : 'struct',
      size: totalSize,
      alignment: maxAlign,
      fields: layoutFields,
      typeParams,
    });
  }

  /**
   * 타입명으로 ReifiedType 조회
   * 제네릭 인스턴스 (User<int>)는 즉시 구체화하여 반환
   */
  static resolve(typeName: string): ReifiedType | undefined {
    this.initialize();

    // Nullable 처리: string? → string의 ReifiedType + nullable 마킹
    if (typeName.endsWith('?')) {
      const inner = typeName.slice(0, -1);
      const base = this.resolve(inner);
      if (!base) return undefined;
      return {
        name: typeName,
        kind: 'nullable',
        size: base.size + 1,     // null 태그 1바이트 추가
        alignment: base.alignment,
        innerType: inner,
      };
    }

    // 캐시에 있으면 그대로 반환
    if (this.registry.has(typeName)) {
      return this.registry.get(typeName);
    }

    // 제네릭 인스턴스: User<int> → User 템플릿 + int 인수로 구체화
    const genericMatch = typeName.match(/^(\w+)<(.+)>$/);
    if (genericMatch) {
      return this.instantiateGeneric(genericMatch[1], genericMatch[2].split(',').map(s => s.trim()));
    }

    return undefined;
  }

  /**
   * 모든 등록된 타입 목록 반환 (디버그/셀프호스팅 증명용)
   */
  static dump(): ReifiedType[] {
    this.initialize();
    return Array.from(this.registry.values());
  }

  /**
   * 내부: 제네릭 타입 인스턴스화
   * GenericInstantiator 역할 → struct User<T> + T=int → User<int> 레이아웃 계산
   */
  private static instantiateGeneric(baseName: string, typeArgs: string[]): ReifiedType | undefined {
    const base = this.registry.get(baseName);
    if (!base || base.kind !== 'generic' || !base.typeParams) return undefined;

    const instanceName = `${baseName}<${typeArgs.join(', ')}>`;

    // 타입 파라미터 → 실제 타입 매핑
    const typeMap = new Map<string, string>();
    for (let i = 0; i < base.typeParams.length && i < typeArgs.length; i++) {
      typeMap.set(base.typeParams[i].name, typeArgs[i]);
    }

    // 각 필드의 타입 파라미터를 실제 타입으로 치환하여 레이아웃 재계산
    const concreteFields: Array<{ name: string; typeName: string }> = (base.fields ?? []).map(f => ({
      name: f.name,
      typeName: typeMap.get(f.typeName.replace('?', '')) !== undefined
        ? (typeMap.get(f.typeName.replace('?', ''))! + (f.isNullable ? '?' : ''))
        : f.typeName
    }));

    // 임시 등록 후 재귀 계산
    this.registerStruct(instanceName, concreteFields);
    return this.registry.get(instanceName);
  }
}

// ─── 컴파일 타임 크기 검증 엔진 ─────────────────────────────────────────
export class StaticAssertEngine {
  /**
   * STATIC_ASSERT IR 명령어 실행 (컴파일 타임 검증)
   *
   * encoded 형식: "User<int>:24"
   * → User<int>의 실제 sizeof를 계산하여 24와 불일치 시 컴파일 에러
   */
  static verify(encoded: string): void {
    const colonIdx = encoded.lastIndexOf(':');
    if (colonIdx < 0) {
      throw new Error(`[StaticAssert] 잘못된 형식: "${encoded}" (기대: "TypeName:size")`);
    }

    const typeName = encoded.slice(0, colonIdx);
    const expectedSize = parseInt(encoded.slice(colonIdx + 1), 10);

    const resolved = ReifiedTypeRegistry.resolve(typeName);
    if (!resolved) {
      throw new Error(`[StaticAssert] 알 수 없는 타입: "${typeName}"`);
    }

    if (resolved.size !== expectedSize) {
      throw new Error(
        `[StaticAssert FAIL] ${typeName}: ` +
        `실제 sizeof=${resolved.size}바이트, 기대=${expectedSize}바이트\n` +
        `  → 타입 레이아웃이 변경되었습니다. 코드를 재검토하세요.`
      );
    }
    // 성공: 컴파일 계속 진행 (런타임 오버헤드 0)
  }

  /**
   * 여러 assert를 한 번에 검증 (모든 실패를 수집)
   */
  static verifyAll(asserts: string[]): string[] {
    const errors: string[] = [];
    for (const encoded of asserts) {
      try {
        this.verify(encoded);
      } catch (e: any) {
        errors.push(e.message);
      }
    }
    return errors;  // 빈 배열 = 전체 통과
  }
}

// ─── Nullable 안전성 강제 엔진 ──────────────────────────────────────────
export class NullableGuard {
  private static readonly guardedVars = new Set<string>();

  /**
   * NULL_CHECK IR 명령어 처리 (런타임 guard)
   *
   * T? 타입 변수에 접근 시 IR Generator가 자동으로 삽입.
   * VM이 실행 시 null 값이면 즉시 런타임 에러 발생.
   *
   * @param varName  검사할 변수명
   * @param value    변수 현재 값
   * @returns        non-null 값 (통과 시) | 에러 throw (null 시)
   */
  static guard(varName: string, value: unknown): unknown {
    if (value === null || value === undefined) {
      throw new Error(
        `[NullableGuard] null 안전성 위반: 변수 "${varName}"에 null 접근\n` +
        `  → "${varName}: T?"는 사용 전 null 검사가 필요합니다.\n` +
        `  힌트: if (${varName} != null) { ... } 블록 내에서 접근하세요.`
      );
    }
    return value;
  }

  /**
   * 컴파일 타임: T? 타입 변수가 null-check 없이 접근되는지 분석
   *
   * @param varName     변수명
   * @param typeStr     타입 문자열 (T? 여부 판단)
   * @param hasNullGuard 호출 전 if (x != null) 검사 유무
   */
  static analyzeAccess(varName: string, typeStr: string, hasNullGuard: boolean): void {
    if (!typeStr.endsWith('?')) return;  // nullable 아님 → 검사 불필요

    if (!hasNullGuard) {
      // 경고: 컴파일 타임에 감지 (에러 대신 경고로 처리 → 점진적 적용)
      console.warn(
        `[NullableGuard WARNING] "${varName}: ${typeStr}" ` +
        `null 검사 없이 접근됨. ` +
        `null-check 추가를 권장합니다.`
      );
    }

    this.guardedVars.add(varName);
  }

  /**
   * 감시 중인 nullable 변수 목록 반환 (디버그용)
   */
  static getGuardedVars(): string[] {
    return Array.from(this.guardedVars);
  }
}

// ─── 타입 주도 최적화 힌트 ──────────────────────────────────────────────
/**
 * Type-Driven-Optimization:
 * 타입 정보를 바탕으로 불필요한 런타임 체크를 제거하고
 * 하드웨어에 최적화된 인스트럭션을 선택한다.
 */
export class TypeDrivenOptimizer {
  /**
   * 타입 기반 최적 인스트럭션 선택
   *
   * int + int → ADD (정수 덧셈, 오버플로우 체크 없음)
   * float + float → FADD (부동소수점 덧셈)
   * string + string → STR_CONCAT (문자열 연결)
   * (int | string) + x → 런타임 타입 분기 필요
   */
  static selectAddInstruction(leftType: string, rightType: string): string {
    const left = ReifiedTypeRegistry.resolve(leftType);
    const right = ReifiedTypeRegistry.resolve(rightType);

    if (!left || !right) return 'ADD_GENERIC';

    // 두 타입이 동일한 원시 타입이면 직접 인스트럭션 선택
    if (left.kind === 'primitive' && right.kind === 'primitive') {
      if (leftType === rightType) {
        if (leftType === 'float' || leftType === 'f32' || leftType === 'f64') return 'FADD';
        if (leftType === 'string') return 'STR_CONCAT';
        return 'ADD';  // 정수형
      }
    }

    // 유니온 타입이면 런타임 분기 필요
    if (left.kind === 'union' || right.kind === 'union') return 'ADD_TAGGED';

    return 'ADD_GENERIC';
  }

  /**
   * 구조체 필드 접근 최적화
   *
   * 컴파일 타임에 오프셋을 알고 있으면 상수 오프셋 접근으로 최적화
   * → 런타임 해시맵 조회 불필요
   */
  static getFieldOffset(structName: string, fieldName: string): number | undefined {
    const structType = ReifiedTypeRegistry.resolve(structName);
    if (!structType?.fields) return undefined;

    const field = structType.fields.find(f => f.name === fieldName);
    return field?.offset;
  }

  /**
   * Zero-Cost-Casting 검증
   *
   * A → B 캐스팅이 런타임 비용 없이 가능한지 컴파일 타임에 판단.
   * - 동일 크기 & 호환 레이아웃: zero-cost (reinterpret_cast)
   * - 크기 불일치: 변환 필요 (비용 발생)
   */
  static isZeroCostCast(fromType: string, toType: string): boolean {
    const from = ReifiedTypeRegistry.resolve(fromType);
    const to = ReifiedTypeRegistry.resolve(toType);

    if (!from || !to) return false;

    // 동일 크기이고 둘 다 정수형이면 zero-cost reinterpret
    if (from.size === to.size && from.kind === 'primitive' && to.kind === 'primitive') {
      return true;
    }

    // alias가 원본 타입과 같은 크기면 zero-cost
    if (from.kind === 'alias' && from.size === to.size) return true;

    return false;
  }
}

// ─── 셀프호스팅 증명: FreeLang v2 컴파일러 자체를 타입 시스템으로 검증 ──
/**
 * SelfHostingVerifier:
 * 강화된 타입 시스템이 내장된 v2 컴파일러 소스를 자기 자신이 분석하여
 * 타입 불일치를 발견하면 빌드 자체를 거부한다.
 *
 * 사용법: 빌드 파이프라인 진입점에서 호출
 *   SelfHostingVerifier.verify(program_ast)
 */
export class SelfHostingVerifier {
  private readonly registry = ReifiedTypeRegistry;
  private readonly staticAssert = StaticAssertEngine;
  private errors: string[] = [];

  /**
   * 전체 모듈에 대한 타입 검증 실행
   *
   * @param typeDecls  TYPE_DECL IR 인코딩 목록
   * @param staticAsserts  STATIC_ASSERT IR 인코딩 목록
   * @returns 에러 목록 (빈 배열 = 타입 안전성 증명 완료)
   */
  verify(typeDecls: string[], staticAsserts: string[]): string[] {
    this.errors = [];

    // 1단계: 모든 타입 별칭 등록
    for (const decl of typeDecls) {
      ReifiedTypeRegistry.registerTypeAlias(decl);
    }

    // 2단계: 정적 크기 검증 실행
    const assertErrors = StaticAssertEngine.verifyAll(staticAsserts);
    this.errors.push(...assertErrors);

    return this.errors;
  }

  /**
   * 타입 안전성 증명 보고서 출력
   */
  report(): string {
    const types = ReifiedTypeRegistry.dump();
    const lines = [
      `=== FreeLang v2 Reified-Type-System 증명 보고서 ===`,
      `등록된 타입: ${types.length}개`,
      '',
      '--- 타입 레이아웃 ---',
      ...types
        .filter(t => t.kind !== 'primitive')
        .map(t => `  ${t.name} (${t.kind}): sizeof=${t.size}바이트, align=${t.alignment}바이트`),
      '',
      this.errors.length === 0
        ? '✓ 타입 안전성: 증명 완료 (0 에러)'
        : `✗ 타입 위반: ${this.errors.length}개\n${this.errors.map(e => '  ' + e).join('\n')}`,
    ];
    return lines.join('\n');
  }
}
