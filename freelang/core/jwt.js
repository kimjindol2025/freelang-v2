/**
 * FreeLang Production System - Phase 3: JWT Authentication
 * HMAC-SHA256 based token generation and verification
 * Status: 완전한 JWT 토큰 시스템
 */

const crypto = require('crypto');

// ============================================================================
// JWT 설정
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'freelang-secret-key-2026-production';
const JWT_ALGORITHM = 'HS256';
const JWT_EXPIRATION = 3600; // 1 hour in seconds

// ============================================================================
// 데이터 타입
// ============================================================================

/**
 * JWTPayload 타입
 * @typedef {Object} JWTPayload
 * @property {string} sub - 사용자 ID (subject)
 * @property {string} username - 사용자명
 * @property {string} email - 이메일
 * @property {string} role - 역할 (user, admin, moderator)
 * @property {number} iat - 발급 시간 (Unix timestamp)
 * @property {number} exp - 만료 시간 (Unix timestamp)
 */

/**
 * JWTToken 타입
 * @typedef {Object} JWTToken
 * @property {string} token - JWT 토큰 문자열
 * @property {JWTPayload} payload - 디코딩된 페이로드
 * @property {number} expiresIn - 만료 시간 (초)
 */

// ============================================================================
// JWT 생성
// ============================================================================

/**
 * JWT 토큰 생성 (Phase 3)
 * @param {Object} payload - 토큰 페이로드
 * @returns {JWTToken} 생성된 토큰
 */
function generateJWTToken(payload) {
  console.log(`🔑 JWT 토큰 생성 중... (user: ${payload.username})`);

  // 1️⃣ Header 생성
  const header = {
    alg: JWT_ALGORITHM,
    typ: 'JWT'
  };

  // 2️⃣ Payload 생성 (만료 시간 포함)
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + JWT_EXPIRATION
  };

  // 3️⃣ Base64 인코딩
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  // 4️⃣ HMAC-SHA256 서명
  const signature = generateSignature(
    `${encodedHeader}.${encodedPayload}`,
    JWT_SECRET
  );

  // 5️⃣ 토큰 조립
  const token = `${encodedHeader}.${encodedPayload}.${signature}`;

  console.log(`✅ JWT 토큰 생성됨: ${token.substring(0, 20)}...`);

  return {
    token,
    payload: fullPayload,
    expiresIn: JWT_EXPIRATION
  };
}

// ============================================================================
// JWT 검증
// ============================================================================

/**
 * JWT 토큰 검증 (Phase 3)
 * @param {string} token - 검증할 토큰
 * @returns {Object} { valid: boolean, payload?: JWTPayload, error?: string }
 */
function verifyJWTToken(token) {
  console.log(`🔐 JWT 토큰 검증 중...`);

  if (!token) {
    console.log(`❌ 토큰 없음`);
    return { valid: false, error: 'Token not provided' };
  }

  // 1️⃣ 토큰 형식 검증
  const parts = token.split('.');
  if (parts.length !== 3) {
    console.log(`❌ 잘못된 토큰 형식 (부분 수: ${parts.length})`);
    return { valid: false, error: 'Invalid token format' };
  }

  const [encodedHeader, encodedPayload, providedSignature] = parts;

  // 2️⃣ Payload 디코딩
  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch (err) {
    console.log(`❌ Payload 디코딩 실패`);
    return { valid: false, error: 'Invalid payload' };
  }

  // 3️⃣ 만료 시간 검증
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    console.log(`❌ 토큰 만료됨 (${payload.exp} < ${now})`);
    return { valid: false, error: 'Token expired' };
  }

  // 4️⃣ 서명 검증 (HMAC-SHA256)
  const expectedSignature = generateSignature(
    `${encodedHeader}.${encodedPayload}`,
    JWT_SECRET
  );

  if (providedSignature !== expectedSignature) {
    console.log(`❌ 서명 검증 실패`);
    return { valid: false, error: 'Invalid signature' };
  }

  console.log(`✅ JWT 검증 성공 (user: ${payload.username})`);
  return { valid: true, payload };
}

// ============================================================================
// JWT 디코딩
// ============================================================================

/**
 * JWT 토큰 디코딩 (검증 없이)
 * @param {string} token - 디코딩할 토큰
 * @returns {Object} { payload?: JWTPayload, error?: string }
 */
function decodeJWTPayload(token) {
  console.log(`📖 JWT 토큰 디코딩 중...`);

  if (!token) {
    return { error: 'Token not provided' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { error: 'Invalid token format' };
  }

  const [, encodedPayload] = parts;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    console.log(`✅ JWT 디코딩 성공 (user: ${payload.username})`);
    return { payload };
  } catch (err) {
    console.log(`❌ JWT 디코딩 실패`);
    return { error: 'Invalid payload' };
  }
}

// ============================================================================
// Private 유틸리티
// ============================================================================

function generateSignature(message, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = str.length % 4;
  if (padding) {
    str += '='.repeat(4 - padding);
  }
  return Buffer.from(str, 'base64').toString();
}

// ============================================================================
// 테스트용 사용자 DB (실제에는 Phase 2 DB 사용)
// ============================================================================

const testUsers = {
  'user1': { id: '1', username: 'user1', email: 'user1@example.com', password: 'password1', role: 'user' },
  'admin': { id: '2', username: 'admin', email: 'admin@example.com', password: 'admin123', role: 'admin' },
};

/**
 * 사용자 인증 및 토큰 발급
 */
function authenticateUser(username, password) {
  console.log(`🔑 사용자 인증: ${username}`);

  const user = testUsers[username];
  if (!user || user.password !== password) {
    console.log(`❌ 인증 실패: 사용자명 또는 비밀번호 잘못됨`);
    return { success: false, error: 'Invalid credentials' };
  }

  const tokenData = generateJWTToken({
    sub: user.id,
    username: user.username,
    email: user.email,
    role: user.role
  });

  console.log(`✅ 인증 성공: ${username}`);
  return {
    success: true,
    token: tokenData.token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    },
    expiresIn: tokenData.expiresIn
  };
}

// ============================================================================
// 공개 API
// ============================================================================

module.exports = {
  // Token operations
  generateJWTToken,
  verifyJWTToken,
  decodeJWTPayload,

  // Authentication
  authenticateUser,

  // Config
  JWT_SECRET,
  JWT_EXPIRATION
};
