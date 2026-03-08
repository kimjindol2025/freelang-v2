/**
 * Phase 4 Step 3: Comment Analyzer Tests
 */

import { describe, it, expect } from '@jest/globals';
import { CommentAnalyzer } from '../src/analyzer/comment-analyzer';

describe('CommentAnalyzer', () => {
  let analyzer: CommentAnalyzer;

  beforeAll(() => {
    analyzer = new CommentAnalyzer();
  });

  // ============================================================================
  // 1. 도메인 추출 (5개)
  // ============================================================================
  describe('Domain Extraction', () => {
    it('should detect explicit finance domain tag', () => {
      const result = analyzer.analyzeComment('// finance: 세금 계산');

      expect(result.domain).toBe('finance');
      expect(result.confidence).toBe(0.95);
      expect(result.reasoning.some(r => r.includes('Explicit'))).toBe(true);
    });

    it('should detect finance domain from keywords', () => {
      const result = analyzer.analyzeComment('// tax and price calculation');

      expect(result.domain).toBe('finance');
      expect(result.confidence).toBeGreaterThanOrEqual(0.70);
    });

    it('should detect web domain from keywords', () => {
      const result = analyzer.analyzeComment('// email validation and url parsing');

      expect(result.domain).toBe('web');
      expect(result.confidence).toBeGreaterThanOrEqual(0.70);
    });

    it('should detect crypto domain from keywords', () => {
      const result = analyzer.analyzeComment('// hash computation and signature verification');

      expect(result.domain).toBe('crypto');
      expect(result.confidence).toBeGreaterThanOrEqual(0.70);
    });

    it('should detect data-science domain from keywords', () => {
      const result = analyzer.analyzeComment('// vector operations and matrix multiplication');

      expect(result.domain).toBe('data-science');
      expect(result.confidence).toBeGreaterThanOrEqual(0.70);
    });

    it('should detect iot domain from keywords', () => {
      const result = analyzer.analyzeComment('// sensor reading collection');

      expect(result.domain).toBe('iot');
      expect(result.confidence).toBeGreaterThanOrEqual(0.70);
    });
  });

  // ============================================================================
  // 2. 포맷 추출 (5개)
  // ============================================================================
  describe('Format Extraction', () => {
    it('should detect percent format', () => {
      const result = analyzer.analyzeComment('// percentage value between 0-100');

      expect(result.format).toBe('percent');
      expect(result.confidence).toBeGreaterThanOrEqual(0.80);
    });

    it('should detect currency format', () => {
      const result = analyzer.analyzeComment('// money value in currency');

      expect(result.format).toBe('currency');
    });

    it('should detect hash format', () => {
      const result = analyzer.analyzeComment('// hash of the input');

      expect(result.format).toBe('hash_string');
    });

    it('should detect validated string format', () => {
      const result = analyzer.analyzeComment('// email validation required');

      expect(result.format).toBe('validated_string');
    });

    it('should detect bytes format', () => {
      const result = analyzer.analyzeComment('// buffer size in bytes');

      expect(result.format).toBe('bytes');
    });

    it('should detect hex format', () => {
      const result = analyzer.analyzeComment('// hexadecimal color code');

      expect(result.format).toBe('hex');
    });
  });

  // ============================================================================
  // 3. 범위 추출 (5개)
  // ============================================================================
  describe('Range Extraction', () => {
    it('should extract numeric range 0-100', () => {
      const result = analyzer.analyzeComment('// range: 0-100 percent');

      expect(result.range).toBeDefined();
      expect(result.range?.min).toBe(0);
      expect(result.range?.max).toBe(100);
      expect(result.range?.unit).toBe('percent');
      expect(result.confidence).toBeGreaterThanOrEqual(0.80);
    });

    it('should detect positive constraint', () => {
      const result = analyzer.analyzeComment('// must be positive > 0');

      expect(result.range).toBeDefined();
      expect(result.range?.isPositive).toBe(true);
    });

    it('should detect non-negative constraint', () => {
      const result = analyzer.analyzeComment('// non-negative value >= 0');

      expect(result.range).toBeDefined();
      expect(result.range?.isNonNegative).toBe(true);
    });

    it('should detect negative constraint', () => {
      const result = analyzer.analyzeComment('// negative number < 0');

      expect(result.range).toBeDefined();
      expect(result.range?.isNegative).toBe(true);
    });

    it('should extract unit information', () => {
      const result = analyzer.analyzeComment('// timeout in milliseconds');

      expect(result.range).toBeDefined();
      expect(result.range?.unit).toBe('milliseconds');
    });
  });

  // ============================================================================
  // 4. 신뢰도 계산 (5개)
  // ============================================================================
  describe('Confidence Calculation', () => {
    it('should have high confidence for explicit domain tag', () => {
      const result = analyzer.analyzeComment('// finance: tax calculation');

      expect(result.confidence).toBe(0.95);
    });

    it('should have high confidence for multiple domain keywords', () => {
      const result = analyzer.analyzeComment('// tax price cost amount payment fee');

      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('should have moderate confidence for format hints', () => {
      const result = analyzer.analyzeComment('// currency value');

      expect(result.confidence).toBeGreaterThanOrEqual(0.80);
    });

    it('should have moderate confidence for range info', () => {
      const result = analyzer.analyzeComment('// range: 0-100');

      expect(result.confidence).toBe(0.80);
    });

    it('should have zero confidence for empty comment', () => {
      const result = analyzer.analyzeComment('');

      expect(result.confidence).toBe(0);
    });
  });

  // ============================================================================
  // 5. 복잡한 주석 (5개)
  // ============================================================================
  describe('Complex Comments', () => {
    it('should handle multi-domain comment by first match', () => {
      // email comes first, so web domain should be detected
      const result = analyzer.analyzeComment('// email validation for crypto token');

      expect(result.domain).toBe('web');
    });

    it('should handle multiple format hints', () => {
      const result = analyzer.analyzeComment('// encrypted hash value');

      expect(result.format).toBeDefined();
      expect(['encrypted_string', 'hash_string'].includes(result.format || '')).toBe(true);
    });

    it('should handle comment with /* */ style', () => {
      const result = analyzer.analyzeComment('/* finance: tax calculation */');

      expect(result.domain).toBe('finance');
      expect(result.confidence).toBe(0.95);
    });

    it('should combine domain, format, and range', () => {
      const result = analyzer.analyzeComment('// finance: percentage value 0-100 currency');

      expect(result.domain).toBe('finance');
      expect(result.format).toBeDefined();
      expect(result.range?.min).toBe(0);
      expect(result.range?.max).toBe(100);
      expect(result.confidence).toBeGreaterThanOrEqual(0.80);
    });

    it('should handle typos in domain tags gracefully', () => {
      const result = analyzer.analyzeComment('// financeee: tax');

      // Should still detect from keywords
      expect(result.domain).toBe('finance');
    });
  });

  // ============================================================================
  // 6. 엣지 케이스 (5개)
  // ============================================================================
  describe('Edge Cases', () => {
    it('should handle comment without slash prefix', () => {
      const result = analyzer.analyzeComment('finance: tax calculation');

      expect(result.domain).toBe('finance');
      expect(result.confidence).toBe(0.95);
    });

    it('should handle mixed case keywords', () => {
      const result = analyzer.analyzeComment('// FINANCE: Tax Calculation');

      expect(result.domain).toBe('finance');
    });

    it('should handle comments with extra whitespace', () => {
      const result = analyzer.analyzeComment('  //   finance:   tax   calculation   ');

      expect(result.domain).toBe('finance');
    });

    it('should handle very short comments', () => {
      const result = analyzer.analyzeComment('// tax');

      expect(result.domain).toBe('finance');
      expect(result.confidence).toBeGreaterThanOrEqual(0.70);
    });

    it('should handle comments with no extractable info', () => {
      const result = analyzer.analyzeComment('// todo: refactor this');

      expect(result.confidence).toBe(0);
      expect(result.domain).toBeUndefined();
      expect(result.format).toBeUndefined();
      expect(result.range).toBeUndefined();
    });
  });

  // ============================================================================
  // 7. 유틸리티 메서드 (4개)
  // ============================================================================
  describe('Utility Methods', () => {
    it('should get domain for keyword', () => {
      const domain = analyzer.getDomainForKeyword('tax');

      expect(domain).toBe('finance');
    });

    it('should get format for keyword', () => {
      const format = analyzer.getFormatForKeyword('currency');

      expect(format).toBe('currency');
    });

    it('should return null for unknown domain keyword', () => {
      const domain = analyzer.getDomainForKeyword('unknown_word');

      expect(domain).toBeNull();
    });

    it('should return null for unknown format keyword', () => {
      const format = analyzer.getFormatForKeyword('unknown_format');

      expect(format).toBeNull();
    });

    it('should analyze multiple comments', () => {
      const comments = [
        '// finance: tax',
        '// web: email validation',
        '// range: 0-100'
      ];
      const results = analyzer.analyzeComments(comments);

      expect(results.length).toBe(3);
      expect(results[0].domain).toBe('finance');
      expect(results[1].domain).toBe('web');
      expect(results[2].range?.min).toBe(0);
    });
  });

  // ============================================================================
  // 8. 실제 코드 시나리오 (3개)
  // ============================================================================
  describe('Real-World Scenarios', () => {
    it('should analyze tax calculation function comment', () => {
      const comment = '// finance: calculate tax amount in currency, range 0-100 percent';
      const result = analyzer.analyzeComment(comment);

      expect(result.domain).toBe('finance');
      expect(result.format).toBe('currency');
      expect(result.range?.min).toBe(0);
      expect(result.range?.max).toBe(100);
      expect(result.confidence).toBeGreaterThanOrEqual(0.80);
    });

    it('should analyze email validation comment', () => {
      const comment = '// web: validated email address, must be non-negative';
      const result = analyzer.analyzeComment(comment);

      expect(result.domain).toBe('web');
      expect(result.format).toBe('validated_string');
      expect(result.range?.isNonNegative).toBe(true);
    });

    it('should analyze vector operation comment', () => {
      const comment = '// data-science: vector of float values, range 0-1000 bytes';
      const result = analyzer.analyzeComment(comment);

      expect(result.domain).toBe('data-science');
      expect(result.range?.max).toBe(1000);
      expect(result.range?.unit).toBe('bytes');
    });
  });
});
