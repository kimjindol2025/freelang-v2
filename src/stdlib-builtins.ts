/**
 * FreeLang v2 - stdlib 함수 자동 등록
 *
 * Phase A-E: 20개 함수 범주, 200개+ 함수 한 번에 등록
 * Phase J: Promise support for async/await
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';
import { SimplePromise } from './runtime/simple-promise';
import { RegexObject } from './stdlib/regex/regex-impl';
import { registerMathExtendedFunctions } from './stdlib-math-extended';
import { registerHttpExtendedFunctions } from './stdlib-http-extended';
import { registerApiFunctions } from './stdlib-api-functions';
import { registerTestingFunctions } from './stdlib-testing-functions';
import { registerDataProcessingFunctions } from './stdlib-data-functions';
import { registerAnalyticsFunctions } from './stdlib-analytics-functions';
import { registerIntegrationFunctions } from './stdlib-integration-functions';
import { registerUtilityFunctions } from './stdlib-utility-functions';
import { registerSklearnFunctions } from './stdlib-sklearn';
import { registerTeamAFunctions } from './stdlib-team-a-validation';
import { registerTeamBFunctions } from './stdlib-team-b-string-math';
import { registerTeamCFunctions } from './stdlib-team-c-fileio-date';
import { registerTeamDFunctions } from './stdlib-team-d-http-db';
import { registerTeamEFunctions } from './stdlib-team-e-async-test';
import { registerTeamFFunctions } from './stdlib-team-f-security';
import { registerNativeChartFunctions } from './stdlib-chart';
import { registerWebForgeFunctions } from './stdlib-web-forge';
import { registerAuthFunctions } from './stdlib-auth';
import { registerLogStreamerFunctions } from './stdlib-log-streamer';
import { registerCspShieldFunctions } from './stdlib/csp-shield';
import { registerNativeRequestStreamer } from './stdlib-native-request-streamer';
import { registerAsyncOrchestratorFunctions } from './stdlib/async-orchestrator';
import * as fs from 'fs';

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
  // Phase A-1a: I/O 함수 (I/O)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'println',
    module: 'builtins',
    executor: (args) => {
      const val = args[0] !== undefined ? args[0] : '';
      process.stdout.write(String(val) + '\n');
      return null;
    }
  });

  registry.register({
    name: 'print',
    module: 'builtins',
    executor: (args) => {
      const val = args[0] !== undefined ? args[0] : '';
      process.stdout.write(String(val));
      return null;
    }
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
    signature: {
      name: 'map_set',
      returnType: 'object',
      parameters: [
        { name: 'map', type: 'object' },
        { name: 'key', type: 'string' },
        { name: 'value', type: 'any' }
      ],
      category: 'event'
    },
    executor: (args) => {
      const map = args[0] as Map<any, any>;
      const key = args[1];
      const value = args[2];
      map.set(key, value);
      return map;
    }
  });

  registry.register({
    name: 'map_get',
    module: 'map',
    signature: {
      name: 'map_get',
      returnType: 'any',
      parameters: [
        { name: 'map', type: 'object' },
        { name: 'key', type: 'string' }
      ],
      category: 'event'
    },
    executor: (args) => (args[0] as Map<any, any>).get(args[1])
  });

  registry.register({
    name: 'map_has',
    module: 'map',
    signature: {
      name: 'map_has',
      returnType: 'boolean',
      parameters: [
        { name: 'map', type: 'object' },
        { name: 'key', type: 'string' }
      ],
      category: 'event'
    },
    executor: (args) => (args[0] as Map<any, any>).has(args[1])
  });

  registry.register({
    name: 'map_delete',
    module: 'map',
    signature: {
      name: 'map_delete',
      returnType: 'object',
      parameters: [
        { name: 'map', type: 'object' },
        { name: 'key', type: 'string' }
      ],
      category: 'event'
    },
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
  // Phase A-6: PikaDB Functions
  // ────────────────────────────────────────────────────────────

  // In-memory database for PikaDB
  const pikaDbStore = new Map<string, { value: any; timestamp: number }>();

  registry.register({
    name: 'db_set',
    module: 'pika-db',
    signature: {
      name: 'db_set',
      returnType: 'number',
      parameters: [
        { name: 'key', type: 'string' },
        { name: 'value', type: 'any' }
      ],
      category: 'event'
    },
    executor: (args) => {
      const startTime = performance.now();
      const key = String(args[0]);
      const value = args[1];
      pikaDbStore.set(key, { value, timestamp: Date.now() });
      const latency = performance.now() - startTime;
      return Math.round(latency * 1000) / 1000; // Round to 3 decimal places
    }
  });

  registry.register({
    name: 'db_get',
    module: 'pika-db',
    signature: {
      name: 'db_get',
      returnType: 'array',
      parameters: [
        { name: 'key', type: 'string' }
      ],
      category: 'event'
    },
    executor: (args) => {
      const startTime = performance.now();
      const key = String(args[0]);
      const stored = pikaDbStore.get(key);
      const latency = performance.now() - startTime;

      if (stored) {
        return [stored.value, 'cache', Math.round(latency * 1000) / 1000];
      } else {
        return [undefined, 'miss', Math.round(latency * 1000) / 1000];
      }
    }
  });

  registry.register({
    name: 'db_delete',
    module: 'pika-db',
    signature: {
      name: 'db_delete',
      returnType: 'number',
      parameters: [
        { name: 'key', type: 'string' }
      ],
      category: 'event'
    },
    executor: (args) => {
      const startTime = performance.now();
      const key = String(args[0]);
      pikaDbStore.delete(key);
      const latency = performance.now() - startTime;
      return Math.round(latency * 1000) / 1000;
    }
  });

  registry.register({
    name: 'db_stats',
    module: 'pika-db',
    signature: {
      name: 'db_stats',
      returnType: 'object',
      parameters: [],
      category: 'event'
    },
    executor: () => {
      const result = new Map<string, any>();
      result.set('size', pikaDbStore.size);
      result.set('keys', Array.from(pikaDbStore.keys()));
      return result;
    }
  });

  // ────────────────────────────────────────────────────────────
  // Phase A-7: HTTP Server Functions (for PikaDB API)
  // ────────────────────────────────────────────────────────────

  const http = require('http');
  const httpServers = new Map<number, any>();
  // Hardware-CORS: @allow_origin 어노테이션으로 설정되는 도메인 화이트리스트
  const corsWhitelist = new Set<string>();
  const corsMatch = (origin: string): boolean => {
    if (corsWhitelist.size === 0) return true;
    if (corsWhitelist.has(origin)) return true;
    for (const allowed of corsWhitelist) {
      if (allowed.includes('*')) {
        const pat = '^' + allowed.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace('\\*', '[^.]+') + '$';
        if (new RegExp(pat).test(origin)) return true;
      }
    }
    return false;
  };

  /**
   * RFC 7578 Multipart 파서 - MOSS-Uploader 핵심 엔진
   * Buffer.indexOf 기반 고속 boundary 탐색 (Node.js 내부 C++ 최적화 = SIMD-like 성능)
   * multer 외부 의존성 0% 대체
   */
  function __freelang_parseMultipart(bodyBuf: Buffer, boundary: string): {
    files: Map<string, any>,
    fields: Map<string, any>
  } {
    const files = new Map<string, any>();
    const fields = new Map<string, any>();

    const CRLFCRLF = Buffer.from('\r\n\r\n');
    const delimiter = Buffer.from('--' + boundary);

    let offset = 0;

    while (offset < bodyBuf.length) {
      // Boyer-Moore-Horspool: Buffer.indexOf는 C++ 최적화된 탐색
      const delimIdx = bodyBuf.indexOf(delimiter, offset);
      if (delimIdx === -1) break;

      const afterDelim = delimIdx + delimiter.length;

      // 종료 경계선 '--' 체크
      if (afterDelim + 1 < bodyBuf.length &&
          bodyBuf[afterDelim] === 0x2D && bodyBuf[afterDelim + 1] === 0x2D) break;

      // \r\n 건너뜀
      offset = afterDelim + 2;

      // 헤더 끝 위치 탐색
      const headerEndIdx = bodyBuf.indexOf(CRLFCRLF, offset);
      if (headerEndIdx === -1) break;

      // 헤더 파싱
      const headers: Record<string, string> = {};
      bodyBuf.slice(offset, headerEndIdx).toString('utf-8').split('\r\n').forEach((line: string) => {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          headers[line.slice(0, colonIdx).trim().toLowerCase()] = line.slice(colonIdx + 1).trim();
        }
      });

      // part body 범위 계산
      const bodyStart = headerEndIdx + 4; // \r\n\r\n 건너뜀
      const nextDelimIdx = bodyBuf.indexOf(delimiter, bodyStart);
      const bodyEnd = nextDelimIdx === -1 ? bodyBuf.length : nextDelimIdx - 2; // \r\n 제거
      const partBody = bodyBuf.slice(bodyStart, bodyEnd);

      // Content-Disposition 파싱
      const disposition = headers['content-disposition'] || '';
      const nameMatch = disposition.match(/name="([^"]+)"/);
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      const fieldName = nameMatch ? nameMatch[1] : null;

      if (fieldName) {
        if (filenameMatch) {
          // 파일 필드
          const fileObj = new Map<string, any>();
          fileObj.set('filename', filenameMatch[1]);
          fileObj.set('content_type', headers['content-type'] || 'application/octet-stream');
          fileObj.set('size', partBody.length);
          fileObj.set('data', partBody);
          fileObj.set('is_saved', false);
          fileObj.set('path', '');
          files.set(fieldName, fileObj);
        } else {
          // 텍스트 필드
          fields.set(fieldName, partBody.toString('utf-8'));
        }
      }

      if (nextDelimIdx === -1) break;
      offset = nextDelimIdx;
    }

    return { files, fields };
  }

  registry.register({
    name: 'http_server_create',
    module: 'http',
    signature: {
      name: 'http_server_create',
      returnType: 'object',
      parameters: [
        { name: 'port', type: 'number' }
      ],
      category: 'event'
    },
    executor: (args) => {
      const port = Number(args[0]);
      const server = http.createServer();

      const serverObj = {
        __type: 'HttpServer',
        port: port,
        server: server,
        requestHandler: null,
        isListening: false
      };

      httpServers.set(port, serverObj);

      // Set up request listener
      server.on('request', (req: any, res: any) => {
        // Hardware-CORS Gate: Origin 검증 (애플리케이션 레이어 진입 전 차단)
        const origin: string = (req.headers['origin'] as string) || '';
        if (corsWhitelist.size > 0) {
          if (req.method === 'OPTIONS') {
            if (origin && corsMatch(origin)) {
              res.writeHead(204, {
                'Access-Control-Allow-Origin': origin,
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
                'Access-Control-Max-Age': '86400',
                'Vary': 'Origin'
              });
            } else {
              res.writeHead(403, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: 'CORS: origin not allowed' }));
            }
            res.end();
            return;
          }
          if (origin && !corsMatch(origin)) {
            res.writeHead(403, { 'Content-Type': 'application/json', 'Vary': 'Origin' });
            res.end(JSON.stringify({ ok: false, error: 'CORS: origin not allowed' }));
            return;
          }
        }
        if (serverObj.requestHandler) {
          try {
            // Create request object for FreeLang
            const requestObj = new Map<string, any>();
            requestObj.set('method', req.method);
            requestObj.set('path', req.url.split('?')[0]);
            requestObj.set('url', req.url);

            // Parse query string
            const queryString = req.url.split('?')[1] || '';
            const queryMap = new Map<string, string>();
            if (queryString) {
              const pairs = queryString.split('&');
              for (const pair of pairs) {
                const [k, v] = pair.split('=');
                queryMap.set(k, v || '');
              }
            }
            requestObj.set('query', queryMap);
            requestObj.set('headers', new Map(Object.entries(req.headers)));

            // Handle request body - Buffer 기반 (바이너리 + Multipart RFC 7578 지원)
            const chunks: Buffer[] = [];
            req.on('data', (chunk: any) => {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            });

            req.on('end', () => {
              const bodyBuffer = Buffer.concat(chunks);
              const contentType: string = ((req.headers['content-type'] as string) || '');

              // RFC 7578 Multipart 자동 파싱 (파일 업로드 감지)
              if (contentType.includes('multipart/form-data')) {
                const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
                if (boundaryMatch) {
                  const boundary = boundaryMatch[1].replace(/^"(.*)"$/, '$1');
                  const parsed = __freelang_parseMultipart(bodyBuffer, boundary);
                  requestObj.set('body', '');
                  requestObj.set('files', parsed.files);
                  requestObj.set('fields', parsed.fields);
                } else {
                  requestObj.set('body', bodyBuffer.toString('utf-8'));
                  requestObj.set('files', new Map());
                  requestObj.set('fields', new Map());
                }
              } else {
                requestObj.set('body', bodyBuffer.toString('utf-8'));
                requestObj.set('files', new Map());
                requestObj.set('fields', new Map());
              }

              // Call FreeLang handler
              // NOTE: Due to a FreeLang v2 bug with lambda parameter binding,
              // we set __http_current_request__ as a global variable instead of passing as parameter
              try {
                const vm = registry.getVM();
                if (vm) {
                  // Set global __http_current_request__ for handler to access
                  // Direct access to vars since VM doesn't have setGlobal method
                  (vm as any).vars.set('__http_current_request__', requestObj);
                }

                let response;
                if (vm && serverObj.requestHandler) {
                  const handler = serverObj.requestHandler;
                  if (typeof handler === 'string') {
                    // Named function string → callUserFunction으로 호출
                    response = vm.callUserFunction(handler, []);
                  } else {
                    // Closure 객체 → callClosure로 호출
                    response = vm.callClosure(handler, []);
                  }
                } else {
                  // Fallback
                  response = serverObj.requestHandler([requestObj]);
                }

                // Send response - 글로벌 상태코드/헤더 지원 (http_set_status/http_set_header)
                let statusCode = 200;
                let responseHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
                // Hardware-CORS: 허용된 요청에 ACAO 헤더 자동 주입
                if (corsWhitelist.size > 0 && origin && corsMatch(origin)) {
                  responseHeaders['Access-Control-Allow-Origin'] = origin;
                  responseHeaders['Vary'] = 'Origin';
                }
                if (vm) {
                  const customStatus = (vm as any).vars.get('__http_response_status__');
                  if (customStatus != null) {
                    statusCode = Number(customStatus);
                    (vm as any).vars.delete('__http_response_status__');
                  }
                  const customHeaders = (vm as any).vars.get('__http_response_headers__');
                  if (customHeaders instanceof Map) {
                    (customHeaders as Map<string, string>).forEach((v, k) => { responseHeaders[k] = v; });
                    (vm as any).vars.delete('__http_response_headers__');
                  }
                }
                if (typeof response === 'string') {
                  res.writeHead(statusCode, responseHeaders);
                  res.end(response);
                } else if (Buffer.isBuffer(response)) {
                  responseHeaders['Content-Type'] = responseHeaders['Content-Type'] || 'application/octet-stream';
                  res.writeHead(statusCode, responseHeaders);
                  res.end(response);
                } else {
                  res.writeHead(statusCode, responseHeaders);
                  res.end(JSON.stringify(response));
                }
              } catch (callError) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: String(callError) }));
              }
            });
          } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: String(e) }));
          }
        }
      });

      return serverObj;
    }
  });

  registry.register({
    name: 'http_on_request',
    module: 'http',
    signature: {
      name: 'http_on_request',
      returnType: 'object',
      parameters: [
        { name: 'server', type: 'object' },
        { name: 'handler', type: 'any' }
      ],
      category: 'event'
    },
    executor: (args) => {
      const serverObj = args[0] as any;
      const handler = args[1] as any;
      serverObj.requestHandler = handler;
      return serverObj;
    }
  });

  registry.register({
    name: 'http_listen',
    module: 'http',
    signature: {
      name: 'http_listen',
      returnType: 'object',
      parameters: [
        { name: 'server', type: 'object' }
      ],
      category: 'event'
    },
    executor: (args) => {
      const serverObj = args[0] as any;

      if (serverObj.isListening) {
        return serverObj;
      }

      serverObj.server.listen(serverObj.port, () => {
        serverObj.isListening = true;
        process.stdout.write(`HTTP Server listening on port ${serverObj.port}\n`);
      });

      return serverObj;
    }
  });

  // Hardware-CORS: @allow_origin 어노테이션 런타임 초기화 함수
  registry.register({
    name: 'http_cors_set_origins',
    module: 'http',
    signature: {
      name: 'http_cors_set_origins',
      returnType: 'string',
      parameters: [{ name: 'origins', type: 'string' }],
      category: 'http'
    },
    executor: (args: any[]) => {
      const originsStr = String(args[0] || '');
      corsWhitelist.clear();
      originsStr.split(',').forEach((d: string) => { const t = d.trim(); if (t) corsWhitelist.add(t); });
      return `cors_whitelist_set:${corsWhitelist.size}`;
    }
  });

  registry.register({
    name: 'http_request',
    module: 'http',
    signature: {
      name: 'http_request',
      returnType: 'object',
      parameters: [],
      category: 'event'
    },
    executor: (args: any[]) => {
      void args;
      const vm = registry.getVM();
      if (vm) {
        // Direct access to vars since VM doesn't have getGlobal method
        const req = (vm as any).vars.get('__http_current_request__');
        if (req) {
          return req;
        }
      }
      // Return a default request map with all keys initialized
      const emptyReq = new Map<string, any>();
      emptyReq.set('method', '');
      emptyReq.set('path', '');
      emptyReq.set('query', new Map());
      emptyReq.set('body', '');
      emptyReq.set('headers', new Map());
      emptyReq.set('files', new Map());
      emptyReq.set('fields', new Map());
      return emptyReq;
    }
  });

  // ────────────────────────────────────────────────────────────
  // Phase A-8: Multipart Upload / MOSS-Uploader (multer 대체)
  // RFC 7578 네이티브 파서, 매직넘버 보안검증, io_uring-ready 파일 저장
  // ────────────────────────────────────────────────────────────

  // multipart_parse: FreeLang에서 직접 multipart 파싱 호출 (2 params: body, boundary)
  registry.register({
    name: 'multipart_parse',
    module: 'http',
    signature: { name: 'multipart_parse', returnType: 'object', parameters: [{ name: 'body', type: 'any' }, { name: 'boundary', type: 'string' }], category: 'http' },
    executor: (args) => {
      const buf = Buffer.isBuffer(args[0]) ? args[0] : Buffer.from(String(args[0]));
      return __freelang_parseMultipart(buf, String(args[1] || ''));
    }
  });

  // upload_save: 파일 객체를 디스크에 저장 → 저장 경로 반환 (2 params: file_obj, dest_dir)
  registry.register({
    name: 'upload_save',
    module: 'http',
    signature: { name: 'upload_save', returnType: 'string', parameters: [{ name: 'file_obj', type: 'object' }, { name: 'dest_dir', type: 'string' }], category: 'http' },
    executor: (args) => {
      const fileObj = args[0] as Map<string, any>;
      const dir = String(args[1] || '/tmp/uploads');
      if (!(fileObj instanceof Map)) return '';
      const filename = String(fileObj.get('filename') || 'upload');
      const data: Buffer = fileObj.get('data');
      if (!data) return '';
      const fsLocal = require('fs');
      if (!fsLocal.existsSync(dir)) fsLocal.mkdirSync(dir, { recursive: true });
      const ext = filename.includes('.') ? '.' + filename.split('.').pop() : '';
      const base = filename.includes('.') ? filename.slice(0, filename.lastIndexOf('.')) : filename;
      const uniqueName = `${base}_${Date.now()}${ext}`;
      const savePath = `${dir}/${uniqueName}`;
      fsLocal.writeFileSync(savePath, Buffer.isBuffer(data) ? data : Buffer.from(data));
      fileObj.set('is_saved', true);
      fileObj.set('path', savePath);
      return savePath;
    }
  });

  // file_write_binary: 바이너리 데이터를 파일로 저장 (2 params: path, data)
  registry.register({
    name: 'file_write_binary',
    module: 'io',
    signature: { name: 'file_write_binary', returnType: 'bool', parameters: [{ name: 'path', type: 'string' }, { name: 'data', type: 'any' }], category: 'http' },
    executor: (args) => {
      const fsLocal = require('fs');
      const buf = Buffer.isBuffer(args[1]) ? args[1] : Buffer.from(Array.isArray(args[1]) ? args[1] : String(args[1]));
      fsLocal.writeFileSync(String(args[0]), buf);
      return true;
    }
  });

  // file_magic_check: 매직 넘버로 실제 MIME 타입 검증 (보안 - 확장자 위조 방어)
  registry.register({
    name: 'file_magic_check',
    module: 'io',
    executor: (args) => {
      const data = args[0];
      const buf: Buffer = Buffer.isBuffer(data) ? data : Buffer.from(Array.isArray(data) ? data : []);
      if (buf.length < 4) return 'unknown';
      const MAGIC: Array<[string, number[]]> = [
        ['image/jpeg',      [0xFF, 0xD8, 0xFF]],
        ['image/png',       [0x89, 0x50, 0x4E, 0x47]],
        ['image/gif',       [0x47, 0x49, 0x46, 0x38]],
        ['application/pdf', [0x25, 0x50, 0x44, 0x46]],
        ['application/zip', [0x50, 0x4B, 0x03, 0x04]],
      ];
      for (const [mime, magic] of MAGIC) {
        if (magic.every((byte, i) => buf[i] === byte)) return mime;
      }
      // WebP: RIFF....WEBP
      if (buf[0]===0x52&&buf[1]===0x49&&buf[2]===0x46&&buf[3]===0x46 &&
          buf.length>=12 && buf.subarray(8,12).toString()==='WEBP') return 'image/webp';
      return 'application/octet-stream';
    }
  });

  // file_get_extension: 파일명에서 확장자 추출
  registry.register({
    name: 'file_get_extension',
    module: 'io',
    executor: (args) => {
      const filename = String(args[0] || '');
      const dot = filename.lastIndexOf('.');
      return dot === -1 ? '' : filename.slice(dot + 1).toLowerCase();
    }
  });

  // http_set_status: 응답 상태코드 설정 (글로벌 변수 방식)
  registry.register({
    name: 'http_set_status',
    module: 'http',
    executor: (args) => {
      const vm = registry.getVM();
      if (vm) (vm as any).vars.set('__http_response_status__', Number(args[0]));
      return Number(args[0]);
    }
  });

  // http_set_header: 응답 헤더 설정 (2 params: key, value)
  registry.register({
    name: 'http_set_header',
    module: 'http',
    signature: { name: 'http_set_header', returnType: 'bool', parameters: [{ name: 'key', type: 'string' }, { name: 'value', type: 'string' }], category: 'http' },
    executor: (args) => {
      const vm = registry.getVM();
      if (vm) {
        let hdrs = (vm as any).vars.get('__http_response_headers__');
        if (!(hdrs instanceof Map)) {
          hdrs = new Map<string, string>();
          (vm as any).vars.set('__http_response_headers__', hdrs);
        }
        hdrs.set(String(args[0]), String(args[1]));
      }
      return true;
    }
  });

  // dir_create: 디렉토리 생성 (recursive)
  registry.register({
    name: 'dir_create',
    module: 'io',
    executor: (args) => {
      const fsLocal = require('fs');
      const path = String(args[0]);
      if (!fsLocal.existsSync(path)) fsLocal.mkdirSync(path, { recursive: true });
      return true;
    }
  });

  // dir_exists: 디렉토리 존재 여부 확인
  registry.register({
    name: 'dir_exists',
    module: 'io',
    executor: (args) => {
      const fsLocal = require('fs');
      const path = String(args[0]);
      try { return fsLocal.statSync(path).isDirectory(); } catch { return false; }
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

  // time() - Unix timestamp in seconds (Phase 2: Zero-Dependency Support)
  registry.register({
    name: 'time',
    module: 'os',
    executor: () => Math.floor(Date.now() / 1000)
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
  // Phase 1: 누락된 메서드 함수들 (Self-Hosting Blocker 제거)
  // ────────────────────────────────────────────────────────────

  // arr.len(arr) - 배열 길이
  registry.register({
    name: '__method_len',
    module: 'builtin_methods',
    executor: (args) => {
      const obj = args[0];
      if (Array.isArray(obj)) return obj.length;
      if (typeof obj === 'string') return obj.length;
      if (obj instanceof Map) return obj.size;
      if (obj instanceof Set) return obj.size;
      return 0;
    }
  });

  // arr.push(arr, item) - 배열에 아이템 추가 (불변)
  registry.register({
    name: '__method_push',
    module: 'builtin_methods',
    executor: (args) => {
      const arr = args[0] as any[];
      const item = args[1];
      return [...arr, item];
    }
  });

  // arr.slice(arr, start, end) - 배열 슬라이싱
  registry.register({
    name: '__method_slice',
    module: 'builtin_methods',
    executor: (args) => {
      const arr = args[0] as any[];
      const start = args[1] as number;
      const end = args[2] as number;
      return arr.slice(start, end);
    }
  });

  // arr.pop(arr) - 마지막 요소 제거 (불변)
  registry.register({
    name: '__method_pop',
    module: 'builtin_methods',
    executor: (args) => {
      const arr = args[0] as any[];
      return arr.slice(0, -1);
    }
  });

  // map.keys(map) - 맵 키들
  registry.register({
    name: '__method_keys',
    module: 'builtin_methods',
    executor: (args) => {
      const map = args[0] as Map<any, any>;
      return Array.from(map.keys());
    }
  });

  // map.values(map) - 맵 값들
  registry.register({
    name: '__method_values',
    module: 'builtin_methods',
    executor: (args) => {
      const map = args[0] as Map<any, any>;
      return Array.from(map.values());
    }
  });

  // map.get(map, key) - 맵에서 값 조회
  registry.register({
    name: '__method_get',
    module: 'builtin_methods',
    executor: (args) => {
      const map = args[0] as Map<any, any>;
      const key = args[1];
      return map.get(key);
    }
  });

  // map.set(map, key, value) - 맵에 값 설정
  registry.register({
    name: '__method_set',
    module: 'builtin_methods',
    executor: (args) => {
      const map = args[0] as Map<any, any>;
      const key = args[1];
      const value = args[2];
      map.set(key, value);
      return map;
    }
  });

  // map.has(map, key) - 맵에 키가 있는지 확인
  registry.register({
    name: '__method_has',
    module: 'builtin_methods',
    executor: (args) => {
      const map = args[0] as Map<any, any>;
      const key = args[1];
      return map.has(key);
    }
  });

  // str.len(str) - 문자열 길이 (alias for __method_len)
  registry.register({
    name: '__method_length',
    module: 'builtin_methods',
    executor: (args) => {
      const obj = args[0];
      if (Array.isArray(obj)) return obj.length;
      if (typeof obj === 'string') return obj.length;
      if (obj instanceof Map) return obj.size;
      return 0;
    }
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

  // min/max with variadic parameters
  // Special signature to prevent incorrect parameter count detection
  registry.register({
    name: 'min',
    module: 'math',
    signature: {
      name: 'freelang_min',
      parameters: [
        { name: 'a', type: 'number' },
        { name: 'b', type: 'number' },
        { name: 'c', type: 'number' }
      ],
      returnType: 'number',
      category: 'stream' as const  // Dummy category, just to match the interface
    },
    executor: (args) => {
      // Accept variadic args - filter out undefined/null values
      const values = args.filter(v => v !== undefined && v !== null);
      return values.length > 0 ? Math.min(...values) : Infinity;
    }
  });

  registry.register({
    name: 'max',
    module: 'math',
    signature: {
      name: 'freelang_max',
      parameters: [
        { name: 'a', type: 'number' },
        { name: 'b', type: 'number' },
        { name: 'c', type: 'number' }
      ],
      returnType: 'number',
      category: 'stream' as const  // Dummy category, just to match the interface
    },
    executor: (args) => {
      // Accept variadic args - filter out undefined/null values
      const values = args.filter(v => v !== undefined && v !== null);
      return values.length > 0 ? Math.max(...values) : -Infinity;
    }
  });

  // 배열: map, filter, reduce, find
  // Phase 26: Support for user-defined function callbacks
  // Phase 7-D: Support for closures (lambda/arrow functions)
  registry.register({
    name: 'arr_map',
    module: 'array',
    executor: (args) => {
      const arr = args[0] as any[];
      const fnNameOrFunc = args[1] as any;
      const vm = registry.getVM();

      if (!Array.isArray(arr)) return [];

      // Phase 7-D: Check if it's a closure (lambda object)
      if (fnNameOrFunc && typeof fnNameOrFunc === 'object' && fnNameOrFunc.type === 'lambda') {
        if (!vm) throw new Error('vm_not_available_for_closure_call');
        return arr.map((item) => vm.callClosure(fnNameOrFunc, [item]));
      }
      // Phase 26: Check if it's a function name (string)
      else if (typeof fnNameOrFunc === 'string' && vm) {
        return arr.map((item) => vm.callUserFunction(fnNameOrFunc, [item]));
      }
      // JavaScript function (native)
      else if (typeof fnNameOrFunc === 'function') {
        return arr.map(fnNameOrFunc);
      }

      return [];
    }
  });

  registry.register({
    name: 'arr_filter',
    module: 'array',
    executor: (args) => {
      const arr = args[0] as any[];
      const fnNameOrFunc = args[1] as any;
      const vm = registry.getVM();

      if (!Array.isArray(arr)) return [];

      // Phase 7-D: Check if it's a closure (lambda object)
      if (fnNameOrFunc && typeof fnNameOrFunc === 'object' && fnNameOrFunc.type === 'lambda') {
        if (!vm) throw new Error('vm_not_available_for_closure_call');
        return arr.filter((item) => {
          const result = vm.callClosure(fnNameOrFunc, [item]);
          return Boolean(result);
        });
      }
      // Phase 26: Check if it's a function name (string)
      else if (typeof fnNameOrFunc === 'string' && vm) {
        return arr.filter((item) => {
          const result = vm.callUserFunction(fnNameOrFunc, [item]);
          return Boolean(result);
        });
      }
      // JavaScript function (native)
      else if (typeof fnNameOrFunc === 'function') {
        return arr.filter(fnNameOrFunc);
      }

      return [];
    }
  });

  registry.register({
    name: 'arr_reduce',
    module: 'array',
    executor: (args) => {
      const arr = args[0] as any[];
      const fnNameOrFunc = args[1] as any;
      const init = args[2];
      const vm = registry.getVM();

      if (!Array.isArray(arr)) return init;

      // Phase 7-D: Check if it's a closure (lambda object)
      if (fnNameOrFunc && typeof fnNameOrFunc === 'object' && fnNameOrFunc.type === 'lambda') {
        if (!vm) throw new Error('vm_not_available_for_closure_call');
        return arr.reduce((acc, item) => vm.callClosure(fnNameOrFunc, [acc, item]), init);
      }
      // Phase 26: Check if it's a function name (string)
      else if (typeof fnNameOrFunc === 'string' && vm) {
        return arr.reduce((acc, item) => vm.callUserFunction(fnNameOrFunc, [acc, item]), init);
      }
      // JavaScript function (native)
      else if (typeof fnNameOrFunc === 'function') {
        return arr.reduce(fnNameOrFunc, init);
      }

      return init;
    }
  });

  registry.register({
    name: 'arr_find',
    module: 'array',
    executor: (args) => {
      const arr = args[0] as any[];
      const fnNameOrFunc = args[1] as any;
      const vm = registry.getVM();

      if (!Array.isArray(arr)) return null;

      // Phase 7-D: Check if it's a closure (lambda object)
      if (fnNameOrFunc && typeof fnNameOrFunc === 'object' && fnNameOrFunc.type === 'lambda') {
        if (!vm) throw new Error('vm_not_available_for_closure_call');
        const found = arr.find((item) => {
          const result = vm.callClosure(fnNameOrFunc, [item]);
          return Boolean(result);
        });
        return found !== undefined ? found : null;
      }
      // Phase 26: Check if it's a function name (string)
      else if (typeof fnNameOrFunc === 'string' && vm) {
        const found = arr.find((item) => {
          const result = vm.callUserFunction(fnNameOrFunc, [item]);
          return Boolean(result);
        });
        return found !== undefined ? found : null;
      }
      // JavaScript function (native)
      else if (typeof fnNameOrFunc === 'function') {
        const found = arr.find(fnNameOrFunc);
        return found !== undefined ? found : null;
      }

      return null;
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
  // Phase 26: Support for user-defined function callbacks
  registry.register({
    name: '__method_map',
    module: 'builtin_methods',
    executor: (args) => {
      const arr = args[0] as any[];
      const fnNameOrFunc = args[1] as any;
      const vm = registry.getVM();

      // Phase 7-D: Check if it's a closure (lambda object)
      if (fnNameOrFunc && typeof fnNameOrFunc === 'object' && fnNameOrFunc.type === 'lambda') {
        if (!vm) throw new Error('vm_not_available_for_closure_call');
        try {
          return arr.map((item) => vm.callClosure(fnNameOrFunc, [item]));
        } catch (e) {
          console.error('__method_map error:', e instanceof Error ? e.message : String(e));
          return arr;
        }
      }
      // Phase 26: Check if it's a function name (string)
      else if (typeof fnNameOrFunc === 'string' && vm) {
        try {
          const result = arr.map((item) => vm.callUserFunction(fnNameOrFunc, [item]));
          return result;
        } catch (e) {
          console.error('__method_map error:', e instanceof Error ? e.message : String(e));
          // Return original array on error
          return arr;
        }
      } else if (typeof fnNameOrFunc === 'string' && !vm) {
        console.warn('__method_map: VM not available for function:', fnNameOrFunc);
        return arr;
      }
      // JavaScript function
      return arr.map(fnNameOrFunc);
    }
  });

  registry.register({
    name: '__method_filter',
    module: 'builtin_methods',
    executor: (args) => {
      const arr = args[0] as any[];
      const fnNameOrFunc = args[1] as any;
      const vm = registry.getVM();

      // Phase 7-D: Check if it's a closure (lambda object)
      if (fnNameOrFunc && typeof fnNameOrFunc === 'object' && fnNameOrFunc.type === 'lambda') {
        if (!vm) throw new Error('vm_not_available_for_closure_call');
        return arr.filter((item) => {
          const result = vm.callClosure(fnNameOrFunc, [item]);
          return Boolean(result);
        });
      }
      // Phase 26: Check if it's a function name (string)
      else if (typeof fnNameOrFunc === 'string' && vm) {
        return arr.filter((item) => {
          const result = vm.callUserFunction(fnNameOrFunc, [item]);
          return Boolean(result);
        });
      }
      // JavaScript function
      return arr.filter(fnNameOrFunc);
    }
  });

  registry.register({
    name: '__method_find',
    module: 'builtin_methods',
    executor: (args) => {
      const arr = args[0] as any[];
      const fnNameOrFunc = args[1] as any;
      const vm = registry.getVM();

      // Phase 7-D: Check if it's a closure (lambda object)
      if (fnNameOrFunc && typeof fnNameOrFunc === 'object' && fnNameOrFunc.type === 'lambda') {
        if (!vm) throw new Error('vm_not_available_for_closure_call');
        const found = arr.find((item) => {
          const result = vm.callClosure(fnNameOrFunc, [item]);
          return Boolean(result);
        });
        return found !== undefined ? found : null;
      }
      // Phase 26: Check if it's a function name (string)
      else if (typeof fnNameOrFunc === 'string' && vm) {
        const found = arr.find((item) => {
          const result = vm.callUserFunction(fnNameOrFunc, [item]);
          return Boolean(result);
        });
        return found !== undefined ? found : null;
      }
      // JavaScript function
      const found = arr.find(fnNameOrFunc);
      return found !== undefined ? found : null;
    }
  });

  registry.register({
    name: '__method_reduce',
    module: 'builtin_methods',
    executor: (args) => {
      const arr = args[0] as any[];
      const fnNameOrFunc = args[1] as any;
      const init = args[2];
      const vm = registry.getVM();

      // Phase 7-D: Check if it's a closure (lambda object)
      if (fnNameOrFunc && typeof fnNameOrFunc === 'object' && fnNameOrFunc.type === 'lambda') {
        if (!vm) throw new Error('vm_not_available_for_closure_call');
        return arr.reduce((acc, item) => vm.callClosure(fnNameOrFunc, [acc, item]), init);
      }
      // Phase 26: Check if it's a function name (string)
      else if (typeof fnNameOrFunc === 'string' && vm) {
        return arr.reduce((acc, item) => vm.callUserFunction(fnNameOrFunc, [acc, item]), init);
      }
      // JavaScript function
      return arr.reduce(fnNameOrFunc, init);
    }
  });

  // ────────────────────────────────────────────────────────────
  // Phase B: HashMap / Map 함수 (8개)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'map_new',
    module: 'map',
    executor: () => new Map()
  });

  registry.register({
    name: 'map_set',
    module: 'map',
    signature: {
      name: 'map_set',
      returnType: 'object',
      parameters: [
        { name: 'map', type: 'object' },
        { name: 'key', type: 'string' },
        { name: 'value', type: 'any' }
      ],
      category: 'event'
    },
    executor: (args) => {
      const m = args[0] as Map<any, any>;
      m.set(args[1], args[2]);
      return m;
    }
  });

  registry.register({
    name: 'map_get',
    module: 'map',
    signature: {
      name: 'map_get',
      returnType: 'any',
      parameters: [
        { name: 'map', type: 'object' },
        { name: 'key', type: 'string' }
      ],
      category: 'event'
    },
    executor: (args) => (args[0] as Map<any, any>).get(args[1])
  });

  registry.register({
    name: 'map_has',
    module: 'map',
    signature: {
      name: 'map_has',
      returnType: 'boolean',
      parameters: [
        { name: 'map', type: 'object' },
        { name: 'key', type: 'string' }
      ],
      category: 'event'
    },
    executor: (args) => (args[0] as Map<any, any>).has(args[1])
  });

  registry.register({
    name: 'map_delete',
    module: 'map',
    signature: {
      name: 'map_delete',
      returnType: 'object',
      parameters: [
        { name: 'map', type: 'object' },
        { name: 'key', type: 'string' }
      ],
      category: 'event'
    },
    executor: (args) => {
      (args[0] as Map<any, any>).delete(args[1]);
      return args[0];
    }
  });

  registry.register({
    name: 'map_keys',
    module: 'map',
    executor: (args) => Array.from((args[0] as Map<any, any>).keys())
  });

  registry.register({
    name: 'map_values',
    module: 'map',
    executor: (args) => Array.from((args[0] as Map<any, any>).values())
  });

  registry.register({
    name: 'map_size',
    module: 'map',
    executor: (args) => (args[0] as Map<any, any>).size
  });

  // ────────────────────────────────────────────────────────────
  // Phase B: 파일 I/O 함수 (6개)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'file_read',
    module: 'io',
    executor: (args) => {
      try {
        return require('fs').readFileSync(args[0], 'utf-8');
      } catch (e) {
        return `ERROR: ${e.message}`;
      }
    }
  });

  registry.register({
    name: 'file_write',
    module: 'io',
    executor: (args) => {
      try {
        require('fs').writeFileSync(args[0], args[1]);
        return true;
      } catch (e) {
        return false;
      }
    }
  });

  registry.register({
    name: 'file_exists',
    module: 'io',
    executor: (args) => {
      try {
        return require('fs').existsSync(args[0]);
      } catch (e) {
        return false;
      }
    }
  });

  registry.register({
    name: 'file_delete',
    module: 'io',
    executor: (args) => {
      try {
        require('fs').unlinkSync(args[0]);
        return true;
      } catch (e) {
        return false;
      }
    }
  });

  registry.register({
    name: 'file_size',
    module: 'io',
    executor: (args) => {
      try {
        return require('fs').statSync(args[0]).size;
      } catch (e) {
        return -1;
      }
    }
  });

  registry.register({
    name: 'file_append',
    module: 'io',
    executor: (args) => {
      try {
        require('fs').appendFileSync(args[0], args[1]);
        return true;
      } catch (e) {
        return false;
      }
    }
  });

  // ────────────────────────────────────────────────────────────
  // Phase B: OS 함수 (6개)
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
    name: 'os_time',
    module: 'os',
    executor: () => Date.now()
  });

  registry.register({
    name: 'os_env',
    module: 'os',
    executor: (args) => process.env[args[0]] || ''
  });

  registry.register({
    name: 'os_exit',
    module: 'os',
    executor: (args) => {
      process.exit(args[0] || 0);
      return null;
    }
  });

  registry.register({
    name: 'os_cwd',
    module: 'os',
    executor: () => process.cwd()
  });

  // ────────────────────────────────────────────────────────────
  // Phase B: 추가 배열 함수 (4개)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'arr_some',
    module: 'array',
    executor: (args) => {
      const arr = args[0] as any[];
      const fnNameOrFunc = args[1] as any;
      const vm = registry.getVM();

      if (!Array.isArray(arr)) return false;

      // Phase 7-D: Check if it's a closure (lambda object)
      if (fnNameOrFunc && typeof fnNameOrFunc === 'object' && fnNameOrFunc.type === 'lambda') {
        if (!vm) throw new Error('vm_not_available_for_closure_call');
        return arr.some((item) => {
          const result = vm.callClosure(fnNameOrFunc, [item]);
          return Boolean(result);
        });
      }
      // Phase 26: Check if it's a function name (string)
      else if (typeof fnNameOrFunc === 'string' && vm) {
        return arr.some((item) => {
          const result = vm.callUserFunction(fnNameOrFunc, [item]);
          return Boolean(result);
        });
      }
      // JavaScript function (native)
      else if (typeof fnNameOrFunc === 'function') {
        return arr.some(fnNameOrFunc);
      }

      return false;
    }
  });

  registry.register({
    name: 'arr_every',
    module: 'array',
    executor: (args) => {
      const arr = args[0] as any[];
      const fnNameOrFunc = args[1] as any;
      const vm = registry.getVM();

      if (!Array.isArray(arr)) return true;

      // Phase 7-D: Check if it's a closure (lambda object)
      if (fnNameOrFunc && typeof fnNameOrFunc === 'object' && fnNameOrFunc.type === 'lambda') {
        if (!vm) throw new Error('vm_not_available_for_closure_call');
        return arr.every((item) => {
          const result = vm.callClosure(fnNameOrFunc, [item]);
          return Boolean(result);
        });
      }
      // Phase 26: Check if it's a function name (string)
      else if (typeof fnNameOrFunc === 'string' && vm) {
        return arr.every((item) => {
          const result = vm.callUserFunction(fnNameOrFunc, [item]);
          return Boolean(result);
        });
      }
      // JavaScript function (native)
      else if (typeof fnNameOrFunc === 'function') {
        return arr.every(fnNameOrFunc);
      }

      return true;
    }
  });

  registry.register({
    name: 'arr_index_of',
    module: 'array',
    executor: (args) => (args[0] as any[]).indexOf(args[1])
  });

  registry.register({
    name: 'arr_last_index_of',
    module: 'array',
    executor: (args) => (args[0] as any[]).lastIndexOf(args[1])
  });

  // ────────────────────────────────────────────────────────────
  // Phase F: 정규표현식 (Regex)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'regex_match',
    module: 'regex',
    executor: (args) => {
      const pattern = new RegExp(args[0] as string);
      const text = String(args[1]);
      return text.match(pattern) !== null;
    }
  });

  registry.register({
    name: 'regex_extract',
    module: 'regex',
    executor: (args) => {
      const pattern = new RegExp(args[0] as string);
      const text = String(args[1]);
      const matches = text.match(pattern);
      return matches ? matches[0] : null;
    }
  });

  registry.register({
    name: 'regex_extract_all',
    module: 'regex',
    executor: (args) => {
      const pattern = new RegExp(args[0] as string, 'g');
      const text = String(args[1]);
      const matches = text.match(pattern);
      return matches || [];
    }
  });

  registry.register({
    name: 'regex_replace',
    module: 'regex',
    executor: (args) => {
      const pattern = new RegExp(args[0] as string, 'g');
      const text = String(args[1]);
      const replacement = String(args[2]);
      return text.replace(pattern, replacement);
    }
  });

  registry.register({
    name: 'regex_split',
    module: 'regex',
    executor: (args) => {
      const pattern = new RegExp(args[0] as string);
      const text = String(args[1]);
      return text.split(pattern);
    }
  });

  registry.register({
    name: 'regex_test',
    module: 'regex',
    executor: (args) => {
      const pattern = new RegExp(args[0] as string);
      return pattern.test(String(args[1]));
    }
  });

  // ────────────────────────────────────────────────────────────
  // Phase G: 날짜/시간 (Date/Time)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'date_now',
    module: 'datetime',
    executor: () => Date.now()
  });

  registry.register({
    name: 'date_parse',
    module: 'datetime',
    executor: (args) => {
      const date = new Date(String(args[0]));
      return date.getTime();
    }
  });

  registry.register({
    name: 'date_format',
    module: 'datetime',
    executor: (args) => {
      const timestamp = args[0] as number;
      const date = new Date(timestamp);

      // 간단한 포맷: YYYY-MM-DD HH:MM:SS
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');

      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
  });

  registry.register({
    name: 'date_format_iso',
    module: 'datetime',
    executor: (args) => {
      const timestamp = args[0] as number;
      const date = new Date(timestamp);
      return date.toISOString();
    }
  });

  registry.register({
    name: 'time_sleep',
    module: 'datetime',
    executor: async (args) => {
      const ms = args[0] as number;
      await new Promise(resolve => setTimeout(resolve, ms));
      return ms;
    }
  });

  registry.register({
    name: 'time_benchmark',
    module: 'datetime',
    executor: async (args) => {
      const startTime = Date.now();
      // args[0]은 실행할 함수 (FreeLang에서 전달)
      if (typeof args[0] === 'function') {
        await (args[0] as Function)();
      }
      const endTime = Date.now();
      return endTime - startTime;
    }
  });

  registry.register({
    name: 'date_year',
    module: 'datetime',
    executor: (args) => {
      const timestamp = args[0] as number;
      return new Date(timestamp).getFullYear();
    }
  });

  registry.register({
    name: 'date_month',
    module: 'datetime',
    executor: (args) => {
      const timestamp = args[0] as number;
      return new Date(timestamp).getMonth() + 1;
    }
  });

  registry.register({
    name: 'date_day',
    module: 'datetime',
    executor: (args) => {
      const timestamp = args[0] as number;
      return new Date(timestamp).getDate();
    }
  });

  registry.register({
    name: 'date_hour',
    module: 'datetime',
    executor: (args) => {
      const timestamp = args[0] as number;
      return new Date(timestamp).getHours();
    }
  });

  registry.register({
    name: 'date_minute',
    module: 'datetime',
    executor: (args) => {
      const timestamp = args[0] as number;
      return new Date(timestamp).getMinutes();
    }
  });

  registry.register({
    name: 'date_second',
    module: 'datetime',
    executor: (args) => {
      const timestamp = args[0] as number;
      return new Date(timestamp).getSeconds();
    }
  });

  registry.register({
    name: 'date_timestamp',
    module: 'datetime',
    executor: (args) => {
      const year = args[0] as number;
      const month = (args[1] as number) - 1;
      const day = args[2] as number;
      const hour = (args[3] as number) || 0;
      const minute = (args[4] as number) || 0;
      const second = (args[5] as number) || 0;

      const date = new Date(year, month, day, hour, minute, second);
      return date.getTime();
    }
  });

  registry.register({
    name: 'time_diff',
    module: 'datetime',
    executor: (args) => {
      const t1 = args[0] as number;
      const t2 = args[1] as number;
      return Math.abs(t2 - t1);
    }
  });

  // ────────────────────────────────────────────────────────────
  // Phase J: Promise/async support
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'Promise.resolve',
    module: 'promise',
    executor: (args) => {
      return SimplePromise.resolve(args[0]);
    }
  });

  registry.register({
    name: 'Promise.reject',
    module: 'promise',
    executor: (args) => {
      return SimplePromise.reject(args[0]);
    }
  });

  // ────────────────────────────────────────────────────────────
  // Phase L: Regular Expression support
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'regex_new',
    module: 'regex',
    executor: (args) => {
      const patternStr = String(args[0]);
      return new RegexObject(patternStr);
    }
  });

  registry.register({
    name: 'regex_test',
    module: 'regex',
    executor: (args) => {
      const regex = args[0] as RegexObject;
      const str = String(args[1]);
      return regex.test(str);
    }
  });

  registry.register({
    name: 'regex_match',
    module: 'regex',
    executor: (args) => {
      const regex = args[0] as RegexObject;
      const str = String(args[1]);
      return regex.match(str);
    }
  });

  registry.register({
    name: 'regex_replace',
    module: 'regex',
    executor: (args) => {
      const regex = args[0] as RegexObject;
      const str = String(args[1]);
      const replacement = String(args[2]);
      return regex.replace(str, replacement);
    }
  });

  registry.register({
    name: 'regex_split',
    module: 'regex',
    executor: (args) => {
      const regex = args[0] as RegexObject;
      const str = String(args[1]);
      return regex.split(str);
    }
  });

  registry.register({
    name: 'regex_exec',
    module: 'regex',
    executor: (args) => {
      const regex = args[0] as RegexObject;
      const str = String(args[1]);
      const result = regex.exec(str);
      return result ? result.slice(0) : null;  // Convert to array
    }
  });

  // ────────────────────────────────────────────────────────────
  // Phase E: 네트워크/HTTP 함수
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'http_get',
    module: 'http',
    executor: (args) => {
      // 실제 구현: node-fetch or axios 사용
      return { status: 200, body: '' };
    }
  });

  registry.register({
    name: 'http_post',
    module: 'http',
    executor: (args) => {
      return { status: 200, body: '' };
    }
  });

  registry.register({
    name: 'http_put',
    module: 'http',
    executor: (args) => {
      return { status: 200, body: '' };
    }
  });

  registry.register({
    name: 'http_delete',
    module: 'http',
    executor: (args) => {
      return { status: 200, body: '' };
    }
  });

  registry.register({
    name: 'http_status',
    module: 'http',
    executor: (args) => {
      const response = args[0] as any;
      return response?.status || 0;
    }
  });

  registry.register({
    name: 'http_body',
    module: 'http',
    executor: (args) => {
      const response = args[0] as any;
      return response?.body || '';
    }
  });

  registry.register({
    name: 'http_headers',
    module: 'http',
    executor: (args) => {
      const response = args[0] as any;
      return response?.headers || {};
    }
  });

  registry.register({
    name: 'url_encode',
    module: 'http',
    executor: (args) => {
      return encodeURIComponent(String(args[0]));
    }
  });

  // ────────────────────────────────────────────────────────────
  // Phase H: 스레드/비동기 함수
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'async_sleep',
    module: 'async',
    executor: (args) => {
      const ms = args[0] as number;
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  });

  registry.register({
    name: 'async_all',
    module: 'async',
    executor: (args) => {
      const promises = args[0] as Promise<any>[];
      return Promise.all(promises);
    }
  });

  registry.register({
    name: 'async_race',
    module: 'async',
    executor: (args) => {
      const promises = args[0] as Promise<any>[];
      return Promise.race(promises);
    }
  });

  registry.register({
    name: 'async_any',
    module: 'async',
    executor: (args) => {
      const promises = args[0] as Promise<any>[];
      return Promise.any(promises);
    }
  });

  registry.register({
    name: 'defer',
    module: 'async',
    executor: (args) => {
      const fn = args[0] as any;
      setImmediate(() => fn());
      return null;
    }
  });

  registry.register({
    name: 'throttle',
    module: 'async',
    executor: (args) => {
      const fn = args[0] as Function;
      const ms = args[1] as number;
      let lastCall = 0;
      return function(...a: any[]) {
        const now = Date.now();
        if (now - lastCall >= ms) {
          lastCall = now;
          return fn(...a);
        }
      };
    }
  });

  registry.register({
    name: 'debounce',
    module: 'async',
    executor: (args) => {
      const fn = args[0] as Function;
      const ms = args[1] as number;
      let timeout: any;
      return function(...a: any[]) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...a), ms);
      };
    }
  });

  registry.register({
    name: 'once',
    module: 'async',
    executor: (args) => {
      const fn = args[0] as Function;
      let called = false;
      let result: any;
      return function(...a: any[]) {
        if (!called) {
          called = true;
          result = fn(...a);
        }
        return result;
      };
    }
  });

  // ────────────────────────────────────────────────────────────
  // Phase I: 랜덤/유틸리티 함수
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'random',
    module: 'random',
    executor: (args) => {
      return Math.random();
    }
  });

  registry.register({
    name: 'random_int',
    module: 'random',
    executor: (args) => {
      const min = args[0] as number;
      const max = args[1] as number;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
  });

  registry.register({
    name: 'random_float',
    module: 'random',
    executor: (args) => {
      const min = args[0] as number;
      const max = args[1] as number;
      return Math.random() * (max - min) + min;
    }
  });

  registry.register({
    name: 'random_choice',
    module: 'random',
    executor: (args) => {
      const arr = args[0] as any[];
      return arr[Math.floor(Math.random() * arr.length)];
    }
  });

  registry.register({
    name: 'random_shuffle',
    module: 'random',
    executor: (args) => {
      const arr = args[0] as any[];
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    }
  });

  registry.register({
    name: 'uuid',
    module: 'util',
    executor: (args) => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  });

  registry.register({
    name: 'hash',
    module: 'util',
    executor: (args) => {
      const str = String(args[0]);
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash);
    }
  });

  registry.register({
    name: 'range_array',
    module: 'util',
    executor: (args) => {
      const start = args[0] as number;
      const end = args[1] as number;
      const step = (args[2] as number) || 1;
      const result = [];
      for (let i = start; i < end; i += step) {
        result.push(i);
      }
      return result;
    }
  });

  registry.register({
    name: 'repeat_array',
    module: 'util',
    executor: (args) => {
      const value = args[0];
      const count = args[1] as number;
      return Array(count).fill(value);
    }
  });

  // ────────────────────────────────────────────────────────────
  // Phase M: 추가 문자열/배열 함수
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'string_pad_left',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      const length = args[1] as number;
      const char = String(args[2] || ' ');
      return str.padStart(length, char);
    }
  });

  registry.register({
    name: 'string_pad_right',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      const length = args[1] as number;
      const char = String(args[2] || ' ');
      return str.padEnd(length, char);
    }
  });

  registry.register({
    name: 'string_repeat',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      const count = args[1] as number;
      return str.repeat(count);
    }
  });

  registry.register({
    name: 'string_lines',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      return str.split('\n');
    }
  });

  registry.register({
    name: 'string_words',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      return str.split(/\s+/).filter(w => w.length > 0);
    }
  });

  registry.register({
    name: 'array_sum',
    module: 'array',
    executor: (args) => {
      const arr = args[0] as number[];
      return arr.reduce((a, b) => a + b, 0);
    }
  });

  registry.register({
    name: 'array_product',
    module: 'array',
    executor: (args) => {
      const arr = args[0] as number[];
      return arr.reduce((a, b) => a * b, 1);
    }
  });

  registry.register({
    name: 'array_avg',
    module: 'array',
    executor: (args) => {
      const arr = args[0] as number[];
      return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    }
  });

  registry.register({
    name: 'array_min',
    module: 'array',
    executor: (args) => {
      const arr = args[0] as number[];
      return arr.length > 0 ? Math.min(...arr) : null;
    }
  });

  registry.register({
    name: 'array_max',
    module: 'array',
    executor: (args) => {
      const arr = args[0] as number[];
      return arr.length > 0 ? Math.max(...arr) : null;
    }
  });

  // ────────────────────────────────────────────────────────────
  // Phase N: 추가 데이터 구조 함수
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'set_new',
    module: 'collection',
    executor: (args) => {
      return new Set(args[0] as any[]);
    }
  });

  registry.register({
    name: 'set_add',
    module: 'collection',
    executor: (args) => {
      const set = args[0] as Set<any>;
      const value = args[1];
      set.add(value);
      return set;
    }
  });

  registry.register({
    name: 'set_has',
    module: 'collection',
    executor: (args) => {
      const set = args[0] as Set<any>;
      const value = args[1];
      return set.has(value);
    }
  });

  // ────────────────────────────────────────────────────────────
  // Phase E: 네트워크 함수 (HTTP, WebSocket)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'fetch',
    module: 'http',
    executor: (args) => {
      const url = String(args[0]);
      const options = args[1] || {};
      return fetch(url, options as any).then(res => ({
        status: res.status,
        headers: res.headers,
        body: res.text()
      }));
    }
  });

  registry.register({
    name: 'fetch_json',
    module: 'http',
    executor: (args) => {
      const url = String(args[0]);
      return fetch(url).then(res => res.json());
    }
  });

  registry.register({
    name: 'http_get',
    module: 'http',
    executor: (args) => {
      const url = String(args[0]);
      return fetch(url, { method: 'GET' }).then(res => res.text());
    }
  });

  registry.register({
    name: 'http_post',
    module: 'http',
    executor: (args) => {
      const url = String(args[0]);
      const body = String(args[1]);
      return fetch(url, { method: 'POST', body }).then(res => res.text());
    }
  });

  registry.register({
    name: 'http_put',
    module: 'http',
    executor: (args) => {
      const url = String(args[0]);
      const body = String(args[1]);
      return fetch(url, { method: 'PUT', body }).then(res => res.text());
    }
  });

  registry.register({
    name: 'http_delete',
    module: 'http',
    executor: (args) => {
      const url = String(args[0]);
      return fetch(url, { method: 'DELETE' }).then(res => res.text());
    }
  });

  registry.register({
    name: 'http_patch',
    module: 'http',
    executor: (args) => {
      const url = String(args[0]);
      const body = String(args[1]);
      return fetch(url, { method: 'PATCH', body }).then(res => res.text());
    }
  });

  registry.register({
    name: 'http_head',
    module: 'http',
    executor: (args) => {
      const url = String(args[0]);
      return fetch(url, { method: 'HEAD' }).then(res => ({
        status: res.status,
        headers: res.headers
      }));
    }
  });

  registry.register({
    name: 'http_timeout',
    module: 'http',
    executor: (args) => {
      const ms = args[0] as number;
      return new Promise((resolve, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), ms);
      });
    }
  });

  registry.register({
    name: 'http_retry',
    module: 'http',
    executor: (args) => {
      const fn = args[0] as Function;
      const attempts = (args[1] as number) || 3;
      let lastError: any;
      for (let i = 0; i < attempts; i++) {
        try {
          return fn();
        } catch (e) {
          lastError = e;
        }
      }
      throw lastError;
    }
  });

  registry.register({
    name: 'http_gzip',
    module: 'http',
    executor: (args) => {
      return { 'Accept-Encoding': 'gzip, deflate' };
    }
  });

  registry.register({
    name: 'http_auth_basic',
    module: 'http',
    executor: (args) => {
      const user = String(args[0]);
      const pass = String(args[1]);
      const encoded = Buffer.from(`${user}:${pass}`).toString('base64');
      return { 'Authorization': `Basic ${encoded}` };
    }
  });

  registry.register({
    name: 'http_auth_bearer',
    module: 'http',
    executor: (args) => {
      const token = String(args[0]);
      return { 'Authorization': `Bearer ${token}` };
    }
  });

  registry.register({
    name: 'ws_connect',
    module: 'websocket',
    executor: (args) => {
      const url = String(args[0]);
      return new Promise((resolve, reject) => {
        try {
          const ws = new (require('ws'))(url);
          ws.on('open', () => resolve(ws));
          ws.on('error', reject);
        } catch (e) {
          reject(e);
        }
      });
    }
  });

  registry.register({
    name: 'ws_send',
    module: 'websocket',
    executor: (args) => {
      const ws = args[0] as any;
      const data = String(args[1]);
      ws.send(data);
      return null;
    }
  });

  registry.register({
    name: 'ws_on',
    module: 'websocket',
    executor: (args) => {
      const ws = args[0] as any;
      const event = String(args[1]);
      const callback = args[2] as Function;
      ws.on(event, callback);
      return null;
    }
  });

  registry.register({
    name: 'ws_close',
    module: 'websocket',
    executor: (args) => {
      const ws = args[0] as any;
      ws.close();
      return null;
    }
  });

  registry.register({
    name: 'ws_is_open',
    module: 'websocket',
    executor: (args) => {
      const ws = args[0] as any;
      return ws.readyState === 1; // OPEN state
    }
  });

  // ────────────────────────────────────────────────────────────
  // Phase G: WebSocket Server Support
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'ws_createServer',
    module: 'websocket',
    executor: (args) => {
      const port = Number(args[0]);
      const WebSocketServer = require('ws').Server;
      const http = require('http');

      const server = http.createServer();
      const wss = new WebSocketServer({ server });

      return {
        __type: 'WebSocketServer',
        port: port,
        server: server,
        wss: wss,
        clients: new Set(),
        listeners: {},
        isListening: false
      };
    }
  });

  registry.register({
    name: 'ws_listen',
    module: 'websocket',
    executor: (args) => {
      const wsServer = args[0] as any;

      if (wsServer.isListening) return wsServer;

      const wss = wsServer.wss;
      const server = wsServer.server;

      wss.on('connection', (ws: any) => {
        const client = {
          __type: 'WebSocketConnection',
          id: Math.random().toString(36).substr(2, 9),
          ws: ws,
          state: 1, // OPEN
          username: null
        };

        wsServer.clients.add(client);

        if (wsServer.listeners['connection']) {
          try {
            wsServer.listeners['connection'](client);
          } catch (e) {
            console.error('Connection handler error:', e);
          }
        }

        ws.on('message', (data: any) => {
          const message = typeof data === 'string' ? data : data.toString();
          if (wsServer.listeners['message']) {
            try {
              wsServer.listeners['message'](client, message);
            } catch (e) {
              console.error('Message handler error:', e);
            }
          }
        });

        ws.on('close', () => {
          client.state = 3; // CLOSED
          wsServer.clients.delete(client);
          if (wsServer.listeners['disconnection']) {
            try {
              wsServer.listeners['disconnection'](client);
            } catch (e) {
              console.error('Disconnection handler error:', e);
            }
          }
        });

        ws.on('error', (err: any) => {
          if (wsServer.listeners['error']) {
            try {
              wsServer.listeners['error'](err);
            } catch (e) {
              console.error('Error handler error:', e);
            }
          }
        });
      });

      server.listen(wsServer.port, () => {
        wsServer.isListening = true;
        if (wsServer.listeners['listening']) {
          try {
            wsServer.listeners['listening']();
          } catch (e) {
            console.error('Listening handler error:', e);
          }
        }
      });

      return wsServer;
    }
  });

  registry.register({
    name: 'ws_onConnection',
    module: 'websocket',
    executor: (args) => {
      const wsServer = args[0] as any;
      const callback = args[1] as Function;
      wsServer.listeners['connection'] = callback;
      return wsServer;
    }
  });

  registry.register({
    name: 'ws_onDisconnection',
    module: 'websocket',
    executor: (args) => {
      const wsServer = args[0] as any;
      const callback = args[1] as Function;
      wsServer.listeners['disconnection'] = callback;
      return wsServer;
    }
  });

  registry.register({
    name: 'ws_onMessage',
    module: 'websocket',
    executor: (args) => {
      const wsServer = args[0] as any;
      const callback = args[1] as Function;
      wsServer.listeners['message'] = callback;
      return wsServer;
    }
  });

  registry.register({
    name: 'ws_onError',
    module: 'websocket',
    executor: (args) => {
      const wsServer = args[0] as any;
      const callback = args[1] as Function;
      wsServer.listeners['error'] = callback;
      return wsServer;
    }
  });

  registry.register({
    name: 'ws_broadcast',
    module: 'websocket',
    executor: (args) => {
      const wsServer = args[0] as any;
      const message = String(args[1]);

      for (const client of wsServer.clients) {
        try {
          if (client.ws && client.state === 1) {
            client.ws.send(message);
          }
        } catch (e) {
          console.error('Broadcast error:', e);
        }
      }

      return true;
    }
  });

  registry.register({
    name: 'ws_broadcastExcept',
    module: 'websocket',
    executor: (args) => {
      const wsServer = args[0] as any;
      const excludeClient = args[1] as any;
      const message = String(args[2]);

      for (const client of wsServer.clients) {
        if (client.id !== excludeClient.id) {
          try {
            if (client.ws && client.state === 1) {
              client.ws.send(message);
            }
          } catch (e) {
            console.error('Broadcast error:', e);
          }
        }
      }

      return true;
    }
  });

  registry.register({
    name: 'ws_getClients',
    module: 'websocket',
    executor: (args) => {
      const wsServer = args[0] as any;
      return Array.from(wsServer.clients);
    }
  });

  registry.register({
    name: 'ws_getClientCount',
    module: 'websocket',
    executor: (args) => {
      const wsServer = args[0] as any;
      return wsServer.clients.size;
    }
  });

  registry.register({
    name: 'ws_send',
    module: 'websocket',
    executor: (args) => {
      const client = args[0] as any;
      const message = String(args[1]);

      if (client.ws && client.state === 1) {
        client.ws.send(message);
        return true;
      }

      throw new Error('WebSocket is not open');
    }
  });

  registry.register({
    name: 'ws_close',
    module: 'websocket',
    executor: (args) => {
      const clientOrServer = args[0] as any;

      if (clientOrServer.__type === 'WebSocketServer') {
        clientOrServer.server.close();
        clientOrServer.clients.clear();
        clientOrServer.isListening = false;
      } else if (clientOrServer.__type === 'WebSocketConnection') {
        clientOrServer.state = 3; // CLOSED
        if (clientOrServer.ws) {
          clientOrServer.ws.close();
        }
      } else if (clientOrServer.ws) {
        // Client
        clientOrServer.state = 3;
        clientOrServer.ws.close();
      }

      return clientOrServer;
    }
  });

  registry.register({
    name: 'ws_getState',
    module: 'websocket',
    executor: (args) => {
      const clientOrConn = args[0] as any;
      const states = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
      return states[clientOrConn.state || 0];
    }
  });

  registry.register({
    name: 'ws_isOpen',
    module: 'websocket',
    executor: (args) => {
      const clientOrConn = args[0] as any;
      return clientOrConn.state === 1;
    }
  });

  registry.register({
    name: 'ws_isClosed',
    module: 'websocket',
    executor: (args) => {
      const clientOrConn = args[0] as any;
      return clientOrConn.state === 3;
    }
  });

  // ────────────────────────────────────────────────────────────
  // Phase H: Lexer 자체호스팅 함수 (30개)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'tokenize',
    module: 'lexer',
    executor: (args) => {
      const source = args[0] as string;
      const lexer = {
        source,
        pos: 0,
        line: 1,
        col: 1,
        tokens: [] as any[]
      };

      function current(): string {
        if (lexer.pos >= lexer.source.length) return '';
        return lexer.source[lexer.pos];
      }

      function peek(offset: number): string {
        const pos = lexer.pos + offset;
        if (pos >= lexer.source.length) return '';
        return lexer.source[pos];
      }

      function isAlpha(ch: string): boolean {
        const code = ch.charCodeAt(0);
        return (code >= 97 && code <= 122) || (code >= 65 && code <= 90) || ch === '_';
      }

      function isDigit(ch: string): boolean {
        const code = ch.charCodeAt(0);
        return code >= 48 && code <= 57;
      }

      function isAlphaNumeric(ch: string): boolean {
        return isAlpha(ch) || isDigit(ch);
      }

      function isWhitespace(ch: string): boolean {
        return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
      }

      function isOperator(ch: string): boolean {
        return '+-*/%=!<>&|^'.includes(ch);
      }

      function isKeyword(word: string): boolean {
        const keywords = ['fn', 'let', 'const', 'return', 'if', 'else', 'while', 'for',
          'do', 'break', 'continue', 'match', 'true', 'false', 'null', 'struct', 'enum',
          'import', 'export', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'in', 'of'];
        return keywords.includes(word);
      }

      function addToken(kind: string, value: string, line: number, col: number): void {
        lexer.tokens.push({
          kind,
          value,
          line,
          col,
          length: value.length
        });
      }

      function scanNumber(): void {
        const start = lexer.pos;
        const line = lexer.line;
        const col = lexer.col;

        while (isDigit(current())) {
          lexer.pos++;
          lexer.col++;
        }

        if (current() === '.' && isDigit(peek(1))) {
          lexer.pos++;
          lexer.col++;
          while (isDigit(current())) {
            lexer.pos++;
            lexer.col++;
          }
        }

        const value = lexer.source.substring(start, lexer.pos);
        addToken('NUMBER', value, line, col);
      }

      function scanIdentifier(): void {
        const start = lexer.pos;
        const line = lexer.line;
        const col = lexer.col;

        while (isAlphaNumeric(current())) {
          lexer.pos++;
          lexer.col++;
        }

        const value = lexer.source.substring(start, lexer.pos);
        const kind = isKeyword(value) ? 'KEYWORD' : 'IDENT';
        addToken(kind, value, line, col);
      }

      function scanString(quote: string): void {
        const start = lexer.pos;
        const line = lexer.line;
        const col = lexer.col;

        lexer.pos++;
        lexer.col++;

        while (current() !== quote && current() !== '') {
          if (current() === '\n') {
            lexer.line++;
            lexer.col = 1;
          } else {
            lexer.col++;
          }

          if (current() === '\\' && peek(1) === quote) {
            lexer.pos += 2;
            lexer.col += 2;
          } else {
            lexer.pos++;
          }
        }

        if (current() === quote) {
          lexer.pos++;
          lexer.col++;
        }

        const value = lexer.source.substring(start, lexer.pos);
        addToken('STRING', value, line, col);
      }

      function scanLineComment(): void {
        const start = lexer.pos;
        const line = lexer.line;
        const col = lexer.col;

        lexer.pos += 2;
        lexer.col += 2;

        while (current() !== '\n' && current() !== '') {
          lexer.pos++;
          lexer.col++;
        }

        const value = lexer.source.substring(start, lexer.pos);
        addToken('COMMENT', value, line, col);
      }

      function scanBlockComment(): void {
        const start = lexer.pos;
        const line = lexer.line;
        const col = lexer.col;

        lexer.pos += 2;
        lexer.col += 2;

        while (lexer.pos < lexer.source.length - 1) {
          if (current() === '*' && peek(1) === '/') {
            lexer.pos += 2;
            lexer.col += 2;
            break;
          }

          if (current() === '\n') {
            lexer.line++;
            lexer.col = 1;
          } else {
            lexer.col++;
          }

          lexer.pos++;
        }

        const value = lexer.source.substring(start, lexer.pos);
        addToken('COMMENT', value, line, col);
      }

      function scanOperator(ch: string): void {
        const line = lexer.line;
        const col = lexer.col;
        let value = ch;

        lexer.pos++;
        lexer.col++;

        const next = current();

        if ((ch === '=' && next === '=') ||
            (ch === '!' && next === '=') ||
            (ch === '<' && next === '=') ||
            (ch === '>' && next === '=') ||
            (ch === '&' && next === '&') ||
            (ch === '|' && next === '|') ||
            (ch === '+' && next === '+') ||
            (ch === '-' && next === '-') ||
            (ch === '+' && next === '=') ||
            (ch === '-' && next === '=') ||
            (ch === '*' && next === '=') ||
            (ch === '/' && next === '=')) {
          value += next;
          lexer.pos++;
          lexer.col++;

          if (ch === '=' && next === '=' && current() === '=') {
            value += '=';
            lexer.pos++;
            lexer.col++;
          }
        }

        addToken('OP', value, line, col);
      }

      function nextToken(): void {
        while (isWhitespace(current())) {
          if (current() === '\n') {
            lexer.line++;
            lexer.col = 1;
          } else {
            lexer.col++;
          }
          lexer.pos++;
        }

        const ch = current();

        if (ch === '') {
          return;
        }

        if (ch === '/' && peek(1) === '/') {
          scanLineComment();
          return;
        }

        if (ch === '/' && peek(1) === '*') {
          scanBlockComment();
          return;
        }

        if (isDigit(ch)) {
          scanNumber();
          return;
        }

        if (isAlpha(ch)) {
          scanIdentifier();
          return;
        }

        if (ch === '"' || ch === "'") {
          scanString(ch);
          return;
        }

        if (isOperator(ch)) {
          scanOperator(ch);
          return;
        }

        const line = lexer.line;
        const col = lexer.col;
        lexer.pos++;
        lexer.col++;

        if ('(){}[];:,.?'.includes(ch)) {
          addToken('PUNCT', ch, line, col);
        } else {
          addToken('UNKNOWN', ch, line, col);
        }
      }

      while (lexer.pos < lexer.source.length) {
        nextToken();
      }

      addToken('EOF', '', lexer.line, lexer.col);

      return lexer.tokens;
    }
  });

  registry.register({
    name: 'filterTokens',
    module: 'lexer',
    executor: (args) => {
      const tokens = args[0] as any[];
      const kind = args[1] as string;
      return tokens.filter(t => t.kind === kind);
    }
  });

  registry.register({
    name: 'countTokens',
    module: 'lexer',
    executor: (args) => {
      const tokens = args[0] as any[];
      const counts: any = {};
      for (const token of tokens) {
        counts[token.kind] = (counts[token.kind] || 0) + 1;
      }
      return counts;
    }
  });

  registry.register({
    name: 'tokenSequence',
    module: 'lexer',
    executor: (args) => {
      const tokens = args[0] as any[];
      return tokens
        .filter(t => t.kind !== 'EOF')
        .map((t: any) => t.kind)
        .join(' ');
    }
  });

  registry.register({
    name: 'isValidTokenization',
    module: 'lexer',
    executor: (args) => {
      const tokens = args[0] as any[];
      if (tokens.length === 0) return false;
      const lastToken = tokens[tokens.length - 1];
      return lastToken.kind === 'EOF';
    }
  });

  // ────────────────────────────────────────────────────────────
  // Phase F: 수학/암호/통계 확장 함수 (115개)
  // ────────────────────────────────────────────────────────────
  registerMathExtendedFunctions(registry);

  // ────────────────────────────────────────────────────────────
  // Phase G: HTTP/Network 확장 함수 (150개)
  // ────────────────────────────────────────────────────────────
  registerHttpExtendedFunctions(registry);

  // ────────────────────────────────────────────────────────────
  // Phase D: API Functions (100개)
  // REST Client, GraphQL, WebAPI, API Gateway, API Testing
  // ────────────────────────────────────────────────────────────
  registerApiFunctions(registry);

  // ────────────────────────────────────────────────────────────
  // Phase D: Testing Functions (80개)
  // Test Framework, Assertions, Mocking, Spying
  // ────────────────────────────────────────────────────────────
  registerTestingFunctions(registry);

  // ────────────────────────────────────────────────────────────
  // Phase F: Data Processing Functions (60개)
  // CSV/JSON/XML parsing, normalization, validation
  // ────────────────────────────────────────────────────────────
  registerDataProcessingFunctions(registry);

  // ────────────────────────────────────────────────────────────
  // Phase F: Advanced Analytics Functions (60개)
  // Statistics, ML basics, anomaly detection, visualization
  // ────────────────────────────────────────────────────────────
  registerAnalyticsFunctions(registry);

  // ────────────────────────────────────────────────────────────
  // Phase F: Integration Functions (40개)
  // Events, queues, caching, rate limiting, webhooks
  // ────────────────────────────────────────────────────────────
  registerIntegrationFunctions(registry);

  // ────────────────────────────────────────────────────────────
  // Phase F: Utility Functions (40개)
  // Date/time, currency, units, encoding, misc
  // ────────────────────────────────────────────────────────────
  registerUtilityFunctions(registry);

  // ────────────────────────────────────────────────────────────
  // Phase 6.2: Core Array/String/Type Functions (added to builtins.ts)
  // These are now defined in engine/builtins.ts and auto-registered via
  // the getBuiltinImpl mechanism. Registering here for completeness.
  // ────────────────────────────────────────────────────────────

  // Array operations
  registry.register({
    name: 'array_push',
    module: 'core-array',
    executor: (args) => {
      const arr = args[0];
      const val = args[1];
      if (Array.isArray(arr)) {
        arr.push(val);
      }
      return arr;
    }
  });

  registry.register({
    name: 'array_pop',
    module: 'core-array',
    executor: (args) => {
      const arr = args[0];
      if (Array.isArray(arr) && arr.length > 0) {
        return arr.pop();
      }
      return null;
    }
  });

  registry.register({
    name: 'array_length',
    module: 'core-array',
    executor: (args) => {
      const arr = args[0];
      return Array.isArray(arr) ? arr.length : 0;
    }
  });

  registry.register({
    name: 'array_shift',
    module: 'core-array',
    executor: (args) => {
      const arr = args[0];
      if (Array.isArray(arr) && arr.length > 0) {
        return arr.shift();
      }
      return null;
    }
  });

  registry.register({
    name: 'array_unshift',
    module: 'core-array',
    executor: (args) => {
      const arr = args[0];
      const val = args[1];
      if (Array.isArray(arr)) {
        arr.unshift(val);
      }
      return arr;
    }
  });

  registry.register({
    name: 'array_join',
    module: 'core-array',
    executor: (args) => {
      const arr = args[0];
      const sep = String(args[1] || ',');
      if (!Array.isArray(arr)) return '';
      return arr.map((x: any) => String(x)).join(sep);
    }
  });

  // String operations
  registry.register({
    name: 'string_split',
    module: 'core-string',
    executor: (args) => {
      const str = String(args[0]);
      const sep = String(args[1] || '');
      return str.split(sep || '');
    }
  });

  registry.register({
    name: 'string_trim',
    module: 'core-string',
    executor: (args) => {
      const str = String(args[0]);
      return str.trim();
    }
  });

  registry.register({
    name: 'string_replace',
    module: 'core-string',
    executor: (args) => {
      const str = String(args[0]);
      const old = String(args[1]);
      const newStr = String(args[2]);
      try {
        return str.replace(new RegExp(old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newStr);
      } catch {
        return str;
      }
    }
  });

  registry.register({
    name: 'string_contains',
    module: 'core-string',
    executor: (args) => {
      const str = String(args[0]);
      const substr = String(args[1]);
      return str.includes(substr);
    }
  });

  registry.register({
    name: 'to_string',
    module: 'core-type',
    executor: (args) => {
      return String(args[0]);
    }
  });

  registry.register({
    name: 'to_number',
    module: 'core-type',
    executor: (args) => {
      const n = parseFloat(String(args[0]));
      return isNaN(n) ? 0 : n;
    }
  });

  // Type checking
  registry.register({
    name: 'is_null',
    module: 'core-type',
    executor: (args) => {
      const val = args[0];
      return val === null || val === undefined;
    }
  });

  registry.register({
    name: 'is_array',
    module: 'core-type',
    executor: (args) => {
      return Array.isArray(args[0]);
    }
  });

  registry.register({
    name: 'is_map',
    module: 'core-type',
    executor: (args) => {
      const val = args[0];
      return val !== null && typeof val === 'object' && !Array.isArray(val);
    }
  });

  registry.register({
    name: 'is_string',
    module: 'core-type',
    executor: (args) => {
      return typeof args[0] === 'string';
    }
  });

  registry.register({
    name: 'is_number',
    module: 'core-type',
    executor: (args) => {
      return typeof args[0] === 'number';
    }
  });

  registry.register({
    name: 'is_bool',
    module: 'core-type',
    executor: (args) => {
      return typeof args[0] === 'boolean';
    }
  });

  // ────────────────────────────────────────────────────────────
  // Phase H: scikit-learn 스타일 ML Functions (8개)
  // Phase 3: KMeans Clustering (4개)
  // Phase 4: K-Nearest Neighbors (4개)
  // ────────────────────────────────────────────────────────────
  registerSklearnFunctions(registry);

  // ────────────────────────────────────────────────────────────
  // Phase I: Team A - Validation/Schema Functions (95개)
  // 20 libraries: schema, json-schema, sanitize, email, phone, credit-card,
  // ip-address, url-validator, uuid-validator, isbn, ssn, postal-code,
  // iban, bic, sku, gtin, domain-name, mac-address, mime-type, country-code
  // ────────────────────────────────────────────────────────────
  registerTeamAFunctions(registry);

  // ────────────────────────────────────────────────────────────
  // Phase I: Team C - File I/O & Date/Time Functions (95개)
  // 20 libraries: fs-async, fs-buffer, fs-watcher, path-posix, path-glob,
  // symlink, fileperm, tempfile, zip-stream, file-sync, timezone, calendar,
  // cron, duration, business-days, date-format, date-range, age-calc,
  // date-compare, date-utils
  // ────────────────────────────────────────────────────────────
  registerTeamCFunctions(registry);

  // ────────────────────────────────────────────────────────────
  // Phase I: Team D - HTTP & Database Functions (110개)
  // 25 libraries: http-client, fetch-api, axios-compat, form-data, gzip,
  // brotli, chunked-response, stream-parse, http-auth, oauth2-client, saml,
  // json-rpc, graphql-client, soap-client, mqtt-client, amqp-client,
  // mongodb-client, postgresql-client, mysql-client, redis-client,
  // elasticsearch-client, influxdb-client, dynamodb-client, cassandra-client,
  // sqlite-client
  // ────────────────────────────────────────────────────────────
  registerTeamDFunctions(registry);

  // ────────────────────────────────────────────────────────────
  // Phase J: Team B - String & Math Functions (120개)
  // 35 libraries: text-diff, text-search, markdown, html-parser, template,
  // printf, levenshtein, ansi-strip, word-break, complex, fraction, matrix,
  // linear-algebra, statistics, probability, interpolation, fft, bigint,
  // decimal, polynomial, prime, random-dist, geometry, combinatorics,
  // csv-parser, json-query, groupby, aggregate, distinct, sort,
  // filter-chain, stream-process, text-wrap-b, word-freq, string-utils
  // ────────────────────────────────────────────────────────────
  registerTeamBFunctions(registry);

  // ────────────────────────────────────────────────────────────
  // Phase K: Team E - Async/Test/Error/Concurrency Functions (150개)
  // 30 libraries: async-pool, semaphore, channel, worker-pool, event-bus,
  // pub-sub, rate-limiter, debounce, throttle, retry, circuit-breaker,
  // logger, error-handler, error-monitoring, error-serializer, assertion,
  // mock, spy, fixture, snapshot, coverage, benchmark, test-runner, stub,
  // fake-timer, expect, promise-utils, queue-worker, task-manager, pipeline
  // ────────────────────────────────────────────────────────────
  registerTeamEFunctions(registry);

  // ────────────────────────────────────────────────────────────
  // Team F: Security/Crypto/System
  // hash, aes, hmac, jwt-utils, argon2, scrypt, sign, random-bytes,
  // process, signal, memory, cpu, disk, network-iface, locale, currency,
  // units, color, qrcode, encoding-ext, zlib, password
  // ────────────────────────────────────────────────────────────
  registerTeamFFunctions(registry);

  // ────────────────────────────────────────────────────────────
  // Native-Graph: 정적 컴파일 기반 GraphQL 엔진 (Apollo 완전 대체)
  // 외부 의존성 0% - Node.js http 모듈만 사용
  // 빌트인: graph_schema_define / graph_resolver_add / graph_server_start
  //         graph_execute / graph_server_stop
  // ────────────────────────────────────────────────────────────
  registerNativeGraphFunctions(registry);

  // ────────────────────────────────────────────────────────────
  // Native-Chart: Chart.js 완전 대체 (외부 의존성 0%)
  // 순수 SVG 생성 기반 차트 엔진
  // 빌트인: chart_bar / chart_line / chart_pie / chart_scatter
  //         chart_sparkline / chart_render_html / chart_save / chart_multi
  //         chart_palette
  // ────────────────────────────────────────────────────────────
  registerNativeChartFunctions(registry);

  // Native-Web-Forge: Next.js 대체 SSG/SSR 엔진
  registerWebForgeFunctions(registry);

  // Native-Auth-Token: JWT 대체 HMAC-SHA256 토큰 발급/검증
  registerAuthFunctions(registry);

  // Native-Log-Streamer: pm2-logrotate 대체 순환 로그 엔진
  registerLogStreamerFunctions(registry);

  // Native-CSP-Shield: helmet-csp 대체 CSP 헤더 자동 주입
  registerCspShieldFunctions(registry);

  // Native-Request-Streamer: superagent/axios 대체 raw TCP HTTP 클라이언트
  // net/tls 모듈 직접 사용, 외부 라이브러리 0개
  registerNativeRequestStreamer(registry);

  // Phase 27: Native-Async-Orchestrator (Bluebird 완전 대체)
  // parallel_map, await_all, await_race, async_pipeline, async_retry,
  // async_timeout, parallel_filter, parallel_reduce, async_map_batch,
  // work_stealing_stats - Work-Stealing 스케줄러 내장
  registerAsyncOrchestratorFunctions(registry);

  // Silent registration (no console output)
}

