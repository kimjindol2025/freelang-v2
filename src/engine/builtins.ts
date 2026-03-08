// FreeLang v2 - Builtin Registry (단일 진실 공급원)
// 한 번 선언 → 3곳 자동 사용 (TypeChecker, Interpreter, CodeGen)

export interface BuiltinParam {
  name: string;
  type: string;  // "number", "array<number>", "...any"
}

export interface BuiltinSpec {
  name: string;
  params: BuiltinParam[];
  return_type: string;
  c_name: string;
  headers: string[];
  impl?: (...args: any[]) => any;  // interpreter용
}

// ────────────────────────────────────────
// Builtin 함수 정의 (단일 소스)
// ────────────────────────────────────────

export const BUILTINS: Record<string, BuiltinSpec> = {
  // Array aggregates
  sum: {
    name: 'sum',
    params: [{ name: 'arr', type: 'array<number>' }],
    return_type: 'number',
    c_name: 'sum_array',
    headers: ['stdlib.h'],
    impl: (arr: number[]) => arr.reduce((a, b) => a + b, 0),
  },

  average: {
    name: 'average',
    params: [{ name: 'arr', type: 'array<number>' }],
    return_type: 'number',
    c_name: 'avg_array',
    headers: ['stdlib.h'],
    impl: (arr: number[]) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0,
  },

  max: {
    name: 'max',
    params: [{ name: 'arr', type: 'array<number>' }],
    return_type: 'number',
    c_name: 'max_array',
    headers: ['stdlib.h'],
    impl: (arr: number[]) => (arr.length > 0 ? Math.max(...arr) : 0),
  },

  min: {
    name: 'min',
    params: [{ name: 'arr', type: 'array<number>' }],
    return_type: 'number',
    c_name: 'min_array',
    headers: ['stdlib.h'],
    impl: (arr: number[]) => (arr.length > 0 ? Math.min(...arr) : 0),
  },

  count: {
    name: 'count',
    params: [{ name: 'arr', type: 'array<number>' }],
    return_type: 'number',
    c_name: 'arr_len',
    headers: ['stdlib.h'],
    impl: (arr: number[]) => arr.length,
  },

  length: {
    name: 'length',
    params: [{ name: 'arr', type: 'array<number>' }],
    return_type: 'number',
    c_name: 'arr_len',
    headers: ['stdlib.h'],
    impl: (arr: number[]) => arr.length,
  },

  // Math functions
  sqrt: {
    name: 'sqrt',
    params: [{ name: 'x', type: 'number' }],
    return_type: 'number',
    c_name: 'sqrt',
    headers: ['math.h'],
    impl: Math.sqrt,
  },

  abs: {
    name: 'abs',
    params: [{ name: 'x', type: 'number' }],
    return_type: 'number',
    c_name: 'fabs',
    headers: ['math.h'],
    impl: Math.abs,
  },

  floor: {
    name: 'floor',
    params: [{ name: 'x', type: 'number' }],
    return_type: 'number',
    c_name: 'floor',
    headers: ['math.h'],
    impl: Math.floor,
  },

  ceil: {
    name: 'ceil',
    params: [{ name: 'x', type: 'number' }],
    return_type: 'number',
    c_name: 'ceil',
    headers: ['math.h'],
    impl: Math.ceil,
  },

  round: {
    name: 'round',
    params: [{ name: 'x', type: 'number' }],
    return_type: 'number',
    c_name: 'round',
    headers: ['math.h'],
    impl: Math.round,
  },

  // Logic
  not: {
    name: 'not',
    params: [{ name: 'x', type: 'boolean' }],
    return_type: 'boolean',
    c_name: '!',
    headers: [],
    impl: (x: boolean) => !x,
  },

  // I/O (stub - actual impl in VM)
  println: {
    name: 'println',
    params: [{ name: 'args', type: '...any' }],
    return_type: 'void',
    c_name: 'printf',
    headers: ['stdio.h'],
    impl: (...args: any[]) => console.log(...args),
  },

  // ────────────────────────────────────────
  // String operations (Project Ouroboros)
  // ────────────────────────────────────────

  charAt: {
    name: 'charAt',
    params: [
      { name: 'str', type: 'string' },
      { name: 'index', type: 'number' },
    ],
    return_type: 'string',
    c_name: 'char_at',
    headers: ['string.h'],
    impl: (str: string, index: number) => str[Math.floor(index)] || '',
  },

  // Override length for string (in addition to array)
  // Note: We'll handle both in the interpreter
  string_length: {
    name: 'string_length',
    params: [{ name: 'str', type: 'string' }],
    return_type: 'number',
    c_name: 'strlen',
    headers: ['string.h'],
    impl: (str: string) => (typeof str === 'string' ? str.length : 0),
  },

  substr: {
    name: 'substr',
    params: [
      { name: 'str', type: 'string' },
      { name: 'start', type: 'number' },
      { name: 'end', type: 'number' },
    ],
    return_type: 'string',
    c_name: 'substr',
    headers: ['string.h'],
    impl: (str: string, start: number, end: number) =>
      str.substring(Math.floor(start), Math.floor(end)),
  },

  isDigit: {
    name: 'isDigit',
    params: [{ name: 'ch', type: 'string' }],
    return_type: 'boolean',
    c_name: 'isdigit',
    headers: ['ctype.h'],
    impl: (ch: string) => /^\d$/.test(ch),
  },

  isLetter: {
    name: 'isLetter',
    params: [{ name: 'ch', type: 'string' }],
    return_type: 'boolean',
    c_name: 'isalpha',
    headers: ['ctype.h'],
    impl: (ch: string) => /^[a-zA-Z]$/.test(ch),
  },

  push: {
    name: 'push',
    params: [
      { name: 'arr', type: 'array<number>' },
      { name: 'element', type: 'number' },
    ],
    return_type: 'void',
    c_name: 'arr_push',
    headers: ['stdlib.h'],
    impl: (arr: any[], element: any) => {
      if (Array.isArray(arr)) arr.push(element);
    },
  },

  // ────────────────────────────────────────
  // HTTP Client (Phase 13)
  // ────────────────────────────────────────

  http_get: {
    name: 'http_get',
    params: [{ name: 'url', type: 'string' }],
    return_type: 'object',  // { status_code: number, body: string, headers: object, elapsed_ms: number }
    c_name: 'http_get',
    headers: ['curl.h'],
    impl: async (url: string) => {
      const { HttpWrapper } = await import('./http-wrapper');
      return await HttpWrapper.get(url);
    },
  },

  http_post: {
    name: 'http_post',
    params: [
      { name: 'url', type: 'string' },
      { name: 'body', type: 'string' },
    ],
    return_type: 'object',
    c_name: 'http_post',
    headers: ['curl.h'],
    impl: async (url: string, body: string) => {
      const { HttpWrapper } = await import('./http-wrapper');
      return await HttpWrapper.post(url, body);
    },
  },

  http_json_get: {
    name: 'http_json_get',
    params: [{ name: 'url', type: 'string' }],
    return_type: 'object',
    c_name: 'http_json_get',
    headers: ['curl.h'],
    impl: async (url: string) => {
      const { HttpWrapper } = await import('./http-wrapper');
      return await HttpWrapper.getJSON(url);
    },
  },

  http_json_post: {
    name: 'http_json_post',
    params: [
      { name: 'url', type: 'string' },
      { name: 'data', type: 'object' },
    ],
    return_type: 'object',
    c_name: 'http_json_post',
    headers: ['curl.h'],
    impl: async (url: string, data: any) => {
      const { HttpWrapper } = await import('./http-wrapper');
      return await HttpWrapper.postJSON(url, data);
    },
  },

  http_head: {
    name: 'http_head',
    params: [{ name: 'url', type: 'string' }],
    return_type: 'object',
    c_name: 'http_head',
    headers: ['curl.h'],
    impl: async (url: string) => {
      const { HttpWrapper } = await import('./http-wrapper');
      return await HttpWrapper.head(url);
    },
  },

  http_patch: {
    name: 'http_patch',
    params: [
      { name: 'url', type: 'string' },
      { name: 'body', type: 'string' },
    ],
    return_type: 'object',
    c_name: 'http_patch',
    headers: ['curl.h'],
    impl: async (url: string, body: string) => {
      const { HttpWrapper } = await import('./http-wrapper');
      return await HttpWrapper.patch(url, body);
    },
  },

  // ────────────────────────────────────────
  // Advanced HTTP (Phase 13 Week 3)
  // ────────────────────────────────────────

  http_batch: {
    name: 'http_batch',
    params: [
      { name: 'urls', type: 'array<string>' },
      { name: 'limit', type: 'number' },
    ],
    return_type: 'array<object>',
    c_name: 'http_batch',
    headers: ['curl.h'],
    impl: async (urls: string[], limit: number = 10) => {
      const { HttpBatch } = await import('./http-batch');
      const { HttpWrapper } = await import('./http-wrapper');
      const result = await HttpBatch.withLimit(
        urls,
        Math.max(1, Math.floor(limit)),
        url => HttpWrapper.get(url),
        { continueOnError: true }
      );
      return result.results;
    },
  },

  http_get_with_retry: {
    name: 'http_get_with_retry',
    params: [
      { name: 'url', type: 'string' },
      { name: 'max_retries', type: 'number' },
    ],
    return_type: 'object',
    c_name: 'http_get_with_retry',
    headers: ['curl.h'],
    impl: async (url: string, maxRetries: number = 3) => {
      const { HttpRetry } = await import('./http-retry');
      const { HttpWrapper } = await import('./http-wrapper');
      return await HttpRetry.withRetry(
        () => HttpWrapper.get(url),
        {
          maxRetries: Math.max(0, Math.floor(maxRetries)),
          backoffMs: 1000,
          retryOn: (error: any) => {
            // 5xx 또는 네트워크 에러만 재시도
            return HttpRetry.isRetryableError(error);
          },
        }
      );
    },
  },

  // ────────────────────────────────────────
  // Timer API (Phase 16)
  // ────────────────────────────────────────

  timer_create: {
    name: 'timer_create',
    params: [],
    return_type: 'number',  // timer_id
    c_name: 'freelang_timer_create',
    headers: ['freelang_ffi.h', 'uv.h'],
    impl: () => {
      // Fallback: return a unique ID
      return Math.floor(Math.random() * 1000000);
    },
  },

  timer_start: {
    name: 'timer_start',
    params: [
      { name: 'timer_id', type: 'number' },
      { name: 'timeout_ms', type: 'number' },
      { name: 'callback_id', type: 'number' },
      { name: 'repeat', type: 'number' },
    ],
    return_type: 'number',  // 0 on success, -1 on error
    c_name: 'freelang_timer_start',
    headers: ['freelang_ffi.h', 'uv.h'],
    impl: (timerId: number, timeoutMs: number, callbackId: number, repeat: number) => {
      // Fallback: simulated timer
      return 0;
    },
  },

  timer_stop: {
    name: 'timer_stop',
    params: [{ name: 'timer_id', type: 'number' }],
    return_type: 'void',
    c_name: 'freelang_timer_stop',
    headers: ['freelang_ffi.h', 'uv.h'],
    impl: (timerId: number) => {
      // Stub
    },
  },

  timer_close: {
    name: 'timer_close',
    params: [{ name: 'timer_id', type: 'number' }],
    return_type: 'void',
    c_name: 'freelang_timer_close',
    headers: ['freelang_ffi.h', 'uv.h'],
    impl: (timerId: number) => {
      // Stub
    },
  },

  // ────────────────────────────────────────
  // Event Loop Control (Phase 16-17)
  // ────────────────────────────────────────

  event_loop_run: {
    name: 'event_loop_run',
    params: [{ name: 'timeout_ms', type: 'number' }],
    return_type: 'void',
    c_name: 'freelang_event_loop_run',
    headers: ['freelang_ffi.h', 'uv.h'],
    impl: (timeoutMs: number) => {
      // Stub: In real implementation, runs the libuv event loop
    },
  },

  event_loop_stop: {
    name: 'event_loop_stop',
    params: [],
    return_type: 'void',
    c_name: 'freelang_event_loop_stop',
    headers: ['freelang_ffi.h', 'uv.h'],
    impl: () => {
      // Stub
    },
  },

  // ────────────────────────────────────────
  // Redis Bindings (Phase 17 Week 2)
  // ────────────────────────────────────────

  redis_create: {
    name: 'redis_create',
    params: [
      { name: 'host', type: 'string' },
      { name: 'port', type: 'number' },
      { name: 'callback_ctx_id', type: 'number' },
    ],
    return_type: 'number',  // client_id
    c_name: 'freelang_redis_create',
    headers: ['redis_bindings.h'],
    impl: (host: string, port: number, _callbackCtxId: number) => {
      // Fallback: return a unique client ID
      return Math.floor(Math.random() * 1000000);
    },
  },

  redis_close: {
    name: 'redis_close',
    params: [{ name: 'client_id', type: 'number' }],
    return_type: 'void',
    c_name: 'freelang_redis_close',
    headers: ['redis_bindings.h'],
    impl: (_clientId: number) => {
      // Stub
    },
  },

  redis_get: {
    name: 'redis_get',
    params: [
      { name: 'client_id', type: 'number' },
      { name: 'key', type: 'string' },
      { name: 'callback_id', type: 'number' },
    ],
    return_type: 'void',
    c_name: 'freelang_redis_get',
    headers: ['redis_bindings.h'],
    impl: (_clientId: number, _key: string, _callbackId: number) => {
      // Stub
    },
  },

  redis_set: {
    name: 'redis_set',
    params: [
      { name: 'client_id', type: 'number' },
      { name: 'key', type: 'string' },
      { name: 'value', type: 'string' },
      { name: 'callback_id', type: 'number' },
    ],
    return_type: 'void',
    c_name: 'freelang_redis_set',
    headers: ['redis_bindings.h'],
    impl: (_clientId: number, _key: string, _value: string, _callbackId: number) => {
      // Stub
    },
  },

  redis_del: {
    name: 'redis_del',
    params: [
      { name: 'client_id', type: 'number' },
      { name: 'key', type: 'string' },
      { name: 'callback_id', type: 'number' },
    ],
    return_type: 'void',
    c_name: 'freelang_redis_del',
    headers: ['redis_bindings.h'],
    impl: (_clientId: number, _key: string, _callbackId: number) => {
      // Stub
    },
  },

  redis_exists: {
    name: 'redis_exists',
    params: [
      { name: 'client_id', type: 'number' },
      { name: 'key', type: 'string' },
      { name: 'callback_id', type: 'number' },
    ],
    return_type: 'void',
    c_name: 'freelang_redis_exists',
    headers: ['redis_bindings.h'],
    impl: (_clientId: number, _key: string, _callbackId: number) => {
      // Stub
    },
  },

  redis_incr: {
    name: 'redis_incr',
    params: [
      { name: 'client_id', type: 'number' },
      { name: 'key', type: 'string' },
      { name: 'callback_id', type: 'number' },
    ],
    return_type: 'void',
    c_name: 'freelang_redis_incr',
    headers: ['redis_bindings.h'],
    impl: (_clientId: number, _key: string, _callbackId: number) => {
      // Stub
    },
  },

  redis_expire: {
    name: 'redis_expire',
    params: [
      { name: 'client_id', type: 'number' },
      { name: 'key', type: 'string' },
      { name: 'seconds', type: 'number' },
      { name: 'callback_id', type: 'number' },
    ],
    return_type: 'void',
    c_name: 'freelang_redis_expire',
    headers: ['redis_bindings.h'],
    impl: (_clientId: number, _key: string, _seconds: number, _callbackId: number) => {
      // Stub
    },
  },

  redis_is_connected: {
    name: 'redis_is_connected',
    params: [{ name: 'client_id', type: 'number' }],
    return_type: 'number',
    c_name: 'freelang_redis_is_connected',
    headers: ['redis_bindings.h'],
    impl: (_clientId: number) => {
      return 0;  // Stub: not connected
    },
  },

  redis_ping: {
    name: 'redis_ping',
    params: [
      { name: 'client_id', type: 'number' },
      { name: 'callback_id', type: 'number' },
    ],
    return_type: 'number',
    c_name: 'freelang_redis_ping',
    headers: ['redis_bindings.h'],
    impl: (_clientId: number, _callbackId: number) => {
      return 0;
    },
  },

  // ────────────────────────────────────────
  // SQLite3 FFI Bindings (Phase 1C - FFI Activation)
  // ────────────────────────────────────────
  // Register native SQLite functions for database access
  // Compiled from stdlib/core/sqlite_binding.c
  // Linked as libfreelang_sqlite.so

  native_sqlite_open: {
    name: 'native_sqlite_open',
    params: [{ name: 'path', type: 'string' }],
    return_type: 'object',
    c_name: 'fl_sqlite_open',
    headers: ['sqlite_binding.h', 'sqlite3.h'],
    impl: (path: string) => {
      // Fallback: In-memory mock database connection
      return {
        path: path,
        handle: Math.floor(Math.random() * 1000000),
        isOpen: true,
        lastError: null,
      };
    },
  },

  native_sqlite_close: {
    name: 'native_sqlite_close',
    params: [{ name: 'conn', type: 'object' }],
    return_type: 'number',
    c_name: 'fl_sqlite_close',
    headers: ['sqlite_binding.h', 'sqlite3.h'],
    impl: (conn: any) => {
      // Fallback: Mark connection as closed
      if (conn) conn.isOpen = false;
      return 0;  // SQLITE_OK
    },
  },

  native_sqlite_execute: {
    name: 'native_sqlite_execute',
    params: [
      { name: 'conn', type: 'object' },
      { name: 'query', type: 'string' },
    ],
    return_type: 'object',
    c_name: 'fl_sqlite_execute',
    headers: ['sqlite_binding.h', 'sqlite3.h'],
    impl: (conn: any, query: string) => {
      // Fallback: Return empty result set
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        lastInsertRowid: 0,
      };
    },
  },

  native_sqlite_execute_update: {
    name: 'native_sqlite_execute_update',
    params: [
      { name: 'conn', type: 'object' },
      { name: 'query', type: 'string' },
    ],
    return_type: 'number',
    c_name: 'fl_sqlite_execute_update',
    headers: ['sqlite_binding.h', 'sqlite3.h'],
    impl: (conn: any, query: string) => {
      // Fallback: Return number of affected rows
      return 0;
    },
  },

  native_sqlite_fetch_row: {
    name: 'native_sqlite_fetch_row',
    params: [{ name: 'result', type: 'object' }],
    return_type: 'number',
    c_name: 'fl_sqlite_fetch_row',
    headers: ['sqlite_binding.h', 'sqlite3.h'],
    impl: (result: any) => {
      // Fallback: Return SQLITE_DONE (no more rows)
      return 101;  // SQLITE_DONE
    },
  },

  native_sqlite_get_column_text: {
    name: 'native_sqlite_get_column_text',
    params: [
      { name: 'result', type: 'object' },
      { name: 'idx', type: 'number' },
    ],
    return_type: 'string',
    c_name: 'fl_sqlite_get_column_text',
    headers: ['sqlite_binding.h', 'sqlite3.h'],
    impl: (result: any, idx: number) => {
      // Fallback: Return empty string
      return '';
    },
  },

  native_sqlite_get_column_int: {
    name: 'native_sqlite_get_column_int',
    params: [
      { name: 'result', type: 'object' },
      { name: 'idx', type: 'number' },
    ],
    return_type: 'number',
    c_name: 'fl_sqlite_get_column_int',
    headers: ['sqlite_binding.h', 'sqlite3.h'],
    impl: (result: any, idx: number) => {
      // Fallback: Return 0
      return 0;
    },
  },

  native_sqlite_get_column_double: {
    name: 'native_sqlite_get_column_double',
    params: [
      { name: 'result', type: 'object' },
      { name: 'idx', type: 'number' },
    ],
    return_type: 'number',
    c_name: 'fl_sqlite_get_column_double',
    headers: ['sqlite_binding.h', 'sqlite3.h'],
    impl: (result: any, idx: number) => {
      // Fallback: Return 0.0
      return 0.0;
    },
  },

  native_sqlite_get_error: {
    name: 'native_sqlite_get_error',
    params: [{ name: 'conn', type: 'object' }],
    return_type: 'string',
    c_name: 'fl_sqlite_get_error',
    headers: ['sqlite_binding.h', 'sqlite3.h'],
    impl: (conn: any) => {
      // Fallback: Return error from connection
      return conn?.lastError || 'no error';
    },
  },

  native_sqlite_get_error_code: {
    name: 'native_sqlite_get_error_code',
    params: [{ name: 'conn', type: 'object' }],
    return_type: 'number',
    c_name: 'fl_sqlite_get_error_code',
    headers: ['sqlite_binding.h', 'sqlite3.h'],
    impl: (conn: any) => {
      // Fallback: Return SQLITE_OK
      return 0;  // SQLITE_OK
    },
  },

  native_sqlite_begin: {
    name: 'native_sqlite_begin',
    params: [{ name: 'conn', type: 'object' }],
    return_type: 'number',
    c_name: 'fl_sqlite_begin',
    headers: ['sqlite_binding.h', 'sqlite3.h'],
    impl: (conn: any) => {
      // Fallback: Return success
      return 0;  // SQLITE_OK
    },
  },

  native_sqlite_commit: {
    name: 'native_sqlite_commit',
    params: [{ name: 'conn', type: 'object' }],
    return_type: 'number',
    c_name: 'fl_sqlite_commit',
    headers: ['sqlite_binding.h', 'sqlite3.h'],
    impl: (conn: any) => {
      // Fallback: Return success
      return 0;  // SQLITE_OK
    },
  },

  native_sqlite_rollback: {
    name: 'native_sqlite_rollback',
    params: [{ name: 'conn', type: 'object' }],
    return_type: 'number',
    c_name: 'fl_sqlite_rollback',
    headers: ['sqlite_binding.h', 'sqlite3.h'],
    impl: (conn: any) => {
      // Fallback: Return success
      return 0;  // SQLITE_OK
    },
  },

  // Threading Built-ins (Phase 12)
  spawn_thread: {
    name: 'spawn_thread',
    params: [{ name: 'task', type: 'function' }],
    return_type: 'thread_handle',
    c_name: 'freelang_spawn_thread',
    headers: ['freelang_ffi.h', 'uv.h'],
    impl: async (fn: any) => {
      // Simulated thread execution - return immediately with pending promise
      const id = `thread_${Math.random().toString(36).substr(2, 9)}`;
      const handle: any = {
        id,
        state: 'running',
        result: undefined,
      };

      // Execute the task and update handle when complete
      try {
        const result = fn();
        // Handle both Promise and regular return values
        if (result && typeof result.then === 'function') {
          result.then((val: any) => {
            handle.result = val;
            handle.state = 'completed';
          }).catch((error: any) => {
            handle.error = String(error);
            handle.state = 'failed';
          });
        } else {
          handle.result = result;
          handle.state = 'completed';
        }
      } catch (error) {
        handle.error = String(error);
        handle.state = 'failed';
      }

      return handle;
    },
  },

  join_thread: {
    name: 'join_thread',
    params: [
      { name: 'handle', type: 'thread_handle' },
      { name: 'timeout', type: 'number' },
    ],
    return_type: 'any',
    c_name: 'freelang_join_thread',
    headers: ['freelang_ffi.h', 'uv.h'],
    impl: async (handle: any, timeout?: number) => {
      // Wait for thread completion with timeout
      const startTime = Date.now();
      const timeoutMs = timeout || 5000;

      while (handle.state === 'running') {
        const elapsed = Date.now() - startTime;
        if (elapsed > timeoutMs) {
          throw new Error(`Thread join timeout after ${timeoutMs}ms`);
        }
        // Sleep 50ms to allow async tasks to complete
        await new Promise(r => setTimeout(r, 50));
      }

      if (handle.state === 'failed') {
        throw new Error(handle.error || 'Thread execution failed');
      }

      return handle.result || null;
    },
  },

  create_mutex: {
    name: 'create_mutex',
    params: [],
    return_type: 'mutex',
    c_name: 'freelang_create_mutex',
    headers: ['freelang_ffi.h', 'pthread.h'],
    impl: () => {
      const mutex = {
        id: `mutex_${Math.random().toString(36).substr(2, 9)}`,
        locked: false,
        lock: async function() {
          this.locked = true;
        },
        unlock: function() {
          this.locked = false;
        },
      };
      return mutex;
    },
  },

  mutex_lock: {
    name: 'mutex_lock',
    params: [{ name: 'mutex', type: 'mutex' }],
    return_type: 'void',
    c_name: 'freelang_mutex_lock',
    headers: ['freelang_ffi.h', 'pthread.h'],
    impl: async (mutex: any) => {
      if (mutex) {
        mutex.locked = true;
      }
    },
  },

  mutex_unlock: {
    name: 'mutex_unlock',
    params: [{ name: 'mutex', type: 'mutex' }],
    return_type: 'void',
    c_name: 'freelang_mutex_unlock',
    headers: ['freelang_ffi.h', 'pthread.h'],
    impl: (mutex: any) => {
      if (mutex) {
        mutex.locked = false;
      }
    },
  },

  create_channel: {
    name: 'create_channel',
    params: [],
    return_type: 'channel',
    c_name: 'freelang_create_channel',
    headers: ['freelang_ffi.h'],
    impl: () => {
      return {
        id: `channel_${Math.random().toString(36).substr(2, 9)}`,
        messages: [],
      };
    },
  },

  channel_send: {
    name: 'channel_send',
    params: [
      { name: 'channel', type: 'channel' },
      { name: 'message', type: 'any' },
    ],
    return_type: 'void',
    c_name: 'freelang_channel_send',
    headers: ['freelang_ffi.h'],
    impl: async (channel: any, message: any) => {
      if (channel) {
        channel.messages.push(message);
      }
    },
  },

  // ────────────────────────────────────────
  // Phase C: JSON/인코딩/암호화 함수 (12개)
  // ────────────────────────────────────────

  // JSON 함수 (3개)
  json_parse: {
    name: 'json_parse',
    params: [{ name: 's', type: 'string' }],
    return_type: 'any',
    c_name: 'freelang_json_parse',
    headers: ['freelang_json.h'],
    impl: (s: string) => {
      try {
        return JSON.parse(s);
      } catch (e) {
        throw new Error(`JSON parse error: ${(e as any).message}`);
      }
    },
  },

  json_stringify: {
    name: 'json_stringify',
    params: [{ name: 'v', type: 'any' }],
    return_type: 'string',
    c_name: 'freelang_json_stringify',
    headers: ['freelang_json.h'],
    impl: (v: any) => JSON.stringify(v),
  },

  json_pretty: {
    name: 'json_pretty',
    params: [{ name: 'v', type: 'any' }],
    return_type: 'string',
    c_name: 'freelang_json_pretty',
    headers: ['freelang_json.h'],
    impl: (v: any) => JSON.stringify(v, null, 2),
  },

  // Base64/인코딩 함수 (4개)
  base64_encode: {
    name: 'base64_encode',
    params: [{ name: 's', type: 'string' }],
    return_type: 'string',
    c_name: 'freelang_base64_encode',
    headers: ['freelang_encoding.h'],
    impl: (s: string) => Buffer.from(s).toString('base64'),
  },

  base64_decode: {
    name: 'base64_decode',
    params: [{ name: 's', type: 'string' }],
    return_type: 'string',
    c_name: 'freelang_base64_decode',
    headers: ['freelang_encoding.h'],
    impl: (s: string) => {
      try {
        return Buffer.from(s, 'base64').toString('utf-8');
      } catch (e) {
        throw new Error(`Base64 decode error: ${(e as any).message}`);
      }
    },
  },

  hex_encode: {
    name: 'hex_encode',
    params: [{ name: 's', type: 'string' }],
    return_type: 'string',
    c_name: 'freelang_hex_encode',
    headers: ['freelang_encoding.h'],
    impl: (s: string) => Buffer.from(s).toString('hex'),
  },

  hex_decode: {
    name: 'hex_decode',
    params: [{ name: 's', type: 'string' }],
    return_type: 'string',
    c_name: 'freelang_hex_decode',
    headers: ['freelang_encoding.h'],
    impl: (s: string) => {
      try {
        return Buffer.from(s, 'hex').toString('utf-8');
      } catch (e) {
        throw new Error(`Hex decode error: ${(e as any).message}`);
      }
    },
  },

  // 암호화 함수 (5개) - Phase D도 포함
  crypto_sha256: {
    name: 'crypto_sha256',
    params: [{ name: 'data', type: 'string' }],
    return_type: 'string',
    c_name: 'freelang_sha256',
    headers: ['openssl/sha.h'],
    impl: (data: string) => {
      try {
        return require('crypto').createHash('sha256').update(data).digest('hex');
      } catch (e) {
        throw new Error(`SHA256 error: ${(e as any).message}`);
      }
    },
  },

  crypto_md5: {
    name: 'crypto_md5',
    params: [{ name: 'data', type: 'string' }],
    return_type: 'string',
    c_name: 'freelang_md5',
    headers: ['openssl/md5.h'],
    impl: (data: string) => {
      try {
        return require('crypto').createHash('md5').update(data).digest('hex');
      } catch (e) {
        throw new Error(`MD5 error: ${(e as any).message}`);
      }
    },
  },

  crypto_hmac: {
    name: 'crypto_hmac',
    params: [
      { name: 'key', type: 'string' },
      { name: 'data', type: 'string' },
      { name: 'algo', type: 'string' },
    ],
    return_type: 'string',
    c_name: 'freelang_hmac',
    headers: ['openssl/hmac.h'],
    impl: (key: string, data: string, algo: string = 'sha256') => {
      try {
        return require('crypto').createHmac(algo || 'sha256', key).update(data).digest('hex');
      } catch (e) {
        throw new Error(`HMAC error: ${(e as any).message}`);
      }
    },
  },

  crypto_random_bytes: {
    name: 'crypto_random_bytes',
    params: [{ name: 'size', type: 'number' }],
    return_type: 'string',
    c_name: 'freelang_random_bytes',
    headers: ['openssl/rand.h'],
    impl: (size: number) => {
      try {
        return require('crypto').randomBytes(Math.floor(size)).toString('hex');
      } catch (e) {
        throw new Error(`Random bytes error: ${(e as any).message}`);
      }
    },
  },

  crypto_uuid: {
    name: 'crypto_uuid',
    params: [],
    return_type: 'string',
    c_name: 'freelang_uuid',
    headers: ['openssl/rand.h'],
    impl: () => {
      try {
        return require('crypto').randomUUID();
      } catch (e) {
        throw new Error(`UUID error: ${(e as any).message}`);
      }
    },
  },

  // ────────────────────────────────────────
  // Phase D: 테스트/디버깅/리플렉션 함수 (10개)
  // ────────────────────────────────────────

  // 테스트 함수 (2개)
  assert: {
    name: 'assert',
    params: [
      { name: 'condition', type: 'bool' },
      { name: 'msg', type: 'string' },
    ],
    return_type: 'void',
    c_name: 'freelang_assert',
    headers: ['assert.h'],
    impl: (condition: boolean, msg: string = 'Assertion failed') => {
      if (!condition) {
        throw new Error(`Assertion failed: ${msg}`);
      }
    },
  },

  expect: {
    name: 'expect',
    params: [
      { name: 'actual', type: 'any' },
      { name: 'expected', type: 'any' },
    ],
    return_type: 'void',
    c_name: 'freelang_expect',
    headers: ['assert.h'],
    impl: (actual: any, expected: any) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
  },

  // 디버깅 함수 (4개)
  debug_inspect: {
    name: 'debug_inspect',
    params: [{ name: 'v', type: 'any' }],
    return_type: 'string',
    c_name: 'freelang_debug_inspect',
    headers: ['freelang_debug.h'],
    impl: (v: any) => JSON.stringify(v, null, 2),
  },

  debug_stack_trace: {
    name: 'debug_stack_trace',
    params: [],
    return_type: 'string',
    c_name: 'freelang_debug_stack_trace',
    headers: ['freelang_debug.h'],
    impl: () => {
      try {
        return new Error().stack || 'Stack trace unavailable';
      } catch (e) {
        return 'Stack trace error';
      }
    },
  },

  debug_time: {
    name: 'debug_time',
    params: [{ name: 'label', type: 'string' }],
    return_type: 'void',
    c_name: 'freelang_debug_time',
    headers: ['freelang_debug.h'],
    impl: (label: string) => {
      try {
        console.time(label);
      } catch (e) {
        // 무시
      }
    },
  },

  debug_time_end: {
    name: 'debug_time_end',
    params: [{ name: 'label', type: 'string' }],
    return_type: 'void',
    c_name: 'freelang_debug_time_end',
    headers: ['freelang_debug.h'],
    impl: (label: string) => {
      try {
        console.timeEnd(label);
      } catch (e) {
        // 무시
      }
    },
  },

  // 리플렉션 함수 (4개)
  reflect_type_of: {
    name: 'reflect_type_of',
    params: [{ name: 'v', type: 'any' }],
    return_type: 'string',
    c_name: 'freelang_reflect_type_of',
    headers: ['freelang_reflect.h'],
    impl: (v: any) => {
      if (v === null) return 'null';
      if (Array.isArray(v)) return 'array';
      if (v instanceof Map) return 'map';
      if (v instanceof Set) return 'set';
      return typeof v;
    },
  },

  reflect_keys: {
    name: 'reflect_keys',
    params: [{ name: 'obj', type: 'any' }],
    return_type: 'array<string>',
    c_name: 'freelang_reflect_keys',
    headers: ['freelang_reflect.h'],
    impl: (obj: any) => {
      if (obj === null || obj === undefined) return [];
      if (obj instanceof Map) return [...obj.keys()];
      if (obj instanceof Set) return [...obj];
      return Object.keys(obj);
    },
  },

  reflect_values: {
    name: 'reflect_values',
    params: [{ name: 'obj', type: 'any' }],
    return_type: 'array<any>',
    c_name: 'freelang_reflect_values',
    headers: ['freelang_reflect.h'],
    impl: (obj: any) => {
      if (obj === null || obj === undefined) return [];
      if (obj instanceof Map) return [...obj.values()];
      if (obj instanceof Set) return [...obj];
      return Object.values(obj);
    },
  },

  reflect_has: {
    name: 'reflect_has',
    params: [
      { name: 'obj', type: 'any' },
      { name: 'key', type: 'string' },
    ],
    return_type: 'bool',
    c_name: 'freelang_reflect_has',
    headers: ['freelang_reflect.h'],
    impl: (obj: any, key: string) => {
      if (obj === null || obj === undefined) return false;
      if (obj instanceof Map) return obj.has(key);
      if (obj instanceof Set) return obj.has(key);
      return key in obj;
    },
  },

  channel_recv: {
    name: 'channel_recv',
    params: [
      { name: 'channel', type: 'channel' },
      { name: 'timeout', type: 'number' },
    ],
    return_type: 'any',
    c_name: 'freelang_channel_recv',
    headers: ['freelang_ffi.h'],
    impl: async (channel: any, timeout?: number) => {
      if (channel && channel.messages.length > 0) {
        return channel.messages.shift();
      }
      return null;
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // Phase E: Priority 1 함수 (타입변환, 수학, 문자열, 배열)
  // ════════════════════════════════════════════════════════════════════════

  // 타입변환 함수 (5개)
  str: {
    name: 'str',
    params: [{ name: 'value', type: 'any' }],
    return_type: 'string',
    c_name: 'freelang_str',
    headers: ['freelang_stdlib.h'],
    impl: (value: any) => String(value),
  },

  int: {
    name: 'int',
    params: [{ name: 'value', type: 'any' }],
    return_type: 'number',
    c_name: 'freelang_int',
    headers: ['stdlib.h'],
    impl: (value: any) => {
      const num = Number(value);
      return isNaN(num) ? 0 : Math.floor(num);
    },
  },

  float: {
    name: 'float',
    params: [{ name: 'value', type: 'any' }],
    return_type: 'number',
    c_name: 'freelang_float',
    headers: ['stdlib.h'],
    impl: (value: any) => {
      const num = Number(value);
      return isNaN(num) ? 0.0 : num;
    },
  },

  bool: {
    name: 'bool',
    params: [{ name: 'value', type: 'any' }],
    return_type: 'bool',
    c_name: 'freelang_bool',
    headers: ['freelang_stdlib.h'],
    impl: (value: any) => Boolean(value),
  },

  type_of: {
    name: 'type_of',
    params: [{ name: 'value', type: 'any' }],
    return_type: 'string',
    c_name: 'freelang_type_of',
    headers: ['freelang_stdlib.h'],
    impl: (value: any) => {
      if (value === null) return 'null';
      if (Array.isArray(value)) return 'array';
      if (typeof value === 'object') return 'object';
      return typeof value;
    },
  },

  // 추가 수학함수 (5개)
  sin: {
    name: 'sin',
    params: [{ name: 'x', type: 'number' }],
    return_type: 'number',
    c_name: 'sin',
    headers: ['math.h'],
    impl: Math.sin,
  },

  cos: {
    name: 'cos',
    params: [{ name: 'x', type: 'number' }],
    return_type: 'number',
    c_name: 'cos',
    headers: ['math.h'],
    impl: Math.cos,
  },

  pow: {
    name: 'pow',
    params: [
      { name: 'base', type: 'number' },
      { name: 'exp', type: 'number' },
    ],
    return_type: 'number',
    c_name: 'pow',
    headers: ['math.h'],
    impl: Math.pow,
  },

  log: {
    name: 'log',
    params: [{ name: 'x', type: 'number' }],
    return_type: 'number',
    c_name: 'log',
    headers: ['math.h'],
    impl: Math.log,
  },

  random: {
    name: 'random',
    params: [],
    return_type: 'number',
    c_name: 'freelang_random',
    headers: ['stdlib.h'],
    impl: Math.random,
  },

  // 문자열 함수 (10개)
  upper: {
    name: 'upper',
    params: [{ name: 's', type: 'string' }],
    return_type: 'string',
    c_name: 'freelang_upper',
    headers: ['freelang_stdlib.h'],
    impl: (s: string) => s.toUpperCase(),
  },

  lower: {
    name: 'lower',
    params: [{ name: 's', type: 'string' }],
    return_type: 'string',
    c_name: 'freelang_lower',
    headers: ['freelang_stdlib.h'],
    impl: (s: string) => s.toLowerCase(),
  },

  trim: {
    name: 'trim',
    params: [{ name: 's', type: 'string' }],
    return_type: 'string',
    c_name: 'freelang_trim',
    headers: ['freelang_stdlib.h'],
    impl: (s: string) => s.trim(),
  },

  split: {
    name: 'split',
    params: [
      { name: 's', type: 'string' },
      { name: 'delimiter', type: 'string' },
    ],
    return_type: 'array<string>',
    c_name: 'freelang_split',
    headers: ['freelang_stdlib.h'],
    impl: (s: string, delimiter: string) => s.split(delimiter),
  },

  replace: {
    name: 'replace',
    params: [
      { name: 's', type: 'string' },
      { name: 'from', type: 'string' },
      { name: 'to', type: 'string' },
    ],
    return_type: 'string',
    c_name: 'freelang_replace',
    headers: ['freelang_stdlib.h'],
    impl: (s: string, from: string, to: string) => {
      try {
        return s.replace(new RegExp(from, 'g'), to);
      } catch (e) {
        return s.split(from).join(to);
      }
    },
  },

  includes: {
    name: 'includes',
    params: [
      { name: 's', type: 'string' },
      { name: 'substr', type: 'string' },
    ],
    return_type: 'bool',
    c_name: 'freelang_includes',
    headers: ['freelang_stdlib.h'],
    impl: (s: string, substr: string) => s.includes(substr),
  },

  starts_with: {
    name: 'starts_with',
    params: [
      { name: 's', type: 'string' },
      { name: 'prefix', type: 'string' },
    ],
    return_type: 'bool',
    c_name: 'freelang_starts_with',
    headers: ['freelang_stdlib.h'],
    impl: (s: string, prefix: string) => s.startsWith(prefix),
  },

  ends_with: {
    name: 'ends_with',
    params: [
      { name: 's', type: 'string' },
      { name: 'suffix', type: 'string' },
    ],
    return_type: 'bool',
    c_name: 'freelang_ends_with',
    headers: ['freelang_stdlib.h'],
    impl: (s: string, suffix: string) => s.endsWith(suffix),
  },

  str_reverse: {
    name: 'str_reverse',
    params: [{ name: 's', type: 'string' }],
    return_type: 'string',
    c_name: 'freelang_str_reverse',
    headers: ['freelang_stdlib.h'],
    impl: (s: string) => s.split('').reverse().join(''),
  },

  // 배열 함수 (10개)
  arr_map: {
    name: 'arr_map',
    params: [
      { name: 'arr', type: 'array<any>' },
      { name: 'fn', type: 'function' },
    ],
    return_type: 'array<any>',
    c_name: 'freelang_arr_map',
    headers: ['freelang_stdlib.h'],
    impl: (arr: any[], fn: any) => {
      if (!Array.isArray(arr) || typeof fn !== 'function') return [];
      return arr.map(fn);
    },
  },

  arr_filter: {
    name: 'arr_filter',
    params: [
      { name: 'arr', type: 'array<any>' },
      { name: 'fn', type: 'function' },
    ],
    return_type: 'array<any>',
    c_name: 'freelang_arr_filter',
    headers: ['freelang_stdlib.h'],
    impl: (arr: any[], fn: any) => {
      if (!Array.isArray(arr) || typeof fn !== 'function') return [];
      return arr.filter(fn);
    },
  },

  arr_reduce: {
    name: 'arr_reduce',
    params: [
      { name: 'arr', type: 'array<any>' },
      { name: 'fn', type: 'function' },
      { name: 'init', type: 'any' },
    ],
    return_type: 'any',
    c_name: 'freelang_arr_reduce',
    headers: ['freelang_stdlib.h'],
    impl: (arr: any[], fn: any, init: any) => {
      if (!Array.isArray(arr) || typeof fn !== 'function') return init;
      return arr.reduce(fn, init);
    },
  },

  arr_find: {
    name: 'arr_find',
    params: [
      { name: 'arr', type: 'array<any>' },
      { name: 'fn', type: 'function' },
    ],
    return_type: 'any',
    c_name: 'freelang_arr_find',
    headers: ['freelang_stdlib.h'],
    impl: (arr: any[], fn: any) => {
      if (!Array.isArray(arr) || typeof fn !== 'function') return null;
      return arr.find(fn) || null;
    },
  },

  arr_slice: {
    name: 'arr_slice',
    params: [
      { name: 'arr', type: 'array<any>' },
      { name: 'start', type: 'number' },
      { name: 'end', type: 'number' },
    ],
    return_type: 'array<any>',
    c_name: 'freelang_arr_slice',
    headers: ['freelang_stdlib.h'],
    impl: (arr: any[], start: number, end: number) => {
      if (!Array.isArray(arr)) return [];
      return arr.slice(start, end);
    },
  },

  arr_concat: {
    name: 'arr_concat',
    params: [
      { name: 'arr1', type: 'array<any>' },
      { name: 'arr2', type: 'array<any>' },
    ],
    return_type: 'array<any>',
    c_name: 'freelang_arr_concat',
    headers: ['freelang_stdlib.h'],
    impl: (arr1: any[], arr2: any[]) => {
      if (!Array.isArray(arr1)) arr1 = [];
      if (!Array.isArray(arr2)) arr2 = [];
      return arr1.concat(arr2);
    },
  },

  arr_flat: {
    name: 'arr_flat',
    params: [
      { name: 'arr', type: 'array<any>' },
      { name: 'depth', type: 'number' },
    ],
    return_type: 'array<any>',
    c_name: 'freelang_arr_flat',
    headers: ['freelang_stdlib.h'],
    impl: (arr: any[], depth: number) => {
      if (!Array.isArray(arr)) return [];
      return arr.flat(depth || 1);
    },
  },

  arr_unique: {
    name: 'arr_unique',
    params: [{ name: 'arr', type: 'array<any>' }],
    return_type: 'array<any>',
    c_name: 'freelang_arr_unique',
    headers: ['freelang_stdlib.h'],
    impl: (arr: any[]) => {
      if (!Array.isArray(arr)) return [];
      return Array.from(new Set(arr));
    },
  },

  arr_sort: {
    name: 'arr_sort',
    params: [
      { name: 'arr', type: 'array<any>' },
      { name: 'fn', type: 'function' },
    ],
    return_type: 'array<any>',
    c_name: 'freelang_arr_sort',
    headers: ['freelang_stdlib.h'],
    impl: (arr: any[], fn?: any) => {
      if (!Array.isArray(arr)) return [];
      const copy = Array.from(arr);
      if (typeof fn === 'function') {
        return copy.sort(fn);
      }
      return copy.sort((a, b) => {
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
      });
    },
  },

  arr_reverse: {
    name: 'arr_reverse',
    params: [{ name: 'arr', type: 'array<any>' }],
    return_type: 'array<any>',
    c_name: 'freelang_arr_reverse',
    headers: ['freelang_stdlib.h'],
    impl: (arr: any[]) => {
      if (!Array.isArray(arr)) return [];
      return Array.from(arr).reverse();
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // Phase E: Priority 2 함수 (맵, 파일 I/O, OS, 네트워크)
  // ════════════════════════════════════════════════════════════════════════

  // 해시맵 함수 (8개)
  map_new: {
    name: 'map_new',
    params: [],
    return_type: 'object',
    c_name: 'freelang_map_new',
    headers: ['freelang_stdlib.h'],
    impl: () => ({}),
  },

  map_set: {
    name: 'map_set',
    params: [
      { name: 'map', type: 'object' },
      { name: 'key', type: 'string' },
      { name: 'value', type: 'any' },
    ],
    return_type: 'void',
    c_name: 'freelang_map_set',
    headers: ['freelang_stdlib.h'],
    impl: (map: any, key: string, value: any) => {
      if (typeof map === 'object' && map !== null) {
        map[key] = value;
      }
    },
  },

  map_get: {
    name: 'map_get',
    params: [
      { name: 'map', type: 'object' },
      { name: 'key', type: 'string' },
    ],
    return_type: 'any',
    c_name: 'freelang_map_get',
    headers: ['freelang_stdlib.h'],
    impl: (map: any, key: string) => {
      if (typeof map === 'object' && map !== null) {
        return map[key] || null;
      }
      return null;
    },
  },

  map_has: {
    name: 'map_has',
    params: [
      { name: 'map', type: 'object' },
      { name: 'key', type: 'string' },
    ],
    return_type: 'bool',
    c_name: 'freelang_map_has',
    headers: ['freelang_stdlib.h'],
    impl: (map: any, key: string) => {
      if (typeof map === 'object' && map !== null) {
        return key in map;
      }
      return false;
    },
  },

  map_delete: {
    name: 'map_delete',
    params: [
      { name: 'map', type: 'object' },
      { name: 'key', type: 'string' },
    ],
    return_type: 'void',
    c_name: 'freelang_map_delete',
    headers: ['freelang_stdlib.h'],
    impl: (map: any, key: string) => {
      if (typeof map === 'object' && map !== null) {
        delete map[key];
      }
    },
  },

  map_keys: {
    name: 'map_keys',
    params: [{ name: 'map', type: 'object' }],
    return_type: 'array<string>',
    c_name: 'freelang_map_keys',
    headers: ['freelang_stdlib.h'],
    impl: (map: any) => {
      if (typeof map === 'object' && map !== null) {
        return Object.keys(map);
      }
      return [];
    },
  },

  map_values: {
    name: 'map_values',
    params: [{ name: 'map', type: 'object' }],
    return_type: 'array<any>',
    c_name: 'freelang_map_values',
    headers: ['freelang_stdlib.h'],
    impl: (map: any) => {
      if (typeof map === 'object' && map !== null) {
        return Object.values(map);
      }
      return [];
    },
  },

  map_size: {
    name: 'map_size',
    params: [{ name: 'map', type: 'object' }],
    return_type: 'number',
    c_name: 'freelang_map_size',
    headers: ['freelang_stdlib.h'],
    impl: (map: any) => {
      if (typeof map === 'object' && map !== null) {
        return Object.keys(map).length;
      }
      return 0;
    },
  },

  // 파일 I/O 함수 (7개)
  file_read: {
    name: 'file_read',
    params: [{ name: 'path', type: 'string' }],
    return_type: 'string',
    c_name: 'freelang_file_read',
    headers: ['freelang_file.h'],
    impl: (path: string) => {
      try {
        const fs = require('fs');
        return fs.readFileSync(path, 'utf-8');
      } catch (e) {
        return '';
      }
    },
  },

  file_write: {
    name: 'file_write',
    params: [
      { name: 'path', type: 'string' },
      { name: 'content', type: 'string' },
    ],
    return_type: 'bool',
    c_name: 'freelang_file_write',
    headers: ['freelang_file.h'],
    impl: (path: string, content: string) => {
      try {
        const fs = require('fs');
        fs.writeFileSync(path, content, 'utf-8');
        return true;
      } catch (e) {
        return false;
      }
    },
  },

  file_append: {
    name: 'file_append',
    params: [
      { name: 'path', type: 'string' },
      { name: 'content', type: 'string' },
    ],
    return_type: 'bool',
    c_name: 'freelang_file_append',
    headers: ['freelang_file.h'],
    impl: (path: string, content: string) => {
      try {
        const fs = require('fs');
        fs.appendFileSync(path, content, 'utf-8');
        return true;
      } catch (e) {
        return false;
      }
    },
  },

  file_exists: {
    name: 'file_exists',
    params: [{ name: 'path', type: 'string' }],
    return_type: 'bool',
    c_name: 'freelang_file_exists',
    headers: ['freelang_file.h'],
    impl: (path: string) => {
      try {
        const fs = require('fs');
        return fs.existsSync(path);
      } catch (e) {
        return false;
      }
    },
  },

  file_delete: {
    name: 'file_delete',
    params: [{ name: 'path', type: 'string' }],
    return_type: 'bool',
    c_name: 'freelang_file_delete',
    headers: ['freelang_file.h'],
    impl: (path: string) => {
      try {
        const fs = require('fs');
        fs.unlinkSync(path);
        return true;
      } catch (e) {
        return false;
      }
    },
  },

  file_size: {
    name: 'file_size',
    params: [{ name: 'path', type: 'string' }],
    return_type: 'number',
    c_name: 'freelang_file_size',
    headers: ['freelang_file.h'],
    impl: (path: string) => {
      try {
        const fs = require('fs');
        const stats = fs.statSync(path);
        return stats.size;
      } catch (e) {
        return 0;
      }
    },
  },

  file_list: {
    name: 'file_list',
    params: [{ name: 'dirpath', type: 'string' }],
    return_type: 'array<string>',
    c_name: 'freelang_file_list',
    headers: ['freelang_file.h'],
    impl: (dirpath: string) => {
      try {
        const fs = require('fs');
        return fs.readdirSync(dirpath);
      } catch (e) {
        return [];
      }
    },
  },

  // OS/시스템 함수 (6개)
  os_platform: {
    name: 'os_platform',
    params: [],
    return_type: 'string',
    c_name: 'freelang_os_platform',
    headers: ['freelang_os.h'],
    impl: () => {
      const os = require('os');
      return os.platform();
    },
  },

  os_arch: {
    name: 'os_arch',
    params: [],
    return_type: 'string',
    c_name: 'freelang_os_arch',
    headers: ['freelang_os.h'],
    impl: () => {
      const os = require('os');
      return os.arch();
    },
  },

  os_env: {
    name: 'os_env',
    params: [{ name: 'key', type: 'string' }],
    return_type: 'string',
    c_name: 'freelang_os_env',
    headers: ['freelang_os.h'],
    impl: (key: string) => {
      return process.env[key] || '';
    },
  },

  os_time: {
    name: 'os_time',
    params: [],
    return_type: 'number',
    c_name: 'freelang_os_time',
    headers: ['freelang_os.h'],
    impl: () => {
      return Math.floor(Date.now() / 1000);
    },
  },

  os_exit: {
    name: 'os_exit',
    params: [{ name: 'code', type: 'number' }],
    return_type: 'void',
    c_name: 'freelang_os_exit',
    headers: ['stdlib.h'],
    impl: (code: number) => {
      process.exit(code || 0);
    },
  },

  os_exec: {
    name: 'os_exec',
    params: [{ name: 'cmd', type: 'string' }],
    return_type: 'string',
    c_name: 'freelang_os_exec',
    headers: ['freelang_os.h'],
    impl: (cmd: string) => {
      try {
        const { execSync } = require('child_process');
        return execSync(cmd, { encoding: 'utf-8' });
      } catch (e) {
        return '';
      }
    },
  },

  // 네트워크 함수 (2개)
  net_fetch: {
    name: 'net_fetch',
    params: [
      { name: 'url', type: 'string' },
      { name: 'options', type: 'object' },
    ],
    return_type: 'string',
    c_name: 'freelang_net_fetch',
    headers: ['freelang_net.h'],
    impl: async (url: string, options?: any) => {
      try {
        const fetch = require('node-fetch');
        const res = await fetch(url, options || {});
        return await res.text();
      } catch (e) {
        return '';
      }
    },
  },

  net_dns_resolve: {
    name: 'net_dns_resolve',
    params: [{ name: 'hostname', type: 'string' }],
    return_type: 'string',
    c_name: 'freelang_net_dns_resolve',
    headers: ['freelang_net.h'],
    impl: async (hostname: string) => {
      try {
        const dns = require('dns').promises;
        const result = await dns.resolve4(hostname);
        return result[0] || '';
      } catch (e) {
        return '';
      }
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // Phase E: Priority 3 함수 (정규표현식, 날짜, CSV, 고급 기능)
  // ════════════════════════════════════════════════════════════════════════

  // 정규표현식 함수 (3개)
  regex_match: {
    name: 'regex_match',
    params: [
      { name: 'pattern', type: 'string' },
      { name: 'str', type: 'string' },
    ],
    return_type: 'bool',
    c_name: 'freelang_regex_match',
    headers: ['freelang_regex.h'],
    impl: (pattern: string, str: string) => {
      try {
        const re = new RegExp(pattern);
        return re.test(str);
      } catch (e) {
        return false;
      }
    },
  },

  regex_replace: {
    name: 'regex_replace',
    params: [
      { name: 'pattern', type: 'string' },
      { name: 'str', type: 'string' },
      { name: 'replacement', type: 'string' },
    ],
    return_type: 'string',
    c_name: 'freelang_regex_replace',
    headers: ['freelang_regex.h'],
    impl: (pattern: string, str: string, replacement: string) => {
      try {
        const re = new RegExp(pattern, 'g');
        return str.replace(re, replacement);
      } catch (e) {
        return str;
      }
    },
  },

  regex_split: {
    name: 'regex_split',
    params: [
      { name: 'pattern', type: 'string' },
      { name: 'str', type: 'string' },
    ],
    return_type: 'array<string>',
    c_name: 'freelang_regex_split',
    headers: ['freelang_regex.h'],
    impl: (pattern: string, str: string) => {
      try {
        const re = new RegExp(pattern);
        return str.split(re);
      } catch (e) {
        return [str];
      }
    },
  },

  // 날짜/시간 함수 (3개)
  date_now: {
    name: 'date_now',
    params: [],
    return_type: 'number',
    c_name: 'freelang_date_now',
    headers: ['freelang_date.h'],
    impl: () => Date.now(),
  },

  date_format: {
    name: 'date_format',
    params: [
      { name: 'timestamp', type: 'number' },
      { name: 'format', type: 'string' },
    ],
    return_type: 'string',
    c_name: 'freelang_date_format',
    headers: ['freelang_date.h'],
    impl: (timestamp: number, format: string) => {
      try {
        const date = new Date(timestamp);
        // 간단한 포맷팅: YYYY-MM-DD HH:mm:ss
        if (format === 'YYYY-MM-DD') {
          return date.toISOString().split('T')[0];
        }
        if (format === 'HH:mm:ss') {
          return date.toISOString().split('T')[1].split('.')[0];
        }
        return date.toISOString();
      } catch (e) {
        return '';
      }
    },
  },

  date_parse: {
    name: 'date_parse',
    params: [{ name: 'datestr', type: 'string' }],
    return_type: 'number',
    c_name: 'freelang_date_parse',
    headers: ['freelang_date.h'],
    impl: (datestr: string) => {
      try {
        return new Date(datestr).getTime();
      } catch (e) {
        return 0;
      }
    },
  },

  // CSV 함수 (2개)
  csv_parse: {
    name: 'csv_parse',
    params: [{ name: 'csv_string', type: 'string' }],
    return_type: 'array<array<string>>',
    c_name: 'freelang_csv_parse',
    headers: ['freelang_csv.h'],
    impl: (csv_string: string) => {
      try {
        const lines = csv_string.trim().split('\n');
        return lines.map(line =>
          line.split(',').map(cell => cell.trim())
        );
      } catch (e) {
        return [];
      }
    },
  },

  csv_stringify: {
    name: 'csv_stringify',
    params: [{ name: 'data', type: 'array<array<any>>' }],
    return_type: 'string',
    c_name: 'freelang_csv_stringify',
    headers: ['freelang_csv.h'],
    impl: (data: any[][]) => {
      try {
        if (!Array.isArray(data)) return '';
        return data
          .map(row =>
            Array.isArray(row)
              ? row.map(cell => String(cell)).join(',')
              : ''
          )
          .join('\n');
      } catch (e) {
        return '';
      }
    },
  },

  // YAML/XML 함수 (4개)
  yaml_parse: {
    name: 'yaml_parse',
    params: [{ name: 'yaml_string', type: 'string' }],
    return_type: 'object',
    c_name: 'freelang_yaml_parse',
    headers: ['freelang_yaml.h'],
    impl: (yaml_string: string) => {
      try {
        const yaml = require('yaml');
        return yaml.parse(yaml_string);
      } catch (e) {
        return {};
      }
    },
  },

  yaml_stringify: {
    name: 'yaml_stringify',
    params: [{ name: 'obj', type: 'object' }],
    return_type: 'string',
    c_name: 'freelang_yaml_stringify',
    headers: ['freelang_yaml.h'],
    impl: (obj: any) => {
      try {
        const yaml = require('yaml');
        return yaml.stringify(obj);
      } catch (e) {
        return '';
      }
    },
  },

  xml_parse: {
    name: 'xml_parse',
    params: [{ name: 'xml_string', type: 'string' }],
    return_type: 'object',
    c_name: 'freelang_xml_parse',
    headers: ['freelang_xml.h'],
    impl: (xml_string: string) => {
      try {
        const parser = require('xml2js').Parser;
        let result: any;
        new parser().parseString(xml_string, (err: any, res: any) => {
          if (!err) result = res;
        });
        return result || {};
      } catch (e) {
        return {};
      }
    },
  },

  xml_stringify: {
    name: 'xml_stringify',
    params: [{ name: 'obj', type: 'object' }],
    return_type: 'string',
    c_name: 'freelang_xml_stringify',
    headers: ['freelang_xml.h'],
    impl: (obj: any) => {
      try {
        const builder = require('xml2js').Builder;
        return new builder().buildObject(obj);
      } catch (e) {
        return '';
      }
    },
  },

  // 이벤트 함수 (3개)
  event_on: {
    name: 'event_on',
    params: [
      { name: 'emitter', type: 'object' },
      { name: 'event_name', type: 'string' },
      { name: 'callback', type: 'function' },
    ],
    return_type: 'void',
    c_name: 'freelang_event_on',
    headers: ['freelang_events.h'],
    impl: (emitter: any, event_name: string, callback: any) => {
      if (emitter && emitter._events === undefined) {
        emitter._events = {};
      }
      if (!emitter._events[event_name]) {
        emitter._events[event_name] = [];
      }
      emitter._events[event_name].push(callback);
    },
  },

  event_emit: {
    name: 'event_emit',
    params: [
      { name: 'emitter', type: 'object' },
      { name: 'event_name', type: 'string' },
      { name: 'data', type: 'any' },
    ],
    return_type: 'void',
    c_name: 'freelang_event_emit',
    headers: ['freelang_events.h'],
    impl: (emitter: any, event_name: string, data: any) => {
      if (emitter && emitter._events && emitter._events[event_name]) {
        emitter._events[event_name].forEach((cb: any) => {
          try {
            cb(data);
          } catch (e) {
            // Ignore errors
          }
        });
      }
    },
  },

  event_off: {
    name: 'event_off',
    params: [
      { name: 'emitter', type: 'object' },
      { name: 'event_name', type: 'string' },
      { name: 'callback', type: 'function' },
    ],
    return_type: 'void',
    c_name: 'freelang_event_off',
    headers: ['freelang_events.h'],
    impl: (emitter: any, event_name: string, callback: any) => {
      if (emitter && emitter._events && emitter._events[event_name]) {
        emitter._events[event_name] = emitter._events[event_name].filter(
          (cb: any) => cb !== callback
        );
      }
    },
  },

  // 스트림 함수 (3개)
  stream_read: {
    name: 'stream_read',
    params: [
      { name: 'stream', type: 'object' },
      { name: 'size', type: 'number' },
    ],
    return_type: 'string',
    c_name: 'freelang_stream_read',
    headers: ['freelang_stream.h'],
    impl: (stream: any, size: number) => {
      try {
        if (stream && stream.read && typeof stream.read === 'function') {
          const data = stream.read(size);
          return data ? String(data) : '';
        }
      } catch (e) {
        // Ignore
      }
      return '';
    },
  },

  stream_write: {
    name: 'stream_write',
    params: [
      { name: 'stream', type: 'object' },
      { name: 'data', type: 'string' },
    ],
    return_type: 'bool',
    c_name: 'freelang_stream_write',
    headers: ['freelang_stream.h'],
    impl: (stream: any, data: string) => {
      try {
        if (stream && stream.write && typeof stream.write === 'function') {
          return stream.write(data);
        }
      } catch (e) {
        return false;
      }
      return false;
    },
  },

  stream_pipe: {
    name: 'stream_pipe',
    params: [
      { name: 'source', type: 'object' },
      { name: 'dest', type: 'object' },
    ],
    return_type: 'void',
    c_name: 'freelang_stream_pipe',
    headers: ['freelang_stream.h'],
    impl: (source: any, dest: any) => {
      try {
        if (source && source.pipe && typeof source.pipe === 'function') {
          source.pipe(dest);
        }
      } catch (e) {
        // Ignore
      }
    },
  },

  // 추가 고급 함수 (5개)
  tan: {
    name: 'tan',
    params: [{ name: 'x', type: 'number' }],
    return_type: 'number',
    c_name: 'tan',
    headers: ['math.h'],
    impl: Math.tan,
  },

  asin: {
    name: 'asin',
    params: [{ name: 'x', type: 'number' }],
    return_type: 'number',
    c_name: 'asin',
    headers: ['math.h'],
    impl: Math.asin,
  },

  acos: {
    name: 'acos',
    params: [{ name: 'x', type: 'number' }],
    return_type: 'number',
    c_name: 'acos',
    headers: ['math.h'],
    impl: Math.acos,
  },

  atan: {
    name: 'atan',
    params: [{ name: 'x', type: 'number' }],
    return_type: 'number',
    c_name: 'atan',
    headers: ['math.h'],
    impl: Math.atan,
  },

  exp: {
    name: 'exp',
    params: [{ name: 'x', type: 'number' }],
    return_type: 'number',
    c_name: 'exp',
    headers: ['math.h'],
    impl: Math.exp,
  },

  // ────────────────────────────────────────
  // Binary File Operations (Level 7A)
  // ────────────────────────────────────────

  file_write_binary: {
    name: 'file_write_binary',
    params: [
      { name: 'path', type: 'string' },
      { name: 'bytes', type: 'array<number>' },
    ],
    return_type: 'number',
    c_name: 'freelang_file_write_binary',
    headers: ['freelang_file.h'],
    impl: (path: string, bytes: number[]) => {
      try {
        const fs = require('fs');
        const buf = Buffer.from(bytes.map((b: number) => b & 0xFF));
        fs.writeFileSync(path, buf);
        return 1;
      } catch (e) {
        return 0;
      }
    },
  },

  pushBytes: {
    name: 'pushBytes',
    params: [
      { name: 'arr', type: 'array<number>' },
      { name: 'val', type: 'number' },
    ],
    return_type: 'number',
    c_name: 'push_byte',
    headers: ['stdlib.h'],
    impl: (arr: number[], val: number) => {
      if (Array.isArray(arr)) {
        arr.push(val & 0xFF);
        return 1;
      }
      return 0;
    },
  },

  // ────────────────────────────────────────────────────────
  // Phase 6.2: Array operations (new aliases + missing functions)
  // ────────────────────────────────────────────────────────

  array_push: {
    name: 'array_push',
    params: [
      { name: 'arr', type: 'array<any>' },
      { name: 'val', type: 'any' },
    ],
    return_type: 'array<any>',
    c_name: 'freelang_array_push',
    headers: ['freelang_stdlib.h'],
    impl: (arr: any[], val: any) => {
      if (Array.isArray(arr)) {
        arr.push(val);
      }
      return arr;
    },
  },

  array_pop: {
    name: 'array_pop',
    params: [{ name: 'arr', type: 'array<any>' }],
    return_type: 'any',
    c_name: 'freelang_array_pop',
    headers: ['freelang_stdlib.h'],
    impl: (arr: any[]) => {
      if (Array.isArray(arr) && arr.length > 0) {
        return arr.pop();
      }
      return null;
    },
  },

  array_length: {
    name: 'array_length',
    params: [{ name: 'arr', type: 'array<any>' }],
    return_type: 'number',
    c_name: 'freelang_array_length',
    headers: ['freelang_stdlib.h'],
    impl: (arr: any[]) => {
      return Array.isArray(arr) ? arr.length : 0;
    },
  },

  array_shift: {
    name: 'array_shift',
    params: [{ name: 'arr', type: 'array<any>' }],
    return_type: 'any',
    c_name: 'freelang_array_shift',
    headers: ['freelang_stdlib.h'],
    impl: (arr: any[]) => {
      if (Array.isArray(arr) && arr.length > 0) {
        return arr.shift();
      }
      return null;
    },
  },

  array_unshift: {
    name: 'array_unshift',
    params: [
      { name: 'arr', type: 'array<any>' },
      { name: 'val', type: 'any' },
    ],
    return_type: 'array<any>',
    c_name: 'freelang_array_unshift',
    headers: ['freelang_stdlib.h'],
    impl: (arr: any[], val: any) => {
      if (Array.isArray(arr)) {
        arr.unshift(val);
      }
      return arr;
    },
  },

  array_join: {
    name: 'array_join',
    params: [
      { name: 'arr', type: 'array<any>' },
      { name: 'sep', type: 'string' },
    ],
    return_type: 'string',
    c_name: 'freelang_array_join',
    headers: ['freelang_stdlib.h'],
    impl: (arr: any[], sep: string) => {
      if (!Array.isArray(arr)) return '';
      return arr.map(x => String(x)).join(sep || ',');
    },
  },

  // ────────────────────────────────────────────────────────
  // Phase 6.2: String operations (new aliases)
  // ────────────────────────────────────────────────────────

  string_split: {
    name: 'string_split',
    params: [
      { name: 'str', type: 'string' },
      { name: 'sep', type: 'string' },
    ],
    return_type: 'array<string>',
    c_name: 'freelang_string_split',
    headers: ['freelang_stdlib.h'],
    impl: (str: string, sep: string) => {
      if (typeof str !== 'string') return [];
      return str.split(sep || '');
    },
  },

  string_trim: {
    name: 'string_trim',
    params: [{ name: 'str', type: 'string' }],
    return_type: 'string',
    c_name: 'freelang_string_trim',
    headers: ['freelang_stdlib.h'],
    impl: (str: string) => {
      return typeof str === 'string' ? str.trim() : '';
    },
  },

  string_replace: {
    name: 'string_replace',
    params: [
      { name: 'str', type: 'string' },
      { name: 'old', type: 'string' },
      { name: 'new', type: 'string' },
    ],
    return_type: 'string',
    c_name: 'freelang_string_replace',
    headers: ['freelang_stdlib.h'],
    impl: (str: string, old: string, newStr: string) => {
      if (typeof str !== 'string') return '';
      return str.replace(new RegExp(String(old).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(newStr));
    },
  },

  string_contains: {
    name: 'string_contains',
    params: [
      { name: 'str', type: 'string' },
      { name: 'substr', type: 'string' },
    ],
    return_type: 'boolean',
    c_name: 'freelang_string_contains',
    headers: ['freelang_stdlib.h'],
    impl: (str: string, substr: string) => {
      if (typeof str !== 'string') return false;
      return str.includes(String(substr));
    },
  },

  to_string: {
    name: 'to_string',
    params: [{ name: 'val', type: 'any' }],
    return_type: 'string',
    c_name: 'freelang_to_string',
    headers: ['freelang_stdlib.h'],
    impl: (val: any) => {
      return String(val);
    },
  },

  to_number: {
    name: 'to_number',
    params: [{ name: 'str', type: 'string' }],
    return_type: 'number',
    c_name: 'freelang_to_number',
    headers: ['freelang_stdlib.h'],
    impl: (str: string) => {
      const n = parseFloat(String(str));
      return isNaN(n) ? 0 : n;
    },
  },

  // ────────────────────────────────────────────────────────
  // Phase 6.2: Type checking functions
  // ────────────────────────────────────────────────────────

  is_null: {
    name: 'is_null',
    params: [{ name: 'val', type: 'any' }],
    return_type: 'boolean',
    c_name: 'freelang_is_null',
    headers: ['freelang_stdlib.h'],
    impl: (val: any) => {
      return val === null || val === undefined;
    },
  },

  is_array: {
    name: 'is_array',
    params: [{ name: 'val', type: 'any' }],
    return_type: 'boolean',
    c_name: 'freelang_is_array',
    headers: ['freelang_stdlib.h'],
    impl: (val: any) => {
      return Array.isArray(val);
    },
  },

  is_map: {
    name: 'is_map',
    params: [{ name: 'val', type: 'any' }],
    return_type: 'boolean',
    c_name: 'freelang_is_map',
    headers: ['freelang_stdlib.h'],
    impl: (val: any) => {
      return val !== null && typeof val === 'object' && !Array.isArray(val);
    },
  },

  is_string: {
    name: 'is_string',
    params: [{ name: 'val', type: 'any' }],
    return_type: 'boolean',
    c_name: 'freelang_is_string',
    headers: ['freelang_stdlib.h'],
    impl: (val: any) => {
      return typeof val === 'string';
    },
  },

  is_number: {
    name: 'is_number',
    params: [{ name: 'val', type: 'any' }],
    return_type: 'boolean',
    c_name: 'freelang_is_number',
    headers: ['freelang_stdlib.h'],
    impl: (val: any) => {
      return typeof val === 'number';
    },
  },

  is_bool: {
    name: 'is_bool',
    params: [{ name: 'val', type: 'any' }],
    return_type: 'boolean',
    c_name: 'freelang_is_bool',
    headers: ['freelang_stdlib.h'],
    impl: (val: any) => {
      return typeof val === 'boolean';
    },
  },
};

// ────────────────────────────────────────
// TypeChecker용: 타입 정보 추출
// ────────────────────────────────────────

export function getBuiltinType(name: string): {
  params: BuiltinParam[];
  return_type: string;
} | null {
  const spec = BUILTINS[name];
  if (!spec) return null;
  return {
    params: spec.params,
    return_type: spec.return_type,
  };
}

// ────────────────────────────────────────
// Interpreter용: 함수 구현 가져오기
// ────────────────────────────────────────

export function getBuiltinImpl(name: string): Function | null {
  const spec = BUILTINS[name];
  return spec?.impl || null;
}

// ────────────────────────────────────────
// CodeGen용: C 함수 정보 가져오기
// ────────────────────────────────────────

export function getBuiltinC(name: string): {
  c_name: string;
  headers: string[];
} | null {
  const spec = BUILTINS[name];
  if (!spec) return null;
  return {
    c_name: spec.c_name,
    headers: spec.headers,
  };
}

// ────────────────────────────────────────
// 유틸: 사용 가능한 builtin 목록
// ────────────────────────────────────────

export function getBuiltinNames(): string[] {
  return Object.keys(BUILTINS);
}

export function isBuiltin(name: string): boolean {
  return name in BUILTINS;
}

// ────────────────────────────────────────
// 검증: 모든 builtin이 3곳 다 채워졌는지
// ────────────────────────────────────────

export function validateBuiltins(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [name, spec] of Object.entries(BUILTINS)) {
    // c_name 확인
    if (!spec.c_name) {
      errors.push(`${name}: missing c_name`);
    }
    // headers 확인
    if (!Array.isArray(spec.headers)) {
      errors.push(`${name}: headers not array`);
    }
    // impl 확인 (println 제외 - stub)
    if (name !== 'println' && !spec.impl) {
      errors.push(`${name}: missing impl`);
    }
    // return_type 확인
    if (!spec.return_type) {
      errors.push(`${name}: missing return_type`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
