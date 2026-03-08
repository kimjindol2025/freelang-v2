/**
 * FreeLang Standard Library: std/path
 *
 * File path manipulation utilities
 */

import { join, resolve, dirname, basename, extname, sep, delimiter } from 'path';

/**
 * Join path segments
 * @param parts Path parts to join
 * @returns Joined path
 */
export function joinPath(...parts: string[]): string {
  return join(...parts);
}

/**
 * Resolve absolute path
 * @param parts Path parts to resolve
 * @returns Absolute path
 */
export function resolvePath(...parts: string[]): string {
  return resolve(...parts);
}

/**
 * Get directory name
 * @param filepath File path
 * @returns Directory path
 */
export function dir(filepath: string): string {
  return dirname(filepath);
}

/**
 * Get file name with extension
 * @param filepath File path
 * @returns File name
 */
export function base(filepath: string): string {
  return basename(filepath);
}

/**
 * Get file extension
 * @param filepath File path
 * @returns Extension (including dot)
 */
export function ext(filepath: string): string {
  return extname(filepath);
}

/**
 * Get file name without extension
 * @param filepath File path
 * @returns File name without extension
 */
export function nameOnly(filepath: string): string {
  const name = basename(filepath);
  const ext = extname(name);
  return ext ? name.slice(0, -ext.length) : name;
}

/**
 * Check if path is absolute
 * @param filepath Path to check
 * @returns true if absolute
 */
export function isAbsolute(filepath: string): boolean {
  return filepath.startsWith('/') || /^[a-zA-Z]:/.test(filepath);
}

/**
 * Get path separator
 * @returns Path separator (\\ on Windows, / on Unix)
 */
export function separator(): string {
  return sep;
}

/**
 * Get path delimiter
 * @returns Path delimiter (; on Windows, : on Unix)
 */
export function pathDelimiter(): string {
  return delimiter;
}

/**
 * Normalize path
 * @param filepath Path to normalize
 * @returns Normalized path
 */
export function normalize(filepath: string): string {
  return filepath.replace(/\\/g, '/').replace(/\/+/g, '/');
}

/**
 * Check if path contains relative components
 * @param filepath Path to check
 * @returns true if contains .. or .
 */
export function hasRelativeComponents(filepath: string): boolean {
  return filepath.includes('..') || filepath.includes('./');
}
