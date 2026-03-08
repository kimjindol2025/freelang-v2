/**
 * FreeLang Standard Library: std/otp
 *
 * One-Time Password (OTP) generation and verification
 */

import { createHmac, randomBytes } from 'crypto';

/**
 * Generate TOTP (Time-based OTP)
 * @param secret Base32 encoded secret
 * @param time Time in milliseconds (optional)
 * @param digits Number of digits (default: 6)
 * @returns TOTP code
 */
export function totp(secret: string, time?: number, digits: number = 6): string {
  const currentTime = time || Date.now();
  const timeCounter = Math.floor(currentTime / 30000); // 30 second window

  return generateHOTP(secret, timeCounter, digits);
}

/**
 * Generate HOTP (HMAC-based OTP)
 * @param secret Base32 encoded secret
 * @param counter Counter value
 * @param digits Number of digits (default: 6)
 * @returns HOTP code
 */
export function hotp(secret: string, counter: number, digits: number = 6): string {
  return generateHOTP(secret, counter, digits);
}

/**
 * Verify TOTP code
 * @param secret Base32 encoded secret
 * @param code Code to verify
 * @param window Time window tolerance (default: 1)
 * @returns true if valid
 */
export function verifyTotp(secret: string, code: string, window: number = 1): boolean {
  const currentTime = Date.now();
  const timeCounter = Math.floor(currentTime / 30000);

  for (let i = -window; i <= window; i++) {
    if (generateHOTP(secret, timeCounter + i, code.length) === code) {
      return true;
    }
  }

  return false;
}

/**
 * Verify HOTP code
 * @param secret Base32 encoded secret
 * @param counter Counter value
 * @param code Code to verify
 * @returns true if valid
 */
export function verifyHotp(secret: string, counter: number, code: string): boolean {
  return generateHOTP(secret, counter, code.length) === code;
}

/**
 * Generate random base32 secret
 * @param length Secret length in bytes
 * @returns Base32 encoded secret
 */
export function generateSecret(length: number = 20): string {
  const bytes = randomBytes(length);
  return base32Encode(bytes);
}

/**
 * Generate QR code URL for TOTP setup
 * @param email User email
 * @param secret Base32 secret
 * @param issuer Issuer name
 * @returns OTPAuth URL
 */
export function generateQRUrl(email: string, secret: string, issuer: string = 'FreeLang'): string {
  const label = encodeURIComponent(`${issuer} (${email})`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30'
  });

  return `otpauth://totp/${label}?${params.toString()}`;
}

// Helper functions

function generateHOTP(secret: string, counter: number, digits: number): string {
  const decodedSecret = base32Decode(secret);

  // Convert counter to 8-byte big-endian
  const counterBuffer = Buffer.allocUnsafe(8);
  for (let i = 7; i >= 0; i--) {
    counterBuffer[i] = counter & 0xff;
    counter >>= 8;
  }

  // Generate HMAC
  const hmac = createHmac('sha1', decodedSecret);
  hmac.update(counterBuffer);
  const hash = hmac.digest();

  // Dynamic truncation
  const offset = hash[hash.length - 1] & 0x0f;
  const code =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  const modulo = Math.pow(10, digits);
  const result = (code % modulo).toString();

  // Pad with zeros
  return result.padStart(digits, '0');
}

function base32Encode(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  let bits = 0;
  let value = 0;

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      bits -= 5;
      result += alphabet[(value >> bits) & 0x1f];
    }
  }

  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 0x1f];
  }

  // Add padding
  while (result.length % 8 !== 0) {
    result += '=';
  }

  return result;
}

function base32Decode(encoded: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const result: number[] = [];

  for (const char of encoded) {
    if (char === '=') break;

    const index = alphabet.indexOf(char);
    if (index < 0) continue;

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bits -= 8;
      result.push((value >> bits) & 0xff);
    }
  }

  return Buffer.from(result);
}
