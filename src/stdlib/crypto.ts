/**
 * FreeLang Standard Library: crypto module
 *
 * Secure-Hasher integration for FreeLang runtime.
 * Zero external dependencies - pure implementation.
 *
 * Usage in FreeLang:
 *   import "crypto" as crypto;
 *   let hash = crypto.sha256("hello");
 *   let result = crypto.hash_password("secret", 12);
 *   let ok = crypto.verify_password("secret", result);
 */

// Re-export from secure-hasher (will be bundled at compile time)
// For now, inline the core SHA-256 implementation

// ============================================
// SHA-256 Constants
// ============================================

const H0 = new Uint32Array([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
]);

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);

function rotr(n: number, x: number): number { return (x >>> n) | (x << (32 - n)); }
function ch(x: number, y: number, z: number): number { return (x & y) ^ (~x & z); }
function maj(x: number, y: number, z: number): number { return (x & y) ^ (x & z) ^ (y & z); }

function sha256_core(message: Uint8Array): string {
  const msgLen = message.length;
  const bitLen = msgLen * 8;
  let padLen = 64 - ((msgLen + 9) % 64);
  if (padLen === 64) padLen = 0;
  const totalLen = msgLen + 1 + padLen + 8;
  const padded = new Uint8Array(totalLen);
  padded.set(message);
  padded[msgLen] = 0x80;
  const highBits = Math.floor(bitLen / 0x100000000);
  const lowBits = bitLen >>> 0;
  padded[totalLen - 8] = (highBits >>> 24) & 0xff;
  padded[totalLen - 7] = (highBits >>> 16) & 0xff;
  padded[totalLen - 6] = (highBits >>> 8) & 0xff;
  padded[totalLen - 5] = highBits & 0xff;
  padded[totalLen - 4] = (lowBits >>> 24) & 0xff;
  padded[totalLen - 3] = (lowBits >>> 16) & 0xff;
  padded[totalLen - 2] = (lowBits >>> 8) & 0xff;
  padded[totalLen - 1] = lowBits & 0xff;

  const hash = new Uint32Array(H0);
  const W = new Uint32Array(64);

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let t = 0; t < 16; t++) {
      const idx = offset + t * 4;
      W[t] = (padded[idx] << 24) | (padded[idx+1] << 16) | (padded[idx+2] << 8) | padded[idx+3];
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(7, W[t-15]) ^ rotr(18, W[t-15]) ^ (W[t-15] >>> 3);
      const s1 = rotr(17, W[t-2]) ^ rotr(19, W[t-2]) ^ (W[t-2] >>> 10);
      W[t] = (s1 + W[t-7] + s0 + W[t-16]) >>> 0;
    }

    let a=hash[0], b=hash[1], c=hash[2], d=hash[3];
    let e=hash[4], f=hash[5], g=hash[6], h=hash[7];

    for (let t = 0; t < 64; t++) {
      const S1 = rotr(6,e) ^ rotr(11,e) ^ rotr(25,e);
      const T1 = (h + S1 + ch(e,f,g) + K[t] + W[t]) >>> 0;
      const S0 = rotr(2,a) ^ rotr(13,a) ^ rotr(22,a);
      const T2 = (S0 + maj(a,b,c)) >>> 0;
      h=g; g=f; f=e; e=(d+T1)>>>0; d=c; c=b; b=a; a=(T1+T2)>>>0;
    }

    hash[0]=(hash[0]+a)>>>0; hash[1]=(hash[1]+b)>>>0;
    hash[2]=(hash[2]+c)>>>0; hash[3]=(hash[3]+d)>>>0;
    hash[4]=(hash[4]+e)>>>0; hash[5]=(hash[5]+f)>>>0;
    hash[6]=(hash[6]+g)>>>0; hash[7]=(hash[7]+h)>>>0;
  }

  let hex = '';
  for (let i = 0; i < hash.length; i++) hex += (hash[i] >>> 0).toString(16).padStart(8, '0');
  return hex;
}

