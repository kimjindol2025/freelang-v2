export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts'],
  testTimeout: 20000, // 20초 (Phase 19 통합 테스트 용)
  maxWorkers: 1, // 순차 실행 (메모리 누수 방지)
};