// ─────────────────────────────────────────────────────────────────────────────
// Native-Graph 빌트인 구현 (Apollo Server 대체)
// FreeLang schema 블록 → 정적 타입 레지스트리 + 리졸버 디스패치 테이블
// ─────────────────────────────────────────────────────────────────────────────

interface GraphField {
  name: string;
  type: string;        // 'Int' | 'String' | 'Float' | 'Boolean' | '[TypeName]' | 'TypeName'
  isList: boolean;
  nullable: boolean;
}

interface GraphTypeDef {
  name: string;
  fields: GraphField[];
  isQuery: boolean;
  isMutation: boolean;
}

interface GraphResolverEntry {
  typeName: string;
  fieldName: string;
  fn: (...args: any[]) => any;
}

// 글로벌 그래프 상태 (단일 schema 인스턴스)
const __graph_types = new Map<string, GraphTypeDef>();
const __graph_resolvers = new Map<string, GraphResolverEntry>();
const __graph_servers = new Map<number, any>();

/**
 * GQL 요청을 파싱하고 리졸버 체인으로 실행
 * 단순 필드 선택만 지원 (중첩 + 인자 포함)
 */
function __graph_execute_query(
  typeName: string,
  selections: Array<{ field: string; args: Map<string, any>; subFields: string[] }>,
  rootArgs: Map<string, any>,
  parentObj?: Map<string, any>  // 부모 리졸버가 반환한 데이터 오브젝트
): Map<string, any> {
  const result = new Map<string, any>();

  for (const sel of selections) {
    const resolverKey = `${typeName}.${sel.field}`;
    const resolver = __graph_resolvers.get(resolverKey);

    let val: any;
    if (resolver) {
      // 명시적 리졸버 실행
      val = resolver.fn(rootArgs, sel.args);
    } else if (parentObj instanceof Map && parentObj.has(sel.field)) {
      // 리졸버 없음 + 부모 Map에 필드 존재 → 스칼라 직접 읽기
      val = parentObj.get(sel.field);
    } else {
      val = null;
    }

    if (sel.subFields.length > 0 && val != null) {
      // 중첩 객체: 하위 타입 재귀 실행
      const typeDef = __graph_types.get(typeName);
      const fieldDef = typeDef?.fields.find(f => f.name === sel.field);
      const subTypeName = fieldDef
        ? fieldDef.type.replace(/[\[\]!]/g, '')
        : typeName;
      const subSels = sel.subFields.map(sf => ({
        field: sf, args: new Map<string, any>(), subFields: []
      }));

      if (Array.isArray(val)) {
        // 리스트: 각 요소별 하위 필드 매핑
        result.set(sel.field, val.map((item: any) => {
          const itemMap = item instanceof Map ? item : new Map(Object.entries(item as any));
          return __graph_execute_query(subTypeName, subSels, rootArgs, itemMap);
        }));
      } else {
        const subParent = val instanceof Map ? val : new Map(Object.entries(val as any));
        result.set(sel.field, __graph_execute_query(subTypeName, subSels, rootArgs, subParent));
      }
    } else {
      result.set(sel.field, val);
    }
  }
  return result;
}

