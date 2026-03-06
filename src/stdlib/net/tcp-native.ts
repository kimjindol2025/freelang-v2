/**
 * FreeLang TCP Native Functions
 * Phase 3 Level 3: TCP 소켓 지원 (Node.js net 모듈 활용)
 *
 * 목표: FFI .so 파일 없이 Node.js net 모듈로 TCP 구현
 *
 * FFI 대신 JavaScript native 방식:
 * - NativeFunctionRegistry에 executor 함수 등록
 * - Node.js net.Socket / net.Server 사용
 */

import * as net from 'net';
import { NativeFunctionRegistry } from '../../vm/native-function-registry';
import { FFIFunctionSignature } from '../../ffi/type-bindings';

/**
 * TCP 소켓 및 서버 풀 관리
 * ID → Socket/Server 매핑
 */
class TCPSocketPool {
  private nextId = 1000;
  private sockets: Map<number, net.Socket> = new Map();
  private servers: Map<number, net.Server> = new Map();
  private receiveBuffers: Map<number, string> = new Map();  // 수신 데이터 버퍼

  /**
   * 소켓 등록 및 ID 생성
   */
  registerSocket(socket: net.Socket): number {
    const id = this.nextId++;
    this.sockets.set(id, socket);
    this.receiveBuffers.set(id, '');

    // 데이터 수신 시 버퍼에 저장
    socket.on('data', (chunk: Buffer) => {
      const buffer = this.receiveBuffers.get(id) || '';
      this.receiveBuffers.set(id, buffer + chunk.toString());
    });

    // 에러 처리
    socket.on('error', (err) => {
      console.error(`[TCP] Socket ${id} error:`, err.message);
    });

    // 종료 시 정리
    socket.on('close', () => {
      this.sockets.delete(id);
      this.receiveBuffers.delete(id);
    });

    return id;
  }

  /**
   * 서버 등록 및 ID 생성
   */
  registerServer(server: net.Server): number {
    const id = this.nextId++;
    this.servers.set(id, server);
    return id;
  }

  /**
   * 소켓 조회
   */
  getSocket(id: number): net.Socket | null {
    return this.sockets.get(id) || null;
  }

  /**
   * 서버 조회
   */
  getServer(id: number): net.Server | null {
    return this.servers.get(id) || null;
  }

  /**
   * 소켓 종료
   */
  closeSocket(id: number): void {
    const socket = this.sockets.get(id);
    if (socket) {
      socket.end();
      this.sockets.delete(id);
      this.receiveBuffers.delete(id);
    }
  }

  /**
   * 서버 종료
   */
  closeServer(id: number): void {
    const server = this.servers.get(id);
    if (server) {
      server.close();
      this.servers.delete(id);
    }
  }

  /**
   * 수신 버퍼에서 데이터 읽기
   */
  readBuffer(id: number): string {
    const buffer = this.receiveBuffers.get(id) || '';
    this.receiveBuffers.set(id, '');  // 읽은 데이터는 버퍼에서 제거
    return buffer;
  }

  /**
   * 수신 버퍼에서 1줄 읽기 (CRLF 기준)
   */
  readLine(id: number): string | null {
    const buffer = this.receiveBuffers.get(id) || '';
    const index = buffer.indexOf('\n');
    if (index === -1) return null;

    const line = buffer.substring(0, index + 1);
    this.receiveBuffers.set(id, buffer.substring(index + 1));
    return line;
  }
}

// 글로벌 소켓 풀
const socketPool = new TCPSocketPool();

/**
 * TCP 네이티브 함수 등록
 */
