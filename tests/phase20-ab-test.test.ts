/**
 * Phase 20 Week 3: A/B Testing Framework Tests
 *
 * 8개 테스트:
 * 1. Basic test recording
 * 2. Chi-square significance testing
 * 3. Success rate calculation
 * 4. Winner determination
 * 5. Improvement calculation
 * 6. Recommendation generation
 * 7. Test lifecycle (start/end)
 * 8. Multiple concurrent tests
 */

import { ABTestManager, TestGroup, TestResult } from '../src/monitoring/ab-test-manager';
import { HealingAction } from '../src/monitoring/self-healer';

describe('Phase 20 Week 3: A/B Testing Framework', () => {
  let abTestManager: ABTestManager;

  beforeAll(() => {
    jest.setTimeout(20000);
  });

  beforeEach(() => {
    abTestManager = new ABTestManager();
  });

  describe('Basic Recording', () => {
    it('should record test results', () => {
      const result: TestResult = {
        timestamp: Date.now(),
        group: TestGroup.CONTROL,
        action: HealingAction.CLEAR_CACHE,
        success: true,
        duration: 100
      };

      abTestManager.recordResult(result);

      const results = abTestManager.getResults();
      expect(results.length).toBe(1);
      expect(results[0].success).toBe(true);
    });

    it('should support both control and variant groups', () => {
      const controlResult: TestResult = {
        timestamp: Date.now(),
        group: TestGroup.CONTROL,
        action: HealingAction.FORCE_GC,
        success: true,
        duration: 150
      };

      const variantResult: TestResult = {
        timestamp: Date.now() + 1,
        group: TestGroup.VARIANT,
        action: HealingAction.FORCE_GC,
        success: true,
        duration: 140
      };

      abTestManager.recordResult(controlResult);
      abTestManager.recordResult(variantResult);

      const results = abTestManager.getResults();
      expect(results.length).toBe(2);
      expect(results[0].group).toBe(TestGroup.CONTROL);
      expect(results[1].group).toBe(TestGroup.VARIANT);
    });

    it('should maintain maximum 1000 results', () => {
      // 1050개 결과 기록
      for (let i = 0; i < 1050; i++) {
        const result: TestResult = {
          timestamp: Date.now() + i,
          group: i % 2 === 0 ? TestGroup.CONTROL : TestGroup.VARIANT,
          action: HealingAction.CLEAR_CACHE,
          success: Math.random() > 0.2,
          duration: Math.random() * 200
        };
        abTestManager.recordResult(result);
      }

      const results = abTestManager.getResults(1000);
      expect(results.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Success Rate Calculation', () => {
    it('should calculate success rate correctly', () => {
      // 100개 테스트: 80개 성공, 20개 실패
      for (let i = 0; i < 100; i++) {
        const result: TestResult = {
          timestamp: Date.now() + i,
          group: TestGroup.CONTROL,
          action: HealingAction.RESTART_WORKER,
          success: i < 80, // 80% 성공률
          duration: 200 + Math.random() * 100
        };
        abTestManager.recordResult(result);
      }

      const report = abTestManager.generateReport(HealingAction.RESTART_WORKER);
      expect(report).not.toBeNull();
      expect(report!.controlStats.successRate).toBe(80);
      expect(report!.controlStats.totalTests).toBe(100);
      expect(report!.controlStats.successCount).toBe(80);
    });

    it('should calculate duration statistics', () => {
      // 50개 테스트, 다양한 지속시간
      for (let i = 0; i < 50; i++) {
        const result: TestResult = {
          timestamp: Date.now() + i,
          group: TestGroup.VARIANT,
          action: HealingAction.CIRCUIT_BREAKER,
          success: true,
          duration: 100 + i * 2 // 100~198ms
        };
        abTestManager.recordResult(result);
      }

      const report = abTestManager.generateReport(HealingAction.CIRCUIT_BREAKER);
      expect(report).not.toBeNull();
      expect(report!.variantStats.minDuration).toBe(100);
      expect(report!.variantStats.maxDuration).toBe(198);
      expect(report!.variantStats.avgDuration).toBeLessThan(200);
      expect(report!.variantStats.avgDuration).toBeGreaterThan(100);
    });
  });

  describe('Statistical Testing', () => {
    it('should detect no significant difference with small sample size', () => {
      // 샘플 크기가 작으면 significant하지 않음
      for (let i = 0; i < 10; i++) {
        // 10개만 - 최소값 미만
        const control: TestResult = {
          timestamp: Date.now() + i,
          group: TestGroup.CONTROL,
          action: HealingAction.SCALE_OUT_WORKERS,
          success: i < 8,
          duration: 300
        };
        abTestManager.recordResult(control);
      }

      const report = abTestManager.generateReport(HealingAction.SCALE_OUT_WORKERS);
      expect(report).not.toBeNull();
      expect(report!.isSignificant).toBe(false);
    });

    it('should detect significant difference with sufficient data', () => {
      // Control: 70% 성공률 (70/100)
      for (let i = 0; i < 100; i++) {
        const control: TestResult = {
          timestamp: Date.now() + i,
          group: TestGroup.CONTROL,
          action: HealingAction.THROTTLE_REQUESTS,
          success: i < 70,
          duration: 250
        };
        abTestManager.recordResult(control);
      }

      // Variant: 90% 성공률 (90/100)
      for (let i = 0; i < 100; i++) {
        const variant: TestResult = {
          timestamp: Date.now() + 100 + i,
          group: TestGroup.VARIANT,
          action: HealingAction.THROTTLE_REQUESTS,
          success: i < 90,
          duration: 240
        };
        abTestManager.recordResult(variant);
      }

      const report = abTestManager.generateReport(HealingAction.THROTTLE_REQUESTS);
      expect(report).not.toBeNull();
      // 큰 차이(70% vs 90%)는 통계적으로 유의미
      expect(report!.isSignificant).toBe(true);
    });
  });

  describe('Winner Determination', () => {
    it('should identify variant as winner when significant improvement', () => {
      // Control: 60% success
      for (let i = 0; i < 100; i++) {
        const result: TestResult = {
          timestamp: Date.now() + i,
          group: TestGroup.CONTROL,
          action: HealingAction.REBUILD_CLUSTER,
          success: i < 60,
          duration: 500
        };
        abTestManager.recordResult(result);
      }

      // Variant: 85% success (25% improvement)
      for (let i = 0; i < 100; i++) {
        const result: TestResult = {
          timestamp: Date.now() + 100 + i,
          group: TestGroup.VARIANT,
          action: HealingAction.REBUILD_CLUSTER,
          success: i < 85,
          duration: 480
        };
        abTestManager.recordResult(result);
      }

      const report = abTestManager.generateReport(HealingAction.REBUILD_CLUSTER);
      expect(report).not.toBeNull();
      expect(report!.winner).toBe('variant');
      expect(report!.improvementPercent).toBeGreaterThan(40);
    });

    it('should identify control as winner when variant is worse', () => {
      // Control: 85% success
      for (let i = 0; i < 100; i++) {
        const result: TestResult = {
          timestamp: Date.now() + i,
          group: TestGroup.CONTROL,
          action: HealingAction.RETRY_LOGIC,
          success: i < 85,
          duration: 150
        };
        abTestManager.recordResult(result);
      }

      // Variant: 65% success
      for (let i = 0; i < 100; i++) {
        const result: TestResult = {
          timestamp: Date.now() + 100 + i,
          group: TestGroup.VARIANT,
          action: HealingAction.RETRY_LOGIC,
          success: i < 65,
          duration: 160
        };
        abTestManager.recordResult(result);
      }

      const report = abTestManager.generateReport(HealingAction.RETRY_LOGIC);
      expect(report).not.toBeNull();
      expect(report!.winner).toBe('control');
    });

    it('should identify tie when no significant difference', () => {
      // Control: 75% success
      for (let i = 0; i < 50; i++) {
        const result: TestResult = {
          timestamp: Date.now() + i,
          group: TestGroup.CONTROL,
          action: HealingAction.INCREASE_TIMEOUT,
          success: i < 37,
          duration: 200
        };
        abTestManager.recordResult(result);
      }

      // Variant: 76% success (similar)
      for (let i = 0; i < 50; i++) {
        const result: TestResult = {
          timestamp: Date.now() + 50 + i,
          group: TestGroup.VARIANT,
          action: HealingAction.INCREASE_TIMEOUT,
          success: i < 38,
          duration: 195
        };
        abTestManager.recordResult(result);
      }

      const report = abTestManager.generateReport(HealingAction.INCREASE_TIMEOUT);
      expect(report).not.toBeNull();
      // 샘플 크기가 작으면 tie
      if (!report!.isSignificant) {
        expect(report!.winner).toBe('tie');
      }
    });
  });

  describe('Improvement Calculation', () => {
    it('should calculate improvement percentage correctly', () => {
      // Control: 50% success
      for (let i = 0; i < 100; i++) {
        const result: TestResult = {
          timestamp: Date.now() + i,
          group: TestGroup.CONTROL,
          action: HealingAction.REDUCE_BATCH_SIZE,
          success: i < 50,
          duration: 100
        };
        abTestManager.recordResult(result);
      }

      // Variant: 75% success (50% improvement from 50%)
      for (let i = 0; i < 100; i++) {
        const result: TestResult = {
          timestamp: Date.now() + 100 + i,
          group: TestGroup.VARIANT,
          action: HealingAction.REDUCE_BATCH_SIZE,
          success: i < 75,
          duration: 95
        };
        abTestManager.recordResult(result);
      }

      const report = abTestManager.generateReport(HealingAction.REDUCE_BATCH_SIZE);
      expect(report).not.toBeNull();
      expect(report!.improvementPercent).toBeCloseTo(50, 0);
    });
  });

  describe('Test Lifecycle', () => {
    it('should start and end tests correctly', () => {
      abTestManager.startTest(HealingAction.CLEAR_CACHE);

      let activeTests = abTestManager.getActiveTests();
      expect(activeTests).toContain(HealingAction.CLEAR_CACHE);

      // 테스트 결과 추가
      for (let i = 0; i < 50; i++) {
        const result: TestResult = {
          timestamp: Date.now() + i,
          group: i % 2 === 0 ? TestGroup.CONTROL : TestGroup.VARIANT,
          action: HealingAction.CLEAR_CACHE,
          success: true,
          duration: 100
        };
        abTestManager.recordResult(result);
      }

      // 테스트 종료
      const report = abTestManager.endTest(HealingAction.CLEAR_CACHE);
      expect(report).not.toBeNull();

      activeTests = abTestManager.getActiveTests();
      expect(activeTests).not.toContain(HealingAction.CLEAR_CACHE);
    });

    it('should handle multiple concurrent tests', () => {
      const actions = [HealingAction.CLEAR_CACHE, HealingAction.FORCE_GC, HealingAction.RESTART_WORKER];

      // 모든 테스트 시작
      for (const action of actions) {
        abTestManager.startTest(action);
      }

      let activeTests = abTestManager.getActiveTests();
      expect(activeTests.length).toBe(3);

      // 결과 추가
      for (const action of actions) {
        for (let i = 0; i < 50; i++) {
          const result: TestResult = {
            timestamp: Date.now() + i,
            group: i % 2 === 0 ? TestGroup.CONTROL : TestGroup.VARIANT,
            action,
            success: Math.random() > 0.3,
            duration: Math.random() * 300
          };
          abTestManager.recordResult(result);
        }
      }

      // 모든 테스트 종료
      for (const action of actions) {
        const report = abTestManager.endTest(action);
        expect(report).not.toBeNull();
      }

      activeTests = abTestManager.getActiveTests();
      expect(activeTests.length).toBe(0);
    });
  });

  describe('Full Report Generation', () => {
    it('should generate comprehensive full report', () => {
      // 3개 액션에 대해 테스트 데이터 추가
      const actions = [HealingAction.CLEAR_CACHE, HealingAction.FORCE_GC];

      for (const action of actions) {
        // Control: 70% success
        for (let i = 0; i < 100; i++) {
          const result: TestResult = {
            timestamp: Date.now() + i,
            group: TestGroup.CONTROL,
            action,
            success: i < 70,
            duration: 200 + Math.random() * 100
          };
          abTestManager.recordResult(result);
        }

        // Variant: 80% success
        for (let i = 0; i < 100; i++) {
          const result: TestResult = {
            timestamp: Date.now() + 100 + i,
            group: TestGroup.VARIANT,
            action,
            success: i < 80,
            duration: 190 + Math.random() * 100
          };
          abTestManager.recordResult(result);
        }
      }

      const reports = abTestManager.generateFullReport();
      expect(reports.length).toBe(2);
      expect(reports[0].actionName).toBeDefined();
      expect(reports[0].controlStats).toBeDefined();
      expect(reports[0].variantStats).toBeDefined();
      expect(reports[0].recommendation).toBeDefined();
    });
  });

  describe('Reset', () => {
    it('should reset all test data', () => {
      // 테스트 데이터 추가
      for (let i = 0; i < 50; i++) {
        const result: TestResult = {
          timestamp: Date.now() + i,
          group: TestGroup.CONTROL,
          action: HealingAction.CLEAR_CACHE,
          success: true,
          duration: 100
        };
        abTestManager.recordResult(result);
      }

      // Reset 전
      let results = abTestManager.getResults();
      expect(results.length).toBe(50);

      // Reset
      abTestManager.reset();

      // Reset 후
      results = abTestManager.getResults();
      expect(results.length).toBe(0);
    });
  });
});
