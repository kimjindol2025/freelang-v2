/**
 * FreeLang v2 stdlib — stdlib-got.ts
 * npm got 완전 대체 네이티브 함수 등록
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

interface GotResponse {
  statusCode: number;
  body: string;
  headers: Record<string, string | string[]>;
  ok: boolean;
}

function makeRequest(
  method: string,
  urlStr: string,
  body: any,
  options: Record<string, any>
): Promise<GotResponse> {
  return new Promise((resolve, reject) => {
    let parsedUrl: URL;
    try { parsedUrl = new URL(urlStr); } catch (e) { reject(new Error(`Invalid URL: ${urlStr}`)); return; }

    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;
    const headers: Record<string, string> = {
      'User-Agent': 'FreeLang-got/1.0',
      ...(options.headers ?? {})
    };

    let bodyStr = '';
    if (body && typeof body === 'object') {
      bodyStr = JSON.stringify(body);
      headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
      headers['Content-Length'] = Buffer.byteLength(bodyStr).toString();
    } else if (typeof body === 'string' && body) {
      bodyStr = body;
      headers['Content-Length'] = Buffer.byteLength(bodyStr).toString();
    }

    const reqOptions: http.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port ? parseInt(parsedUrl.port) : (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers,
      timeout: Number(options.timeout ?? 30000)
    };

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const statusCode = res.statusCode ?? 0;
        resolve({
          statusCode,
          body: data,
          headers: res.headers as Record<string, string | string[]>,
          ok: statusCode >= 200 && statusCode < 300
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

export function registerGotFunctions(registry: NativeFunctionRegistry): void {
  registry.register({
    name: 'got_request',
    module: 'got',
    paramCount: 4,
    executor: async (args: any[]) => {
      const method = String(args[0]).toUpperCase();
      const url = String(args[1]);
      const body = args[2];
      const options = (args[3] && typeof args[3] === 'object') ? args[3] : {};
      return await makeRequest(method, url, body, options);
    }
  });

  registry.register({
    name: 'got_parse_json',
    module: 'got',
    paramCount: 1,
    executor: (args: any[]) => {
      try { return JSON.parse(String(args[0])); } catch { return null; }
    }
  });

  registry.register({
    name: 'got_json_stringify',
    module: 'got',
    paramCount: 1,
    executor: (args: any[]) => JSON.stringify(args[0])
  });
}
