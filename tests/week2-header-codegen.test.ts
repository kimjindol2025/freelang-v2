/**
 * FreeLang Week 2 테스트
 * Task 2.1-2.3: 헤더 생성, 검증, 코드 생성
 */

import { HeaderGenerator, HeaderProposal } from '../src/engine/header-generator';
import { HeaderValidator } from '../src/engine/header-validator';
import { CGenerator, GeneratedCode } from '../src/codegen/c-generator';

describe('Week 2: 헤더 검증 + 코드 생성', () => {
  // ========== Task 2.1: 헤더 생성 완성 ==========
  describe('Task 2.1: 헤더 생성 (HeaderGenerator)', () => {
    test('sum 헤더 생성', () => {
      const header = HeaderGenerator.generateHeader('sum', 0.95);

      expect(header).not.toBeNull();
      expect(header?.operation).toBe('sum');
      expect(header?.inputType).toBe('array<number>');
      expect(header?.outputType).toBe('number');
      expect(header?.confidence).toBeGreaterThan(0.5);
      expect(header?.header).toContain('fn sum');
    });

    test('average 헤더 생성', () => {
      const header = HeaderGenerator.generateHeader('average', 0.9);

      expect(header?.operation).toBe('average');
      expect(header?.inputType).toBe('array<number>');
      expect(header?.outputType).toBe('number');
    });

    test('filter 헤더 생성', () => {
      const header = HeaderGenerator.generateHeader('filter', 0.85);

      expect(header?.operation).toBe('filter');
      expect(header?.inputType).toBe('array<T>');
      expect(header?.outputType).toBe('array<T>');
    });

    test('헤더 문자열 포맷이 정확함', () => {
      const header = HeaderGenerator.generateHeader('sum', 0.95);

      expect(header?.header).toMatch(/fn sum:/);
      expect(header?.header).toMatch(/array<number>/);
      expect(header?.header).toContain('directive:');
    });

    test('신뢰도 계산이 정확함', () => {
      const header = HeaderGenerator.generateHeader('sum', 1.0);

      expect(header?.confidence).toBeLessThanOrEqual(1.0);
      expect(header?.confidence).toBeGreaterThan(0.6);
      expect(header?.metadata.typeConfidence).toBe(0.95);
    });

    test('대체 제안 생성 (alternatives)', () => {
      const result = HeaderGenerator.generateHeaderAlternatives(
        'sum',
        ['average', 'max'],
        0.9
      );

      expect(result.primary?.operation).toBe('sum');
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions[0]?.operation).toBe('average');
    });

    test('invalid operation은 null 반환', () => {
      const header = HeaderGenerator.generateHeader('invalid_op', 0.9);
      expect(header).toBeNull();
    });
  });

  // ========== Task 2.2: 헤더 검증 ==========
  describe('Task 2.2: 헤더 검증 (HeaderValidator)', () => {
    test('유효한 헤더 통과', () => {
      const header = HeaderGenerator.generateHeader('sum', 0.95);
      const result = HeaderValidator.validate(header!);

      expect(result.valid).toBe(true);
      expect(result.score).toBeGreaterThan(0.7);
    });

    test('헤더 문자열 파싱 및 검증', () => {
      const headerString = 'fn sum: array<number> → number\n~ "합산"\ndirective: "메모리 효율성 우선"';
      const result = HeaderValidator.validate(headerString);

      expect(result.valid).toBe(true);
    });

    test('구문 오류 감지', () => {
      const result = HeaderValidator.validate('invalid header format');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]?.type).toBe('syntax');
    });

    test('operation 검증', () => {
      const result = HeaderValidator.validate('fn invalid_op: array<number> → number');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === 'intent')).toBe(true);
    });

    test('타입 검증', () => {
      // 유효한 헤더의 타입은 검증 통과
      const validHeader = HeaderGenerator.generateHeader('sum', 0.9)!;
      const validResult = HeaderValidator.validate(validHeader);
      expect(validResult.valid).toBe(true);

      // invalid_type은 경고 수준
      const invalidResult = HeaderValidator.validate('fn sum: invalid_type → number');
      expect(invalidResult.warnings.length + invalidResult.errors.length).toBeGreaterThan(0);
    });

    test('검증 리포트 생성', () => {
      const header = HeaderGenerator.generateHeader('sum', 0.95);
      const result = HeaderValidator.validate(header!);
      const report = HeaderValidator.generateReport(result);

      expect(report).toContain('✅');
      expect(report).toContain('%');
    });

    test('여러 헤더 검증', () => {
      const operations = ['sum', 'average', 'max', 'min', 'filter', 'sort'];

      operations.forEach(op => {
        const header = HeaderGenerator.generateHeader(op, 0.9);
        const result = HeaderValidator.validate(header!);

        expect(result.valid).toBe(true);
      });
    });
  });

  // ========== Task 2.3: C 코드 생성 ==========
  describe('Task 2.3: C 코드 생성 (CGenerator)', () => {
    test('sum 함수 코드 생성', () => {
      const header = HeaderGenerator.generateHeader('sum', 0.95)!;
      const generated = CGenerator.generateCode(header);

      expect(generated.operation).toBe('sum');
      expect(generated.cCode).toContain('double sum');
      expect(generated.cCode).toContain('for');
      expect(generated.includes).toContain('<stddef.h>');
    });

    test('average 함수 코드 생성', () => {
      const header = HeaderGenerator.generateHeader('average', 0.9)!;
      const generated = CGenerator.generateCode(header);

      expect(generated.cCode).toContain('double average');
      expect(generated.cCode).toContain('sum / size');
    });

    test('max 함수 코드 생성', () => {
      const header = HeaderGenerator.generateHeader('max', 0.9)!;
      const generated = CGenerator.generateCode(header);

      expect(generated.cCode).toContain('max_val');
      expect(generated.cCode).toContain('>');
    });

    test('min 함수 코드 생성', () => {
      const header = HeaderGenerator.generateHeader('min', 0.9)!;
      const generated = CGenerator.generateCode(header);

      expect(generated.cCode).toContain('min_val');
      expect(generated.cCode).toContain('<');
    });

    test('filter 함수 코드 생성', () => {
      const header = HeaderGenerator.generateHeader('filter', 0.85)!;
      const generated = CGenerator.generateCode(header);

      expect(generated.cCode).toContain('threshold');
      expect(generated.cCode).toContain('output_size');
    });

    test('sort 함수 코드 생성 (안정성 우선)', () => {
      const header = HeaderGenerator.generateHeader('sort', 0.85)!;
      header.directive = '안정성 우선, 안정 정렬 알고리즘';

      const generated = CGenerator.generateCode(header);

      expect(generated.cCode).toContain('bubble');
      expect(generated.cCode).toContain('sort');
    });

    test('sort 함수 코드 생성 (속도 우선)', () => {
      const header = HeaderGenerator.generateHeader('sort', 0.85)!;
      header.directive = '속도 우선';

      const generated = CGenerator.generateCode(header);

      expect(generated.cCode).toContain('qsort');
      expect(generated.includes).toContain('<stdlib.h>');
    });

    test('메모리 프로필 분석', () => {
      const header = HeaderGenerator.generateHeader('sum', 0.95)!;
      const generated = CGenerator.generateCode(header);

      expect(generated.memoryProfile).toBeDefined();
      expect(generated.memoryProfile.heapUsage).toBe('0 bytes');
      expect(generated.memoryProfile.stackUsage).toBe('O(1)');
    });

    test('코드 포맷팅', () => {
      const header = HeaderGenerator.generateHeader('sum', 0.95)!;
      const generated = CGenerator.generateCode(header);
      const formatted = CGenerator.formatCode(generated);

      expect(formatted).toContain('#include');
      expect(formatted).toContain('double sum');
      expect(formatted).toContain('Memory Profile');
    });

    test('모든 operation 코드 생성 테스트', () => {
      const operations = ['sum', 'average', 'max', 'min', 'filter', 'sort'];

      operations.forEach(op => {
        const header = HeaderGenerator.generateHeader(op, 0.9)!;
        const generated = CGenerator.generateCode(header);

        expect(generated.operation).toBe(op);
        expect(generated.cCode.length).toBeGreaterThan(0);
        expect(generated.cCode).toContain(op);
      });
    });
  });

  // ========== 통합 테스트 ==========
  describe('통합 테스트: 완전한 파이프라인', () => {
    test('의도 → 헤더 생성 → 검증 → 코드 생성 전체 플로우', () => {
      // 1. 헤더 생성
      const header = HeaderGenerator.generateHeader('sum', 0.95);
      expect(header).not.toBeNull();

      // 2. 헤더 검증
      const validation = HeaderValidator.validate(header!);
      expect(validation.valid).toBe(true);

      // 3. C 코드 생성
      const codeGen = CGenerator.generateCode(header!);
      expect(codeGen.cCode).toContain('double sum');

      // 4. 포맷팅
      const formatted = CGenerator.formatCode(codeGen);
      expect(formatted.length).toBeGreaterThan(50);
    });

    test('여러 operation 완전 파이프라인', () => {
      const ops = ['sum', 'average', 'filter'];

      ops.forEach(op => {
        // 1. 헤더 생성
        const header = HeaderGenerator.generateHeader(op, 0.9)!;

        // 2. 검증
        const valid = HeaderValidator.validate(header).valid;
        expect(valid).toBe(true);

        // 3. 코드 생성
        const code = CGenerator.generateCode(header);
        expect(code.cCode).toBeTruthy();
      });
    });

    test('생성된 헤더와 코드의 operation 일치', () => {
      const header = HeaderGenerator.generateHeader('max', 0.9)!;
      const code = CGenerator.generateCode(header);

      expect(header.operation).toBe(code.operation);
      expect(code.cCode).toContain(header.operation);
    });
  });
});
