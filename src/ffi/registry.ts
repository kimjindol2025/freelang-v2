/**
 * FreeLang FFI Registry
 * C 라이브러리 함수 등록 및 메타데이터 관리
 */

import { FFI_SIGNATURES, FFIFunctionSignature } from './type-bindings';

/**
 * FFI 모듈 설정
 */
export interface FFIModuleConfig {
  path: string;           // .so 파일 경로
  functions: string[];    // 노출할 함수 목록
  loaded: boolean;        // 로드 상태
  handle?: any;           // 로드된 라이브러리 핸들
}

/**
 * FFI 레지스트리
 *
 * 모든 C 함수를 FreeLang에서 사용 가능하도록 등록
 */
export class FFIRegistry {
  private modules: Map<string, FFIModuleConfig> = new Map();
  private functionMap: Map<string, FFIFunctionSignature> = new Map();

  constructor() {
    this.initializeModules();
    this.registerFunctions();
  }

  /**
   * FFI 모듈 초기화
   */
  private initializeModules(): void {
    // Stream 모듈
    this.modules.set('stream', {
      path: '/usr/local/lib/libstream.so',
      functions: [
        'fl_stream_readable_create',
        'fl_stream_writable_create',
        'fl_stream_writable_write',
        'fl_stream_readable_read',
        'fl_stream_on_data',
        'fl_stream_destroy'
      ],
      loaded: false
    });

    // WebSocket 모듈
    this.modules.set('ws', {
      path: '/usr/local/lib/libws.so',
      functions: [
        'fl_ws_server_create',
        'fl_ws_server_listen',
        'fl_ws_client_connect',
        'fl_ws_send',
        'fl_ws_on_message',
        'fl_ws_on_open',
        'fl_ws_on_close',
        'fl_ws_on_error',
        'fl_ws_get_state',
        'fl_ws_close'
      ],
      loaded: false
    });

    // HTTP 모듈
    this.modules.set('http', {
      path: '/usr/local/lib/libhttp.so',
      functions: [
        'fl_http_server_create',
        'fl_http_server_listen',
        'fl_http_on_request',
        'fl_http_send_response',
        'fl_http_send_file',
        'fl_http_close'
      ],
      loaded: false
    });

    // HTTP/2 모듈
    this.modules.set('http2', {
      path: '/usr/local/lib/libhttp2.so',
      functions: [
        'fl_http2_server_create',
        'fl_http2_session_new',
        'fl_http2_session_recv',
        'fl_http2_session_send',
        'fl_http2_submit_request',
        'fl_http2_on_data',
        'fl_http2_on_frame_recv',
        'fl_http2_close'
      ],
      loaded: false
    });

    // Event Loop 모듈
    this.modules.set('event_loop', {
      path: '/usr/local/lib/libevent_loop.so',
      functions: [
        'fl_event_loop_create',
        'fl_event_loop_run',
        'fl_event_loop_stop',
        'fl_event_loop_destroy'
      ],
      loaded: false
    });

    // Timer 모듈
    this.modules.set('timer', {
      path: '/usr/local/lib/libtimer.so',
      functions: [
        'fl_timer_create',
        'fl_timer_start',
        'fl_timer_stop',
        'fl_timer_destroy'
      ],
      loaded: false
    });
  }

  /**
   * FFI 함수 시그니처 등록
   */
  private registerFunctions(): void {
    for (const [funcName, signature] of Object.entries(FFI_SIGNATURES)) {
      this.functionMap.set(funcName, signature);
    }
  }

  /**
   * 모듈 로드
   */
  public loadModule(moduleName: string): boolean {
    const config = this.modules.get(moduleName);
    if (!config) {
      console.error(`FFI Module not found: ${moduleName}`);
      return false;
    }

    try {
      // 실제 로딩은 FreeLang VM이 처리
      // 여기서는 메타데이터만 설정
      config.loaded = true;
      console.log(`✅ FFI Module loaded: ${moduleName}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to load FFI module: ${moduleName}`, error);
      return false;
    }
  }

  /**
   * 모든 모듈 로드
   */
  public loadAllModules(): boolean {
    let success = true;
    for (const moduleName of this.modules.keys()) {
      if (!this.loadModule(moduleName)) {
        success = false;
      }
    }
    return success;
  }

  /**
   * 함수 시그니처 조회
   */
  public getFunctionSignature(funcName: string): FFIFunctionSignature | null {
    return this.functionMap.get(funcName) || null;
  }

  /**
   * 모듈 조회
   */
  public getModule(moduleName: string): FFIModuleConfig | null {
    return this.modules.get(moduleName) || null;
  }

  /**
   * 모든 모듈 조회
   */
  public getAllModules(): Map<string, FFIModuleConfig> {
    return this.modules;
  }

  /**
   * 모듈의 모든 함수 목록
   */
  public getModuleFunctions(moduleName: string): string[] {
    const config = this.modules.get(moduleName);
    return config ? config.functions : [];
  }

  /**
   * 함수가 로드된 모듈에 속하는지 확인
   */
  public isFunctionAvailable(funcName: string): boolean {
    for (const [, config] of this.modules) {
      if (config.functions.includes(funcName) && config.loaded) {
        return true;
      }
    }
    return false;
  }

  /**
   * FFI 통계 정보
   */
  public getStats(): {
    totalModules: number;
    loadedModules: number;
    totalFunctions: number;
  } {
    let loadedCount = 0;
    for (const config of this.modules.values()) {
      if (config.loaded) loadedCount++;
    }

    let totalFunctions = 0;
    for (const config of this.modules.values()) {
      totalFunctions += config.functions.length;
    }

    return {
      totalModules: this.modules.size,
      loadedModules: loadedCount,
      totalFunctions
    };
  }
}

/**
 * 싱글톤 인스턴스
 */
export const ffiRegistry = new FFIRegistry();

/**
 * 초기화 함수
 */
export function initializeFFI(): boolean {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║      Initializing FreeLang FFI Registry        ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  const success = ffiRegistry.loadAllModules();

  const stats = ffiRegistry.getStats();
  console.log(`\n📊 FFI Statistics:`);
  console.log(`   Modules: ${stats.loadedModules}/${stats.totalModules}`);
  console.log(`   Functions: ${stats.totalFunctions}\n`);

  return success;
}

/**
 * 함수 호출 래퍼
 * (FreeLang VM의 콜백 시스템과 연결)
 */
export function callFFIFunction(
  funcName: string,
  ...args: any[]
): any {
  const signature = ffiRegistry.getFunctionSignature(funcName);

  if (!signature) {
    throw new Error(`FFI Function not found: ${funcName}`);
  }

  if (!ffiRegistry.isFunctionAvailable(funcName)) {
    throw new Error(`FFI Function not loaded: ${funcName}`);
  }

  // 실제 C 함수 호출은 FreeLang VM이 처리
  // 여기서는 타입 검증만 수행
  if (args.length !== signature.parameters.length) {
    throw new Error(
      `Function ${funcName} expects ${signature.parameters.length} ` +
      `arguments, but got ${args.length}`
    );
  }

  // console.log(`📞 Calling FFI function: ${funcName}`);
  // return vm.callCFunction(funcName, args);
  return null; // Placeholder
}
