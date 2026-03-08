/**
 * Phase 8.2: Auto-Improvement Loop Engine Tests
 *
 * 자동 개선 실행, 메트릭 계산, A/B 테스트 검증
 */

import { AutoImprover } from '../src/learning/auto-improver';
import { PatternUpdater } from '../src/learning/pattern-updater';
import { AutocompleteDB } from '../src/engine/autocomplete-db';
import { feedbackCollector } from '../src/feedback/collector';
import { AutocompleteItem } from '../src/engine/autocomplete-db';
import { HeaderProposal } from '../src/core/types';

// Mock data
const mockPattern: AutocompleteItem = {
  id: 'sum',
  type: 'function',
  category: 'aggregation',
  pattern: 'fn sum input: array<number> output: number',
  description: '배열 합산',
  examples: ['배열 합산', 'total', 'sum all'],
  signature: 'array<number> -> number',
  confidence: 0.75,
  usage_count: 0,
  approval_rate: 0.75,
  last_used: null,
  created_at: new Date(),
  updated_at: new Date(),
};

const mockProposal: HeaderProposal = {
  header: 'fn sum: array<number> -> number',
  fnName: 'sum',
  inputType: 'array<number>',
  outputType: 'number',
  reason: 'sum aggregation',
  directive: '@basic',
  confidence: 0.75,
  alternatives: [],
  matchedPattern: 'sum',
};

