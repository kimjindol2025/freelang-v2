/**
 * FreeLang FFI Module Index
 * 모든 FFI 모듈을 통합 export
 */

// Type bindings
export * from './type-bindings';

// Registry
export { FFIRegistry, ffiRegistry, initializeFFI, callFFIFunction } from './registry';

// Callback bridge
export {
  CallbackContext,
  CallbackQueue,
  globalCallbackQueue,
  initializeCallbackBridge,
  processCallbacks,
  getCallbackStats,
  onStreamData,
  onWebSocketMessage,
  onWebSocketOpen,
  onWebSocketClose,
  onWebSocketError,
  onHttp2Data,
  onTimerTick
} from './callback-bridge';

// C Function Caller (Phase 3.2: 실제 C 함수 호출)
export { CFunctionCaller, cFunctionCaller } from './c-function-caller';

// Loader
export { FFILoader, ffiLoader, setupFFI, handleFFICallbacks } from './loader';

// 로컬에서도 import해서 사용
import { setupFFI } from './loader';

// VM Integration (Phase 3.3: 콜백 메커니즘)
export {
  FFISupportedVMLoop,
  runVMWithFFI,
  runVMWithAsyncFFI
} from './vm-integration';

/**
 * FFI 통합 초기화
 * FreeLang VM 시작 시 호출해야 함
 *
 * 사용법:
 * ```typescript
 * import { initializeFFISystem } from './ffi';
 *
 * // VM 시작
 * const vm = createVM();
 *
 * // FFI 초기화
 * initializeFFISystem(vm);
 *
 * // 메인 루프
 * while (running) {
 *   vm.executeNextInstruction();
 *   handleFFICallbacks();
 * }
 * ```
 */
export function initializeFFISystem(vmInstance: any): boolean {
  return setupFFI(vmInstance);
}
