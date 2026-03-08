/**
 * Phase 4 Step 2: Variable Name Enhancer Tests
 */

import { describe, it, expect } from '@jest/globals';
import { VariableNameEnhancer } from '../src/analyzer/variable-name-enhancer';

describe('VariableNameEnhancer', () => {
  let enhancer: VariableNameEnhancer;

  beforeAll(() => {
    enhancer = new VariableNameEnhancer();
  });

  // ============================================================================
  // 1. Boolean 변수 분석 (8개)
  // ============================================================================
  describe('Boolean Variables', () => {
    it('should detect isValid as boolean', () => {
      const result = enhancer.analyzeVariableName('isValid');

      expect(result.inferredType).toBe('boolean');
      expect(result.prefix).toBe('is');
      expect(result.confidence).toBe(0.95);
    });

    it('should detect hasError as boolean', () => {
      const result = enhancer.analyzeVariableName('hasError');

      expect(result.inferredType).toBe('boolean');
      expect(result.prefix).toBe('has');
    });

    it('should detect canProceed as boolean', () => {
      const result = enhancer.analyzeVariableName('canProceed');

      expect(result.inferredType).toBe('boolean');
      expect(enhancer.isBoolean('canProceed')).toBe(true);
    });

    it('should detect snake_case boolean', () => {
      const result = enhancer.analyzeVariableName('is_active');

      expect(result.inferredType).toBe('boolean');
    });

    it('should detect is_enabled as boolean', () => {
      const result = enhancer.analyzeVariableName('is_enabled');

      expect(result.inferredType).toBe('boolean');
    });

    it('should NOT detect normal variable as boolean', () => {
      const result = enhancer.analyzeVariableName('email');

      expect(result.inferredType).not.toBe('boolean');
    });

    it('should handle has_ prefix correctly', () => {
      const result = enhancer.analyzeVariableName('has_items');

      expect(result.prefix).toBe('has');
    });

    it('should check isBoolean utility method', () => {
      expect(enhancer.isBoolean('isReady')).toBe(true);
      expect(enhancer.isBoolean('count')).toBe(false);
    });
  });

  // ============================================================================
  // 2. 숫자 변수 분석 (8개)
  // ============================================================================
  describe('Number Variables', () => {
    it('should detect count as number', () => {
      const result = enhancer.analyzeVariableName('count');

      expect(result.inferredType).toBe('number');
      expect(result.confidence).toBe(0.95);
    });

    it('should detect size as number', () => {
      const result = enhancer.analyzeVariableName('size');

      expect(result.inferredType).toBe('number');
    });

    it('should detect tax as decimal', () => {
      const result = enhancer.analyzeVariableName('tax');

      expect(result.inferredType).toBe('decimal');
      expect(result.domain).toBe('finance');
    });

    it('should detect price as currency', () => {
      const result = enhancer.analyzeVariableName('price');

      expect(result.inferredType).toBe('currency');
      expect(result.domain).toBe('finance');
    });

    it('should detect total_count with suffix', () => {
      const result = enhancer.analyzeVariableName('total_count');

      expect(result.inferredType).toBe('number');
      expect(result.suffix).toBe('count');
    });

    it('should detect snake_case number', () => {
      const result = enhancer.analyzeVariableName('item_count');

      expect(result.inferredType).toBe('number');
    });

    it('should detect rate as percentage', () => {
      const result = enhancer.analyzeVariableName('rate');

      expect(result.inferredType).toBe('percentage');
    });

    it('should check isNumeric utility method', () => {
      expect(enhancer.isNumeric('count')).toBe(true);
      expect(enhancer.isNumeric('price')).toBe(true);
      expect(enhancer.isNumeric('email')).toBe(false);
    });
  });

  // ============================================================================
  // 3. 배열 변수 분석 (8개)
  // ============================================================================
  describe('Array Variables', () => {
    it('should detect items as array', () => {
      const result = enhancer.analyzeVariableName('items');

      expect(result.inferredType).toBe('array');
      // 'items' is exact match, not suffix
      expect(result.baseWord).toBe('items');
    });

    it('should detect list as array', () => {
      const result = enhancer.analyzeVariableName('list');

      expect(result.inferredType).toBe('array');
    });

    it('should detect vector as array<number>', () => {
      const result = enhancer.analyzeVariableName('vector');

      expect(result.inferredType).toBe('array<number>');
      expect(result.domain).toBe('data-science');
    });

    it('should detect matrix as array<array<number>>', () => {
      const result = enhancer.analyzeVariableName('matrix');

      expect(result.inferredType).toBe('array<array<number>>');
      expect(result.domain).toBe('data-science');
    });

    it('should detect snake_case array', () => {
      const result = enhancer.analyzeVariableName('user_list');

      expect(result.inferredType).toBe('array');
    });

    it('should detect items_list with double suffix', () => {
      const result = enhancer.analyzeVariableName('items_list');

      expect(result.inferredType).toBe('array');
    });

    it('should handle data as array', () => {
      const result = enhancer.analyzeVariableName('data');

      expect(result.inferredType).toBe('array');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should check isArray utility method', () => {
      expect(enhancer.isArray('items')).toBe(true);
      expect(enhancer.isArray('vector')).toBe(true);
      expect(enhancer.isArray('count')).toBe(false);
    });
  });

  // ============================================================================
  // 4. 문자열 변수 분석 (8개)
  // ============================================================================
  describe('String Variables', () => {
    it('should detect email as validated_string', () => {
      const result = enhancer.analyzeVariableName('email');

      expect(result.inferredType).toBe('validated_string');
      expect(result.domain).toBe('web');
      expect(result.confidence).toBe(0.95);
    });

    it('should detect url as validated_string', () => {
      const result = enhancer.analyzeVariableName('url');

      expect(result.inferredType).toBe('validated_string');
      expect(result.domain).toBe('web');
    });

    it('should detect name as string', () => {
      const result = enhancer.analyzeVariableName('name');

      expect(result.inferredType).toBe('string');
    });

    it('should detect text as string', () => {
      const result = enhancer.analyzeVariableName('text');

      expect(result.inferredType).toBe('string');
    });

    it('should detect message as string', () => {
      const result = enhancer.analyzeVariableName('message');

      expect(result.inferredType).toBe('string');
    });

    it('should detect snake_case string', () => {
      const result = enhancer.analyzeVariableName('user_name');

      expect(result.inferredType).toBe('string');
    });

    it('should handle hash as crypto hash_string', () => {
      const result = enhancer.analyzeVariableName('hash');

      expect(result.inferredType).toBe('hash_string');
      expect(result.domain).toBe('crypto');
    });

    it('should analyze token as validated_string', () => {
      const result = enhancer.analyzeVariableName('token');

      expect(result.inferredType).toBe('validated_string');
      expect(result.domain).toBe('crypto');
    });
  });

  // ============================================================================
  // 5. 복합 변수명 분석 (6개)
  // ============================================================================
  describe('Complex Variable Names', () => {
    it('should analyze email_list as array<validated_string>', () => {
      const result = enhancer.analyzeVariableName('email_list');

      // email → validated_string, list suffix → array
      expect(result.baseWord).toBe('email');
      expect(result.suffix).toBe('list');
      expect(result.inferredType).toBe('array');
    });

    it('should analyze user_count as number', () => {
      const result = enhancer.analyzeVariableName('user_count');

      expect(result.inferredType).toBe('number');
    });

    it('should handle camelCase email_list equivalent', () => {
      const result = enhancer.analyzeVariableName('emailList');

      expect(result.words).toEqual(['email', 'list']);
    });

    it('should analyze isEmailValid (predicate + adjective)', () => {
      const result = enhancer.analyzeVariableName('isEmailValid');

      expect(result.prefix).toBe('is');
      expect(result.inferredType).toBe('boolean');
    });

    it('should handle long variable names', () => {
      const result = enhancer.analyzeVariableName('totalPricePerItemForAllUsers');

      // Should find 'total' or 'price'
      expect(result.inferredType).toBeDefined();
    });

    it('should provide comprehensive reasoning', () => {
      const result = enhancer.analyzeVariableName('isActive');

      expect(result.reasoning.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // 6. 도메인 분석 (6개)
  // ============================================================================
  describe('Domain Inference', () => {
    it('should detect finance domain from tax', () => {
      const result = enhancer.analyzeVariableName('tax');

      expect(result.domain).toBe('finance');
    });

    it('should detect data-science domain from vector', () => {
      const result = enhancer.analyzeVariableName('vector');

      expect(result.domain).toBe('data-science');
    });

    it('should detect web domain from email', () => {
      const result = enhancer.analyzeVariableName('email');

      expect(result.domain).toBe('web');
    });

    it('should detect crypto domain from hash', () => {
      const result = enhancer.analyzeVariableName('hash');

      expect(result.domain).toBe('crypto');
    });

    it('should detect iot domain from sensor', () => {
      const result = enhancer.analyzeVariableName('sensor');

      expect(result.domain).toBe('iot');
    });

    it('should handle no domain for generic names', () => {
      const result = enhancer.analyzeVariableName('count');

      expect(result.domain).toBeUndefined();
    });
  });

  // ============================================================================
  // 7. 유틸리티 메서드 (4개)
  // ============================================================================
  describe('Utility Methods', () => {
    it('should get word type hint', () => {
      const hint = enhancer.getWordTypeHint('tax');

      expect(hint).not.toBeNull();
      expect(hint?.type).toBe('decimal');
      expect(hint?.domain).toBe('finance');
    });

    it('should get high confidence type hints', () => {
      const hint = enhancer.getHighConfidenceTypeHint('count', 0.9);

      expect(hint).toBe('number');
    });

    it('should return null for low confidence hints', () => {
      const hint = enhancer.getHighConfidenceTypeHint('unknown_var', 0.9);

      expect(hint).toBeNull();
    });

    it('should analyze multiple variables', () => {
      const names = ['email', 'count', 'isValid'];
      const results = enhancer.analyzeVariables(names);

      expect(results.length).toBe(3);
      expect(results[0].inferredType).toBe('validated_string');
      expect(results[1].inferredType).toBe('number');
      expect(results[2].inferredType).toBe('boolean');
    });
  });
});