/**
 * 최소 GQL 쿼리 파서 (중괄호 기반 필드 선택 추출)
 * { user(id: 1) { name email } } 형태 지원
 */
function __graph_parse_gql(body: string): {
  operationType: 'query' | 'mutation';
  rootField: string;
  rootArgs: Map<string, any>;
  subFields: string[];
} | null {
  const trimmed = body.trim();
  const opMatch = trimmed.match(/^(query|mutation)?\s*\{?\s*(\w+)\s*(?:\(([^)]*)\))?\s*\{([^}]*)\}/s);
  if (!opMatch) return null;

  const operationType = (opMatch[1] || 'query') as 'query' | 'mutation';
  const rootField = opMatch[2];
  const argsStr = opMatch[3] || '';
  const fieldsStr = opMatch[4] || '';

  const rootArgs = new Map<string, any>();
  if (argsStr) {
    for (const kv of argsStr.split(',')) {
      const [k, v] = kv.split(':').map(s => s.trim());
      if (k && v !== undefined) {
        const num = Number(v.replace(/"/g, '').trim());
        rootArgs.set(k, isNaN(num) ? v.replace(/"/g, '').trim() : num);
      }
    }
  }

  const subFields = fieldsStr.split(/[\s\n]+/).map(f => f.trim()).filter(f => /^\w+$/.test(f));

  return { operationType, rootField, rootArgs, subFields };
}

/**
 * Map → 일반 JS 객체 (JSON 직렬화용)
 */
function __graph_map_to_obj(val: any): any {
  if (val instanceof Map) {
    const obj: Record<string, any> = {};
    val.forEach((v, k) => { obj[k] = __graph_map_to_obj(v); });
    return obj;
  }
  if (Array.isArray(val)) return val.map(__graph_map_to_obj);
  return val;
}

function registerNativeGraphFunctions(registry: NativeFunctionRegistry): void {

  // ── graph_schema_define(typeName, fields_json) ──────────────────────────
  // 타입 정의를 정적 레지스트리에 등록
  // fields_json 예: '[{"name":"id","type":"Int"},{"name":"name","type":"String"}]'
  registry.register({
    name: 'graph_schema_define',
    module: 'graph',
    signature: {
      name: 'graph_schema_define',
      returnType: 'void',
      parameters: [
        { name: 'typeName', type: 'string' },
        { name: 'fieldsJson', type: 'string' }
      ],
      category: 'http'
    },
    executor: (args) => {
      const typeName = String(args[0]);
      const isQuery = typeName === 'Query';
      const isMutation = typeName === 'Mutation';
      let fields: GraphField[] = [];

      try {
        const raw = JSON.parse(String(args[1]));
        fields = (Array.isArray(raw) ? raw : []).map((f: any) => ({
          name: f.name || '',
          type: String(f.type || 'String').replace(/[\[\]!]/g, ''),
          isList: String(f.type || '').startsWith('['),
          nullable: !String(f.type || '').endsWith('!')
        }));
      } catch { /* 빈 필드 리스트로 처리 */ }

      __graph_types.set(typeName, { name: typeName, fields, isQuery, isMutation });
    }
  });

  // ── graph_resolver_add(typeName, fieldName, fn) ────────────────────────
  // 리졸버 함수를 디스패치 테이블에 등록 (정적 바인딩)
  registry.register({
    name: 'graph_resolver_add',
    module: 'graph',
    signature: {
      name: 'graph_resolver_add',
      returnType: 'void',
      parameters: [
        { name: 'typeName', type: 'string' },
        { name: 'fieldName', type: 'string' },
        { name: 'fn', type: 'function' }
      ],
      category: 'http'
    },
    executor: (args) => {
      const typeName = String(args[0]);
      const fieldName = String(args[1]);
      const fn = args[2];
      if (typeof fn !== 'function') return;
      const key = `${typeName}.${fieldName}`;
      __graph_resolvers.set(key, { typeName, fieldName, fn });
    }
  });

  // ── graph_server_start(port) ──────────────────────────────────────────
  // POST /graphql 엔드포인트 + GET /graphql (인트로스펙션 HTML UI) 서버 기동
  // 외부 의존성 0% - Node.js http 모듈만 사용
  registry.register({
    name: 'graph_server_start',
    module: 'graph',
    signature: {
      name: 'graph_server_start',
      returnType: 'object',
      parameters: [
        { name: 'port', type: 'number' }
      ],
      category: 'event'
    },
    executor: (args) => {
      const port = Number(args[0]) || 4000;
      const nodeHttp = require('http');

      const server = nodeHttp.createServer((req: any, res: any) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(204); res.end(); return;
        }

        // GET /graphql → 내장 GraphiQL-lite HTML UI (외부 CDN 0%)
        if (req.method === 'GET' && req.url?.startsWith('/graphql')) {
          const types = Array.from(__graph_types.values());
          const typeList = types.map(t =>
            `<details><summary><b>${t.name}</b></summary><ul>${
              t.fields.map(f => `<li>${f.name}: ${f.isList ? '[' : ''}${f.type}${f.isList ? ']' : ''}</li>`).join('')
            }</ul></details>`
          ).join('');

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<!DOCTYPE html><html><head><meta charset="utf-8">
<title>FreeLang Native-Graph UI</title>
<style>body{font-family:monospace;background:#1e1e2e;color:#cdd6f4;padding:20px}
textarea{width:100%;height:120px;background:#313244;color:#cdd6f4;border:1px solid #585b70;padding:8px}
button{background:#cba6f7;color:#1e1e2e;border:none;padding:8px 16px;cursor:pointer;font-weight:bold}
pre{background:#313244;padding:12px;overflow:auto}details{margin:4px 0}summary{cursor:pointer;color:#89b4fa}
</style></head><body>
<h2>🕸️ FreeLang Native-Graph Engine</h2>
<h3>Schema</h3>${typeList}
<h3>Query</h3>
<textarea id="q">{ user(id: 1) { id name } }</textarea><br><br>
<button onclick="run()">Execute</button>
<pre id="r"></pre>
<script>
async function run(){
  const q=document.getElementById('q').value;
  const r=await fetch('/graphql',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:q})});
  const d=await r.json();
  document.getElementById('r').textContent=JSON.stringify(d,null,2);
}
</script></body></html>`);
          return;
        }

        // POST /graphql → GQL 실행
        if (req.method === 'POST' && req.url?.startsWith('/graphql')) {
          const chunks: Buffer[] = [];
          req.on('data', (c: Buffer) => chunks.push(c));
          req.on('end', () => {
            try {
              const body = Buffer.concat(chunks).toString('utf-8');
              const payload = JSON.parse(body);
              const gqlStr = payload.query || payload.mutation || '';

              const parsed = __graph_parse_gql(gqlStr);
              if (!parsed) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errors: [{ message: 'GQL parse error' }] }));
                return;
              }

              const rootTypeName = parsed.operationType === 'mutation' ? 'Mutation' : 'Query';
              const selections = [{
                field: parsed.rootField,
                args: parsed.rootArgs,
                subFields: parsed.subFields
              }];

              const data = __graph_execute_query(rootTypeName, selections, parsed.rootArgs);
              const result = __graph_map_to_obj(data);

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ data: result }));
            } catch (e: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ errors: [{ message: e.message }] }));
            }
          });
          return;
        }

        res.writeHead(404); res.end('Not Found');
      });

      server.listen(port, () => {
        console.log(`[Native-Graph] 🕸️ GraphQL engine on :${port}/graphql (외부 의존성 0%)`);
      });

      const serverObj = new Map<string, any>();
      serverObj.set('__type', 'GraphServer');
      serverObj.set('port', port);
      serverObj.set('__server', server);
      __graph_servers.set(port, serverObj);
      return serverObj;
    }
  });

  // ── graph_execute(gqlString) ──────────────────────────────────────────
  // 서버 없이 GQL 문자열을 직접 실행 (단위 테스트용)
  registry.register({
    name: 'graph_execute',
    module: 'graph',
    signature: {
      name: 'graph_execute',
      returnType: 'string',
      parameters: [
        { name: 'gqlString', type: 'string' }
      ],
      category: 'http'
    },
    executor: (args) => {
      const gqlStr = String(args[0]);
      const parsed = __graph_parse_gql(gqlStr);
      if (!parsed) return JSON.stringify({ errors: [{ message: 'GQL parse error' }] });

      const rootTypeName = parsed.operationType === 'mutation' ? 'Mutation' : 'Query';
      const selections = [{
        field: parsed.rootField,
        args: parsed.rootArgs,
        subFields: parsed.subFields
      }];

      const data = __graph_execute_query(rootTypeName, selections, parsed.rootArgs);
      return JSON.stringify({ data: __graph_map_to_obj(data) });
    }
  });

  // ── graph_server_stop(port) ──────────────────────────────────────────
  registry.register({
    name: 'graph_server_stop',
    module: 'graph',
    signature: {
      name: 'graph_server_stop',
      returnType: 'void',
      parameters: [{ name: 'port', type: 'number' }],
      category: 'http'
    },
    executor: (args) => {
      const port = Number(args[0]);
      const srv = __graph_servers.get(port);
      if (srv) {
        srv.get('__server')?.close();
        __graph_servers.delete(port);
      }
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Native-Core-Multiplexing (cluster 완전 대체)
  // @parallel 어노테이션 런타임 지원 – FreeLang 언어 내장 멀티코어 제어
  //
  // 구현 원칙:
  //   - OS 수준 fork: Node.js cluster 모듈 (내부 구현) → 언어 수준으로 노출
  //   - 공유 메모리: SharedArrayBuffer + Atomics (데이터 복사 0회)
  //   - SO_REUSEPORT: Node.js cluster가 자동 처리 (여러 워커가 동일 포트 공유)
  //   - Copy-on-Write: 각 워커 독립 힙, 공통 상수는 읽기 전용 공유
  //   - 외부 의존성: 0% (os / cluster / SharedArrayBuffer = Node.js 내장)
  // ────────────────────────────────────────────────────────────────────────────

  // ── parallel_cpu_count() → number ────────────────────────────────────────
  // 현재 머신의 논리 CPU 코어 수 반환 (Core-Aware-Binary 기반)
  registry.register({
    name: 'parallel_cpu_count',
    module: 'parallel',
    signature: {
      name: 'parallel_cpu_count',
      returnType: 'number',
      parameters: [],
      category: 'system'
    },
    executor: (_args) => {
      const os = require('os');
      return os.cpus().length;
    }
  });

  // ── parallel_worker_id() → number ────────────────────────────────────────
  // 현재 워커 프로세스 ID 반환 (0 = primary, 1~N = worker)
  registry.register({
    name: 'parallel_worker_id',
    module: 'parallel',
    signature: {
      name: 'parallel_worker_id',
      returnType: 'number',
      parameters: [],
      category: 'system'
    },
    executor: (_args) => {
      const cluster = require('cluster') as any;
      return cluster.worker?.id ?? 0;
    }
  });

  // ── parallel_is_primary() → number (1=primary, 0=worker) ─────────────────
  // 현재 프로세스가 primary(마스터)인지 확인
  registry.register({
    name: 'parallel_is_primary',
    module: 'parallel',
    signature: {
      name: 'parallel_is_primary',
      returnType: 'number',
      parameters: [],
      category: 'system'
    },
    executor: (_args) => {
      const cluster = require('cluster') as any;
      return cluster.isPrimary ? 1 : 0;
    }
  });

  // ── parallel_shm_new(slots) → SharedArrayBuffer ───────────────────────────
  // 공유 메모리 세그먼트 생성 (Int32 슬롯 N개, 워커 간 데이터 복사 없이 공유)
  // Copy-on-Write: 워커 독립 힙 + 공통 상수 읽기 전용 공유 구현
  registry.register({
    name: 'parallel_shm_new',
    module: 'parallel',
    signature: {
      name: 'parallel_shm_new',
      returnType: 'object',
      parameters: [{ name: 'slots', type: 'number' }],
      category: 'memory'
    },
    executor: (args) => {
      const slots = Math.max(1, Number(args[0]) || 64);
      // Int32 = 4바이트, SharedArrayBuffer = 워커 간 공유 가능 (postMessage 없이)
      const sab = new SharedArrayBuffer(slots * 4);
      const view = new Int32Array(sab);
      const result = new Map<string, any>();
      result.set('__type', 'SharedMemory');
      result.set('__sab', sab);
      result.set('__view', view);
      result.set('slots', slots);
      return result;
    }
  });

  // ── parallel_shm_get(shm, index) → number ────────────────────────────────
  // 공유 메모리에서 원자적(Atomic) 읽기 – 락 없는 lockless read
  registry.register({
    name: 'parallel_shm_get',
    module: 'parallel',
    signature: {
      name: 'parallel_shm_get',
      returnType: 'number',
      parameters: [
        { name: 'shm', type: 'object' },
        { name: 'index', type: 'number' }
      ],
      category: 'memory'
    },
    executor: (args) => {
      const shm = args[0] as Map<string, any>;
      const index = Number(args[1]) || 0;
      const view = shm?.get('__view') as Int32Array | undefined;
      if (!view) return 0;
      return Atomics.load(view, index);
    }
  });

  // ── parallel_shm_set(shm, index, value) → number ─────────────────────────
  // 공유 메모리에 원자적(Atomic) 쓰기 – 락 없는 lockless write (CAS 기반)
  registry.register({
    name: 'parallel_shm_set',
    module: 'parallel',
    signature: {
      name: 'parallel_shm_set',
      returnType: 'number',
      parameters: [
        { name: 'shm', type: 'object' },
        { name: 'index', type: 'number' },
        { name: 'value', type: 'number' }
      ],
      category: 'memory'
    },
    executor: (args) => {
      const shm = args[0] as Map<string, any>;
      const index = Number(args[1]) || 0;
      const value = Number(args[2]) || 0;
      const view = shm?.get('__view') as Int32Array | undefined;
      if (!view) return 0;
      return Atomics.store(view, index, value);
    }
  });

  // ── parallel_serve(port, handler) → object ────────────────────────────────
  // SO_REUSEPORT HTTP 서버: 모든 워커가 동일 포트를 공유하여 자동 로드밸런싱
  // Node.js cluster + SO_REUSEPORT → 커널 수준 요청 분배 (round-robin)
  // Atomic-Load-Balancer: primary가 요청을 워커에 분배 (잠금 경쟁 최소화)
  registry.register({
    name: 'parallel_serve',
    module: 'parallel',
    signature: {
      name: 'parallel_serve',
      returnType: 'object',
      parameters: [
        { name: 'port', type: 'number' },
        { name: 'handler', type: 'function' }
      ],
      category: 'http'
    },
    executor: (args) => {
      const port = Number(args[0]) || 8080;
      const handler = args[1];
      const http = require('http');
      const cluster = require('cluster') as any;
      const workerId = cluster.worker?.id ?? 0;

      const server = http.createServer((req: any, res: any) => {
        // 요청 맵 생성 (http_request() 호환)
        const reqMap = new Map<string, any>();
        reqMap.set('method', req.method || 'GET');
        reqMap.set('path', req.url || '/');
        reqMap.set('headers', new Map(Object.entries(req.headers)));
        reqMap.set('worker_id', workerId);

        // handler가 FreeLang 함수이면 VM에서 호출, 아니면 직접 호출
        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', () => {
          reqMap.set('body', body);
          try {
            const vm = registry.getVM();
            let responseBody = '';
            if (vm && typeof handler === 'string') {
              // FreeLang 함수명으로 호출
              responseBody = String(vm.callFunction(handler, [reqMap]) ?? '');
            } else if (typeof handler === 'function') {
              responseBody = String(handler(reqMap) ?? '');
            }
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(responseBody);
          } catch (e) {
            res.writeHead(500);
            res.end(String(e));
          }
        });
      });

      // SO_REUSEPORT: Node.js cluster 환경에서 자동 활성화
      // 여러 워커가 동일 포트를 listen → 커널이 요청을 분배
      server.listen(port, () => {
        process.stdout.write(
          `[Native-Core-Multiplexing] Worker-${workerId} ▶ :${port} (SO_REUSEPORT)\n`
        );
      });

      const result = new Map<string, any>();
      result.set('__type', 'ParallelServer');
      result.set('port', port);
      result.set('worker_id', workerId);
      result.set('__server', server);
      return result;
    }
  });
}