export function registerTCPFunctions(registry: NativeFunctionRegistry): void {
  // ── 서버 함수 ──

  /**
   * tcp_listen(port: int, backlog: int) → server_id: int
   */
  registry.register({
    name: 'tcp_listen',
    module: 'net',
    signature: {
      name: 'tcp_listen',
      returnType: 'int',
      parameters: [
        { name: 'port', type: 'int' },
        { name: 'backlog', type: 'int' }
      ],
      category: 'stream'
    } as FFIFunctionSignature,
    executor: (args: any[]) => {
      // args: [port, backlog]
      const port = args[0] as number;
      const backlog = (args[1] as number) || 128;

      try {
        const server = net.createServer((socket: net.Socket) => {
          // 클라이언트 연결 시 자동으로 풀에 등록
          socketPool.registerSocket(socket);
        });

        // server.listen(port, [host], [backlog], [callback])
        server.listen(port, '0.0.0.0', backlog, () => {
          // 수신 대기 중
        });

        return socketPool.registerServer(server);
      } catch (err: any) {
        throw new Error(`tcp_listen failed: ${err.message}`);
      }
    }
  });

  /**
   * tcp_accept(server_id: int, timeout: int) → socket_id: int
   *
   * 참고: Node.js 비동기 I/O이므로 완벽한 동기 구현은 불가능.
   * 현재는 기본 accept 구현. 실제로는 event-driven 방식으로 수정 필요.
   */
  registry.register({
    name: 'tcp_accept',
    module: 'net',
    signature: {
      name: 'tcp_accept',
      returnType: 'int',
      parameters: [
        { name: 'server_id', type: 'int' },
        { name: 'timeout', type: 'int' }
      ],
      category: 'stream'
    } as FFIFunctionSignature,
    executor: (args: any[]) => {
      const serverId = args[0] as number;
      const timeout = args[1] as number;
      const server = socketPool.getServer(serverId);
      if (!server) {
        throw new Error(`Server not found: ${serverId}`);
      }
      // FFI_NOTE: 비동기 I/O이므로 실제로는 콜백 기반으로 수정 필요
      return -1;  // 임시 구현
    }
  });

  // ── 클라이언트 함수 ──

  /**
   * tcp_connect(host: string, port: int) → socket_id: int
   */
  registry.register({
    name: 'tcp_connect',
    module: 'net',
    signature: {
      name: 'tcp_connect',
      returnType: 'int',
      parameters: [
        { name: 'host', type: 'string' },
        { name: 'port', type: 'int' }
      ],
      category: 'stream'
    } as FFIFunctionSignature,
    executor: (args: any[]) => {
      const host = args[0] as string;
      const port = args[1] as number;

      try {
        const socket = net.createConnection(port, host);
        return socketPool.registerSocket(socket);
      } catch (err: any) {
        throw new Error(`tcp_connect failed: ${err.message}`);
      }
    }
  });

  // ── 송수신 함수 ──

  /**
   * tcp_send(socket_id: int, data: string) → bytes_sent: int
   */
  registry.register({
    name: 'tcp_send',
    module: 'net',
    signature: {
      name: 'tcp_send',
      returnType: 'int',
      parameters: [
        { name: 'socket_id', type: 'int' },
        { name: 'data', type: 'string' }
      ],
      category: 'stream'
    } as FFIFunctionSignature,
    executor: (args: any[]) => {
      const socketId = args[0] as number;
      const data = args[1] as string;

      const socket = socketPool.getSocket(socketId);
      if (!socket) {
        throw new Error(`Socket not found: ${socketId}`);
      }

      try {
        const bytes = data.length;
        socket.write(data);
        return bytes;
      } catch (err: any) {
        throw new Error(`tcp_send failed: ${err.message}`);
      }
    }
  });

  /**
   * tcp_recv(socket_id: int, timeout: int) → data: string
   *
   * timeout (밀리초): 데이터를 기다리는 최대 시간
   * 반환: 수신한 데이터 (timeout 시 빈 문자열)
   */
  registry.register({
    name: 'tcp_recv',
    module: 'net',
    signature: {
      name: 'tcp_recv',
      returnType: 'string',
      parameters: [
        { name: 'socket_id', type: 'int' },
        { name: 'timeout', type: 'int' }
      ],
      category: 'stream'
    } as FFIFunctionSignature,
    executor: (args: any[]) => {
      const socketId = args[0] as number;
      const timeout = args[1] as number;

      const socket = socketPool.getSocket(socketId);
      if (!socket) {
        throw new Error(`Socket not found: ${socketId}`);
      }

      try {
        // 현재 버퍼의 데이터 반환
        // FFI_NOTE: 동기식 read/write가 필요하면 별도 event loop 필요
        const data = socketPool.readBuffer(socketId);
        return data || '';
      } catch (err: any) {
        throw new Error(`tcp_recv failed: ${err.message}`);
      }
    }
  });

  /**
   * tcp_recv_line(socket_id: int, timeout: int) → line: string
   *
   * CRLF 기준으로 1줄 읽기
   */
  registry.register({
    name: 'tcp_recv_line',
    module: 'net',
    signature: {
      name: 'tcp_recv_line',
      returnType: 'string',
      parameters: [
        { name: 'socket_id', type: 'int' },
        { name: 'timeout', type: 'int' }
      ],
      category: 'stream'
    } as FFIFunctionSignature,
    executor: (args: any[]) => {
      const socketId = args[0] as number;
      const timeout = args[1] as number;

      const socket = socketPool.getSocket(socketId);
      if (!socket) {
        throw new Error(`Socket not found: ${socketId}`);
      }

      try {
        const line = socketPool.readLine(socketId);
        return line || '';
      } catch (err: any) {
        throw new Error(`tcp_recv_line failed: ${err.message}`);
      }
    }
  });

  // ── 제어 함수 ──

  /**
   * tcp_close(socket_id: int) → void
   */
  registry.register({
    name: 'tcp_close',
    module: 'net',
    signature: {
      name: 'tcp_close',
      returnType: 'int',
      parameters: [
        { name: 'socket_id', type: 'int' }
      ],
      category: 'stream'
    } as FFIFunctionSignature,
    executor: (args: any[]) => {
      const socketId = args[0] as number;
      socketPool.closeSocket(socketId);
      return null;
    }
  });

  /**
   * tcp_close_server(server_id: int) → void
   */
  registry.register({
    name: 'tcp_close_server',
    module: 'net',
    signature: {
      name: 'tcp_close_server',
      returnType: 'int',
      parameters: [
        { name: 'server_id', type: 'int' }
      ],
      category: 'stream'
    } as FFIFunctionSignature,
    executor: (args: any[]) => {
      const serverId = args[0] as number;
      socketPool.closeServer(serverId);
      return null;
    }
  });

  process.stderr.write('✅ TCP native functions registered\n');
}
