/**
 * Phase 9.1: CLI Tool Enhancement Tests
 *
 * 대화형 모드, 배치 모드, 명령 처리 검증
 */

import { InteractiveMode } from '../src/cli/interactive';
import { BatchMode } from '../src/cli/batch';
import { feedbackCollector } from '../src/feedback/collector';

describe('Phase 9.1: CLI Tool Enhancement', () => {
  // ============================================================================
  // 1️⃣ 명령 파싱
  // ============================================================================
  describe('명령 파싱', () => {
    let interactive: InteractiveMode;

    beforeEach(() => {
      interactive = new InteractiveMode();
    });

    test('승인 명령 파싱', () => {
      const cmd = interactive.parseCommand('A');
      expect(cmd.action).toBe('approve');
    });

    test('거부 명령 파싱', () => {
      const cmd = interactive.parseCommand('R');
      expect(cmd.action).toBe('reject');
    });

    test('수정 명령 파싱', () => {
      const cmd = interactive.parseCommand('modify fn:newname');
      expect(cmd.action).toBe('modify');
      expect(cmd.modification).toBeDefined();
    });

    test('도움말 명령 파싱', () => {
      const cmd = interactive.parseCommand('?');
      expect(cmd.action).toBe('help');
    });

    test('종료 명령 파싱', () => {
      const cmd = interactive.parseCommand('quit');
      expect(cmd.action).toBe('quit');
    });
  });

  // ============================================================================
  // 2️⃣ 자동완성
  // ============================================================================
  describe('자동완성', () => {
    let interactive: InteractiveMode;

    beforeEach(() => {
      interactive = new InteractiveMode();
    });

    test('자동완성 제안 조회', () => {
      const suggestions = interactive.getAutocompletesuggestions('sum');
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('빈 입력 시 제안 없음', () => {
      const suggestions = interactive.getAutocompletesuggestions('');
      expect(suggestions.length).toBe(0);
    });

    test('자동완성 제안 표시', () => {
      interactive.showAutocompleteSuggestions('sum');
      // 메서드 실행 확인
      expect(interactive).not.toBeNull();
    });
  });

  // ============================================================================
  // 3️⃣ 히스토리 관리
  // ============================================================================
  describe('히스토리 관리', () => {
    let interactive: InteractiveMode;

    beforeEach(() => {
      interactive = new InteractiveMode();
    });

    test('히스토리 기록', () => {
      interactive.recordHistory('배열 합산');
      interactive.recordHistory('배열 필터링');

      const history = interactive.getHistory(10);
      expect(history.length).toBe(2);
    });

    test('히스토리 조회 제한', () => {
      for (let i = 0; i < 20; i++) {
        interactive.recordHistory(`명령 ${i}`);
      }

      const history = interactive.getHistory(10);
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history.length).toBeLessThanOrEqual(10);
    });

    test('히스토리 클리어', () => {
      interactive.recordHistory('명령1');
      interactive.clearHistory();

      const history = interactive.getHistory();
      expect(history.length).toBe(0);
    });

    test('히스토리 표시 포맷', () => {
      interactive.recordHistory('배열 합산');
      const display = interactive.showHistory();

      expect(display).toContain('배열 합산');
    });
  });

  // ============================================================================
  // 4️⃣ 도움말 및 통계
  // ============================================================================
  describe('도움말 및 통계', () => {
    let interactive: InteractiveMode;

    beforeEach(() => {
      interactive = new InteractiveMode();
    });

    test('도움말 표시', () => {
      const help = interactive.showHelp();

      expect(help).toContain('명령어');
      expect(help).toContain('[A]');
      expect(help).toContain('[R]');
    });

    test('통계 표시', () => {
      const stats = interactive.showStats();

      expect(stats).toContain('학습 통계');
      expect(stats).toContain('패턴');
      expect(stats).toContain('신뢰도');
    });

    test('프롬프트 표시', () => {
      const prompt = interactive.showPrompt();

      expect(prompt).toContain('❯');
    });
  });

  // ============================================================================
  // 5️⃣ 제안 포맷팅
  // ============================================================================
  describe('제안 포맷팅', () => {
    let interactive: InteractiveMode;

    beforeEach(() => {
      interactive = new InteractiveMode();
      feedbackCollector.clear();
    });

    test('제안 표시 포맷', () => {
      const proposal = interactive.formatProposal(
        '배열 합산',
        'sum',
        0.95,
        '배열 합산 함수'
      );

      expect(proposal).toContain('배열 합산');
      expect(proposal).toContain('sum');
      expect(proposal).toContain('95%');
      expect(proposal).toContain('배열 합산 함수');
    });

    test('신뢰도 바 포맷팅', () => {
      const proposal = interactive.formatProposal(
        '테스트',
        'test',
        0.5,
        '테스트'
      );

      expect(proposal).toContain('50%');
    });
  });

  // ============================================================================
  // 6️⃣ 피드백 기록
  // ============================================================================
  describe('피드백 기록', () => {
    let interactive: InteractiveMode;

    beforeEach(() => {
      interactive = new InteractiveMode();
      feedbackCollector.clear();
    });

    test('승인 피드백 기록', () => {
      const success = interactive.recordFeedback(
        '배열 합산',
        'sum',
        'approve'
      );

      expect(success).toBe(true);
    });

    test('거부 피드백 기록', () => {
      const success = interactive.recordFeedback(
        '배열 합산',
        'sum',
        'reject'
      );

      expect(success).toBe(true);
    });

    test('수정 피드백 기록', () => {
      const success = interactive.recordFeedback(
        '배열 합산',
        'sum',
        'modify',
        { fn: 'sumAll' }
      );

      expect(success).toBe(true);
    });
  });

  // ============================================================================
  // 7️⃣ 배치 모드
  // ============================================================================
  describe('배치 모드', () => {
    let batch: BatchMode;

    beforeEach(() => {
      batch = new BatchMode();
      feedbackCollector.clear();
    });

    test('배치 처리', async () => {
      const inputs = ['배열 합산', '배열 필터링', '배열 정렬'];
      const results = await batch.processBatch(inputs);

      expect(results.length).toBe(3);
      expect(results[0].input).toBe('배열 합산');
    });

    test('빈 입력 무시', async () => {
      const inputs = ['배열 합산', '', '배열 필터링'];
      const results = await batch.processBatch(inputs);

      expect(results.length).toBe(2);
    });

    test('결과 요약', async () => {
      const inputs = ['배열 합산'];
      await batch.processBatch(inputs);

      const summary = batch.summarize();

      expect(summary).toContain('배치 처리 결과');
      expect(summary).toContain('처리됨');
      expect(summary).toContain('성공');
    });
  });

  // ============================================================================
  // 8️⃣ 배치 결과 내보내기
  // ============================================================================
  describe('배치 결과 내보내기', () => {
    let batch: BatchMode;

    beforeEach(() => {
      batch = new BatchMode();
      feedbackCollector.clear();
    });

    test('JSON 내보내기', async () => {
      const inputs = ['배열 합산'];
      await batch.processBatch(inputs);

      const json = batch.exportAsJSON();

      expect(json).toContain('timestamp');
      expect(json).toContain('total');
      expect(json).toContain('results');
    });

    test('CSV 내보내기', async () => {
      const inputs = ['배열 합산'];
      await batch.processBatch(inputs);

      const csv = batch.exportAsCSV();

      expect(csv).toContain('Input');
      expect(csv).toContain('FunctionName');
      expect(csv).toContain('배열 합산');
    });

    test('결과 파일 저장', async () => {
      const inputs = ['배열 합산'];
      await batch.processBatch(inputs);

      const success = await batch.saveResults('/tmp/results.json');

      expect(typeof success).toBe('boolean');
    });
  });

  // ============================================================================
  // 9️⃣ 초기화 및 상태 관리
  // ============================================================================
  describe('초기화 및 상태 관리', () => {
    let interactive: InteractiveMode;
    let batch: BatchMode;

    beforeEach(() => {
      interactive = new InteractiveMode();
      batch = new BatchMode();
    });

    test('InteractiveMode 초기화', () => {
      interactive.recordHistory('명령');
      interactive.clear();

      const history = interactive.getHistory();
      expect(history.length).toBe(0);
    });

    test('BatchMode 초기화', async () => {
      await batch.processBatch(['입력1', '입력2']);
      batch.clear();

      const summary = batch.summarize();
      expect(summary).toContain('0개');
    });
  });
});
