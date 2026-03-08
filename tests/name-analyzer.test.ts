/**
 * Phase 3 Stage 3 - NameAnalyzer Tests (30 tests)
 */

import { NameAnalyzer } from '../src/analyzer/name-analyzer';

describe('NameAnalyzer', () => {
  let analyzer: NameAnalyzer;

  beforeAll(() => {
    analyzer = new NameAnalyzer();
  });

  // ============================================================================
  // 1. camelCase 파싱 (5개)
  // ============================================================================
  describe('camelCase Parsing', () => {
    test('should parse simple camelCase', () => {
      const words = analyzer.extractWords('getUserName');

      expect(words).toEqual(['get', 'user', 'name']);
    });

    test('should parse camelCase with multiple words', () => {
      const words = analyzer.extractWords('calculateTotalTaxAmount');

      expect(words).toEqual(['calculate', 'total', 'tax', 'amount']);
    });

    test('should handle single word', () => {
      const words = analyzer.extractWords('user');

      expect(words).toEqual(['user']);
    });

    test('should handle empty string', () => {
      const words = analyzer.extractWords('');

      expect(words).toEqual([]);
    });

    test('should parse camelCase with numbers as part of word', () => {
      const words = analyzer.extractWords('getUser2Data');

      expect(words.length).toBeGreaterThan(0);
      expect(words[0]).toBe('get');
    });
  });

  // ============================================================================
  // 2. snake_case 파싱 (5개)
  // ============================================================================
  describe('snake_case Parsing', () => {
    test('should parse simple snake_case', () => {
      const words = analyzer.extractWords('get_user_name');

      expect(words).toEqual(['get', 'user', 'name']);
    });

    test('should parse snake_case with multiple words', () => {
      const words = analyzer.extractWords('calculate_total_tax_amount');

      expect(words).toEqual(['calculate', 'total', 'tax', 'amount']);
    });

    test('should handle trailing underscore', () => {
      const words = analyzer.extractWords('user_');

      expect(words).toEqual(['user']);
    });

    test('should handle leading underscore', () => {
      const words = analyzer.extractWords('_private_var');

      expect(words).toEqual(['private', 'var']);
    });

    test('should handle consecutive underscores', () => {
      const words = analyzer.extractWords('user__name');

      expect(words).toEqual(['user', 'name']);
    });
  });

  // ============================================================================
  // 3. Acronym 처리 (5개)
  // ============================================================================
  describe('Acronym Handling', () => {
    test('should parse acronym followed by word', () => {
      const words = analyzer.extractWords('HTTPRequest');

      expect(words[0]).toBe('http');
      expect(words).toContain('request');
    });

    test('should parse multiple acronyms', () => {
      const words = analyzer.extractWords('XMLHTTPRequest');

      expect(words.length).toBeGreaterThanOrEqual(2);
      expect(words.some(w => w.includes('xml'))).toBe(true);
    });

    test('should handle acronym at end', () => {
      const words = analyzer.extractWords('getRoleAsJSON');

      expect(words).toContain('json');
    });

    test('should handle single letter words', () => {
      const words = analyzer.extractWords('aService');

      expect(words.length).toBeGreaterThan(0);
    });

    test('should parse ID in name', () => {
      const words = analyzer.extractWords('getUserIDByEmail');

      expect(words).toContain('user');
      expect(words).toContain('email');
    });
  });

  // ============================================================================
  // 4. 동사/명사 분류 (5개)
  // ============================================================================
  describe('Verb/Noun Classification', () => {
    test('should classify verb correctly', () => {
      const semantics = analyzer.analyzeWordSemantics('get');

      expect(semantics.role).toBe('verb');
      expect(semantics.confidence).toBeGreaterThan(0.5);
    });

    test('should classify noun correctly', () => {
      const semantics = analyzer.analyzeWordSemantics('user');

      expect(semantics.role).toBe('noun');
      expect(semantics.confidence).toBeGreaterThan(0.5);
    });

    test('should classify adjective correctly', () => {
      const semantics = analyzer.analyzeWordSemantics('valid');

      expect(semantics.role).toBe('adjective');
    });

    test('should handle unknown words', () => {
      const semantics = analyzer.analyzeWordSemantics('xyz123');

      expect(semantics.role).toBe('unknown');
    });

    test('should be case-insensitive', () => {
      const semantics1 = analyzer.analyzeWordSemantics('GET');
      const semantics2 = analyzer.analyzeWordSemantics('get');

      expect(semantics1.role).toBe(semantics2.role);
      expect(semantics1.role).toBe('verb');
    });
  });

  // ============================================================================
  // 5. 타입 힌트 정확도 (5개)
  // ============================================================================
  describe('Type Hint Accuracy', () => {
    test('should infer number type from count', () => {
      const semantics = analyzer.analyzeWordSemantics('count');

      expect(semantics.typeHint).toBe('number');
      expect(semantics.confidence).toBeGreaterThan(0.9);
    });

    test('should infer decimal type from tax', () => {
      const semantics = analyzer.analyzeWordSemantics('tax');

      expect(semantics.typeHint).toBe('decimal');
    });

    test('should infer array type from list', () => {
      const semantics = analyzer.analyzeWordSemantics('list');

      expect(semantics.typeHint).toBe('array');
    });

    test('should infer string type from name', () => {
      const semantics = analyzer.analyzeWordSemantics('name');

      expect(semantics.typeHint).toBe('string');
    });

    test('should infer bool type from is_valid', () => {
      const semantics = analyzer.analyzeWordSemantics('is_valid');

      expect(semantics.typeHint).toBe('bool');
    });
  });

  // ============================================================================
  // 6. 의도 추론 (추가 테스트)
  // ============================================================================
  describe('Intent Inference', () => {
    test('should infer finance intent from calculate + tax', () => {
      const intent = analyzer.inferIntentFromWords(['calculate', 'tax']);

      expect(intent).not.toBeNull();
      expect(intent?.domain).toBe('finance');
      expect(intent?.confidence).toBeGreaterThan(0.8);
    });

    test('should infer web intent from validate + email', () => {
      const intent = analyzer.inferIntentFromWords(['validate', 'email']);

      expect(intent).not.toBeNull();
      expect(intent?.domain).toBe('web');
    });

    test('should infer data-science intent from filter + vector', () => {
      const intent = analyzer.inferIntentFromWords(['filter', 'vector']);

      expect(intent).not.toBeNull();
      expect(intent?.domain).toBe('data-science');
    });

    test('should handle no matching intent', () => {
      const intent = analyzer.inferIntentFromWords(['xyz', 'abc']);

      // null 또는 도메인 힌트만 있어야 함
      expect(intent === null || intent?.confidence <= 0.7).toBe(true);
    });

    test('should infer from domain hint alone', () => {
      const intent = analyzer.inferIntentFromWords(['hash']);

      expect(intent?.domain).toBe('crypto');
    });
  });

  // ============================================================================
  // 7. 통합 파싱 (parseNam e)
  // ============================================================================
  describe('Integrated Name Parsing', () => {
    test('should parse function name correctly', () => {
      const parts = analyzer.parseName('calculateTax', true);

      expect(parts.isFunction).toBe(true);
      expect(parts.words.length).toBeGreaterThan(0);
      expect(parts.verbPhrase).toBe('calculate');
    });

    test('should parse variable name correctly', () => {
      const parts = analyzer.parseName('totalAmount', false);

      expect(parts.isVariable).toBe(true);
      expect(parts.words).toContain('total');
      expect(parts.words).toContain('amount');
    });

    test('should extract type hint from name', () => {
      const parts = analyzer.parseName('totalPrice', false);
      const typeHint = analyzer.getTypeHintFromName(parts);

      expect(typeHint).not.toBeNull();
      expect(typeHint?.type).toBe('decimal');
    });

    test('should handle long names', () => {
      const parts = analyzer.parseName('calculateMonthlyTotalTaxAmountForUser', true);

      expect(parts.words.length).toBeGreaterThanOrEqual(5);
    });
  });
});
