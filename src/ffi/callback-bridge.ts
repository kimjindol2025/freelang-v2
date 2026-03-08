/**
 * FreeLang FFI Callback Bridge
 * C 라이브러리의 콜백을 FreeLang VM과 연결
 */

/**
 * 콜백 컨텍스트 타입
 */
export interface CallbackContext {
  id: number;              // 콜백 ID
  functionName: string;    // FreeLang 함수명
  eventType: string;       // 이벤트 타입 (data, message, close, error 등)
  data?: any;              // 콜백 데이터
  timestamp: number;       // 호출 시간
}

/**
 * 콜백 큐
 * C 라이브러리에서 호출된 콜백을 큐에 넣고,
 * FreeLang VM이 메인 루프에서 처리
 */
export class CallbackQueue {
  private queue: CallbackContext[] = [];
  private handlers: Map<string, (ctx: CallbackContext) => void> = new Map();
  private idCounter: number = 0;
  private vmInstance: any = null;  // Phase 3.3: VM 인스턴스 저장

  /**
   * Phase 3.3: VM 인스턴스 설정
   * (handleFFICallbacks()가 vm.executeCallback()을 호출할 수 있도록)
   */
  public setVMInstance(vm: any): void {
    this.vmInstance = vm;
  }

  /**
   * VM 인스턴스 조회
   */
  public getVMInstance(): any {
    return this.vmInstance;
  }

  /**
   * 콜백 등록
   */
  public registerHandler(
    eventType: string,
    handler: (ctx: CallbackContext) => void
  ): void {
    this.handlers.set(eventType, handler);
  }

  /**
   * 콜백 큐에 추가 (C 라이브러리에서 호출)
   */
  public enqueue(context: Omit<CallbackContext, 'id' | 'timestamp'>): number {
    const ctx: CallbackContext = {
      ...context,
      id: this.idCounter++,
      timestamp: Date.now()
    };

    this.queue.push(ctx);
    return ctx.id;
  }

  /**
   * 큐에서 콜백 처리
   */
  public processNext(): boolean {
    if (this.queue.length === 0) {
      return false;
    }

    const ctx = this.queue.shift();
    if (!ctx) return false;

    const handler = this.handlers.get(ctx.eventType);
    if (handler) {
      try {
        handler(ctx);
      } catch (error) {
        console.error(
          `❌ Error in callback handler (${ctx.eventType}):`,
          error
        );
      }
    }

    return true;
  }

  /**
   * 모든 콜백 처리
   */
  public processAll(): number {
    let count = 0;
    while (this.processNext()) {
      count++;
    }
    return count;
  }

  /**
   * 큐 크기
   */
  public size(): number {
    return this.queue.length;
  }

  /**
   * 큐 비우기
   */
  public clear(): void {
    this.queue = [];
  }
}

/**
 * 글로벌 콜백 큐
 */
export const globalCallbackQueue = new CallbackQueue();

/**
 * Phase 3.3: 콜백 핸들러 팩토리
 * VM 인스턴스를 참조하는 핸들러를 동적으로 생성
 */
function createCallbackHandler(
  queue: CallbackQueue,
  eventType: string,
  getArgsFromContext: (ctx: CallbackContext) => any[]
): (ctx: CallbackContext) => void {
  return (ctx: CallbackContext) => {
    const vm = queue.getVMInstance();

    // 디버그 로그
    const eventName = ctx.functionName.split('_').slice(-1)[0];
    console.log(`📌 Callback: ${eventType} → ${ctx.functionName}`);

    // VM이 없으면 경고
    if (!vm) {
      console.warn(`⚠️  VM not initialized. Callback ${ctx.functionName} dropped.`);
      return;
    }

    // VM에 콜백 실행 메서드가 없으면 경고
    if (!vm.executeCallback || typeof vm.executeCallback !== 'function') {
      console.warn(`⚠️  VM does not have executeCallback method.`);
      return;
    }

    // FreeLang 콜백 함수 실행
    try {
      const args = getArgsFromContext(ctx);
      const result = vm.executeCallback(ctx.functionName, args);
      console.log(`✓ Callback executed: ${ctx.functionName}`);
    } catch (error) {
      console.error(`❌ Error executing callback ${ctx.functionName}:`, error);
    }
  };
}

/**
 * 콜백 브릿지 초기화
 * (이 함수는 FreeLang VM 시작 시 호출)
 * Phase 3.3: VM 인스턴스를 받아서 핸들러에서 vm.executeCallback() 호출
 */
