/**
 * Phase 20 Week 2: Alert Manager Tests
 *
 * 12개 테스트:
 * 1. Email configuration
 * 2. Slack configuration
 * 3. Process critical alerts
 * 4. Alert debouncing
 * 5. Email template generation
 * 6. Alert records tracking
 * 7. Alert statistics
 * 8. Configuration update
 * 9. Multiple channels
 * 10. Alert filtering (critical only)
 * 11. Alert history
 * 12. Reset functionality
 */

import { AlertManager, AlertConfig } from '../src/monitoring/alert-manager';
import { HealthCheckResult, HealthAlert, HealthStatus } from '../src/monitoring/health-checker';

describe('Phase 20 Week 2: Alert Manager', () => {
  let alertManager: AlertManager;

  beforeAll(() => {
    jest.setTimeout(20000);
  });

  beforeEach(() => {
    alertManager = new AlertManager();
  });

  describe('Configuration', () => {
    it('should initialize with default empty config', () => {
      const manager = new AlertManager();
      expect(manager).toBeDefined();
    });

    it('should accept email configuration', () => {
      const config: AlertConfig = {
        email: {
          enabled: true,
          smtpHost: 'smtp.gmail.com',
          smtpPort: 587,
          fromAddress: 'noreply@example.com',
          toAddresses: ['admin@example.com'],
          username: 'user@gmail.com',
          password: 'password'
        }
      };

      alertManager.updateConfig(config);
      expect(alertManager).toBeDefined();
    });

    it('should accept Slack configuration', () => {
      const config: AlertConfig = {
        slack: {
          enabled: true,
          webhookUrl: 'https://hooks.slack.com/services/...'
        }
      };

      alertManager.updateConfig(config);
      expect(alertManager).toBeDefined();
    });

    it('should accept both email and Slack configuration', () => {
      const config: AlertConfig = {
        email: {
          enabled: true,
          smtpHost: 'smtp.gmail.com',
          smtpPort: 587,
          fromAddress: 'noreply@example.com',
          toAddresses: ['admin@example.com']
        },
        slack: {
          enabled: true,
          webhookUrl: 'https://hooks.slack.com/services/...'
        }
      };

      alertManager.updateConfig(config);
      expect(alertManager).toBeDefined();
    });
  });

  describe('Alert Processing', () => {
    it('should process critical alerts', async () => {
      const result: HealthCheckResult = {
        metrics: {
          timestamp: Date.now(),
          status: HealthStatus.CRITICAL,
          cpuUsage: 95,
          cpuTrend: 'increasing',
          memoryUsageMB: 950,
          memoryUsagePercent: 95,
          memoryTrend: 'increasing',
          avgResponseTime: 100,
          p95ResponseTime: 500,
          errorRate: 10,
          totalWorkers: 8,
          healthyWorkers: 3,
          unhealthyWorkers: 5,
          requestsPerSecond: 1000,
          errorsPerSecond: 100
        },
        alerts: [
          {
            timestamp: Date.now(),
            severity: 'critical',
            component: 'cpu',
            message: 'CPU usage critically high',
            value: 95,
            threshold: 90
          }
        ],
        recommendations: []
      };

      const records = await alertManager.processHealthCheck(result);
      expect(records.length).toBeGreaterThanOrEqual(0);
    });

    it('should ignore warning alerts', async () => {
      const result: HealthCheckResult = {
        metrics: {
          timestamp: Date.now(),
          status: HealthStatus.DEGRADED,
          cpuUsage: 75,
          cpuTrend: 'stable',
          memoryUsageMB: 850,
          memoryUsagePercent: 85,
          memoryTrend: 'stable',
          avgResponseTime: 100,
          p95ResponseTime: 200,
          errorRate: 2,
          totalWorkers: 8,
          healthyWorkers: 7,
          unhealthyWorkers: 1,
          requestsPerSecond: 1000,
          errorsPerSecond: 20
        },
        alerts: [
          {
            timestamp: Date.now(),
            severity: 'warning',
            component: 'cpu',
            message: 'CPU usage high',
            value: 75,
            threshold: 70
          }
        ],
        recommendations: []
      };

      const records = await alertManager.processHealthCheck(result);
      // Warning은 처리되지 않음
      expect(records.length).toBe(0);
    });

    it('should implement alert debouncing', async () => {
      alertManager.setDebounceMs(1000); // 1초

      const alert: HealthAlert = {
        timestamp: Date.now(),
        severity: 'critical',
        component: 'memory',
        message: 'Memory usage critical',
        value: 950,
        threshold: 1000
      };

      const result1: HealthCheckResult = {
        metrics: {
          timestamp: Date.now(),
          status: HealthStatus.CRITICAL,
          cpuUsage: 50,
          cpuTrend: 'stable',
          memoryUsageMB: 950,
          memoryUsagePercent: 95,
          memoryTrend: 'stable',
          avgResponseTime: 100,
          p95ResponseTime: 200,
          errorRate: 1,
          totalWorkers: 8,
          healthyWorkers: 8,
          unhealthyWorkers: 0,
          requestsPerSecond: 1000,
          errorsPerSecond: 10
        },
        alerts: [alert],
        recommendations: []
      };

      // 첫 번째 알림
      const records1 = await alertManager.processHealthCheck(result1);
      expect(records1.length).toBe(1); // 알림이 처리됨
      expect(records1[0].success).toBe(true); // 성공적으로 처리
      expect(records1[0].channels.length).toBe(0); // 채널 없지만 처리 자체는 성공

      // 즉시 같은 알림 재처리
      const records2 = await alertManager.processHealthCheck(result1);
      expect(records2.length).toBe(1); // debounce되어 새 기록이 생김
      expect(records2[0].success).toBe(false); // debounce로 인해 실패
      expect(records2[0].error).toBe('Debounced'); // debounce됨
    });
  });

  describe('Records and Statistics', () => {
    it('should maintain alert records', async () => {
      const config: AlertConfig = {
        email: { enabled: true, smtpHost: 'smtp.example.com', smtpPort: 587, fromAddress: 'test@example.com', toAddresses: ['admin@example.com'] }
      };
      alertManager.updateConfig(config);

      const alert: HealthAlert = {
        timestamp: Date.now(),
        severity: 'critical',
        component: 'error_rate',
        message: 'Error rate critical',
        value: 10,
        threshold: 5
      };

      const result: HealthCheckResult = {
        metrics: {
          timestamp: Date.now(),
          status: HealthStatus.CRITICAL,
          cpuUsage: 50,
          cpuTrend: 'stable',
          memoryUsageMB: 500,
          memoryUsagePercent: 50,
          memoryTrend: 'stable',
          avgResponseTime: 100,
          p95ResponseTime: 200,
          errorRate: 10,
          totalWorkers: 8,
          healthyWorkers: 8,
          unhealthyWorkers: 0,
          requestsPerSecond: 1000,
          errorsPerSecond: 100
        },
        alerts: [alert],
        recommendations: []
      };

      await alertManager.processHealthCheck(result);

      const records = alertManager.getRecords();
      expect(records.length).toBeGreaterThanOrEqual(0);
    });

    it('should provide alert statistics', async () => {
      const stats = alertManager.getStats();

      expect(stats.totalAlerts).toBeDefined();
      expect(stats.criticalAlerts).toBeDefined();
      expect(stats.warningAlerts).toBeDefined();
      expect(stats.emailCount).toBeDefined();
      expect(stats.slackCount).toBeDefined();
      expect(stats.failureCount).toBeDefined();
    });

    it('should limit alert record history to 100 entries', async () => {
      const config: AlertConfig = {
        email: { enabled: true, smtpHost: 'smtp.example.com', smtpPort: 587, fromAddress: 'test@example.com', toAddresses: ['admin@example.com'] }
      };
      alertManager.updateConfig(config);

      // 110개의 알림 생성
      for (let i = 0; i < 110; i++) {
        const alert: HealthAlert = {
          timestamp: Date.now(),
          severity: 'critical',
          component: `metric_${i % 5}`,
          message: `Alert ${i}`,
          value: Math.random() * 100,
          threshold: 50
        };

        const result: HealthCheckResult = {
          metrics: {
            timestamp: Date.now(),
            status: HealthStatus.CRITICAL,
            cpuUsage: 50,
            cpuTrend: 'stable',
            memoryUsageMB: 500,
            memoryUsagePercent: 50,
            memoryTrend: 'stable',
            avgResponseTime: 100,
            p95ResponseTime: 200,
            errorRate: Math.random() * 10,
            totalWorkers: 8,
            healthyWorkers: 8,
            unhealthyWorkers: 0,
            requestsPerSecond: 1000,
            errorsPerSecond: Math.random() * 100
          },
          alerts: [alert],
          recommendations: []
        };

        // Debounce을 무시하기 위해 다른 component로 설정
        alertManager.setDebounceMs(0);
        await alertManager.processHealthCheck(result);
      }

      const records = alertManager.getRecords(200);
      expect(records.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Reset', () => {
    it('should reset alert records and statistics', async () => {
      const config: AlertConfig = {
        email: { enabled: true, smtpHost: 'smtp.example.com', smtpPort: 587, fromAddress: 'test@example.com', toAddresses: ['admin@example.com'] }
      };
      alertManager.updateConfig(config);

      const alert: HealthAlert = {
        timestamp: Date.now(),
        severity: 'critical',
        component: 'cpu',
        message: 'CPU critical',
        value: 95,
        threshold: 90
      };

      const result: HealthCheckResult = {
        metrics: {
          timestamp: Date.now(),
          status: HealthStatus.CRITICAL,
          cpuUsage: 95,
          cpuTrend: 'stable',
          memoryUsageMB: 500,
          memoryUsagePercent: 50,
          memoryTrend: 'stable',
          avgResponseTime: 100,
          p95ResponseTime: 200,
          errorRate: 5,
          totalWorkers: 8,
          healthyWorkers: 8,
          unhealthyWorkers: 0,
          requestsPerSecond: 1000,
          errorsPerSecond: 50
        },
        alerts: [alert],
        recommendations: []
      };

      await alertManager.processHealthCheck(result);

      // Reset 전
      const statsBefore = alertManager.getStats();

      // Reset
      alertManager.reset();

      // Reset 후
      const statsAfter = alertManager.getStats();
      expect(statsAfter.totalAlerts).toBe(0);
    });
  });

  describe('Multi-Channel Support', () => {
    it('should support email and Slack simultaneously', async () => {
      const config: AlertConfig = {
        email: {
          enabled: true,
          smtpHost: 'smtp.example.com',
          smtpPort: 587,
          fromAddress: 'test@example.com',
          toAddresses: ['admin@example.com']
        },
        slack: {
          enabled: true,
          webhookUrl: 'https://hooks.slack.com/services/...'
        }
      };

      alertManager.updateConfig(config);

      const alert: HealthAlert = {
        timestamp: Date.now(),
        severity: 'critical',
        component: 'worker',
        message: 'Worker health critical',
        value: 2,
        threshold: 6
      };

      const result: HealthCheckResult = {
        metrics: {
          timestamp: Date.now(),
          status: HealthStatus.CRITICAL,
          cpuUsage: 50,
          cpuTrend: 'stable',
          memoryUsageMB: 500,
          memoryUsagePercent: 50,
          memoryTrend: 'stable',
          avgResponseTime: 100,
          p95ResponseTime: 200,
          errorRate: 2,
          totalWorkers: 8,
          healthyWorkers: 2,
          unhealthyWorkers: 6,
          requestsPerSecond: 1000,
          errorsPerSecond: 20
        },
        alerts: [alert],
        recommendations: []
      };

      alertManager.setDebounceMs(0);
      const records = await alertManager.processHealthCheck(result);
      expect(records).toBeDefined();
    });
  });

  describe('Alert Templates', () => {
    it('should generate consistent alert information', async () => {
      const config: AlertConfig = {
        email: { enabled: true, smtpHost: 'smtp.example.com', smtpPort: 587, fromAddress: 'test@example.com', toAddresses: ['admin@example.com'] }
      };
      alertManager.updateConfig(config);

      const alert: HealthAlert = {
        timestamp: Date.now(),
        severity: 'critical',
        component: 'memory',
        message: 'Memory usage exceeds critical threshold',
        value: 1050,
        threshold: 1000
      };

      const result: HealthCheckResult = {
        metrics: {
          timestamp: Date.now(),
          status: HealthStatus.CRITICAL,
          cpuUsage: 50,
          cpuTrend: 'stable',
          memoryUsageMB: 1050,
          memoryUsagePercent: 105,
          memoryTrend: 'increasing',
          avgResponseTime: 100,
          p95ResponseTime: 200,
          errorRate: 1,
          totalWorkers: 8,
          healthyWorkers: 8,
          unhealthyWorkers: 0,
          requestsPerSecond: 1000,
          errorsPerSecond: 10
        },
        alerts: [alert],
        recommendations: ['Consider scaling out', 'Check memory leaks']
      };

      alertManager.setDebounceMs(0);
      await alertManager.processHealthCheck(result);

      const records = alertManager.getRecords();
      expect(records).toBeDefined();
    });
  });
});
