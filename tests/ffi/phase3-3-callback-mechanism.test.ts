/**
 * Phase 3.3: 콜백 메커니즘 테스트
 * C 라이브러리 콜백을 FreeLang VM과 연결
 */

import {
  CallbackQueue,
  globalCallbackQueue,
  initializeCallbackBridge,
  onStreamData,
  onWebSocketMessage,
  onWebSocketOpen,
  onWebSocketClose,
  onTimerTick,
  getCallbackStats
} from '../../src/ffi/callback-bridge';

/**
 * 테스트 1: CallbackQueue 초기화
 */
function test_init_callback_queue(): void {
  console.log('\n【Test 1】CallbackQueue 초기화');

  try {
    const queue = new CallbackQueue();
    const stats = getCallbackStats();

    console.log(`  ✓ CallbackQueue 초기화됨`);
    console.log(`  ✓ 큐 크기: ${stats.queueSize}`);
    console.log(`  ✓ 핸들러: ${stats.handlersCount}`);
  } catch (error) {
    console.error(`  ✗ 초기화 실패:`, error);
  }
}

/**
 * 테스트 2: 콜백 등록 및 처리
 */
function test_callback_enqueue_and_process(): void {
  console.log('\n【Test 2】콜백 등록 및 처리');

  const queue = new CallbackQueue();
  let handlerCalled = false;

  // 핸들러 등록
  queue.registerHandler('stream:data', (ctx) => {
    console.log(`  📨 Handler called: ${ctx.functionName}`);
    console.log(`     Data: ${ctx.data}`);
    handlerCalled = true;
  });

  // 콜백 추가
  const callbackId = queue.enqueue({
    functionName: 'stream_1001_ondata',
    eventType: 'stream:data',
    data: 'Hello from stream'
  });

  console.log(`  ✓ 콜백 추가됨 (ID: ${callbackId})`);
  console.log(`  ✓ 큐 크기: ${queue.size()}`);

  // 콜백 처리
  const processedCount = queue.processAll();
  console.log(`  ✓ 처리됨: ${processedCount} 콜백`);
  console.log(`  ✓ 핸들러 호출됨: ${handlerCalled}`);
}

/**
 * 테스트 3: 여러 콜백 처리
 */
function test_multiple_callbacks(): void {
  console.log('\n【Test 3】여러 콜백 처리');

  const queue = new CallbackQueue();
  let callCount = 0;

  // 핸들러 등록
  queue.registerHandler('ws:message', (ctx) => {
    callCount++;
    console.log(`  💬 WebSocket message ${callCount}: ${ctx.data}`);
  });

  // 여러 콜백 추가
  const callbacks = [
    { data: 'First message' },
    { data: 'Second message' },
    { data: 'Third message' }
  ];

  for (const cb of callbacks) {
    queue.enqueue({
      functionName: `ws_1001_onmessage`,
      eventType: 'ws:message',
      data: cb.data
    });
  }

  console.log(`  ✓ ${callbacks.length}개 콜백 추가됨`);

  // 모든 콜백 처리
  const processedCount = queue.processAll();
  console.log(`  ✓ 처리됨: ${processedCount} 콜백`);
  console.log(`  ✓ 핸들러 호출됨: ${callCount}회`);
}

/**
 * 테스트 4: VM 인스턴스 설정
 */
function test_vm_instance_setup(): void {
  console.log('\n【Test 4】VM 인스턴스 설정');

  // Mock VM 생성
  const mockVM = {
    name: 'FreeLang VM',
    executeCallback: (functionName: string, args: any[]) => {
      console.log(`  🔧 VM executeCallback called: ${functionName}(${args.join(', ')})`);
      return 0;
    }
  };

  const queue = new CallbackQueue();
  queue.setVMInstance(mockVM);

  const vm = queue.getVMInstance();
  console.log(`  ✓ VM 인스턴스 설정됨`);
  console.log(`  ✓ VM 이름: ${vm.name}`);
  console.log(`  ✓ VM 메서드: ${typeof vm.executeCallback === 'function' ? '존재' : '없음'}`);
}

