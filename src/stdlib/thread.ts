/**
 * FreeLang Standard Library: std/thread
 *
 * Threading and worker utilities
 */

import { Worker } from 'worker_threads';

/**
 * Worker thread wrapper
 */
export class WorkerThread {
  private worker: Worker;
  private isRunning: boolean = false;

  constructor(scriptPath: string) {
    this.worker = new Worker(scriptPath);
    this.isRunning = true;
  }

  /**
   * Send message to worker
   * @param message Message to send
   */
  send(message: any): void {
    if (this.isRunning) {
      this.worker.postMessage(message);
    }
  }

  /**
   * Register message handler
   * @param handler Handler function
   */
  on(handler: (message: any) => void): void {
    this.worker.on('message', handler);
  }

  /**
   * Register error handler
   * @param handler Error handler function
   */
  onError(handler: (error: Error) => void): void {
    this.worker.on('error', handler);
  }

  /**
   * Wait for worker to exit
   * @returns Promise that resolves when worker exits
   */
  async wait(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.worker.on('exit', (code) => {
        this.isRunning = false;
        resolve(code || 0);
      });
      this.worker.on('error', reject);
    });
  }

  /**
   * Terminate worker
   * @returns Promise that resolves when terminated
   */
  async terminate(): Promise<void> {
    if (this.isRunning) {
      this.isRunning = false;
      await this.worker.terminate();
    }
  }

  /**
   * Check if worker is running
   * @returns true if running
   */
  isAlive(): boolean {
    return this.isRunning;
  }
}

/**
 * Thread pool
 */
export class ThreadPool {
  private workers: WorkerThread[] = [];
  private currentIndex: number = 0;
  private scriptPath: string;
  private size: number;

  constructor(scriptPath: string, size: number = 4) {
    this.scriptPath = scriptPath;
    this.size = size;
    this.initialize();
  }

  private initialize(): void {
    for (let i = 0; i < this.size; i++) {
      this.workers.push(new WorkerThread(this.scriptPath));
    }
  }

  /**
   * Get next available worker
   * @returns Worker thread
   */
  getWorker(): WorkerThread {
    const worker = this.workers[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.size;
    return worker;
  }

  /**
   * Execute task on worker pool
   * @param task Task data
   * @returns Promise with result
   */
  async execute(task: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const worker = this.getWorker();

      const timeout = setTimeout(() => {
        reject(new Error('Task timeout'));
      }, 30000);

      const messageHandler = (result: any) => {
        clearTimeout(timeout);
        resolve(result);
      };

      const errorHandler = (error: Error) => {
        clearTimeout(timeout);
        reject(error);
      };

      // Store handlers for cleanup
      (worker as any)._messageHandler = messageHandler;
      (worker as any)._errorHandler = errorHandler;

      worker.send(task);
    });
  }

  /**
   * Terminate all workers
   * @returns Promise that resolves when done
   */
  async terminate(): Promise<void> {
    for (const worker of this.workers) {
      await worker.terminate();
    }
    this.workers = [];
  }

  /**
   * Get pool size
   * @returns Number of workers
   */
  getSize(): number {
    return this.size;
  }
}

/**
 * Create worker thread
 * @param scriptPath Path to worker script
 * @returns WorkerThread instance
 */
export function createWorker(scriptPath: string): WorkerThread {
  return new WorkerThread(scriptPath);
}

/**
 * Create thread pool
 * @param scriptPath Path to worker script
 * @param size Pool size
 * @returns ThreadPool instance
 */
export function createPool(scriptPath: string, size: number = 4): ThreadPool {
  return new ThreadPool(scriptPath, size);
}

/**
 * Get number of CPU cores
 * @returns Core count
 */
export function getCoreCount(): number {
  const os = require('os');
  return os.cpus().length;
}
