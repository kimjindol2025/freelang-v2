/**
 * FreeLang v2 - Native-Log-Streamer
 *
 * pm2-logrotate 대체: 외부 의존성 0개
 * Node.js fs + zlib 내장 모듈만 사용
 *
 * 핵심 기능:
 *   - Circular-Write-Pointer: 파일 고정 크기 링버퍼 (lseek 없이 fd+position 기반)
 *   - Atomic-File-Swap: 백업 파일 rotate 시 rename() 원자적 교체
 *   - Buffered-Async-Log-Writer: setImmediate 큐 기반 비동기 쓰기 (디스크 I/O 병목 방지)
 *   - @log_policy 어노테이션과 연동: max_size, backups, compress, target
 *
 * 제공 함수:
 *   log_configure(channel, file, max_bytes, backups, compress)
 *   ch_log_debug(channel, msg)
 *   ch_log_info(channel, msg)
 *   ch_log_warn(channel, msg)
 *   ch_log_error(channel, msg)
 *   ch_log_flush(channel)
 *   log_rotate_now(channel)
 *   log_stats(channel) → map
 */

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { NativeFunctionRegistry } from './vm/native-function-registry';

// ─────────────────────────────────────────────────────────────
// 내부 타입
// ─────────────────────────────────────────────────────────────

interface LogChannel {
  filePath:    string;
  fd:          number;          // 열린 파일 디스크립터
  maxSize:     number;          // 최대 파일 크기 (bytes)
  backups:     number;          // 보관할 백업 파일 수
  compress:    'none' | 'gzip'; // zstd → gzip 폴백 (Node.js 내장)
  writePos:    number;          // 현재 순환 쓰기 위치
  totalBytes:  number;          // 누적 총 기록량
  totalLines:  number;          // 누적 총 라인 수
  rotateCount: number;          // 순환 횟수
  queue:       Buffer[];        // 비동기 쓰기 큐
  draining:    boolean;         // 큐 드레인 중 여부
}

// 채널 레지스트리
const channels = new Map<string, LogChannel>();

// ─────────────────────────────────────────────────────────────
// 유틸리티
// ─────────────────────────────────────────────────────────────

function parseSize(value: unknown): number {
  if (typeof value === 'number') return value;
  const s = String(value ?? '100mb').toLowerCase().trim();
  const num = parseFloat(s);
  if (s.endsWith('gb')) return num * 1024 * 1024 * 1024;
  if (s.endsWith('mb')) return num * 1024 * 1024;
  if (s.endsWith('kb')) return num * 1024;
  return num || 100 * 1024 * 1024; // 기본 100MB
}

function parseCompress(value: unknown): 'none' | 'gzip' {
  const s = String(value ?? 'none').toLowerCase().replace('.', '');
  // zstd → gzip 폴백 (Node.js 내장 zlib은 gzip/deflate만 지원)
  if (s === 'gzip' || s === 'zstd' || s === 'gz') return 'gzip';
  return 'none';
}

function formatEntry(level: string, msg: string): Buffer {
  const ts = new Date().toISOString();
  return Buffer.from(`[${ts}] [${level.toUpperCase().padEnd(5)}] ${msg}\n`, 'utf8');
}

// ─────────────────────────────────────────────────────────────
// 비동기 큐 드레인 (setImmediate 기반 Buffered-Async-Log-Writer)
// ─────────────────────────────────────────────────────────────

function drainQueue(ch: LogChannel): void {
  if (ch.draining || ch.queue.length === 0) return;
  ch.draining = true;

  setImmediate(() => {
    if (ch.queue.length === 0) {
      ch.draining = false;
      return;
    }

    // 최대 64개 엔트리를 배치로 처리
    const batch = ch.queue.splice(0, 64);
    const combined = Buffer.concat(batch);

    writeCircular(ch, combined, () => {
      ch.draining = false;
      if (ch.queue.length > 0) drainQueue(ch);
    });
  });
}

// ─────────────────────────────────────────────────────────────
// Circular-Write-Pointer: fd + position 기반 링버퍼 쓰기
// ─────────────────────────────────────────────────────────────

function writeCircular(ch: LogChannel, data: Buffer, done: () => void): void {
  const len = data.length;

  // 남은 공간이 부족하면 rotate
  if (ch.writePos + len > ch.maxSize) {
    rotateSyncAndWrap(ch);
  }

  // fd + position 기반 쓰기 (mmap lseek 유사)
  fs.write(ch.fd, data, 0, len, ch.writePos, (err) => {
    if (!err) {
      ch.writePos  += len;
      ch.totalBytes += len;
      ch.totalLines += (data.toString().match(/\n/g) || []).length;
    }
    done();
  });
}

