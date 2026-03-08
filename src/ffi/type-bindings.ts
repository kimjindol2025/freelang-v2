/**
 * FreeLang FFI Type Bindings
 * C 타입과 FreeLang 타입의 매핑
 */

/**
 * C 타입 정의
 */
export interface CTypeDefinition {
  cType: string;           // C 타입 이름 (예: "nghttp2_session*")
  size: number | string;   // 크기 (바이트 또는 "ptr")
  codeSize: number;        // WASM 코드 크기
  alignment: number;       // 메모리 정렬
  category: 'primitive' | 'struct' | 'pointer' | 'opaque';
}

/**
 * FreeLang 타입 정의
 */
export interface FLTypeDefinition {
  name: string;            // FreeLang 타입 이름
  jsType: string;          // JavaScript 호환 타입
  cType: string;           // 해당 C 타입
  converter?: {
    toC: string;           // FreeLang → C 변환 함수
    toFL: string;          // C → FreeLang 변환 함수
  };
}

/**
 * FFI 타입 바인딩 맵
 *
 * 원시 타입: C ← → FreeLang
 */
export const TYPE_BINDINGS: Record<string, CTypeDefinition> = {
  // 포인터 타입 (opaque 처리)
  'fl_stream_t': {
    cType: 'opaque pointer',
    size: 'ptr',
    codeSize: 8,
    alignment: 8,
    category: 'pointer'
  },
  'fl_ws_socket_t': {
    cType: 'opaque pointer',
    size: 'ptr',
    codeSize: 8,
    alignment: 8,
    category: 'pointer'
  },
  'fl_ws_frame_t': {
    cType: 'opaque pointer',
    size: 'ptr',
    codeSize: 8,
    alignment: 8,
    category: 'pointer'
  },
  'fl_http2_server_t': {
    cType: 'opaque pointer',
    size: 'ptr',
    codeSize: 8,
    alignment: 8,
    category: 'pointer'
  },
  'fl_http2_session_t': {
    cType: 'opaque pointer',
    size: 'ptr',
    codeSize: 8,
    alignment: 8,
    category: 'pointer'
  },
  'fl_timer_t': {
    cType: 'opaque pointer',
    size: 'ptr',
    codeSize: 8,
    alignment: 8,
    category: 'pointer'
  },
  'nghttp2_session': {
    cType: 'nghttp2_session*',
    size: 'ptr',
    codeSize: 8,
    alignment: 8,
    category: 'pointer'
  },

  // 원시 정수 타입
  'int': {
    cType: 'int',
    size: 4,
    codeSize: 4,
    alignment: 4,
    category: 'primitive'
  },
  'size_t': {
    cType: 'size_t',
    size: 8,
    codeSize: 8,
    alignment: 8,
    category: 'primitive'
  },
  'uint8_t': {
    cType: 'uint8_t',
    size: 1,
    codeSize: 1,
    alignment: 1,
    category: 'primitive'
  },
  'uint16_t': {
    cType: 'uint16_t',
    size: 2,
    codeSize: 2,
    alignment: 2,
    category: 'primitive'
  },
  'uint32_t': {
    cType: 'uint32_t',
    size: 4,
    codeSize: 4,
    alignment: 4,
    category: 'primitive'
  },
  'uint64_t': {
    cType: 'uint64_t',
    size: 8,
    codeSize: 8,
    alignment: 8,
    category: 'primitive'
  },

  // 문자열 타입
  'char*': {
    cType: 'char*',
    size: 'ptr',
    codeSize: 8,
    alignment: 8,
    category: 'pointer'
  },

  // 콜백 함수 포인터
  'callback_t': {
    cType: 'void (*)(void*)',
    size: 'ptr',
    codeSize: 8,
    alignment: 8,
    category: 'pointer'
  }
};

/**
 * FreeLang ↔ C 타입 변환 맵
 */
export const FREELANG_TYPE_MAP: Record<string, FLTypeDefinition> = {
  // Stream
  'stream': {
    name: 'stream',
    jsType: 'number',
    cType: 'fl_stream_t*',
    converter: {
      toC: 'Number.isInteger(v) ? v : 0',
      toFL: 'handle as number'
    }
  },

  // WebSocket
  'websocket': {
    name: 'websocket',
    jsType: 'number',
    cType: 'fl_ws_socket_t*',
    converter: {
      toC: 'Number.isInteger(v) ? v : 0',
      toFL: 'handle as number'
    }
  },
  'ws_frame': {
    name: 'ws_frame',
    jsType: 'object',
    cType: 'fl_ws_frame_t*',
    converter: {
      toC: 'JSON.stringify(v)',
      toFL: 'JSON.parse(data)'
    }
  },

  // HTTP/2
  'http2_server': {
    name: 'http2_server',
    jsType: 'number',
    cType: 'fl_http2_server_t*',
    converter: {
      toC: 'Number.isInteger(v) ? v : 0',
      toFL: 'handle as number'
    }
  },

  // Timer
  'timer': {
    name: 'timer',
    jsType: 'number',
    cType: 'fl_timer_t*',
    converter: {
      toC: 'Number.isInteger(v) ? v : 0',
      toFL: 'handle as number'
    }
  },

  // 기본 타입
  'string': {
    name: 'string',
    jsType: 'string',
    cType: 'char*'
  },
  'number': {
    name: 'number',
    jsType: 'number',
    cType: 'int'
  },
  'boolean': {
    name: 'boolean',
    jsType: 'boolean',
    cType: 'int'
  }
};

