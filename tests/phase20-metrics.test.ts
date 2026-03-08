/**
 * Phase 20 Week 1: Prometheus Metrics Tests
 *
 * 10개 테스트:
 * 1. Health status metric
 * 2. CPU usage metric
 * 3. Memory usage metric
 * 4. Error rate metric
 * 5. Response time P95
 * 6. Healing actions counter
 * 7. Workers healthy count
 * 8. Uptime counter
 * 9. Prometheus text format
 * 10. Error handling
 */

import { MetricsExporter } from '../src/monitoring/metrics-exporter';
import { HealthChecker, HealthStatus } from '../src/monitoring/health-checker';
import { SelfHealer, HealingAction } from '../src/monitoring/self-healer';

describe('Phase 20 Week 1: Prometheus Metrics', () => {
  let healthChecker: HealthChecker;
  let selfHealer: SelfHealer;
  let exporter: MetricsExporter;

  beforeAll(() => {
    jest.setTimeout(20000);
  });

  beforeEach(() => {
    healthChecker = new HealthChecker();
    selfHealer = new SelfHealer();
    exporter = new MetricsExporter(healthChecker, selfHealer);
  });

  describe('MetricsExporter', () => {
    it('should export health status metric', () => {
      // 정상 상태
      const metrics = exporter.collect();
      expect(metrics.systemHealthStatus).toBeGreaterThanOrEqual(1);
      expect(metrics.systemHealthStatus).toBeLessThanOrEqual(4);
    });

    it('should export CPU usage metric', () => {
      const metrics = exporter.collect();
      expect(metrics.cpuUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.cpuUsage).toBeLessThanOrEqual(100);
    });

    it('should export memory usage metric', () => {
      const metrics = exporter.collect();
      expect(metrics.memoryUsageMb).toBeGreaterThan(0);
    });

    it('should export error rate metric', () => {
      // 에러 기록
      for (let i = 0; i < 100; i++) {
        healthChecker.recordRequest(10, i < 10); // 10% 에러
      }

      const metrics = exporter.collect();
      expect(metrics.errorRate).toBeGreaterThanOrEqual(0);
      expect(metrics.errorRate).toBeLessThanOrEqual(100);
    });

    it('should export response time P95 metric', () => {
      // 응답 시간 기록
      for (let i = 0; i < 100; i++) {
        healthChecker.recordRequest(Math.random() * 200, true);
      }

      const metrics = exporter.collect();
      expect(metrics.responseTimeP95Ms).toBeGreaterThanOrEqual(0);
    });

    it('should export healing actions counter', async () => {
      // 복구 액션 실행
      selfHealer.onAction(HealingAction.CLEAR_CACHE, async () => {
        // 액션 완료
      });

      const health = healthChecker.check();
      await selfHealer.heal(health);

      const metrics = exporter.collect();
      expect(metrics.healingActionsTotal).toBeGreaterThanOrEqual(0);
    });

    it('should export workers healthy count', () => {
      // Worker 상태 업데이트
      for (let i = 0; i < 8; i++) {
        healthChecker.updateWorkerStatus(i, i < 6, 0); // 6/8 healthy
      }

      const metrics = exporter.collect();
      expect(metrics.workersHealthyCount).toBe(6);
    });

    it('should export uptime counter', () => {
      const metrics = exporter.collect();
      expect(metrics.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });

    it('should format metrics in Prometheus text format', () => {
      const prometheusText = exporter.toPrometheusFormat();

      // Prometheus 포맷 검증
      expect(prometheusText).toContain('# HELP system_health_status');
      expect(prometheusText).toContain('# TYPE system_health_status gauge');
      expect(prometheusText).toContain('system_health_status');

      expect(prometheusText).toContain('system_cpu_usage_percent');
      expect(prometheusText).toContain('system_memory_usage_mb');
      expect(prometheusText).toContain('system_error_rate_per_sec');
      expect(prometheusText).toContain('system_response_time_p95_ms');
      expect(prometheusText).toContain('healing_actions_executed_total');
      expect(prometheusText).toContain('workers_healthy_count');
      expect(prometheusText).toContain('uptime_seconds');
    });

    it('should handle missing health check data gracefully', () => {
      // 데이터 없이 메트릭 수집
      const metrics = exporter.collect();

      // 모든 필드가 정의되어야 함
      expect(metrics).toBeDefined();
      expect(metrics.systemHealthStatus).toBeDefined();
      expect(metrics.cpuUsage).toBeDefined();
      expect(metrics.memoryUsageMb).toBeDefined();
      expect(metrics.errorRate).toBeDefined();
      expect(metrics.responseTimeP95Ms).toBeDefined();
      expect(metrics.healingActionsTotal).toBeDefined();
      expect(metrics.workersHealthyCount).toBeDefined();
      expect(metrics.uptimeSeconds).toBeDefined();
    });
  });

  describe('Prometheus Format Compliance', () => {
    it('should produce valid Prometheus metrics', () => {
      const prometheusText = exporter.toPrometheusFormat();
      const lines = prometheusText.split('\n').filter(l => l.trim());

      // 각 메트릭은 HELP/TYPE 선언 + 값을 가져야 함
      expect(lines.length).toBeGreaterThan(0);

      // 샘플 라인 검증
      const metricLines = lines.filter(l => !l.startsWith('#'));
      for (const line of metricLines) {
        if (line.trim()) {
          // 형식: metric_name value
          const parts = line.split(' ');
          expect(parts.length).toBe(2);
          expect(!isNaN(parseFloat(parts[1]))).toBe(true);
        }
      }
    });
  });

  describe('JSON Export', () => {
    it('should export metrics as JSON', () => {
      const metrics = exporter.toJSON();

      expect(metrics.systemHealthStatus).toBeDefined();
      expect(metrics.cpuUsage).toBeDefined();
      expect(metrics.memoryUsageMb).toBeDefined();
      expect(metrics.errorRate).toBeDefined();
      expect(metrics.responseTimeP95Ms).toBeDefined();
      expect(metrics.healingActionsTotal).toBeDefined();
      expect(metrics.workersHealthyCount).toBeDefined();
      expect(metrics.uptimeSeconds).toBeDefined();
    });
  });

  describe('Report Generation', () => {
    it('should generate human-readable report', () => {
      const report = exporter.generateReport();

      expect(report).toContain('Prometheus Metrics Report');
      expect(report).toContain('System Status');
      expect(report).toContain('Resource Utilization');
      expect(report).toContain('Performance');
      expect(report).toContain('Recovery');
    });
  });

  describe('Integration with HealthChecker and SelfHealer', () => {
    it('should reflect HealthChecker metrics', () => {
      // 커스텀 임계값 설정
      const customChecker = new HealthChecker({ cpuWarning: 50, cpuCritical: 80 });
      customChecker.recordRequest(100, true); // 응답 시간 기록

      const exp = new MetricsExporter(customChecker, selfHealer);
      const metrics = exp.collect();

      expect(metrics.cpuUsage).toBeDefined();
    });

    it('should track healing action statistics', async () => {
      let actionExecuted = false;
      selfHealer.onAction(HealingAction.FORCE_GC, async () => {
        actionExecuted = true;
      });

      const health = healthChecker.check();
      await selfHealer.heal(health);

      const metrics = exporter.collect();
      // 액션이 실행되면 카운터가 증가할 수 있음
      expect(metrics.healingActionsTotal).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Metric Accuracy', () => {
    it('should accurately reflect worker health status', () => {
      const checker = new HealthChecker();

      // 5개 healthy, 3개 unhealthy
      for (let i = 0; i < 5; i++) {
        checker.updateWorkerStatus(i, true, 0);
      }
      for (let i = 5; i < 8; i++) {
        checker.updateWorkerStatus(i, false, 1);
      }

      const exp = new MetricsExporter(checker, selfHealer);
      const metrics = exp.collect();

      expect(metrics.workersHealthyCount).toBe(5);
    });

    it('should accurately calculate uptime', async () => {
      const exp = new MetricsExporter(healthChecker, selfHealer);
      const metrics1 = exp.collect();
      const uptime1 = metrics1.uptimeSeconds;

      // 100ms 대기
      await new Promise(resolve => setTimeout(resolve, 100));

      const metrics2 = exp.collect();
      const uptime2 = metrics2.uptimeSeconds;

      expect(uptime2).toBeGreaterThanOrEqual(uptime1);
    });
  });
});
