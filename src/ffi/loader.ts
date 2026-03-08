/**
 * FreeLang FFI Module Loader
 * 동적으로 C 라이브러리를 로드하고 바인딩
 */

import { ffiRegistry, initializeFFI } from './registry';
import { initializeCallbackBridge, processCallbacks } from './callback-bridge';
import { TYPE_BINDINGS, FREELANG_TYPE_MAP } from './type-bindings';
import { cFunctionCaller } from './c-function-caller';

/**
 * FFI 로더
 */
export class FFILoader {
  private initialized: boolean = false;
  private vmInstance: any = null;

  /**
   * FFI 초기화 (FreeLang VM 시작 시 호출)
   */
  public initialize(vmInstance: any): boolean {
    if (this.initialized) {
      console.warn('⚠️  FFI already initialized');
      return true;
    }

    this.vmInstance = vmInstance;

    try {
      console.log('\n╔════════════════════════════════════════════════╗');
      console.log('║        FreeLang FFI System Initialization      ║');
      console.log('╚════════════════════════════════════════════════╝\n');

      // 1. FFI 레지스트리 초기화
      console.log('1️⃣  Initializing FFI Registry...');
      const registrySuccess = initializeFFI();
      if (!registrySuccess) {
        console.warn('⚠️  Some FFI modules failed to load');
      }

      // 2. 콜백 브릿지 초기화 (Phase 3.3: VM 인스턴스 전달)
      console.log('\n2️⃣  Initializing Callback Bridge...');
      initializeCallbackBridge(vmInstance);

      // 3. FFI 함수를 VM 글로벌 네임스페이스에 등록
      console.log('\n3️⃣  Registering FFI functions in VM...');
      this.registerFFIFunctions(vmInstance);

      this.initialized = true;

      console.log('\n✅ FFI System initialized successfully\n');
      return true;
    } catch (error) {
      console.error('❌ FFI initialization failed:', error);
      return false;
    }
  }

  /**
   * FFI 함수를 VM에 등록
   */
  private registerFFIFunctions(vmInstance: any): void {
    const allModules = ffiRegistry.getAllModules();
    let functionCount = 0;
    let failedCount = 0;

    for (const [moduleName, config] of allModules) {
      for (const funcName of config.functions) {
        // 함수 시그니처 조회
        const signature = ffiRegistry.getFunctionSignature(funcName);
        if (!signature) {
          console.warn(`   ⚠️  No signature found for ${funcName}`);
          failedCount++;
          continue;
        }

        // NativeFunctionConfig 구성 (실제 C 함수 호출 포함)
        const nativeConfig = {
          name: funcName,
          module: moduleName,
          signature: signature,
          executor: (args: any[]) => {
            // Phase 3.2: 실제 C 함수 호출
            try {
              return cFunctionCaller.callCFunction(
                moduleName,
                funcName,
                signature,
                args
              );
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              console.error(
                `❌ FFI function execution failed: ${funcName}`,
                errorMsg
              );
              // 오류 발생 시 null 반환 (또는 throw)
              return null;
            }
          }
        };

        // VM에 등록
        if (vmInstance.registerNativeFunction && typeof vmInstance.registerNativeFunction === 'function') {
          const success = vmInstance.registerNativeFunction(nativeConfig);
          if (success) {
            functionCount++;
          } else {
            console.warn(`   ⚠️  Failed to register ${funcName}`);
            failedCount++;
          }
        } else {
          console.warn('   ⚠️  VM does not have registerNativeFunction method');
          failedCount++;
        }
      }
    }

    console.log(`   ✓ Registered ${functionCount} FFI functions`);
    if (failedCount > 0) {
      console.log(`   ⚠️  Failed to register ${failedCount} functions`);
    }
  }

  /**
   * 메인 루프에 통합 (FreeLang VM의 이벤트 루프에서 호출)
   */
  public processPendingCallbacks(): number {
    const count = processCallbacks();
    if (count > 0) {
      // console.log(`Processed ${count} callbacks`);
    }
    return count;
  }

  /**
   * 모듈 상태 확인
   */
  public getStatus(): {
    initialized: boolean;
    modules: Record<string, boolean>;
  } {
    const modules: Record<string, boolean> = {};
    for (const [name, config] of ffiRegistry.getAllModules()) {
      modules[name] = config.loaded;
    }

    return {
      initialized: this.initialized,
      modules
    };
  }
}

/**
 * 싱글톤 인스턴스
 */
export const ffiLoader = new FFILoader();

/**
 * 빠른 초기화 함수
 */
export function setupFFI(vmInstance: any): boolean {
  return ffiLoader.initialize(vmInstance);
}

/**
 * 콜백 처리 함수
 * (FreeLang VM의 메인 루프에서 주기적으로 호출)
 */
export function handleFFICallbacks(): number {
  return ffiLoader.processPendingCallbacks();
}
