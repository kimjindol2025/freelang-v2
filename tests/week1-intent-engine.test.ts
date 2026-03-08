/**
 * FreeLang Week 1 테스트
 * Task 1.1-1.3: 의도 패턴 DB, 텍스트 정규화, 의도 매칭
 */

import { TextNormalizer } from '../src/engine/text-normalizer';
import { IntentMatcher } from '../src/engine/intent-matcher';
import { INTENT_PATTERNS, PATTERN_COUNT } from '../src/engine/intent-patterns';

describe('Week 1: 자동 헤더 생성 엔진 기반', () => {
  // ========== Task 1.1: 의도 패턴 DB ==========
  describe('Task 1.1: 의도 패턴 DB', () => {
    test('6개의 기본 패턴이 정의되어야 함', () => {
      expect(PATTERN_COUNT).toBe(6);
    });

    test('각 패턴이 필수 필드를 가져야 함', () => {
      Object.values(INTENT_PATTERNS).forEach(pattern => {
        expect(pattern.id).toBeDefined();
        expect(pattern.keywords).toBeDefined();
        expect(pattern.inputType).toBeDefined();
        expect(pattern.outputType).toBeDefined();
        expect(pattern.defaultReason).toBeDefined();
        expect(pattern.defaultDirective).toBeDefined();
        expect(pattern.priority).toBeDefined();
      });
    });

    test('sum 패턴이 올바르게 정의되어야 함', () => {
      const sumPattern = INTENT_PATTERNS.sum;
      expect(sumPattern.keywords).toContain('합산');
      expect(sumPattern.keywords).toContain('sum');
      expect(sumPattern.inputType).toBe('array<number>');
      expect(sumPattern.outputType).toBe('number');
      expect(sumPattern.priority).toBe(1);
    });

    test('모든 패턴의 우선순위가 1이어야 함', () => {
      Object.values(INTENT_PATTERNS).forEach(pattern => {
        expect(pattern.priority).toBe(1);
      });
    });
  });

  // ========== Task 1.2: 텍스트 정규화 ==========
  describe('Task 1.2: 텍스트 정규화 (TextNormalizer)', () => {
    test('공백 정리: 앞뒤 공백 제거', () => {
      const result = TextNormalizer.normalize('  배열  더하기  ');
      expect(result).toEqual(['배열', '더하기']);
    });

    test('공백 정리: 중복 공백 제거', () => {
      const result = TextNormalizer.normalize('배열   더하기');
      expect(result).toEqual(['배열', '더하기']);
    });

    test('특수문자 제거', () => {
      const result = TextNormalizer.normalize('배열 더하기! @#$');
      expect(result).toEqual(['배열', '더하기']);
    });

    test('수식 입력 처리', () => {
      const result = TextNormalizer.normalize('sum([1,2,3])');
      expect(result).toContain('sum');
      expect(result).not.toContain('(');
      expect(result).not.toContain('[');
    });

    test('영문 소문자로 통일', () => {
      const result = TextNormalizer.normalize('SUM Average MAX');
      expect(result).toEqual(['sum', 'average', 'max']);
    });

    test('순수 숫자 토큰 제거', () => {
      const result = TextNormalizer.normalize('배열 123 더하기 456');
      expect(result).toEqual(['배열', '더하기']);
      expect(result).not.toContain('123');
      expect(result).not.toContain('456');
    });

    test('한글 1글자 조사 처리', () => {
      const result = TextNormalizer.normalize('배열을 더하기는');
      // "배"는 중요한 1글자 (배열), "더"는 2글자 이상
      expect(result).toContain('더하기');
    });

    test('빈 입력 처리', () => {
      expect(TextNormalizer.normalize('')).toEqual([]);
      expect(TextNormalizer.normalize('   ')).toEqual([]);
      expect(TextNormalizer.normalize(null as any)).toEqual([]);
    });

    test('유사도 계산: 정확한 일치', () => {
      const sim = TextNormalizer.similarity('sum', 'sum');
      expect(sim).toBe(1);
    });

    test('유사도 계산: 부분 일치', () => {
      const sim = TextNormalizer.similarity('sum', 'summ');
      expect(sim).toBeGreaterThan(0.7);
      expect(sim).toBeLessThan(1);
    });

    test('정확 매칭 카운트', () => {
      const tokens = ['배열', '더하기'];
      const keywords = ['합산', '더하기', 'sum'];
      const matches = TextNormalizer.countMatches(tokens, keywords);
      expect(matches).toBe(1); // "더하기" 하나만 매칭
    });
  });

  // ========== Task 1.3: 의도 매칭 ==========
  describe('Task 1.3: 의도 매칭 (IntentMatcher)', () => {
    test('명확한 의도 인식: sum', () => {
      const tokens = TextNormalizer.normalize('배열의 합산');
      const result = IntentMatcher.matchIntent(tokens);

      expect(result).not.toBeNull();
      expect(result?.operation).toBe('sum');
      expect(result?.confidence).toBeGreaterThan(0.5);
    });

    test('명확한 의도 인식: average', () => {
      const tokens = TextNormalizer.normalize('평균 계산');
      const result = IntentMatcher.matchIntent(tokens);

      expect(result).not.toBeNull();
      expect(result?.operation).toBe('average');
    });

    test('명확한 의도 인식: max', () => {
      const tokens = TextNormalizer.normalize('최댓값 찾기');
      const result = IntentMatcher.matchIntent(tokens);

      expect(result).not.toBeNull();
      expect(result?.operation).toBe('max');
    });

    test('명확한 의도 인식: min', () => {
      const tokens = TextNormalizer.normalize('최소값 구하기');
      const result = IntentMatcher.matchIntent(tokens);

      expect(result).not.toBeNull();
      expect(result?.operation).toBe('min');
    });

    test('명확한 의도 인식: filter', () => {
      const tokens = TextNormalizer.normalize('조건에 맞는 항목 필터');
      const result = IntentMatcher.matchIntent(tokens);

      expect(result).not.toBeNull();
      expect(result?.operation).toBe('filter');
    });

    test('명확한 의도 인식: sort', () => {
      const tokens = TextNormalizer.normalize('크기 순서대로 정렬');
      const result = IntentMatcher.matchIntent(tokens);

      expect(result).not.toBeNull();
      expect(result?.operation).toBe('sort');
    });

    test('영문 입력도 인식', () => {
      const tokens = TextNormalizer.normalize('sum array');
      const result = IntentMatcher.matchIntent(tokens);

      expect(result).not.toBeNull();
      expect(result?.operation).toBe('sum');
    });

    test('신뢰도 점수 계산', () => {
      const tokens = TextNormalizer.normalize('배열 더하기');
      const result = IntentMatcher.matchIntent(tokens);

      expect(result?.confidence).toBeGreaterThan(0);
      expect(result?.confidence).toBeLessThanOrEqual(1);
    });

    test('Alternative 제안 (낮은 신뢰도 패턴들)', () => {
      const tokens = TextNormalizer.normalize('배열 더하기 평균');
      const result = IntentMatcher.matchIntent(tokens);

      // 결과가 있으면 alternatives는 배열이어야 함
      if (result) {
        expect(Array.isArray(result.alternatives)).toBe(true);
      }
    });

    test('너무 약한 신뢰도는 null 반환', () => {
      const tokens = TextNormalizer.normalize('zzzzz');
      const result = IntentMatcher.matchIntent(tokens);

      expect(result).toBeNull();
    });

    test('빈 입력은 null 반환', () => {
      const result = IntentMatcher.matchIntent([]);
      expect(result).toBeNull();
    });

    test('getOperation() 편의 함수', () => {
      const tokens = TextNormalizer.normalize('배열 더하기');
      const operation = IntentMatcher.getOperation(tokens);

      expect(operation).toBe('sum');
    });

    test('getConfidence() 편의 함수', () => {
      const tokens = TextNormalizer.normalize('배열 더하기');
      const confidence = IntentMatcher.getConfidence(tokens);

      expect(confidence).toBeGreaterThan(0.5);
    });

    test('세부 점수 계산 (details)', () => {
      const tokens = TextNormalizer.normalize('배열 더하기');
      const result = IntentMatcher.matchIntent(tokens);

      expect(result?.details).toBeDefined();
      expect(result?.details.exactMatches).toBeGreaterThanOrEqual(0);
      expect(result?.details.typeScore).toBeGreaterThanOrEqual(0);
      expect(result?.details.clarityScore).toBeGreaterThanOrEqual(0);
      expect(result?.details.similarityScore).toBeGreaterThanOrEqual(0);
    });
  });

  // ========== 통합 테스트 ==========
  describe('통합 테스트: 자동 헤더 생성 파이프라인', () => {
    test('입력 → 정규화 → 의도 매칭 전체 플로우', () => {
      const userInput = 'sum array';
      const tokens = TextNormalizer.normalize(userInput);
      const match = IntentMatcher.matchIntent(tokens);

      expect(tokens.length).toBeGreaterThan(0);
      expect(match).not.toBeNull();
      expect(match?.operation).toBe('sum');
      expect(match?.confidence).toBeGreaterThan(0.3);
    });

    test('여러 입력 테스트', () => {
      const testCases = [
        { input: '배열 합산', expected: 'sum' },
        { input: '평균값 계산', expected: 'average' },
        { input: '최댓값 찾기', expected: 'max' },
        { input: '정렬', expected: 'sort' },
      ];

      testCases.forEach(({ input, expected }) => {
        const tokens = TextNormalizer.normalize(input);
        const result = IntentMatcher.matchIntent(tokens);
        expect(result?.operation).toBe(expected);
      });
    });
  });
});
