/**
 * FreeLang Standard Library: std/debug
 *
 * Debugging utilities
 */

/**
 * Log debug message
 * @param message Message to log
 * @param context Optional context data
 */
export function log(message: string, context?: any): void {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  console.log(`[${timestamp}] DEBUG: ${message}${contextStr}`);
}

/**
 * Log warning message
 * @param message Message to log
 * @param context Optional context data
 */
export function warn(message: string, context?: any): void {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  console.warn(`[${timestamp}] WARN: ${message}${contextStr}`);
}

/**
 * Log error message
 * @param message Message to log
 * @param error Optional error object
 */
export function error(message: string, error?: Error): void {
  const timestamp = new Date().toISOString();
  const errorStr = error ? `\n${error.stack}` : '';
  console.error(`[${timestamp}] ERROR: ${message}${errorStr}`);
}

/**
 * Assert condition
 * @param condition Condition to check
 * @param message Error message if false
 */
export function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Print variable with type
 * @param variable Variable to print
 * @param name Optional variable name
 */
export function inspect(variable: any, name?: string): void {
  const type = typeof variable;
  const nameStr = name ? `${name}: ` : '';
  console.log(`${nameStr}(${type}) ${JSON.stringify(variable)}`);
}

/**
 * Get stack trace
 * @returns Stack trace string
 */
export function stackTrace(): string {
  const error = new Error();
  return error.stack || '';
}

/**
 * Print stack trace
 */
export function printStackTrace(): void {
  console.log(stackTrace());
}

/**
 * Measure function execution time
 * @param fn Function to measure
 * @param label Optional label
 * @returns Execution time in milliseconds
 */
export function measure(fn: () => void, label?: string): number {
  const start = performance.now();
  fn();
  const end = performance.now();
  const duration = end - start;

  if (label) {
    console.log(`[PERF] ${label}: ${duration.toFixed(3)}ms`);
  }

  return duration;
}

/**
 * Create timer
 * @param label Timer label
 */
export function time(label: string): void {
  console.time(label);
}

/**
 * End timer
 * @param label Timer label
 */
export function timeEnd(label: string): void {
  console.timeEnd(label);
}

/**
 * Count function calls
 * @param label Counter label
 */
export function count(label: string = 'default'): void {
  console.count(label);
}

/**
 * Reset counter
 * @param label Counter label
 */
export function countReset(label: string = 'default'): void {
  console.countReset(label);
}

/**
 * Trace function calls
 * @param label Trace label
 */
export function trace(label?: string): void {
  console.trace(label);
}

/**
 * Group logs
 * @param label Group label
 */
export function group(label?: string): void {
  console.group(label);
}

/**
 * End group
 */
export function groupEnd(): void {
  console.groupEnd();
}

/**
 * Clear console
 */
export function clear(): void {
  console.clear();
}
