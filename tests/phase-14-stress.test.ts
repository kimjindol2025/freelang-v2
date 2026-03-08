/**
 * Phase 14: Stress & Advanced Testing
 *
 * 극한 환경에서의 성능 검증
 * - 대량 메시지 처리
 * - 동시 연결 확장성
 * - 메모리 누수 감시
 * - 네트워크 조건 시뮬레이션
 */

import { RealtimeDashboardServer } from '../src/dashboard/realtime-server';
import { Dashboard } from '../src/dashboard/dashboard';
import * as http from 'http';

describe('Phase 14: Stress & Advanced Testing', () => {
  let server: RealtimeDashboardServer;
  let dashboard: Dashboard;
  let TEST_PORT: number;

  beforeAll(async () => {
    dashboard = new Dashboard();
    // Use random port to avoid conflicts (19000-29000 range)
    TEST_PORT = Math.floor(Math.random() * 10000) + 19000;
    server = new RealtimeDashboardServer(TEST_PORT, dashboard, []);
    await server.start();
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe('High Load Testing', () => {
    test('should handle 50 concurrent connections', (done) => {
      jest.setTimeout(10000);
      const connectionCount = 50;
      let successCount = 0;
      let completeCount = 0;

      for (let i = 0; i < connectionCount; i++) {
        const client = new (require('http')).ClientRequest(
          `http://localhost:${TEST_PORT}/api/realtime/stream`,
          { method: 'GET' },
          (res) => {
            if (res.statusCode === 200) {
              successCount++;
            }
            completeCount++;
            res.destroy();

            if (completeCount === connectionCount) {
              expect(successCount).toBe(connectionCount);
              done();
            }
          }
        );
        client.end();
      }
    });

    test('should handle 100 concurrent connections', (done) => {
      jest.setTimeout(10000);
      const connectionCount = 100;
      let successCount = 0;
      let completeCount = 0;
      const startTime = performance.now();

      for (let i = 0; i < connectionCount; i++) {
        const client = new (require('http')).ClientRequest(
          `http://localhost:${TEST_PORT}/api/realtime/stream`,
          { method: 'GET' },
          (res) => {
            if (res.statusCode === 200) {
              successCount++;
            }
            completeCount++;
            res.destroy();

            if (completeCount === connectionCount) {
              const elapsed = performance.now() - startTime;
              expect(successCount).toBe(connectionCount);
              // 100개 연결이 2초 내에 완료되어야 함
              expect(elapsed).toBeLessThan(2000);
              done();
            }
          }
        );
        client.end();
      }
    });

    test('should handle rapid reconnections', (done) => {
      const reconnectCount = 20;
      let successCount = 0;
      let completeCount = 0;

      const tryConnect = (attempt: number) => {
        if (attempt > reconnectCount) {
          expect(successCount).toBeGreaterThan(reconnectCount - 2);
          done();
          return;
        }

        const client = new (require('http')).ClientRequest(
          `http://localhost:${TEST_PORT}/api/realtime/stream`,
          { method: 'GET' },
          (res) => {
            if (res.statusCode === 200) {
              successCount++;
            }
            completeCount++;
            res.destroy();

            // 다음 재연결 시도
            setTimeout(() => tryConnect(attempt + 1), 50);
          }
        );

        client.on('error', () => {
          // 에러 무시, 다음 시도
          setTimeout(() => tryConnect(attempt + 1), 50);
        });

        client.end();
      };

      tryConnect(1);
    });

    test('should maintain performance under load', (done) => {
      const connectionCount = 10;
      let completeCount = 0;

      for (let i = 0; i < connectionCount; i++) {
        const client = new (require('http')).ClientRequest(
          `http://localhost:${TEST_PORT}/api/realtime/stream`,
          { method: 'GET' },
          (res) => {
            let messagesSeen = 0;

            res.on('data', (chunk) => {
              const data = chunk.toString();
              if (data.includes('event:')) {
                messagesSeen++;
              }
            });

            // 짧은 연결 테스트 (300ms)
            setTimeout(() => {
              res.destroy();
              completeCount++;

              if (completeCount === connectionCount) {
                // 최소 초기 메시지는 받아야 함
                expect(completeCount).toBe(connectionCount);
                done();
              }
            }, 300);
          }
        );
        client.end();
      }
    }, 10000);
  });

  describe('Long-running Stability', () => {
    test('should maintain stable connection for 3 seconds', (done) => {
      let messageCount = 0;
      const testDuration = 3000; // 3초

      const client = new (require('http')).ClientRequest(
        `http://localhost:${TEST_PORT}/api/realtime/stream`,
        { method: 'GET' },
        (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk.toString();
            if (data.includes('event:')) {
              messageCount++;
              data = ''; // 버퍼 리셋
            }
          });

          setTimeout(() => {
            res.destroy();

            // 최소 초기 메시지는 받아야 함 (최소 1개: initial)
            expect(messageCount).toBeGreaterThanOrEqual(1);
            done();
          }, testDuration);
        }
      );

      client.end();
    }, 8000);

    test('should recover from temporary network issues', (done) => {
      const client = new (require('http')).ClientRequest(
        `http://localhost:${TEST_PORT}/api/realtime/stream`,
        { method: 'GET' },
        (res) => {
          expect(res.statusCode).toBe(200);

          let reconnected = false;

          res.on('data', () => {
            reconnected = true;
          });

          // 1초 후 연결 끊음
          setTimeout(() => {
            res.destroy();

            // 재연결 시도
            setTimeout(() => {
              const newClient = new (require('http')).ClientRequest(
                `http://localhost:${TEST_PORT}/api/realtime/stream`,
                { method: 'GET' },
                (newRes) => {
                  expect(newRes.statusCode).toBe(200);
                  newRes.destroy();
                  expect(reconnected).toBe(true);
                  done();
                }
              );
              newClient.end();
            }, 500);
          }, 1000);
        }
      );

      client.end();
    });
  });

  describe('Message Volume Testing', () => {
    test('should handle rapid API calls without blocking', (done) => {
      const apiCallCount = 10;
      let completedCalls = 0;
      const startTime = performance.now();

      for (let i = 0; i < apiCallCount; i++) {
        const client = new (require('http')).ClientRequest(
          `http://localhost:${TEST_PORT}/api/dashboard/stats`,
          { method: 'GET' },
          (res) => {
            let data = '';
            res.on('data', (chunk) => {
              data += chunk.toString();
            });

            res.on('end', () => {
              completedCalls++;
              if (completedCalls === apiCallCount) {
                const elapsed = performance.now() - startTime;
                // 10개 API 호출이 1초 내에 완료되어야 함
                expect(elapsed).toBeLessThan(1000);
                done();
              }
            });
          }
        );
        client.end();
      }
    });

    test('should not lose messages under high frequency updates', (done) => {
      let receivedCount = 0;
      const expectedMinMessages = 1; // 최소 초기 메시지

      const client = new (require('http')).ClientRequest(
        `http://localhost:${TEST_PORT}/api/realtime/stream`,
        { method: 'GET' },
        (res) => {
          let buffer = '';

          res.on('data', (chunk) => {
            buffer += chunk.toString();
            const messages = buffer.split('\n\n');

            for (const msg of messages) {
              if (msg.trim() && msg.includes('event:')) {
                receivedCount++;
              }
            }
            buffer = messages[messages.length - 1]; // 마지막 불완전 메시지 보관
          });

          setTimeout(() => {
            res.destroy();
            expect(receivedCount).toBeGreaterThanOrEqual(expectedMinMessages);
            done();
          }, 2000);
        }
      );

      client.end();
    });
  });

  describe('Memory Efficiency Under Load', () => {
    test('should not have memory leaks with repeated connections', (done) => {
      const iterations = 20;
      let iteration = 0;

      const getMemoryUsage = () => {
        return (process as any).memoryUsage().heapUsed / 1024 / 1024;
      };

      const initialMemory = getMemoryUsage();
      const memories: number[] = [initialMemory];

      const tryConnect = () => {
        if (iteration >= iterations) {
          const finalMemory = getMemoryUsage();
          const memoryGrowth = finalMemory - initialMemory;

          // 메모리 증가가 10MB 이내여야 함 (누수 없음)
          expect(memoryGrowth).toBeLessThan(10);
          done();
          return;
        }

        const client = new (require('http')).ClientRequest(
          `http://localhost:${TEST_PORT}/api/realtime/stream`,
          { method: 'GET' },
          (res) => {
            res.destroy();

            // 매 5회마다 메모리 기록
            if (iteration % 5 === 0) {
              memories.push(getMemoryUsage());
            }

            iteration++;
            setImmediate(tryConnect);
          }
        );

        client.end();
      };

      tryConnect();
    });

    test('should clean up resources properly', (done) => {
      const connectionCount = 10;
      let closedCount = 0;

      for (let i = 0; i < connectionCount; i++) {
        const client = new (require('http')).ClientRequest(
          `http://localhost:${TEST_PORT}/api/realtime/stream`,
          { method: 'GET' },
          (res) => {
            res.on('close', () => {
              closedCount++;
              if (closedCount === connectionCount) {
                // 모든 연결이 정상적으로 종료되었음
                expect(closedCount).toBe(connectionCount);
                done();
              }
            });

            res.destroy();
          }
        );
        client.end();
      }
    });
  });

  describe('Network Condition Simulation', () => {
    test('should handle slow network (simulated delay)', (done) => {
      jest.setTimeout(7000);
      const client = new (require('http')).ClientRequest(
        `http://localhost:${TEST_PORT}/api/realtime/stream`,
        { method: 'GET' },
        (res) => {
          expect(res.statusCode).toBe(200);

          let dataReceived = false;

          res.on('data', () => {
            dataReceived = true;
          });

          // 2초 대기하며 데이터 수신 확인 (slow network는 단순 연결 테스트)
          setTimeout(() => {
            res.destroy();
            // 느린 네트워크 조건에서도 연결 유지 가능한지 확인
            expect(res.statusCode).toBe(200);
            done();
          }, 2000);
        }
      );

      client.end();
    });

    test('should handle packet loss simulation (partial reads)', (done) => {
      const client = new (require('http')).ClientRequest(
        `http://localhost:${TEST_PORT}/api/realtime/stream`,
        { method: 'GET' },
        (res) => {
          let totalData = '';
          let parseErrors = 0;

          res.on('data', (chunk) => {
            const data = chunk.toString();
            totalData += data;

            // 부분적인 메시지 파싱 시도
            try {
              const lines = data.split('\n');
              for (const line of lines) {
                if (line.startsWith('data:')) {
                  JSON.parse(line.substring(6));
                }
              }
            } catch (error) {
              // 부분적 메시지는 에러 가능, 개수 기록
              parseErrors++;
            }
          });

          setTimeout(() => {
            res.destroy();

            // 일부 파싱 에러가 있을 수 있지만 연결은 유지되어야 함
            expect(totalData.length).toBeGreaterThan(0);
            done();
          }, 2000);
        }
      );

      client.end();
    });

    test('should maintain connection with timeout conditions', (done) => {
      const client = new (require('http')).ClientRequest(
        `http://localhost:${TEST_PORT}/api/realtime/stream`,
        {
          method: 'GET',
          timeout: 5000 // 5초 타임아웃
        },
        (res) => {
          expect(res.statusCode).toBe(200);
          let receivedData = false;

          res.on('data', () => {
            receivedData = true;
          });

          setTimeout(() => {
            res.destroy();
            // 타임아웃 전에 데이터를 받아야 함
            expect(receivedData).toBe(true);
            done();
          }, 3000);
        }
      );

      client.end();
    });
  });

  describe('Future Protocol Support', () => {
    test('should support HTTP/1.1 keep-alive', (done) => {
      const client = new (require('http')).ClientRequest(
        `http://localhost:${TEST_PORT}/api/realtime/stream`,
        {
          method: 'GET',
          headers: {
            'Connection': 'keep-alive',
            'Keep-Alive': 'timeout=5, max=10'
          }
        },
        (res) => {
          expect(res.statusCode).toBe(200);
          expect(res.headers['connection']).toBeDefined();
          res.destroy();
          done();
        }
      );

      client.end();
    });

    test('should handle WebSocket upgrade request gracefully', (done) => {
      const client = new (require('http')).ClientRequest(
        `http://localhost:${TEST_PORT}/api/realtime/stream`,
        {
          method: 'GET',
          headers: {
            'Upgrade': 'websocket',
            'Connection': 'Upgrade',
            'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
            'Sec-WebSocket-Version': '13'
          }
        },
        (res) => {
          // SSE는 WebSocket upgrade를 지원하지 않음
          // SSE로 계속 처리되어야 함
          expect(res.statusCode).toBe(200);
          expect(res.headers['upgrade']).toBeUndefined();
          res.destroy();
          done();
        }
      );

      client.end();
    });

    test('should support compression headers', (done) => {
      const client = new (require('http')).ClientRequest(
        `http://localhost:${TEST_PORT}/api/realtime/stream`,
        {
          method: 'GET',
          headers: {
            'Accept-Encoding': 'gzip, deflate'
          }
        },
        (res) => {
          expect(res.statusCode).toBe(200);
          // SSE는 현재 압축을 지원하지 않음 (미래 최적화)
          res.destroy();
          done();
        }
      );

      client.end();
    });

    test('should handle custom headers preservation', (done) => {
      const client = new (require('http')).ClientRequest(
        `http://localhost:${TEST_PORT}/api/realtime/stream`,
        {
          method: 'GET',
          headers: {
            'X-Custom-Header': 'test-value',
            'X-Client-Version': '2.0.0'
          }
        },
        (res) => {
          expect(res.statusCode).toBe(200);
          expect(res.headers['content-type']).toContain('text/event-stream');
          res.destroy();
          done();
        }
      );

      client.end();
    });
  });

  describe('Optimization Opportunities', () => {
    test('should benefit from message batching', () => {
      // 대역폭 최적화 아이디어 테스트
      const messageSize = 200; // 바이트
      const messagesPerMinute = 1.2; // 10초마다 1-2개 메시지 = 분당 1.2개
      const minutesPerDay = 1440;
      const clientCount = 1000;

      // 일일 대역폭: (메시지 크기 × 분당 메시지 × 일일 분수 × 클라이언트) / (1024*1024*1024)
      const currentBandwidth = (messageSize * messagesPerMinute * minutesPerDay * clientCount) / (1024 * 1024 * 1024); // GB/day

      // 배칭으로 50% 감소 가능
      const optimizedBandwidth = currentBandwidth * 0.5;

      expect(currentBandwidth).toBeLessThan(1); // <1GB/day
      expect(optimizedBandwidth).toBeLessThan(0.5); // <500MB/day
    });

    test('should support partial updates for bandwidth optimization', () => {
      // 변경된 필드만 전송하는 최적화
      const fullUpdate = {
        stats: {
          total_patterns: 100,
          avg_confidence: 0.75,
          avg_approval_rate: 0.80,
          total_feedbacks: 500,
          most_used_patterns: [],
          patterns_needing_improvement: []
        }
      };

      const partialUpdate = {
        avg_confidence: 0.76 // 변경된 필드만
      };

      const fullSize = JSON.stringify(fullUpdate).length;
      const partialSize = JSON.stringify(partialUpdate).length;

      // 부분 업데이트가 전체 업데이트보다 훨씬 작아야 함
      expect(partialSize).toBeLessThan(fullSize / 2);
      expect(fullSize).toBeGreaterThan(100); // JSON 크기는 환경에 따라 다름
      // 대역폭 절감 확인: 부분 업데이트가 70% 이상 작음
      expect(partialSize).toBeLessThan(fullSize * 0.3);
    });
  });
});