export function initializeCallbackBridge(vmInstance?: any): void {
  console.log('🌉 Initializing FFI Callback Bridge...\n');

  // VM 인스턴스 설정
  if (vmInstance) {
    globalCallbackQueue.setVMInstance(vmInstance);
    console.log('✓ VM instance attached to callback bridge');
  }

  // Stream 콜백
  globalCallbackQueue.registerHandler(
    'stream:data',
    createCallbackHandler(globalCallbackQueue, 'stream:data', (ctx) => [
      ctx.data
    ])
  );

  // WebSocket 콜백
  globalCallbackQueue.registerHandler(
    'ws:message',
    createCallbackHandler(globalCallbackQueue, 'ws:message', (ctx) => [
      ctx.data
    ])
  );

  globalCallbackQueue.registerHandler(
    'ws:open',
    createCallbackHandler(globalCallbackQueue, 'ws:open', (ctx) => [])
  );

  globalCallbackQueue.registerHandler(
    'ws:close',
    createCallbackHandler(globalCallbackQueue, 'ws:close', (ctx) => [])
  );

  globalCallbackQueue.registerHandler(
    'ws:error',
    createCallbackHandler(globalCallbackQueue, 'ws:error', (ctx) => [
      ctx.data
    ])
  );

  // HTTP/2 콜백
  globalCallbackQueue.registerHandler(
    'http2:data',
    createCallbackHandler(globalCallbackQueue, 'http2:data', (ctx) => [
      ctx.data
    ])
  );

  globalCallbackQueue.registerHandler(
    'http2:frame',
    createCallbackHandler(globalCallbackQueue, 'http2:frame', (ctx) => [
      ctx.data
    ])
  );

  // Timer 콜백
  globalCallbackQueue.registerHandler(
    'timer:tick',
    createCallbackHandler(globalCallbackQueue, 'timer:tick', (ctx) => [])
  );

  console.log('✅ Callback Bridge initialized\n');
}

/**
 * 메인 루프에 통합되는 콜백 처리
 * (FreeLang VM의 이벤트 루프에서 주기적으로 호출)
 */
export function processCallbacks(): number {
  return globalCallbackQueue.processAll();
}

/**
 * 콜백 통계
 */
export function getCallbackStats(): {
  queueSize: number;
  handlersCount: number;
} {
  return {
    queueSize: globalCallbackQueue.size(),
    handlersCount: 0 // 핸들러 수는 내부적으로 관리
  };
}

/**
 * C 라이브러리가 호출하는 콜백 함수들
 * (이 함수들은 FFI를 통해 C 코드에서 호출됨)
 */

/**
 * Stream 데이터 콜백
 */
export function onStreamData(
  streamHandle: number,
  data: string
): number {
  return globalCallbackQueue.enqueue({
    functionName: `stream_${streamHandle}_ondata`,
    eventType: 'stream:data',
    data
  });
}

/**
 * WebSocket 메시지 콜백
 */
export function onWebSocketMessage(
  socketHandle: number,
  message: string
): number {
  return globalCallbackQueue.enqueue({
    functionName: `ws_${socketHandle}_onmessage`,
    eventType: 'ws:message',
    data: message
  });
}

/**
 * WebSocket 연결 열림 콜백
 */
export function onWebSocketOpen(socketHandle: number): number {
  return globalCallbackQueue.enqueue({
    functionName: `ws_${socketHandle}_onopen`,
    eventType: 'ws:open'
  });
}

/**
 * WebSocket 연결 닫힘 콜백
 */
export function onWebSocketClose(socketHandle: number): number {
  return globalCallbackQueue.enqueue({
    functionName: `ws_${socketHandle}_onclose`,
    eventType: 'ws:close'
  });
}

/**
 * WebSocket 에러 콜백
 */
export function onWebSocketError(
  socketHandle: number,
  error: string
): number {
  return globalCallbackQueue.enqueue({
    functionName: `ws_${socketHandle}_onerror`,
    eventType: 'ws:error',
    data: error
  });
}

/**
 * HTTP/2 데이터 콜백
 */
export function onHttp2Data(
  sessionHandle: number,
  data: string
): number {
  return globalCallbackQueue.enqueue({
    functionName: `http2_${sessionHandle}_ondata`,
    eventType: 'http2:data',
    data
  });
}

/**
 * Timer 틱 콜백
 */
export function onTimerTick(timerHandle: number): number {
  return globalCallbackQueue.enqueue({
    functionName: `timer_${timerHandle}_ontick`,
    eventType: 'timer:tick'
  });
}
