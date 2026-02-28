/**
 * FreeLang VM Native Function Registry
 * FFI C 함수를 VM에서 호출 가능하도록 바인딩
 */

import { FFIFunctionSignature } from '../ffi/type-bindings';

/**
 * 네이티브 함수 정의
 */
export interface NativeFunctionConfig {
  name: string;                              // 함수명
  module: string;                            // C 모듈명
  signature: FFIFunctionSignature;           // 함수 시그니처
  executor?: (args: any[]) => any;          // 실행 함수 (옵션)
  async?: boolean;                           // 비동기 여부
  callbackId?: number;                       // 콜백 ID
}

/**
 * 네이티브 함수 레지스트리
 * VM의 모든 FFI C 함수를 관리
 */
export class NativeFunctionRegistry {
  private functions: Map<string, NativeFunctionConfig> = new Map();
  private moduleToFunctions: Map<string, string[]> = new Map();

  /**
   * 네이티브 함수 등록
   */
  public register(config: NativeFunctionConfig): boolean {
    if (this.functions.has(config.name)) {
      console.warn(`Native function already registered: ${config.name}`);
      return false;
    }

    this.functions.set(config.name, config);

    // 모듈별 함수 인덱싱
    if (!this.moduleToFunctions.has(config.module)) {
      this.moduleToFunctions.set(config.module, []);
    }
    this.moduleToFunctions.get(config.module)!.push(config.name);

    return true;
  }

  /**
   * 네이티브 함수 조회
   */
  public get(name: string): NativeFunctionConfig | null {
    return this.functions.get(name) || null;
  }

  /**
   * 함수 존재 여부 확인
   */
  public exists(name: string): boolean {
    return this.functions.has(name);
  }

  /**
   * 모듈의 모든 함수 조회
   */
  public getByModule(moduleName: string): string[] {
    return this.moduleToFunctions.get(moduleName) || [];
  }

  /**
   * 함수 호출
   */
  public call(name: string, args: any[]): any {
    const config = this.functions.get(name);
    if (!config) {
      throw new Error(`Native function not found: ${name}`);
    }

    // 매개변수 검증
    const paramCount = config.signature.parameters.length;
    if (args.length !== paramCount) {
      throw new Error(
        `Function ${name} expects ${paramCount} arguments, ` +
        `but got ${args.length}`
      );
    }

    // 함수 실행
    if (config.executor) {
      return config.executor(args);
    }

    // executor가 없으면 C 함수 호출 (미구현)
    return null;
  }

  /**
   * 모든 함수 목록
   */
  public listAll(): string[] {
    return Array.from(this.functions.keys());
  }

  /**
   * 통계 정보
   */
  public getStats(): {
    totalFunctions: number;
    modules: Record<string, number>;
  } {
    const modules: Record<string, number> = {};
    for (const [moduleName, functions] of this.moduleToFunctions) {
      modules[moduleName] = functions.length;
    }

    return {
      totalFunctions: this.functions.size,
      modules
    };
  }

  /**
   * 초기화 (테스트용)
   */
  public clear(): void {
    this.functions.clear();
    this.moduleToFunctions.clear();
  }
}

/**
 * 싱글톤 인스턴스
 */
export const nativeFunctionRegistry = new NativeFunctionRegistry();

/**
 * VM용 헬퍼 함수들
 */

/**
 * 문자열 처리 (C의 char*)
 */
export function toCString(value: any): string {
  if (typeof value === 'string') return value;
  return String(value);
}

/**
 * 숫자 처리 (C의 int, uint32_t 등)
 */
export function toNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseInt(value, 10);
  return 0;
}

/**
 * 부울 처리 (C의 int → bool)
 */
export function toBoolean(value: any): number {
  return (value ? 1 : 0);
}

/**
 * 포인터 처리 (VM에서는 숫자로 표현)
 */
export function toPointer(value: any): number {
  if (typeof value === 'number') return value;
  return 0;
}

/**
 * 배열 처리 (C의 배열 포인터)
 */
export function toArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split('');
  return [value];
}

/**
 * 콜백 ID 추출
 */
export function getCallbackId(value: any): number {
  if (typeof value === 'number') return value;
  if (value && typeof value.id === 'number') return value.id;
  return -1;
}
