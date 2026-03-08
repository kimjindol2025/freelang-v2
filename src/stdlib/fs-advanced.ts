/**
 * FreeLang Standard Library: std/fs-advanced
 *
 * Advanced file system operations including directory manipulation,
 * file metadata, and recursive operations.
 */

import { existsSync, mkdirSync, rmdirSync, readdirSync, statSync, copyFileSync, renameSync, chmodSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join, dirname, basename, extname, normalize, isAbsolute } from 'path';

/**
 * File metadata
 */
export interface FileMetadata {
  path: string;
  name: string;
  extension: string;
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  created: Date;
  modified: Date;
  accessed: Date;
  mode: number;
  isSymlink: boolean;
}

/**
 * Directory entry
 */
export interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
}

/**
 * Walk result for recursive directory traversal
 */
export interface WalkResult {
  path: string;
  entries: DirectoryEntry[];
}

/**
 * Create directory (including parent directories)
 * @param path Directory path to create
 * @returns true if created, false if already exists
 */
export function mkdir(path: string): boolean {
  if (existsSync(path)) {
    return false;
  }

  try {
    mkdirSync(path, { recursive: true });
    return true;
  } catch (error) {
    throw new Error(`Failed to create directory: ${path}`);
  }
}

/**
 * Remove directory (must be empty)
 * @param path Directory path to remove
 * @returns true if removed, false if not found
 */
export function rmdir(path: string): boolean {
  if (!existsSync(path)) {
    return false;
  }

  try {
    rmdirSync(path);
    return true;
  } catch (error) {
    throw new Error(`Failed to remove directory: ${path}`);
  }
}

/**
 * Remove directory recursively (including contents)
 * @param path Directory path to remove
 * @returns true if removed, false if not found
 */
export function rmdirRecursive(path: string): boolean {
  if (!existsSync(path)) {
    return false;
  }

  try {
    const entries = readdirSync(path);
    for (const entry of entries) {
      const fullPath = join(path, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        rmdirRecursive(fullPath);
      } else {
        unlinkSync(fullPath);
      }
    }

    rmdirSync(path);
    return true;
  } catch (error) {
    throw new Error(`Failed to remove directory recursively: ${path}`);
  }
}

/**
 * List directory contents
 * @param path Directory path
 * @returns Array of directory entries
 */
export function listDir(path: string): DirectoryEntry[] {
  if (!existsSync(path)) {
    throw new Error(`Directory not found: ${path}`);
  }

  try {
    const entries = readdirSync(path);
    return entries.map(name => {
      const fullPath = join(path, name);
      const stat = statSync(fullPath);

      return {
        name,
        path: fullPath,
        isDirectory: stat.isDirectory(),
        isFile: stat.isFile()
      };
    });
  } catch (error) {
    throw new Error(`Failed to list directory: ${path}`);
  }
}

/**
 * Recursively walk directory tree
 * @param path Directory path to walk
 * @param callback Function called for each directory
 * @returns Array of all directories traversed
 */
export function walkDir(path: string, callback?: (result: WalkResult) => void): string[] {
  const results: string[] = [];

  if (!existsSync(path)) {
    throw new Error(`Directory not found: ${path}`);
  }

  const walk = (currentPath: string) => {
    if (!existsSync(currentPath)) return;

    try {
      const entries = listDir(currentPath);
      results.push(currentPath);

      if (callback) {
        callback({ path: currentPath, entries });
      }

      for (const entry of entries) {
        if (entry.isDirectory) {
          walk(entry.path);
        }
      }
    } catch (error) {
      // Skip on error
    }
  };

  walk(path);
  return results;
}

/**
 * Get file metadata
 * @param path File or directory path
 * @returns File metadata
 */
export function stat(path: string): FileMetadata {
  if (!existsSync(path)) {
    throw new Error(`Path not found: ${path}`);
  }

  try {
    const stats = statSync(path);

    return {
      path,
      name: basename(path),
      extension: extname(path),
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      accessed: stats.atime,
      mode: stats.mode,
      isSymlink: stats.isSymbolicLink()
    };
  } catch (error) {
    throw new Error(`Failed to get file stats: ${path}`);
  }
}

/**
 * Check if path exists
 * @param path File or directory path
 * @returns true if exists
 */
export function exists(path: string): boolean {
  return existsSync(path);
}

/**
 * Check if path is directory
 * @param path Path to check
 * @returns true if directory
 */
