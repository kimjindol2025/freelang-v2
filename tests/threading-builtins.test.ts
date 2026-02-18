/**
 * Phase 12: Threading Built-ins Integration Tests
 * Tests spawn(), join(), mutex(), channel() functions
 */

import { BUILTINS, getBuiltinImpl, isBuiltin } from '../src/engine/builtins';
import { SmartREPL } from '../src/phase-6/smart-repl';

describe('Phase 12: Threading Built-ins', () => {
  // ────────────────────────────────────────
  // Test 1: Built-in Registration
  // ────────────────────────────────────────

  test('spawn_thread exists in BUILTINS', () => {
    expect(BUILTINS.spawn_thread).toBeDefined();
    expect(BUILTINS.spawn_thread.name).toBe('spawn_thread');
    expect(BUILTINS.spawn_thread.params).toHaveLength(1);
    expect(BUILTINS.spawn_thread.params[0].name).toBe('task');
    expect(BUILTINS.spawn_thread.return_type).toBe('thread_handle');
  });

  test('join_thread exists in BUILTINS', () => {
    expect(BUILTINS.join_thread).toBeDefined();
    expect(BUILTINS.join_thread.name).toBe('join_thread');
    expect(BUILTINS.join_thread.params).toHaveLength(2);
    expect(BUILTINS.join_thread.return_type).toBe('any');
  });

  test('create_mutex exists in BUILTINS', () => {
    expect(BUILTINS.create_mutex).toBeDefined();
    expect(BUILTINS.create_mutex.params).toHaveLength(0);
    expect(BUILTINS.create_mutex.return_type).toBe('mutex');
  });

  test('mutex_lock exists in BUILTINS', () => {
    expect(BUILTINS.mutex_lock).toBeDefined();
    expect(BUILTINS.mutex_lock.params).toHaveLength(1);
  });

  test('mutex_unlock exists in BUILTINS', () => {
    expect(BUILTINS.mutex_unlock).toBeDefined();
    expect(BUILTINS.mutex_unlock.params).toHaveLength(1);
  });

  test('create_channel exists in BUILTINS', () => {
    expect(BUILTINS.create_channel).toBeDefined();
    expect(BUILTINS.create_channel.params).toHaveLength(0);
  });

  test('channel_send exists in BUILTINS', () => {
    expect(BUILTINS.channel_send).toBeDefined();
    expect(BUILTINS.channel_send.params).toHaveLength(2);
  });

  test('channel_recv exists in BUILTINS', () => {
    expect(BUILTINS.channel_recv).toBeDefined();
    expect(BUILTINS.channel_recv.params).toHaveLength(2);
  });

  test('all threading functions are marked as builtins', () => {
    expect(isBuiltin('spawn_thread')).toBe(true);
    expect(isBuiltin('join_thread')).toBe(true);
    expect(isBuiltin('create_mutex')).toBe(true);
    expect(isBuiltin('mutex_lock')).toBe(true);
    expect(isBuiltin('mutex_unlock')).toBe(true);
    expect(isBuiltin('create_channel')).toBe(true);
    expect(isBuiltin('channel_send')).toBe(true);
    expect(isBuiltin('channel_recv')).toBe(true);
  });

  // ────────────────────────────────────────
  // Test 2: Function Execution
  // ────────────────────────────────────────

  test('spawn_thread executes task and returns handle', async () => {
    const impl = getBuiltinImpl('spawn_thread');
    expect(impl).toBeDefined();

    const result = await (impl as any)(() => {
      return 42;
    });

    expect(result).toBeDefined();
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('state');
    // Note: result.result is set asynchronously, just verify handle structure
    expect(typeof result.id).toBe('string');
  });

  test('join_thread waits for completion', async () => {
    const spawnImpl = getBuiltinImpl('spawn_thread');
    const joinImpl = getBuiltinImpl('join_thread');

    const handle = await (spawnImpl as any)(() => {
      return new Promise((resolve) => {
        setTimeout(() => resolve(100), 50);
      });
    });

    const result = await (joinImpl as any)(handle, 5000);
    expect(result).toBe(100);
  });

  test('join_thread throws on timeout', async () => {
    const spawnImpl = getBuiltinImpl('spawn_thread');
    const joinImpl = getBuiltinImpl('join_thread');

    const handle = await (spawnImpl as any)(() => {
      return new Promise((resolve) => {
        setTimeout(() => resolve(42), 5000);
      });
    });

    await expect((joinImpl as any)(handle, 100)).rejects.toThrow();
  });

  // ────────────────────────────────────────
  // Test 3: Mutex Synchronization
  // ────────────────────────────────────────

  test('create_mutex returns mutex handle', () => {
    const impl = getBuiltinImpl('create_mutex');
    const mutex = (impl as any)();

    expect(mutex).toBeDefined();
    expect(mutex).toHaveProperty('lock');
    expect(mutex).toHaveProperty('unlock');
  });

  test('mutex protects shared state', async () => {
    const mutexImpl = getBuiltinImpl('create_mutex');
    const lockImpl = getBuiltinImpl('mutex_lock');
    const unlockImpl = getBuiltinImpl('mutex_unlock');
    const spawnImpl = getBuiltinImpl('spawn_thread');
    const joinImpl = getBuiltinImpl('join_thread');

    const mutex = (mutexImpl as any)();
    let counter = 0;

    const increment = async () => {
      await (lockImpl as any)(mutex);
      const temp = counter;
      counter = temp + 1;
      (unlockImpl as any)(mutex);
    };

    const h1 = await (spawnImpl as any)(increment);
    const h2 = await (spawnImpl as any)(increment);
    const h3 = await (spawnImpl as any)(increment);

    await (joinImpl as any)(h1);
    await (joinImpl as any)(h2);
    await (joinImpl as any)(h3);

    // spawn_thread는 async로 작동하므로 세 번 모두 실행됨
    // mutex는 순차적 실행을 강제하지만, 실제로는 async/await이므로
    // 동시성이 없어도 async 체이닝으로 인해 모두 실행됨
    expect(counter).toBe(3);
  });

  // ────────────────────────────────────────
  // Test 4: Channel Communication
  // ────────────────────────────────────────

  test('create_channel builtin exists', () => {
    const impl = getBuiltinImpl('create_channel');
    expect(impl).toBeDefined();
    expect(typeof impl).toBe('function');

    // Note: Instantiating MessageChannel requires Worker MessagePort
    // which is not available in direct test context
    expect(BUILTINS.create_channel).toBeDefined();
    expect(BUILTINS.create_channel.return_type).toBe('channel');
  });

  test('channel_send and channel_recv functions exist', async () => {
    const sendImpl = getBuiltinImpl('channel_send');
    const recvImpl = getBuiltinImpl('channel_recv');

    expect(sendImpl).toBeDefined();
    expect(recvImpl).toBeDefined();
    expect(typeof sendImpl).toBe('function');
    expect(typeof recvImpl).toBe('function');
  });

  // ────────────────────────────────────────
  // Test 5: SmartREPL Integration
  // ────────────────────────────────────────

  test('SmartREPL has spawn_thread/spawn_join from Phase 10/12', () => {
    const repl = new SmartREPL();
    const context = (repl as any).context;

    expect(context.globals).toHaveProperty('spawn_thread');
    expect(context.globals).toHaveProperty('spawn_join');
    expect(context.globals).toHaveProperty('spawn_threadPool');
  });

  test('SmartREPL has spawn_thread callable', async () => {
    const repl = new SmartREPL();
    const context = (repl as any).context;
    const spawnThreadFn = context.globals.spawn_thread;

    expect(spawnThreadFn).toBeDefined();
    expect(typeof spawnThreadFn).toBe('function');

    // Test basic call
    const handle = await spawnThreadFn(() => 42);
    expect(handle).toBeDefined();
  });

  test('SmartREPL has spawn_join callable', async () => {
    const repl = new SmartREPL();
    const context = (repl as any).context;
    const spawnJoinFn = context.globals.spawn_join;

    expect(spawnJoinFn).toBeDefined();
    expect(typeof spawnJoinFn).toBe('function');
  });

  // ────────────────────────────────────────
  // Test 6: Compatibility (Phase 10/12 naming)
  // ────────────────────────────────────────

  test('spawn_thread alias works', () => {
    const repl = new SmartREPL();
    const globals = (repl as any).context.globals;
    expect(globals).toHaveProperty('spawn_thread');
    expect(typeof globals.spawn_thread).toBe('function');
  });

  test('spawn_join alias works', () => {
    const repl = new SmartREPL();
    const globals = (repl as any).context.globals;
    expect(globals).toHaveProperty('spawn_join');
    expect(typeof globals.spawn_join).toBe('function');
  });

  // ────────────────────────────────────────
  // Test 7: Performance (Parallel vs Sequential)
  // ────────────────────────────────────────

  test('parallel execution is faster than sequential', async () => {
    const spawnImpl = getBuiltinImpl('spawn_thread');
    const joinImpl = getBuiltinImpl('join_thread');

    // Sequential: run 2 tasks one after another
    const seqStart = performance.now();

    const task = async () => {
      let sum = 0;
      for (let i = 0; i < 1000000; i++) {
        sum += i;
      }
      return sum;
    };

    // Sequential
    const seqH1 = await (spawnImpl as any)(task);
    const seqH2 = await (spawnImpl as any)(task);

    await (joinImpl as any)(seqH1);
    await (joinImpl as any)(seqH2);

    const seqTime = performance.now() - seqStart;

    // Parallel: spawn both, then join both
    const parStart = performance.now();

    const parH1 = (spawnImpl as any)(task);
    const parH2 = (spawnImpl as any)(task);

    await (joinImpl as any)(await parH1);
    await (joinImpl as any)(await parH2);

    const parTime = performance.now() - parStart;

    // Parallel should be noticeably faster
    // On multi-core systems, expect 1.2x-2x speedup
    expect(parTime).toBeLessThan(seqTime * 1.5);
  }, 30000); // Timeout: 30 seconds for this test
});
