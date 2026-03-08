/**
 * FreeLang FFI C 함수 호출 엔진
 * koffi를 사용하여 동적 C 라이브러리 로드 및 함수 호출
 */

import { load as loadLibrary } from 'koffi';
import { FFIFunctionSignature } from './type-bindings';

/**
 * C 함수 호출 엔진
 * koffi를 기반으로 동적 라이브러리 로드 및 함수 호출 처리
 */
export class CFunctionCaller {
  private loadedLibraries: Map<string, any> = new Map();
  private functionCache: Map<string, any> = new Map();
  private modulePathMap: Map<string, string> = new Map();

  /**
   * 생성자: 모듈 경로 초기화
   */
  constructor() {
    this.initializeModulePaths();
  }

  /**
   * 모듈 경로 초기화
   */
  private initializeModulePaths(): void {
    this.modulePathMap.set('stream', '/usr/local/lib/libstream.so');
    this.modulePathMap.set('ws', '/usr/local/lib/libws.so');
    this.modulePathMap.set('http', '/usr/local/lib/libhttp.so');
    this.modulePathMap.set('http2', '/usr/local/lib/libhttp2.so');
    this.modulePathMap.set('event_loop', '/usr/local/lib/libevent_loop.so');
    this.modulePathMap.set('timer', '/usr/local/lib/libtimer.so');
  }

  /**
   * C 타입을 koffi 타입으로 변환
   * @param cType C 타입 문자열 (예: 'int', 'char*', 'fl_stream_t*')
   * @returns koffi 타입 문자열
   */
  private cTypeToKoffiType(cType: string): string {
    // Primitive types
    if (cType === 'int') return 'int';
    if (cType === 'uint32_t') return 'uint32';
    if (cType === 'uint64_t') return 'uint64';
    if (cType === 'uint16_t') return 'uint16';
    if (cType === 'uint8_t') return 'uint8';
    if (cType === 'size_t') return 'uint64';

    // String type
    if (cType === 'char*') return 'string';

    // Pointer types (opaque)
    if (cType.includes('*') || cType.includes('_t')) {
      return 'pointer';
    }

    // Default to pointer for unknown types
    return 'pointer';
  }

  /**
   * 라이브러리 로드 (캐시됨)
   * @param moduleName 모듈 이름 (예: 'ws', 'stream')
   * @returns koffi 라이브러리 객체
   */
  private loadLibrary(moduleName: string): any {
    // 캐시에서 확인
    if (this.loadedLibraries.has(moduleName)) {
      return this.loadedLibraries.get(moduleName);
    }

    // 경로 조회
    const libPath = this.modulePathMap.get(moduleName);
    if (!libPath) {
      throw new Error(`Unknown module: ${moduleName}`);
    }

    try {
      // koffi로 라이브러리 로드
      const lib = loadLibrary(libPath);
      this.loadedLibraries.set(moduleName, lib);
      console.log(`✅ Loaded FFI library: ${libPath}`);
      return lib;
    } catch (error) {
      console.error(`❌ Failed to load FFI library: ${libPath}`, error);
      throw new Error(`Cannot load library ${moduleName}: ${error}`);
    }
  }

  /**
   * koffi 함수 객체 생성 (캐시됨)
   * @param moduleName 모듈 이름
   * @param funcName 함수 이름
   * @param signature 함수 시그니처
   * @returns koffi 함수 객체
   */
  private getKoffiFunction(
    moduleName: string,
    funcName: string,
    signature: FFIFunctionSignature
  ): any {
    const cacheKey = `${moduleName}:${funcName}`;

    // 캐시에서 확인
    if (this.functionCache.has(cacheKey)) {
      return this.functionCache.get(cacheKey);
    }

    try {
      // 라이브러리 로드
      const lib = this.loadLibrary(moduleName);

      // 반환 타입
      const returnType = this.cTypeToKoffiType(signature.returnType);

      // 매개변수 타입
      const paramTypes = signature.parameters.map((param) =>
        this.cTypeToKoffiType(param.type)
      );

      // koffi func 생성
      // koffi.func(returnType, functionName, ...paramTypes)
      const koffiFunc = lib.func(returnType, funcName, ...paramTypes);

      // 캐시에 저장
      this.functionCache.set(cacheKey, koffiFunc);
      console.log(
        `✅ Created FFI function binding: ${funcName}(${paramTypes.join(', ')}) -> ${returnType}`
      );

      return koffiFunc;
    } catch (error) {
      console.error(`❌ Failed to create function binding: ${funcName}`, error);
      throw new Error(`Cannot bind function ${funcName}: ${error}`);
    }
  }

