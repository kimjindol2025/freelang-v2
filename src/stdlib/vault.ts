/**
 * FreeLang v2 - Native-JSON-Vault
 *
 * lowdb 외부 패키지 0개 대체.
 * Node.js 내장 fs 모듈만 사용.
 *
 * 핵심 설계:
 *   - WAL (Write-Ahead-Log): 쓰기 전에 .wal 파일에 먼저 기록
 *   - Atomic Commit: .tmp 임시 파일 → rename(원자적 교체)
 *   - Crash Recovery: 시작 시 .wal 존재하면 자동 재적용
 *   - In-memory Map: 읽기 O(1) 성능
 *
 * 제공 함수 (10개):
 *   vault_open(path, autosave?)   → vault 열기 (파일 로드 + WAL 복구)
 *   vault_get(key)                → 값 조회
 *   vault_set(key, value)         → 값 저장 (WAL 기록)
 *   vault_delete(key)             → 키 삭제 (WAL 기록)
 *   vault_keys()                  → 모든 키 목록
 *   vault_has(key)                → 키 존재 확인
 *   vault_commit()                → 원자적 플러시 (tmp → rename)
 *   vault_rollback()              → 변경사항 취소 (파일에서 재로드)
 *   vault_close()                 → autosave면 commit 후 닫기
 *   vault_stats()                 → 통계 (size, wal_count, path)
 */

import * as fs from 'fs';
import * as path from 'path';
import { NativeFunctionRegistry } from '../vm/native-function-registry';

// ─────────────────────────────────────────────────────────────
// Vault 내부 상태 (프로세스 단위, 복수 vault 지원)
// ─────────────────────────────────────────────────────────────

interface VaultState {
  filePath: string;
  walPath: string;
  data: Map<string, any>;
  autosave: boolean;
  walQueue: WalEntry[];  // commit 전 대기 중인 WAL 항목
  open: boolean;
}

interface WalEntry {
  op: 'SET' | 'DEL';
  key: string;
  value?: any;
}

// 활성 vault 레지스트리 (path → state)
const vaultRegistry = new Map<string, VaultState>();
// 현재 활성 vault (마지막으로 열린 것)
let activeVaultPath: string | null = null;

// ─────────────────────────────────────────────────────────────
// 내부 헬퍼
// ─────────────────────────────────────────────────────────────

function walPath(filePath: string): string {
  return filePath + '.wal';
}

function tmpPath(filePath: string): string {
  return filePath + '.tmp';
}

/**
 * JSON 파일 → Map 로드
 * 파일 없으면 빈 Map 반환
 */
function loadFromFile(filePath: string): Map<string, any> {
  const data = new Map<string, any>();
  if (!fs.existsSync(filePath)) return data;
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const obj = JSON.parse(raw) as Record<string, any>;
    for (const [k, v] of Object.entries(obj)) {
      data.set(k, v);
    }
  } catch {
    // 손상된 파일 → 빈 map (WAL로 복구 시도)
  }
  return data;
}

/**
 * WAL 파일 재적용 (crash recovery)
 * WAL 항목을 순서대로 replay → data에 적용
 */
function replayWal(data: Map<string, any>, walFilePath: string): void {
  if (!fs.existsSync(walFilePath)) return;
  try {
    const lines = fs.readFileSync(walFilePath, 'utf-8').split('\n').filter(l => l.trim());
    for (const line of lines) {
      const entry = JSON.parse(line) as WalEntry;
      if (entry.op === 'SET') {
        data.set(entry.key, entry.value);
      } else if (entry.op === 'DEL') {
        data.delete(entry.key);
      }
    }
  } catch {
    // WAL 파일 손상 → 무시 (best-effort recovery)
  }
}

/**
 * WAL 항목들을 파일에 append
 */
