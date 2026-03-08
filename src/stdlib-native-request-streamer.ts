/**
 * FreeLang v2 - Native-Request-Streamer
 *
 * Node.js net/tls 모듈로 raw TCP 직접 구현.
 * 외부 HTTP 라이브러리 0개.
 *
 * 핵심 구조:
 *   ConnectionPool  - keep-alive TCP 소켓 재사용
 *   HeaderTemplate  - 호스트당 헤더 바이너리 1회 컴파일
 *   ResponseParser  - 버퍼 직접 파싱 (중간 객체 최소화)
 *   AutoResilience  - 소켓 레벨 타임아웃 + 자동 재시도
 */

import * as net from 'net';
import * as tls from 'tls';
import { NativeFunctionRegistry } from './vm/native-function-registry';

// ─── 타입 ────────────────────────────────────────────────────────────────────

interface ParsedUrl {
  protocol: 'http' | 'https';
  host: string;
  port: number;
  path: string;
}

interface NativeResponse {
  status: number;
  statusText: string;
  headers: Map<string, string>;
  body: string;
  latencyMs: number;
}

interface PooledSocket {
  socket: net.Socket | tls.TLSSocket;
  host: string;
  port: number;
  secure: boolean;
  lastUsed: number;
  inUse: boolean;
}

// ─── URL 파서 (외부 URL 모듈 미사용) ─────────────────────────────────────────

function parseUrl(raw: string): ParsedUrl {
  const m = raw.match(/^(https?):\/\/([^/:]+)(?::(\d+))?(\/.*)?$/);
  if (!m) throw new Error(`invalid url: ${raw}`);
  const protocol = m[1] as 'http' | 'https';
  const host = m[2];
  const port = m[3] ? parseInt(m[3]) : (protocol === 'https' ? 443 : 80);
  const path = m[4] || '/';
  return { protocol, host, port, path };
}

// ─── Pre-compiled Header Template ────────────────────────────────────────────
// 호스트당 1회 계산, 이후 method/path/body-len만 교체

const headerTemplateCache = new Map<string, Buffer>();

function buildRequestBuffer(
  method: string,
  url: ParsedUrl,
  extraHeaders: Record<string, string>,
  body: string
): Buffer {
  const bodyBuf = Buffer.from(body, 'utf8');
  // 표준 포트(80/443)는 Host 헤더에서 생략 (RFC 7230 §5.4)
  const isDefaultPort = (url.protocol === 'http' && url.port === 80) ||
                        (url.protocol === 'https' && url.port === 443);
  const hostKey = isDefaultPort ? url.host : `${url.host}:${url.port}`;

  // 기본 헤더 라인들 조립
  const lines: string[] = [
    `${method} ${url.path} HTTP/1.1`,
    `Host: ${hostKey}`,
    `Connection: keep-alive`,
    `User-Agent: FreeLang-Native/2.0`,
    `Accept: */*`,
  ];

  // Content-Length는 바디가 있을 때만 전송 (GET/HEAD에 0 전송 시 일부 서버 400 반환)
  if (bodyBuf.length > 0) {
    lines.push(`Content-Length: ${bodyBuf.length}`);
  }

  if (body && !extraHeaders['Content-Type']) {
    lines.push('Content-Type: application/json');
  }

  for (const [k, v] of Object.entries(extraHeaders)) {
    lines.push(`${k}: ${v}`);
  }

  lines.push('', ''); // CRLF CRLF (빈 줄 두 개 → \r\n\r\n)
  const header = lines.join('\r\n'); // 이미 CRLF 구분자 사용, 추가 replace 불필요
  return Buffer.concat([Buffer.from(header, 'ascii'), bodyBuf]);
}

// ─── HTTP/1.1 응답 파서 (순수 Buffer 연산) ───────────────────────────────────

function parseHttpResponse(buf: Buffer): NativeResponse {
  // 헤더/바디 분리
  const sep = buf.indexOf('\r\n\r\n');
  const headerRaw = sep >= 0 ? buf.slice(0, sep).toString('ascii') : buf.toString('ascii');
  const bodyBuf   = sep >= 0 ? buf.slice(sep + 4) : Buffer.alloc(0);

  const headerLines = headerRaw.split('\r\n');
  const statusLine  = headerLines[0] || '';
  const sm = statusLine.match(/HTTP\/1\.[01] (\d+) (.*)/);
  const status     = sm ? parseInt(sm[1]) : 0;
  const statusText = sm ? sm[2] : '';

  const headers = new Map<string, string>();
  for (let i = 1; i < headerLines.length; i++) {
    const colon = headerLines[i].indexOf(':');
    if (colon > 0) {
      const k = headerLines[i].slice(0, colon).trim().toLowerCase();
      const v = headerLines[i].slice(colon + 1).trim();
      headers.set(k, v);
    }
  }

  // chunked transfer-encoding 디코딩
  let body: string;
  if (headers.get('transfer-encoding') === 'chunked') {
    body = decodeChunked(bodyBuf);
  } else {
    body = bodyBuf.toString('utf8');
  }

  return { status, statusText, headers, body, latencyMs: 0 };
}

