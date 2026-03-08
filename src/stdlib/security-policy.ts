/**
 * FreeLang Standard Library: std/security-policy
 *
 * Native Security Policy Engine
 * Zero-dependency, compile-time security policy embedding
 * Replaces: helmet-crossdomain (npm 0개)
 */

import * as fs from 'fs';

/**
 * Security Policy Spec
 */
export interface SecurityPolicySpec {
  allowAccessFrom: string[];  // CORS 허가 도메인
  secure: boolean;            // HTTPS 강제 여부
  customHeaders?: Record<string, string>;
  maxAge?: number;            // 캐시 시간 (초)
}

/**
 * Compiled Static Response Frame
 * 컴파일 타임에 생성되는 정적 응답 프레임
 */
export interface StaticResponseFrame {
  statusCode: number;
  headers: Record<string, string>;
  body: string;  // /crossdomain.xml 또는 보안 정책 XML
}

// Global policy registry
const policyRegistry = new Map<string, SecurityPolicySpec>();
const responseFrameCache = new Map<string, StaticResponseFrame>();

/**
 * 보안 정책 등록
 * @param path 경로 (e.g., "/api", "/")
 * @param spec 정책 스펙
 */
export function register_policy(
  path: string,
  allowAccessFrom: string | string[],
  secure?: boolean,
  customHeaders?: Record<string, string>,
  maxAge?: number
): string {
  const domains = Array.isArray(allowAccessFrom)
    ? allowAccessFrom
    : [allowAccessFrom];

  const spec: SecurityPolicySpec = {
    allowAccessFrom: domains,
    secure: secure ?? true,
    customHeaders,
    maxAge: maxAge ?? 86400
  };

  policyRegistry.set(path, spec);

  // 컴파일 타임에 응답 프레임 생성
  const frame = generateStaticResponseFrame(path, spec);
  responseFrameCache.set(path, frame);

  return `policy_registered:${path}`;
}

/**
 * 정책 조회
 * @param path 경로
 * @returns 정책 스펙 또는 null
 */
export function get_policy(path: string): SecurityPolicySpec | null {
  return policyRegistry.get(path) ?? null;
}

/**
 * 응답 프레임 조회 (Zero-copy HTTP 응답)
 * @param path 경로
 * @returns 정적 응답 프레임
 */
export function get_response_frame(path: string): StaticResponseFrame | null {
  return responseFrameCache.get(path) ?? null;
}

/**
 * crossdomain.xml 생성
 * @param spec 보안 정책 스펙
 * @returns XML 문자열
 */
export function generate_crossdomain_xml(spec: SecurityPolicySpec): string {
  const domains = spec.allowAccessFrom
    .map((domain) => `    <allow-access-from domain="${domain}" to-ports="*" />`)
    .join('\n');

  return `<?xml version="1.0"?>
<cross-domain-policy>
${domains}
</cross-domain-policy>`;
}

/**
 * 정적 응답 프레임 생성 (컴파일 타임)
 * @param path 경로
 * @param spec 정책 스펙
 * @returns 정적 응답 프레임
 */
function generateStaticResponseFrame(
  path: string,
  spec: SecurityPolicySpec
): StaticResponseFrame {
  let body: string;
  let headers: Record<string, string>;

  if (path === '/crossdomain.xml' || path.endsWith('.xml')) {
    // XML 응답
    body = generate_crossdomain_xml(spec);
    headers = {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': `public, max-age=${spec.maxAge}`,
      'access-control-allow-origin': spec.allowAccessFrom.join(', ')
    };
  } else {
    // JSON 정책 응답
    body = JSON.stringify({
      security_policy: {
        allowed_domains: spec.allowAccessFrom,
        secure: spec.secure,
        max_age: spec.maxAge
      }
    });
    headers = {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, max-age=${spec.maxAge}`,
      'access-control-allow-origin': spec.allowAccessFrom.join(', ')
    };
  }

  // 커스텀 헤더 병합
  if (spec.customHeaders) {
    Object.assign(headers, spec.customHeaders);
  }

  return {
    statusCode: 200,
    headers,
    body
  };
}

/**
 * HTTP 요청에 대한 보안 정책 검증
 * @param path 요청 경로
 * @param method HTTP 메서드
 * @param origin 요청 출처
 * @returns 허가 여부 + 응답 프레임
 */
export function validate_request(
  path: string,
  method: string,
  origin?: string
): { allowed: boolean; frame?: StaticResponseFrame } {
  const spec = get_policy(path);

  if (!spec) {
    return { allowed: false };
  }

  // origin이 없으면 요청 불가 (origin 검증이 필수)
  if (!origin) {
    return { allowed: false };
  }

  // CORS 검증
  const isAllowed = spec.allowAccessFrom.some((domain) => {
    // 와일드카드 지원
    if (domain === '*') return true;
    // 정확한 도메인 매칭
    if (origin === domain) return true;
    // *.domain.com 패턴 지원
    if (domain.startsWith('*.')) {
      const suffix = domain.slice(2); // *.domain.com → domain.com
      return origin.endsWith(suffix);
    }
    return false;
  });

  if (!isAllowed) {
    return { allowed: false };
  }

  // 응답 프레임 반환
  const frame = get_response_frame(path);
  return { allowed: true, frame };
}

/**
 * 모든 등록된 정책 조회
 * @returns 정책 목록
 */
export function list_policies(): Array<{ path: string; spec: SecurityPolicySpec }> {
  return Array.from(policyRegistry.entries()).map(([path, spec]) => ({
    path,
    spec
  }));
}

/**
 * 정책 통계
 * @returns 통계 정보
 */
export function stats(): {
  registered: number;
  cached_frames: number;
} {
  return {
    registered: policyRegistry.size,
    cached_frames: responseFrameCache.size
  };
}

/**
 * 정책 초기화 (테스트용)
 */
export function clear_policies(): void {
  policyRegistry.clear();
  responseFrameCache.clear();
}