  /**
   * C 함수 호출
   * @param moduleName 모듈 이름
   * @param funcName 함수 이름
   * @param signature 함수 시그니처
   * @param args 함수 인수 (FreeLang 값들)
   * @returns 반환값 (FreeLang 값)
   */
  public callCFunction(
    moduleName: string,
    funcName: string,
    signature: FFIFunctionSignature,
    args: any[]
  ): any {
    try {
      // 인수 개수 검증
      if (args.length !== signature.parameters.length) {
        throw new Error(
          `Function ${funcName} expects ${signature.parameters.length} arguments, ` +
          `but got ${args.length}`
        );
      }

      // koffi 함수 객체 생성
      const koffiFunc = this.getKoffiFunction(moduleName, funcName, signature);

      // 인수 마샬링
      const marshalledArgs = this.marshalArguments(args, signature.parameters);

      // C 함수 호출
      console.log(`📞 Calling C function: ${funcName}(${marshalledArgs.join(', ')})`);
      const result = koffiFunc(...marshalledArgs);

      // 반환값 언마샬링
      const unmarshalledResult = this.unmarshalReturnValue(
        result,
        signature.returnType
      );

      console.log(`✓ Function returned: ${unmarshalledResult}`);
      return unmarshalledResult;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ C function call failed: ${errorMsg}`);
      throw new Error(`C function call error: ${errorMsg}`);
    }
  }

  /**
   * 인수 마샬링 (FreeLang → C)
   * @param args FreeLang 인수값들
   * @param paramDefs 매개변수 정의
   * @returns 마샬링된 C 인수값들
   */
  private marshalArguments(
    args: any[],
    paramDefs: Array<{ name: string; type: string }>
  ): any[] {
    return args.map((arg, idx) => {
      const paramType = paramDefs[idx]?.type || 'pointer';
      return this.marshalValue(arg, paramType);
    });
  }

  /**
   * 값 마샬링 (FreeLang → C)
   * @param value FreeLang 값
   * @param cType C 타입
   * @returns 마샬링된 값
   */
  private marshalValue(value: any, cType: string): any {
    // null/undefined → nullptr
    if (value === null || value === undefined) {
      return null;
    }

    // 문자열
    if (cType === 'char*') {
      if (typeof value === 'string') return value;
      return String(value);
    }

    // 정수형
    if (cType.includes('int') || cType.includes('uint') || cType === 'size_t') {
      if (typeof value === 'number') return Math.floor(value);
      if (typeof value === 'string') return parseInt(value, 10);
      return 0;
    }

    // 포인터 (핸들로 전달)
    if (cType.includes('*') || cType.includes('_t')) {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') return parseInt(value, 10);
      return 0;
    }

    // 기본값
    return value;
  }

  /**
   * 반환값 언마샬링 (C → FreeLang)
   * @param value C 반환값
   * @param cType C 반환 타입
   * @returns FreeLang 값
   */
  private unmarshalReturnValue(value: any, cType: string): any {
    // null → null
    if (value === null || value === undefined) {
      return null;
    }

    // 문자열
    if (cType === 'char*') {
      return String(value);
    }

    // 정수형
    if (cType.includes('int') || cType.includes('uint') || cType === 'size_t') {
      return Number(value);
    }

    // 포인터 (핸들로 반환)
    if (cType.includes('*') || cType.includes('_t')) {
      // 포인터는 정수 핸들로 반환
      if (typeof value === 'bigint') {
        return Number(value);
      }
      return Number(value);
    }

    // 기본값
    return value;
  }

  /**
   * 캐시 초기화 (테스트용)
   */
  public clearCache(): void {
    this.loadedLibraries.clear();
    this.functionCache.clear();
  }

  /**
   * 상태 정보 조회
   */
  public getStatus(): {
    loadedLibraries: string[];
    cachedFunctions: number;
  } {
    return {
      loadedLibraries: Array.from(this.loadedLibraries.keys()),
      cachedFunctions: this.functionCache.size
    };
  }
}

/**
 * 싱글톤 인스턴스
 */
export const cFunctionCaller = new CFunctionCaller();
