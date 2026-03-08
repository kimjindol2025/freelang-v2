/**
 * FreeLang FFI VM 통합
 * VM 메인 루프에 FFI 콜백 처리 통합
 * Phase 3.3: 완전한 콜백 메커니즘
 */

import { VM } from '../vm';
import { setupFFI, handleFFICallbacks } from './loader';

/**
 * FFI 지원 VM 메인 루프
 * C 라이브러리 콜백을 처리하는 메인 루프
 */
export class FFISupportedVMLoop {
  private vm: VM;
  private isRunning: boolean = false;
  private callbackCheckInterval: number = 10;  // 10ms마다 콜백 확인

  constructor(vm: VM) {
    this.vm = vm;
  }

  /**
   * FFI가 활성화된 VM 실행
   * @param program 실행할 프로그램 (IR)
   * @returns 실행 결과
   */
  public runWithFFI(program: any[]): any {
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║    FreeLang VM with FFI Support                ║');
    console.log('║    Phase 3.3: Callback Mechanism Integrated    ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    // Step 1: FFI 초기화 (VM 인스턴스 전달)
    console.log('Step 1: Initializing FFI System...');
    const ffiInitialized = setupFFI(this.vm);
    if (!ffiInitialized) {
      console.warn('⚠️  FFI initialization failed, continuing without FFI');
    }

    // Step 2: VM 프로그램 실행
    console.log('\nStep 2: Executing program...');
    this.isRunning = true;
    const result = this.vm.run(program);

    // Step 3: 콜백 처리 (프로그램 종료 후)
    console.log('\nStep 3: Processing pending callbacks...');
    const callbackCount = handleFFICallbacks();
    console.log(`Processed ${callbackCount} callbacks`);

    // Step 4: 정리
    console.log('\nStep 4: Cleanup');
    this.isRunning = false;

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║            Execution Complete                  ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    return result;
  }

  /**
   * Phase 3.3: 비동기 메인 루프 (콜백 처리 통합)
   * C 라이브러리에서 발생하는 비동기 콜백을 처리
   */
  public async runWithAsyncCallbacks(
    program: any[],
    timeout: number = 30000
  ): Promise<any> {
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║    FreeLang VM with Async FFI Support          ║');
    console.log('║    Phase 3.3: Async Callback Processing       ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    // FFI 초기화
    console.log('Step 1: Initializing FFI System...');
    const ffiInitialized = setupFFI(this.vm);

    // 프로그램 실행
    console.log('Step 2: Executing program...');
    this.isRunning = true;

    // 메인 루프: 주기적으로 콜백 확인
    const mainLoopPromise = this.mainLoop(timeout);

    // VM 프로그램 실행
    const vmResult = this.vm.run(program);

    // 메인 루프 종료 대기
    await mainLoopPromise;

    this.isRunning = false;

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║            Async Execution Complete            ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    return vmResult;
  }

  /**
   * 비동기 메인 루프 구현
   * 주기적으로 FFI 콜백을 처리
   */
  private mainLoop(timeout: number): Promise<void> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let totalCallbacks = 0;

      const loopInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;

        // 타임아웃 확인
        if (elapsed > timeout) {
          console.log(`\n⏱️  Timeout reached (${elapsed}ms)`);
          clearInterval(loopInterval);
          this.isRunning = false;
          resolve();
          return;
        }

        // 콜백 처리
        const callbackCount = handleFFICallbacks();
        if (callbackCount > 0) {
          totalCallbacks += callbackCount;
          console.log(`Processed ${callbackCount} callbacks (total: ${totalCallbacks})`);
        }

        // VM이 종료되면 메인 루프 종료
        if (!this.isRunning) {
          console.log(`\nVirtual machine completed`);
          clearInterval(loopInterval);
          resolve();
        }
      }, this.callbackCheckInterval);
    });
  }

  /**
   * 메인 루프 중지
   */
  public stop(): void {
    this.isRunning = false;
  }

  /**
   * 콜백 확인 간격 설정
   */
  public setCallbackCheckInterval(ms: number): void {
    this.callbackCheckInterval = Math.max(1, ms);
  }
}

/**
 * 편의 함수: FFI 지원 VM 실행
 */
export function runVMWithFFI(vm: VM, program: any[]): any {
  const loop = new FFISupportedVMLoop(vm);
  return loop.runWithFFI(program);
}

/**
 * 편의 함수: 비동기 FFI 콜백 처리가 있는 VM 실행
 */
export async function runVMWithAsyncFFI(
  vm: VM,
  program: any[],
  timeout?: number
): Promise<any> {
  const loop = new FFISupportedVMLoop(vm);
  return loop.runWithAsyncCallbacks(program, timeout);
}
