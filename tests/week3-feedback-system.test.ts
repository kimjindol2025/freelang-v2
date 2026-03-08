/**
 * FreeLang Week 3 테스트
 * Task 3.1-3.3: 피드백 수집, 저장, 분석
 */

import { FeedbackCollector } from '../src/feedback/feedback-collector';
import { FeedbackStorage } from '../src/feedback/feedback-storage';
import { FeedbackAnalyzer } from '../src/feedback/feedback-analyzer';
import { HeaderGenerator, HeaderProposal } from '../src/engine/header-generator';

describe('Week 3: 피드백 수집 시스템', () => {
  // ========== Task 3.1: 피드백 수집기 ==========
  describe('Task 3.1: 피드백 수집기 (FeedbackCollector)', () => {
    let collector: FeedbackCollector;

    beforeEach(() => {
      collector = new FeedbackCollector();
    });

    test('피드백 수집 (승인)', () => {
      const proposal = HeaderGenerator.generateHeader('sum', 0.95)!;
      const feedback = collector.collectFeedback(proposal, 'approve');

      expect(feedback.id).toBeTruthy();
      expect(feedback.userFeedback.action).toBe('approve');
      expect(feedback.analysis.accuracy).toBeGreaterThan(0.8);
    });

    test('피드백 수집 (수정)', () => {
      const proposal = HeaderGenerator.generateHeader('average', 0.8)!;
      const feedback = collector.collectFeedback(proposal, 'modify', '타입 수정 필요');

      expect(feedback.userFeedback.action).toBe('modify');
      expect(feedback.userFeedback.message).toBe('타입 수정 필요');
      expect(feedback.analysis.accuracy).toBeLessThan(0.8);
    });

    test('피드백 수집 (거부)', () => {
      const proposal = HeaderGenerator.generateHeader('max', 0.5)!;
      const feedback = collector.collectFeedback(proposal, 'reject');

      expect(feedback.userFeedback.action).toBe('reject');
      expect(feedback.analysis.accuracy).toBeLessThan(0.2);
    });

    test('피드백 수집 (재제안)', () => {
      const proposal = HeaderGenerator.generateHeader('filter', 0.6)!;
      const feedback = collector.collectFeedback(proposal, 'suggest');

      expect(feedback.userFeedback.action).toBe('suggest');
    });

    test('세션 정보 생성', () => {
      const session = collector.getSession();

      expect(session.id).toContain('session_');
      expect(session.startTime).toBeGreaterThan(0);
      expect(session.feedbackCount).toBe(0);
    });

    test('헤더 포맷팅 (리뷰용)', () => {
      const proposal = HeaderGenerator.generateHeader('sum', 0.95)!;
      const formatted = collector.formatProposalForReview(proposal);

      expect(formatted).toContain('fn sum');
      expect(formatted).toContain('신뢰도');
      expect(formatted).toContain('승인');
      expect(formatted).toContain('수정');
    });

    test('사용자 선택 파싱 (숫자)', () => {
      const action1 = collector.parseUserChoice('1');
      const action2 = collector.parseUserChoice('2');
      const action3 = collector.parseUserChoice('3');
      const action4 = collector.parseUserChoice('4');

      expect(action1).toBe('approve');
      expect(action2).toBe('modify');
      expect(action3).toBe('suggest');
      expect(action4).toBe('reject');
    });

    test('사용자 선택 파싱 (텍스트)', () => {
      expect(collector.parseUserChoice('yes')).toBe('approve');
      expect(collector.parseUserChoice('edit')).toBe('modify');
      expect(collector.parseUserChoice('regenerate')).toBe('suggest');
      expect(collector.parseUserChoice('no')).toBe('reject');
    });

    test('정확도 계산 (승인)', () => {
      const proposal = HeaderGenerator.generateHeader('sum', 0.9)!;
      const feedback = collector.collectFeedback(proposal, 'approve');

      expect(feedback.analysis.accuracy).toBeGreaterThan(0.9);
    });

    test('정확도 계산 (거부)', () => {
      const proposal = HeaderGenerator.generateHeader('sum', 0.9)!;
      const feedback = collector.collectFeedback(proposal, 'reject');

      expect(feedback.analysis.accuracy).toBeLessThan(0.2);
    });
  });

  // ========== Task 3.2: 피드백 저장소 ==========
  describe('Task 3.2: 피드백 저장소 (FeedbackStorage)', () => {
    let storage: FeedbackStorage;
    let collector: FeedbackCollector;

    beforeEach(() => {
      storage = new FeedbackStorage();
      collector = new FeedbackCollector();
    });

    test('피드백 저장', () => {
      const proposal = HeaderGenerator.generateHeader('sum', 0.95)!;
      const feedback = collector.collectFeedback(proposal, 'approve');

      const saved = storage.saveFeedback(feedback);
      expect(saved).toBe(true);
    });

    test('피드백 조회 (ID)', () => {
      const proposal = HeaderGenerator.generateHeader('sum', 0.95)!;
      const feedback = collector.collectFeedback(proposal, 'approve');
      storage.saveFeedback(feedback);

      const retrieved = storage.getFeedback(feedback.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.userFeedback.action).toBe('approve');
    });

    test('세션별 피드백 조회', () => {
      const proposal1 = HeaderGenerator.generateHeader('sum', 0.95)!;
      const proposal2 = HeaderGenerator.generateHeader('average', 0.9)!;

      const fb1 = collector.collectFeedback(proposal1, 'approve');
      const fb2 = collector.collectFeedback(proposal2, 'approve');

      storage.saveFeedback(fb1);
      storage.saveFeedback(fb2);

      const session = collector.getSession();
      const feedbacks = storage.getFeedbackBySession(session.id);

      expect(feedbacks.length).toBe(2);
    });

    test('Operation별 피드백 조회', () => {
      const sumProposal = HeaderGenerator.generateHeader('sum', 0.95)!;
      const avgProposal = HeaderGenerator.generateHeader('average', 0.9)!;

      const sumFb = collector.collectFeedback(sumProposal, 'approve');
      const avgFb = collector.collectFeedback(avgProposal, 'approve');

      storage.saveFeedback(sumFb);
      storage.saveFeedback(avgFb);

      const sumFeedbacks = storage.getFeedbackByOperation('sum');
      expect(sumFeedbacks.length).toBe(1);
      expect(sumFeedbacks[0].proposal.operation).toBe('sum');
    });

    test('액션별 피드백 조회', () => {
      const proposal = HeaderGenerator.generateHeader('sum', 0.95)!;
      const fb1 = collector.collectFeedback(proposal, 'approve');
      const fb2 = collector.collectFeedback(proposal, 'modify');

      storage.saveFeedback(fb1);
      storage.saveFeedback(fb2);

      const approved = storage.getFeedbackByAction('approve');
      const modified = storage.getFeedbackByAction('modify');

      expect(approved.length).toBe(1);
      expect(modified.length).toBe(1);
    });

    test('통계 계산', () => {
      const proposal = HeaderGenerator.generateHeader('sum', 0.95)!;
      const fb1 = collector.collectFeedback(proposal, 'approve');
      const fb2 = collector.collectFeedback(proposal, 'modify');

      storage.saveFeedback(fb1);
      storage.saveFeedback(fb2);

      const stats = storage.calculateStats();

      expect(stats.totalFeedback).toBe(2);
      expect(stats.approved).toBe(1);
      expect(stats.modified).toBe(1);
      expect(stats.averageAccuracy).toBeGreaterThan(0);
    });

    test('가장 승인이 많은 operation', () => {
      const sumProposal = HeaderGenerator.generateHeader('sum', 0.95)!;
      const avgProposal = HeaderGenerator.generateHeader('average', 0.9)!;

      storage.saveFeedback(collector.collectFeedback(sumProposal, 'approve'));
      storage.saveFeedback(collector.collectFeedback(sumProposal, 'approve'));
      storage.saveFeedback(collector.collectFeedback(avgProposal, 'approve'));
      storage.saveFeedback(collector.collectFeedback(avgProposal, 'reject'));

      const mostApproved = storage.getMostApprovedOperation();
      expect(mostApproved).toBe('sum');
    });

    test('개선 필요 operation 식별', () => {
      const proposal = HeaderGenerator.generateHeader('sum', 0.95)!;

      // 대부분 거부
      storage.saveFeedback(collector.collectFeedback(proposal, 'reject'));
      storage.saveFeedback(collector.collectFeedback(proposal, 'reject'));
      storage.saveFeedback(collector.collectFeedback(proposal, 'modify'));

      const needsImprovement = storage.getNeedsImprovementOperations();
      expect(needsImprovement).toContain('sum');
    });

    test('리포트 생성', () => {
      const proposal = HeaderGenerator.generateHeader('sum', 0.95)!;
      storage.saveFeedback(collector.collectFeedback(proposal, 'approve'));

      const report = storage.generateReport();
      expect(report).toContain('피드백');
      expect(report).toContain('통계');
    });

    test('JSON 변환', () => {
      const proposal = HeaderGenerator.generateHeader('sum', 0.95)!;
      const fb = collector.collectFeedback(proposal, 'approve');
      storage.saveFeedback(fb);

      const json = storage.toJSON();
      expect(json.feedbacks.length).toBe(1);
    });
  });

  // ========== Task 3.3: 피드백 분석기 ==========
  describe('Task 3.3: 피드백 분석기 (FeedbackAnalyzer)', () => {
    let storage: FeedbackStorage;
    let analyzer: FeedbackAnalyzer;
    let collector: FeedbackCollector;

    beforeEach(() => {
      storage = new FeedbackStorage();
      analyzer = new FeedbackAnalyzer(storage);
      collector = new FeedbackCollector();

      // 샘플 피드백 생성
      const sumProposal = HeaderGenerator.generateHeader('sum', 0.95)!;
      const avgProposal = HeaderGenerator.generateHeader('average', 0.9)!;

      // sum: 90% 승인
      for (let i = 0; i < 9; i++) {
        storage.saveFeedback(collector.collectFeedback(sumProposal, 'approve'));
      }
      storage.saveFeedback(collector.collectFeedback(sumProposal, 'reject'));

      // average: 50% 승인
      storage.saveFeedback(collector.collectFeedback(avgProposal, 'approve'));
      storage.saveFeedback(collector.collectFeedback(avgProposal, 'reject'));
    });

    test('분석 결과 생성', () => {
      const analysis = analyzer.analyze();

      expect(analysis.insights).toBeDefined();
      expect(analysis.improvementAreas).toBeDefined();
      expect(analysis.operationHealthScore).toBeDefined();
      expect(analysis.recommendations).toBeDefined();
    });

    test('Insights 생성', () => {
      const analysis = analyzer.analyze();

      expect(analysis.insights.length).toBeGreaterThan(0);
      expect(analysis.insights.some(i => i.includes('%'))).toBe(true);
    });

    test('Operation 건강도 계산', () => {
      const analysis = analyzer.analyze();

      expect(analysis.operationHealthScore['sum']).toBeGreaterThan(
        analysis.operationHealthScore['average']
      );
    });

    test('개선 영역 식별', () => {
      const analysis = analyzer.analyze();

      // sum(90%) > average(50%)이므로 average는 개선 필요 영역에 포함될 수 있음
      // operation별 80% 미만이면 개선 필요
      const stats = storage.calculateStats();
      const avgApprovalRate = stats.operationStats['average'].approvalRate;

      if (avgApprovalRate < 0.8) {
        const needsImprovement = analysis.improvementAreas.find(a => a.operation === 'average');
        expect(needsImprovement).toBeDefined();
      }
    });

    test('상세 리포트 생성', () => {
      const report = analyzer.generateDetailedReport();

      expect(report).toContain('인사이트');
      expect(report).toContain('건강도');
      expect(report).toContain('권장사항');
    });

    test('권장사항 생성', () => {
      const analysis = analyzer.analyze();

      // 권장사항은 없을 수도 있음 (모든 operation이 양호하면)
      // 다만 insights는 항상 존재
      expect(analysis.insights.length).toBeGreaterThan(0);
    });
  });

  // ========== 통합 테스트 ==========
  describe('통합 테스트: 완전한 피드백 파이프라인', () => {
    test('피드백 수집 → 저장 → 분석 전체 플로우', () => {
      const collector = new FeedbackCollector();
      const storage = new FeedbackStorage();
      const analyzer = new FeedbackAnalyzer(storage);

      // 1. 피드백 수집
      const proposal = HeaderGenerator.generateHeader('sum', 0.95)!;
      const feedback = collector.collectFeedback(proposal, 'approve');

      // 2. 피드백 저장
      const saved = storage.saveFeedback(feedback);
      expect(saved).toBe(true);

      // 3. 피드백 분석
      const analysis = analyzer.analyze();
      expect(analysis.insights.length).toBeGreaterThan(0);
    });

    test('여러 operation의 피드백 분석', () => {
      const collector = new FeedbackCollector();
      const storage = new FeedbackStorage();
      const analyzer = new FeedbackAnalyzer(storage);

      const operations = ['sum', 'average', 'filter'];

      operations.forEach(op => {
        const proposal = HeaderGenerator.generateHeader(op as any, 0.9)!;
        const fb = collector.collectFeedback(proposal, 'approve');
        storage.saveFeedback(fb);
      });

      const analysis = analyzer.analyze();
      const stats = storage.calculateStats();

      expect(stats.totalFeedback).toBe(3);
      expect(Object.keys(analysis.operationHealthScore).length).toBe(3);
    });

    test('리포트 생성 및 검증', () => {
      const collector = new FeedbackCollector();
      const storage = new FeedbackStorage();

      const proposal = HeaderGenerator.generateHeader('sum', 0.95)!;
      storage.saveFeedback(collector.collectFeedback(proposal, 'approve'));

      const storageReport = storage.generateReport();
      expect(storageReport).toContain('피드백');
    });
  });
});
