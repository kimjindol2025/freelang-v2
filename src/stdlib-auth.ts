/**
 * FreeLang v2 - Native-Auth-Token
 *
 * Node.js 내장 crypto 모듈 기반 HMAC-SHA256 토큰 엔진.
 * (외부 npm 패키지 0개 - jsonwebtoken, bcrypt 등 불필요)
 *
 * 제공 함수:
 *   token_sign(claims, secret, expires_sec) → "header.payload.sig"
 *   token_verify(token, secret)             → claims_map | null
 *   token_decode(token)                     → claims_map (서명 미검증)
 *   token_expired(token)                    → bool
 *   token_claims_get(token, key)            → value | null
 *   hmac_sha256(key, data)                  → hex string
 *   sha256_hex(data)                        → hex string
 */

import * as crypto from 'crypto';
import { NativeFunctionRegistry } from './vm/native-function-registry';

// ─────────────────────────────────────────────────────────────
// 내부 암호화 헬퍼 (Node.js 내장 crypto - npm 패키지 아님)
// ─────────────────────────────────────────────────────────────

/**
 * HMAC-SHA256 계산
 * @param key   서명 키 (문자열 또는 Buffer)
 * @param data  서명할 데이터
 * @returns     hex 문자열 (64자)
 */
export function hmacSha256(key: string | Buffer, data: string): string {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest('hex');
}

/**
 * SHA-256 해시 (Uint8Array 입력)
 */
export function sha256(data: Uint8Array): Uint8Array {
  const buf = crypto.createHash('sha256').update(data).digest();
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

/**
 * SHA-256 hex 문자열 반환 (문자열 입력)
 */
export function sha256Hex(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

// ─────────────────────────────────────────────────────────────
// Base64URL 헬퍼
// ─────────────────────────────────────────────────────────────

function toBase64Url(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64url');
}

function fromBase64Url(s: string): string {
  return Buffer.from(s, 'base64url').toString('utf8');
}

// ─────────────────────────────────────────────────────────────
// FreeLang Native-Auth-Token
//
// 토큰 형식: <headerB64>.<payloadB64>.<hmacHex>
//   header  = {"alg":"HS256","typ":"FL1"}
//   payload = { ...claims, iat: epoch_sec, exp: epoch_sec }
// ─────────────────────────────────────────────────────────────

const HEADER_B64 = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'FL1' }));

/**
 * FreeLang 맵(object/Map) + secret으로 서명된 토큰 생성
 * @param claims     FreeLang map (object 또는 Map)
 * @param secret     HMAC 서명 키
 * @param expiresIn  만료 시간 (초, 기본 3600)
 * @returns          "header.payload.sig" 형태 토큰 문자열
 */
export function tokenSign(
  claims: Record<string, any>,
  secret: string,
  expiresIn: number = 3600
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = { ...claims, iat: now, exp: now + expiresIn };
  const payloadB64 = toBase64Url(JSON.stringify(payload));
  const sigInput   = `${HEADER_B64}.${payloadB64}`;
  const sig        = hmacSha256(secret, sigInput);
  return `${sigInput}.${sig}`;
}

/**
 * 토큰 검증 (서명 + 만료 시간)
 * @returns claims object 또는 null (검증 실패 / 만료)
 */
export function tokenVerify(token: string, secret: string): Record<string, any> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, sig] = parts;
  const sigInput  = `${headerB64}.${payloadB64}`;
  const expected  = hmacSha256(secret, sigInput);

  // 타이밍 공격 방지: crypto.timingSafeEqual
  if (!timingSafeCompare(sig, expected)) return null;

  let payload: Record<string, any>;
  try {
    payload = JSON.parse(fromBase64Url(payloadB64));
  } catch {
    return null;
  }

  // 만료 확인
  if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

/**
 * 토큰 디코드 (서명 검증 없음 - 로깅/디버그 전용)
 */
export function tokenDecode(token: string): Record<string, any> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(fromBase64Url(parts[1]));
  } catch {
    return null;
  }
}

/**
 * 타이밍 공격 방지 문자열 비교
 */
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  try {
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// FreeLang 네이티브 함수 등록
// stdlib-builtins.ts 에서 호출
// ─────────────────────────────────────────────────────────────

export function registerAuthFunctions(registry: NativeFunctionRegistry): void {

  // hmac_sha256(key, data) → hex_string
  registry.register({
    name: 'hmac_sha256',
    module: 'auth',
    paramCount: 2,
    executor: (args) => hmacSha256(String(args[0] ?? ''), String(args[1] ?? ''))
  });

  // sha256_hex(data) → hex_string
  registry.register({
    name: 'sha256_hex',
    module: 'auth',
    executor: (args) => sha256Hex(String(args[0] ?? ''))
  });

  // token_sign(claims_map, secret, expires_sec?) → token_string
  registry.register({
    name: 'token_sign',
    module: 'auth',
    paramCount: 3,
    executor: (args) => {
      const claims    = freelangMapToObject(args[0]);
      const secret    = String(args[1] ?? '');
      const expiresIn = typeof args[2] === 'number' ? args[2] : 3600;
      return tokenSign(claims, secret, expiresIn);
    }
  });

  // token_verify(token_string, secret) → claims_map | null
  registry.register({
    name: 'token_verify',
    module: 'auth',
    paramCount: 2,
    executor: (args) => tokenVerify(String(args[0] ?? ''), String(args[1] ?? ''))
  });

  // token_decode(token_string) → claims_map | null (서명 검증 없음)
  registry.register({
    name: 'token_decode',
    module: 'auth',
    executor: (args) => tokenDecode(String(args[0] ?? ''))
  });

  // token_expired(token_string) → bool
  registry.register({
    name: 'token_expired',
    module: 'auth',
    executor: (args) => {
      const claims = tokenDecode(String(args[0] ?? ''));
      if (!claims || typeof claims.exp !== 'number') return true;
      return Math.floor(Date.now() / 1000) >= claims.exp;
    }
  });

  // token_claims_get(token_string, key) → value | null (검증 없이 빠른 조회)
  registry.register({
    name: 'token_claims_get',
    module: 'auth',
    paramCount: 2,
    executor: (args) => {
      const claims = tokenDecode(String(args[0] ?? ''));
      if (!claims) return null;
      return claims[String(args[1] ?? '')] ?? null;
    }
  });
}

/**
 * FreeLang map (Map 또는 plain object) → JS plain object
 */
function freelangMapToObject(val: any): Record<string, any> {
  if (!val) return {};
  if (val instanceof Map) {
    const obj: Record<string, any> = {};
    val.forEach((v: any, k: any) => { obj[String(k)] = v; });
    return obj;
  }
  if (typeof val === 'object') return val as Record<string, any>;
  return {};
}
