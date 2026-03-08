/**
 * Phase 19: Security Codegen
 *
 * @crossdomain_policy 어노테이션을 IR로 변환
 * 컴파일 타임에 정적 응답 프레임 생성
 *
 * 대체: helmet-crossdomain (npm 0개)
 */

import { Inst, Op } from '../types';
import { FunctionStatement } from '../parser/ast';

export interface CrossdomainPolicyAnnotation {
  allowAccessFrom: string[];  // 허가 도메인 배열
  secure: boolean;            // HTTPS 강제 여부
  customHeaders?: Record<string, string>;
  maxAge?: number;
}

export class SecurityCodegen {
  /**
   * @crossdomain_policy 어노테이션 파싱
   *
   * 형식:
   * @crossdomain_policy(
   *   allow_access_from: ["*.dclub.kr", "washpark.com"],
   *   secure: true,
   *   max_age: 3600
   * )
   * fn handler() { ... }
   */
  static parseAnnotation(
    annotationStr: string
  ): CrossdomainPolicyAnnotation | null {
    try {
      // 어노테이션 파싱 (단순 정규식 기반)
      const allowFromMatch = annotationStr.match(
        /allow_access_from\s*:\s*\[(.*?)\]/s
      );
      const secureMatch = annotationStr.match(/secure\s*:\s*(true|false)/);
      const maxAgeMatch = annotationStr.match(/max_age\s*:\s*(\d+)/);

      if (!allowFromMatch) {
        return null;
      }

      // 도메인 배열 파싱
      const domainsStr = allowFromMatch[1];
      const domains = domainsStr
        .split(',')
        .map((d) => d.trim().replace(/['"]/g, ''))
        .filter((d) => d.length > 0);

      return {
        allowAccessFrom: domains,
        secure: secureMatch ? secureMatch[1] === 'true' : true,
        maxAge: maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 86400
      };
    } catch (e) {
      console.warn('Failed to parse @crossdomain_policy annotation:', e);
      return null;
    }
  }

  /**
   * @crossdomain_policy 어노테이션을 IR로 변환
   *
   * 생성되는 IR:
   * 1. CALL register_policy(path, domains, secure, maxAge)
   * 2. 응답 프레임 생성 및 캐싱
   */
  static generatePolicyIR(
    functionName: string,
    annotation: CrossdomainPolicyAnnotation
  ): Inst[] {
    const instructions: Inst[] = [];

    // Step 1: 정책 경로 결정
    // 함수명이 handle_api면 /api, handle_root면 /
    const pathMapping: Record<string, string> = {
      'handle_root': '/',
      'handle_api': '/api',
      'handle_crossdomain': '/crossdomain.xml',
      'handle_security': '/security-policy'
    };
    const path = pathMapping[functionName] || `/${functionName}`;

    // Step 2: ARR_NEW로 도메인 배열 생성
    instructions.push({
      op: Op.ARR_NEW,
      arg: annotation.allowAccessFrom.length  // 배열 크기
    });

    // 각 도메인을 배열에 추가
    for (let i = 0; i < annotation.allowAccessFrom.length; i++) {
      instructions.push({
        op: Op.PUSH,
        arg: annotation.allowAccessFrom[i]
      });
      instructions.push({
        op: Op.ARR_PUSH,
        arg: 0
      });
    }

    // Step 3: register_policy 호출
    // CALL register_policy(path, domains, secure, maxAge)
    instructions.push({
      op: Op.PUSH,
      arg: path
    });
    // 도메인 배열은 이미 스택에 있음
    instructions.push({
      op: Op.PUSH,
      arg: annotation.secure ? 1 : 0
    });
    instructions.push({
      op: Op.PUSH,
      arg: annotation.maxAge ?? 86400
    });

    instructions.push({
      op: Op.CALL,
      arg: 'register_policy'  // builtin 함수명
    });

    // Step 4: 반환값 POP (사용하지 않음)
    instructions.push({
      op: Op.POP
    });

    return instructions;
  }

  /**
   * 함수에 @crossdomain_policy가 있는지 확인하고 IR 생성
   * intent 필드에서 어노테이션 검색
   */
  static processFunctionAnnotations(
    func: FunctionStatement
  ): {
    hasSecurityPolicy: boolean;
    policyIR: Inst[];
  } {
    const annotation = func.intent; // intent 필드에서 어노테이션 찾기

    if (!annotation || !annotation.includes('crossdomain_policy')) {
      return {
        hasSecurityPolicy: false,
        policyIR: []
      };
    }

    const parsed = this.parseAnnotation(annotation);
    if (!parsed) {
      return {
        hasSecurityPolicy: false,
        policyIR: []
      };
    }

    const policyIR = this.generatePolicyIR(func.name, parsed);

    return {
      hasSecurityPolicy: true,
      policyIR
    };
  }

  /**
   * 모든 함수에서 @crossdomain_policy 수집
   */
  static collectAllPolicies(
    functions: FunctionStatement[]
  ): Array<{
    functionName: string;
    policy: CrossdomainPolicyAnnotation;
    ir: Inst[];
  }> {
    const policies: Array<{
      functionName: string;
      policy: CrossdomainPolicyAnnotation;
      ir: Inst[];
    }> = [];

    for (const func of functions) {
      const result = this.processFunctionAnnotations(func);
      if (result.hasSecurityPolicy) {
        const parsed = this.parseAnnotation(func.intent || '');
        if (parsed) {
          policies.push({
            functionName: func.name,
            policy: parsed,
            ir: result.policyIR
          });
        }
      }
    }

    return policies;
  }

  /**
   * 정책 기반 HTTP 응답 핸들러 생성 (TypeScript)
   *
   * 런타임에 /crossdomain.xml 요청이 오면 즉시 응답
   */
  static generateResponseHandler(
    policy: CrossdomainPolicyAnnotation
  ): string {
    const domains = policy.allowAccessFrom
      .map((d) => `    <allow-access-from domain="${d}" to-ports="*" />`)
      .join('\n');

    const crossdomainXml = `<?xml version="1.0"?>
<cross-domain-policy>
${domains}
</cross-domain-policy>`;

    return `
// Auto-generated response handler (Native-Security-Policy v1.0)
export function handleCrossdomain(req: any, res: any): void {
  res.writeHead(200, {
    'content-type': 'application/xml; charset=utf-8',
    'cache-control': 'public, max-age=${policy.maxAge || 86400}',
    'access-control-allow-origin': '${policy.allowAccessFrom.join(', ')}'
  });
  res.end(\`${crossdomainXml}\`);
}`;
  }
}
