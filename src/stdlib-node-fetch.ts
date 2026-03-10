/**
 * FreeLang v2 stdlib — stdlib-node-fetch.ts
 * npm node-fetch 완전 대체 네이티브 함수 등록
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

interface FetchResponse {
  status: number;
  statusText: string;
  ok: boolean;
  url: string;
  headers: Record<string, string>;
  body: string;
}

const STATUS_TEXTS: Record<number, string> = {
  200: 'OK', 201: 'Created', 204: 'No Content', 301: 'Moved Permanently',
  302: 'Found', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden',
  404: 'Not Found', 405: 'Method Not Allowed', 408: 'Request Timeout',
  500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable'
};

function nodeFetch(urlStr: string, init: Record<string, any> = {}): Promise<FetchResponse> {
  return new Promise((resolve, reject) => {
    let parsedUrl: URL;
    try { parsedUrl = new URL(urlStr); } catch (e) { reject(new Error(`Invalid URL: ${urlStr}`)); return; }

    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;
    const method = String(init.method ?? 'GET').toUpperCase();
    const reqHeaders: Record<string, string> = {
      'User-Agent': 'FreeLang-node-fetch/1.0',
      ...(init.headers ?? {})
    };

    let bodyStr = '';
    if (init.body) {
      bodyStr = typeof init.body === 'string' ? init.body : JSON.stringify(init.body);
      if (!reqHeaders['Content-Length']) {
        reqHeaders['Content-Length'] = Buffer.byteLength(bodyStr).toString();
      }
    }

    const options: http.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port ? parseInt(parsedUrl.port) : (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers: reqHeaders,
      timeout: Number(init.timeout ?? 30000)
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const status = res.statusCode ?? 0;
        const flatHeaders: Record<string, string> = {};
        for (const [k, v] of Object.entries(res.headers)) {
          flatHeaders[k] = Array.isArray(v) ? v.join(', ') : (v ?? '');
        }
        resolve({
          status,
          statusText: STATUS_TEXTS[status] ?? '',
          ok: status >= 200 && status < 300,
          url: urlStr,
          headers: flatHeaders,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Fetch timeout')); });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

export function registerNodeFetchFunctions(registry: NativeFunctionRegistry): void {
  registry.register({
    name: 'nodefetch_fetch',
    module: 'node-fetch',
    paramCount: 2,
    executor: async (args: any[]) => {
      const url = String(args[0]);
      const init = (args[1] && typeof args[1] === 'object') ? args[1] : {};
      return await nodeFetch(url, init);
    }
  });

  registry.register({
    name: 'nodefetch_parse_json',
    module: 'node-fetch',
    paramCount: 1,
    executor: (args: any[]) => {
      try { return JSON.parse(String(args[0])); } catch { return null; }
    }
  });

  registry.register({
    name: 'nodefetch_get_header',
    module: 'node-fetch',
    paramCount: 2,
    executor: (args: any[]) => {
      const headers = args[0] as Record<string, string>;
      const name = String(args[1]).toLowerCase();
      return headers[name] ?? headers[Object.keys(headers).find(k => k.toLowerCase() === name) ?? ''] ?? null;
    }
  });

  registry.register({
    name: 'nodefetch_set_header',
    module: 'node-fetch',
    paramCount: 3,
    executor: (args: any[]) => ({ ...args[0], [String(args[1])]: String(args[2]) })
  });

  registry.register({
    name: 'nodefetch_has_header',
    module: 'node-fetch',
    paramCount: 2,
    executor: (args: any[]) => {
      const headers = args[0] as Record<string, string>;
      const name = String(args[1]).toLowerCase();
      return Object.keys(headers).some(k => k.toLowerCase() === name);
    }
  });
}