// ============================================
// Public API (FreeLang stdlib binding)
// ============================================

const encoder = new TextEncoder();
function toBytes(input: string | Uint8Array): Uint8Array {
  return typeof input === 'string' ? encoder.encode(input) : input;
}

export function sha256(input: string | Uint8Array): string {
  return sha256_core(toBytes(input));
}

export function hmac_sha256(key: string | Uint8Array, message: string | Uint8Array): string {
  const blockSize = 64;
  let keyBytes = toBytes(key);
  const msgBytes = toBytes(message);

  if (keyBytes.length > blockSize) {
    keyBytes = hexToBytes(sha256(keyBytes));
  }

  const paddedKey = new Uint8Array(blockSize);
  paddedKey.set(keyBytes);

  const ipad = new Uint8Array(blockSize);
  const opad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    ipad[i] = paddedKey[i] ^ 0x36;
    opad[i] = paddedKey[i] ^ 0x5c;
  }

  const inner = new Uint8Array(blockSize + msgBytes.length);
  inner.set(ipad); inner.set(msgBytes, blockSize);
  const innerHash = hexToBytes(sha256(inner));

  const outer = new Uint8Array(blockSize + 32);
  outer.set(opad); outer.set(innerHash, blockSize);
  return sha256(outer);
}

export function generate_salt(length: number = 16): string {
  const salt = new Uint8Array(length);
  if (typeof globalThis !== 'undefined' && (globalThis as any).crypto?.getRandomValues) {
    (globalThis as any).crypto.getRandomValues(salt);
  } else {
    for (let i = 0; i < length; i++) {
      salt[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytesToHex(salt);
}

export function hash_password(password: string, cost: number = 12): {
  hash: string; salt: string; iterations: number; algorithm: string;
} {
  const iterations = Math.pow(2, Math.min(Math.max(cost, 8), 20)) * 1000;
  const saltHex = generate_salt(32);
  const saltBytes = hexToBytes(saltHex);
  const hash = pbkdf2_derive(password, saltBytes, iterations, 32);
  return { hash, salt: saltHex, iterations, algorithm: 'pbkdf2-hmac-sha256' };
}

export function verify_password(password: string, stored: { hash: string; salt: string; iterations: number }): boolean {
  const saltBytes = hexToBytes(stored.salt);
  const computed = pbkdf2_derive(password, saltBytes, stored.iterations, 32);
  return timing_safe_equal(computed, stored.hash);
}

export function timing_safe_equal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

// ============================================
// Internal helpers
// ============================================

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i/2] = parseInt(hex.substring(i, i+2), 16);
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
  return hex;
}

function pbkdf2_derive(password: string, salt: Uint8Array, iterations: number, keyLen: number): string {
  const pwBytes = encoder.encode(password);
  const hashLen = 32;
  const numBlocks = Math.ceil(keyLen / hashLen);
  const dk = new Uint8Array(numBlocks * hashLen);

  for (let bi = 1; bi <= numBlocks; bi++) {
    const blockInput = new Uint8Array(salt.length + 4);
    blockInput.set(salt);
    blockInput[salt.length] = (bi >>> 24) & 0xff;
    blockInput[salt.length+1] = (bi >>> 16) & 0xff;
    blockInput[salt.length+2] = (bi >>> 8) & 0xff;
    blockInput[salt.length+3] = bi & 0xff;

    let U = hexToBytes(hmac_sha256(pwBytes, blockInput));
    const result = new Uint8Array(U);

    for (let i = 1; i < iterations; i++) {
      U = hexToBytes(hmac_sha256(pwBytes, U));
      for (let j = 0; j < result.length; j++) result[j] ^= U[j];
    }

    dk.set(result, (bi - 1) * hashLen);
  }

  return bytesToHex(dk.subarray(0, keyLen));
}