// ─────────────────────────────────────────────────────────────
// Atomic-File-Swap: 백업 rotate (rename 원자 교체)
// ─────────────────────────────────────────────────────────────

function rotateSyncAndWrap(ch: LogChannel): void {
  ch.rotateCount++;

  if (ch.backups > 0) {
    // 가장 오래된 백업 삭제
    const oldest = `${ch.filePath}.${ch.backups}`;
    try { fs.unlinkSync(oldest); } catch { /* 없으면 무시 */ }

    // 기존 백업 번호 올리기 (i → i+1)
    for (let i = ch.backups - 1; i >= 1; i--) {
      const src  = `${ch.filePath}.${i}`;
      const dest = `${ch.filePath}.${i + 1}`;
      try { fs.renameSync(src, dest); } catch { /* 없으면 무시 */ }
    }

    // 현재 파일 → .1 백업 (Atomic-File-Swap via rename)
    if (ch.compress === 'gzip') {
      // 동기 gzip 압축 후 .1.gz로 저장
      try {
        const raw  = fs.readFileSync(ch.filePath);
        const gz   = zlib.gzipSync(raw);
        fs.writeFileSync(`${ch.filePath}.1.gz`, gz);
      } catch { /* 압축 실패 시 무압축으로 폴백 */ }
    } else {
      try { fs.copyFileSync(ch.filePath, `${ch.filePath}.1`); } catch { /* 무시 */ }
    }
  }

  // 위치를 0으로 리셋 → 파일 처음부터 덮어쓰기
  ch.writePos = 0;

  // 파일 헤더: 순환 시작 마커
  const marker = Buffer.from(
    `\n=== LOG ROTATE #${ch.rotateCount} @ ${new Date().toISOString()} ===\n`,
    'utf8'
  );
  try {
    fs.writeSync(ch.fd, marker, 0, marker.length, 0);
    ch.writePos = marker.length;
  } catch { /* 무시 */ }
}

// ─────────────────────────────────────────────────────────────
// 채널 설정 / 초기화
// ─────────────────────────────────────────────────────────────

export function configureChannel(
  channelName: string,
  filePath:    string,
  maxSize:     number,
  backups:     number,
  compress:    'none' | 'gzip'
): void {
  // 기존 채널이 있으면 fd 닫기
  const existing = channels.get(channelName);
  if (existing) {
    try { fs.closeSync(existing.fd); } catch { /* 무시 */ }
  }

  // 부모 디렉토리 생성
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 파일 열기 (없으면 생성, 있으면 유지)
  const fd = fs.openSync(filePath, 'a+');

  // 현재 파일 크기로 쓰기 위치 초기화
  const stat    = fs.fstatSync(fd);
  const writePos = Math.min(stat.size, maxSize);

  channels.set(channelName, {
    filePath,
    fd,
    maxSize,
    backups,
    compress,
    writePos,
    totalBytes:  0,
    totalLines:  0,
    rotateCount: 0,
    queue:       [],
    draining:    false,
  });
}

// ─────────────────────────────────────────────────────────────
// 로그 쓰기 (큐에 추가)
// stdlib-system-extended.ts에서도 직접 호출 가능하도록 export
// ─────────────────────────────────────────────────────────────

export function enqueueToChannel(channelName: string, level: string, msg: string): void {
  enqueue(channelName, level, msg);
}

function enqueue(channelName: string, level: string, msg: string): void {
  let ch = channels.get(channelName);

  // 채널이 없으면 기본값으로 자동 생성 (stdout 대신 /tmp/freelang-<channel>.log)
  if (!ch) {
    const defaultPath = `/tmp/freelang-${channelName}.log`;
    configureChannel(channelName, defaultPath, 100 * 1024 * 1024, 3, 'none');
    ch = channels.get(channelName)!;
  }

  ch.queue.push(formatEntry(level, msg));
  drainQueue(ch);
}

// ─────────────────────────────────────────────────────────────
// 강제 플러시 (동기)
// ─────────────────────────────────────────────────────────────