function decodeChunked(buf: Buffer): string {
  const parts: Buffer[] = [];
  let offset = 0;
  while (offset < buf.length) {
    const nl = buf.indexOf('\r\n', offset);
    if (nl < 0) break;
    const sizeLine = buf.slice(offset, nl).toString('ascii').trim();
    const chunkSize = parseInt(sizeLine, 16);
    if (isNaN(chunkSize) || chunkSize === 0) break;
    offset = nl + 2;
    parts.push(buf.slice(offset, offset + chunkSize));
    offset += chunkSize + 2; // skip trailing \r\n
  }
  return Buffer.concat(parts).toString('utf8');
}

// ─── ConnectionPool ──────────────────────────────────────────────────────────

const POOL_MAX        = 8;   // 호스트당 최대 소켓
const POOL_IDLE_MS    = 30_000; // 30초 유휴 후 제거
const DEFAULT_TIMEOUT = 10_000; // 기본 타임아웃 10초

class ConnectionPool {
  private pools = new Map<string, PooledSocket[]>();
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor() {
    // 유휴 소켓 주기적 제거
    this.cleanupTimer = setInterval(() => this.cleanup(), 15_000);
    if (this.cleanupTimer.unref) this.cleanupTimer.unref();
  }

  private key(host: string, port: number, secure: boolean) {
    return `${secure ? 'tls' : 'tcp'}:${host}:${port}`;
  }

  private acquire(host: string, port: number, secure: boolean): PooledSocket | null {
    const pool = this.pools.get(this.key(host, port, secure)) || [];
    for (const entry of pool) {
      if (!entry.inUse && !entry.socket.destroyed) {
        entry.inUse   = true;
        entry.lastUsed = Date.now();
        return entry;
      }
    }
    return null;
  }