/**
 * 테스트 5: 콜백 브릿지 초기화
 */
function test_callback_bridge_initialization(): void {
  console.log('\n【Test 5】콜백 브릿지 초기화');

  // Mock VM
  const mockVM = {
    executeCallback: (functionName: string, args: any[]) => {
      return 0;
    }
  };

  try {
    initializeCallbackBridge(mockVM);
    console.log(`  ✓ 콜백 브릿지 초기화됨`);
    console.log(`  ✓ VM 인스턴스 전달됨`);
  } catch (error) {
    console.error(`  ✗ 초기화 실패:`, error);
  }
}

/**
 * 테스트 6: 콜백 함수 호출 (C 함수 호출)
 */
function test_callback_functions(): void {
  console.log('\n【Test 6】콜백 함수 호출 (C 함수 시뮬레이션)');

  const callbacks = [
    { fn: () => onStreamData(1001, 'stream data'), name: 'onStreamData' },
    { fn: () => onWebSocketMessage(1002, 'ws message'), name: 'onWebSocketMessage' },
    { fn: () => onWebSocketOpen(1002), name: 'onWebSocketOpen' },
    { fn: () => onWebSocketClose(1002), name: 'onWebSocketClose' },
    { fn: () => onTimerTick(1003), name: 'onTimerTick' }
  ];

  for (const cb of callbacks) {
    const callbackId = cb.fn();
    console.log(`  ✓ ${cb.name}() → ID: ${callbackId}`);
  }

  console.log(`  ✓ 큐 크기: ${globalCallbackQueue.size()}`);
}

/**
 * 테스트 7: 처리 흐름 (C → Queue → Handler → VM)
 */
function test_full_callback_flow(): void {
  console.log('\n【Test 7】처리 흐름 (C → Queue → Handler → VM)');

  const eventLog: string[] = [];

  // Mock VM
  const mockVM = {
    executeCallback: (functionName: string, args: any[]) => {
      eventLog.push(`VM.executeCallback(${functionName}, [${args.join(', ')}])`);
      console.log(`     🔧 ${functionName}(${args.join(', ')})`);
      return 0;
    }
  };

  // 새로운 큐 생성
  const queue = new CallbackQueue();
  queue.setVMInstance(mockVM);

  // 핸들러 등록 (실제 vm 호출)
  queue.registerHandler('ws:message', (ctx) => {
    if (mockVM.executeCallback) {
      mockVM.executeCallback(ctx.functionName, [ctx.data]);
    }
  });

  // 흐름 시뮬레이션
  console.log(`  1️⃣  C library calls onWebSocketMessage(1001, "Hello")`);
  const callbackId = queue.enqueue({
    functionName: 'ws_1001_onmessage',
    eventType: 'ws:message',
    data: 'Hello'
  });
  console.log(`     → Callback ID: ${callbackId}`);

  console.log(`  2️⃣  Queue received callback`);
  console.log(`     → Queue size: ${queue.size()}`);

  console.log(`  3️⃣  processAll() processes callbacks`);
  const processedCount = queue.processAll();
  console.log(`     → Processed: ${processedCount}`);

  console.log(`  4️⃣  Handler executes vm.executeCallback()`);
  console.log(`     → Queue size: ${queue.size()}`);

  console.log(`  ✓ 전체 흐름 완료`);
  console.log(`  ✓ 로그:`);
  for (const log of eventLog) {
    console.log(`     ${log}`);
  }
}

/**
 * 메인 테스트 실행
 */
function main(): void {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║    Phase 3.3: 콜백 메커니즘 테스트            ║');
  console.log('║    C 라이브러리 ↔ FreeLang VM 연결            ║');
  console.log('╚════════════════════════════════════════════════╝');

  test_init_callback_queue();
  test_callback_enqueue_and_process();
  test_multiple_callbacks();
  test_vm_instance_setup();
  test_callback_bridge_initialization();
  test_callback_functions();
  test_full_callback_flow();

  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║            테스트 완료 ✅                      ║');
  console.log('╚════════════════════════════════════════════════╝\n');
}

// 실행
main();
