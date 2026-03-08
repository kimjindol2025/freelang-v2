/**
 * FreeLang Standard Library: std/temp
 *
 * Temporary file and directory management
 */

import { mkdtempSync, writeFileSync, readFileSync, unlinkSync, rmdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

/**
 * Create temporary directory
 * @param prefix Optional prefix for directory name
 * @returns Path to temporary directory
 */
export function tmpDir(prefix?: string): string {
  const prefixStr = prefix || 'tmp-';
  const tempRoot = tmpdir();
  return mkdtempSync(join(tempRoot, prefixStr));
}

/**
 * Create temporary file
 * @param prefix Optional prefix for file name
 * @param suffix Optional suffix for file name
 * @returns Path to temporary file
 */
export function tmpFile(prefix?: string, suffix?: string): string {
  const tempRoot = tmpdir();
  const prefixStr = prefix || 'tmp-';
  const suffixStr = suffix || '';
  const random = randomBytes(8).toString('hex');
  const filename = prefixStr + random + suffixStr;
  const filepath = join(tempRoot, filename);

  // Create empty file
  writeFileSync(filepath, '');
  return filepath;
}

/**
 * Write content to temporary file
 * @param content File content
 * @param prefix Optional prefix for file name
 * @param suffix Optional suffix for file name
 * @returns Path to temporary file
 */
export function tmpFileWith(content: string, prefix?: string, suffix?: string): string {
  const filepath = tmpFile(prefix, suffix);
  writeFileSync(filepath, content);
  return filepath;
}

/**
 * Read content from file
 * @param filepath Path to file
 * @returns File content as string
 */
export function read(filepath: string): string {
  return readFileSync(filepath, 'utf-8');
}

/**
 * Write content to file
 * @param filepath Path to file
 * @param content Content to write
 */
export function write(filepath: string, content: string): void {
  writeFileSync(filepath, content, 'utf-8');
}

/**
 * Delete file
 * @param filepath Path to file
 */
export function deleteFile(filepath: string): void {
  try {
    unlinkSync(filepath);
  } catch (error) {
    // File might already be deleted
  }
}

/**
 * Delete directory
 * @param dirpath Path to directory
 */
export function deleteDir(dirpath: string): void {
  try {
    rmdirSync(dirpath);
  } catch (error) {
    // Directory might already be deleted
  }
}

/**
 * Get temp directory path
 * @returns Path to system temp directory
 */
export function getTempDir(): string {
  return tmpdir();
}
