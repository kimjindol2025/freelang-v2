/**
 * FreeLang v2 - Native-Proxy-Tunnel
 * http-proxy-middleware 완전 대체 (외부 npm 0개)
 *
 * 구현:
 *   proxy_forward(target, req_map)   → Map  (실제 HTTP/HTTPS 포워딩)
 *   proxy_create(target, options)    → Object (프록시 설정 객체)
 *   proxy_route_add(path, target)    → string (경로 라우트 등록)
 *   proxy_route_resolve(path)        → string (타겟 URL 조회)
 *   proxy_health_check(target)       → Map  (타겟 헬스 체크)
 *   proxy_stats()                    → Map  (프록시 통계)
 *
 * 설계:
 *   - Node.js 내장 http/https 모듈만 사용 (npm 패키지 0개)
 *   - hop-by-hop 헤더 자동 제거 (connection, upgrade, keep-alive)
 *   - X-Forwarded-By 헤더 자동 주입
 *   - @proxy_to 어노테이션 → runner.ts에서 proxyRouteTable 자동 등록
 */

import { NativeFunctionRegistry } from '../vm/native-function-registry';
import * as http from 'http';
import * as https from 'https';

// ─── 내부 상태 ───────────────────────────────────────────────────────────────

/** 포워딩 통계 */
const proxyStats = {
  total: 0,
  success: 0,
  errors: 0,
  bytesForwarded: 0,
  lastError: ''
};

/** proxy_set_header로 추가되는 커스텀 헤더 */
const customProxyHeaders = new Map<string, string>();

/** @proxy_to / proxy_route_add로 등록되는 경로→타겟 테이블 */
export const proxyRouteTable = new Map<string, string>();

// hop-by-hop 헤더 목록 (RFC 7230 §6.1)
const HOP_BY_HOP = new Set([
  'connection', 'upgrade', 'keep-alive', 'proxy-authenticate',
  'proxy-authorization', 'te', 'trailer', 'transfer-encoding'
]);

// ─── 내부 포워딩 로직 ────────────────────────────────────────────────────────

function buildProxyOptions(
  parsedTarget: URL,
  method: string,
  reqPath: string,
  headers: Record<string, string>
): http.RequestOptions {
  const isHttps = parsedTarget.protocol === 'https:';
  const port = parsedTarget.port
    ? Number(parsedTarget.port)
    : isHttps ? 443 : 80;

  // 경로 조합: 타겟 base path + 요청 경로
  const basePath = parsedTarget.pathname.replace(/\/$/, '');
  const normalizedPath = reqPath.startsWith('/') ? reqPath : '/' + reqPath;
  const fullPath = basePath + normalizedPath;

  return {
    hostname: parsedTarget.hostname,
    port,
    path: fullPath || '/',
    method,
    headers,
    timeout: 30000
  };
}

function doForward(
  targetBase: string,
  method: string,
  reqPath: string,
  headers: Record<string, string>,
  bodyBuf: Buffer | null
): Promise<Map<string, any>> {
  return new Promise<Map<string, any>>((resolve) => {
    let parsedTarget: URL;
    try {
      parsedTarget = new URL(targetBase);
    } catch {
      const r = new Map<string, any>();
      r.set('ok', false);
      r.set('status', 400);
      r.set('body', `{"ok":false,"error":"Invalid proxy target: ${targetBase}"}`);
      resolve(r);
      return;
    }

    const isHttps = parsedTarget.protocol === 'https:';
    const transport: typeof http | typeof https = isHttps ? https : http;
    const options = buildProxyOptions(parsedTarget, method, reqPath, headers);

    proxyStats.total++;

    const proxyReq = transport.request(options, (proxyRes) => {
      const chunks: Buffer[] = [];
      proxyRes.on('data', (chunk: Buffer) => chunks.push(chunk));
      proxyRes.on('end', () => {
        const body = Buffer.concat(chunks);
        proxyStats.success++;
        proxyStats.bytesForwarded += body.length;

        const resHeaders = new Map<string, string>();
        Object.entries(proxyRes.headers || {}).forEach(([k, v]) => {
          if (!HOP_BY_HOP.has(k)) resHeaders.set(k, String(v));
        });

        const r = new Map<string, any>();
        r.set('ok', true);
        r.set('status', proxyRes.statusCode || 200);
        r.set('body', body.toString('utf-8'));
        r.set('headers', resHeaders);
        resolve(r);
      });
    });

    proxyReq.on('error', (err: Error) => {
      proxyStats.errors++;
      proxyStats.lastError = err.message;
      const r = new Map<string, any>();
      r.set('ok', false);
      r.set('status', 502);
      r.set('body', JSON.stringify({ ok: false, error: err.message }));
      r.set('headers', new Map());
      resolve(r);
    });

    if (bodyBuf && bodyBuf.length > 0) proxyReq.write(bodyBuf);
    proxyReq.end();
  });
}

