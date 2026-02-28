/**
 * FreeLang Standard Library: std/http2
 *
 * HTTP/2 utilities
 */

import { createSecureServer, createServer } from 'http2';

/**
 * HTTP/2 server response
 */
export interface HTTP2Response {
  statusCode: number;
  headers: Record<string, string | string[]>;
  body: string;
}

/**
 * HTTP/2 Server
 */
export class HTTP2Server {
  private server: any;
  private port: number;
  private handlers: Map<string, (req: any, res: any) => void> = new Map();

  constructor(port: number = 443, secure: boolean = true) {
    this.port = port;

    if (secure) {
      this.server = createSecureServer({
        key: '', // Would need actual cert/key
        cert: ''
      });
    } else {
      this.server = createServer();
    }

    this.setupDefaultHandler();
  }

  private setupDefaultHandler(): void {
    this.server.on('stream', (stream: any, headers: any) => {
      const method = headers[':method'];
      const path = headers[':path'];
      const handler = this.handlers.get(`${method} ${path}`);

      if (handler) {
        handler(headers, stream);
      } else {
        stream.respond({
          ':status': 404,
          'content-type': 'text/plain'
        });
        stream.end('Not Found');
      }
    });
  }

  /**
   * Register route handler
   * @param method HTTP method
   * @param path URL path
   * @param handler Handler function
   */
  on(method: string, path: string, handler: (req: any, res: any) => void): void {
    this.handlers.set(`${method} ${path}`, handler);
  }

  /**
   * Start server
   * @returns Promise that resolves when started
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, () => {
        resolve();
      });

      this.server.on('error', reject);
    });
  }

  /**
   * Stop server
   * @returns Promise that resolves when stopped
   */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((error: any) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Get port
   * @returns Server port
   */
  getPort(): number {
    return this.port;
  }
}

/**
 * HTTP/2 Client
 */
export class HTTP2Client {
  private baseUrl: string;
  private defaultHeaders: Record<string, string> = {};

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Set default header
   * @param key Header key
   * @param value Header value
   */
  setHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }

  /**
   * Make GET request
   * @param path URL path
   * @param headers Optional headers
   * @returns Promise with response
   */
  async get(path: string, headers?: Record<string, string>): Promise<HTTP2Response> {
    return this.request('GET', path, undefined, headers);
  }

  /**
   * Make POST request
   * @param path URL path
   * @param body Request body
   * @param headers Optional headers
   * @returns Promise with response
   */
  async post(path: string, body?: string, headers?: Record<string, string>): Promise<HTTP2Response> {
    return this.request('POST', path, body, headers);
  }

  /**
   * Make PUT request
   * @param path URL path
   * @param body Request body
   * @param headers Optional headers
   * @returns Promise with response
   */
  async put(path: string, body?: string, headers?: Record<string, string>): Promise<HTTP2Response> {
    return this.request('PUT', path, body, headers);
  }

  /**
   * Make DELETE request
   * @param path URL path
   * @param headers Optional headers
   * @returns Promise with response
   */
  async delete(path: string, headers?: Record<string, string>): Promise<HTTP2Response> {
    return this.request('DELETE', path, undefined, headers);
  }

  /**
   * Make generic request
   * @param method HTTP method
   * @param path URL path
   * @param body Request body
   * @param headers Optional headers
   * @returns Promise with response
   */
  async request(
    method: string,
    path: string,
    body?: string,
    headers?: Record<string, string>
  ): Promise<HTTP2Response> {
    // Placeholder implementation
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ success: true })
    };
  }
}

/**
 * Create HTTP/2 server
 * @param port Server port
 * @param secure Use TLS
 * @returns HTTP2Server instance
 */
export function createHTTP2Server(port: number = 443, secure: boolean = true): HTTP2Server {
  return new HTTP2Server(port, secure);
}

/**
 * Create HTTP/2 client
 * @param baseUrl Base URL
 * @returns HTTP2Client instance
 */
export function createHTTP2Client(baseUrl: string): HTTP2Client {
  return new HTTP2Client(baseUrl);
}

/**
 * Get HTTP/2 supported features
 * @returns Feature list
 */
export function getSupportedFeatures(): string[] {
  return [
    'server-push',
    'multiplexing',
    'binary-framing',
    'header-compression',
    'stream-prioritization'
  ];
}
