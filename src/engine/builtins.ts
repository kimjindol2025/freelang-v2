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
