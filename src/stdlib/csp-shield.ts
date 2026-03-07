/**
 * FreeLang v2 - Native-CSP-Shield
 *
 * helmet-csp 외부 패키지 0개 대체.
 * Node.js 내장 crypto 모듈만 사용.
 *
 * 제공 함수:
 *   csp_header_build(policy_str)          → CSP 헤더 문자열
 *   csp_hash_inline(content)              → "sha256-<base64>" (인라인 스크립트/스타일용)
 *   csp_nonce_generate()                  → 랜덤 nonce (base64, 16바이트)
 *   csp_violation_log(report_json)        → 위반 내역 메모리 기록
 *   csp_violation_list()                  → 위반 목록 반환 (array of map)
 *   csp_violation_clear()                 → 위반 목록 초기화
 *   csp_violation_send_gogs(url, token)   → Gogs 이슈로 위반 리포트 전송
 *   csp_policy_parse(annotation_str)      → annotation 문자열 → 정책 map
 */

import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';
import { NativeFunctionRegistry } from '../vm/native-function-registry';

// ─────────────────────────────────────────────────────────────
// 내부 위반 로그 (메모리, 프로세스 단위 유지)
// ─────────────────────────────────────────────────────────────

interface CspViolation {
  timestamp: string;
  directive: string;
  blockedUri: string;
  sourceFile?: string;
  lineNumber?: number;
  raw: string;
}

const violationLog: CspViolation[] = [];
const MAX_VIOLATIONS = 500;

// ─────────────────────────────────────────────────────────────
// 내부 헬퍼
// ─────────────────────────────────────────────────────────────

/**
 * 콘텐츠의 SHA-256을 base64로 인코딩
 * CSP spec: 'sha256-<base64>' 형식
 */
export function sha256Base64(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('base64');
}

/**
 * 랜덤 nonce 생성 (16바이트 → base64)
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

/**
 * CSP 정책 직렬화 문자열 → 헤더 문자열
 *
 * 파서가 생성하는 형태:
 *   "default_src=self,script_src=self|https://trusted.dclub.kr,report_uri=/api/security/report"
 *
 * 출력:
 *   "default-src 'self'; script-src 'self' https://trusted.dclub.kr; report-uri /api/security/report"
 */
export function buildCspHeader(policyStr: string): string {
  if (!policyStr || policyStr.trim() === '') {
    return "default-src 'self'";
  }

  const directives: string[] = [];

  // directive=value1|value2 형태의 KV 쌍 파싱
  const pairs = policyStr.split(',');
  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx < 0) continue;

    const rawKey = pair.slice(0, eqIdx).trim();
    const rawVal = pair.slice(eqIdx + 1).trim();

    // 언더스코어를 하이픈으로 변환 (default_src → default-src)
    const directive = rawKey.replace(/_/g, '-');

    if (!rawVal) continue;

    // "|" 구분자로 여러 소스 값 분리
    const sources = rawVal.split('|').map(s => {
      const v = s.trim();
      // .self, self → 'self' (CSP spec 키워드)
      if (v === 'self' || v === '.self') return "'self'";
      if (v === 'none' || v === '.none') return "'none'";
      if (v === 'unsafe_inline' || v === '.unsafe_inline') return "'unsafe-inline'";
      if (v === 'unsafe_eval' || v === '.unsafe_eval') return "'unsafe-eval'";
      if (v === 'strict_dynamic' || v === '.strict_dynamic') return "'strict-dynamic'";
      if (v.startsWith('nonce-')) return `'${v}'`;
      if (v.startsWith('sha256-')) return `'${v}'`;
      return v;
    });

    if (directive === 'report-uri') {
      directives.push(`report-uri ${sources.join(' ')}`);
    } else {
      directives.push(`${directive} ${sources.join(' ')}`);
    }
  }

  return directives.length > 0 ? directives.join('; ') : "default-src 'self'";
}

/**
 * @csp_policy 어노테이션 문자열을 정책 map으로 변환
 */
export function parseCspAnnotation(annotStr: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  if (!annotStr) return result;

  const pairs = annotStr.split(',');
  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx < 0) continue;
    const key = pair.slice(0, eqIdx).trim();
    const val = pair.slice(eqIdx + 1).trim();
    result[key] = val.split('|').map(s => s.trim());
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// 글로벌 CSP 정책 저장소 (모듈 수준에서 @csp_policy 파싱 결과 저장)
// ─────────────────────────────────────────────────────────────

let globalCspPolicyStr = '';

export function setGlobalCspPolicy(policyStr: string): void {
  globalCspPolicyStr = policyStr;
}

export function getGlobalCspPolicy(): string {
  return globalCspPolicyStr;
}

export function buildGlobalCspHeader(): string {
  return buildCspHeader(globalCspPolicyStr);
}

// ─────────────────────────────────────────────────────────────
// NativeFunctionRegistry 등록
// ─────────────────────────────────────────────────────────────

