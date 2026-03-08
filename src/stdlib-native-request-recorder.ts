/**
 * FreeLang v2 - Native-Request-Recorder
 *
 * morgan 완전 대체. 외부 라이브러리 0개.
 *
 * 핵심 구조:
 *   AsyncRingBuffer  - SPSC 링 버퍼 (1024 슬롯) + setImmediate 비동기 소비
 *   LogFormatter     - dev/combined/short 포맷, ANSI 색상 (컴파일 타임 고정)
 *   ZeroCopy Write   - Buffer.concat + process.stdout.write (writev 스타일)
 *   RecorderTap      - http_server_create에서 server.on('finish') 직접 훅
 */

import * as fs from 'fs';
import { NativeFunctionRegistry } from './vm/native-function-registry';

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export interface LogEntry {
  method:     string;
  path:       string;
  status:     number;
  latencyNs:  bigint;
  contentLen: number;
  ts:         bigint;     // 요청 도착 시점 (process.hrtime.bigint())
}

export type LogFormat = 'dev' | 'combined' | 'short';

// ─── ANSI 색상 팔레트 (컴파일 타임 상수) ──────────────────────────────────────

const C_RESET  = '\x1b[0m';
const C_GREEN  = '\x1b[32m';
const C_CYAN   = '\x1b[36m';
const C_YELLOW = '\x1b[33m';
const C_RED    = '\x1b[31m';
const C_BOLD   = '\x1b[1m';
const C_DIM    = '\x1b[2m';

// HTTP 메서드 색상 맵 (런타임 if/else 없음)
const METHOD_COLOR: Readonly<Record<string, string>> = {
  GET:     '\x1b[32m',
  POST:    '\x1b[34m',
  PUT:     '\x1b[35m',
  DELETE:  '\x1b[31m',
  PATCH:   '\x1b[33m',
  HEAD:    '\x1b[36m',
  OPTIONS: '\x1b[2m',
};

function statusColor(code: number): string {
  if (code >= 500) return C_RED;
  if (code >= 400) return C_YELLOW;
  if (code >= 300) return C_CYAN;
  return C_GREEN;
}

// ─── Static-Format-CodeGen: 각 포맷을 Buffer로 직접 조립 ─────────────────────

function nsToMs(ns: bigint): string {
  // 나노초 → 밀리초 (소수점 3자리)
  const ms  = ns / 1_000_000n;
  const rem = (ns % 1_000_000n) / 1_000n;
  return `${ms}.${String(rem).padStart(3, '0')}`;
}

function formatDate(epochMs: number): string {
  // Apache Combined Log 포맷: 10/Jan/2026:12:00:00 +0000
  const d     = new Date(epochMs);
  const day   = String(d.getUTCDate()).padStart(2, '0');
  const month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()];
  const year  = d.getUTCFullYear();
  const hh    = String(d.getUTCHours()).padStart(2, '0');
  const mm    = String(d.getUTCMinutes()).padStart(2, '0');
  const ss    = String(d.getUTCSeconds()).padStart(2, '0');
  return `${day}/${month}/${year}:${hh}:${mm}:${ss} +0000`;
}

function formatDev(e: LogEntry, _epochMs: number): Buffer {
  // "GET /path 200 - 1.234 ms"
  const mc  = METHOD_COLOR[e.method] ?? C_BOLD;
  const sc  = statusColor(e.status);
  const lat = nsToMs(e.latencyNs);
  return Buffer.from(
    `${mc}${e.method}${C_RESET} ${e.path} ${sc}${e.status}${C_RESET} ${C_DIM}-${C_RESET} ${lat} ms\n`,
    'utf8'
  );
}

function formatCombined(e: LogEntry, epochMs: number): Buffer {
  // Apache Combined Log: ::1 - - [date] "METHOD /path HTTP/1.1" status bytes
  const cl  = e.contentLen > 0 ? String(e.contentLen) : '-';
  const dt  = formatDate(epochMs);
  return Buffer.from(
    `- - - [${dt}] "${e.method} ${e.path} HTTP/1.1" ${e.status} ${cl}\n`,
    'utf8'
  );
}

