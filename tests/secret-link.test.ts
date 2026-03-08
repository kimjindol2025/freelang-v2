/**
 * Secret-Link 테스트
 * - .flconf 파싱
 * - 암호화 저장/로드
 * - 토큰/파서 통합
 */

import { parseFlConf, SecureStore, SecretLinkEngine } from '../src/runtime/secret-link';
import { TokenType, KEYWORDS } from '../src/lexer/token';
import { Op } from '../src/types';

// ── .flconf 파서 테스트 ─────────────────────────────────────

describe('parseFlConf', () => {
  test('기본 key=value 파싱', () => {
    const content = `
API_KEY = "sk-abc123"
DB_HOST = "localhost"
DB_PORT = 5432
    `;
    const result = parseFlConf(content);
    expect(result.size).toBe(3);
    expect(result.get('API_KEY')?.value).toBe('sk-abc123');
    expect(result.get('DB_HOST')?.value).toBe('localhost');
    expect(result.get('DB_PORT')?.value).toBe('5432');
  });

  test('섹션 지원', () => {
    const content = `
[default]
DB_HOST = "localhost"

[production]
PROD_HOST = "prod-db.example.com"
    `;
    const result = parseFlConf(content);
    expect(result.get('DB_HOST')?.section).toBe('default');
    expect(result.get('PROD_HOST')?.section).toBe('production');
  });

  test('주석 무시', () => {
    const content = `
# 이것은 주석
API_KEY = "test"
// 이것도 주석
    `;
    const result = parseFlConf(content);
    expect(result.size).toBe(1);
  });

  test('따옴표 없는 값', () => {
    const content = `PORT = 3000`;
    const result = parseFlConf(content);
    expect(result.get('PORT')?.value).toBe('3000');
  });
});

// ── SecureStore 테스트 ──────────────────────────────────────

describe('SecureStore', () => {
  let store: SecureStore;

  beforeEach(() => {
    store = new SecureStore();
  });

  afterEach(() => {
    store.clear();
  });

  test('암호화 저장 + 복호화 로드', () => {
    store.set('API_KEY', 'sk-secret-key-12345');
    const value = store.get('API_KEY');
    expect(value).toBe('sk-secret-key-12345');
  });

  test('존재하지 않는 키 조회', () => {
    expect(store.get('NONEXISTENT')).toBeUndefined();
  });

  test('has() 확인', () => {
    store.set('KEY', 'value');
    expect(store.has('KEY')).toBe(true);
    expect(store.has('NOPE')).toBe(false);
  });

  test('접근 로그 기록', () => {
    store.set('KEY', 'value');
    store.get('KEY');
    const log = store.getAccessLog();
    expect(log.length).toBe(2);
    expect(log[0].action).toBe('store');
    expect(log[1].action).toBe('load');
  });

  test('clear() 후 데이터 삭제', () => {
    store.set('KEY', 'value');
    store.clear();
    expect(store.has('KEY')).toBe(false);
    expect(store.size).toBe(0);
  });

  test('긴 문자열 암호화/복호화', () => {
    const longSecret = 'a'.repeat(1000) + 'secret-end';
    store.set('LONG', longSecret);
    expect(store.get('LONG')).toBe(longSecret);
  });

  test('특수문자 포함 값', () => {
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
    store.set('SPECIAL', special);
    expect(store.get('SPECIAL')).toBe(special);
  });
});

// ── SecretLinkEngine 테스트 ─────────────────────────────────

describe('SecretLinkEngine', () => {
  let engine: SecretLinkEngine;

  beforeEach(() => {
    engine = new SecretLinkEngine();
  });

  afterEach(() => {
    engine.destroy();
  });

  test('.flconf 로드 + secret 접근', () => {
    engine.loadConfig(`
API_KEY = "sk-test-123"
DB_PASS = "super-secret"
    `);
    expect(engine.isConfigLoaded()).toBe(true);
    expect(engine.loadSecret('API_KEY')).toBe('sk-test-123');
    expect(engine.loadSecret('DB_PASS')).toBe('super-secret');
  });

  test('빌드 타임 주입', () => {
    engine.injectBuildTimeSecret('BUILD_KEY', 'injected-value');
    expect(engine.loadSecret('BUILD_KEY')).toBe('injected-value');
  });

  test('마스킹 출력 (print 차단)', () => {
    engine.injectBuildTimeSecret('TOKEN', 'real-value');
    expect(engine.getMaskedValue('TOKEN')).toBe('***SECRET:TOKEN***');
  });

  test('존재하지 않는 키 마스킹', () => {
    expect(engine.getMaskedValue('NOPE')).toBe('<undefined>');
  });

  test('storeSecret + loadSecret (VM 연동)', () => {
    engine.storeSecret('RUNTIME_KEY', 'runtime-value');
    expect(engine.loadSecret('RUNTIME_KEY')).toBe('runtime-value');
  });

  test('감사 로그', () => {
    engine.injectBuildTimeSecret('KEY', 'val');
    engine.loadSecret('KEY');
    const log = engine.getAuditLog();
    expect(log.length).toBeGreaterThan(0);
  });
});

// ── 토큰/Opcode 통합 테스트 ─────────────────────────────────

describe('Secret-Link 컴파일러 통합', () => {
  test('secret 키워드 등록됨', () => {
    expect(KEYWORDS['secret']).toBe(TokenType.SECRET);
  });

  test('TokenType.SECRET 존재', () => {
    expect(TokenType.SECRET).toBe('SECRET');
  });

  test('STORE_SECRET opcode 존재', () => {
    expect(Op.STORE_SECRET).toBe(0xE0);
  });

  test('LOAD_SECRET opcode 존재', () => {
    expect(Op.LOAD_SECRET).toBe(0xE1);
  });
});
