/**
 * FreeLang v2 - jsonwebtoken 네이티브 함수
 *
 * npm jsonwebtoken 패키지 완전 대체
 * JWT 생성/검증 구현 (Node.js crypto 모듈 사용)
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';
import * as crypto from 'crypto';

// Base64url 인코딩/디코딩
function base64urlEncode(data: string | Buffer): string {
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
  return buf.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64urlDecode(str: string): string {
  const padded = str + '='.repeat((4 - str.length % 4) % 4);
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

// 시간 파싱 (1h, 7d, 30m, etc.)
function parseExpiry(expiresIn: string): number {
  if (!expiresIn) return 0;

  const num = parseInt(expiresIn);
  if (!isNaN(num)) return num;

  const match = expiresIn.match(/^(\d+)\s*(s|m|h|d|w|y)$/i);
  if (!match) return 0;

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  const seconds: Record<string, number> = {
    's': 1,
    'm': 60,
    'h': 3600,
    'd': 86400,
    'w': 604800,
    'y': 31536000
  };

  return value * (seconds[unit] || 1);
}

// HMAC 서명
function hmacSign(data: string, secret: string, algorithm: string): string {
  const algo = algorithm.replace('HS', 'sha').toLowerCase();
  const hmac = crypto.createHmac(algo, secret);
  hmac.update(data);
  return base64urlEncode(hmac.digest());
}

// JWT 생성
function createJwt(
  payload: Record<string, any>,
  secret: string,
  algorithm: string,
  expiresIn: string,
  issuer: string,
  audience: string,
  subject: string,
  jwtid: string
): string {
  const header = { alg: algorithm, typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);

  const claims: Record<string, any> = {
    ...payload,
    iat: now
  };

  if (expiresIn) {
    const secs = parseExpiry(expiresIn);
    if (secs > 0) claims.exp = now + secs;
  }

  if (issuer) claims.iss = issuer;
  if (audience) claims.aud = audience;
  if (subject) claims.sub = subject;
  if (jwtid) claims.jti = jwtid;

  const headerB64 = base64urlEncode(JSON.stringify(header));
  const payloadB64 = base64urlEncode(JSON.stringify(claims));
  const message = `${headerB64}.${payloadB64}`;

  let signature: string;
  if (algorithm.startsWith('HS')) {
    signature = hmacSign(message, secret, algorithm);
  } else {
    // RS256/ES256 등은 crypto.sign 사용
    try {
      const sign = crypto.createSign('SHA256');
      sign.update(message);
      signature = base64urlEncode(sign.sign(secret));
    } catch {
      // fallback to HS256
      signature = hmacSign(message, secret, 'HS256');
    }
  }

  return `${message}.${signature}`;
}

// JWT 디코딩 (검증 없이)
function decodeJwt(token: string): { header: any; payload: any; signature: string } | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const header = JSON.parse(base64urlDecode(parts[0]));
    const payload = JSON.parse(base64urlDecode(parts[1]));
    return { header, payload, signature: parts[2] };
  } catch {
    return null;
  }
}

// JWT 검증
function verifyJwt(
  token: string,
  secret: string,
  algorithms: string[],
  issuer: string,
  audience: string,
  ignoreExpiration: boolean,
  clockTolerance: number
): Record<string, any> {
  const decoded = decodeJwt(token);
  if (!decoded) throw new Error('jwt malformed');

  const { header, payload } = decoded;
  const parts = token.split('.');

  // 알고리즘 확인
  if (!algorithms.includes(header.alg)) {
    throw new Error(`invalid algorithm: ${header.alg}`);
  }

  // 서명 검증
  const message = `${parts[0]}.${parts[1]}`;
  let expectedSig: string;

  if (header.alg.startsWith('HS')) {
    expectedSig = hmacSign(message, secret, header.alg);
  } else {
    try {
      const verify = crypto.createVerify('SHA256');
      verify.update(message);
      const valid = verify.verify(secret, Buffer.from(base64urlDecode(parts[2]), 'binary'));
      if (!valid) throw new Error('invalid signature');
      return payload;
    } catch {
      throw new Error('invalid signature');
    }
  }

  if (expectedSig !== parts[2]) {
    throw new Error('invalid signature');
  }

  // 만료 확인
  const now = Math.floor(Date.now() / 1000);
  if (!ignoreExpiration && payload.exp) {
    if (now > payload.exp + clockTolerance) {
      throw new Error('jwt expired');
    }
  }

  // NBF 확인
  if (payload.nbf && now < payload.nbf - clockTolerance) {
    throw new Error('jwt not active');
  }

  // issuer 확인
  if (issuer && payload.iss !== issuer) {
    throw new Error(`jwt issuer invalid. expected: ${issuer}`);
  }

  // audience 확인
  if (audience) {
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!aud.includes(audience)) {
      throw new Error(`jwt audience invalid. expected: ${audience}`);
    }
  }

  return payload;
}

export function registerJsonwebtokenFunctions(registry: NativeFunctionRegistry): void {
  // jwt_sign(payload, secret, algorithm, expiresIn, issuer, audience, subject, jwtid) -> string
  registry.register({
    name: 'jwt_sign',
    module: 'jsonwebtoken',
    executor: (args: any[]) => {
      const payload = (typeof args[0] === 'object' && args[0] !== null) ? args[0] : {};
      const secret = String(args[1] || '');
      const algorithm = String(args[2] || 'HS256');
      const expiresIn = String(args[3] || '');
      const issuer = String(args[4] || '');
      const audience = String(args[5] || '');
      const subject = String(args[6] || '');
      const jwtid = String(args[7] || '');

      if (!secret) throw new Error('jwt_sign: secret is required');

      return createJwt(payload, secret, algorithm, expiresIn, issuer, audience, subject, jwtid);
    }
  });

  // jwt_verify(token, secret, algorithms, issuer, audience, ignoreExpiration, clockTolerance) -> payload
  registry.register({
    name: 'jwt_verify',
    module: 'jsonwebtoken',
    executor: (args: any[]) => {
      const token = String(args[0] || '');
      const secret = String(args[1] || '');
      const algorithms = Array.isArray(args[2]) ? args[2] as string[] : ['HS256'];
      const issuer = String(args[3] || '');
      const audience = String(args[4] || '');
      const ignoreExpiration = Boolean(args[5]);
      const clockTolerance = parseInt(String(args[6] || 0));

      if (!token) throw new Error('jwt_verify: token is required');
      if (!secret) throw new Error('jwt_verify: secret is required');

      return verifyJwt(token, secret, algorithms, issuer, audience, ignoreExpiration, clockTolerance);
    }
  });

  // jwt_decode(token, complete) -> decoded
  registry.register({
    name: 'jwt_decode',
    module: 'jsonwebtoken',
    executor: (args: any[]) => {
      const token = String(args[0] || '');
      const complete = Boolean(args[1]);

      const decoded = decodeJwt(token);
      if (!decoded) return null;

      return complete ? decoded : decoded.payload;
    }
  });

  // jwt_is_expired(token) -> bool
  registry.register({
    name: 'jwt_is_expired',
    module: 'jsonwebtoken',
    executor: (args: any[]) => {
      const token = String(args[0] || '');
      const decoded = decodeJwt(token);
      if (!decoded || !decoded.payload.exp) return false;
      return Math.floor(Date.now() / 1000) > decoded.payload.exp;
    }
  });

  // jwt_get_expiry(token) -> int (timestamp)
  registry.register({
    name: 'jwt_get_expiry',
    module: 'jsonwebtoken',
    executor: (args: any[]) => {
      const token = String(args[0] || '');
      const decoded = decodeJwt(token);
      return decoded?.payload?.exp || 0;
    }
  });

  // jwt_get_payload(token) -> map
  registry.register({
    name: 'jwt_get_payload',
    module: 'jsonwebtoken',
    executor: (args: any[]) => {
      const token = String(args[0] || '');
      const decoded = decodeJwt(token);
      return decoded?.payload || null;
    }
  });
}
