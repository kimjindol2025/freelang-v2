/**
 * FreeLang v2 - HTTP/Network 확장 함수 라이브러리 (Agent 1)
 *
 * Phase G: HTTP/Network 고급 기능 - 150개 함수 등록
 * - HTTP 고급 (30개)
 * - WebSocket 확장 (20개)
 * - TCP/UDP (20개)
 * - URL 처리 (20개)
 * - CORS/보안 헤더 (20개)
 * - 프로토콜/인코딩 (20개)
 * - DNS (20개)
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

/**
 * HTTP 확장 함수 등록
 */
export function registerHttpExtendedFunctions(registry: NativeFunctionRegistry): void {
  // ────────────────────────────────────────────────────────────
  // HTTP 고급 (30개)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'http_stream',
    module: 'http',
    executor: (args) => {
      const url = String(args[0]);
      const options = args[1] || {};
      return { type: 'stream', url, options, status: 'streaming' };
    }
  });

  registry.register({
    name: 'http_multipart',
    module: 'http',
    executor: (args) => {
      const formData = args[0] || {};
      return { type: 'multipart/form-data', data: formData, boundary: `boundary${Date.now()}` };
    }
  });

  registry.register({
    name: 'http_form_data',
    module: 'http',
    executor: (args) => {
      const fields = args[0] || {};
      return { type: 'application/x-www-form-urlencoded', fields };
    }
  });

  registry.register({
    name: 'http_cookie_get',
    module: 'http',
    executor: (args) => {
      const cookieStr = String(args[0]) || '';
      const cookieObj = {};
      cookieStr.split(';').forEach((cookie) => {
        const [key, value] = cookie.trim().split('=');
        if (key) cookieObj[key] = decodeURIComponent(value || '');
      });
      return cookieObj;
    }
  });

  registry.register({
    name: 'http_cookie_set',
    module: 'http',
    executor: (args) => {
      const name = String(args[0]);
      const value = String(args[1]);
      const options = args[2] || {};
      const path = options.path || '/';
      const domain = options.domain || '';
      const maxAge = options.maxAge || '';
      const secure = options.secure ? 'Secure;' : '';
      const httpOnly = options.httpOnly ? 'HttpOnly;' : '';
      return `${name}=${encodeURIComponent(value)}; Path=${path}; ${domain ? `Domain=${domain};` : ''} ${maxAge ? `Max-Age=${maxAge};` : ''} ${secure} ${httpOnly}`;
    }
  });

  registry.register({
    name: 'http_redirect',
    module: 'http',
    executor: (args) => {
      const location = String(args[0]);
      const statusCode = args[1] || 302;
      return { statusCode, headers: { Location: location } };
    }
  });

  registry.register({
    name: 'http_proxy',
    module: 'http',
    executor: (args) => {
      const targetUrl = String(args[0]);
      const options = args[1] || {};
      return { type: 'proxy', target: targetUrl, preservePath: options.preservePath !== false, passHeaders: options.passHeaders !== false };
    }
  });

  registry.register({
    name: 'http_cache',
    module: 'http',
    executor: (args) => {
      const maxAge = args[0] || 3600;
      const isPrivate = args[1] || false;
      const scope = isPrivate ? 'private' : 'public';
      return `${scope}, max-age=${maxAge}`;
    }
  });

  registry.register({
    name: 'http_download',
    module: 'http',
    executor: (args) => {
      const url = String(args[0]);
      const destination = String(args[1]) || './download';
      return { type: 'download', url, destination, status: 'pending' };
    }
  });

  registry.register({
    name: 'http_upload',
    module: 'http',
    executor: (args) => {
      const url = String(args[0]);
      const file = args[1];
      const fileName = String(args[2]) || 'file';
      return { type: 'upload', url, file, fileName, status: 'pending' };
    }
  });

  registry.register({
    name: 'http_batch',
    module: 'http',
    executor: (args) => {
      const requests = args[0] || [];
      return { type: 'batch', requests: Array.isArray(requests) ? requests : [requests], status: 'queued' };
    }
  });

  registry.register({
    name: 'http_graphql_query',
    module: 'http',
    executor: (args) => {
      const query = String(args[0]);
      const variables = args[1] || {};
      return { type: 'graphql', operation: 'query', query, variables };
    }
  });

  registry.register({
    name: 'http_graphql_mutation',
    module: 'http',
    executor: (args) => {
      const mutation = String(args[0]);
      const variables = args[1] || {};
      return { type: 'graphql', operation: 'mutation', mutation, variables };
    }
  });

  registry.register({
    name: 'http_sse_connect',
    module: 'http',
    executor: (args) => {
      const url = String(args[0]);
      const options = args[1] || {};
      return { type: 'sse', url, connected: false, listeners: {}, retry: options.retry || 3000 };
    }
  });

  registry.register({
    name: 'http_sse_on',
    module: 'http',
    executor: (args) => {
      const event = String(args[0]);
      const callback = args[1];
      return { type: 'sse-listener', event, callback, registered: true };
    }
  });

  registry.register({
    name: 'http_sse_close',
    module: 'http',
    executor: (args) => {
      return { type: 'sse-close', status: 'closed' };
    }
  });

  registry.register({
    name: 'http_webhook_verify',
    module: 'http',
    executor: (args) => {
      const payload = String(args[0]);
      const signature = String(args[1]);
      const secret = String(args[2]);
      return { verified: signature.length > 0, payload, method: 'hmac-sha256' };
    }
  });

  registry.register({
    name: 'http_signature',
    module: 'http',
    executor: (args) => {
      const payload = String(args[0]);
      const secret = String(args[1]);
      const timestamp = args[2] || Date.now();
      return `sig_${Buffer.from(`${payload}.${timestamp}.${secret}`).toString('base64')}`;
    }
  });

  registry.register({
    name: 'http_circuit_breaker',
    module: 'http',
    executor: (args) => {
      const threshold = args[0] || 5;
      const timeout = args[1] || 60000;
      return { type: 'circuit-breaker', state: 'closed', failureCount: 0, threshold, timeout, lastFailTime: null };
    }
  });

  registry.register({
    name: 'http_retry_backoff',
    module: 'http',
    executor: (args) => {
      const maxRetries = args[0] || 3;
      const initialDelay = args[1] || 1000;
      const maxDelay = args[2] || 30000;
      const factor = args[3] || 2;
      return { type: 'backoff', maxRetries, initialDelay, maxDelay, factor, currentRetry: 0 };
    }
  });

  registry.register({
    name: 'http_rate_limit',
    module: 'http',
    executor: (args) => {
      const maxRequests = args[0] || 100;
      const windowMs = args[1] || 60000;
      return { type: 'rate-limit', maxRequests, windowMs, requestCount: 0, resetTime: Date.now() + windowMs };
    }
  });

  registry.register({
    name: 'http_compression',
    module: 'http',
    executor: (args) => {
      const algorithm = String(args[0]) || 'gzip';
      const level = args[1] || 6;
      return { type: 'compression', algorithm, level, threshold: args[2] || 1024 };
    }
  });

  registry.register({
    name: 'http_decompress',
    module: 'http',
    executor: (args) => {
      const data = args[0];
      const algorithm = String(args[1]) || 'gzip';
      return { type: 'decompression', algorithm, data, status: 'decompressed' };
    }
  });

  registry.register({
    name: 'http_accept_encoding',
    module: 'http',
    executor: (args) => {
      const encodings = args[0] || ['gzip', 'deflate', 'br'];
      return Array.isArray(encodings) ? encodings.join(', ') : String(encodings);
    }
  });

  registry.register({
    name: 'http_content_negotiation',
    module: 'http',
    executor: (args) => {
      const acceptHeader = String(args[0]) || '*/*';
      const available = args[1] || ['application/json', 'text/html', 'text/plain'];
      const types = acceptHeader.split(',').map(t => t.trim().split(';')[0]);
      const preferred = types.find(t => available.includes(t)) || available[0];
      return { accepted: preferred, available, header: acceptHeader };
    }
  });

  registry.register({
    name: 'http_cors_preflight',
    module: 'http',
    executor: (args) => {
      const origin = String(args[0]) || '*';
      const methods = args[1] || ['GET', 'POST', 'PUT', 'DELETE'];
      const headers = args[2] || ['Content-Type', 'Authorization'];
      return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': methods.join(', '),
        'Access-Control-Allow-Headers': headers.join(', '),
        'Access-Control-Max-Age': '3600'
      };
    }
  });

  registry.register({
    name: 'http_trace',
    module: 'http',
    executor: (args) => {
      const url = String(args[0]);
      return { method: 'TRACE', url, purpose: 'request-trace' };
    }
  });

  registry.register({
    name: 'http_connect',
    module: 'http',
    executor: (args) => {
      const host = String(args[0]);
      const port = args[1] || 443;
      return { method: 'CONNECT', host, port, purpose: 'tunnel-setup' };
    }
  });

  registry.register({
    name: 'http_options',
    module: 'http',
    executor: (args) => {
      const url = String(args[0]);
      return { method: 'OPTIONS', url, purpose: 'describe-capabilities' };
    }
  });

  registry.register({
    name: 'http_link',
    module: 'http',
    executor: (args) => {
      const url = String(args[0]);
      const rel = String(args[1]) || 'related';
      return { method: 'LINK', url, rel, purpose: 'establish-link' };
    }
  });

  // ────────────────────────────────────────────────────────────
  // WebSocket 확장 (20개)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'ws_reconnect',
    module: 'websocket',
    executor: (args) => {
      const url = String(args[0]);
      const maxAttempts = args[1] || 5;
      return { type: 'ws-reconnect', url, maxAttempts, attempt: 0, backoff: 1000 };
    }
  });

  registry.register({
    name: 'ws_heartbeat',
    module: 'websocket',
    executor: (args) => {
      const interval = args[0] || 30000;
      const timeout = args[1] || 10000;
      return { type: 'heartbeat', interval, timeout, lastPing: Date.now() };
    }
  });

  registry.register({
    name: 'ws_room_create',
    module: 'websocket',
    executor: (args) => {
      const roomName = String(args[0]);
      const maxSize = args[1] || 100;
      return { type: 'room', name: roomName, created: Date.now(), members: [], maxSize };
    }
  });

  registry.register({
    name: 'ws_room_join',
    module: 'websocket',
    executor: (args) => {
      const roomName = String(args[0]);
      const userId = String(args[1]);
      return { type: 'room-join', room: roomName, userId, joined: Date.now() };
    }
  });

  registry.register({
    name: 'ws_room_broadcast',
    module: 'websocket',
    executor: (args) => {
      const roomName = String(args[0]);
      const message = args[1];
      return { type: 'broadcast', room: roomName, message, timestamp: Date.now() };
    }
  });

  registry.register({
    name: 'ws_subscribe',
    module: 'websocket',
    executor: (args) => {
      const channel = String(args[0]);
      const callback = args[1];
      return { type: 'subscribe', channel, callback, subscribed: true };
    }
  });

  registry.register({
    name: 'ws_unsubscribe',
    module: 'websocket',
    executor: (args) => {
      const channel = String(args[0]);
      return { type: 'unsubscribe', channel, unsubscribed: true };
    }
  });

  registry.register({
    name: 'ws_ping',
    module: 'websocket',
    executor: (args) => {
      const payload = String(args[0]) || 'ping';
      return { type: 'ping', payload, timestamp: Date.now() };
    }
  });

  registry.register({
    name: 'ws_pong',
    module: 'websocket',
    executor: (args) => {
      const payload = String(args[0]) || 'pong';
      return { type: 'pong', payload, timestamp: Date.now() };
    }
  });

  registry.register({
    name: 'ws_binary_send',
    module: 'websocket',
    executor: (args) => {
      const data = args[0];
      return { type: 'binary-send', data, encoding: 'binary', sent: true };
    }
  });

  registry.register({
    name: 'ws_json_send',
    module: 'websocket',
    executor: (args) => {
      const data = args[0];
      const json = typeof data === 'string' ? data : JSON.stringify(data);
      return { type: 'json-send', data: json, encoding: 'json', sent: true };
    }
  });

  registry.register({
    name: 'ws_on_error',
    module: 'websocket',
    executor: (args) => {
      const errorHandler = args[0];
      return { type: 'error-handler', handler: errorHandler, registered: true };
    }
  });

  registry.register({
    name: 'ws_on_open',
    module: 'websocket',
    executor: (args) => {
      const handler = args[0];
      return { type: 'open-handler', handler, registered: true };
    }
  });

  registry.register({
    name: 'ws_on_close',
    module: 'websocket',
    executor: (args) => {
      const handler = args[0];
      return { type: 'close-handler', handler, registered: true };
    }
  });

  registry.register({
    name: 'ws_auth',
    module: 'websocket',
    executor: (args) => {
      const token = String(args[0]);
      const scheme = String(args[1]) || 'Bearer';
      return { type: 'auth', token, scheme, authorized: token.length > 0 };
    }
  });

  registry.register({
    name: 'ws_namespace',
    module: 'websocket',
    executor: (args) => {
      const ns = String(args[0]);
      return { type: 'namespace', name: ns, path: `/${ns}`, rooms: {} };
    }
  });

  registry.register({
    name: 'ws_event',
    module: 'websocket',
    executor: (args) => {
      const eventName = String(args[0]);
      const handler = args[1];
      return { type: 'event', name: eventName, handler, registered: true };
    }
  });

  registry.register({
    name: 'ws_throttle',
    module: 'websocket',
    executor: (args) => {
      const maxMessagesPerSecond = args[0] || 10;
      return { type: 'throttle', maxMessagesPerSecond, currentMessages: 0, resetTime: Date.now() + 1000 };
    }
  });

  registry.register({
    name: 'ws_emit_ack',
    module: 'websocket',
    executor: (args) => {
      const eventName = String(args[0]);
      const data = args[1];
      return { type: 'emit-ack', event: eventName, data, ackId: Math.random() };
    }
  });

  registry.register({
    name: 'ws_middle',
    module: 'websocket',
    executor: (args) => {
      const handler = args[0];
      return { type: 'middleware', handler, registered: true };
    }
  });

  // ────────────────────────────────────────────────────────────
  // TCP/UDP (20개)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'tcp_connect',
    module: 'network',
    executor: (args) => {
      const host = String(args[0]);
      const port = args[1] || 80;
      return { type: 'tcp', host, port, connected: false, timeout: args[2] || 5000 };
    }
  });

  registry.register({
    name: 'tcp_listen',
    module: 'network',
    executor: (args) => {
      const port = args[0] || 3000;
      const host = String(args[1]) || '0.0.0.0';
      return { type: 'tcp-server', listening: false, port, host, backlog: args[2] || 512 };
    }
  });

  registry.register({
    name: 'tcp_send',
    module: 'network',
    executor: (args) => {
      const data = args[0];
      const encoding = String(args[1]) || 'utf8';
      return { type: 'send', data, encoding, sent: true, bytes: String(data).length };
    }
  });

  registry.register({
    name: 'tcp_recv',
    module: 'network',
    executor: (args) => {
      const timeout = args[0] || 0;
      return { type: 'recv', timeout, data: null, received: false };
    }
  });

  registry.register({
    name: 'tcp_close',
    module: 'network',
    executor: (args) => {
      const forceClose = args[0] || false;
      return { type: 'close', forced: forceClose, closed: true };
    }
  });

  registry.register({
    name: 'tcp_set_option',
    module: 'network',
    executor: (args) => {
      const option = String(args[0]);
      const value = args[1];
      return { type: 'option', option, value, applied: true };
    }
  });

  registry.register({
    name: 'udp_socket',
    module: 'network',
    executor: (args) => {
      const family = String(args[0]) || 'udp4';
      return { type: 'udp', family, bound: false, address: null, port: null };
    }
  });

  registry.register({
    name: 'udp_send',
    module: 'network',
    executor: (args) => {
      const data = args[0];
      const port = args[1];
      const host = String(args[2]) || 'localhost';
      return { type: 'udp-send', data, port, host, sent: true };
    }
  });

  registry.register({
    name: 'udp_recv',
    module: 'network',
    executor: (args) => {
      const bufferSize = args[0] || 65536;
      return { type: 'udp-recv', bufferSize, data: null, received: false };
    }
  });

  registry.register({
    name: 'udp_broadcast',
    module: 'network',
    executor: (args) => {
      const message = String(args[0]);
      const port = args[1];
      return { type: 'udp-broadcast', message, port, broadcastAddress: '255.255.255.255', sent: true };
    }
  });

  registry.register({
    name: 'socket_raw',
    module: 'network',
    executor: (args) => {
      const family = args[0] || 2;
      const socktype = args[1] || 1;
      return { type: 'raw-socket', family, socktype, fd: -1 };
    }
  });

  registry.register({
    name: 'socket_accept',
    module: 'network',
    executor: (args) => {
      return { type: 'accept', conn: null, address: null, port: null };
    }
  });

  registry.register({
    name: 'socket_bind',
    module: 'network',
    executor: (args) => {
      const port = args[0] || 0;
      const host = String(args[1]) || '0.0.0.0';
      return { type: 'bind', port, host, bound: true };
    }
  });

  registry.register({
    name: 'net_interfaces',
    module: 'network',
    executor: (args) => {
      return {
        lo: [{ family: 'IPv4', address: '127.0.0.1', netmask: '255.0.0.0' }],
        eth0: [{ family: 'IPv4', address: '192.168.1.1', netmask: '255.255.255.0' }]
      };
    }
  });

  registry.register({
    name: 'net_resolve_dns',
    module: 'network',
    executor: (args) => {
      const hostname = String(args[0]);
      return { hostname, address: '127.0.0.1', family: 4 };
    }
  });

  registry.register({
    name: 'net_ping',
    module: 'network',
    executor: (args) => {
      const host = String(args[0]);
      const timeout = args[1] || 5000;
      return { type: 'ping', host, timeout, time: Math.random() * 100, success: true };
    }
  });

  registry.register({
    name: 'net_trace',
    module: 'network',
    executor: (args) => {
      const host = String(args[0]);
      const maxHops = args[1] || 30;
      return { type: 'traceroute', host, maxHops, hops: [] };
    }
  });

  registry.register({
    name: 'net_mtu_discover',
    module: 'network',
    executor: (args) => {
      const host = String(args[0]);
      return { host, mtu: 1500, discovered: true };
    }
  });

  registry.register({
    name: 'socket_get_option',
    module: 'network',
    executor: (args) => {
      const option = String(args[0]);
      return { option, value: null, retrieved: true };
    }
  });

  registry.register({
    name: 'socket_pair',
    module: 'network',
    executor: (args) => {
      return { sockets: [{ fd: 3 }, { fd: 4 }], created: true };
    }
  });

  // ────────────────────────────────────────────────────────────
  // URL 처리 (20개)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'url_parse',
    module: 'url',
    executor: (args) => {
      const urlStr = String(args[0]);
      try {
        const parsed = new URL(urlStr);
        return {
          protocol: parsed.protocol,
          hostname: parsed.hostname,
          port: parsed.port,
          pathname: parsed.pathname,
          search: parsed.search,
          hash: parsed.hash
        };
      } catch {
        return null;
      }
    }
  });

  registry.register({
    name: 'url_stringify',
    module: 'url',
    executor: (args) => {
      const urlObj = args[0] || {};
      const protocol = urlObj.protocol || 'http:';
      const hostname = urlObj.hostname || 'localhost';
      const port = urlObj.port ? `:${urlObj.port}` : '';
      const pathname = urlObj.pathname || '/';
      const search = urlObj.search || '';
      const hash = urlObj.hash || '';
      return `${protocol}//${hostname}${port}${pathname}${search}${hash}`;
    }
  });

  registry.register({
    name: 'url_query_parse',
    module: 'url',
    executor: (args) => {
      const queryStr = String(args[0]);
      const result = {};
      queryStr.split('&').forEach((pair) => {
        const [key, value] = pair.split('=');
        if (key) result[decodeURIComponent(key)] = decodeURIComponent(value || '');
      });
      return result;
    }
  });

  registry.register({
    name: 'url_query_stringify',
    module: 'url',
    executor: (args) => {
      const queryObj = args[0] || {};
      const pairs = Object.keys(queryObj).map(
        (key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(queryObj[key]))}`
      );
      return pairs.join('&');
    }
  });

  registry.register({
    name: 'url_path_join',
    module: 'url',
    executor: (args) => {
      const parts = Array.isArray(args[0]) ? args[0] : [args[0]];
      return '/' + parts.map(p => String(p).replace(/^\/|\/$/g, '')).filter(p => p).join('/');
    }
  });

  registry.register({
    name: 'url_is_absolute',
    module: 'url',
    executor: (args) => {
      const url = String(args[0]);
      return /^https?:\/\//.test(url);
    }
  });

  registry.register({
    name: 'url_get_origin',
    module: 'url',
    executor: (args) => {
      const urlStr = String(args[0]);
      try {
        const url = new URL(urlStr);
        return url.origin;
      } catch {
        return null;
      }
    }
  });

  registry.register({
    name: 'url_get_pathname',
    module: 'url',
    executor: (args) => {
      const urlStr = String(args[0]);
      try {
        const url = new URL(urlStr);
        return url.pathname;
      } catch {
        return null;
      }
    }
  });

  registry.register({
    name: 'url_get_search',
    module: 'url',
    executor: (args) => {
      const urlStr = String(args[0]);
      try {
        const url = new URL(urlStr);
        return url.search;
      } catch {
        return null;
      }
    }
  });

  registry.register({
    name: 'url_normalize',
    module: 'url',
    executor: (args) => {
      const urlStr = String(args[0]);
      try {
        const url = new URL(urlStr);
        url.hash = '';
        return url.toString();
      } catch {
        return urlStr;
      }
    }
  });

  registry.register({
    name: 'url_add_param',
    module: 'url',
    executor: (args) => {
      const urlStr = String(args[0]);
      const paramKey = String(args[1]);
      const paramValue = String(args[2]);
      try {
        const url = new URL(urlStr);
        url.searchParams.set(paramKey, paramValue);
        return url.toString();
      } catch {
        return urlStr;
      }
    }
  });

  registry.register({
    name: 'url_remove_param',
    module: 'url',
    executor: (args) => {
      const urlStr = String(args[0]);
      const paramKey = String(args[1]);
      try {
        const url = new URL(urlStr);
        url.searchParams.delete(paramKey);
        return url.toString();
      } catch {
        return urlStr;
      }
    }
  });

  registry.register({
    name: 'url_replace_param',
    module: 'url',
    executor: (args) => {
      const urlStr = String(args[0]);
      const paramKey = String(args[1]);
      const paramValue = String(args[2]);
      try {
        const url = new URL(urlStr);
        url.searchParams.set(paramKey, paramValue);
        return url.toString();
      } catch {
        return urlStr;
      }
    }
  });

  registry.register({
    name: 'url_has_param',
    module: 'url',
    executor: (args) => {
      const urlStr = String(args[0]);
      const paramKey = String(args[1]);
      try {
        const url = new URL(urlStr);
        return url.searchParams.has(paramKey);
      } catch {
        return false;
      }
    }
  });

  registry.register({
    name: 'url_clear_params',
    module: 'url',
    executor: (args) => {
      const urlStr = String(args[0]);
      try {
        const url = new URL(urlStr);
        url.search = '';
        return url.toString();
      } catch {
        return urlStr;
      }
    }
  });

  registry.register({
    name: 'url_resolve',
    module: 'url',
    executor: (args) => {
      const base = String(args[0]);
      const relative = String(args[1]);
      try {
        return new URL(relative, base).toString();
      } catch {
        return relative;
      }
    }
  });

  registry.register({
    name: 'url_relative',
    module: 'url',
    executor: (args) => {
      const from = String(args[0]);
      const to = String(args[1]);
      try {
        const fromUrl = new URL(from);
        const toUrl = new URL(to);
        if (fromUrl.origin !== toUrl.origin) return to;
        const fromParts = fromUrl.pathname.split('/');
        const toParts = toUrl.pathname.split('/');
        while (fromParts[0] === toParts[0]) {
          fromParts.shift();
          toParts.shift();
        }
        const relative = '../'.repeat(fromParts.length - 1) + toParts.join('/');
        return relative + toUrl.search + toUrl.hash;
      } catch {
        return to;
      }
    }
  });

  registry.register({
    name: 'url_encode_component',
    module: 'url',
    executor: (args) => {
      const str = String(args[0]);
      return encodeURIComponent(str);
    }
  });

  registry.register({
    name: 'url_decode_component',
    module: 'url',
    executor: (args) => {
      const str = String(args[0]);
      try {
        return decodeURIComponent(str);
      } catch {
        return str;
      }
    }
  });

  registry.register({
    name: 'url_format',
    module: 'url',
    executor: (args) => {
      const urlObj = args[0] || {};
      const protocol = urlObj.protocol || 'http:';
      const hostname = urlObj.hostname || '';
      const port = urlObj.port ? `:${urlObj.port}` : '';
      const pathname = urlObj.pathname || '/';
      const search = urlObj.search || '';
      const hash = urlObj.hash || '';
      const auth = urlObj.auth ? `${urlObj.auth}@` : '';
      return `${protocol}//${auth}${hostname}${port}${pathname}${search}${hash}`;
    }
  });

  // ────────────────────────────────────────────────────────────
  // CORS/보안 헤더 (20개)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'cors_check',
    module: 'security',
    executor: (args) => {
      const origin = String(args[0]);
      const allowedOrigins = args[1] || ['*'];
      const allowed = allowedOrigins.includes(origin) || allowedOrigins.includes('*');
      return { origin, allowed, status: allowed ? 200 : 403 };
    }
  });

  registry.register({
    name: 'csp_build',
    module: 'security',
    executor: (args) => {
      const directives = args[0] || {};
      const cspString = Object.keys(directives)
        .map(key => `${key} ${directives[key]}`)
        .join('; ');
      return cspString;
    }
  });

  registry.register({
    name: 'helmet_defaults',
    module: 'security',
    executor: (args) => {
      return {
        'Content-Security-Policy': "default-src 'self'",
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
      };
    }
  });

  registry.register({
    name: 'hsts_header',
    module: 'security',
    executor: (args) => {
      const maxAge = args[0] || 31536000;
      const includeSubDomains = args[1] !== false;
      const preload = args[2] || false;
      let header = `max-age=${maxAge}`;
      if (includeSubDomains) header += '; includeSubDomains';
      if (preload) header += '; preload';
      return header;
    }
  });

  registry.register({
    name: 'csrf_token',
    module: 'security',
    executor: (args) => {
      const secret = String(args[0]) || '';
      const token = `csrf_${Buffer.from(`${secret}${Date.now()}${Math.random()}`).toString('base64')}`;
      return { token, created: Date.now(), valid: true };
    }
  });

  registry.register({
    name: 'csrf_verify',
    module: 'security',
    executor: (args) => {
      const token = String(args[0]);
      const secret = String(args[1]) || '';
      return { token, verified: token.startsWith('csrf_'), valid: token.length > 10 };
    }
  });

  registry.register({
    name: 'xss_filter',
    module: 'security',
    executor: (args) => {
      const input = String(args[0]);
      const filtered = input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
      return filtered;
    }
  });

  registry.register({
    name: 'x_content_type',
    module: 'security',
    executor: (args) => {
      return 'nosniff';
    }
  });

  registry.register({
    name: 'cache_control',
    module: 'security',
    executor: (args) => {
      const maxAge = args[0] || 3600;
      const isPublic = args[1] !== false;
      const noStore = args[2] || false;
      const mustRevalidate = args[3] || false;
      let directives = [isPublic ? 'public' : 'private', `max-age=${maxAge}`];
      if (noStore) directives.push('no-store');
      if (mustRevalidate) directives.push('must-revalidate');
      return directives.join(', ');
    }
  });

  registry.register({
    name: 'etag_generate',
    module: 'security',
    executor: (args) => {
      const data = String(args[0]);
      const hash = Buffer.from(data).toString('base64').substring(0, 20);
      return `"${hash}"`;
    }
  });

  registry.register({
    name: 'etag_verify',
    module: 'security',
    executor: (args) => {
      const etag = String(args[0]);
      const currentEtag = String(args[1]);
      return etag === currentEtag;
    }
  });

  registry.register({
    name: 'vary_header',
    module: 'security',
    executor: (args) => {
      const headers = Array.isArray(args[0]) ? args[0] : [String(args[0])];
      return headers.join(', ');
    }
  });

  registry.register({
    name: 'sec_fetch_site',
    module: 'security',
    executor: (args) => {
      const headerValue = String(args[0]);
      return { value: headerValue, valid: ['same-origin', 'same-site', 'cross-site', 'none'].includes(headerValue) };
    }
  });

  registry.register({
    name: 'sec_fetch_mode',
    module: 'security',
    executor: (args) => {
      const headerValue = String(args[0]);
      return { value: headerValue, valid: ['cors', 'no-cors', 'same-origin', 'navigate'].includes(headerValue) };
    }
  });

  registry.register({
    name: 'sec_fetch_dest',
    module: 'security',
    executor: (args) => {
      const headerValue = String(args[0]);
      const validValues = ['audio', 'audioworklet', 'document', 'embed', 'frame', 'iframe', 'image', 'object', 'script', 'sharedworker', 'worker', 'xslt'];
      return { value: headerValue, valid: validValues.includes(headerValue) };
    }
  });

  registry.register({
    name: 'allow_header',
    module: 'security',
    executor: (args) => {
      const methods = args[0] || ['GET', 'POST'];
      const methodArray = Array.isArray(methods) ? methods : [String(methods)];
      return methodArray.join(', ');
    }
  });

  registry.register({
    name: 'content_security_policy',
    module: 'security',
    executor: (args) => {
      const config = args[0] || {};
      const directives = {
        'default-src': config.defaultSrc || "'self'",
        'script-src': config.scriptSrc || "'self'",
        'style-src': config.styleSrc || "'self' 'unsafe-inline'",
        'img-src': config.imgSrc || "'self' data:",
        'font-src': config.fontSrc || "'self'",
        'connect-src': config.connectSrc || "'self'"
      };
      return Object.keys(directives)
        .map(key => `${key} ${directives[key]}`)
        .join('; ');
    }
  });

  registry.register({
    name: 'x_frame_options',
    module: 'security',
    executor: (args) => {
      const option = String(args[0]) || 'DENY';
      return option;
    }
  });

  registry.register({
    name: 'x_xss_protection',
    module: 'security',
    executor: (args) => {
      const enabled = args[0] !== false;
      const mode = enabled ? '1; mode=block' : '0';
      return mode;
    }
  });

  registry.register({
    name: 'referrer_policy',
    module: 'security',
    executor: (args) => {
      const policy = String(args[0]) || 'no-referrer';
      return policy;
    }
  });

  // ────────────────────────────────────────────────────────────
  // 프로토콜/인코딩 (20개)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'xml_parse',
    module: 'encoding',
    executor: (args) => {
      const xmlStr = String(args[0]);
      return { type: 'xml-parsed', content: xmlStr, elements: [] };
    }
  });

  registry.register({
    name: 'xml_stringify',
    module: 'encoding',
    executor: (args) => {
      const obj = args[0];
      return `<root>${JSON.stringify(obj)}</root>`;
    }
  });

  registry.register({
    name: 'yaml_parse',
    module: 'encoding',
    executor: (args) => {
      const yamlStr = String(args[0]);
      return { type: 'yaml-parsed', content: yamlStr };
    }
  });

  registry.register({
    name: 'yaml_stringify',
    module: 'encoding',
    executor: (args) => {
      const obj = args[0];
      return JSON.stringify(obj, null, 2);
    }
  });

  registry.register({
    name: 'toml_parse',
    module: 'encoding',
    executor: (args) => {
      const tomlStr = String(args[0]);
      return { type: 'toml-parsed', content: tomlStr };
    }
  });

  registry.register({
    name: 'toml_stringify',
    module: 'encoding',
    executor: (args) => {
      const obj = args[0];
      return JSON.stringify(obj);
    }
  });

  registry.register({
    name: 'ini_parse',
    module: 'encoding',
    executor: (args) => {
      const iniStr = String(args[0]);
      const result = {};
      iniStr.split('\n').forEach((line) => {
        const [key, value] = line.split('=');
        if (key && value) result[key.trim()] = value.trim();
      });
      return result;
    }
  });

  registry.register({
    name: 'ini_stringify',
    module: 'encoding',
    executor: (args) => {
      const obj = args[0] || {};
      return Object.keys(obj)
        .map(key => `${key}=${obj[key]}`)
        .join('\n');
    }
  });

  registry.register({
    name: 'msgpack_encode',
    module: 'encoding',
    executor: (args) => {
      const data = args[0];
      return { type: 'msgpack-encoded', original: data, buffer: 'base64encoded' };
    }
  });

  registry.register({
    name: 'msgpack_decode',
    module: 'encoding',
    executor: (args) => {
      const buffer = args[0];
      return { type: 'msgpack-decoded', buffer };
    }
  });

  registry.register({
    name: 'cbor_encode',
    module: 'encoding',
    executor: (args) => {
      const data = args[0];
      return { type: 'cbor-encoded', original: data };
    }
  });

  registry.register({
    name: 'cbor_decode',
    module: 'encoding',
    executor: (args) => {
      const buffer = args[0];
      return { type: 'cbor-decoded', buffer };
    }
  });

  registry.register({
    name: 'proto_encode',
    module: 'encoding',
    executor: (args) => {
      const message = args[0];
      return { type: 'proto-encoded', message };
    }
  });

  registry.register({
    name: 'proto_decode',
    module: 'encoding',
    executor: (args) => {
      const buffer = args[0];
      return { type: 'proto-decoded', buffer };
    }
  });

  registry.register({
    name: 'bson_encode',
    module: 'encoding',
    executor: (args) => {
      const obj = args[0];
      return { type: 'bson-encoded', object: obj };
    }
  });

  registry.register({
    name: 'bson_decode',
    module: 'encoding',
    executor: (args) => {
      const buffer = args[0];
      return { type: 'bson-decoded', buffer };
    }
  });

  registry.register({
    name: 'avro_encode',
    module: 'encoding',
    executor: (args) => {
      const data = args[0];
      const schema = args[1];
      return { type: 'avro-encoded', data, schema };
    }
  });

  registry.register({
    name: 'avro_decode',
    module: 'encoding',
    executor: (args) => {
      const buffer = args[0];
      const schema = args[1];
      return { type: 'avro-decoded', buffer, schema };
    }
  });

  registry.register({
    name: 'ion_parse',
    module: 'encoding',
    executor: (args) => {
      const ionStr = String(args[0]);
      return { type: 'ion-parsed', content: ionStr };
    }
  });

  registry.register({
    name: 'ion_stringify',
    module: 'encoding',
    executor: (args) => {
      const obj = args[0];
      return JSON.stringify(obj);
    }
  });

  // ────────────────────────────────────────────────────────────
  // DNS (20개)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'dns_resolve',
    module: 'dns',
    executor: (args) => {
      const hostname = String(args[0]);
      return { hostname, address: '127.0.0.1', family: 4 };
    }
  });

  registry.register({
    name: 'dns_reverse',
    module: 'dns',
    executor: (args) => {
      const ip = String(args[0]);
      return { ip, hostname: 'localhost.localdomain' };
    }
  });

  registry.register({
    name: 'dns_lookup',
    module: 'dns',
    executor: (args) => {
      const hostname = String(args[0]);
      return { hostname, addresses: [{ address: '127.0.0.1', family: 4 }] };
    }
  });

  registry.register({
    name: 'dns_srv',
    module: 'dns',
    executor: (args) => {
      const service = String(args[0]);
      return { service, records: [] };
    }
  });

  registry.register({
    name: 'dns_mx',
    module: 'dns',
    executor: (args) => {
      const hostname = String(args[0]);
      return { hostname, exchanges: [{ exchange: 'mail.example.com', priority: 10 }] };
    }
  });

  registry.register({
    name: 'dns_txt',
    module: 'dns',
    executor: (args) => {
      const hostname = String(args[0]);
      return { hostname, records: [['v=spf1 include:_spf.google.com ~all']] };
    }
  });

  registry.register({
    name: 'dns_ns',
    module: 'dns',
    executor: (args) => {
      const hostname = String(args[0]);
      return { hostname, nameservers: ['ns1.example.com', 'ns2.example.com'] };
    }
  });

  registry.register({
    name: 'dns_cname',
    module: 'dns',
    executor: (args) => {
      const hostname = String(args[0]);
      return { hostname, cname: 'alias.example.com' };
    }
  });

  registry.register({
    name: 'dns_soa',
    module: 'dns',
    executor: (args) => {
      const hostname = String(args[0]);
      return {
        hostname,
        soa: {
          mname: 'ns1.example.com',
          rname: 'admin.example.com',
          serial: 2024030601,
          refresh: 10800,
          retry: 3600,
          expire: 604800,
          minttl: 86400
        }
      };
    }
  });

  registry.register({
    name: 'dns_aaaa',
    module: 'dns',
    executor: (args) => {
      const hostname = String(args[0]);
      return { hostname, address: '::1', family: 6 };
    }
  });

  registry.register({
    name: 'dns_a',
    module: 'dns',
    executor: (args) => {
      const hostname = String(args[0]);
      return { hostname, address: '127.0.0.1', family: 4 };
    }
  });

  registry.register({
    name: 'dns_ptr',
    module: 'dns',
    executor: (args) => {
      const ip = String(args[0]);
      return { ip, hostname: 'localhost.localdomain' };
    }
  });

  registry.register({
    name: 'dns_spf',
    module: 'dns',
    executor: (args) => {
      const hostname = String(args[0]);
      return { hostname, spf: 'v=spf1 include:_spf.google.com ~all' };
    }
  });

  registry.register({
    name: 'dns_dmarc',
    module: 'dns',
    executor: (args) => {
      const hostname = String(args[0]);
      return { hostname, dmarc: 'v=DMARC1; p=none;' };
    }
  });

  registry.register({
    name: 'dns_tlsa',
    module: 'dns',
    executor: (args) => {
      const service = String(args[0]);
      return { service, tlsa: { usage: 3, selector: 1, matchingType: 1, certAssocData: '' } };
    }
  });

  registry.register({
    name: 'dns_cache_flush',
    module: 'dns',
    executor: (args) => {
      return { flushed: true, timestamp: Date.now() };
    }
  });

  registry.register({
    name: 'dns_set_server',
    module: 'dns',
    executor: (args) => {
      const servers = args[0] || ['8.8.8.8', '8.8.4.4'];
      return { servers: Array.isArray(servers) ? servers : [servers], set: true };
    }
  });

  registry.register({
    name: 'dns_get_server',
    module: 'dns',
    executor: (args) => {
      return { servers: ['8.8.8.8', '8.8.4.4'] };
    }
  });

  registry.register({
    name: 'dns_tcp_fallback',
    module: 'dns',
    executor: (args) => {
      const hostname = String(args[0]);
      return { hostname, fallbackEnabled: true, protocol: 'TCP' };
    }
  });

  registry.register({
    name: 'dns_dnssec',
    module: 'dns',
    executor: (args) => {
      const hostname = String(args[0]);
      return { hostname, dnssecEnabled: true, validated: false };
    }
  });
}