export function isDir(path: string): boolean {
  if (!existsSync(path)) return false;

  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if path is file
 * @param path Path to check
 * @returns true if file
 */
export function isFile(path: string): boolean {
  if (!existsSync(path)) return false;

  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/**
 * Copy file
 * @param src Source file path
 * @param dst Destination file path
 * @returns true if copied
 */
export function copyFile(src: string, dst: string): boolean {
  if (!existsSync(src)) {
    throw new Error(`Source file not found: ${src}`);
  }

  try {
    // Ensure destination directory exists
    const dstDir = dirname(dst);
    if (!existsSync(dstDir)) {
      mkdir(dstDir);
    }

    copyFileSync(src, dst);
    return true;
  } catch (error) {
    throw new Error(`Failed to copy file: ${src} -> ${dst}`);
  }
}

/**
 * Move file or directory
 * @param src Source path
 * @param dst Destination path
 * @returns true if moved
 */
export function move(src: string, dst: string): boolean {
  if (!existsSync(src)) {
    throw new Error(`Source not found: ${src}`);
  }

  try {
    // Ensure destination directory exists
    const dstDir = dirname(dst);
    if (!existsSync(dstDir)) {
      mkdir(dstDir);
    }

    renameSync(src, dst);
    return true;
  } catch (error) {
    throw new Error(`Failed to move: ${src} -> ${dst}`);
  }
}

/**
 * Rename file or directory
 * @param path Path to rename
 * @param newName New name
 * @returns true if renamed
 */
export function rename(path: string, newName: string): boolean {
  if (!existsSync(path)) {
    throw new Error(`Path not found: ${path}`);
  }

  try {
    const dir = dirname(path);
    const newPath = join(dir, newName);
    renameSync(path, newPath);
    return true;
  } catch (error) {
    throw new Error(`Failed to rename: ${path}`);
  }
}

/**
 * Change file permissions
 * @param path File path
 * @param mode Mode string (e.g., '0o755') or octal number
 * @returns true if changed
 */
export function chmod(path: string, mode: string | number): boolean {
  if (!existsSync(path)) {
    throw new Error(`Path not found: ${path}`);
  }

  try {
    const numMode = typeof mode === 'string' ? parseInt(mode, 8) : mode;
    chmodSync(path, numMode);
    return true;
  } catch (error) {
    throw new Error(`Failed to change permissions: ${path}`);
  }
}

/**
 * Get total size of file or directory (recursive)
 * @param path File or directory path
 * @returns Size in bytes
 */
export function getSize(path: string): number {
  if (!existsSync(path)) {
    throw new Error(`Path not found: ${path}`);
  }

  const stats = statSync(path);

  if (stats.isFile()) {
    return stats.size;
  }

  if (stats.isDirectory()) {
    let totalSize = 0;

    try {
      const entries = readdirSync(path);

      for (const entry of entries) {
        const fullPath = join(path, entry);
        totalSize += getSize(fullPath);
      }
    } catch {
      // Ignore errors on access
    }

    return totalSize;
  }

  return 0;
}

/**
 * Find files by pattern (glob-like)
 * @param path Base directory path
 * @param pattern Pattern to match (supports * and ?)
 * @returns Array of matching file paths
 */
export function findFiles(path: string, pattern: string): string[] {
  const results: string[] = [];

  if (!existsSync(path)) {
    throw new Error(`Directory not found: ${path}`);
  }

  const patternRegex = new RegExp(
    '^' + pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
      + '$'
  );

  const walk = (currentPath: string) => {
    if (!existsSync(currentPath)) return;

    try {
      const entries = readdirSync(currentPath);

      for (const entry of entries) {
        const fullPath = join(currentPath, entry);
        const stats = statSync(fullPath);

        if (patternRegex.test(entry) && stats.isFile()) {
          results.push(fullPath);
        }

        if (stats.isDirectory()) {
          walk(fullPath);
        }
      }
    } catch {
      // Skip on error
    }
  };

  walk(path);
  return results;
}

/**
 * Get file extension
 * @param path File path
 * @returns Extension including dot, empty string if none
 */
export function getExtension(path: string): string {
  return extname(path);
}

/**
 * Get file name without extension
 * @param path File path
 * @returns File name without extension
 */
export function getName(path: string): string {
  const name = basename(path);
  const ext = extname(name);
  return ext ? name.slice(0, -ext.length) : name;
}

/**
 * Get parent directory
 * @param path File or directory path
 * @returns Parent directory path
 */
export function getParent(path: string): string {
  return dirname(path);
}

/**
 * Join path segments
 * @param parts Path parts
 * @returns Joined path
 */
export function joinPath(...parts: string[]): string {
  return join(...parts);
}

/**
 * Normalize path
 * @param path Path to normalize
 * @returns Normalized path
 */
export function normalizePath(path: string): string {
  return normalize(path).replace(/\\/g, '/');
}

/**
 * Check if path is absolute
 * @param path Path to check
 * @returns true if absolute
 */
export function isAbsolutePath(path: string): boolean {
  return isAbsolute(path);
}

/**
 * Get relative path from base to target
 * @param base Base path
 * @param target Target path
 * @returns Relative path
 */
export function getRelativePath(base: string, target: string): string {
  // Simple implementation
  if (target.startsWith(base)) {
    return target.slice(base.length).replace(/^\//, '');
  }
  return target;
}

/**
 * Export all file system functions as default object
 */
export const fs = {
  mkdir,
  rmdir,
  rmdirRecursive,
  listDir,
  walkDir,
  stat,
  exists,
  isDir,
  isFile,
  copyFile,
  move,
  rename,
  chmod,
  getSize,
  findFiles,
  getExtension,
  getName,
  getParent,
  joinPath,
  normalizePath,
  isAbsolutePath,
  getRelativePath
};
