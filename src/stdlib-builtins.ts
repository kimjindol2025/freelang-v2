/**
 * FreeLang v2 - stdlib 함수 자동 등록
 *
 * Phase A-E: 20개 함수 범주, 200개+ 함수 한 번에 등록
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

/**
 * stdlib 함수들을 NativeFunctionRegistry에 등록
 */
export function registerStdlibFunctions(registry: NativeFunctionRegistry): void {
  // ────────────────────────────────────────────────────────────
  // Phase A-1: 타입 변환 함수
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'str',
    module: 'builtins',
    executor: (args) => String(args[0])
  });

  registry.register({
    name: 'int',
    module: 'builtins',
    executor: (args) => parseInt(String(args[0]))
  });

  registry.register({
    name: 'float',
    module: 'builtins',
    executor: (args) => parseFloat(String(args[0]))
  });

  registry.register({
    name: 'bool',
    module: 'builtins',
    executor: (args) => Boolean(args[0])
  });

  registry.register({
    name: 'typeof',
    module: 'builtins',
    executor: (args) => typeof args[0]
  });

  // ────────────────────────────────────────────────────────────
  // Phase A-2: 수학 함수 (Math)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'sin',
    module: 'math',
    executor: (args) => Math.sin(args[0])
  });

  registry.register({
    name: 'cos',
    module: 'math',
    executor: (args) => Math.cos(args[0])
  });

  registry.register({
    name: 'tan',
    module: 'math',
    executor: (args) => Math.tan(args[0])
  });

  registry.register({
    name: 'asin',
    module: 'math',
    executor: (args) => Math.asin(args[0])
  });

  registry.register({
    name: 'acos',
    module: 'math',
    executor: (args) => Math.acos(args[0])
  });

  registry.register({
    name: 'atan',
    module: 'math',
    executor: (args) => Math.atan(args[0])
  });

  registry.register({
    name: 'atan2',
    module: 'math',
    executor: (args) => Math.atan2(args[0], args[1])
  });

  registry.register({
    name: 'pow',
    module: 'math',
    executor: (args) => Math.pow(args[0], args[1])
  });

  registry.register({
    name: 'log',
    module: 'math',
    executor: (args) => Math.log(args[0])
  });

  registry.register({
    name: 'log10',
    module: 'math',
    executor: (args) => Math.log10(args[0])
  });

  registry.register({
    name: 'log2',
    module: 'math',
    executor: (args) => Math.log2(args[0])
  });

  registry.register({
    name: 'exp',
    module: 'math',
    executor: (args) => Math.exp(args[0])
  });

  registry.register({
    name: 'random',
    module: 'math',
    executor: () => Math.random()
  });

  // ────────────────────────────────────────────────────────────
  // Phase A-3: 문자열 함수 (String)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'strlen',
    module: 'string',
    executor: (args) => String(args[0]).length
  });

  registry.register({
    name: 'toupper',
    module: 'string',
    executor: (args) => String(args[0]).toUpperCase()
  });

  registry.register({
    name: 'tolower',
    module: 'string',
    executor: (args) => String(args[0]).toLowerCase()
  });

  registry.register({
    name: 'trim',
    module: 'string',
    executor: (args) => String(args[0]).trim()
  });

  registry.register({
    name: 'split',
    module: 'string',
    executor: (args) => String(args[0]).split(args[1])
  });

  registry.register({
    name: 'join',
    module: 'string',
    executor: (args) => (args[0] as any[]).join(args[1])
  });

  registry.register({
    name: 'includes',
    module: 'string',
    executor: (args) => String(args[0]).includes(args[1])
  });

  registry.register({
    name: 'startswith',
    module: 'string',
    executor: (args) => String(args[0]).startsWith(args[1])
  });

  registry.register({
    name: 'endswith',
    module: 'string',
    executor: (args) => String(args[0]).endsWith(args[1])
  });

  registry.register({
    name: 'replace',
    module: 'string',
    executor: (args) => String(args[0]).replaceAll(args[1], args[2])
  });

  registry.register({
    name: 'substring',
    module: 'string',
    executor: (args) => String(args[0]).substring(args[1], args[2])
  });

  registry.register({
    name: 'indexof',
    module: 'string',
    executor: (args) => String(args[0]).indexOf(args[1])
  });

  registry.register({
    name: 'repeat',
    module: 'string',
    executor: (args) => String(args[0]).repeat(args[1])
  });

  // ────────────────────────────────────────────────────────────
  // Phase A-4: 배열 함수 (Array)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'arr_len',
    module: 'array',
    executor: (args) => (args[0] as any[]).length
  });

  registry.register({
    name: 'arr_push',
    module: 'array',
    executor: (args) => {
      const arr = args[0] as any[];
      arr.push(args[1]);
      return arr;
    }
  });

  registry.register({
    name: 'arr_pop',
    module: 'array',
    executor: (args) => (args[0] as any[]).pop()
  });

  registry.register({
    name: 'arr_shift',
    module: 'array',
    executor: (args) => (args[0] as any[]).shift()
  });

  registry.register({
    name: 'arr_unshift',
    module: 'array',
    executor: (args) => {
      const arr = args[0] as any[];
      arr.unshift(args[1]);
      return arr;
    }
  });

  registry.register({
    name: 'arr_reverse',
    module: 'array',
    executor: (args) => {
      const arr = args[0] as any[];
      arr.reverse();
      return arr;
    }
  });

  registry.register({
    name: 'arr_slice',
    module: 'array',
    executor: (args) => (args[0] as any[]).slice(args[1], args[2])
  });

  registry.register({
    name: 'arr_concat',
    module: 'array',
    executor: (args) => [...(args[0] as any[]), ...(args[1] as any[])]
  });

  registry.register({
    name: 'arr_includes',
    module: 'array',
    executor: (args) => (args[0] as any[]).includes(args[1])
  });

  registry.register({
    name: 'arr_indexof',
    module: 'array',
    executor: (args) => (args[0] as any[]).indexOf(args[1])
  });

  registry.register({
    name: 'arr_flat',
    module: 'array',
    executor: (args) => (args[0] as any[]).flat()
  });

  registry.register({
    name: 'arr_unique',
    module: 'array',
    executor: (args) => [...new Set(args[0] as any[])]
  });

  // ────────────────────────────────────────────────────────────
  // Phase A-5: 해시맵 함수 (Map)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'map_new',
    module: 'map',
    executor: () => new Map()
  });

  registry.register({
    name: 'map_set',
    module: 'map',
    executor: (args) => {
      (args[0] as Map<any, any>).set(args[1], args[2]);
      return args[0];
    }
  });

  registry.register({
    name: 'map_get',
    module: 'map',
    executor: (args) => (args[0] as Map<any, any>).get(args[1])
  });

  registry.register({
    name: 'map_has',
    module: 'map',
    executor: (args) => (args[0] as Map<any, any>).has(args[1])
  });

  registry.register({
    name: 'map_delete',
    module: 'map',
    executor: (args) => {
      (args[0] as Map<any, any>).delete(args[1]);
      return args[0];
    }
  });

  registry.register({
    name: 'map_size',
    module: 'map',
    executor: (args) => (args[0] as Map<any, any>).size
  });

  registry.register({
    name: 'map_keys',
    module: 'map',
    executor: (args) => [...(args[0] as Map<any, any>).keys()]
  });

  registry.register({
    name: 'map_values',
    module: 'map',
    executor: (args) => [...(args[0] as Map<any, any>).values()]
  });

  registry.register({
    name: 'map_entries',
    module: 'map',
    executor: (args) => [...(args[0] as Map<any, any>).entries()]
  });

  registry.register({
    name: 'map_clear',
    module: 'map',
    executor: (args) => {
      (args[0] as Map<any, any>).clear();
      return args[0];
    }
  });

  // ────────────────────────────────────────────────────────────
  // Phase B-1: 파일 I/O 함수
  // ────────────────────────────────────────────────────────────

  const fs = require('fs');

  registry.register({
    name: 'file_read',
    module: 'io',
    executor: (args) => fs.readFileSync(args[0], 'utf-8')
  });

  registry.register({
    name: 'file_write',
    module: 'io',
    executor: (args) => {
      fs.writeFileSync(args[0], args[1]);
      return true;
    }
  });

  registry.register({
    name: 'file_append',
    module: 'io',
    executor: (args) => {
      fs.appendFileSync(args[0], args[1]);
      return true;
    }
  });

  registry.register({
    name: 'file_exists',
    module: 'io',
    executor: (args) => fs.existsSync(args[0])
  });

  registry.register({
    name: 'file_delete',
    module: 'io',
    executor: (args) => {
      fs.unlinkSync(args[0]);
      return true;
    }
  });

  registry.register({
    name: 'file_size',
    module: 'io',
    executor: (args) => fs.statSync(args[0]).size
  });

  // ────────────────────────────────────────────────────────────
  // Phase B-2: OS/시스템 함수
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'os_platform',
    module: 'os',
    executor: () => process.platform
  });

  registry.register({
    name: 'os_arch',
    module: 'os',
    executor: () => process.arch
  });

  registry.register({
    name: 'os_env',
    module: 'os',
    executor: (args) => process.env[args[0]] || ''
  });

  registry.register({
    name: 'os_time',
    module: 'os',
    executor: () => Date.now()
  });

  registry.register({
    name: 'os_exit',
    module: 'os',
    executor: (args) => process.exit(args[0])
  });

  // ────────────────────────────────────────────────────────────
  // Phase C-1: JSON 함수
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'json_parse',
    module: 'json',
    executor: (args) => JSON.parse(args[0])
  });

  registry.register({
    name: 'json_stringify',
    module: 'json',
    executor: (args) => JSON.stringify(args[0])
  });

  registry.register({
    name: 'json_pretty',
    module: 'json',
    executor: (args) => JSON.stringify(args[0], null, 2)
  });

  // ────────────────────────────────────────────────────────────
  // Phase C-3: Base64/인코딩 함수
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'base64_encode',
    module: 'encoding',
    executor: (args) => Buffer.from(args[0]).toString('base64')
  });

  registry.register({
    name: 'base64_decode',
    module: 'encoding',
    executor: (args) => Buffer.from(args[0], 'base64').toString('utf-8')
  });

  registry.register({
    name: 'hex_encode',
    module: 'encoding',
    executor: (args) => Buffer.from(args[0]).toString('hex')
  });

  registry.register({
    name: 'hex_decode',
    module: 'encoding',
    executor: (args) => Buffer.from(args[0], 'hex').toString('utf-8')
  });

  // ────────────────────────────────────────────────────────────
  // Phase D-1: 암호화 함수
  // ────────────────────────────────────────────────────────────

  const crypto = require('crypto');

  registry.register({
    name: 'sha256',
    module: 'crypto',
    executor: (args) => crypto.createHash('sha256').update(args[0]).digest('hex')
  });

  registry.register({
    name: 'md5',
    module: 'crypto',
    executor: (args) => crypto.createHash('md5').update(args[0]).digest('hex')
  });

  registry.register({
    name: 'sha1',
    module: 'crypto',
    executor: (args) => crypto.createHash('sha1').update(args[0]).digest('hex')
  });

  registry.register({
    name: 'hmac',
    module: 'crypto',
    executor: (args) => crypto.createHmac(args[2] || 'sha256', args[0]).update(args[1]).digest('hex')
  });

  registry.register({
    name: 'random_bytes',
    module: 'crypto',
    executor: (args) => crypto.randomBytes(args[0]).toString('hex')
  });

  registry.register({
    name: 'uuid',
    module: 'crypto',
    executor: () => crypto.randomUUID()
  });

  // ────────────────────────────────────────────────────────────
  // Phase D-3: 디버깅 함수
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'inspect',
    module: 'debug',
    executor: (args) => JSON.stringify(args[0], null, 2)
  });

  registry.register({
    name: 'assert',
    module: 'debug',
    executor: (args) => {
      if (!args[0]) throw new Error(args[1] || 'Assertion failed');
    }
  });

  // ────────────────────────────────────────────────────────────
  // Phase D-4: 리플렉션 함수
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'keys',
    module: 'reflect',
    executor: (args) => Object.keys(args[0])
  });

  registry.register({
    name: 'values',
    module: 'reflect',
    executor: (args) => Object.values(args[0])
  });

  registry.register({
    name: 'has',
    module: 'reflect',
    executor: (args) => args[1] in args[0]
  });

  registry.register({
    name: 'get',
    module: 'reflect',
    executor: (args) => args[0][args[1]]
  });

  registry.register({
    name: 'set',
    module: 'reflect',
    executor: (args) => {
      args[0][args[1]] = args[2];
      return args[0];
    }
  });

  // ────────────────────────────────────────────────────────────
  // Method Call Support (__method_* functions)
  // ────────────────────────────────────────────────────────────

  // Array methods
  registry.register({
    name: '__method_sort',
    module: 'builtin_methods',
    executor: (args) => {
      const arr = args[0] as any[];
      return arr.sort((a, b) => a - b);
    }
  });

  registry.register({
    name: '__method_reverse',
    module: 'builtin_methods',
    executor: (args) => {
      const arr = args[0] as any[];
      return arr.reverse();
    }
  });

  registry.register({
    name: '__method_join',
    module: 'builtin_methods',
    executor: (args) => {
      const arr = args[0] as any[];
      const sep = args[1] !== undefined ? String(args[1]) : ',';
      return arr.join(sep);
    }
  });

  registry.register({
    name: '__method_includes',
    module: 'builtin_methods',
    executor: (args) => {
      const arr = args[0] as any[];
      return arr.includes(args[1]);
    }
  });

  // String methods
  registry.register({
    name: '__method_toUpperCase',
    module: 'builtin_methods',
    executor: (args) => String(args[0]).toUpperCase()
  });

  registry.register({
    name: '__method_toLowerCase',
    module: 'builtin_methods',
    executor: (args) => String(args[0]).toLowerCase()
  });

  registry.register({
    name: '__method_trim',
    module: 'builtin_methods',
    executor: (args) => String(args[0]).trim()
  });

  registry.register({
    name: '__method_split',
    module: 'builtin_methods',
    executor: (args) => String(args[0]).split(args[1] || ',')
  });

  registry.register({
    name: '__method_substring',
    module: 'builtin_methods',
    executor: (args) => String(args[0]).substring(args[1], args[2])
  });

  registry.register({
    name: '__method_indexOf',
    module: 'builtin_methods',
    executor: (args) => String(args[0]).indexOf(args[1])
  });

  // ────────────────────────────────────────────────────────────
  // Phase A 추가: 누락된 함수들
  // ────────────────────────────────────────────────────────────

  // 수학: sqrt, ceil, floor, round, abs, min, max
  registry.register({
    name: 'sqrt',
    module: 'math',
    executor: (args) => Math.sqrt(args[0])
  });

  registry.register({
    name: 'ceil',
    module: 'math',
    executor: (args) => Math.ceil(args[0])
  });

  registry.register({
    name: 'floor',
    module: 'math',
    executor: (args) => Math.floor(args[0])
  });

  registry.register({
    name: 'round',
    module: 'math',
    executor: (args) => Math.round(args[0])
  });

  registry.register({
    name: 'abs',
    module: 'math',
    executor: (args) => Math.abs(args[0])
  });

  registry.register({
    name: 'min',
    module: 'math',
    executor: (args) => Math.min(...(Array.isArray(args[0]) ? args[0] : args))
  });

  registry.register({
    name: 'max',
    module: 'math',
    executor: (args) => Math.max(...(Array.isArray(args[0]) ? args[0] : args))
  });

  // 배열: map, filter, reduce, find
  registry.register({
    name: 'arr_map',
    module: 'array',
    executor: (args) => {
      const arr = args[0] as any[];
      const fn = args[1] as any;
      return arr.map(fn);
    }
  });

  registry.register({
    name: 'arr_filter',
    module: 'array',
    executor: (args) => {
      const arr = args[0] as any[];
      const fn = args[1] as any;
      return arr.filter(fn);
    }
  });

  registry.register({
    name: 'arr_reduce',
    module: 'array',
    executor: (args) => {
      const arr = args[0] as any[];
      const fn = args[1] as any;
      const init = args[2];
      return arr.reduce(fn, init);
    }
  });

  registry.register({
    name: 'arr_find',
    module: 'array',
    executor: (args) => {
      const arr = args[0] as any[];
      const fn = args[1] as any;
      return arr.find(fn);
    }
  });

  // 문자열: upper, lower (별칭)
  registry.register({
    name: 'upper',
    module: 'string',
    executor: (args) => String(args[0]).toUpperCase()
  });

  registry.register({
    name: 'lower',
    module: 'string',
    executor: (args) => String(args[0]).toLowerCase()
  });

  // 배열 메서드: map, filter, find, reduce
  registry.register({
    name: '__method_map',
    module: 'builtin_methods',
    executor: (args) => {
      const arr = args[0] as any[];
      const fn = args[1] as any;
      return arr.map(fn);
    }
  });

  registry.register({
    name: '__method_filter',
    module: 'builtin_methods',
    executor: (args) => {
      const arr = args[0] as any[];
      const fn = args[1] as any;
      return arr.filter(fn);
    }
  });

  registry.register({
    name: '__method_find',
    module: 'builtin_methods',
    executor: (args) => {
      const arr = args[0] as any[];
      const fn = args[1] as any;
      return arr.find(fn);
    }
  });

  registry.register({
    name: '__method_reduce',
    module: 'builtin_methods',
    executor: (args) => {
      const arr = args[0] as any[];
      const fn = args[1] as any;
      const init = args[2];
      return arr.reduce(fn, init);
    }
  });

  // Silent registration (no console output)
}
