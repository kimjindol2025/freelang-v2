/**
 * Phase 7.2: Pattern Learning Engine Tests
 *
 * 피드백 기반 패턴 학습 검증
 */

import { PatternUpdater, patternUpdater } from '../src/learning/pattern-updater';
import { AutocompleteItem } from '../src/engine/autocomplete-db';

// Mock pattern for testing
const mockPattern: AutocompleteItem = {
  id: 'sum',
  type: 'function',
  category: 'aggregation',
  pattern: 'fn sum input: array<number> output: number',
  description: '배열 합산',
  examples: ['배열 합산', 'total', 'sum all'],
  signature: 'array<number> -> number',
  confidence: 0.90,
  usage_count: 0,
  approval_rate: 0.90,
  last_used: null,
  created_at: new Date(),
  updated_at: new Date(),
};

describe('Phase 7.2: Pattern Learning Engine', () => {
  // ============================================================================
  // 1️⃣ 패턴 초기화
  // ============================================================================
  describe('패턴 초기화', () => {
    test('패턴 초기화 성공', () => {
      const updater = new PatternUpdater();
      updater.initializePattern(mockPattern);

      const pattern = updater.get('sum');
      expect(pattern).not.toBeNull();
      expect(pattern?.id).toBe('sum');
      expect(pattern?.original.description).toBe('배열 합산');
    });

    test('초기 피드백 카운트 0', () => {
      const updater = new PatternUpdater();
      updater.initializePattern(mockPattern);

      const pattern = updater.get('sum');
      expect(pattern?.feedback.approved).toBe(0);
      expect(pattern?.feedback.rejected).toBe(0);
      expect(pattern?.feedback.modified).toBe(0);
    });

    test('예제가 변형으로 초기화', () => {
      const updater = new PatternUpdater();
      updater.initializePattern(mockPattern);

      const pattern = updater.get('sum');
      expect(pattern?.variations.length).toBe(3);
      expect(pattern?.variations[0].text).toBe('배열 합산');
    });
  });

  // ============================================================================
  // 2️⃣ 승인 피드백
  // ============================================================================
  describe('승인 피드백', () => {
    test('승인 카운트 증가', () => {
      const updater = new PatternUpdater();
      updater.initializePattern(mockPattern);

      updater.recordApproval('sum');
      const pattern = updater.get('sum');
      expect(pattern?.feedback.approved).toBe(1);
    });

    test('신뢰도 증가 (+2%)', () => {
      const updater = new PatternUpdater();
      updater.initializePattern(mockPattern);

      const before = updater.get('sum')!.original.confidence;
      updater.recordApproval('sum');
      const after = updater.get('sum')!.original.confidence;

      expect(after).toBeCloseTo(before * 1.02, 2);
    });

    test('신뢰도 최대값 0.98', () => {
      const updater = new PatternUpdater();
      const pattern = { ...mockPattern, confidence: 0.97 };
      updater.initializePattern(pattern);

      // 여러 번 승인
      for (let i = 0; i < 10; i++) {
        updater.recordApproval('sum');
      }

      expect(updater.get('sum')!.original.confidence).toBeLessThanOrEqual(0.98);
    });

    test('새로운 변형 추가', () => {
      const updater = new PatternUpdater();
      updater.initializePattern(mockPattern);

      updater.recordApproval('sum', '전체 합산');
      const pattern = updater.get('sum');
      expect(pattern?.variations.some(v => v.text === '전체 합산')).toBe(true);
    });

    test('상호작용 카운트 증가', () => {
      const updater = new PatternUpdater();
      updater.initializePattern(mockPattern);

      updater.recordApproval('sum');
      expect(updater.get('sum')?.total_interactions).toBe(1);
    });
  });

  // ============================================================================
  // 3️⃣ 거부 피드백
  // ============================================================================
  describe('거부 피드백', () => {
    test('거부 카운트 증가', () => {
      const updater = new PatternUpdater();
      updater.initializePattern(mockPattern);

      updater.recordRejection('sum');
      const pattern = updater.get('sum');
      expect(pattern?.feedback.rejected).toBe(1);
    });

    test('신뢰도 감소 (-5%)', () => {
      const updater = new PatternUpdater();
      updater.initializePattern(mockPattern);

      const before = updater.get('sum')!.original.confidence;
      updater.recordRejection('sum');
      const after = updater.get('sum')!.original.confidence;

      expect(after).toBeCloseTo(before * 0.95, 2);
    });

    test('신뢰도 최소값 0.50', () => {
      const updater = new PatternUpdater();
      const pattern = { ...mockPattern, confidence: 0.52 };
      updater.initializePattern(pattern);

      // 여러 번 거부
      for (let i = 0; i < 10; i++) {
        updater.recordRejection('sum');
      }

      expect(updater.get('sum')!.original.confidence).toBeGreaterThanOrEqual(0.50);
    });
  });

  // ============================================================================
  // 4️⃣ 수정 피드백
  // ============================================================================
  describe('수정 피드백', () => {
    test('수정 카운트 증가', () => {
      const updater = new PatternUpdater();
      updater.initializePattern(mockPattern);

      updater.recordModification('sum', {
        description: '배열 모두 더하기',
      });

      expect(updater.get('sum')?.feedback.modified).toBe(1);
    });

    test('설명 업데이트', () => {
      const updater = new PatternUpdater();
      updater.initializePattern(mockPattern);

      updater.recordModification('sum', {
        description: '배열 모두 더하기',
      });

      expect(updater.get('sum')!.original.description).toBe('배열 모두 더하기');
    });

    test('신뢰도 감소 (-2%)', () => {
      const updater = new PatternUpdater();
      updater.initializePattern(mockPattern);

      const before = updater.get('sum')!.original.confidence;
      updater.recordModification('sum', {});
      const after = updater.get('sum')!.original.confidence;

      expect(after).toBeCloseTo(before * 0.98, 2);
    });

    test('새로운 예제 추가', () => {
      const updater = new PatternUpdater();
      updater.initializePattern(mockPattern);

      updater.recordModification('sum', {
        examples: ['새로운 예제'],
      });

      expect(updater.get('sum')?.variations.some(v => v.text === '새로운 예제')).toBe(true);
    });
  });

  // ============================================================================
  // 5️⃣ 통계 계산
  // ============================================================================
  describe('통계 계산', () => {
    test('기본 통계', () => {
      const updater = new PatternUpdater();
      updater.initializePattern(mockPattern);

      updater.recordApproval('sum');
      updater.recordApproval('sum');
      updater.recordRejection('sum');

      const stats = updater.getStats('sum');
      expect(stats?.approved).toBe(2);
      expect(stats?.rejected).toBe(1);
      expect(stats?.total_interactions).toBe(3);
    });

    test('승인율 계산', () => {
      const updater = new PatternUpdater();
      updater.initializePattern(mockPattern);

      updater.recordApproval('sum');
      updater.recordApproval('sum');
      updater.recordRejection('sum');

      const stats = updater.getStats('sum');
      expect(stats?.approval_rate).toBeCloseTo(2 / 3, 2);
    });

    test('모든 패턴 통계', () => {
      const updater = new PatternUpdater();
      updater.initializePattern(mockPattern);
      const pattern2 = { ...mockPattern, id: 'filter' };
      updater.initializePattern(pattern2);

      updater.recordApproval('sum');
      updater.recordApproval('filter');
      updater.recordApproval('filter');

      const stats = updater.getAllStats();
      expect(stats.length).toBe(2);
      expect(stats[0].id).toBe('filter'); // 상호작용 수로 정렬
    });
  });

  // ============================================================================
  // 6️⃣ 학습 점수
  // ============================================================================
  describe('학습 점수', () => {
    test('점수 계산 (승인율 + 신뢰도) / 2', () => {
      const updater = new PatternUpdater();
      updater.initializePattern(mockPattern);

      updater.recordApproval('sum');
      updater.recordApproval('sum');
      updater.recordRejection('sum');

      const score = updater.getLearningScore('sum');
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    test('높은 승인율 = 높은 점수', () => {
      const updater = new PatternUpdater();
      updater.initializePattern(mockPattern);

      // 10번 모두 승인
      for (let i = 0; i < 10; i++) {
        updater.recordApproval('sum');
      }

      const score = updater.getLearningScore('sum');
      expect(score).toBeGreaterThan(0.9);
    });
  });

  // ============================================================================
  // 7️⃣ 개선 필요 패턴
  // ============================================================================
  describe('개선 필요 패턴', () => {
    test('승인율 < 70% 검출', () => {
      const updater = new PatternUpdater();
      updater.initializePattern(mockPattern);
      const pattern2 = { ...mockPattern, id: 'filter' };
      updater.initializePattern(pattern2);

      // sum: 2 승인, 8 거부 (20% 승인율)
      for (let i = 0; i < 2; i++) updater.recordApproval('sum');
      for (let i = 0; i < 8; i++) updater.recordRejection('sum');

      // filter: 9 승인, 1 거부 (90% 승인율)
      for (let i = 0; i < 9; i++) updater.recordApproval('filter');
      updater.recordRejection('filter');

      const needsImprovement = updater.getNeedsImprovement(0.7);
      expect(needsImprovement.length).toBe(1);
      expect(needsImprovement[0].id).toBe('sum');
    });
  });

  // ============================================================================
  // 8️⃣ 신뢰도 추이
  // ============================================================================
  describe('신뢰도 추이', () => {
    test('추이 데이터 생성', () => {
      const updater = new PatternUpdater();
      updater.initializePattern(mockPattern);

      updater.recordApproval('sum');
      updater.recordApproval('sum');
      updater.recordRejection('sum');

      const trend = updater.getTrend('sum', 7);
      expect(trend).not.toBeNull();
      expect(trend!.length).toBeGreaterThan(0);
    });

    test('일일 평균 계산', () => {
      const updater = new PatternUpdater();
      updater.initializePattern(mockPattern);

      for (let i = 0; i < 3; i++) {
        updater.recordApproval('sum');
      }

      const trend = updater.getTrend('sum', 7);
      expect(trend![0].interactions).toBe(3);
    });
  });

  // ============================================================================
  // 9️⃣ 변형 분석
  // ============================================================================
  describe('변형 분석', () => {
    test('인기 변형 조회', () => {
      const updater = new PatternUpdater();
      updater.initializePattern(mockPattern);

      updater.recordApproval('sum', '전체 합산');
      updater.recordApproval('sum', '전체 합산');
      updater.recordApproval('sum', '합산');

      const popular = updater.getPopularVariations('sum', 2);
      expect(popular.length).toBe(2);
      expect(popular[0].text).toBe('전체 합산');
      expect(popular[0].count).toBe(2);
    });
  });

  // ============================================================================
  // 🔟 싱글톤
  // ============================================================================
  describe('싱글톤', () => {
    test('전역 인스턴스 사용 가능', () => {
      patternUpdater.initializePattern(mockPattern);
      const pattern = patternUpdater.get('sum');
      expect(pattern).not.toBeNull();
    });
  });
});