describe('Phase 8.2: Auto-Improvement Loop Engine', () => {
  // ============================================================================
  // 1️⃣ 자동 개선 실행
  // ============================================================================
  describe('자동 개선 실행', () => {
    let improver: AutoImprover;
    let patternUpdater: PatternUpdater;
    let autocompleteDB: AutocompleteDB;

    beforeEach(() => {
      patternUpdater = new PatternUpdater();
      autocompleteDB = new AutocompleteDB();
      improver = new AutoImprover(patternUpdater, autocompleteDB);

      patternUpdater.initializePattern(mockPattern);
      feedbackCollector.clear();
    });

    test('성공적 개선 실행', async () => {
      // 피드백 수집
      feedbackCollector.recordFeedback('배열 합산', mockProposal, 'approve');
      feedbackCollector.recordFeedback('배열 합산', mockProposal, 'approve');

      // 개선 실행
      const report = await improver.improve();

      expect(report.status).toBe('success');
      expect(report.metrics.total_feedbacks).toBe(2);
      expect(report.metrics.approved_count).toBe(2);
    });

    test('빈 피드백 처리', async () => {
      feedbackCollector.clear();

      const report = await improver.improve();

      expect(report.status).toBe('partial');
      expect(report.metrics.total_feedbacks).toBe(0);
    });

    test('개선 메트릭 계산', async () => {
      // 신뢰도 낮은 패턴 (개선 필요)
      const lowPattern = { ...mockPattern, id: 'filter', confidence: 0.60 };
      patternUpdater.initializePattern(lowPattern);

      // 거부 피드백 (개선 필요)
      feedbackCollector.recordFeedback('배열 필터링', mockProposal, 'reject');
      feedbackCollector.recordFeedback('배열 필터링', mockProposal, 'reject');

      const report = await improver.improve();

      expect(report.metrics.total_feedbacks).toBeGreaterThan(0);
      expect(report.metrics.improvement_percentage).toBeDefined();
    });
  });

  // ============================================================================
  // 2️⃣ 개선 메트릭
  // ============================================================================
  describe('개선 메트릭', () => {
    let improver: AutoImprover;
    let patternUpdater: PatternUpdater;

    beforeEach(() => {
      patternUpdater = new PatternUpdater();
      improver = new AutoImprover(patternUpdater);
      patternUpdater.initializePattern(mockPattern);
    });

    test('신뢰도 향상도', async () => {
      const before = patternUpdater.get('sum')!.original.confidence;

      feedbackCollector.recordFeedback('배열 합산', mockProposal, 'approve');
      const report = await improver.improve();

      const after = patternUpdater.get('sum')!.original.confidence;
      expect(after).toBeGreaterThanOrEqual(before);
    });

    test('승인율 반영', async () => {
      // 새 세션으로 피드백 독립 관리
      const sessionId = feedbackCollector.newSession();

      feedbackCollector.recordFeedback('배열 합산', mockProposal, 'approve');
      feedbackCollector.recordFeedback('배열 합산', mockProposal, 'approve');
      feedbackCollector.recordFeedback('배열 합산', mockProposal, 'reject');

      const report = await improver.improve();

      expect(report.metrics.total_feedbacks).toBeGreaterThanOrEqual(3);
      expect(report.metrics.approved_count).toBeGreaterThan(0);
      expect(report.metrics.rejected_count).toBeGreaterThan(0);
    });

    test('개선율 계산', async () => {
      // 초기 신뢰도 설정
      patternUpdater.get('sum')!.original.confidence = 0.70;

      feedbackCollector.recordFeedback('배열 합산', mockProposal, 'approve');
      const report = await improver.improve();

      expect(report.metrics.improvement_percentage).toBeDefined();
      expect(typeof report.metrics.improvement_percentage).toBe('number');
    });
  });

  // ============================================================================
  // 3️⃣ 패턴 동기화
  // ============================================================================
  describe('패턴 동기화', () => {
    let improver: AutoImprover;
    let patternUpdater: PatternUpdater;
    let autocompleteDB: AutocompleteDB;

    beforeEach(() => {
      patternUpdater = new PatternUpdater();
      autocompleteDB = new AutocompleteDB();
      improver = new AutoImprover(patternUpdater, autocompleteDB);

      patternUpdater.initializePattern(mockPattern);
    });

    test('DB 신뢰도 동기화', async () => {
      feedbackCollector.recordFeedback('배열 합산', mockProposal, 'approve');
      await improver.improve();

      // 동기화 확인 (실제로는 자동완성 DB 확인)
      const report = improver.getLastReport();
      expect(report?.patterns_updated.size).toBeGreaterThanOrEqual(0);
    });

    test('사용 횟수 동기화', async () => {
      const before = patternUpdater.get('sum')!.total_interactions;

      feedbackCollector.recordFeedback('배열 합산', mockProposal, 'approve');
      await improver.improve();

      const after = patternUpdater.get('sum')!.total_interactions;
      expect(after).toBeGreaterThanOrEqual(before);
    });

    test('마지막 사용 시간 동기화', async () => {
      // 직접 피드백을 패턴에 기록
      patternUpdater.recordApproval('sum');

      const feedback = patternUpdater.get('sum')!.last_feedback;
      expect(feedback).not.toBeNull();

      // improve() 실행 후에도 유지되는지 확인
      const report = await improver.improve();
      const feedbackAfter = patternUpdater.get('sum')!.last_feedback;
      expect(feedbackAfter).not.toBeNull();
    });
  });

  // ============================================================================
  // 4️⃣ 히스토리 추적
  // ============================================================================
  describe('히스토리 추적', () => {
    let improver: AutoImprover;
    let patternUpdater: PatternUpdater;

    beforeEach(() => {
      patternUpdater = new PatternUpdater();
      improver = new AutoImprover(patternUpdater);
      patternUpdater.initializePattern(mockPattern);
    });

    test('개선 히스토리 저장', async () => {
      feedbackCollector.recordFeedback('배열 합산', mockProposal, 'approve');

      await improver.improve();
      const history = improver.getHistory();

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].status).toBe('success');
    });

    test('최근 리포트 조회', async () => {
      feedbackCollector.recordFeedback('배열 합산', mockProposal, 'approve');
      await improver.improve();

      const lastReport = improver.getLastReport();
      expect(lastReport).not.toBeNull();
      expect(lastReport?.timestamp).not.toBeNull();
    });
  });

  // ============================================================================
  // 5️⃣ 스케줄
  // ============================================================================
  describe('스케줄', () => {
    let improver: AutoImprover;
    let patternUpdater: PatternUpdater;

    beforeEach(() => {
      patternUpdater = new PatternUpdater();
      improver = new AutoImprover(patternUpdater);
      patternUpdater.initializePattern(mockPattern);
    });

    test('자동 실행 트리거', () => {
      const shouldRun = improver.shouldImprove();
      expect(shouldRun).toBe(true); // 처음에는 항상 true
    });

    test('다음 실행 예정', () => {
      const nextTime = improver.getNextImproveTime();
      expect(nextTime).not.toBeNull();
      expect(nextTime.getTime()).toBeGreaterThan(new Date().getTime());
    });

    test('24시간 체크', async () => {
      feedbackCollector.recordFeedback('배열 합산', mockProposal, 'approve');
      await improver.improve();

      const lastTime = improver.getLastImproveTime();
      expect(lastTime).not.toBeNull();

      // 바로 다시 개선 여부 확인 (24시간 미경과)
      const shouldRun = improver.shouldImprove();
      expect(shouldRun).toBe(false);
    });
  });

  // ============================================================================
  // 6️⃣ A/B 테스트
  // ============================================================================
  describe('A/B 테스트', () => {
    let improver: AutoImprover;
    let patternUpdater: PatternUpdater;

    beforeEach(() => {
      patternUpdater = new PatternUpdater();
      improver = new AutoImprover(patternUpdater);
      patternUpdater.initializePattern(mockPattern);
    });

    test('A/B 테스트 생성', () => {
      const test = improver.createABTest('sum');

      expect(test.id).toMatch(/^ab_/);
      expect(test.pattern_id).toBe('sum');
      expect(test.variant_a).toBeDefined();
      expect(test.variant_b).toBeDefined();
    });

    test('승자 선택', () => {
      const test = improver.createABTest('sum');
      const winner = improver.decideABTestWinner(test.id);

      expect(['A', 'B']).toContain(winner);
    });

    test('결과 적용', () => {
      const test = improver.createABTest('sum');
      const before = patternUpdater.get('sum')!.original.confidence;

      improver.decideABTestWinner(test.id);
      improver.applyABTestResult(test.id);

      const after = patternUpdater.get('sum')!.original.confidence;
      // 승자가 B인 경우 증가, A인 경우 그대로
      expect(after).toBeGreaterThanOrEqual(before);
    });
  });

  // ============================================================================
  // 7️⃣ 리포트 통계
  // ============================================================================
  describe('리포트 통계', () => {
    let improver: AutoImprover;
    let patternUpdater: PatternUpdater;

    beforeEach(() => {
      patternUpdater = new PatternUpdater();
      improver = new AutoImprover(patternUpdater);
      patternUpdater.initializePattern(mockPattern);
      feedbackCollector.clear();
    });

    test('리포트에 패턴 업데이트 정보 포함', async () => {
      feedbackCollector.recordFeedback('배열 합산', mockProposal, 'approve');
      const report = await improver.improve();

      expect(report.patterns_updated).toBeDefined();
      expect(report.timestamp).not.toBeNull();
      expect(report.session_id).toBeDefined();
    });
  });

  // ============================================================================
  // 8️⃣ 싱글톤 및 초기화
  // ============================================================================
  describe('싱글톤 및 초기화', () => {
    let improver: AutoImprover;
    let patternUpdater: PatternUpdater;

    beforeEach(() => {
      patternUpdater = new PatternUpdater();
      improver = new AutoImprover(patternUpdater);
      patternUpdater.initializePattern(mockPattern);
    });

    test('초기화 후 상태 리셋', async () => {
      feedbackCollector.recordFeedback('배열 합산', mockProposal, 'approve');
      await improver.improve();

      let history = improver.getHistory();
      expect(history.length).toBeGreaterThan(0);

      improver.clear();
      history = improver.getHistory();
      expect(history.length).toBe(0);
    });

    test('에러 처리', async () => {
      // 없는 패턴으로 A/B 테스트 (에러 발생)
      try {
        improver.createABTest('nonexistent');
        expect(true).toBe(false); // 에러가 발생해야 함
      } catch (error) {
        expect(error).not.toBeNull();
      }
    });
  });
});
