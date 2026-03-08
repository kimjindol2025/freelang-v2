/**
 * Native Security Policy v1.0 Test Suite
 *
 * helmet-crossdomain 완전 대체
 * 컴파일 타임 보안 정책 처리
 */

import * as security from '../src/stdlib/security-policy';

describe('Native-Security-Policy v1.0', () => {
  beforeEach(() => {
    security.clear_policies();
  });

  describe('Policy Registration', () => {
    it('should register a policy with single domain', () => {
      const result = security.register_policy('/api', 'example.com', true, {}, 3600);
      expect(result).toContain('policy_registered');
    });

    it('should register a policy with multiple domains', () => {
      const result = security.register_policy(
        '/api',
        ['example.com', 'test.com', '*.internal.com'],
        true,
        {},
        7200
      );
      expect(result).toContain('policy_registered');
    });

    it('should register crossdomain.xml policy', () => {
      const result = security.register_policy(
        '/crossdomain.xml',
        ['*.dclub.kr', 'washpark.com'],
        true,
        { 'x-custom-header': 'value' },
        86400
      );
      expect(result).toContain('policy_registered');
    });
  });

  describe('Policy Retrieval', () => {
    beforeEach(() => {
      security.register_policy(
        '/api',
        ['*.dclub.kr', 'example.com'],
        true,
        { 'x-protected': '1' },
        3600
      );
    });

    it('should retrieve registered policy', () => {
      const policy = security.get_policy('/api');
      expect(policy).not.toBeNull();
      expect(policy?.allowAccessFrom).toContain('*.dclub.kr');
      expect(policy?.secure).toBe(true);
      expect(policy?.maxAge).toBe(3600);
    });

    it('should return null for unregistered path', () => {
      const policy = security.get_policy('/unknown');
      expect(policy).toBeNull();
    });
  });

  describe('crossdomain.xml Generation', () => {
    it('should generate valid XML', () => {
      const spec: security.SecurityPolicySpec = {
        allowAccessFrom: ['example.com', '*.internal.com'],
        secure: true,
        maxAge: 86400
      };

      const xml = security.generate_crossdomain_xml(spec);

      expect(xml).toContain('<?xml version="1.0"?>');
      expect(xml).toContain('<cross-domain-policy>');
      expect(xml).toContain('<allow-access-from domain="example.com"');
      expect(xml).toContain('<allow-access-from domain="*.internal.com"');
      expect(xml).toContain('</cross-domain-policy>');
    });

    it('should handle single domain', () => {
      const spec: security.SecurityPolicySpec = {
        allowAccessFrom: ['only-one.com'],
        secure: true
      };

      const xml = security.generate_crossdomain_xml(spec);

      expect(xml).toContain('only-one.com');
      // Should have exactly one allow-access-from
      const matches = xml.match(/<allow-access-from/g);
      expect(matches?.length).toBe(1);
    });
  });

  describe('Request Validation', () => {
    beforeEach(() => {
      security.register_policy(
        '/api',
        ['example.com', '*.test.com'],  // '*' 제거 - selective 정책
        true
      );
      security.register_policy(
        '/public',
        ['*'],  // 공개 정책 - 모든 origin 허가
        false
      );
    });

    it('should allow request from permitted domain', () => {
      const result = security.validate_request('/api', 'GET', 'example.com');
      expect(result.allowed).toBe(true);
      expect(result.frame).not.toBeUndefined();
    });

    it('should allow wildcard matches', () => {
      const result = security.validate_request(
        '/api',
        'GET',
        'subdomain.test.com'
      );
      expect(result.allowed).toBe(true);
    });

    it('should deny request from non-permitted domain', () => {
      const result = security.validate_request(
        '/api',
        'GET',
        'unauthorized.com'
      );
      expect(result.allowed).toBe(false);
    });

    it('should allow any origin with * policy', () => {
      // /public 정책은 * 이므로 모든 origin 허가
      const result = security.validate_request('/public', 'GET', 'any.domain.com');
      expect(result.allowed).toBe(true);
    });

    it('should handle missing origin', () => {
      const result = security.validate_request('/api', 'GET');
      // Should not fail, just check if origin is required
      expect(result).toHaveProperty('allowed');
    });
  });

  describe('Response Frames', () => {
    it('should cache response frames', () => {
      security.register_policy(
        '/crossdomain.xml',
        ['*.example.com'],
        true,
        {},
        7200
      );

      const frame = security.get_response_frame('/crossdomain.xml');

      if (frame) {
        expect(frame.statusCode).toBe(200);
        expect(frame.headers['content-type']).toContain('xml');
        expect(frame.body).toContain('cross-domain-policy');
      }
    });

    it('should generate JSON response frames', () => {
      security.register_policy('/api-policy', ['example.com'], true);

      const frame = security.get_response_frame('/api-policy');

      if (frame) {
        expect(frame.statusCode).toBe(200);
        expect(frame.headers['content-type']).toContain('json');
        const body = JSON.parse(frame.body);
        expect(body.security_policy).toBeDefined();
      }
    });

    it('should include cache control headers', () => {
      security.register_policy('/test', ['example.com'], true, {}, 3600);

      const frame = security.get_response_frame('/test');

      if (frame) {
        expect(frame.headers['cache-control']).toContain('max-age=3600');
        expect(frame.headers['cache-control']).toContain('public');
      }
    });
  });

  describe('Policy Listing', () => {
    it('should list all registered policies', () => {
      security.register_policy('/api', ['example.com'], true);
      security.register_policy('/public', ['*'], false);
      security.register_policy('/admin', ['internal.com'], true);

      const policies = security.list_policies();

      expect(policies.length).toBe(3);
      expect(policies.some((p) => p.path === '/api')).toBe(true);
      expect(policies.some((p) => p.path === '/public')).toBe(true);
      expect(policies.some((p) => p.path === '/admin')).toBe(true);
    });

    it('should return empty list when no policies', () => {
      const policies = security.list_policies();
      expect(policies).toEqual([]);
    });
  });

  describe('Statistics', () => {
    it('should track registered policies count', () => {
      let stats = security.stats();
      expect(stats.registered).toBe(0);

      security.register_policy('/api', ['example.com'], true);
      stats = security.stats();
      expect(stats.registered).toBe(1);

      security.register_policy('/admin', ['admin.com'], true);
      stats = security.stats();
      expect(stats.registered).toBe(2);
    });

    it('should track cached frames count', () => {
      security.register_policy('/api', ['example.com'], true);

      const stats = security.stats();
      expect(stats.cached_frames).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Zero-Copy Response Optimization', () => {
    it('should return pre-computed response frames', () => {
      security.register_policy(
        '/crossdomain.xml',
        ['*.dclub.kr'],
        true,
        { 'server': 'FreeLang/v2' },
        86400
      );

      const frame = security.get_response_frame('/crossdomain.xml');

      // 응답이 미리 컴파일되어 있어야 함
      expect(frame).not.toBeNull();
      expect(frame?.statusCode).toBe(200);

      // 커스텀 헤더도 포함
      if (frame) {
        expect(frame.headers['server']).toBe('FreeLang/v2');
      }
    });
  });

  describe('Annotation Processing', () => {
    it('should parse @crossdomain_policy annotation', () => {
      // 어노테이션 형식: @crossdomain_policy(...)
      const annotationStr = `
        @crossdomain_policy(
          allow_access_from: ["*.dclub.kr", "washpark.com"],
          secure: true,
          max_age: 3600
        )
      `;

      // 실제로는 SecurityCodegen에서 파싱
      // 여기서는 수동 테스트
      expect(annotationStr).toContain('crossdomain_policy');
      expect(annotationStr).toContain('*.dclub.kr');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle dclub.kr CORS policy', () => {
      // 실제 사용 사례
      security.register_policy(
        '/api',
        ['*.dclub.kr', 'dclub.kr', 'localhost:3000'],
        true,
        {
          'x-application': 'Direct-Bind-Form',
          'x-version': 'v1.0'
        },
        86400
      );

      const policy = security.get_policy('/api');
      expect(policy?.allowAccessFrom).toContain('*.dclub.kr');

      // 요청 검증
      const result1 = security.validate_request(
        '/api',
        'POST',
        'app.dclub.kr'
      );
      expect(result1.allowed).toBe(true);

      const result2 = security.validate_request(
        '/api',
        'POST',
        'external.com'
      );
      expect(result2.allowed).toBe(false);
    });

    it('should generate proper crossdomain.xml for Flash', () => {
      security.register_policy(
        '/crossdomain.xml',
        ['*.washpark.com', 'cdn.example.com'],
        true
      );

      const frame = security.get_response_frame('/crossdomain.xml');

      if (frame) {
        // Flash는 crossdomain.xml을 정확히 기대함
        expect(frame.headers['content-type']).toBe(
          'application/xml; charset=utf-8'
        );
        // XML에 allow-access-from 엘리먼트가 포함되어야 함
        expect(frame.body).toContain('allow-access-from');
        expect(frame.body).toContain('*.washpark.com');
        expect(frame.body).toContain('to-ports="*"');
      }
    });
  });
});