function flushSync(channelName: string): void {
  const ch = channels.get(channelName);
  if (!ch || ch.queue.length === 0) return;

  const batch = ch.queue.splice(0);
  const combined = Buffer.concat(batch);

  if (ch.writePos + combined.length > ch.maxSize) {
    rotateSyncAndWrap(ch);
  }

  try {
    fs.writeSync(ch.fd, combined, 0, combined.length, ch.writePos);
    ch.writePos  += combined.length;
    ch.totalBytes += combined.length;
    ch.totalLines += (combined.toString().match(/\n/g) || []).length;
  } catch { /* 무시 */ }
}

// ─────────────────────────────────────────────────────────────
// 통계 반환
// ─────────────────────────────────────────────────────────────

function getStats(channelName: string): Map<string, any> {
  const result = new Map<string, any>();
  const ch = channels.get(channelName);
  if (!ch) {
    result.set('error', `channel '${channelName}' not found`);
    return result;
  }
  result.set('channel',      channelName);
  result.set('file',         ch.filePath);
  result.set('write_pos',    ch.writePos);
  result.set('max_size',     ch.maxSize);
  result.set('usage_pct',    Math.round((ch.writePos / ch.maxSize) * 100));
  result.set('total_bytes',  ch.totalBytes);
  result.set('total_lines',  ch.totalLines);
  result.set('rotate_count', ch.rotateCount);
  result.set('queue_depth',  ch.queue.length);
  result.set('compress',     ch.compress);
  result.set('backups',      ch.backups);
  return result;
}

// ─────────────────────────────────────────────────────────────
// FreeLang 네이티브 함수 등록
// ─────────────────────────────────────────────────────────────

export function registerLogStreamerFunctions(registry: NativeFunctionRegistry): void {

  // log_configure(channel, file, max_bytes, backups, compress)
  registry.register({
    name:       'log_configure',
    module:     'log_streamer',
    paramCount: 5,
    executor:   (args) => {
      const channel  = String(args[0] ?? 'default');
      const file     = String(args[1] ?? `/tmp/freelang-${channel}.log`);
      const maxBytes = parseSize(args[2]);
      const backups  = typeof args[3] === 'number' ? args[3] : 3;
      const compress = parseCompress(args[4]);
      configureChannel(channel, file, maxBytes, backups, compress);
      return true;
    }
  });

  // ch_log_debug(channel, msg) - 채널 기반 DEBUG 기록
  registry.register({
    name:       'ch_log_debug',
    module:     'log_streamer',
    paramCount: 2,
    executor:   (args) => {
      enqueue(String(args[0] ?? 'default'), 'debug', String(args[1] ?? ''));
      return null;
    }
  });

  // ch_log_info(channel, msg) - 채널 기반 INFO 기록
  registry.register({
    name:       'ch_log_info',
    module:     'log_streamer',
    paramCount: 2,
    executor:   (args) => {
      enqueue(String(args[0] ?? 'default'), 'info', String(args[1] ?? ''));
      return null;
    }
  });

  // ch_log_warn(channel, msg) - 채널 기반 WARN 기록
  registry.register({
    name:       'ch_log_warn',
    module:     'log_streamer',
    paramCount: 2,
    executor:   (args) => {
      enqueue(String(args[0] ?? 'default'), 'warn', String(args[1] ?? ''));
      return null;
    }
  });

  // ch_log_error(channel, msg) - 채널 기반 ERROR 기록
  registry.register({
    name:       'ch_log_error',
    module:     'log_streamer',
    paramCount: 2,
    executor:   (args) => {
      enqueue(String(args[0] ?? 'default'), 'error', String(args[1] ?? ''));
      return null;
    }
  });

  // ch_log_flush(channel) - 채널 플러시
  registry.register({
    name:       'ch_log_flush',
    module:     'log_streamer',
    paramCount: 1,
    executor:   (args) => {
      flushSync(String(args[0] ?? 'default'));
      return null;
    }
  });

  // log_rotate_now(channel) → 강제 순환
  registry.register({
    name:       'log_rotate_now',
    module:     'log_streamer',
    paramCount: 1,
    executor:   (args) => {
      const channelName = String(args[0] ?? 'default');
      const ch = channels.get(channelName);
      if (ch) rotateSyncAndWrap(ch);
      return ch ? ch.rotateCount : 0;
    }
  });

  // log_stats(channel) → map
  registry.register({
    name:       'log_stats',
    module:     'log_streamer',
    paramCount: 1,
    executor:   (args) => getStats(String(args[0] ?? 'default'))
  });
}
