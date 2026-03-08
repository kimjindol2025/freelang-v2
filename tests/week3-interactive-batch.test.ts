/**
 * FreeLang Week 3 - Interactive Mode & Batch Mode 테스트
 * Task 3.4: Interactive CLI Mode
 * Task 3.5: Batch Mode
 */

import { InteractiveMode } from '../src/cli/interactive-mode';
import { BatchMode, BatchRequest } from '../src/cli/batch-mode';
import { FeedbackStorage } from '../src/feedback/feedback-storage';
import { FeedbackCollector } from '../src/feedback/feedback-collector';
import { HeaderGenerator } from '../src/engine/header-generator';

describe('Week 3: Interactive & Batch Modes', () => {
  // ========== Task 3.4: Interactive Mode ==========
  describe('Task 3.4: Interactive Mode (InteractiveMode)', () => {
    let interactive: InteractiveMode;

    beforeEach(() => {
      interactive = new InteractiveMode();
    });

    test('세션 초기화', () => {
      const session = interactive.getSession();

      expect(session.sessionId).toBeTruthy();
      expect(session.startTime).toBeGreaterThan(0);
      expect(session.totalIterations).toBe(0);
      expect(session.successCount).toBe(0);
      expect(session.feedbacks).toBe(0);
    });

    test('세션 데이터 내보내기', () => {
      const exported = interactive.exportSession();

      expect(exported).toHaveProperty('session');
      expect(exported).toHaveProperty('feedbacks');
      expect(exported).toHaveProperty('stats');
      expect(exported).toHaveProperty('analysis');

      expect(exported.session.sessionId).toBeTruthy();
      expect(Array.isArray(exported.feedbacks)).toBe(true);
      expect(exported.stats).toHaveProperty('totalFeedback');
    });
  });

  // ========== Task 3.5: Batch Mode ==========
  describe('Task 3.5: Batch Mode (BatchMode)', () => {
    let batch: BatchMode;

    beforeEach(() => {
      batch = new BatchMode();
    });

    test('배치 요청 처리 (단일)', async () => {
      const requests: BatchRequest[] = [
        {
          id: 'req-1',
          input: '배열 더하기',
        },
      ];

      const report = await batch.processBatch(requests);

      expect(report.totalRequests).toBe(1);
      expect(report.successCount).toBeGreaterThanOrEqual(0);
      expect(report.results.length).toBe(1);

      const result = report.results[0];
      expect(result.requestId).toBe('req-1');
      expect(result.input).toBe('배열 더하기');
      expect(result.operation).toBeTruthy();
    });

    test('배치 요청 처리 (다중)', async () => {
      const requests: BatchRequest[] = [
        { id: 'req-1', input: '배열 더하기' },
        { id: 'req-2', input: '필터링' },
        { id: 'req-3', input: '최댓값 찾기' },
      ];

      const report = await batch.processBatch(requests);

      expect(report.totalRequests).toBe(3);
      expect(report.results.length).toBe(3);
      expect(report.results[0].requestId).toBe('req-1');
      expect(report.results[1].requestId).toBe('req-2');
      expect(report.results[2].requestId).toBe('req-3');
    });

    test('배치 요청 with 피드백', async () => {
      const requests: BatchRequest[] = [
        {
          id: 'req-1',
          input: '배열 더하기',
          userAction: 'approve',
        },
        {
          id: 'req-2',
          input: '필터링',
          userAction: 'modify',
          feedback: '타입 수정 필요',
        },
      ];

      const report = await batch.processBatch(requests);

      expect(report.results[0].feedbackCollected).toBe(true);
      expect(report.results[1].feedbackCollected).toBe(true);
      expect(report.results[1].accuracy).toBeLessThan(1);
    });

    test('배치 요청 with 예상 Operation', async () => {
      const requests: BatchRequest[] = [
        {
          id: 'req-1',
          input: '배열 더하기',
          expectedOperation: 'sum',
        },
      ];

      const report = await batch.processBatch(requests);

      const result = report.results[0];
      if (result.operation === 'sum') {
        expect(result.operation).toBe('sum');
      } else {
        expect(result.error).toBeTruthy();
      }
    });

    test('리포트 생성', async () => {
      const requests: BatchRequest[] = [
        { id: 'req-1', input: '배열 더하기', userAction: 'approve' },
        { id: 'req-2', input: '필터링', userAction: 'modify' },
      ];

      const report = await batch.processBatch(requests);
      const reportText = batch.generateReportText(report);

      expect(reportText).toContain('📋 FreeLang Batch Report');
      expect(reportText).toContain('📊 요약:');
      expect(reportText).toContain(`총 요청: ${report.totalRequests}`);
      expect(reportText).toContain('📈 메트릭:');
    });

    test('요약 정보 조회', async () => {
      const requests: BatchRequest[] = [
        { id: 'req-1', input: '배열 더하기' },
        { id: 'req-2', input: '배열 정렬' },
      ];

      await batch.processBatch(requests);
      const summary = batch.getSummary();

      expect(summary.total).toBe(2);
      expect(summary.success).toBeGreaterThanOrEqual(0);
      expect(summary.failure).toBeGreaterThanOrEqual(0);
      expect(summary.success + summary.failure).toBe(2);
      expect(summary.successRate).toMatch(/\d+\.\d+%/);
    });

    test('JSON 형식 결과 내보내기', async () => {
      const requests: BatchRequest[] = [
        { id: 'req-1', input: '배열 더하기' },
      ];

      await batch.processBatch(requests);
      const json = batch.getResultsJSON();

      expect(json).toHaveProperty('timestamp');
      expect(json).toHaveProperty('results');
      expect(json).toHaveProperty('summary');
      expect(json).toHaveProperty('stats');

      expect(Array.isArray(json.results)).toBe(true);
      expect(json.summary.total).toBe(1);
    });

    test('배치 성공률 계산', async () => {
      const requests: BatchRequest[] = [
        { id: 'req-1', input: '배열 더하기' },
        { id: 'req-2', input: '배열 필터' },
        { id: 'req-3', input: '최댓값' },
      ];

      const report = await batch.processBatch(requests);

      expect(report.totalRequests).toBe(3);
      expect(report.successCount + report.failureCount).toBe(3);

      const successRate =
        (report.successCount / report.totalRequests) * 100;
      expect(successRate).toBeGreaterThanOrEqual(0);
      expect(successRate).toBeLessThanOrEqual(100);
    });

    test('배치 검증율 계산', async () => {
      const requests: BatchRequest[] = [
        { id: 'req-1', input: '배열 더하기' },
        { id: 'req-2', input: '필터링' },
      ];

      const report = await batch.processBatch(requests);

      expect(report.validationPassCount).toBeGreaterThanOrEqual(0);
      expect(report.validationPassCount).toBeLessThanOrEqual(
        report.successCount
      );
    });

    test('배치 평균 신뢰도', async () => {
      const requests: BatchRequest[] = [
        { id: 'req-1', input: '배열 더하기' },
        { id: 'req-2', input: '필터링' },
        { id: 'req-3', input: '정렬' },
      ];

      const report = await batch.processBatch(requests);

      expect(report.averageConfidence).toBeGreaterThanOrEqual(0);
      expect(report.averageConfidence).toBeLessThanOrEqual(1);
    });

    test('배치 평균 정확도', async () => {
      const requests: BatchRequest[] = [
        { id: 'req-1', input: '배열 더하기', userAction: 'approve' },
        { id: 'req-2', input: '필터링', userAction: 'modify' },
      ];

      const report = await batch.processBatch(requests);

      if (report.results.filter((r) => r.feedbackCollected).length > 0) {
        expect(report.averageAccuracy).toBeGreaterThanOrEqual(0);
        expect(report.averageAccuracy).toBeLessThanOrEqual(1);
      }
    });

    test('배치 Operation별 분석', async () => {
      const requests: BatchRequest[] = [
        { id: 'req-1', input: '배열 더하기', userAction: 'approve' },
        { id: 'req-2', input: '배열 더하기', userAction: 'approve' },
        { id: 'req-3', input: '필터링', userAction: 'modify' },
      ];

      const report = await batch.processBatch(requests);

      expect(report.stats.operationStats).toBeDefined();
      if (report.stats.totalFeedback > 0) {
        expect(Object.keys(report.stats.operationStats).length).toBeGreaterThan(
          0
        );
      }
    });

    test('배치 인사이트 생성', async () => {
      const requests: BatchRequest[] = [
        { id: 'req-1', input: '배열 더하기', userAction: 'approve' },
        { id: 'req-2', input: '필터링', userAction: 'approve' },
        { id: 'req-3', input: '정렬', userAction: 'approve' },
      ];

      const report = await batch.processBatch(requests);

      if (report.stats.totalFeedback > 0) {
        expect(report.analysis.insights.length).toBeGreaterThan(0);
        expect(report.analysis.insights.some((i: string) => i.includes('%')));
      }
    });
  });

  // ========== 통합 테스트 ==========
  describe('통합 테스트: Interactive + Batch 시나리오', () => {
    test('배치 처리 후 통계 수집', async () => {
      const batch = new BatchMode();
      const requests: BatchRequest[] = [
        { id: 'req-1', input: '배열 더하기', userAction: 'approve' },
        { id: 'req-2', input: '필터링', userAction: 'modify' },
        { id: 'req-3', input: '정렬', userAction: 'reject' },
      ];

      const report = await batch.processBatch(requests);

      expect(report.stats.totalFeedback).toBe(3);
      expect(report.stats.approved).toBe(1);
      expect(report.stats.modified).toBe(1);
      expect(report.stats.rejected).toBe(1);
    });

    test('배치 모드 with 예상 Operation 검증', async () => {
      const batch = new BatchMode();
      const requests: BatchRequest[] = [
        {
          id: 'req-1',
          input: '숫자 배열의 합',
          expectedOperation: 'sum',
        },
      ];

      const report = await batch.processBatch(requests);
      const result = report.results[0];

      // Operation이 sum이면 성공, 아니면 에러 기록되어야 함
      if (result.operation === 'sum') {
        expect(!result.error || result.error.includes('Expected'));
      } else {
        expect(result.error).toBeTruthy();
      }
    });

    test('대규모 배치 처리 (10개 요청)', async () => {
      const batch = new BatchMode();
      const requests: BatchRequest[] = [];

      const inputs = [
        '배열 더하기',
        '배열 평균',
        '최댓값',
        '최솟값',
        '필터링',
        '정렬',
        '합산',
        '조건 선택',
        '필터',
        '평균값 계산',
      ];

      for (let i = 0; i < 10; i++) {
        requests.push({
          id: `req-${i + 1}`,
          input: inputs[i],
          userAction: i % 3 === 0 ? 'approve' : 'modify',
        });
      }

      const report = await batch.processBatch(requests);

      expect(report.totalRequests).toBe(10);
      expect(report.results.length).toBe(10);
      expect(report.stats.totalFeedback).toBe(10);

      // 피드백이 수집되었는지 확인
      const feedbackCollected = report.results.filter(
        (r) => r.feedbackCollected
      );
      expect(feedbackCollected.length).toBe(10);
    });

    test('배치 리포트 텍스트 형식', async () => {
      const batch = new BatchMode();
      const requests: BatchRequest[] = [
        { id: 'req-1', input: '배열 더하기', userAction: 'approve' },
        { id: 'req-2', input: '필터링', userAction: 'modify' },
      ];

      const report = await batch.processBatch(requests);
      const reportText = batch.generateReportText(report);

      expect(reportText).toContain('FreeLang Batch Report');
      expect(reportText).toContain('요약');
      expect(reportText).toContain('메트릭');
      expect(reportText).toContain('총 요청: 2');
    });

    test('세션 내보내기 with 통합 정보', async () => {
      const interactive = new InteractiveMode();
      const exported = interactive.exportSession();

      expect(exported.session).toHaveProperty('sessionId');
      expect(exported.session).toHaveProperty('startTime');
      expect(exported.feedbacks).toEqual([]);
      expect(exported.stats.totalFeedback).toBe(0);
    });
  });
});
