/**
 * FreeLang v2.40 - Entropy Core Binding (entropy_core.v2.ts)
 *
 * Native C 엔트로피 소스 바인딩 (koffi FFI)
 * - /dev/urandom 또는 RDRAND 사용
 * - 128-bit 순수 바이너리 직접 생성
 */

import * as fs from 'fs';
import * as path from 'path';

let entropyLib: any = null;
let entropyInitialized = false;

/**
 * 엔트로피 라이브러리 동적 로드
 * 컴파일된 entropy_core.so/dylib를 로드
 */
export function loadEntropyCore(): boolean {
  try {
    // 먼저 koffi (Node.js FFI 라이브러리) 확인
    let koffi: any;
    try {
      koffi = require('koffi');
    } catch (e) {
      console.warn('[entropy] koffi not available, using pure JS fallback');
      return true;  // koffi 없으면 JS fallback 사용
    }

    // 엔트로피 라이브러리 경로 찾기
    const libPaths = [
      path.join(__dirname, 'entropy_core.so'),
      path.join(__dirname, '..', 'build', 'entropy_core.so'),
      path.join(__dirname, '..', 'rt', 'entropy_core.so'),
    ];

    for (const libPath of libPaths) {
      if (fs.existsSync(libPath)) {
        console.log(`[entropy] Loading ${libPath}`);

        // C 함수 정의
        const lib = koffi.load(libPath);
        entropyLib = {
          entropy_init: koffi.stdcall('int entropy_init()', lib),
          entropy_generate_128bit: koffi.stdcall(
            'int entropy_generate_128bit(uchar* buf, int buflen)',
            lib
          ),
          entropy_cleanup: koffi.stdcall('void entropy_cleanup()', lib),
          entropy_stats: koffi.stdcall('int entropy_stats()', lib),
        };

        // 초기화
        if (entropyLib.entropy_init() === 0) {
          entropyInitialized = true;
          console.log('[entropy] Initialized successfully');
          return true;
        }
      }
    }

    console.warn('[entropy] entropy_core.so not found, using pure JS fallback');
    return false;
  } catch (error) {
    console.warn(`[entropy] FFI loading failed: ${error}`);
    return false;
  }
}

/**
 * Pure JavaScript Fallback (Node.js crypto)
 * 엔트로피 라이브러리를 로드할 수 없을 때 사용
 */
function generateUUIDv4Fallback(): Buffer {
  const crypto = require('crypto');
  const buf = crypto.randomBytes(16);

  // UUID v4 마킹
  buf[6] = (buf[6] & 0x0f) | 0x40;  // version 4
  buf[8] = (buf[8] & 0x3f) | 0x80;  // variant

  return buf;
}

/**
 * entropy_init_global()
 * 전역 엔트로피 시스템 초기화
 */
export function entropy_init_global(): boolean {
  if (entropyInitialized) return true;

  const loaded = loadEntropyCore();
  if (!loaded) {
    console.log('[entropy] Using JS fallback');
  }

  return true;
}

/**
 * entropy_generate_128bit()
 * 128-bit 순수 바이너리 생성 (C 또는 JS)
 * Return: Buffer (16 bytes)
 */
export function entropy_generate_128bit(): Buffer {
  if (!entropyInitialized) {
    entropy_init_global();
  }

  // Native C 라이브러리 사용 가능
  if (entropyLib) {
    try {
      const buf = Buffer.alloc(16);
      const result = entropyLib.entropy_generate_128bit(buf, 16);

      if (result === 0) {
        return buf;
      }
    } catch (error) {
      console.warn(`[entropy] Native generation failed: ${error}, fallback to JS`);
    }
  }

  // Fallback to JS
  return generateUUIDv4Fallback();
}

/**
 * entropy_format_hex(buf)
 * 16바이트 바이너리 → 16진수 문자열 (옵션)
 * uuid: 550e8400-e29b-41d4-a716-446655440000
 */
export function entropy_format_hex(buf: Buffer): string {
  if (buf.length !== 16) {
    throw new Error('Invalid buffer size');
  }

  return [
    buf.slice(0, 4).toString('hex'),
    buf.slice(4, 6).toString('hex'),
    buf.slice(6, 8).toString('hex'),
    buf.slice(8, 10).toString('hex'),
    buf.slice(10, 16).toString('hex'),
  ].join('-');
}

/**
 * entropy_stats()
 * 엔트로피 소스 상태 조회
 * Return: { source: 'urandom'|'rdrand'|'js_fallback', initialized: boolean }
 */
export function entropy_stats(): {
  source: string;
  initialized: boolean;
  lib: boolean;
} {
  let source = 'js_fallback';

  if (entropyLib && entropyInitialized) {
    const stats = entropyLib.entropy_stats();
    if (stats === 0) source = 'urandom';
    else if (stats === 1) source = 'rdrand';
  }

  return {
    source,
    initialized: entropyInitialized,
    lib: !!entropyLib,
  };
}

/**
 * entropy_cleanup()
 * 리소스 정리
 */
export function entropy_cleanup() {
  if (entropyLib && entropyLib.entropy_cleanup) {
    try {
      entropyLib.entropy_cleanup();
    } catch (error) {
      console.warn(`[entropy] Cleanup failed: ${error}`);
    }
  }
  entropyInitialized = false;
}

// 모듈 로드 시 자동 초기화
process.on('exit', () => {
  entropy_cleanup();
});
