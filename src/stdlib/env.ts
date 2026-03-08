/**
 * FreeLang Standard Library: std/env
 *
 * Environment and process utilities
 */

/**
 * Get environment variable
 * @param key Variable name
 * @param defaultValue Default value if not found
 * @returns Variable value or default
 */
export function get(key: string, defaultValue?: string): string | undefined {
  return process.env[key] ?? defaultValue;
}

/**
 * Set environment variable
 * @param key Variable name
 * @param value Variable value
 */
export function set(key: string, value: string): void {
  process.env[key] = value;
}

/**
 * Check if environment variable exists
 * @param key Variable name
 * @returns true if exists
 */
export function has(key: string): boolean {
  return key in process.env;
}

/**
 * Delete environment variable
 * @param key Variable name
 */
export function delete_(key: string): void {
  delete process.env[key];
}

/**
 * Get all environment variables
 * @returns Object with all variables
 */
export function all(): Record<string, string> {
  return { ...process.env } as Record<string, string>;
}

/**
 * Get command line arguments
 * @returns Array of arguments (excluding node and script path)
 */
export function args(): string[] {
  return process.argv.slice(2);
}

/**
 * Get current working directory
 * @returns Current directory path
 */
export function cwd(): string {
  return process.cwd();
}

/**
 * Change working directory
 * @param path New directory path
 */
export function chdir(path: string): void {
  process.chdir(path);
}

/**
 * Get process ID
 * @returns Process ID
 */
export function pid(): number {
  return process.pid;
}

/**
 * Get parent process ID
 * @returns Parent process ID
 */
export function ppid(): number | undefined {
  return process.ppid;
}

/**
 * Get Node.js version
 * @returns Version string
 */
export function version(): string {
  return process.version;
}

/**
 * Get all versions
 * @returns Object with version info
 */
export function versions(): Record<string, string> {
  return process.versions;
}

/**
 * Get OS platform
 * @returns Platform string
 */
export function platform(): string {
  return process.platform;
}

/**
 * Get CPU architecture
 * @returns Architecture string
 */
export function arch(): string {
  return process.arch;
}

/**
 * Exit process
 * @param code Exit code
 */
export function exit(code?: number): void {
  process.exit(code);
}