  private release(entry: PooledSocket): void {
    entry.inUse    = false;
    entry.lastUsed = Date.now();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, pool] of this.pools) {
      const alive = pool.filter(e => {
        if (!e.inUse && now - e.lastUsed > POOL_IDLE_MS) {
          e.socket.destroy();
          return false;
        }
        return !e.socket.destroyed;
      });
      if (alive.length === 0) this.pools.delete(key);
      else this.pools.set(key, alive);
    }
  }

  private openSocket(host: string, port: number, secure: boolean): Promise<net.Socket | tls.TLSSocket> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`connect timeout ${host}:${port}`));
      }, DEFAULT_TIMEOUT);

      if (secure) {
        const s = tls.connect({ host, port, rejectUnauthorized: false }, () => {
          clearTimeout(timeout);
          resolve(s);
        });
        s.on('error', (e) => { clearTimeout(timeout); reject(e); });
      } else {
        const s = net.createConnection({ host, port }, () => {
          clearTimeout(timeout);
          resolve(s);
        });
        s.on('error', (e) => { clearTimeout(timeout); reject(e); });
      }
    });
  }

  async request(
    method: string,
    url: ParsedUrl,
    headers: Record<string, string>,
    body: string,
    timeoutMs = DEFAULT_TIMEOUT,
    retries = 2
  ): Promise<NativeResponse> {
    const { host, port, protocol } = url;
    const secure = protocol === 'https';
    const k      = this.key(host, port, secure);

    for (let attempt = 0; attempt <= retries; attempt++) {
      let poolEntry = this.acquire(host, port, secure);
      let freshSocket = false;

      if (!poolEntry) {
        // 새 소켓 생성
        const socket = await this.openSocket(host, port, secure);
        const entry: PooledSocket = { socket, host, port, secure, lastUsed: Date.now(), inUse: true };
        const pool = this.pools.get(k) || [];
        if (pool.length < POOL_MAX) {
          pool.push(entry);
          this.pools.set(k, pool);
        }
        poolEntry = entry;
        freshSocket = true;
      }

      void freshSocket; // 미사용 경고 억제

      try {
        const resp = await this.sendRequest(poolEntry.socket, method, url, headers, body, timeoutMs);
        this.release(poolEntry);
        return resp;
      } catch (err) {
        // 소켓 오류 → 파괴 후 재시도
        poolEntry.socket.destroy();
        const pool = this.pools.get(k) || [];
        this.pools.set(k, pool.filter(e => e !== poolEntry));
        if (attempt === retries) throw err;
      }
    }
    throw new Error('request failed after retries');
  }

  private sendRequest(
    socket: net.Socket | tls.TLSSocket,
    method: string,
    url: ParsedUrl,
    headers: Record<string, string>,
    body: string,
    timeoutMs: number
  ): Promise<NativeResponse> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const t0 = Date.now();

      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error(`request timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      const onData = (chunk: Buffer) => {
        chunks.push(chunk);
        const full = Buffer.concat(chunks);
        const sep  = full.indexOf('\r\n\r\n');
        if (sep < 0) return;

        const headerPart = full.slice(0, sep).toString('ascii');

        // HEAD/204/304는 바디 없음 → 헤더만 받으면 완료
        const statusMatch = headerPart.match(/HTTP\/1\.[01] (\d+)/);
        const statusCode  = statusMatch ? parseInt(statusMatch[1]) : 0;
        if (method === 'HEAD' || statusCode === 204 || statusCode === 304) {
          done(full);
          return;
        }

        const clMatch = headerPart.match(/content-length:\s*(\d+)/i);
        const teMatch = headerPart.match(/transfer-encoding:\s*chunked/i);

        if (clMatch) {
          const cl   = parseInt(clMatch[1]);
          const body = full.slice(sep + 4);
          if (body.length >= cl) done(full);
        } else if (teMatch) {
          // chunked: 마지막 chunk는 "0\r\n\r\n"
          if (full.indexOf('0\r\n\r\n') >= 0) done(full);
        }
      };

      const done = (buf: Buffer) => {
        clearTimeout(timer);
        socket.removeListener('data', onData);
        socket.removeListener('error', onError);
        socket.removeListener('end', onEnd);
        const resp = parseHttpResponse(buf);
        resp.latencyMs = Date.now() - t0;
        resolve(resp);
      };

      const onError = (err: Error) => {
        clearTimeout(timer);
        reject(err);
      };

      const onEnd = () => {
        clearTimeout(timer);
        if (chunks.length > 0) {
          const buf  = Buffer.concat(chunks);
          const resp = parseHttpResponse(buf);
          resp.latencyMs = Date.now() - t0;
          resolve(resp);
        } else {
          reject(new Error('connection closed before response'));
        }
      };

      socket.on('data', onData);
      socket.once('error', onError);
      socket.once('end', onEnd);

      const reqBuf = buildRequestBuffer(method, url, headers, body);
      socket.write(reqBuf);
    });
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
    for (const pool of this.pools.values()) {
      for (const e of pool) e.socket.destroy();
    }
    this.pools.clear();
  }
}

// 전역 풀 (프로세스 수명 동안 유지)
const globalPool = new ConnectionPool();

// ─── FreeLang 네이티브 함수 등록 ─────────────────────────────────────────────

export function registerNativeRequestStreamer(registry: NativeFunctionRegistry): void {

  // ── http_native_get(url) -> { status, body, latencyMs } ──
  registry.register({
    name: 'http_native_get',
    module: 'http',
    executor: async (args) => {
      const url = parseUrl(String(args[0]));
      const resp = await globalPool.request('GET', url, {}, '');
      const m = new Map<string, any>();
      m.set('status',    resp.status);
      m.set('body',      resp.body);
      m.set('latencyMs', resp.latencyMs);
      return m;
    }
  });

  // ── http_native_post(url, body, content_type?) -> { status, body, latencyMs } ──
  registry.register({
    name: 'http_native_post',
    module: 'http',
    executor: async (args) => {
      const url  = parseUrl(String(args[0]));
      const body = String(args[1] ?? '');
      const ct   = args[2] ? String(args[2]) : 'application/json';
      const resp = await globalPool.request('POST', url, { 'Content-Type': ct }, body);
      const m = new Map<string, any>();
      m.set('status',    resp.status);
      m.set('body',      resp.body);
      m.set('latencyMs', resp.latencyMs);
      return m;
    }
  });

  // ── http_native_put(url, body) -> { status, body, latencyMs } ──
  registry.register({
    name: 'http_native_put',
    module: 'http',
    executor: async (args) => {
      const url  = parseUrl(String(args[0]));
      const body = String(args[1] ?? '');
      const resp = await globalPool.request('PUT', url, { 'Content-Type': 'application/json' }, body);
      const m = new Map<string, any>();
      m.set('status',    resp.status);
      m.set('body',      resp.body);
      m.set('latencyMs', resp.latencyMs);
      return m;
    }
  });

  // ── http_native_delete(url) -> { status, body, latencyMs } ──
  registry.register({
    name: 'http_native_delete',
    module: 'http',
    executor: async (args) => {
      const url  = parseUrl(String(args[0]));
      const resp = await globalPool.request('DELETE', url, {}, '');
      const m = new Map<string, any>();
      m.set('status',    resp.status);
      m.set('body',      resp.body);
      m.set('latencyMs', resp.latencyMs);
      return m;
    }
  });

  // ── http_native_request(method, url, headers_map, body, timeout_ms?) ──
  registry.register({
    name: 'http_native_request',
    module: 'http',
    executor: async (args) => {
      const method    = String(args[0] ?? 'GET').toUpperCase();
      const url       = parseUrl(String(args[1]));
      const hdrsRaw   = args[2];
      const body      = String(args[3] ?? '');
      const timeoutMs = args[4] ? Number(args[4]) : DEFAULT_TIMEOUT;

      // headers: FreeLang Map 또는 plain object 모두 지원
      const headers: Record<string, string> = {};
      if (hdrsRaw instanceof Map) {
        for (const [k, v] of hdrsRaw) headers[String(k)] = String(v);
      } else if (hdrsRaw && typeof hdrsRaw === 'object') {
        for (const [k, v] of Object.entries(hdrsRaw)) headers[k] = String(v);
      }

      const resp = await globalPool.request(method, url, headers, body, timeoutMs);

      // 응답 headers를 FreeLang Map으로 변환
      const respHeaders = new Map<string, any>();
      for (const [k, v] of resp.headers) respHeaders.set(k, v);

      const m = new Map<string, any>();
      m.set('status',    resp.status);
      m.set('statusText', resp.statusText);
      m.set('headers',   respHeaders);
      m.set('body',      resp.body);
      m.set('latencyMs', resp.latencyMs);
      return m;
    }
  });

  // ── http_native_json(method, url, payload_map?) -> parsed JSON map ──
  registry.register({
    name: 'http_native_json',
    module: 'http',
    executor: async (args) => {
      const method  = String(args[0] ?? 'GET').toUpperCase();
      const url     = parseUrl(String(args[1]));
      const payload = args[2];

      let body = '';
      if (payload !== undefined && payload !== null) {
        body = JSON.stringify(payload instanceof Map ? Object.fromEntries(payload) : payload);
      }

      const resp = await globalPool.request(method, url, { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body);

      try {
        return JSON.parse(resp.body);
      } catch {
        return resp.body;
      }
    }
  });

  // ── http_native_pool_stats() -> { total_sockets, in_use, idle } ──
  registry.register({
    name: 'http_native_pool_stats',
    module: 'http',
    executor: () => {
      const pool = (globalPool as any).pools as Map<string, PooledSocket[]>;
      let total = 0, inUse = 0, idle = 0;
      for (const entries of pool.values()) {
        for (const e of entries) {
          if (e.socket.destroyed) continue;
          total++;
          if (e.inUse) inUse++; else idle++;
        }
      }
      const m = new Map<string, any>();
      m.set('total_sockets', total);
      m.set('in_use',        inUse);
      m.set('idle',          idle);
      return m;
    }
  });

  // ── http_native_ping(url) -> latencyMs or -1 on failure ──
  registry.register({
    name: 'http_native_ping',
    module: 'http',
    executor: async (args) => {
      try {
        const url  = parseUrl(String(args[0]));
        const resp = await globalPool.request('HEAD', url, {}, '', 5_000, 0);
        return resp.latencyMs;
      } catch {
        return -1;
      }
    }
  });

  // ── http_native_batch(requests_list) -> list of responses ──
  // requests_list: FreeLang list of [method, url, headers, body]
  registry.register({
    name: 'http_native_batch',
    module: 'http',
    executor: async (args) => {
      const list = args[0];
      if (!Array.isArray(list)) return [];

      const promises = list.map(async (item: any) => {
        const method  = String(item[0] ?? 'GET').toUpperCase();
        const url     = parseUrl(String(item[1]));
        const hdrsRaw = item[2];
        const body    = String(item[3] ?? '');

        const headers: Record<string, string> = {};
        if (hdrsRaw instanceof Map) {
          for (const [k, v] of hdrsRaw) headers[String(k)] = String(v);
        }

        try {
          const resp = await globalPool.request(method, url, headers, body);
          const m = new Map<string, any>();
          m.set('status',    resp.status);
          m.set('body',      resp.body);
          m.set('latencyMs', resp.latencyMs);
          m.set('error',     null);
          return m;
        } catch (err: any) {
          const m = new Map<string, any>();
          m.set('status',    0);
          m.set('body',      '');
          m.set('latencyMs', -1);
          m.set('error',     String(err.message));
          return m;
        }
      });

      return Promise.all(promises);
    }
  });
}

// 프로세스 종료 시 소켓 정리
process.on('exit', () => globalPool.destroy());
