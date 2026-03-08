/**
 * FreeLang Standard Library: std/sys
 *
 * System information and utilities
 */

import { platform, arch, cpus, totalmem, freemem, uptime, homedir, tmpdir, release } from 'os';

/**
 * Get current platform
 * @returns Platform name (linux, darwin, win32, etc)
 */
export function getPlatform(): string {
  return platform();
}

/**
 * Get CPU architecture
 * @returns Architecture (x64, arm64, etc)
 */
export function getArch(): string {
  return arch();
}

/**
 * Get number of CPUs
 * @returns CPU count
 */
export function getCpuCount(): number {
  return cpus().length;
}

/**
 * Get CPU info
 * @returns Array of CPU info objects
 */
export function getCpuInfo(): object[] {
  return cpus().map((cpu, i) => ({
    index: i,
    model: cpu.model,
    speed: cpu.speed,
    cores: cpu.times
  }));
}

/**
 * Get total system memory in bytes
 * @returns Total memory in bytes
 */
export function getTotalMemory(): number {
  return totalmem();
}

/**
 * Get free system memory in bytes
 * @returns Free memory in bytes
 */
export function getFreeMemory(): number {
  return freemem();
}

/**
 * Get memory usage in MB
 * @returns Object with total and free in MB
 */
export function getMemoryUsage(): object {
  const total = totalmem();
  const free = freemem();
  return {
    total: Math.round(total / 1024 / 1024),
    free: Math.round(free / 1024 / 1024),
    used: Math.round((total - free) / 1024 / 1024),
    percent: Math.round(((total - free) / total) * 100)
  };
}

/**
 * Get system uptime in seconds
 * @returns Uptime in seconds
 */
export function getUptime(): number {
  return Math.floor(uptime());
}

/**
 * Get home directory path
 * @returns Home directory path
 */
export function getHomeDir(): string {
  return homedir();
}

/**
 * Get temp directory path
 * @returns Temp directory path
 */
export function getTempDir(): string {
  return tmpdir();
}

/**
 * Get environment variable
 * @param key Environment variable name
 * @param defaultValue Default value if not found
 * @returns Environment variable value or default
 */
export function getEnv(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue;
}

/**
 * Get all environment variables
 * @returns Object with all env variables
 */
export function getAllEnv(): object {
  return process.env;
}

/**
 * Get OS version
 * @returns OS release version string
 */
export function getOsVersion(): string {
  return release();
}
