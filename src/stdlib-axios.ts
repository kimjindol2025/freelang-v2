/**
 * FreeLang v2 - Axios HTTP Client 네이티브 함수
 *
 * Node.js https/http 모듈 사용
 * axios_get, axios_post, axios_put, axios_delete, axios_patch, axios_head, axios_request
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

/**
 * HTTP 요청 실행
 */
function makeHttpRequest(
  method: string,
  url: string,
  body: any,
  headers: Record<string, string>,
  timeout: number
): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + (parsedUrl.search || ''),
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        timeout: timeout || 5000
      };

      // Content-Length 설정
      let bodyStr = '';
      if (body) {
        if (typeof body === 'string') {
          bodyStr = body;
        } else {
          bodyStr = JSON.stringify(body);
        }
        options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
      }

      const req = client.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            let parsedData = data;
            if (headers['Content-Type']?.includes('application/json')) {
              try {
                parsedData = JSON.parse(data);
              } catch {
                // Keep as string if JSON parse fails
              }
            }

            resolve({
              status: res.statusCode || 200,
              statusText: res.statusMessage || 'OK',
              headers: res.headers || {},
              data: parsedData
            });
          } catch (error: any) {
            reject({
              message: error.message,
              status: res.statusCode || 500,
              isTimeout: false,
              isNetworkError: true
            });
          }
        });
      });

      req.on('error', (error: any) => {
        reject({
          message: error.message,
          status: 0,
          isTimeout: error.code === 'ETIMEDOUT',
          isNetworkError: true
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject({
          message: 'Request timeout',
          status: 0,
          isTimeout: true,
          isNetworkError: false
        });
      });

      if (bodyStr) {
        req.write(bodyStr);
      }

      req.end();
    } catch (error: any) {
      reject({
        message: error.message,
        status: 0,
        isTimeout: false,
        isNetworkError: true
      });
    }
  });
}

/**
 * Axios 함수 등록
 */
export function registerAxiosFunctions(registry: NativeFunctionRegistry): void {
  // axios_get(url, headersJson, timeout) -> responseJson
  registry.register({
    name: 'axios_get',
    module: 'axios',
    executor: async (args) => {
      const url = String(args[0]);
      const headersJson = args[1] ? String(args[1]) : '{}';
      const timeout = args[2] ? parseInt(String(args[2])) : 5000;

      let headers = {};
      try {
        headers = JSON.parse(headersJson);
      } catch (e) {
        headers = {};
      }

      try {
        const response = await makeHttpRequest('GET', url, null, headers, timeout);
        return response;
      } catch (error: any) {
        throw new Error(`axios_get failed: ${error.message}`);
      }
    }
  });

  // axios_post(url, bodyJson, headersJson, timeout) -> responseJson
  registry.register({
    name: 'axios_post',
    module: 'axios',
    executor: async (args) => {
      const url = String(args[0]);
      const bodyJson = args[1] ? String(args[1]) : '{}';
      const headersJson = args[2] ? String(args[2]) : '{}';
      const timeout = args[3] ? parseInt(String(args[3])) : 5000;

      let body = {};
      let headers = {};

      try {
        body = JSON.parse(bodyJson);
      } catch (e) {
        body = bodyJson;
      }

      try {
        headers = JSON.parse(headersJson);
      } catch (e) {
        headers = {};
      }

      try {
        const response = await makeHttpRequest('POST', url, body, headers, timeout);
        return response;
      } catch (error: any) {
        throw new Error(`axios_post failed: ${error.message}`);
      }
    }
  });

  // axios_put(url, bodyJson, headersJson, timeout) -> responseJson
  registry.register({
    name: 'axios_put',
    module: 'axios',
    executor: async (args) => {
      const url = String(args[0]);
      const bodyJson = args[1] ? String(args[1]) : '{}';
      const headersJson = args[2] ? String(args[2]) : '{}';
      const timeout = args[3] ? parseInt(String(args[3])) : 5000;

      let body = {};
      let headers = {};

      try {
        body = JSON.parse(bodyJson);
      } catch (e) {
        body = bodyJson;
      }

      try {
        headers = JSON.parse(headersJson);
      } catch (e) {
        headers = {};
      }

      try {
        const response = await makeHttpRequest('PUT', url, body, headers, timeout);
        return response;
      } catch (error: any) {
        throw new Error(`axios_put failed: ${error.message}`);
      }
    }
  });

  // axios_delete(url, headersJson, timeout) -> responseJson
  registry.register({
    name: 'axios_delete',
    module: 'axios',
    executor: async (args) => {
      const url = String(args[0]);
      const headersJson = args[1] ? String(args[1]) : '{}';
      const timeout = args[2] ? parseInt(String(args[2])) : 5000;

      let headers = {};
      try {
        headers = JSON.parse(headersJson);
      } catch (e) {
        headers = {};
      }

      try {
        const response = await makeHttpRequest('DELETE', url, null, headers, timeout);
        return response;
      } catch (error: any) {
        throw new Error(`axios_delete failed: ${error.message}`);
      }
    }
  });

  // axios_patch(url, bodyJson, headersJson, timeout) -> responseJson
  registry.register({
    name: 'axios_patch',
    module: 'axios',
    executor: async (args) => {
      const url = String(args[0]);
      const bodyJson = args[1] ? String(args[1]) : '{}';
      const headersJson = args[2] ? String(args[2]) : '{}';
      const timeout = args[3] ? parseInt(String(args[3])) : 5000;

      let body = {};
      let headers = {};

      try {
        body = JSON.parse(bodyJson);
      } catch (e) {
        body = bodyJson;
      }

      try {
        headers = JSON.parse(headersJson);
      } catch (e) {
        headers = {};
      }

      try {
        const response = await makeHttpRequest('PATCH', url, body, headers, timeout);
        return response;
      } catch (error: any) {
        throw new Error(`axios_patch failed: ${error.message}`);
      }
    }
  });

  // axios_head(url, headersJson, timeout) -> responseJson
  registry.register({
    name: 'axios_head',
    module: 'axios',
    executor: async (args) => {
      const url = String(args[0]);
      const headersJson = args[1] ? String(args[1]) : '{}';
      const timeout = args[2] ? parseInt(String(args[2])) : 5000;

      let headers = {};
      try {
        headers = JSON.parse(headersJson);
      } catch (e) {
        headers = {};
      }

      try {
        const response = await makeHttpRequest('HEAD', url, null, headers, timeout);
        return response;
      } catch (error: any) {
        throw new Error(`axios_head failed: ${error.message}`);
      }
    }
  });

  // axios_request(configJson) -> responseJson
  registry.register({
    name: 'axios_request',
    module: 'axios',
    executor: async (args) => {
      const configJson = String(args[0]);
      let config = {};

      try {
        config = JSON.parse(configJson);
      } catch (e) {
        throw new Error('Invalid config JSON');
      }

      const method = (config as any).method || 'GET';
      const url = (config as any).url || '';
      const body = (config as any).data || null;
      const headers = (config as any).headers || {};
      const timeout = (config as any).timeout || 5000;

      try {
        const response = await makeHttpRequest(method, url, body, headers, timeout);
        return response;
      } catch (error: any) {
        throw new Error(`axios_request failed: ${error.message}`);
      }
    }
  });
}