function formatShort(e: LogEntry, _epochMs: number): Buffer {
  // "GET /path 200 - 1.234 ms"
  return Buffer.from(
    `${e.method} ${e.path} ${e.status} - ${nsToMs(e.latencyNs)} ms\n`,
    'utf8'
  );
}

// ─── AsyncRingBuffer ─────────────────────────────────────────────────────────
//
// SPSC 구조:
//   producer: HTTP 요청 핸들러 (res 'finish' 이벤트 → push)
//   consumer: setImmediate 루프 (drain → writev 스타일 배치 write)

const RING_SIZE = 1024;
const BATCH_MAX =   64;

class AsyncRingBuffer {
  private buf:  (LogEntry | null)[] = new Array(RING_SIZE).fill(null);
  private head  = 0;   // write pointer
  private tail  = 0;   // read pointer
  private len   = 0;

  private draining = false;

  // 통계
  private statTotal    = 0;
  private statDropped  = 0;
  private statBytesOut = 0;

  // 출력 설정
  private fmt:    LogFormat                     = 'dev';
  private output: 'stdout' | 'file' | 'both'   = 'stdout';
  private fd:     number | null                  = null;

  configure(fmt: LogFormat, output: 'stdout' | 'file' | 'both', filePath?: string): void {
    if (this.fd !== null) {
      fs.closeSync(this.fd);
      this.fd = null;
    }
    this.fmt    = fmt;
    this.output = output;
    if ((output === 'file' || output === 'both') && filePath) {
      this.fd = fs.openSync(filePath, 'a');
    }
  }

  push(entry: LogEntry): void {
    if (this.len >= RING_SIZE) {
      // 버퍼 가득 찼으면 oldest 슬롯 덮어씀
      this.tail = (this.tail + 1) % RING_SIZE;
      this.len--;
      this.statDropped++;
    }
    this.buf[this.head] = entry;
    this.head = (this.head + 1) % RING_SIZE;
    this.len++;
    this.statTotal++;

    if (!this.draining) {
      this.draining = true;
      setImmediate(() => this.drain());
    }
  }

  private drain(): void {
    const epochMs = Date.now();
    const bufs: Buffer[] = [];
    let processed = 0;

    // BATCH_MAX개씩 Buffer 조각 모아 한 번에 writev
    while (this.len > 0 && processed < BATCH_MAX) {
      const entry = this.buf[this.tail];
      if (!entry) break;
      this.buf[this.tail] = null;
      this.tail = (this.tail + 1) % RING_SIZE;
      this.len--;
      processed++;

      bufs.push(
        this.fmt === 'dev'      ? formatDev(entry, epochMs) :
        this.fmt === 'combined' ? formatCombined(entry, epochMs) :
                                  formatShort(entry, epochMs)
      );
    }

    if (bufs.length > 0) {
      // Zero-copy writev 스타일: concat → 단일 syscall write
      const chunk = Buffer.concat(bufs);
      this.statBytesOut += chunk.length;

      if (this.output === 'stdout' || this.output === 'both') {
        process.stdout.write(chunk);
      }
      if ((this.output === 'file' || this.output === 'both') && this.fd !== null) {
        fs.writeSync(this.fd, chunk);
      }
    }

    if (this.len > 0) {
      setImmediate(() => this.drain());
    } else {
      this.draining = false;
    }
  }

