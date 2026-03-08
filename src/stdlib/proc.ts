/**
 * FreeLang Standard Library: std/proc
 *
 * Process management utilities
 */

import { spawn, spawnSync, execSync } from 'child_process';
import { ChildProcess } from 'child_process';

/**
 * Execute command synchronously
 * @param command Command to execute
 * @param options Options
 * @returns Command output
 */
export function execSync_(command: string): string {
  try {
    const output = execSync(command, { encoding: 'utf-8' });
    return output;
  } catch (error: any) {
    throw new Error(`Command failed: ${error.message}`);
  }
}

/**
 * Execute command asynchronously
 * @param command Command to execute
 * @param args Arguments array
 * @returns Promise with output
 */
export async function exec(command: string, args: string[] = []): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}: ${errorOutput}`));
      } else {
        resolve(output);
      }
    });

    child.on('error', reject);
  });
}

/**
 * Get current process ID
 * @returns Process ID
 */
export function getPid(): number {
  return process.pid;
}

/**
 * Get parent process ID
 * @returns Parent process ID
 */
export function getPpid(): number | undefined {
  return process.ppid;
}

/**
 * Get process uptime in seconds
 * @returns Uptime in seconds
 */
export function getUptime(): number {
  return process.uptime();
}

/**
 * Get process memory usage
 * @returns Object with memory info (in MB)
 */
export function getMemoryUsage(): object {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024),
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
    external: Math.round(usage.external / 1024 / 1024)
  };
}

/**
 * Get process environment
 * @returns Environment object
 */
export function getEnv(): Record<string, string> {
  return { ...process.env } as Record<string, string>;
}

/**
 * Get command line arguments
 * @returns Arguments array
 */
export function getArgs(): string[] {
  return process.argv.slice(2);
}

/**
 * Kill process
 * @param pid Process ID
 * @param signal Signal to send
 * @returns true if successful
 */
export function kill(pid: number, signal: string = 'SIGTERM'): boolean {
  try {
    process.kill(pid, signal);
    return true;
  } catch {
    return false;
  }
}

/**
 * Exit process
 * @param code Exit code
 */
export function exit(code: number = 0): void {
  process.exit(code);
}

/**
 * Spawn process
 * @param command Command to spawn
 * @param args Arguments
 * @returns Child process instance
 */
export function spawn_(command: string, args: string[] = []): ChildProcess {
  return spawn(command, args);
}

/**
 * Get process title
 * @returns Process title
 */
export function getTitle(): string {
  return process.title;
}

/**
 * Set process title
 * @param title New title
 */
export function setTitle(title: string): void {
  process.title = title;
}
