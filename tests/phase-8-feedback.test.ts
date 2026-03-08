/**
 * Phase 8.1: Feedback Collection Interface Tests
 *
 * 사용자 피드백 수집, 저장, 통계 검증
 */

import { FeedbackCollector, feedbackCollector } from '../src/feedback/collector';
import { HeaderProposal } from '../src/core/types';

// Mock proposal
const mockProposal: HeaderProposal = {
  header: 'fn sum: array<number> -> number',
  fnName: 'sum',
  inputType: 'array<number>',
  outputType: 'number',
  reason: 'sum aggregation',
  directive: '@basic',
  confidence: 0.95,
  alternatives: [],
  matchedPattern: 'sum',
};

describe('Phase 8.1: Feedback Collection Interface', () => {
  // ============================================================================
  // 1️⃣ 피드백 기록
  // ============================================================================
  describe('피드백 기록', () => {
    let collector: FeedbackCollector;

    beforeEach(() => {
      collector = new FeedbackCollector();
    });

    test('승인 피드백 기록', () => {
      const id = collector.recordFeedback(
        '배열 합산',
        mockProposal,
        'approve'
      );
      const feedback = collector.getFeedback(id);

      expect(feedback).not.toBeNull();
      expect(feedback?.user_action).toBe('approve');
      expect(feedback?.input).toBe('배열 합산');
    });

    test('거부 피드백 기록', () => {
      const id = collector.recordFeedback(
        '배열 합산',
        mockProposal,
        'reject'
      );
      const feedback = collector.getFeedback(id);

      expect(feedback?.user_action).toBe('reject');
    });

    test('수정 피드백 기록', () => {
      const id = collector.recordFeedback(
        '배열 합산',
        mockProposal,
        'modify',
        { fn: 'sumArray', directive: '@optimized' }
      );
      const feedback = collector.getFeedback(id);

      expect(feedback?.user_action).toBe('modify');
      expect(feedback?.modification?.fn).toBe('sumArray');
    });
  });

  // ============================================================================
  // 2️⃣ 피드백 조회
  // ============================================================================
  describe('피드백 조회', () => {
    let collector: FeedbackCollector;

    beforeEach(() => {
      collector = new FeedbackCollector();
    });

    test('개별 피드백 조회', () => {
      const id = collector.recordFeedback(
        '배열 합산',
        mockProposal,
        'approve'
      );
      const feedback = collector.getFeedback(id);

      expect(feedback).not.toBeNull();
      expect(feedback?.id).toBe(id);
    });

    test('모든 피드백 조회', () => {
      collector.recordFeedback('배열 합산', mockProposal, 'approve');
      collector.recordFeedback('배열 필터링', mockProposal, 'reject');
      collector.recordFeedback('배열 정렬', mockProposal, 'approve');

      const feedbacks = collector.getAllFeedbacks();
      expect(feedbacks.length).toBe(3);
    });

    test('없는 피드백 조회 → null', () => {
      const feedback = collector.getFeedback('nonexistent_id');
      expect(feedback).toBeNull();
    });
  });

  // ============================================================================
  // 3️⃣ 피드백 통계
  // ============================================================================
  describe('피드백 통계', () => {
    let collector: FeedbackCollector;

    beforeEach(() => {
      collector = new FeedbackCollector();
    });

    test('전체 통계 계산', () => {
      collector.recordFeedback('배열 합산', mockProposal, 'approve');
      collector.recordFeedback('배열 필터링', mockProposal, 'approve');
      collector.recordFeedback('배열 정렬', mockProposal, 'reject');

      const stats = collector.getStats();
      expect(stats.total).toBe(3);
      expect(stats.approved).toBe(2);
      expect(stats.rejected).toBe(1);
      expect(stats.modified).toBe(0);
    });

    test('승인율 계산', () => {
      collector.recordFeedback('배열 합산', mockProposal, 'approve');
      collector.recordFeedback('배열 필터링', mockProposal, 'approve');
      collector.recordFeedback('배열 정렬', mockProposal, 'reject');

      const stats = collector.getStats();
      expect(stats.approval_rate).toBeCloseTo(2 / 3, 2);
    });

    test('빈 상태 통계', () => {
      const stats = collector.getStats();
      expect(stats.total).toBe(0);
      expect(stats.approval_rate).toBe(0);
    });
  });

  // ============================================================================
  // 4️⃣ 세션 관리
  // ============================================================================
  describe('세션 관리', () => {
    let collector: FeedbackCollector;

    beforeEach(() => {
      collector = new FeedbackCollector();
    });

    test('세션 ID 자동 생성', () => {
      const sessionId = collector.getSessionId();
      expect(sessionId).toMatch(/^session_/);
    });

    test('세션별 피드백 조회', () => {
      const sessionId1 = collector.getSessionId();
      collector.recordFeedback('배열 합산', mockProposal, 'approve');
      collector.recordFeedback('배열 필터링', mockProposal, 'approve');

      const sessionId2 = collector.newSession();
      collector.recordFeedback('배열 정렬', mockProposal, 'reject');

      const feedbacks1 = collector.getFeedbacksBySession(sessionId1);
      const feedbacks2 = collector.getFeedbacksBySession(sessionId2);

      expect(feedbacks1.length).toBe(2);
      expect(feedbacks2.length).toBe(1);
    });

    test('세션별 통계', () => {
      collector.recordFeedback('배열 합산', mockProposal, 'approve');
      collector.recordFeedback('배열 필터링', mockProposal, 'reject');

      const sessionId = collector.getSessionId();
      const stats = collector.getStatsBySession(sessionId);

      expect(stats.total).toBe(2);
      expect(stats.approved).toBe(1);
      expect(stats.rejected).toBe(1);
    });
  });

  // ============================================================================
  // 5️⃣ 수정 피드백 처리
  // ============================================================================
  describe('수정 피드백 처리', () => {
    let collector: FeedbackCollector;

    beforeEach(() => {
      collector = new FeedbackCollector();
    });

    test('수정된 제안 가져오기', () => {
      const id = collector.recordFeedback(
        '배열 합산',
        mockProposal,
        'modify',
        { fn: 'sumArray' }
      );

      const modified = collector.getModifiedProposal(id);
      expect(modified).not.toBeNull();
      expect(modified?.fnName).toBe('sumArray');
      expect(modified?.inputType).toBe('array<number>'); // 원본 유지
    });

    test('수정 항목 여러 개', () => {
      const id = collector.recordFeedback(
        '배열 합산',
        mockProposal,
        'modify',
        {
          fn: 'sumArray',
          input: 'array<int>',
          output: 'int',
          directive: '@optimized',
        }
      );

      const modified = collector.getModifiedProposal(id);
      expect(modified?.fnName).toBe('sumArray');
      expect(modified?.inputType).toBe('array<int>');
      expect(modified?.outputType).toBe('int');
      expect(modified?.directive).toBe('@optimized');
    });

    test('수정 없는 피드백 → null', () => {
      const id = collector.recordFeedback(
        '배열 합산',
        mockProposal,
        'approve'
      );

      const modified = collector.getModifiedProposal(id);
      expect(modified).toBeNull();
    });
  });

  // ============================================================================
  // 6️⃣ 타임스탐프
  // ============================================================================
  describe('타임스탐프', () => {
    let collector: FeedbackCollector;

    beforeEach(() => {
      collector = new FeedbackCollector();
    });

    test('타임스탐프 자동 생성', () => {
      const before = new Date();
      const id = collector.recordFeedback(
        '배열 합산',
        mockProposal,
        'approve'
      );
      const after = new Date();

      const feedback = collector.getFeedback(id);
      expect(feedback?.timestamp).not.toBeNull();
      expect(feedback!.timestamp.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      );
      expect(feedback!.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    test('여러 피드백의 시간 순서', (done) => {
      const id1 = collector.recordFeedback(
        '배열 합산',
        mockProposal,
        'approve'
      );
      const fb1 = collector.getFeedback(id1)!;

      // 약간의 시간 지연
      setTimeout(() => {
        const id2 = collector.recordFeedback(
          '배열 필터링',
          mockProposal,
          'approve'
        );
        const fb2 = collector.getFeedback(id2)!;

        expect(fb2.timestamp.getTime()).toBeGreaterThanOrEqual(
          fb1.timestamp.getTime()
        );
        done();
      }, 10);
    });
  });

  // ============================================================================
  // 7️⃣ 초기화 및 정리
  // ============================================================================
  describe('초기화 및 정리', () => {
    let collector: FeedbackCollector;

    beforeEach(() => {
      collector = new FeedbackCollector();
    });

    test('clear() 후 데이터 초기화', () => {
      collector.recordFeedback('배열 합산', mockProposal, 'approve');
      collector.recordFeedback('배열 필터링', mockProposal, 'reject');

      let feedbacks = collector.getAllFeedbacks();
      expect(feedbacks.length).toBe(2);

      collector.clear();

      feedbacks = collector.getAllFeedbacks();
      expect(feedbacks.length).toBe(0);
    });

    test('clear() 후 새 세션 ID 생성', () => {
      const sessionId1 = collector.getSessionId();
      collector.clear();
      const sessionId2 = collector.getSessionId();

      expect(sessionId1).not.toBe(sessionId2);
    });
  });

  // ============================================================================
  // 8️⃣ 싱글톤
  // ============================================================================
  describe('싱글톤', () => {
    test('전역 인스턴스 사용 가능', () => {
      feedbackCollector.clear();
      const id = feedbackCollector.recordFeedback(
        '배열 합산',
        mockProposal,
        'approve'
      );

      const feedback = feedbackCollector.getFeedback(id);
      expect(feedback).not.toBeNull();
    });
  });
});