  flush(): void {
    // 남은 항목 즉시 동기 처리
    const epochMs = Date.now();
    const bufs: Buffer[] = [];
    while (this.len > 0) {
      const entry = this.buf[this.tail];
      if (!entry) break;
      this.buf[this.tail] = null;
      this.tail = (this.tail + 1) % RING_SIZE;
      this.len--;
      bufs.push(
        this.fmt === 'dev'      ? formatDev(entry, epochMs) :
        this.fmt === 'combined' ? formatCombined(entry, epochMs) :
                                  formatShort(entry, epochMs)
      );
    }
    if (bufs.length > 0) {
      const chunk = Buffer.concat(bufs);
      this.statBytesOut += chunk.length;
      if (this.output === 'stdout' || this.output === 'both') {
        process.stdout.write(chunk);
      }
      if ((this.output === 'file' || this.output === 'both') && this.fd !== null) {
        fs.writeSync(this.fd, chunk);
      }
    }
    this.draining = false;
  }

  stats(): Map<string, any> {
    const m = new Map<string, any>();
    m.set('total_requests', this.statTotal);
    m.set('queue_depth',    this.len);
    m.set('dropped',        this.statDropped);
    m.set('bytes_written',  this.statBytesOut);
    m.set('format',         this.fmt);
    return m;
  }

  destroy(): void {
    this.flush();
    if (this.fd !== null) { fs.closeSync(this.fd); this.fd = null; }
  }
}

// ─── 전역 싱글턴 (stdlib-builtins.ts의 http_server_create에서 직접 접근) ─────

export const globalRecorder = new AsyncRingBuffer();

// 포트별 활성화 집합
export const recorderPorts = new Set<number>();

process.on('exit', () => globalRecorder.destroy());

// ─── FreeLang 네이티브 함수 등록 ─────────────────────────────────────────────

export function registerNativeRequestRecorder(registry: NativeFunctionRegistry): void {

  // http_recorder_enable(server_or_port, format?, output?, file_path?)
  //   server_or_port : HttpServer 객체 또는 포트 번호
  //   format : 'dev' | 'combined' | 'short'  (기본: 'dev')
  //   output : 'stdout' | 'file' | 'both'    (기본: 'stdout')
  //   file_path: 로그 파일 경로 (output='file'|'both' 시 필수)
  registry.register({
    name:       'http_recorder_enable',
    module:     'http',
    paramCount: 3,   // (server_or_port, format, output) - FreeLang executor.length 우회
    executor: (args) => {
      // FreeLang v2는 숫자 리터럴 전달이 불안정하므로 서버 객체로도 받을 수 있음
      const first = args[0];
      let port: number = NaN;

      if (first !== null && first !== undefined) {
        if (typeof first === 'number') {
          port = first;
        } else if (typeof first === 'object') {
          // plain object (HttpServer)
          if ((first as any).__type === 'HttpServer' || (first as any).port !== undefined) {
            port = Number((first as any).port);
          }
          // FreeLang이 Map으로 변환했을 경우
          else if (first instanceof Map) {
            port = Number((first as Map<string,any>).get('port'));
          }
        } else {
          port = Number(first);
        }
      }

      const fmt      = (args[1] ? String(args[1]) : 'dev') as LogFormat;
      const output   = (args[2] ? String(args[2]) : 'stdout') as 'stdout' | 'file' | 'both';
      const filePath = args[3] ? String(args[3]) : undefined;
      if (!isNaN(port)) recorderPorts.add(port);
      globalRecorder.configure(fmt, output, filePath);
      return `recorder_enabled:port=${port},fmt=${fmt},output=${output}`;
    }
  });

  // http_recorder_disable(port)
  registry.register({
    name:   'http_recorder_disable',
    module: 'http',
    executor: (args) => {
      const port = Number(args[0]);
      recorderPorts.delete(port);
      return `recorder_disabled:port=${port}`;
    }
  });

  // http_recorder_stats() → map { total_requests, queue_depth, dropped, bytes_written, format }
  registry.register({
    name:   'http_recorder_stats',
    module: 'http',
    executor: () => globalRecorder.stats()
  });

  // http_recorder_flush() - 버퍼 잔류 항목 즉시 flush
  registry.register({
    name:   'http_recorder_flush',
    module: 'http',
    executor: () => { globalRecorder.flush(); return 'flushed'; }
  });
}