/**
 * 함수 시그니처 정의
 */
export interface FFIFunctionSignature {
  name: string;
  returnType: string;
  parameters: Array<{
    name: string;
    type: string;
  }>;
  category: 'stream' | 'ws' | 'http' | 'http2' | 'timer' | 'event' | 'visualization' | 'system' | 'memory' | 'io';
}

/**
 * 모든 FFI 함수 시그니처
 */
export const FFI_SIGNATURES: Record<string, FFIFunctionSignature> = {
  // Stream 함수
  'fl_stream_readable_create': {
    name: 'fl_stream_readable_create',
    returnType: 'fl_stream_t*',
    parameters: [],
    category: 'stream'
  },
  'fl_stream_writable_write': {
    name: 'fl_stream_writable_write',
    returnType: 'int',
    parameters: [
      { name: 'stream', type: 'fl_stream_t*' },
      { name: 'data', type: 'char*' },
      { name: 'len', type: 'size_t' }
    ],
    category: 'stream'
  },
  'fl_stream_on_data': {
    name: 'fl_stream_on_data',
    returnType: 'int',
    parameters: [
      { name: 'stream', type: 'fl_stream_t*' },
      { name: 'callback', type: 'callback_t' }
    ],
    category: 'stream'
  },

  // WebSocket 함수
  'fl_ws_server_create': {
    name: 'fl_ws_server_create',
    returnType: 'fl_ws_socket_t*',
    parameters: [
      { name: 'port', type: 'int' },
      { name: 'callback', type: 'callback_t' }
    ],
    category: 'ws'
  },
  'fl_ws_client_connect': {
    name: 'fl_ws_client_connect',
    returnType: 'fl_ws_socket_t*',
    parameters: [
      { name: 'url', type: 'char*' },
      { name: 'callback', type: 'callback_t' }
    ],
    category: 'ws'
  },
  'fl_ws_send': {
    name: 'fl_ws_send',
    returnType: 'int',
    parameters: [
      { name: 'socket', type: 'fl_ws_socket_t*' },
      { name: 'message', type: 'char*' }
    ],
    category: 'ws'
  },
  'fl_ws_on_message': {
    name: 'fl_ws_on_message',
    returnType: 'int',
    parameters: [
      { name: 'socket', type: 'fl_ws_socket_t*' },
      { name: 'callback', type: 'callback_t' }
    ],
    category: 'ws'
  },
  'fl_ws_close': {
    name: 'fl_ws_close',
    returnType: 'int',
    parameters: [
      { name: 'socket', type: 'fl_ws_socket_t*' }
    ],
    category: 'ws'
  },

  // HTTP/2 함수
  'fl_http2_server_create': {
    name: 'fl_http2_server_create',
    returnType: 'fl_http2_server_t*',
    parameters: [
      { name: 'port', type: 'int' },
      { name: 'callback', type: 'callback_t' }
    ],
    category: 'http2'
  },
  'fl_http2_session_new': {
    name: 'fl_http2_session_new',
    returnType: 'fl_http2_session_t*',
    parameters: [],
    category: 'http2'
  },

  // Timer 함수
  'fl_timer_create': {
    name: 'fl_timer_create',
    returnType: 'fl_timer_t*',
    parameters: [
      { name: 'interval_ms', type: 'uint32_t' }
    ],
    category: 'timer'
  },
  'fl_timer_start': {
    name: 'fl_timer_start',
    returnType: 'int',
    parameters: [
      { name: 'timer', type: 'fl_timer_t*' }
    ],
    category: 'timer'
  },
  'fl_timer_stop': {
    name: 'fl_timer_stop',
    returnType: 'int',
    parameters: [
      { name: 'timer', type: 'fl_timer_t*' }
    ],
    category: 'timer'
  }
};

/**
 * 타입 크기 조회 함수
 */
export function getTypeSize(type: string): number | 'ptr' {
  const binding = TYPE_BINDINGS[type];
  return binding ? (binding.size as number | 'ptr') : 'ptr';
}

/**
 * C 타입 → FreeLang 변환
 */
export function cTypeToFreeLang(cType: string): string {
  const entry = Object.entries(FREELANG_TYPE_MAP).find(
    ([_, def]) => def.cType === cType
  );
  return entry ? entry[0] : 'unknown';
}

/**
 * FreeLang 타입 → C 변환
 */
export function flTypeToCType(flType: string): string {
  const def = FREELANG_TYPE_MAP[flType];
  return def ? def.cType : 'void*';
}
