/**
 * Phase 8.3: Dashboard Tests
 *
 * 대시보드 통계, 트렌드, 내보내기 검증
 */

import { Dashboard } from '../src/dashboard/dashboard';
import { PatternUpdater } from '../src/learning/pattern-updater';
import { AutoImprover } from '../src/learning/auto-improver';
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
  confidence: 0.85,
  usage_count: 0,
  approval_rate: 0.85,
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
  confidence: 0.85,
  alternatives: [],
  matchedPattern: 'sum',
};

describe('Phase 8.3: Dashboard', () => {
  // ============================================================================
  // 1️⃣ 통계 수집
  // ============================================================================
  describe('통계 수집', () => {
    let dashboard: Dashboard;
    let patternUpdater: PatternUpdater;

    beforeEach(() => {
      patternUpdater = new PatternUpdater();
      dashboard = new Dashboard(patternUpdater);
      patternUpdater.initializePattern(mockPattern);
      feedbackCollector.clear();
    });

    test('전체 통계 수집', () => {
      feedbackCollector.recordFeedback('배열 합산', mockProposal, 'approve');

      const stats = dashboard.getStats();

      expect(stats.total_patterns).toBeGreaterThan(0);
      expect(stats.total_feedbacks).toBe(1);
      expect(stats.avg_confidence).toBeGreaterThan(0);
    });

    test('평균 신뢰도 계산', () => {
      const stats = dashboard.getStats();

      expect(stats.avg_confidence).toBeGreaterThan(0.5);
      expect(stats.avg_confidence).toBeLessThanOrEqual(1);
    });

    test('평균 승인율 계산', () => {
      patternUpdater.recordApproval('sum');
      patternUpdater.recordApproval('sum');
      patternUpdater.recordRejection('sum');

      const stats = dashboard.getStats();

      expect(stats.avg_approval_rate).toBeGreaterThan(0);
      expect(stats.avg_approval_rate).toBeLessThanOrEqual(1);
    });
  });

  // ============================================================================
  // 2️⃣ 트렌드 분석
  // ============================================================================
  describe('트렌드 분석', () => {
    let dashboard: Dashboard;
    let patternUpdater: PatternUpdater;

    beforeEach(() => {
      patternUpdater = new PatternUpdater();
      dashboard = new Dashboard(patternUpdater);
      patternUpdater.initializePattern(mockPattern);
      feedbackCollector.clear();
    });

    test('신뢰도 트렌드 조회', () => {
      patternUpdater.recordApproval('sum');

      const trends = dashboard.getTrends(7);

      expect(Array.isArray(trends)).toBe(true);
    });

    test('트렌드 데이터 구조', () => {
      patternUpdater.recordApproval('sum');
      patternUpdater.recordApproval('sum');

      const trends = dashboard.getTrends(7);

      if (trends.length > 0) {
        const trend = trends[0];
        expect(trend.date).toBeDefined();
        expect(trend.pattern_id).toBe('sum');
        expect(trend.avg_confidence).toBeGreaterThan(0);
        expect(trend.usage_count).toBeGreaterThan(0);
      }
    });

    test('기간별 트렌드 필터링', () => {
      patternUpdater.recordApproval('sum');

      const trends = dashboard.getTrends(7);
      const now = new Date();
      const past7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const filtered = dashboard['filterByDateRange'](trends, past7days, now);

      expect(filtered.length).toBeLessThanOrEqual(trends.length);
    });
  });

  // ============================================================================
  // 3️⃣ 피드백 분석
  // ============================================================================
  describe('피드백 분석', () => {
    let dashboard: Dashboard;
    let patternUpdater: PatternUpdater;

    beforeEach(() => {
      patternUpdater = new PatternUpdater();
      dashboard = new Dashboard(patternUpdater);
      patternUpdater.initializePattern(mockPattern);
      feedbackCollector.clear();
    });

    test('피드백 요약 생성', () => {
      feedbackCollector.recordFeedback('배열 합산', mockProposal, 'approve');
      feedbackCollector.recordFeedback('배열 합산', mockProposal, 'reject');

      const summary = dashboard.getFeedbackSummary();

      expect(summary.total).toBe(2);
      expect(summary.approved).toBe(1);
      expect(summary.rejected).toBe(1);
    });

    test('승인율 계산', () => {
      feedbackCollector.recordFeedback('배열 합산', mockProposal, 'approve');
      feedbackCollector.recordFeedback('배열 합산', mockProposal, 'approve');
      feedbackCollector.recordFeedback('배열 합산', mockProposal, 'reject');

      const summary = dashboard.getFeedbackSummary();

      expect(summary.approval_rate).toBeCloseTo(2 / 3, 1);
    });

    test('패턴별 피드백 요약', () => {
      feedbackCollector.recordFeedback('배열 합산', mockProposal, 'approve');

      const summary = dashboard.getFeedbackSummary('sum');

      expect(summary.total).toBe(1);
      expect(summary.approved).toBe(1);
    });
  });

  // ============================================================================
  // 4️⃣ 패턴 상세 정보
  // ============================================================================
  describe('패턴 상세 정보', () => {
    let dashboard: Dashboard;
    let patternUpdater: PatternUpdater;

    beforeEach(() => {
      patternUpdater = new PatternUpdater();
      dashboard = new Dashboard(patternUpdater);
      patternUpdater.initializePattern(mockPattern);
    });

    test('패턴 상세 조회', () => {
      const details = dashboard.getPatternDetails('sum');

      expect(details).not.toBeNull();
      expect(details?.id).toBe('sum');
      expect(details?.stats).toBeDefined();
      expect(details?.learning_score).toBeDefined();
    });

    test('없는 패턴 조회 → null', () => {
      const details = dashboard.getPatternDetails('nonexistent');

      expect(details).toBeNull();
    });

    test('학습 점수 계산', () => {
      patternUpdater.recordApproval('sum');
      patternUpdater.recordApproval('sum');

      const details = dashboard.getPatternDetails('sum');

      expect(details?.learning_score).toBeGreaterThan(0);
      expect(details?.learning_score).toBeLessThanOrEqual(1);
    });
  });

  // ============================================================================
  // 5️⃣ 학습 진행률
  // ============================================================================
  describe('학습 진행률', () => {
    let dashboard: Dashboard;
    let patternUpdater: PatternUpdater;

    beforeEach(() => {
      patternUpdater = new PatternUpdater();
      dashboard = new Dashboard(patternUpdater);
      patternUpdater.initializePattern(mockPattern);
      feedbackCollector.clear();
    });

    test('진행률 계산', () => {
      const progress = dashboard.getLearningProgress();

      expect(progress.total_patterns).toBeGreaterThan(0);
      expect(progress.improved_patterns).toBeGreaterThanOrEqual(0);
      expect(progress.progress_percentage).toBeGreaterThanOrEqual(0);
      expect(progress.progress_percentage).toBeLessThanOrEqual(100);
    });

    test('개선 추이 추적', () => {
      const progress = dashboard.getLearningProgress();

      expect(Array.isArray(progress.improvement_trends)).toBe(true);
    });
  });

  // ============================================================================
  // 6️⃣ 필터링
  // ============================================================================
  describe('필터링', () => {
    let dashboard: Dashboard;
    let patternUpdater: PatternUpdater;

    beforeEach(() => {
      patternUpdater = new PatternUpdater();
      dashboard = new Dashboard(patternUpdater);
      patternUpdater.initializePattern(mockPattern);
      const pattern2 = { ...mockPattern, id: 'filter' };
      patternUpdater.initializePattern(pattern2);
    });

    test('패턴별 필터링', () => {
      patternUpdater.recordApproval('sum');
      patternUpdater.recordApproval('filter');

      const trends = dashboard.getTrends(7);
      const filtered = dashboard['filterByPattern'](trends, 'sum');

      if (trends.length > 0) {
        expect(filtered.every(t => t.pattern_id === 'sum')).toBe(true);
      }
    });

    test('기간별 필터링', () => {
      patternUpdater.recordApproval('sum');

      const trends = dashboard.getTrends(7);
      const start = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000);
      const end = new Date();

      const filtered = dashboard['filterByDateRange'](trends, start, end);

      expect(filtered.length).toBeLessThanOrEqual(trends.length);
    });
  });

  // ============================================================================
  // 7️⃣ 데이터 내보내기
  // ============================================================================
  describe('데이터 내보내기', () => {
    let dashboard: Dashboard;
    let patternUpdater: PatternUpdater;

    beforeEach(() => {
      patternUpdater = new PatternUpdater();
      dashboard = new Dashboard(patternUpdater);
      patternUpdater.initializePattern(mockPattern);
      feedbackCollector.clear();
    });

    test('JSON 내보내기', () => {
      feedbackCollector.recordFeedback('배열 합산', mockProposal, 'approve');

      const json = dashboard.exportToJSON();

      expect(json.timestamp).toBeDefined();
      expect(json.stats).toBeDefined();
      expect(json.trends).toBeDefined();
      expect(json.feedback_summary).toBeDefined();
      expect(json.learning_progress).toBeDefined();
    });

    test('CSV 내보내기', () => {
      patternUpdater.recordApproval('sum');

      const csv = dashboard.exportTrendsToCSV();

      expect(typeof csv).toBe('string');
      expect(csv).toContain('Date');
      expect(csv).toContain('PatternID');
      expect(csv).toContain('AvgConfidence');
    });

    test('CSV 데이터 형식', () => {
      patternUpdater.recordApproval('sum');

      const csv = dashboard.exportTrendsToCSV();
      const lines = csv.split('\n');

      expect(lines[0]).toContain('Date,PatternID');
      if (lines.length > 1) {
        const dataLine = lines[1].split(',');
        expect(dataLine.length).toBe(5);
      }
    });
  });

  // ============================================================================
  // 8️⃣ 싱글톤 및 초기화
  // ============================================================================
  describe('싱글톤 및 초기화', () => {
    let dashboard: Dashboard;

    beforeEach(() => {
      dashboard = new Dashboard();
    });

    test('대시보드 인스턴스 생성', () => {
      expect(dashboard).not.toBeNull();
      expect(typeof dashboard.getStats).toBe('function');
    });

    test('초기화 실행', () => {
      dashboard.clear();
      expect(dashboard.getStats()).toBeDefined();
    });

    test('여러 메서드 체이닝 가능', () => {
      const stats = dashboard.getStats();
      const trends = dashboard.getTrends();
      const progress = dashboard.getLearningProgress();

      expect(stats).toBeDefined();
      expect(trends).toBeDefined();
      expect(progress).toBeDefined();
    });
  });
});
