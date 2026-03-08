/**
 * FreeLang Week 5 - Task 5.1: Pipeline Integrator Tests
 * Integration tests for all components from Weeks 1-4
 */

import { PipelineIntegrator } from '../src/pipeline/pipeline-integrator';

describe('Week 5: Pipeline Integrator', () => {
  let integrator: PipelineIntegrator;

  beforeEach(() => {
    integrator = new PipelineIntegrator();
  });

  // ========== Task 5.1: Pipeline Integrator ==========
  describe('Task 5.1: Pipeline Integrator', () => {
    test('파이프라인 초기화', () => {
      expect(integrator).toBeDefined();
      expect(integrator.getStats).toBeDefined();
      expect(integrator.process).toBeDefined();
      expect(integrator.collectFeedback).toBeDefined();
      expect(integrator.runLearningEpoch).toBeDefined();
    });

    test('단일 입력 처리 (sum)', () => {
      const result = integrator.process({
        userInput: 'sum array',
      });

      expect(result).toBeDefined();
      expect(result.operation).toBe('sum');
      expect(result.header).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('단일 입력 처리 (filter)', () => {
      const result = integrator.process({
        userInput: 'filter greater than 5',
      });

      expect(result).toBeDefined();
      expect(result.operation).toBe('filter');
      expect(result.header).toBeDefined();
    });

    test('단일 입력 처리 (sort)', () => {
      const result = integrator.process({
        userInput: 'sort array',
      });

      expect(result).toBeDefined();
      expect(result.operation).toBe('sort');
      expect(result.header).toBeDefined();
    });

    test('C 코드 생성', () => {
      const result = integrator.process({
        userInput: 'sum numbers',
      });

      expect(result.cCode).toBeDefined();
      expect(result.cCode !== null && result.cCode.length > 0).toBe(true);
    });

    test('헤더 메타데이터 포함', () => {
      const result = integrator.process({
        userInput: 'count elements',
      });

      expect(result.metadata).toBeDefined();
      expect(result.metadata.intentTokens).toBeDefined();
      expect(Array.isArray(result.metadata.intentTokens)).toBe(true);
      expect(result.metadata.headerScore).toBeGreaterThanOrEqual(0);
    });

    test('신뢰도 메타데이터', () => {
      const result = integrator.process({
        userInput: 'average values',
      });

      expect(result.metadata.estimatedAccuracy).toBeGreaterThanOrEqual(0);
      expect(result.metadata.estimatedAccuracy).toBeLessThanOrEqual(1);
    });

    test('다중 입력 처리', () => {
      const input1 = integrator.process({ userInput: 'sum' });
      const input2 = integrator.process({ userInput: 'filter' });
      const input3 = integrator.process({ userInput: 'sort' });

      expect(input1.operation).toBe('sum');
      expect(input2.operation).toBe('filter');
      expect(input3.operation).toBe('sort');
    });

    test('히스토리 기록', () => {
      integrator.process({ userInput: 'sum' });
      integrator.process({ userInput: 'filter' });

      const history = integrator.getHistory();
      expect(history.length).toBe(2);
      expect(history[0].operation).toBe('sum');
      expect(history[1].operation).toBe('filter');
    });

    test('통계 조회', () => {
      integrator.process({ userInput: 'sum' });
      integrator.process({ userInput: 'filter' });

      const stats = integrator.getStats();
      expect(stats.totalProcessed).toBe(2);
      expect(stats.successCount).toBe(2);
      expect(stats.avgConfidence).toBeGreaterThan(0);
    });

    test('리포트 생성', () => {
      integrator.process({ userInput: 'sum' });
      integrator.process({ userInput: 'filter' });

      const report = integrator.generateReport();
      expect(report).toContain('Pipeline Summary');
      expect(report).toContain('Operation Distribution');
      expect(report).toContain('Feedback Analysis');
    });

    test('피드백 수집', () => {
      const result = integrator.process({
        userInput: 'sum array',
      });

      if (result.header) {
        integrator.collectFeedback(result.header, 'approve');
        const stats = integrator.getStats();
        expect(stats.totalProcessed).toBe(1);
      }
    });

    test('학습 에포크 실행', async () => {
      const result1 = integrator.process({ userInput: 'sum' });
      const result2 = integrator.process({ userInput: 'filter' });

      if (result1.header) {
        integrator.collectFeedback(result1.header, 'approve');
      }
      if (result2.header) {
        integrator.collectFeedback(result2.header, 'modify');
      }

      const epoch = await integrator.runLearningEpoch();
      expect(epoch).toBeDefined();
    });

    test('파이프라인 초기화', () => {
      integrator.process({ userInput: 'sum' });
      expect(integrator.getHistory().length).toBe(1);

      integrator.clear();
      expect(integrator.getHistory().length).toBe(0);
    });
  });

  // ========== 통합 테스트 ==========
  describe('Week 5 통합 테스트', () => {
    test('전체 파이프라인 흐름', () => {
      // 1. 처리
      const result = integrator.process({
        userInput: '배열 합산',
      });

      expect(result.success).toBe(true);
      expect(result.operation).toBeDefined();

      // 2. 피드백
      if (result.header) {
        integrator.collectFeedback(result.header, 'approve');
      }

      // 3. 통계
      const stats = integrator.getStats();
      expect(stats.totalProcessed).toBe(1);
      expect(stats.successCount).toBe(1);

      // 4. 리포트
      const report = integrator.generateReport();
      expect(report.length).toBeGreaterThan(0);
    });

    test('여러 작업 처리 및 분석', () => {
      const operations = ['sum', 'filter', 'sort', 'average', 'max'];

      for (const op of operations) {
        const result = integrator.process({ userInput: op });
        expect(result.operation).toBeDefined();
      }

      const stats = integrator.getStats();
      expect(stats.totalProcessed).toBe(5);
      expect(stats.successCount).toBeGreaterThan(0);
    });

    test('피드백 루프 (승인→수정→거부)', () => {
      // 1차: sum 처리
      let result = integrator.process({ userInput: 'sum' });
      if (result.header) {
        integrator.collectFeedback(result.header, 'approve');
      }

      // 2차: filter 처리 및 수정
      result = integrator.process({ userInput: 'filter' });
      if (result.header) {
        integrator.collectFeedback(result.header, 'modify', 'Updated message');
      }

      // 3차: sort 처리 및 거부
      result = integrator.process({ userInput: 'sort' });
      if (result.header) {
        integrator.collectFeedback(result.header, 'reject');
      }

      const stats = integrator.getStats();
      expect(stats.totalProcessed).toBe(3);
    });

    test('신뢰도 변화 추적', () => {
      const confidences: number[] = [];

      for (let i = 0; i < 5; i++) {
        const result = integrator.process({ userInput: 'sum array' });
        confidences.push(result.confidence);
      }

      expect(confidences.length).toBe(5);
      expect(confidences.every((c) => c > 0)).toBe(true);
    });

    test('실패 처리 및 복구', () => {
      // 정상 입력 1
      const result1 = integrator.process({ userInput: 'sum array' });
      expect(result1.success).toBe(true);

      // 정상 입력 2
      const result2 = integrator.process({ userInput: 'filter elements' });
      expect(result2.success).toBe(true);

      const stats = integrator.getStats();
      expect(stats.totalProcessed).toBe(2);
      expect(stats.successCount).toBe(2);
    });

    test('세션별 추적', async () => {
      const sessionId = 'test-session-001';

      integrator.process({
        userInput: 'sum',
        sessionId,
      });

      integrator.process({
        userInput: 'filter',
        sessionId,
      });

      const stats = integrator.getStats();
      expect(stats.totalProcessed).toBe(2);
    });

    test('완전한 E2E 파이프라인', async () => {
      // 1. 초기 처리
      const result = integrator.process({
        userInput: '배열 원소 합산',
        testData: [1, 2, 3, 4, 5],
      });

      expect(result.success).toBe(true);

      // 2. 피드백 수집 (여러 방식)
      if (result.header) {
        integrator.collectFeedback(result.header, 'approve');
      }

      // 3. 학습 에포크
      const epoch = await integrator.runLearningEpoch();
      expect(epoch).toBeDefined();

      // 4. 최종 통계
      const stats = integrator.getStats();
      expect(stats.totalProcessed).toBe(1);
      expect(stats.successCount).toBe(1);

      // 5. 리포트 검증
      const report = integrator.generateReport();
      expect(report).toContain('Pipeline Summary');
      expect(report).toContain('Feedback Analysis');
    });
  });
});