function appendWal(walFilePath: string, entries: WalEntry[]): void {
  const lines = entries.map(e => JSON.stringify(e)).join('\n') + '\n';
  fs.appendFileSync(walFilePath, lines, 'utf-8');
}

/**
 * Map → JSON 파일 원자적 쓰기
 * 1. .tmp에 쓰기
 * 2. rename .tmp → .json (OS 레벨 원자적 교체)
 * 3. WAL 파일 삭제
 */
function atomicWrite(filePath: string, data: Map<string, any>): void {
  const obj: Record<string, any> = {};
  for (const [k, v] of data.entries()) {
    obj[k] = v;
  }
  const json = JSON.stringify(obj, null, 2);
  const tmp = tmpPath(filePath);
  const wal = walPath(filePath);

  // 디렉토리 생성
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // .tmp 쓰기 → rename (원자적 교체)
  fs.writeFileSync(tmp, json, 'utf-8');
  fs.renameSync(tmp, filePath);

  // WAL 정리 (commit 완료)
  if (fs.existsSync(wal)) {
    fs.unlinkSync(wal);
  }
}

function getActiveVault(): VaultState | null {
  if (!activeVaultPath) return null;
  return vaultRegistry.get(activeVaultPath) || null;
}

// ─────────────────────────────────────────────────────────────
// NativeFunctionRegistry 등록
// ─────────────────────────────────────────────────────────────

