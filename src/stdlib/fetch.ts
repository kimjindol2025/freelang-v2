/**
 * FreeLang Standard Library: std/fetch
 *
 * HTTP/HTTPS client for making network requests
 */

import { request } from 'https';
import { request as httpRequest } from 'http';
import { URL } from 'url';

export interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

export interface FetchResponse {
  status: number;
  statusText: string;
  headers: Record<string, string | string[]>;
  data: string;
  text(): string;
  json(): any;
}

/**
 * Make HTTP/HTTPS request
 * @param url URL to fetch
 * @param options Request options
 * @returns Response object
 */
export async function fetch(url: string, options?: FetchOptions): Promise<FetchResponse> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const requestModule = isHttps ? request : httpRequest;

    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options?.method || 'GET',
      headers: options?.headers || {},
      timeout: options?.timeout || 30000
    };

    const req = requestModule(reqOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          status: res.statusCode || 500,
          statusText: res.statusMessage || 'Unknown',
          headers: res.headers as Record<string, string | string[]>,
          data,
          text() {
            return data;
          },
          json() {
            try {
              return JSON.parse(data);
            } catch (error) {
              throw new Error('Invalid JSON response');
            }
          }
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options?.body) {
      req.write(options.body);
    }

    req.end();
  });
}

/**
 * Make GET request
 * @param url URL to fetch
 * @param headers Optional headers
 * @returns Response object
 */
export function get(url: string, headers?: Record<string, string>): Promise<FetchResponse> {
  return fetch(url, { method: 'GET', headers });
}

/**
 * Make POST request
 * @param url URL to fetch
 * @param body Request body
 * @param headers Optional headers
 * @returns Response object
 */
export function post(url: string, body: string, headers?: Record<string, string>): Promise<FetchResponse> {
  return fetch(url, { method: 'POST', body, headers });
}

/**
 * Make PUT request
 * @param url URL to fetch
 * @param body Request body
 * @param headers Optional headers
 * @returns Response object
 */
export function put(url: string, body: string, headers?: Record<string, string>): Promise<FetchResponse> {
  return fetch(url, { method: 'PUT', body, headers });
}

/**
 * Make DELETE request
 * @param url URL to fetch
 * @param headers Optional headers
 * @returns Response object
 */
export function deleteReq(url: string, headers?: Record<string, string>): Promise<FetchResponse> {
  return fetch(url, { method: 'DELETE', headers });
}

/**
 * Make HEAD request
 * @param url URL to fetch
 * @param headers Optional headers
 * @returns Response object
 */
export function head(url: string, headers?: Record<string, string>): Promise<FetchResponse> {
  return fetch(url, { method: 'HEAD', headers });
}
