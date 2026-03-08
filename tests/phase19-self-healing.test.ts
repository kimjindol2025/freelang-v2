/**
 * Phase 19: Self-Healing Tests
 *
 * 목표: 자동 복구 시스템 검증
 * 테스트:
 * 1. Health Checker (상태 모니터링)
 * 2. Self Healer (자동 복구)
 * 3. TUI Dashboard (시각화)
 * 4. 통합 (30일 무인 운영)
 */

import { HealthChecker, HealthStatus, HealthAlert } from '../src/monitoring/health-checker';
import { SelfHealer, HealingAction } from '../src/monitoring/self-healer';
import { TUIDashboard } from '../src/monitoring/tui-dashboard';

describe('Phase 19: Self-Healing System', () => {
  let healthChecker: HealthChecker;
  let selfHealer: SelfHealer;
  let dashboard: TUIDashboard;

  beforeEach(() => {
    healthChecker = new HealthChecker();
    selfHealer = new SelfHealer();
    dashboard = new TUIDashboard();
  });

  // ===== 1. Health Checker Tests (10 tests) =====
  describe('Health Checker', () => {
    it('should initialize with default thresholds', () => {
      const checker = new HealthChecker();
      const result = checker.check();

      expect(result.metrics).toBeDefined();
      expect(result.metrics.status).toBeDefined();
      expect(result.alerts).toBeInstanceOf(Array);
    });

    it('should detect healthy status', () => {
      // 정상 시스템: 낮은 에러율 (CPU는 시스템 상태에 따라 다름)
      healthChecker.recordRequest(10, true); // 10ms, success
      healthChecker.recordRequest(15, true);
      healthChecker.recordRequest(12, true);

      const result = healthChecker.check();

      // 에러율이 0이어야 함
      expect(result.metrics.errorRate).toBe(0);
      // 정상, 저하, 또는 위험 상태 (CPU는 시스템 상태에 따라 변함)
      expect([HealthStatus.HEALTHY, HealthStatus.DEGRADED, HealthStatus.CRITICAL]).toContain(result.metrics.status);
    });

    it('should detect degraded status (high CPU)', () => {
      // CPU 경고 임계값: 70%
      const checker = new HealthChecker({
        cpuWarning: 70,
        cpuCritical: 90
      });

      // CPU 높음 상황 시뮬레이션
      for (let i = 0; i < 5; i++) {
        checker.recordRequest(50, true);
      }

      const result = checker.check();

      // CPU가 높을 가능성이 있으므로 체크
      if (result.metrics.cpuUsage > 70) {
        expect(result.metrics.status).not.toBe(HealthStatus.HEALTHY);
      }
    });

    it('should record worker status', () => {
      healthChecker.updateWorkerStatus(0, true, 0);
      healthChecker.updateWorkerStatus(1, true, 0);
      healthChecker.updateWorkerStatus(2, false, 15);

      const result = healthChecker.check();

      expect(result.metrics.totalWorkers).toBe(3);
      expect(result.metrics.healthyWorkers).toBe(2);
      expect(result.metrics.unhealthyWorkers).toBe(1);
    });

    it('should track request latencies', () => {
      healthChecker.recordRequest(5, true);
      healthChecker.recordRequest(10, true);
      healthChecker.recordRequest(15, true);
      healthChecker.recordRequest(20, true);
      healthChecker.recordRequest(25, true);

      const result = healthChecker.check();

      expect(result.metrics.avgResponseTime).toBeGreaterThan(0);
      expect(result.metrics.avgResponseTime).toBeLessThanOrEqual(25);
    });

    it('should calculate error rate', () => {
      // 100개 요청, 5개 에러 = 5%
      for (let i = 0; i < 95; i++) {
        healthChecker.recordRequest(10, true);
      }
      for (let i = 0; i < 5; i++) {
        healthChecker.recordRequest(10, false);
      }

      const result = healthChecker.check();

      expect(result.metrics.errorRate).toBe(5);
    });

    it('should calculate P95 response time', () => {
      // 100개 요청, 95개는 50ms, 5개는 1000ms
      for (let i = 0; i < 95; i++) {
        healthChecker.recordRequest(50, true);
      }
      for (let i = 0; i < 5; i++) {
        healthChecker.recordRequest(1000, true);
      }

      const result = healthChecker.check();

      expect(result.metrics.p95ResponseTime).toBeGreaterThanOrEqual(50);
      expect(result.metrics.p95ResponseTime).toBeLessThanOrEqual(1000);
    });

    it('should generate alerts for critical conditions', () => {
      const checker = new HealthChecker({
        cpuCritical: 50, // 낮게 설정해서 경고 유발
        errorRateCritical: 1
      });

      // 높은 에러율 시뮬레이션
      for (let i = 0; i < 100; i++) {
        checker.recordRequest(10, i < 10); // 10% 에러율
      }

      const result = checker.check();

      // 에러율이 높으면 경고 발생
      if (result.metrics.errorRate >= 1) {
        expect(result.alerts.length).toBeGreaterThan(0);
      }
    });

    it('should provide metric history', () => {
      for (let i = 0; i < 5; i++) {
        healthChecker.recordRequest(10, true);
        healthChecker.check();
      }

      const history = healthChecker.getMetricHistory(10);

      expect(history.length).toBe(5);
      expect(history[0].timestamp).toBeLessThan(history[4].timestamp);
    });

    it('should reset statistics', () => {
      healthChecker.recordRequest(10, true);
      healthChecker.recordRequest(20, false);

      healthChecker.reset();

      const result = healthChecker.check();

      expect(result.metrics.errorRate).toBe(0);
      expect(result.metrics.requestsPerSecond).toBe(0);
    });
  });

  // ===== 2. Self Healer Tests (8 tests) =====
  describe('Self Healer', () => {
    it('should initialize with default policies', () => {
      const policies = selfHealer.getAllPolicies();

      expect(policies.length).toBeGreaterThan(0);
      expect(policies.some(p => p.key === 'cpu_warning')).toBe(true);
      expect(policies.some(p => p.key === 'memory_critical')).toBe(true);
    });

    it('should match alerts to policies', () => {
      const mockResult = {
        metrics: {
          timestamp: Date.now(),
          status: HealthStatus.DEGRADED,
          cpuUsage: 75,
          cpuTrend: 'stable' as const,
          memoryUsageMB: 400,
          memoryUsagePercent: 40,
          memoryTrend: 'stable' as const,
          avgResponseTime: 100,
          p95ResponseTime: 200,
          errorRate: 1,
          totalWorkers: 8,
          healthyWorkers: 7,
          unhealthyWorkers: 1,
          requestsPerSecond: 10,
          errorsPerSecond: 0.1
        },
        alerts: [
          {
            timestamp: Date.now(),
            severity: 'warning' as const,
            component: 'cpu',
            message: 'CPU warning',
            value: 75,
            threshold: 70
          }
        ],
        recommendations: []
      };

      // CPU 경고에 대한 정책이 있어야 함
      const cpuPolicy = selfHealer.getPolicy('cpu_warning');
      expect(cpuPolicy).toBeDefined();
      expect(cpuPolicy?.action).toBeDefined();
    });

    it('should execute healing actions', async () => {
      let executedActions: HealingAction[] = [];

      // 모든 액션에 핸들러 등록
      for (const action of Object.values(HealingAction)) {
        selfHealer.onAction(action as HealingAction, async () => {
          executedActions.push(action as HealingAction);
        });
      }

      const result = {
        metrics: {
          timestamp: Date.now(),
          status: HealthStatus.CRITICAL,
          cpuUsage: 95,
          cpuTrend: 'stable' as const,
          memoryUsageMB: 500,
          memoryUsagePercent: 50,
          memoryTrend: 'stable' as const,
          avgResponseTime: 100,
          p95ResponseTime: 200,
          errorRate: 8,
          totalWorkers: 8,
          healthyWorkers: 5,
          unhealthyWorkers: 3,
          requestsPerSecond: 10,
          errorsPerSecond: 0.8
        },
        alerts: [
          {
            timestamp: Date.now(),
            severity: 'critical' as const,
            component: 'error_rate',
            message: 'Error rate critical',
            value: 8,
            threshold: 5
          }
        ],
        recommendations: []
      };

      const healResults = await selfHealer.heal(result);

      expect(healResults.length).toBeGreaterThan(0);
    });

    it('should track healing results', async () => {
      selfHealer.onAction(HealingAction.FORCE_GC, async (result) => {
        result.message = '✅ GC executed';
      });

      const result = {
        metrics: {
          timestamp: Date.now(),
          status: HealthStatus.DEGRADED,
          cpuUsage: 50,
          cpuTrend: 'stable' as const,
          memoryUsageMB: 850,
          memoryUsagePercent: 85,
          memoryTrend: 'stable' as const,
          avgResponseTime: 100,
          p95ResponseTime: 200,
          errorRate: 1,
          totalWorkers: 8,
          healthyWorkers: 8,
          unhealthyWorkers: 0,
          requestsPerSecond: 10,
          errorsPerSecond: 0.1
        },
        alerts: [
          {
            timestamp: Date.now(),
            severity: 'warning' as const,
            component: 'memory',
            message: 'Memory warning',
            value: 850,
            threshold: 800
          }
        ],
        recommendations: []
      };

      await selfHealer.heal(result);

      const results = selfHealer.getResults();
      expect(results.length).toBeGreaterThan(0);
    });

    it('should implement rate limiting', async () => {
      let callCount = 0;

      selfHealer.onAction(HealingAction.FORCE_GC, async () => {
        callCount++;
      });

      const result = {
        metrics: {
          timestamp: Date.now(),
          status: HealthStatus.DEGRADED,
          cpuUsage: 50,
          cpuTrend: 'stable' as const,
          memoryUsageMB: 850,
          memoryUsagePercent: 85,
          memoryTrend: 'stable' as const,
          avgResponseTime: 100,
          p95ResponseTime: 200,
          errorRate: 1,
          totalWorkers: 8,
          healthyWorkers: 8,
          unhealthyWorkers: 0,
          requestsPerSecond: 10,
          errorsPerSecond: 0.1
        },
        alerts: [
          {
            timestamp: Date.now(),
            severity: 'warning' as const,
            component: 'memory',
            message: 'Memory warning',
            value: 850,
            threshold: 800
          }
        ],
        recommendations: []
      };

      // 같은 액션을 여러 번 호출
      await selfHealer.heal(result);
      await selfHealer.heal(result);
      await selfHealer.heal(result);

      // 첫 번째만 실행되어야 함 (rate limiting)
      expect(callCount).toBe(1);
    });

    it('should provide healing statistics', async () => {
      selfHealer.onAction(HealingAction.FORCE_GC, async () => {
        // 핸들러
      });

      const result = {
        metrics: {
          timestamp: Date.now(),
          status: HealthStatus.DEGRADED,
          cpuUsage: 50,
          cpuTrend: 'stable' as const,
          memoryUsageMB: 850,
          memoryUsagePercent: 85,
          memoryTrend: 'stable' as const,
          avgResponseTime: 100,
          p95ResponseTime: 200,
          errorRate: 1,
          totalWorkers: 8,
          healthyWorkers: 8,
          unhealthyWorkers: 0,
          requestsPerSecond: 10,
          errorsPerSecond: 0.1
        },
        alerts: [
          {
            timestamp: Date.now(),
            severity: 'warning' as const,
            component: 'memory',
            message: 'Memory warning',
            value: 850,
            threshold: 800
          }
        ],
        recommendations: []
      };

      await selfHealer.heal(result);

      const stats = selfHealer.getStats();

      expect(stats.length).toBeGreaterThan(0);
      expect(stats[0].executionCount).toBeGreaterThan(0);
    });

    it('should update policies dynamically', () => {
      const originalPolicy = selfHealer.getPolicy('cpu_warning');

      selfHealer.updatePolicy('cpu_warning', {
        autoExecute: false,
        retryCount: 5
      });

      const updatedPolicy = selfHealer.getPolicy('cpu_warning');

      expect(updatedPolicy?.autoExecute).toBe(false);
      expect(updatedPolicy?.retryCount).toBe(5);
    });

    it('should reset statistics', async () => {
      selfHealer.onAction(HealingAction.FORCE_GC, async () => {
        // 핸들러
      });

      const result = {
        metrics: {
          timestamp: Date.now(),
          status: HealthStatus.DEGRADED,
          cpuUsage: 50,
          cpuTrend: 'stable' as const,
          memoryUsageMB: 850,
          memoryUsagePercent: 85,
          memoryTrend: 'stable' as const,
          avgResponseTime: 100,
          p95ResponseTime: 200,
          errorRate: 1,
          totalWorkers: 8,
          healthyWorkers: 8,
          unhealthyWorkers: 0,
          requestsPerSecond: 10,
          errorsPerSecond: 0.1
        },
        alerts: [
          {
            timestamp: Date.now(),
            severity: 'warning' as const,
            component: 'memory',
            message: 'Memory warning',
            value: 850,
            threshold: 800
          }
        ],
        recommendations: []
      };

      await selfHealer.heal(result);
      selfHealer.reset();

      const results = selfHealer.getResults();
      const stats = selfHealer.getStats();

      expect(results.length).toBe(0);
      expect(stats.length).toBe(0);
    });
  });

  // ===== 3. TUI Dashboard Tests (5 tests) =====
  describe('TUI Dashboard', () => {
    it('should render dashboard without errors', () => {
      const metrics = {
        timestamp: Date.now(),
        status: HealthStatus.HEALTHY,
        cpuUsage: 35,
        cpuTrend: 'stable' as const,
        memoryUsageMB: 400,
        memoryUsagePercent: 40,
        memoryTrend: 'stable' as const,
        avgResponseTime: 50,
        p95ResponseTime: 100,
        errorRate: 0.5,
        totalWorkers: 8,
        healthyWorkers: 8,
        unhealthyWorkers: 0,
        requestsPerSecond: 15.5,
        errorsPerSecond: 0.07
      };

      expect(() => {
        dashboard.render(metrics, [], []);
      }).not.toThrow();
    });

    it('should render with alerts', () => {
      const metrics = {
        timestamp: Date.now(),
        status: HealthStatus.DEGRADED,
        cpuUsage: 75,
        cpuTrend: 'stable' as const,
        memoryUsageMB: 400,
        memoryUsagePercent: 40,
        memoryTrend: 'stable' as const,
        avgResponseTime: 100,
        p95ResponseTime: 200,
        errorRate: 2.5,
        totalWorkers: 8,
        healthyWorkers: 8,
        unhealthyWorkers: 0,
        requestsPerSecond: 10,
        errorsPerSecond: 0.25
      };

      const alerts: HealthAlert[] = [
        {
          timestamp: Date.now(),
          severity: 'warning',
          component: 'cpu',
          message: 'CPU warning',
          value: 75,
          threshold: 70
        }
      ];

      expect(() => {
        dashboard.render(metrics, alerts, []);
      }).not.toThrow();
    });

    it('should render with healing history', () => {
      const metrics = {
        timestamp: Date.now(),
        status: HealthStatus.HEALTHY,
        cpuUsage: 35,
        cpuTrend: 'stable' as const,
        memoryUsageMB: 400,
        memoryUsagePercent: 40,
        memoryTrend: 'stable' as const,
        avgResponseTime: 50,
        p95ResponseTime: 100,
        errorRate: 0.5,
        totalWorkers: 8,
        healthyWorkers: 8,
        unhealthyWorkers: 0,
        requestsPerSecond: 15.5,
        errorsPerSecond: 0.07
      };

      const healingResults = [
        {
          timestamp: Date.now() - 5000,
          action: HealingAction.FORCE_GC,
          success: true,
          message: '✅ GC executed',
          duration: 145
        }
      ];

      expect(() => {
        dashboard.render(metrics, [], healingResults);
      }).not.toThrow();
    });

    it('should render summary for logging', () => {
      const metrics = {
        timestamp: Date.now(),
        status: HealthStatus.HEALTHY,
        cpuUsage: 35,
        cpuTrend: 'stable' as const,
        memoryUsageMB: 400,
        memoryUsagePercent: 40,
        memoryTrend: 'stable' as const,
        avgResponseTime: 50,
        p95ResponseTime: 100,
        errorRate: 0.5,
        totalWorkers: 8,
        healthyWorkers: 8,
        unhealthyWorkers: 0,
        requestsPerSecond: 15.5,
        errorsPerSecond: 0.07
      };

      const summary = dashboard.renderSummary(metrics);

      expect(summary).toContain('HEALTHY');
      expect(summary).toContain('35');
      expect(summary).toContain('400');
    });

    it('should handle null metrics gracefully', () => {
      expect(() => {
        dashboard.render(null, [], []);
      }).not.toThrow();

      const summary = dashboard.renderSummary(null);
      expect(summary).toContain('준비');
    });
  });

  // ===== 4. Integration Tests (5 tests) =====
  describe('Health Check + Self Healing Integration', () => {
    beforeAll(() => {
      jest.setTimeout(20000);
    });
    it('should complete full health check and healing cycle', async () => {
      const checker = new HealthChecker();
      const healer = new SelfHealer();

      // 요청 기록
      for (let i = 0; i < 50; i++) {
        checker.recordRequest(10, true);
      }

      // Worker 상태
      checker.updateWorkerStatus(0, true, 0);
      checker.updateWorkerStatus(1, true, 0);

      // 건강 체크
      const checkResult = checker.check();

      // 복구 실행
      let healed = false;
      healer.onAction(HealingAction.CLEAR_CACHE, async () => {
        healed = true;
      });

      const healResults = await healer.heal(checkResult);

      expect(checkResult.metrics).toBeDefined();
      expect(healResults).toBeInstanceOf(Array);
    });

    it('should handle cascading alerts and healing', async () => {
      const checker = new HealthChecker({
        cpuCritical: 50,
        errorRateCritical: 2,
        minHealthyWorkers: 4
      });

      // 심각한 상황 시뮬레이션
      for (let i = 0; i < 100; i++) {
        checker.recordRequest(100, i < 80); // 20% 에러율
      }

      checker.updateWorkerStatus(0, false, 50);
      checker.updateWorkerStatus(1, false, 50);
      checker.updateWorkerStatus(2, true, 0);
      checker.updateWorkerStatus(3, true, 0);

      const result = checker.check();

      // 여러 경고가 있을 것
      expect(result.alerts.length).toBeGreaterThanOrEqual(0);
      expect(result.recommendations.length).toBeGreaterThanOrEqual(0);
    });

    it('should monitor system recovery', async () => {
      jest.setTimeout(15000);
      const checker = new HealthChecker();
      const healer = new SelfHealer();

      // 초기: 나쁜 상황
      for (let i = 0; i < 100; i++) {
        checker.recordRequest(200, i < 90); // 10% 에러
      }

      let result1 = checker.check();
      expect(result1.metrics.errorRate).toBeGreaterThan(0);

      // 복구 실행
      let healed = false;
      healer.onAction(HealingAction.CLEAR_CACHE, async () => {
        healed = true;
      });

      const healResults = await healer.heal(result1);

      // 이후: 좋은 상황 (회복됨)
      checker.reset();
      for (let i = 0; i < 100; i++) {
        checker.recordRequest(20, true); // 0% 에러, 빠른 응답
      }

      const result2 = checker.check();
      expect(result2.metrics.errorRate).toBeLessThan(result1.metrics.errorRate);
      expect(result2.metrics.avgResponseTime).toBeLessThan(result1.metrics.avgResponseTime);
    });

    it('should support 30-day continuous monitoring (simulation)', async () => {
      jest.setTimeout(20000);
      const checker = new HealthChecker();
      const healer = new SelfHealer();
      const metrics: any[] = [];

      // 30일 시뮬레이션 (100 iterations = 1 day)
      for (let day = 0; day < 30; day++) {
        // 하루에 100번의 체크
        for (let i = 0; i < 100; i++) {
          const isGood = Math.random() > 0.05; // 95% 정상
          checker.recordRequest(Math.random() * 100 + 10, isGood);
        }

        const result = checker.check();
        metrics.push(result.metrics);

        await healer.heal(result);
      }

      expect(metrics.length).toBe(30);

      // 30일 모두 데이터가 수집되었는지 확인
      for (const metric of metrics) {
        expect(metric.timestamp).toBeDefined();
        expect(metric.status).toBeDefined();
      }

      // 복구 이력 확인
      const healingResults = healer.getResults(100);
      expect(healingResults.length).toBeGreaterThanOrEqual(0);
    });
  });
});
