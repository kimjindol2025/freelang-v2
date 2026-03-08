/**
 * Phase 4 Step 1: Function Name Enhancer Tests
 */

import { describe, it, expect } from '@jest/globals';
import { FunctionNameEnhancer } from '../src/analyzer/function-name-enhancer';

describe('FunctionNameEnhancer', () => {
  let enhancer: FunctionNameEnhancer;

  beforeAll(() => {
    enhancer = new FunctionNameEnhancer();
  });

  // ============================================================================
  // 1. 술어 함수 (Predicate) 분석 테스트 (10개)
  // ============================================================================
  describe('Predicate Function Detection', () => {
    it('should detect isValid as boolean predicate', () => {
      const result = enhancer.analyzeFunctionName('isValid');

      expect(result.isPredicate).toBe(true);
      expect(result.returnTypeHint).toBe('boolean');
      expect(result.confidence).toBe(0.95);
    });

    it('should detect hasError as boolean predicate', () => {
      const result = enhancer.analyzeFunctionName('hasError');

      expect(result.isPredicate).toBe(true);
      expect(result.returnTypeHint).toBe('boolean');
    });

    it('should detect canProceed as boolean predicate', () => {
      const result = enhancer.analyzeFunctionName('canProceed');

      expect(result.isPredicate).toBe(true);
      expect(result.returnTypeHint).toBe('boolean');
    });

    it('should detect shouldProcess as boolean predicate', () => {
      const result = enhancer.analyzeFunctionName('shouldProcess');

      expect(result.isPredicate).toBe(true);
      expect(result.returnTypeHint).toBe('boolean');
    });

    it('should detect willRetry as boolean predicate', () => {
      const result = enhancer.analyzeFunctionName('willRetry');

      expect(result.isPredicate).toBe(true);
      expect(result.returnTypeHint).toBe('boolean');
    });

    it('should detect isEmpty as boolean predicate', () => {
      const result = enhancer.analyzeFunctionName('isEmpty');

      expect(result.isPredicate).toBe(true);
      expect(result.returnTypeHint).toBe('boolean');
      expect(result.object).toBe('empty');
    });

    it('should detect isActiveEnabled as boolean (multi-word adjective)', () => {
      const result = enhancer.analyzeFunctionName('isActiveEnabled');

      expect(result.isPredicate).toBe(true);
      expect(result.returnTypeHint).toBe('boolean');
    });

    it('should NOT detect calculate as predicate', () => {
      const result = enhancer.analyzeFunctionName('calculateTax');

      expect(result.isPredicate).toBe(false);
      expect(result.returnTypeHint).not.toBe('boolean');
    });

    it('should handle snake_case predicates', () => {
      const result = enhancer.analyzeFunctionName('is_valid');

      expect(result.isPredicate).toBe(true);
      expect(result.returnTypeHint).toBe('boolean');
    });

    it('should extract reasoning for predicates', () => {
      const result = enhancer.analyzeFunctionName('isReady');

      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.reasoning[0]).toContain('Predicate');
    });
  });

  // ============================================================================
  // 2. 동사 기반 타입 분석 테스트 (10개)
  // ============================================================================
  describe('Verb-Based Type Inference', () => {
    it('should infer number type from calculate verb', () => {
      const result = enhancer.analyzeFunctionName('calculateSum');

      expect(result.verb).toBe('calculate');
      expect(result.returnTypeHint).toBe('number');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('should infer number type from sum verb', () => {
      const result = enhancer.analyzeFunctionName('sumValues');

      expect(result.verb).toBe('sum');
      expect(result.returnTypeHint).toBe('number');
      expect(result.confidence).toBe(0.9);
    });

    it('should infer array type from filter verb', () => {
      const result = enhancer.analyzeFunctionName('filterItems');

      expect(result.verb).toBe('filter');
      expect(result.returnTypeHint).toBe('array');
      expect(result.confidence).toBe(0.9);
    });

    it('should infer object type from create verb', () => {
      const result = enhancer.analyzeFunctionName('createUser');

      expect(result.verb).toBe('create');
      expect(result.returnTypeHint).toBe('object');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should infer string type from format verb', () => {
      const result = enhancer.analyzeFunctionName('formatDate');

      expect(result.verb).toBe('format');
      expect(result.returnTypeHint).toBe('string');
      expect(result.confidence).toBe(0.9);
    });

    it('should infer boolean type from validate verb', () => {
      const result = enhancer.analyzeFunctionName('validateInput');

      expect(result.verb).toBe('validate');
      expect(result.returnTypeHint).toBe('boolean');
      expect(result.confidence).toBe(0.95);
    });

    it('should infer type from get verb with noun context', () => {
      const result = enhancer.analyzeFunctionName('getPrice');

      expect(result.verb).toBe('get');
      // get is "inferred" type, so check for noun-driven type
      expect(result.object).toBe('price');
    });

    it('should infer array type from map verb', () => {
      const result = enhancer.analyzeFunctionName('mapData');

      expect(result.verb).toBe('map');
      expect(result.returnTypeHint).toBe('array');
    });

    it('should infer array type from flatten verb', () => {
      const result = enhancer.analyzeFunctionName('flattenNested');

      expect(result.verb).toBe('flatten');
      expect(result.returnTypeHint).toBe('array');
    });

    it('should handle unknown verbs gracefully', () => {
      const result = enhancer.analyzeFunctionName('unknownOperation');

      expect(result.verb).toBe('unknown');
      expect(result.returnTypeHint).toBeUndefined();
      // Should still extract object
      expect(result.object).toBeDefined();
    });
  });

  // ============================================================================
  // 3. 명사 기반 도메인 및 타입 분석 테스트 (10개)
  // ============================================================================
  describe('Noun-Based Domain and Type Inference', () => {
    it('should infer decimal type from tax noun (finance)', () => {
      const result = enhancer.analyzeFunctionName('calculateTax');

      expect(result.object).toBe('tax');
      expect(result.returnTypeHint).toBe('decimal');
      expect(result.domainHint).toBe('finance');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should infer currency type from price noun (finance)', () => {
      const result = enhancer.analyzeFunctionName('getPrice');

      expect(result.returnTypeHint).toBe('currency');
      expect(result.domainHint).toBe('finance');
    });

    it('should infer boolean from validate verb (with email context)', () => {
      const result = enhancer.analyzeFunctionName('validateEmail');

      // validate verb overrides email noun type → boolean
      expect(result.verb).toBe('validate');
      expect(result.returnTypeHint).toBe('boolean');
      expect(result.domainHint).toBe('web'); // Domain from email noun
      expect(result.confidence).toBe(0.95);
    });

    it('should infer validated_string from url noun (web)', () => {
      const result = enhancer.analyzeFunctionName('parseUrl');

      expect(result.returnTypeHint).toBe('validated_string');
      expect(result.domainHint).toBe('web');
    });

    it('should infer array<number> from vector noun (data-science)', () => {
      const result = enhancer.analyzeFunctionName('filterVector');

      expect(result.returnTypeHint).toBe('array<number>');
      expect(result.domainHint).toBe('data-science');
    });

    it('should infer array<array<number>> from matrix noun (data-science)', () => {
      const result = enhancer.analyzeFunctionName('transposeMatrix');

      expect(result.returnTypeHint).toBe('array<array<number>>');
      expect(result.domainHint).toBe('data-science');
    });

    it('should infer hash_string from hash noun (crypto)', () => {
      const result = enhancer.analyzeFunctionName('generateHash');

      expect(result.returnTypeHint).toBe('hash_string');
      expect(result.domainHint).toBe('crypto');
      expect(result.confidence).toBeGreaterThanOrEqual(0.95);
    });

    it('should infer number from sensor noun (iot)', () => {
      const result = enhancer.analyzeFunctionName('readSensor');

      expect(result.returnTypeHint).toBe('number');
      expect(result.domainHint).toBe('iot');
    });

    it('should handle multiple domain matches with first match priority', () => {
      const result = enhancer.analyzeFunctionName('calculateAmount');

      // amount is in finance, so should prefer finance domain
      expect(result.domainHint).toBe('finance');
    });

    it('should apply confidence penalty for partial noun matches', () => {
      const result = enhancer.analyzeFunctionName('processLargeDataset');

      expect(result.returnTypeHint).toBe('array<object>'); // dataset
      expect(result.domainHint).toBe('data-science');
      // Partial match should have slightly lower confidence
      expect(result.confidence).toBeLessThan(0.95);
    });
  });

  // ============================================================================
  // 4. 복합 함수명 분석 테스트 (10개)
  // ============================================================================
  describe('Complex Function Names', () => {
    it('should analyze 3-word function names', () => {
      const result = enhancer.analyzeFunctionName('calculateTotalTax');

      expect(result.words.length).toBe(3);
      expect(result.verb).toBe('calculate');
      expect(result.returnTypeHint).toBe('decimal');
    });

    it('should handle snake_case finance function', () => {
      const result = enhancer.analyzeFunctionName('get_total_price');

      expect(result.words).toEqual(['get', 'total', 'price']);
      expect(result.returnTypeHint).toBe('currency');
      expect(result.domainHint).toBe('finance');
    });

    it('should handle mixed case complex names', () => {
      const result = enhancer.analyzeFunctionName('validateUserEmail');

      expect(result.verb).toBe('validate');
      expect(result.returnTypeHint).toBe('boolean');
      // Finds email in the object part
      expect(result.reasoning.some(r => r.includes('email'))).toBe(true);
    });

    it('should analyze acronym-heavy names', () => {
      const result = enhancer.analyzeFunctionName('calculateHTTPError');

      expect(result.verb).toBe('calculate');
      expect(result.words.length).toBeGreaterThan(1);
    });

    it('should handle very long function names', () => {
      const result = enhancer.analyzeFunctionName(
        'isValidEmailForBusinessAccountCreation'
      );

      expect(result.isPredicate).toBe(true);
      expect(result.returnTypeHint).toBe('boolean');
    });

    it('should find domain signal even in complex names', () => {
      const result = enhancer.analyzeFunctionName('validateAndCalculateTotalTaxAmount');

      expect(result.domainHint).toBe('finance');
    });

    it('should handle function names with numbers', () => {
      const result = enhancer.analyzeFunctionName('calculatePrice2024');

      expect(result.verb).toBe('calculate');
      expect(result.returnTypeHint).toBe('currency');
    });

    it('should prefer earlier matching nouns', () => {
      const result = enhancer.analyzeFunctionName('getEmailPrice');

      // Should match email first (web) or price first (finance)?
      // email comes first in the words, so should be web domain
      expect(result.words[1]).toBe('email');
    });

    it('should handle underscore-heavy names', () => {
      const result = enhancer.analyzeFunctionName('is_email_valid_for_registration');

      expect(result.isPredicate).toBe(true);
      expect(result.returnTypeHint).toBe('boolean');
    });

    it('should provide comprehensive reasoning', () => {
      const result = enhancer.analyzeFunctionName('calculateTax');

      expect(result.reasoning.length).toBeGreaterThan(1);
      expect(result.reasoning.some(r => r.includes('Verb'))).toBe(true);
      expect(result.reasoning.some(r => r.includes('Noun'))).toBe(true);
    });
  });

  // ============================================================================
  // 5. 유틸리티 메서드 테스트 (6개)
  // ============================================================================
  describe('Utility Methods', () => {
    it('should get verb type hint', () => {
      const hint = enhancer.getVerbTypeHint('calculate');

      expect(hint).not.toBeNull();
      expect(hint?.returnType).toBe('number');
      expect(hint?.confidence).toBe(0.85);
    });

    it('should get noun type hint with domain', () => {
      const hint = enhancer.getNounTypeHint('tax');

      expect(hint).not.toBeNull();
      expect(hint?.returnType).toBe('decimal');
      expect(hint?.domain).toBe('finance');
    });

    it('should check isPredicate directly', () => {
      expect(enhancer.isPredicate('isValid')).toBe(true);
      expect(enhancer.isPredicate('calculateTax')).toBe(false);
      expect(enhancer.isPredicate('hasError')).toBe(true);
    });

    it('should get high confidence type hints', () => {
      const hint = enhancer.getHighConfidenceTypeHint('isValid', 0.9);

      expect(hint).toBe('boolean');

      const lowConfHint = enhancer.getHighConfidenceTypeHint('unknownFunction', 0.9);
      expect(lowConfHint).toBeNull();
    });

    it('should analyze multiple function names', () => {
      const names = ['calculateTax', 'isValid', 'getPrice'];
      const results = enhancer.analyzeFunctions(names);

      expect(results.length).toBe(3);
      expect(results[0].returnTypeHint).toBe('decimal');
      expect(results[1].returnTypeHint).toBe('boolean');
      expect(results[2].returnTypeHint).toBe('currency');
    });

    it('should return null for unknown hints', () => {
      const hint = enhancer.getVerbTypeHint('unknownVerb');

      expect(hint).toBeNull();
    });
  });
});