// ─── 공개 헬퍼: 응답 처리부(stdlib-builtins.ts)에서 직접 포워딩할 때 사용 ──

/**
 * `{ type: 'proxy', target: string }` 응답 객체를 받아
 * 실제 Node.js http.request로 포워딩한다.
 * stdlib-builtins.ts의 응답 처리 콜백 내에서 호출된다.
 */
export function handleProxyResponse(
  proxyConfig: { target: string; preservePath?: boolean; passHeaders?: boolean },
  nodeReq: http.IncomingMessage,
  nodeRes: http.ServerResponse,
  requestBody: Buffer
): void {
  const method = nodeReq.method || 'GET';
  const reqUrl = nodeReq.url || '/';

  const headers: Record<string, string> = {};
  if (proxyConfig.passHeaders !== false) {
    Object.entries(nodeReq.headers || {}).forEach(([k, v]) => {
      if (!HOP_BY_HOP.has(k)) headers[k] = String(v);
    });
  }
  // 커스텀 헤더 오버레이
  customProxyHeaders.forEach((v, k) => { headers[k] = v; });
  headers['x-forwarded-by'] = 'FreeLang-Native-Proxy-Tunnel';
  headers['x-forwarded-for'] = (nodeReq.socket as any)?.remoteAddress || '';
  headers['x-forwarded-host'] = nodeReq.headers['host'] || '';
  delete headers['host'];

  if (requestBody && requestBody.length > 0) {
    headers['content-length'] = String(requestBody.length);
  } else {
    delete headers['content-length'];
  }

  const targetPath = proxyConfig.preservePath !== false ? reqUrl : '/';

  doForward(proxyConfig.target, method, targetPath, headers, requestBody.length > 0 ? requestBody : null)
    .then((result) => {
      const status = Number(result.get('status') || 200);
      const body = String(result.get('body') || '');
      const resHeaders: Record<string, string> = {};
      const rh = result.get('headers');
      if (rh instanceof Map) rh.forEach((v: string, k: string) => { resHeaders[k] = v; });
      nodeRes.writeHead(status, resHeaders);
      nodeRes.end(body);
    });
}

// ─── 네이티브 함수 등록 ───────────────────────────────────────────────────────

