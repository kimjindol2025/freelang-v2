/**
 * FreeLang HTTP Module
 * Phase J: HTTP client library with fetch API
 *
 * 지원 기능:
 * - fetch(url, options): Promise<Response>
 * - Response.text(): string
 * - Response.json(): object
 * - Response.headers: object
 * - Response.status: number
 * - Response.ok: boolean
 */

export interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
  headers?: Record<string, string>;
  body?: string | object;
  timeout?: number;
}

export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: Buffer;
  ok: boolean;
  text(): string;
  json(): any;
}

/**
 * Fetch API - 간단한 HTTP 클라이언트
 *
 * 예시:
 * ```
 * let response = await fetch("https://api.example.com/users")
 * let data = await response.json()
 * ```
 *
 * POST 예시:
 * ```
 * let response = await fetch("https://api.example.com/users", {
 *   method: "POST",
 *   headers: { "Content-Type": "application/json" },
 *   body: '{"name":"Alice"}'
 * })
 * let result = await response.json()
 * ```
 */
export async function fetch(
  url: string,
  options: FetchOptions = {}
): Promise<HttpResponse> {
  // Node.js 18+ built-in fetch 사용
  const response = await globalThis.fetch(url, {
    method: options.method || 'GET',
    headers: options.headers,
    body: options.body ?
      (typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
      : undefined,
  } as any);

  // 응답 파싱
  const buffer = await response.arrayBuffer();
  const body = Buffer.from(buffer);

  // 헤더를 객체로 변환
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  // HttpResponse 객체 생성
  const httpResponse: HttpResponse = {
    status: response.status,
    statusText: response.statusText,
    headers,
    body,
    ok: response.ok,

    /**
     * 응답을 텍스트로 반환
     */
    text(): string {
      return this.body.toString('utf-8');
    },

    /**
     * 응답을 JSON으로 파싱
     */
    json(): any {
      try {
        return JSON.parse(this.body.toString('utf-8'));
      } catch (error) {
        throw new Error(`Failed to parse JSON: ${(error as Error).message}`);
      }
    }
  };

  return httpResponse;
}

/**
 * HTTP GET 요청 (헬퍼 함수)
 */
export async function get(url: string, headers?: Record<string, string>): Promise<HttpResponse> {
  return fetch(url, { method: 'GET', headers });
}

/**
 * HTTP POST 요청 (헬퍼 함수)
 */
export async function post(
  url: string,
  body: string | object,
  headers?: Record<string, string>
): Promise<HttpResponse> {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body
  });
}

/**
 * HTTP PUT 요청 (헬퍼 함수)
 */
export async function put(
  url: string,
  body: string | object,
  headers?: Record<string, string>
): Promise<HttpResponse> {
  return fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body
  });
}

/**
 * HTTP DELETE 요청 (헬퍼 함수)
 */
export async function delete_(
  url: string,
  headers?: Record<string, string>
): Promise<HttpResponse> {
  return fetch(url, { method: 'DELETE', headers });
}

/**
 * HTTP API 객체 - 빌트인 함수에서 참조
 */
export const HTTP_API = {
  fetch,
  get,
  post,
  put,
  delete: delete_,
};

export default {
  fetch,
  get,
  post,
  put,
  delete: delete_
};
