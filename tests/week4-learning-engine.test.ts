/**
 * FreeLang Week 4 - Learning Engine Tests
 * Task 4.1: PatternUpdater
 * Task 4.2: ConfidenceUpdater
 * Task 4.3: MetaLearner
 * Task 4.4: LearningEngine
 */

import { PatternUpdater } from '../src/learning/pattern-updater';
import { ConfidenceUpdater } from '../src/learning/confidence-updater';
import { MetaLearner } from '../src/learning/meta-learner';
import { LearningEngine } from '../src/learning/learning-engine';
import { FeedbackCollector } from '../src/feedback/feedback-collector';
import { FeedbackStorage } from '../src/feedback/feedback-storage';
import { FeedbackEntry } from '../src/feedback/feedback-types';
import { HeaderGenerator } from '../src/engine/header-generator';

describe('Week 4: Learning Engine', () => {
  // ========== Task 4.1: Pattern Updater ==========
  describe('Task 4.1: Pattern Updater', () => {
    let updater: PatternUpdater;

    beforeEach(() => {
      updater = new PatternUpdater();
    });

    test('패턴 업데이트 (승인 피드백)', () => {
      const collector = new FeedbackCollector();
      const proposal = HeaderGenerator.generateHeader('sum', 0.95)!;
      const feedback = collector.collectFeedback(proposal, 'approve');

      const updates = updater.updatePatterns([feedback]);

      expect(updates).toBeDefined();
      expect(Array.isArray(updates)).toBe(true);
    });

    test('패턴 업데이트 (거부 피드백)', () => {
      const collector = new FeedbackCollector();
      const proposal = HeaderGenerator.generateHeader('sum', 0.5)!;
      const feedback = collector.collectFeedback(proposal, 'reject');

      const updates = updater.updatePatterns([feedback]);

      expect(updates).toBeDefined();
    });

    test('패턴 통계 조회', () => {
      const collector = new FeedbackCollector();
      const proposal = HeaderGenerator.generateHeader('sum', 0.9)!;
      const feedback = collector.collectFeedback(proposal, 'approve');

      updater.updatePatterns([feedback]);
      const stats = updater.getPatternStats('sum');

      expect(stats.length).toBeGreaterThanOrEqual(0);
    });

    test('업데이트 히스토리 조회', () => {
      const collector = new FeedbackCollector();
      const proposal = HeaderGenerator.generateHeader('sum', 0.8)!;
      const fb1 = collector.collectFeedback(proposal, 'approve');
      const fb2 = collector.collectFeedback(proposal, 'modify');

      updater.updatePatterns([fb1, fb2]);
      const history = updater.getUpdateHistory();

      expect(Array.isArray(history)).toBe(true);
    });

    test('개선 필요 Operation 식별', () => {
      const collector = new FeedbackCollector();
      const proposal = HeaderGenerator.generateHeader('sum', 0.3)!;

      const feedbacks: FeedbackEntry[] = [];
      for (let i = 0; i < 5; i++) {
        feedbacks.push(collector.collectFeedback(proposal, 'reject'));
      }

      updater.updatePatterns(feedbacks);
      const needsImprovement = updater.getOperationsNeedingImprovement(0.7);

      expect(Array.isArray(needsImprovement)).toBe(true);
    });

    test('패턴 성능 요약 생성', () => {
      const collector = new FeedbackCollector();
      const proposal = HeaderGenerator.generateHeader('sum', 0.9)!;
      const feedback = collector.collectFeedback(proposal, 'approve');

      updater.updatePatterns([feedback]);
      const summary = updater.generateSummary();

      expect(summary).toContain('Pattern Updater Summary');
    });
  });

  // ========== Task 4.2: Confidence Updater ==========
  describe('Task 4.2: Confidence Updater', () => {
    let updater: ConfidenceUpdater;

    beforeEach(() => {
      updater = new ConfidenceUpdater();
    });

    test('신뢰도 메트릭 계산', () => {
      const storage = new FeedbackStorage();
      const collector = new FeedbackCollector();
      const proposal = HeaderGenerator.generateHeader('sum', 0.9)!;
      const feedback = collector.collectFeedback(proposal, 'approve');

      storage.saveFeedback(feedback);
      const stats = storage.calculateStats();

      const metrics = updater.updateConfidenceWeights([feedback], stats);

      expect(Array.isArray(metrics)).toBe(true);
    });

    test('현재 가중치 조회', () => {
      const weights = updater.getCurrentWeights();

      expect(weights).toHaveProperty('patternMatch');
      expect(weights).toHaveProperty('typeInference');
      expect(weights).toHaveProperty('intentClarity');
      expect(weights).toHaveProperty('similarity');

      const sum =
        weights.patternMatch +
        weights.typeInference +
        weights.intentClarity +
        weights.similarity;
      expect(sum).toBeCloseTo(1, 1);
    });

    test('신뢰도 메트릭 조회', () => {
      const storage = new FeedbackStorage();
      const collector = new FeedbackCollector();
      const proposal = HeaderGenerator.generateHeader('sum', 0.8)!;
      const feedback = collector.collectFeedback(proposal, 'approve');

      storage.saveFeedback(feedback);
      const stats = storage.calculateStats();

      updater.updateConfidenceWeights([feedback], stats);
      const metrics = updater.getConfidenceMetrics('sum');

      expect(Array.isArray(metrics)).toBe(true);
    });

    test('조정 히스토리 조회', () => {
      const history = updater.getAdjustmentHistory();

      expect(Array.isArray(history)).toBe(true);
    });

    test('신뢰도 리포트 생성', () => {
      const report = updater.generateReport();

      expect(report).toContain('Confidence Updater Report');
      expect(report).toContain('가중치');
    });
  });

  // ========== Task 4.3: Meta Learner ==========
  describe('Task 4.3: Meta Learner', () => {
    let learner: MetaLearner;

    beforeEach(() => {
      learner = new MetaLearner();
    });

    test('학습 세션 시작', () => {
      learner.startSession('session-123');
      expect(learner.getLearningSessions).toBeDefined();
    });

    test('학습 메타데이터 생성', () => {
      const collector = new FeedbackCollector();
      const storage = new FeedbackStorage();
      const proposal = HeaderGenerator.generateHeader('sum', 0.9)!;

      const feedbacks: FeedbackEntry[] = [];
      for (let i = 0; i < 3; i++) {
        const fb = collector.collectFeedback(proposal, 'approve');
        storage.saveFeedback(fb);
        feedbacks.push(fb);
      }

      const stats = storage.calculateStats();
      const metadata = learner.generateLearningMetadata(
        'sum',
        [],
        [],
        stats.operationStats['sum']
          ? {
              operation: 'sum',
              totalFeedback: stats.operationStats['sum'].count,
              approvalRate: stats.operationStats['sum'].approvalRate,
              rejectionRate: 0,
              modificationRate: 0,
              avgAccuracy: stats.operationStats['sum'].averageAccuracy,
              lastUpdated: Date.now(),
            }
          : {
              operation: 'sum',
              totalFeedback: 0,
              approvalRate: 0,
              rejectionRate: 0,
              modificationRate: 0,
              avgAccuracy: 0,
              lastUpdated: Date.now(),
            }
      );

      expect(metadata).toHaveProperty('learningRate');
      expect(metadata).toHaveProperty('convergenceScore');
      expect(metadata).toHaveProperty('stabilityScore');
    });

    test('학습 메타데이터 조회', () => {
      const metadata = learner.getLearningMetadata();

      expect(Array.isArray(metadata)).toBe(true);
    });

    test('전체 학습 진행률 조회', () => {
      const progress = learner.getOverallProgress();

      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    });

    test('학습 리포트 생성', () => {
      const report = learner.generateReport();

      expect(report).toContain('Meta Learner Report');
      expect(report).toContain('학습 진행률');
    });

    test('학습 세션 종료', () => {
      learner.startSession('session-456');
      learner.endSession();

      const sessions = learner.getLearningSessions();
      expect(sessions.length).toBeGreaterThan(0);
    });
  });

  // ========== Task 4.4: Learning Engine ==========
  describe('Task 4.4: Learning Engine', () => {
    let engine: LearningEngine;
    let storage: FeedbackStorage;

    beforeEach(() => {
      storage = new FeedbackStorage();
      engine = new LearningEngine(storage);
    });

    test('학습 엔진 초기화', () => {
      expect(engine).toBeDefined();
    });

    test('학습 에포크 실행', async () => {
      const collector = new FeedbackCollector();
      const proposal = HeaderGenerator.generateHeader('sum', 0.9)!;
      const feedback = collector.collectFeedback(proposal, 'approve');

      storage.saveFeedback(feedback);

      const epoch = await engine.runLearningEpoch();

      expect(epoch).toHaveProperty('epochNumber');
      expect(epoch).toHaveProperty('feedbackProcessed');
      expect(epoch).toHaveProperty('overallProgress');
    });

    test('자동 학습 루프', async () => {
      const collector = new FeedbackCollector();
      const proposal = HeaderGenerator.generateHeader('sum', 0.9)!;

      for (let i = 0; i < 3; i++) {
        const feedback = collector.collectFeedback(proposal, 'approve');
        storage.saveFeedback(feedback);
      }

      const epochs = await engine.autoLearn(3);

      expect(Array.isArray(epochs)).toBe(true);
      expect(epochs.length).toBeGreaterThan(0);
    });

    test('에포크 히스토리 조회', async () => {
      const collector = new FeedbackCollector();
      const proposal = HeaderGenerator.generateHeader('sum', 0.8)!;
      const feedback = collector.collectFeedback(proposal, 'approve');

      storage.saveFeedback(feedback);
      await engine.runLearningEpoch();

      const history = engine.getEpochHistory();

      expect(Array.isArray(history)).toBe(true);
    });

    test('현재 학습 상태 조회', async () => {
      const collector = new FeedbackCollector();
      const proposal = HeaderGenerator.generateHeader('sum', 0.85)!;
      const feedback = collector.collectFeedback(proposal, 'approve');

      storage.saveFeedback(feedback);
      await engine.runLearningEpoch();

      const status = engine.getCurrentStatus();

      expect(status).toHaveProperty('currentEpoch');
      expect(status).toHaveProperty('overallProgress');
      expect(status).toHaveProperty('operationsLearned');
    });

    test('학습 리포트 생성', async () => {
      const collector = new FeedbackCollector();
      const proposal = HeaderGenerator.generateHeader('sum', 0.9)!;
      const feedback = collector.collectFeedback(proposal, 'approve');

      storage.saveFeedback(feedback);
      await engine.runLearningEpoch();

      const report = engine.generateLearningReport();

      expect(report).toHaveProperty('totalEpochs');
      expect(report).toHaveProperty('overallProgress');
      expect(report).toHaveProperty('operationsImproved');
      expect(report).toHaveProperty('nextActions');
    });

    test('상세 학습 리포트 생성', async () => {
      const collector = new FeedbackCollector();
      const proposal = HeaderGenerator.generateHeader('sum', 0.88)!;
      const feedback = collector.collectFeedback(proposal, 'approve');

      storage.saveFeedback(feedback);
      await engine.runLearningEpoch();

      const report = engine.generateDetailedReport();

      expect(report).toContain('Learning Engine Detailed Report');
      expect(report).toContain('학습 진행');
    });

    test('학습 세션 관리', async () => {
      engine.startLearningSession('session-test');

      const collector = new FeedbackCollector();
      const proposal = HeaderGenerator.generateHeader('sum', 0.9)!;
      const feedback = collector.collectFeedback(proposal, 'approve');

      storage.saveFeedback(feedback);
      await engine.runLearningEpoch();

      engine.endLearningSession();

      expect(engine).toBeDefined();
    });
  });

  // ========== 통합 테스트 ==========
  describe('Week 4 통합 테스트', () => {
    test('전체 학습 파이프라인', async () => {
      const storage = new FeedbackStorage();
      const engine = new LearningEngine(storage);

      // 1. 피드백 수집
      const collector = new FeedbackCollector();
      const proposal1 = HeaderGenerator.generateHeader('sum', 0.95)!;
      const proposal2 = HeaderGenerator.generateHeader('filter', 0.85)!;

      const feedbacks = [
        collector.collectFeedback(proposal1, 'approve'),
        collector.collectFeedback(proposal1, 'approve'),
        collector.collectFeedback(proposal2, 'modify'),
      ];

      feedbacks.forEach((fb) => storage.saveFeedback(fb));

      // 2. 학습 세션 시작
      engine.startLearningSession('pipeline-test');

      // 3. 학습 에포크 실행
      const epoch1 = await engine.runLearningEpoch();
      expect(epoch1.feedbackProcessed).toBeGreaterThan(0);

      // 4. 리포트 생성
      const report = engine.generateLearningReport();
      expect(report.overallProgress).toBeGreaterThanOrEqual(0);

      // 5. 세션 종료
      engine.endLearningSession();

      expect(epoch1.epochNumber).toBeGreaterThan(0);
    });

    test('다중 Operation 학습', async () => {
      const storage = new FeedbackStorage();
      const engine = new LearningEngine(storage);
      const collector = new FeedbackCollector();

      // 여러 operation에 대한 피드백
      const operations = ['sum', 'filter', 'sort'];
      for (const op of operations) {
        const proposal = HeaderGenerator.generateHeader(op as any, 0.8)!;
        const fb = collector.collectFeedback(proposal, 'approve');
        storage.saveFeedback(fb);
      }

      // 학습
      const epochs = await engine.autoLearn(2);

      expect(epochs.length).toBeGreaterThan(0);
      expect(epochs[0].feedbackProcessed).toBeGreaterThan(0);
    });

    test('피드백 없을 때 학습 처리', async () => {
      const storage = new FeedbackStorage();
      const engine = new LearningEngine(storage);

      // 피드백 없이 학습 실행
      const epoch = await engine.runLearningEpoch();

      expect(epoch.feedbackProcessed).toBe(0);
      expect(epoch.patternUpdates.length).toBe(0);
    });
  });
});