export function registerVaultFunctions(registry: NativeFunctionRegistry): void {

  // vault_open(path, autosave?) → map { success, path, recovered, size }
  registry.register({
    name: 'vault_open',
    module: 'vault',
    executor: (args) => {
      const filePath = path.resolve(String(args[0] || './data/vault.json'));
      const autosave = args[1] !== false && args[1] !== 'false';

      // 이미 열려있으면 그대로 반환
      if (vaultRegistry.has(filePath)) {
        activeVaultPath = filePath;
        const existing = vaultRegistry.get(filePath)!;
        const result = new Map<string, any>();
        result.set('success', true);
        result.set('path', filePath);
        result.set('recovered', false);
        result.set('size', existing.data.size);
        return result;
      }

      // 파일 로드
      const data = loadFromFile(filePath);

      // WAL crash recovery
      const wal = walPath(filePath);
      let recovered = false;
      if (fs.existsSync(wal)) {
        replayWal(data, wal);
        recovered = true;
        // recovery 완료 → commit (WAL 정리)
        atomicWrite(filePath, data);
      }

      const state: VaultState = {
        filePath,
        walPath: wal,
        data,
        autosave,
        walQueue: [],
        open: true,
      };
      vaultRegistry.set(filePath, state);
      activeVaultPath = filePath;

      const result = new Map<string, any>();
      result.set('success', true);
      result.set('path', filePath);
      result.set('recovered', recovered);
      result.set('size', data.size);
      return result;
    }
  });

  // vault_get(key) → value | null
  registry.register({
    name: 'vault_get',
    module: 'vault',
    executor: (args) => {
      const vault = getActiveVault();
      if (!vault) return null;
      const key = String(args[0]);
      const val = vault.data.get(key);
      return val !== undefined ? val : null;
    }
  });

  // vault_set(key, value) → true
  registry.register({
    name: 'vault_set',
    module: 'vault',
    executor: (args) => {
      const vault = getActiveVault();
      if (!vault) return false;
      const key = String(args[0]);
      const value = args[1];

      // in-memory 적용
      vault.data.set(key, value);

      // WAL 기록 (durability)
      const entry: WalEntry = { op: 'SET', key, value };
      vault.walQueue.push(entry);
      appendWal(vault.walPath, [entry]);

      // autosave: 즉시 commit
      if (vault.autosave) {
        atomicWrite(vault.filePath, vault.data);
        vault.walQueue = [];
      }

      return true;
    }
  });

  // vault_delete(key) → true/false (키 존재 여부)
  registry.register({
    name: 'vault_delete',
    module: 'vault',
    executor: (args) => {
      const vault = getActiveVault();
      if (!vault) return false;
      const key = String(args[0]);
      if (!vault.data.has(key)) return false;

      vault.data.delete(key);

      // WAL 기록
      const entry: WalEntry = { op: 'DEL', key };
      vault.walQueue.push(entry);
      appendWal(vault.walPath, [entry]);

      if (vault.autosave) {
        atomicWrite(vault.filePath, vault.data);
        vault.walQueue = [];
      }

      return true;
    }
  });

  // vault_keys() → array of strings
  registry.register({
    name: 'vault_keys',
    module: 'vault',
    executor: (_args) => {
      const vault = getActiveVault();
      if (!vault) return [];
      return Array.from(vault.data.keys());
    }
  });

  // vault_has(key) → boolean
  registry.register({
    name: 'vault_has',
    module: 'vault',
    executor: (args) => {
      const vault = getActiveVault();
      if (!vault) return false;
      return vault.data.has(String(args[0]));
    }
  });

  // vault_commit() → map { success, written, path }
  registry.register({
    name: 'vault_commit',
    module: 'vault',
    executor: (_args) => {
      const vault = getActiveVault();
      const result = new Map<string, any>();
      if (!vault) {
        result.set('success', false);
        result.set('error', 'no_open_vault');
        return result;
      }
      try {
        atomicWrite(vault.filePath, vault.data);
        vault.walQueue = [];
        result.set('success', true);
        result.set('written', vault.data.size);
        result.set('path', vault.filePath);
      } catch (e: any) {
        result.set('success', false);
        result.set('error', e.message);
      }
      return result;
    }
  });

  // vault_rollback() → map { success, restored, path }
  registry.register({
    name: 'vault_rollback',
    module: 'vault',
    executor: (_args) => {
      const vault = getActiveVault();
      const result = new Map<string, any>();
      if (!vault) {
        result.set('success', false);
        result.set('error', 'no_open_vault');
        return result;
      }
      // WAL 삭제 후 파일에서 재로드
      if (fs.existsSync(vault.walPath)) {
        fs.unlinkSync(vault.walPath);
      }
      vault.data.clear();
      const reloaded = loadFromFile(vault.filePath);
      for (const [k, v] of reloaded.entries()) {
        vault.data.set(k, v);
      }
      vault.walQueue = [];
      result.set('success', true);
      result.set('restored', vault.data.size);
      result.set('path', vault.filePath);
      return result;
    }
  });

  // vault_close() → map { success, committed }
  registry.register({
    name: 'vault_close',
    module: 'vault',
    executor: (_args) => {
      const vault = getActiveVault();
      const result = new Map<string, any>();
      if (!vault) {
        result.set('success', false);
        result.set('error', 'no_open_vault');
        return result;
      }
      let committed = false;
      if (vault.autosave && vault.walQueue.length > 0) {
        atomicWrite(vault.filePath, vault.data);
        vault.walQueue = [];
        committed = true;
      }
      vault.open = false;
      vaultRegistry.delete(vault.filePath);
      if (activeVaultPath === vault.filePath) {
        activeVaultPath = vaultRegistry.size > 0 ? [...vaultRegistry.keys()][0] : null;
      }
      result.set('success', true);
      result.set('committed', committed);
      return result;
    }
  });

  // vault_stats() → map { path, size, wal_pending, autosave, open }
  registry.register({
    name: 'vault_stats',
    module: 'vault',
    executor: (_args) => {
      const vault = getActiveVault();
      const result = new Map<string, any>();
      if (!vault) {
        result.set('open', false);
        result.set('size', 0);
        return result;
      }
      result.set('path', vault.filePath);
      result.set('size', vault.data.size);
      result.set('wal_pending', vault.walQueue.length);
      result.set('autosave', vault.autosave);
      result.set('open', vault.open);
      return result;
    }
  });
}
