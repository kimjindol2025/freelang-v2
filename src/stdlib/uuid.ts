/**
 * FreeLang Standard Library: std/uuid
 *
 * UUID generation utilities (v4, v1)
 */

import { randomBytes } from 'crypto';

/**
 * Generate UUID v4 (random)
 * @returns Random UUID string
 */
export function v4(): string {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 1

  const hex = bytes.toString('hex');
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32)
  ].join('-');
}

/**
 * Generate UUID v1 (timestamp-based)
 * @returns Timestamp UUID string
 */
export function v1(): string {
  const timestamp = Date.now();
  const clockSeq = Math.floor(Math.random() * 0x4000) | 0x8000;
  const node = randomBytes(6).toString('hex');

  const ts = Math.floor(timestamp * 10000) + 122192928000000000;
  const tsHi = Math.floor(ts / 0x100000000).toString(16).padStart(8, '0');
  const tsLo = (ts % 0x100000000).toString(16).padStart(8, '0');
  const tsVer = tsLo.substring(4, 8) + '4' + tsLo.substring(5);

  const clockHex = clockSeq.toString(16).padStart(4, '0');

  return `${tsHi.substring(0, 8)}-${tsHi.substring(8, 12)}-1${tsVer.substring(1, 4)}-${clockHex}-${node}`;
}

/**
 * Check if string is valid UUID
 * @param uuid UUID string to validate
 * @returns true if valid UUID format
 */
export function isValid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Generate multiple UUIDs
 * @param count Number of UUIDs to generate
 * @returns Array of UUID strings
 */
export function batch(count: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(v4());
  }
  return result;
}
