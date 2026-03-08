/**
 * FreeLang Standard Library: std/udp
 *
 * UDP socket utilities
 */

import { createSocket, Socket } from 'dgram';

/**
 * UDP Socket wrapper
 */
export class UDPSocket {
  private socket: Socket;
  private port: number;
  private host: string;

  constructor(version: 'udp4' | 'udp6' = 'udp4') {
    this.socket = createSocket(version);
    this.port = 0;
    this.host = '';
  }

  /**
   * Bind socket to port
   * @param port Port to bind to
   * @param host Host to bind to
   * @returns Promise that resolves when bound
   */
  async bind(port: number, host?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.port = port;
      this.host = host || '0.0.0.0';

      this.socket.bind(port, this.host, () => {
        resolve();
      });

      this.socket.on('error', reject);
    });
  }

  /**
   * Send message
   * @param message Message data
   * @param port Destination port
   * @param host Destination host
   * @returns Promise that resolves when sent
   */
  async send(message: string, port: number, host: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const buffer = Buffer.from(message, 'utf-8');

      this.socket.send(buffer, port, host, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Register message handler
   * @param handler Handler function
   */
  on(handler: (message: string, info: any) => void): void {
    this.socket.on('message', (buffer, remoteInfo) => {
      const message = buffer.toString('utf-8');
      handler(message, remoteInfo);
    });
  }

  /**
   * Register error handler
   * @param handler Error handler
   */
  onError(handler: (error: Error) => void): void {
    this.socket.on('error', handler);
  }

  /**
   * Close socket
   * @returns Promise that resolves when closed
   */
  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.socket.close(() => {
        resolve();
      });
    });
  }

  /**
   * Get socket address info
   * @returns Object with address, family, port
   */
  getAddress(): any {
    return this.socket.address();
  }

  /**
   * Get port
   * @returns Bound port
   */
  getPort(): number {
    return this.port;
  }

  /**
   * Get host
   * @returns Bound host
   */
  getHost(): string {
    return this.host;
  }
}

/**
 * Create UDP socket
 * @param version UDP version (udp4 or udp6)
 * @returns UDPSocket instance
 */
export function createUDPSocket(version: 'udp4' | 'udp6' = 'udp4'): UDPSocket {
  return new UDPSocket(version);
}

/**
 * Send UDP message
 * @param message Message to send
 * @param port Destination port
 * @param host Destination host
 * @returns Promise that resolves when sent
 */
export async function sendMessage(message: string, port: number, host: string): Promise<void> {
  const socket = new UDPSocket('udp4');

  try {
    await socket.send(message, port, host);
  } finally {
    await socket.close();
  }
}
