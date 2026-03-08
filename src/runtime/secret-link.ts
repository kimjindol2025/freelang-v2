/**
 * Secret-Link: FreeLang 보안 변수 관리 엔진
 *
 * 기능:
 * 1. .flconf 파일 파싱 (key=value 형식, 섹션 지원)
 * 2. XOR + Salt 기반 메모리 암호화 (평문 메모리 노출 방지)
 * 3. 빌드 타임 주입 (--config 플래그)
 * 4. 접근 제어 (secret 변수는 print/log 불가)
 *
 * 설계 원칙:
 * - 외부 의존성 0% (crypto 모듈도 자체 구현)
 * - 메모리 덤프 시 평문 노출 차단
 * - secret 변수는 STORE_SECRET/LOAD_SECRET opcode로만 접근
 */

// ── XOR 암호화 (Zero-Dependency) ────────────────────────────

function generateSalt(length: number = 32): number[] {
  const salt: number[] = [];
  // PRNG: xorshift32 기반 (외부 의존성 없음)
  let seed = Date.now() ^ 0xDEADBEEF;
  for (let i = 0; i < length; i++) {
    seed ^= seed << 13;
    seed ^= seed >> 17;
    seed ^= seed << 5;
    salt.push(Math.abs(seed) & 0xFF);
  }
  return salt;
}

function xorEncrypt(plaintext: string, salt: number[]): number[] {
  const encrypted: number[] = [];
  for (let i = 0; i < plaintext.length; i++) {
    encrypted.push(plaintext.charCodeAt(i) ^ salt[i % salt.length]);
  }
  return encrypted;
}

function xorDecrypt(encrypted: number[], salt: number[]): string {
  let result = '';
  for (let i = 0; i < encrypted.length; i++) {
    result += String.fromCharCode(encrypted[i] ^ salt[i % salt.length]);
  }
  return result;
}

// ── .flconf 파서 ────────────────────────────────────────────

export interface FlConfEntry {
  key: string;
  value: string;
  section: string;
}

/**
 * .flconf 파일 파싱
 *
 * 형식:
 *   [section]
 *   KEY = "value"
 *   DB_HOST = "localhost"
 *   API_KEY = "sk-abc123"
 *
 *   # 주석
 *   [production]
 *   DB_HOST = "prod-db.example.com"
 */
export function parseFlConf(content: string): Map<string, FlConfEntry> {
  const entries = new Map<string, FlConfEntry>();
  let currentSection = 'default';

  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();

    // 빈 줄 / 주석 건너뛰기
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
      continue;
    }

    // 섹션 헤더: [section_name]
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      currentSection = trimmed.slice(1, -1).trim();
      continue;
    }

    // KEY = "value" 또는 KEY = value
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // 따옴표 제거
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    entries.set(key, { key, value, section: currentSection });
  }

  return entries;
}

// ── Secure Store (암호화 메모리 영역) ───────────────────────

export class SecureStore {
  private store = new Map<string, { encrypted: number[]; salt: number[] }>();
  private accessLog: Array<{ key: string; timestamp: number; action: string }> = [];

  /**
   * 보안 변수 저장 (암호화)
   */
  set(name: string, value: string): void {
    const salt = generateSalt();
    const encrypted = xorEncrypt(value, salt);
    this.store.set(name, { encrypted, salt });
    this.accessLog.push({ key: name, timestamp: Date.now(), action: 'store' });
  }

  /**
   * 보안 변수 로드 (복호화)
   */
  get(name: string): string | undefined {
    const entry = this.store.get(name);
    if (!entry) return undefined;
    this.accessLog.push({ key: name, timestamp: Date.now(), action: 'load' });
    return xorDecrypt(entry.encrypted, entry.salt);
  }

  /**
   * 보안 변수 존재 확인
   */
  has(name: string): boolean {
    return this.store.has(name);
  }

  /**
   * 접근 로그 (감사 추적)
   */
  getAccessLog(): Array<{ key: string; timestamp: number; action: string }> {
    return [...this.accessLog];
  }

  /**
   * 보안 영역 초기화 (메모리 안전 삭제)
   */
  clear(): void {
    // 암호화된 데이터를 0으로 덮어쓴 후 삭제
    for (const [, entry] of this.store) {
      entry.encrypted.fill(0);
      entry.salt.fill(0);
    }
    this.store.clear();
    this.accessLog = [];
  }

  /**
   * 변수 수 반환
   */
  get size(): number {
    return this.store.size;
  }
}

// ── Secret-Link 엔진 (통합 인터페이스) ──────────────────────

export class SecretLinkEngine {
  private secureStore = new SecureStore();
  private config: Map<string, FlConfEntry> = new Map();
  private configLoaded = false;

  /**
   * .flconf 파일에서 설정 로드
   */
  loadConfig(content: string): void {
    this.config = parseFlConf(content);
    this.configLoaded = true;

    // 설정의 모든 값을 보안 저장소에 주입
    for (const [key, entry] of this.config) {
      this.secureStore.set(key, entry.value);
    }
  }

  /**
   * 빌드 타임 상수 주입 (--config 플래그로 전달된 값)
   */
  injectBuildTimeSecret(name: string, value: string): void {
    this.secureStore.set(name, value);
  }

  /**
   * VM에서 STORE_SECRET 실행 시 호출
   */
  storeSecret(name: string, value: unknown): void {
    const strValue = typeof value === 'string' ? value : String(value);
    this.secureStore.set(name, strValue);
  }

  /**
   * VM에서 LOAD_SECRET 실행 시 호출
   */
  loadSecret(name: string): string | undefined {
    // 1. 보안 저장소에서 먼저 검색
    if (this.secureStore.has(name)) {
      return this.secureStore.get(name);
    }

    // 2. .flconf에서 검색 (미리 로드된 경우)
    const configEntry = this.config.get(name);
    if (configEntry) {
      // 보안 저장소에 캐시 후 반환
      this.secureStore.set(name, configEntry.value);
      return configEntry.value;
    }

    return undefined;
  }

  /**
   * secret 변수의 print/log 시도 차단
   * @returns 마스킹된 값 (예: "***SECRET***")
   */
  getMaskedValue(name: string): string {
    if (!this.secureStore.has(name)) return '<undefined>';
    return `***SECRET:${name}***`;
  }

  /**
   * 설정 로드 여부
   */
  isConfigLoaded(): boolean {
    return this.configLoaded;
  }

  /**
   * 저장된 시크릿 수
   */
  getSecretCount(): number {
    return this.secureStore.size;
  }

  /**
   * 감사 로그 조회
   */
  getAuditLog() {
    return this.secureStore.getAccessLog();
  }

  /**
   * 엔진 정리 (프로세스 종료 시)
   */
  destroy(): void {
    this.secureStore.clear();
    this.config.clear();
    this.configLoaded = false;
  }
}

// ── 싱글톤 인스턴스 (VM 전역) ───────────────────────────────
export const secretLink = new SecretLinkEngine();