export function registerProxyTunnelFunctions(registry: NativeFunctionRegistry): void {

  // proxy_forward(target, req_map) → Map
  // FreeLang 코드에서 직접 호출: let result = proxy_forward("http://backend:3000", http_request())
  registry.register({
    name: 'proxy_forward',
    module: 'proxy',
    executor: (args) => {
      const targetBase = String(args[0] || '');
      const reqMap = args[1] instanceof Map ? (args[1] as Map<string, any>) : null;

      const method = reqMap ? String(reqMap.get('method') || 'GET') : 'GET';
      const reqPath = reqMap ? String(reqMap.get('url') || reqMap.get('path') || '/') : '/';
      const bodyRaw = reqMap ? reqMap.get('body') : null;
      const bodyBuf = bodyRaw
        ? (Buffer.isBuffer(bodyRaw) ? bodyRaw : Buffer.from(String(bodyRaw), 'utf-8'))
        : null;

      const headers: Record<string, string> = {};
      const reqHeaders = reqMap ? reqMap.get('headers') : null;
      if (reqHeaders instanceof Map) {
        (reqHeaders as Map<string, string>).forEach((v, k) => {
          if (!HOP_BY_HOP.has(k.toLowerCase())) headers[k.toLowerCase()] = String(v);
        });
      }
      delete headers['host'];
      customProxyHeaders.forEach((v, k) => { headers[k] = v; });
      headers['x-forwarded-by'] = 'FreeLang-Native-Proxy-Tunnel';

      if (bodyBuf && bodyBuf.length > 0) headers['content-length'] = String(bodyBuf.length);

      return doForward(targetBase, method, reqPath, headers, bodyBuf);
    }
  });

  // proxy_create(target, options?) → Object
  // 응답으로 반환하면 stdlib-builtins.ts가 감지해 직접 포워딩
  registry.register({
    name: 'proxy_create',
    module: 'proxy',
    executor: (args) => {
      const target = String(args[0] || '');
      const opts = args[1] instanceof Map ? (args[1] as Map<string, any>) : new Map();
      return {
        type: 'proxy',
        target,
        preservePath: opts.get('preserve_path') !== false,
        passHeaders: opts.get('pass_headers') !== false,
        timeout: Number(opts.get('timeout') || 30000)
      };
    }
  });

  // proxy_route_add(path_prefix, target) → string
  registry.register({
    name: 'proxy_route_add',
    module: 'proxy',
    executor: (args) => {
      const prefix = String(args[0] || '/');
      const target = String(args[1] || '');
      proxyRouteTable.set(prefix, target);
      return `proxy_route_added:${prefix}→${target}`;
    }
  });

  // proxy_route_resolve(path) → string (longest-prefix-match)
  registry.register({
    name: 'proxy_route_resolve',
    module: 'proxy',
    executor: (args) => {
      const reqPath = String(args[0] || '/');
      let matched = '';
      let matchedLen = 0;
      proxyRouteTable.forEach((target, prefix) => {
        if (reqPath.startsWith(prefix) && prefix.length > matchedLen) {
          matched = target;
          matchedLen = prefix.length;
        }
      });
      return matched;
    }
  });

  // proxy_health_check(target) → Map
  registry.register({
    name: 'proxy_health_check',
    module: 'proxy',
    executor: (args) => {
      const target = String(args[0] || '');
      let parsedTarget: URL;
      try {
        parsedTarget = new URL(target);
      } catch {
        const r = new Map<string, any>();
        r.set('ok', false); r.set('error', 'invalid url'); r.set('latency_ms', 0);
        return r;
      }
      const isHttps = parsedTarget.protocol === 'https:';
      const transport: typeof http | typeof https = isHttps ? https : http;
      const start = Date.now();

      return new Promise<Map<string, any>>((resolve) => {
        const req = transport.request({
          hostname: parsedTarget.hostname,
          port: parsedTarget.port ? Number(parsedTarget.port) : (isHttps ? 443 : 80),
          path: parsedTarget.pathname || '/',
          method: 'HEAD',
          timeout: 3000
        }, (res) => {
          res.resume();
          const r = new Map<string, any>();
          r.set('ok', (res.statusCode || 0) < 500);
          r.set('status', res.statusCode || 0);
          r.set('latency_ms', Date.now() - start);
          r.set('target', target);
          resolve(r);
        });
        req.on('error', (err: Error) => {
          const r = new Map<string, any>();
          r.set('ok', false);
          r.set('error', err.message);
          r.set('latency_ms', Date.now() - start);
          r.set('target', target);
          resolve(r);
        });
        req.end();
      });
    }
  });

  // proxy_stats() → Map
  registry.register({
    name: 'proxy_stats',
    module: 'proxy',
    executor: (_args) => {
      const r = new Map<string, any>();
      r.set('total', proxyStats.total);
      r.set('success', proxyStats.success);
      r.set('errors', proxyStats.errors);
      r.set('bytes_forwarded', proxyStats.bytesForwarded);
      r.set('last_error', proxyStats.lastError);
      r.set('routes', proxyRouteTable.size);
      return r;
    }
  });
}