export function registerCspShieldFunctions(registry: NativeFunctionRegistry): void {

  // csp_header_build(policy_str) → CSP 헤더 문자열
  registry.register({
    name: 'csp_header_build',
    module: 'csp',
    paramCount: 1,
    executor: (args) => {
      const policyStr = String(args[0] ?? '');
      return buildCspHeader(policyStr);
    }
  });

  // csp_hash_inline(content) → "'sha256-<base64>'"
  registry.register({
    name: 'csp_hash_inline',
    module: 'csp',
    paramCount: 1,
    executor: (args) => {
      const content = String(args[0] ?? '');
      const hash = sha256Base64(content);
      return `'sha256-${hash}'`;
    }
  });

  // csp_nonce_generate() → "nonce-<base64>"
  registry.register({
    name: 'csp_nonce_generate',
    module: 'csp',
    paramCount: 0,
    executor: (_args) => {
      return `nonce-${generateNonce()}`;
    }
  });

  // csp_violation_log(report_json) → true
  registry.register({
    name: 'csp_violation_log',
    module: 'csp',
    paramCount: 1,
    executor: (args) => {
      const raw = String(args[0] ?? '{}');
      let parsed: any = {};
      try { parsed = JSON.parse(raw); } catch { parsed = { raw }; }

      if (violationLog.length >= MAX_VIOLATIONS) {
        violationLog.shift(); // 오래된 것 제거
      }
      violationLog.push({
        timestamp: new Date().toISOString(),
        directive:  String(parsed['violated-directive'] ?? parsed.directive ?? 'unknown'),
        blockedUri: String(parsed['blocked-uri'] ?? parsed.blockedUri ?? ''),
        sourceFile: String(parsed['source-file'] ?? parsed.sourceFile ?? ''),
        lineNumber: Number(parsed['line-number'] ?? parsed.lineNumber ?? 0),
        raw,
      });
      return true;
    }
  });

  // csp_violation_list() → array of violation maps
  registry.register({
    name: 'csp_violation_list',
    module: 'csp',
    paramCount: 0,
    executor: (_args) => {
      return violationLog.map(v => ({
        timestamp:  v.timestamp,
        directive:  v.directive,
        blockedUri: v.blockedUri,
        sourceFile: v.sourceFile,
        lineNumber: v.lineNumber,
      }));
    }
  });

  // csp_violation_clear() → true
  registry.register({
    name: 'csp_violation_clear',
    module: 'csp',
    paramCount: 0,
    executor: (_args) => {
      violationLog.length = 0;
      return true;
    }
  });

  // csp_violation_count() → number
  registry.register({
    name: 'csp_violation_count',
    module: 'csp',
    paramCount: 0,
    executor: (_args) => violationLog.length
  });

  // csp_violation_send_gogs(gogsUrl, token) → true | error_string
  // 위반 내역을 Gogs 이슈로 전송
  registry.register({
    name: 'csp_violation_send_gogs',
    module: 'csp',
    paramCount: 2,
    executor: (args) => {
      if (violationLog.length === 0) return 'no_violations';

      const gogsUrl = String(args[0] ?? '');
      const token   = String(args[1] ?? '');

      const body = JSON.stringify({
        title: `[CSP-Shield] ${violationLog.length}개 위반 감지 (${new Date().toISOString()})`,
        body: [
          '## Native-CSP-Shield 위반 리포트',
          '',
          `총 ${violationLog.length}개 위반`,
          '',
          '| 시각 | 지시어 | 차단 URI |',
          '|------|--------|----------|',
          ...violationLog.slice(-20).map(v =>
            `| ${v.timestamp} | ${v.directive} | ${v.blockedUri} |`
          ),
        ].join('\n'),
      });

      // 동기 HTTP POST (Gogs API)
      try {
        const urlObj = new URL(gogsUrl);
        const isHttps = urlObj.protocol === 'https:';
        const options = {
          hostname: urlObj.hostname,
          port: urlObj.port || (isHttps ? 443 : 80),
          path: urlObj.pathname + urlObj.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `token ${token}`,
            'Content-Length': Buffer.byteLength(body),
          },
        };

        const lib = isHttps ? https : http;
        return new Promise<string>((resolve) => {
          const req = lib.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
              resolve(res.statusCode === 201 ? 'sent' : `error:${res.statusCode}`);
            });
          });
          req.on('error', (e) => resolve(`error:${e.message}`));
          req.write(body);
          req.end();
        });
      } catch (e: any) {
        return `error:${e.message}`;
      }
    }
  });

  // csp_policy_active() → 현재 글로벌 CSP 헤더 문자열 반환
  registry.register({
    name: 'csp_policy_active',
    module: 'csp',
    paramCount: 0,
    executor: (_args) => buildGlobalCspHeader()
  });

  // csp_policy_set(policy_str) → 글로벌 정책 교체
  registry.register({
    name: 'csp_policy_set',
    module: 'csp',
    paramCount: 1,
    executor: (args) => {
      setGlobalCspPolicy(String(args[0] ?? ''));
      return true;
    }
  });
}
