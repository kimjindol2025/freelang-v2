/**
 * FreeLang Standard Library: std/archive
 *
 * Data compression and archiving utilities
 */

import { gzipSync, gunzipSync, deflateSync, inflateSync } from 'zlib';

/**
 * Compress string with gzip
 * @param data Data to compress
 * @returns Compressed data as base64
 */
export function gzip(data: string): string {
  const compressed = gzipSync(data);
  return compressed.toString('base64');
}

/**
 * Decompress gzip data
 * @param data Compressed data as base64
 * @returns Decompressed string
 */
export function gunzip(data: string): string {
  try {
    const decompressed = gunzipSync(Buffer.from(data, 'base64'));
    return decompressed.toString('utf-8');
  } catch (error) {
    throw new Error('Failed to decompress gzip data');
  }
}

/**
 * Compress string with deflate
 * @param data Data to compress
 * @returns Compressed data as base64
 */
export function deflate(data: string): string {
  const compressed = deflateSync(data);
  return compressed.toString('base64');
}

/**
 * Decompress deflate data
 * @param data Compressed data as base64
 * @returns Decompressed string
 */
export function inflate(data: string): string {
  try {
    const decompressed = inflateSync(Buffer.from(data, 'base64'));
    return decompressed.toString('utf-8');
  } catch (error) {
    throw new Error('Failed to decompress deflate data');
  }
}

/**
 * Calculate compression ratio
 * @param original Original data size
 * @param compressed Compressed data size
 * @returns Compression ratio (0-1)
 */
export function compressionRatio(original: number, compressed: number): number {
  if (original === 0) return 0;
  return 1 - (compressed / original);
}

/**
 * Check if data is compressed
 * @param data Data to check
 * @returns true if likely compressed
 */
export function isCompressed(data: string): boolean {
  // Check for gzip magic number
  if (data.startsWith('H4sI')) return true; // gzip magic number in base64

  // Check for deflate
  if (data.startsWith('eJw')) return true; // deflate magic number in base64

  return false;
}

/**
 * Compress object as JSON
 * @param obj Object to compress
 * @returns Compressed JSON as base64
 */
export function compressObject(obj: any): string {
  const json = JSON.stringify(obj);
  return gzip(json);
}

/**
 * Decompress object from JSON
 * @param data Compressed JSON as base64
 * @returns Decompressed object
 */
export function decompressObject(data: string): any {
  const json = gunzip(data);
  return JSON.parse(json);
}

/**
 * Get uncompressed size estimate
 * @param compressedSize Size of compressed data
 * @param ratio Estimated compression ratio
 * @returns Estimated uncompressed size
 */
export function estimateUncompressedSize(compressedSize: number, ratio: number = 0.5): number {
  if (ratio === 0 || ratio === 1) return compressedSize;
  return Math.round(compressedSize / (1 - ratio));
}
