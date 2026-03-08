/**
 * FreeLang VM 네이티브 함수 (Native API)
 * StdLib와 VM 연동을 위한 기본 함수
 */

import * as httpModule from './http-module';

/**
 * VM 네이티브 API 객체
 */
export const vmNative = {
  // ====== I/O API ======
  io: {
    write: (msg: any) => {
      process.stdout.write(String(msg));
    },
    readLine: (): string => {
      // 동기식 입력 (실제로는 비동기 권장)
      const buffer = Buffer.alloc(1024);
      const bytesRead = require("fs").readSync(0, buffer, 0, 1024);
      return buffer.toString("utf8", 0, bytesRead).trim();
    },
  },

  // ====== Network API (Phase J: HTTP Support) ======
  net: {
    /**
     * fetch(url, options): Promise<Response>
     * Phase J 완전 구현된 HTTP 클라이언트
     */
    fetch: httpModule.fetch,

    /**
     * HTTP GET 요청 (헬퍼)
     */
    httpGet: httpModule.get,

    /**
     * HTTP POST 요청 (헬퍼)
     */
    httpPost: httpModule.post,

    /**
     * HTTP POST 헤더 포함 (호환성)
     */
    httpPostWithHeaders: async (url: string, body: string, headers: any) => {
      return httpModule.post(url, body, headers);
    },
    connect: (host: string, port: number) => {
      return { host, port, connected: true };
    },
    write: (socket: any, data: string) => {
      console.log(`[Socket] ${socket.host}:${socket.port} > ${data}`);
    },
    read: (socket: any) => {
      return "socket data";
    },
    close: (socket: any) => {
      console.log(`[Socket] ${socket.host}:${socket.port} closed`);
    },
  },

  // ====== JSON API ======
  json: {
    parse: (str: string) => {
      try {
        return JSON.parse(str);
      } catch (e) {
        console.error("JSON parse error:", e);
        return {};
      }
    },
    stringify: (obj: any) => {
      return JSON.stringify(obj);
    },
  },

  // ====== Database API ======
  db: {
    connect: (connectionString: string) => {
      return { connStr: connectionString, data: {} };
    },
    get: (conn: any, key: string) => {
      return conn.data[key] ?? null;
    },
    set: (conn: any, key: string, value: any) => {
      conn.data[key] = value;
    },
    delete: (conn: any, key: string) => {
      delete conn.data[key];
    },
    exists: (conn: any, key: string) => {
      return key in conn.data;
    },
    query: (conn: any, sql: string) => {
      // 간단한 SQL 시뮬레이션
      console.log(`[DB] Query: ${sql}`);
      return [];
    },
    execute: (conn: any, sql: string) => {
      console.log(`[DB] Execute: ${sql}`);
      return 1; // 1 row affected
    },
    beginTransaction: (conn: any) => {
      console.log("[DB] Transaction BEGIN");
    },
    commit: (conn: any) => {
      console.log("[DB] Transaction COMMIT");
    },
    rollback: (conn: any) => {
      console.log("[DB] Transaction ROLLBACK");
    },
    close: (conn: any) => {
      console.log("[DB] Connection closed");
    },
  },

  // ====== Cache API ======
  cache: {
    create: (config: any) => {
      return {
        type: config.type || "memory",
        cache: {},
        ttl: config.ttl || 0,
      };
    },
    get: (cache: any, key: string) => {
      return cache.cache[key] ?? null;
    },
    set: (cache: any, key: string, value: any, ttl: number = 0) => {
      cache.cache[key] = value;
      if (ttl > 0) {
        setTimeout(() => delete cache.cache[key], ttl * 1000);
      }
    },
    delete: (cache: any, key: string) => {
      delete cache.cache[key];
    },
    exists: (cache: any, key: string) => {
      return key in cache.cache;
    },
    clear: (cache: any) => {
      cache.cache = {};
    },
    setTTL: (cache: any, key: string, ttl: number) => {
      if (ttl > 0) {
        setTimeout(() => delete cache.cache[key], ttl * 1000);
      }
    },
    getTTL: (cache: any, key: string) => {
      return 0; // 간단 구현
    },
    size: (cache: any) => {
      return Object.keys(cache.cache).length;
    },
    keys: (cache: any) => {
      return Object.keys(cache.cache);
    },
    values: (cache: any) => {
      return Object.values(cache.cache);
    },
    close: (cache: any) => {
      console.log("[Cache] Closed");
    },
  },

  // ====== HTTP Server API ======
  http: {
    startServer: (port: number, callback: Function) => {
      console.log(`[HTTP] Server starting on port ${port}...`);
      // 간단 시뮬레이션
      setTimeout(() => {
        callback({
          method: "GET",
          url: "/",
          path: "/",
          query: {},
          headers: {},
          body: "",
          res: { writeHead: () => {}, end: () => {} },
        });
      }, 100);
    },
    sendResponse: (req: any, status: number, headers: any, body: string) => {
      console.log(
        `[HTTP] ${status} ${req.method} ${req.url} - Body: ${body.slice(0, 50)}`
      );
      if (req.res) {
        req.res.writeHead(status, headers);
        req.res.end(body);
      }
    },
    stopServer: () => {
      console.log("[HTTP] Server stopped");
    },
  },

  // ====== Agent API ======
  agent: {
    create: (name: string) => {
      return { name, memory: {} };
    },
    remember: (agent: any, key: string, value: any) => {
      agent.memory[key] = value;
    },
    recall: (agent: any, key: string) => {
      return agent.memory[key] ?? null;
    },
    process: (agentName: string, message: string) => {
      return `Agent ${agentName} processed: ${message}`;
    },
  },

  // ====== Proof API ======
  proof: {
    generate: (statement: string, result: boolean) => {
      return {
        statement,
        result,
        timestamp: Date.now(),
        evidence: {},
      };
    },
    verify: (proof: any) => {
      return proof.result === true;
    },
    validateEvidence: (evidence: any) => {
      return Object.keys(evidence).length > 0;
    },
    evaluateAI: (agentName: string, task: string) => {
      return {
        statement: `Task: ${task}`,
        result: task.length > 0,
        timestamp: Date.now(),
        evidence: { agentName },
      };
    },
  },

  // ====== Utility API ======
  typeof: (value: any) => {
    if (value === null) return "null";
    if (Array.isArray(value)) return "array";
    return typeof value;
  },

  object: {
    keys: (obj: any) => {
      return Object.keys(obj || {});
    },
    values: (obj: any) => {
      return Object.values(obj || {});
    },
    entries: (obj: any) => {
      return Object.entries(obj || {});
    },
    assign: (obj1: any, obj2: any) => {
      return Object.assign({}, obj1, obj2);
    },
  },

  time: {
    now: () => {
      return Date.now();
    },
  },

  fs: {
    readFile: (filePath: string) => {
      try {
        return require("fs").readFileSync(filePath, "utf-8");
      } catch (e) {
        return "";
      }
    },
    writeFile: (filePath: string, content: string) => {
      require("fs").writeFileSync(filePath, content, "utf-8");
    },
  },
};

/**
 * VM에 네이티브 API 주입
 */
export function injectNativeAPI(vm: any) {
  vm.io = vmNative.io;
  vm.net = vmNative.net;
  vm.json = vmNative.json;
  vm.db = vmNative.db;
  vm.cache = vmNative.cache;
  vm.http = vmNative.http;
  vm.agent = vmNative.agent;
  vm.proof = vmNative.proof;
  vm.typeof = vmNative.typeof;
  vm.object = vmNative.object;
  vm.time = vmNative.time;
  vm.fs = vmNative.fs;
}
