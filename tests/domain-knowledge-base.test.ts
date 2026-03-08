/**
 * Phase 3 Stage 3 - DomainKnowledgeBase Tests
 */

import { DomainKnowledgeBase, DOMAIN_NAMES } from '../src/knowledge/domain-knowledge-base';

describe('DomainKnowledgeBase', () => {
  let kb: DomainKnowledgeBase;

  beforeAll(() => {
    kb = new DomainKnowledgeBase();
  });

  // ============================================================================
  // 1. 도메인 감지 테스트 (5개)
  // ============================================================================
  describe('Domain Detection', () => {
    test('should detect finance domain from function name', () => {
      const result = kb.detectDomain({
        functionName: 'calculateTax',
        variableNames: ['price', 'tax'],
        operations: ['arithmetic'],
      });

      expect(result).not.toBeNull();
      expect(result?.domain).toBe(DOMAIN_NAMES.FINANCE);
      expect(result?.confidence).toBeGreaterThanOrEqual(0.6);
    });

    test('should detect data-science domain from variable names', () => {
      const result = kb.detectDomain({
        functionName: 'filter',
        variableNames: ['vector', 'matrix'],
        operations: [],
      });

      expect(result).not.toBeNull();
      expect(result?.domain).toBe(DOMAIN_NAMES.DATA_SCIENCE);
      expect(result?.confidence).toBeGreaterThan(0.7);
    });

    test('should detect web domain from keywords', () => {
      const result = kb.detectDomain({
        functionName: 'validateEmail',
        variableNames: ['email', 'url'],
        operations: ['parse'],
      });

      expect(result).not.toBeNull();
      expect(result?.domain).toBe(DOMAIN_NAMES.WEB);
      expect(result?.confidence).toBeGreaterThan(0.7);
    });

    test('should detect crypto domain from hash keywords', () => {
      const result = kb.detectDomain({
        functionName: 'generateHash',
        variableNames: ['hash', 'signature'],
        operations: ['encrypt'],
      });

      expect(result).not.toBeNull();
      expect(result?.domain).toBe(DOMAIN_NAMES.CRYPTO);
    });

    test('should detect iot domain from sensor keywords', () => {
      const result = kb.detectDomain({
        functionName: 'readSensor',
        variableNames: ['sensor', 'reading', 'measurement'],
        operations: [],
      });

      expect(result).not.toBeNull();
      expect(result?.domain).toBe(DOMAIN_NAMES.IOT);
    });
  });

  // ============================================================================
  // 2. 타입 매핑 조회 테스트 (5개)
  // ============================================================================
  describe('Type Mapping Retrieval', () => {
    test('should get finance type mapping', () => {
      const mapping = kb.getTypeMapping(DOMAIN_NAMES.FINANCE);

      expect(mapping).not.toBeNull();
      expect(mapping?.get('tax')).toBe('decimal');
      expect(mapping?.get('price')).toBe('currency');
    });

    test('should get data-science type mapping', () => {
      const mapping = kb.getTypeMapping(DOMAIN_NAMES.DATA_SCIENCE);

      expect(mapping).not.toBeNull();
      expect(mapping?.get('vector')).toBe('array<number>');
      expect(mapping?.get('matrix')).toBe('array<array<number>>');
    });

    test('should get web type mapping', () => {
      const mapping = kb.getTypeMapping(DOMAIN_NAMES.WEB);

      expect(mapping).not.toBeNull();
      expect(mapping?.get('email')).toBe('validated_string');
      expect(mapping?.get('url')).toBe('validated_string');
    });

    test('should get crypto type mapping', () => {
      const mapping = kb.getTypeMapping(DOMAIN_NAMES.CRYPTO);

      expect(mapping).not.toBeNull();
      expect(mapping?.get('hash')).toBe('hash_string');
      expect(mapping?.get('signature')).toBe('hash_string');
    });

    test('should get iot type mapping', () => {
      const mapping = kb.getTypeMapping(DOMAIN_NAMES.IOT);

      expect(mapping).not.toBeNull();
      expect(mapping?.get('sensor')).toBe('number');
      expect(mapping?.get('reading')).toBe('number');
    });
  });

  // ============================================================================
  // 3. 커스텀 도메인 등록 테스트 (5개)
  // ============================================================================
  describe('Custom Domain Registration', () => {
    test('should register custom domain', () => {
      const customKB = new DomainKnowledgeBase();

      customKB.registerDomain({
        name: 'healthcare',
        keywords: ['patient', 'hospital', 'diagnosis', 'prescription'],
        typeMapping: new Map([
          ['patient_id', 'validated_string'],
          ['age', 'number'],
          ['blood_pressure', 'string'],
        ]),
        strictnessLevel: 'strict',
      });

      const domain = customKB.getDomain('healthcare');
      expect(domain).not.toBeNull();
      expect(domain?.name).toBe('healthcare');
    });

    test('should use registered custom domain', () => {
      const customKB = new DomainKnowledgeBase();
      customKB.registerDomain({
        name: 'healthcare',
        keywords: ['patient', 'diagnosis'],
        typeMapping: new Map(),
        strictnessLevel: 'strict',
      });

      const result = customKB.detectDomain({
        functionName: 'diagnosisPatient',
        variableNames: ['patient'],
        operations: [],
      });

      expect(result?.domain).toBe('healthcare');
    });

    test('should reject domain with empty name', () => {
      const customKB = new DomainKnowledgeBase();

      expect(() => {
        customKB.registerDomain({
          name: '',
          keywords: [],
          typeMapping: new Map(),
          strictnessLevel: 'moderate',
        });
      }).toThrow();
    });

    test('should overwrite existing domain', () => {
      const customKB = new DomainKnowledgeBase();
      const oldDomain = customKB.getDomain(DOMAIN_NAMES.FINANCE);

      customKB.registerDomain({
        name: DOMAIN_NAMES.FINANCE,
        keywords: ['custom'],
        typeMapping: new Map([['custom_tax', 'custom_type']]),
        strictnessLevel: 'relaxed',
      });

      const newDomain = customKB.getDomain(DOMAIN_NAMES.FINANCE);
      expect(newDomain?.strictnessLevel).toBe('relaxed');
    });

    test('should retrieve all domains', () => {
      const allDomains = kb.getAllDomains();

      expect(allDomains.size).toBeGreaterThanOrEqual(5);
      expect(allDomains.has(DOMAIN_NAMES.FINANCE)).toBe(true);
      expect(allDomains.has(DOMAIN_NAMES.DATA_SCIENCE)).toBe(true);
    });
  });

  // ============================================================================
  // 4. 검증 규칙 테스트 (5개)
  // ============================================================================
  describe('Validation Rules', () => {
    test('should get validation rules for finance decimal', () => {
      const rules = kb.getValidationRules(DOMAIN_NAMES.FINANCE, 'decimal');

      expect(rules).not.toBeNull();
      expect(rules).toContain('non-negative');
      expect(rules).toContain('precision-2');
    });

    test('should get validation rules for web email', () => {
      const rules = kb.getValidationRules(DOMAIN_NAMES.WEB, 'email');

      expect(rules).not.toBeNull();
      expect(rules).toContain('RFC-5322');
    });

    test('should get validation rules for web url', () => {
      const rules = kb.getValidationRules(DOMAIN_NAMES.WEB, 'url');

      expect(rules).not.toBeNull();
      expect(rules).toContain('RFC-3986');
    });

    test('should return null for non-existent validation rules', () => {
      const rules = kb.getValidationRules(DOMAIN_NAMES.FINANCE, 'nonexistent_type');

      expect(rules).toBeNull();
    });

    test('should return null for non-existent domain', () => {
      const rules = kb.getValidationRules('nonexistent_domain', 'type');

      expect(rules).toBeNull();
    });
  });

  // ============================================================================
  // 5. 엣지 케이스 테스트 (5개)
  // ============================================================================
  describe('Edge Cases', () => {
    test('should handle empty context', () => {
      const result = kb.detectDomain({
        functionName: '',
        variableNames: [],
        operations: [],
      });

      expect(result).toBeNull();
    });

    test('should handle case-insensitive matching', () => {
      const result = kb.detectDomain({
        functionName: 'CALCULATETAX',
        variableNames: ['TAX', 'PRICE'],
        operations: [],
      });

      expect(result).not.toBeNull();
      expect(result?.domain).toBe(DOMAIN_NAMES.FINANCE);
    });

    test('should infer type from variable name', () => {
      const type = kb.inferTypeFromName('tax', DOMAIN_NAMES.FINANCE);

      expect(type).toBe('decimal');
    });

    test('should handle partial name matching for type inference', () => {
      const type = kb.inferTypeFromName('total_price', DOMAIN_NAMES.FINANCE);

      expect(type).toBe('currency');
    });

    test('should return null for unknown variable in domain', () => {
      const type = kb.inferTypeFromName('unknown_variable', DOMAIN_NAMES.FINANCE);

      expect(type).toBeNull();
    });
  });
});
