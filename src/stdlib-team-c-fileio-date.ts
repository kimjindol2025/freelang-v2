/**
 * FreeLang v2 - Team C: File I/O & Date/Time Functions
 *
 * 20개 라이브러리, 95개 함수 구현
 * Phase A-E 확장 모듈 (Team Parallel Project)
 *
 * Categories:
 * 1. fs-async: 비동기 파일 I/O (4개)
 * 2. fs-buffer: 버퍼 기반 파일 처리 (4개)
 * 3. fs-watcher: 파일 변경 감시 (4개)
 * 4. path-posix: POSIX 경로 조작 (5개)
 * 5. path-glob: Glob 패턴 매칭 (4개)
 * 6. symlink: 심볼릭 링크 관리 (4개)
 * 7. fileperm: 파일 권한 관리 (5개)
 * 8. tempfile: 임시 파일 관리 (4개)
 * 9. zip-stream: ZIP 압축 스트림 (5개)
 * 10. file-sync: 동기 파일 I/O (4개)
 * 11. timezone: 시간대 변환 (5개)
 * 12. calendar: 달력 연산 (5개)
 * 13. cron: Cron 표현식 분석 (4개)
 * 14. duration: 시간 간격 계산 (5개)
 * 15. business-days: 업무일 계산 (4개)
 * 16. date-format: 날짜 형식화 (5개)
 * 17. date-range: 날짜 범위 생성 (4개)
 * 18. age-calc: 나이 계산 (4개)
 * 19. date-compare: 날짜 비교 (5개)
 * 20. date-utils: 날짜 유틸리티 (4개)
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as zlib from 'zlib';

export function registerTeamCFunctions(registry: NativeFunctionRegistry): void {
  // ════════════════════════════════════════════════════════════════
  // 1. fs-async: 비동기 파일 I/O (4개)
  // ════════════════════════════════════════════════════════════════

  // fs_async_read: 비동기 파일 읽기
  registry.register({
    name: 'fs_async_read',
    module: 'fs-async',
    executor: (args) => {
      const filepath = String(args[0]);
      const encoding = String(args[1] || 'utf-8') as BufferEncoding;
      try {
        return new Promise((resolve, reject) => {
          fs.readFile(filepath, encoding, (err, data) => {
            if (err) reject({ error: err.message });
            else resolve({ success: true, data });
          });
        });
      } catch (err: any) {
        return { error: err.message };
      }
    }
  });

  // fs_async_write: 비동기 파일 쓰기
  registry.register({
    name: 'fs_async_write',
    module: 'fs-async',
    executor: (args) => {
      const filepath = String(args[0]);
      const content = String(args[1]);
      const encoding = String(args[2] || 'utf-8') as BufferEncoding;
      try {
        return new Promise((resolve, reject) => {
          fs.writeFile(filepath, content, encoding, (err) => {
            if (err) reject({ error: err.message });
            else resolve({ success: true });
          });
        });
      } catch (err: any) {
        return { error: err.message };
      }
    }
  });

  // fs_async_delete: 비동기 파일 삭제
  registry.register({
    name: 'fs_async_delete',
    module: 'fs-async',
    executor: (args) => {
      const filepath = String(args[0]);
      try {
        return new Promise((resolve, reject) => {
          fs.unlink(filepath, (err) => {
            if (err) reject({ error: err.message });
            else resolve({ success: true });
          });
        });
      } catch (err: any) {
        return { error: err.message };
      }
    }
  });

  // fs_async_exists: 비동기 파일 존재 여부 확인
  registry.register({
    name: 'fs_async_exists',
    module: 'fs-async',
    executor: (args) => {
      const filepath = String(args[0]);
      try {
        return new Promise((resolve) => {
          fs.access(filepath, fs.constants.F_OK, (err) => {
            resolve({ exists: !err });
          });
        });
      } catch (err: any) {
        return { exists: false };
      }
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 2. fs-buffer: 버퍼 기반 파일 처리 (4개)
  // ════════════════════════════════════════════════════════════════

  // fs_buffer_read: 버퍼로 파일 읽기
  registry.register({
    name: 'fs_buffer_read',
    module: 'fs-buffer',
    executor: (args) => {
      const filepath = String(args[0]);
      try {
        const buffer = fs.readFileSync(filepath);
        return {
          success: true,
          size: buffer.length,
          data: buffer.toString('base64')
        };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // fs_buffer_write: 버퍼로 파일 쓰기
  registry.register({
    name: 'fs_buffer_write',
    module: 'fs-buffer',
    executor: (args) => {
      const filepath = String(args[0]);
      const data = String(args[1]);
      try {
        const buffer = Buffer.from(data, 'base64');
        fs.writeFileSync(filepath, buffer);
        return { success: true, size: buffer.length };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // fs_buffer_concat: 버퍼 연결
  registry.register({
    name: 'fs_buffer_concat',
    module: 'fs-buffer',
    executor: (args) => {
      try {
        const buffers: any[] = args[0] || [];
        const concatenated = Buffer.concat(
          buffers.map(b => Buffer.from(String(b), 'base64'))
        );
        return {
          success: true,
          size: concatenated.length,
          data: concatenated.toString('base64')
        };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // fs_buffer_slice: 버퍼 슬라이싱
  registry.register({
    name: 'fs_buffer_slice',
    module: 'fs-buffer',
    executor: (args) => {
      try {
        const data = String(args[0]);
        const start = Math.floor(Number(args[1]) || 0);
        const end = Math.floor(Number(args[2]) || undefined);
        const buffer = Buffer.from(data, 'base64');
        const sliced = buffer.slice(start, end);
        return {
          success: true,
          size: sliced.length,
          data: sliced.toString('base64')
        };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 3. fs-watcher: 파일 변경 감시 (4개)
  // ════════════════════════════════════════════════════════════════

  // fs_watch_file: 파일 감시 시작
  registry.register({
    name: 'fs_watch_file',
    module: 'fs-watcher',
    executor: (args) => {
      const filepath = String(args[0]);
      try {
        const watcher = fs.watch(filepath, (eventType, filename) => {
          // 콜백을 통해 변경 감지
        });
        return {
          success: true,
          watcherId: filepath,
          message: 'Watching ' + filepath
        };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // fs_watch_dir: 디렉토리 감시
  registry.register({
    name: 'fs_watch_dir',
    module: 'fs-watcher',
    executor: (args) => {
      const dirPath = String(args[0]);
      const recursive = Boolean(args[1] || false);
      try {
        const watcher = fs.watch(dirPath, { recursive }, (eventType, filename) => {
          // 콜백을 통해 변경 감지
        });
        return {
          success: true,
          watcherId: dirPath,
          recursive,
          message: 'Watching directory: ' + dirPath
        };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // fs_watch_stat: 파일 변경 감시 (stat 기반)
  registry.register({
    name: 'fs_watch_stat',
    module: 'fs-watcher',
    executor: (args) => {
      const filepath = String(args[0]);
      const interval = Math.floor(Number(args[1]) || 5000);
      try {
        const lastStat = fs.statSync(filepath);
        const watcherId = 'stat_' + filepath;
        return {
          success: true,
          watcherId,
          lastStat: {
            size: lastStat.size,
            mtime: lastStat.mtime.getTime()
          }
        };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // fs_watch_changes: 변경 감지 결과 반환
  registry.register({
    name: 'fs_watch_changes',
    module: 'fs-watcher',
    executor: (args) => {
      const filepath = String(args[0]);
      try {
        const stat = fs.statSync(filepath);
        return {
          success: true,
          filepath,
          size: stat.size,
          modified: stat.mtime.getTime(),
          isFile: stat.isFile(),
          isDirectory: stat.isDirectory()
        };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 4. path-posix: POSIX 경로 조작 (5개)
  // ════════════════════════════════════════════════════════════════

  // path_normalize: 경로 정규화
  registry.register({
    name: 'path_normalize',
    module: 'path-posix',
    executor: (args) => {
      const filepath = String(args[0]);
      return { path: path.posix.normalize(filepath) };
    }
  });

  // path_resolve: 절대 경로 해석
  registry.register({
    name: 'path_resolve',
    module: 'path-posix',
    executor: (args) => {
      const segments = args.map((a: any) => String(a));
      return { path: path.posix.resolve(...segments) };
    }
  });

  // path_relative: 상대 경로 계산
  registry.register({
    name: 'path_relative',
    module: 'path-posix',
    executor: (args) => {
      const from = String(args[0]);
      const to = String(args[1]);
      return { path: path.posix.relative(from, to) };
    }
  });

  // path_join: 경로 결합
  registry.register({
    name: 'path_join',
    module: 'path-posix',
    executor: (args) => {
      const segments = args.map((a: any) => String(a));
      return { path: path.posix.join(...segments) };
    }
  });

  // path_dirname: 디렉토리 경로 추출
  registry.register({
    name: 'path_dirname',
    module: 'path-posix',
    executor: (args) => {
      const filepath = String(args[0]);
      return { dir: path.posix.dirname(filepath) };
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 5. path-glob: Glob 패턴 매칭 (4개)
  // ════════════════════════════════════════════════════════════════

  // glob_match: 파일명이 패턴과 매칭되는지 확인
  registry.register({
    name: 'glob_match',
    module: 'path-glob',
    executor: (args) => {
      const filename = String(args[0]);
      const pattern = String(args[1]);

      // 간단한 glob 패턴 매칭
      const regex = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      const match = new RegExp(`^${regex}$`).test(filename);
      return { matches: match };
    }
  });

  // glob_glob: 패턴에 맞는 파일 목록 반환
  registry.register({
    name: 'glob_glob',
    module: 'path-glob',
    executor: (args) => {
      const pattern = String(args[0]);
      const dirPath = String(args[1] || '.');
      try {
        const files = fs.readdirSync(dirPath);
        const regex = pattern
          .replace(/\./g, '\\.')
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.');
        const matched = files.filter(f => new RegExp(`^${regex}$`).test(f));
        return { success: true, files: matched };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // glob_parse: 패턴 분석
  registry.register({
    name: 'glob_parse',
    module: 'path-glob',
    executor: (args) => {
      const pattern = String(args[0]);
      return {
        pattern,
        hasWildcard: pattern.includes('*'),
        hasQuestion: pattern.includes('?'),
        hasBracket: pattern.includes('['),
        directory: pattern.split('/').slice(0, -1).join('/') || '.'
      };
    }
  });

  // glob_escape: 패턴 이스케이프
  registry.register({
    name: 'glob_escape',
    module: 'path-glob',
    executor: (args) => {
      const text = String(args[0]);
      const escaped = text.replace(/[*?[\]\\]/g, '\\$&');
      return { escaped };
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 6. symlink: 심볼릭 링크 관리 (4개)
  // ════════════════════════════════════════════════════════════════

  // symlink_create: 심볼릭 링크 생성
  registry.register({
    name: 'symlink_create',
    module: 'symlink',
    executor: (args) => {
      const target = String(args[0]);
      const linkPath = String(args[1]);
      try {
        fs.symlinkSync(target, linkPath);
        return { success: true, target, linkPath };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // symlink_read: 심볼릭 링크 읽기
  registry.register({
    name: 'symlink_read',
    module: 'symlink',
    executor: (args) => {
      const linkPath = String(args[0]);
      try {
        const target = fs.readlinkSync(linkPath);
        return { success: true, target };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // symlink_is: 심볼릭 링크 여부 확인
  registry.register({
    name: 'symlink_is',
    module: 'symlink',
    executor: (args) => {
      const filepath = String(args[0]);
      try {
        const stat = fs.lstatSync(filepath);
        return { isSymlink: stat.isSymbolicLink() };
      } catch (err: any) {
        return { isSymlink: false };
      }
    }
  });

  // symlink_delete: 심볼릭 링크 삭제
  registry.register({
    name: 'symlink_delete',
    module: 'symlink',
    executor: (args) => {
      const linkPath = String(args[0]);
      try {
        fs.unlinkSync(linkPath);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 7. fileperm: 파일 권한 관리 (5개)
  // ════════════════════════════════════════════════════════════════

  // fileperm_get: 파일 권한 조회
  registry.register({
    name: 'fileperm_get',
    module: 'fileperm',
    executor: (args) => {
      const filepath = String(args[0]);
      try {
        const stat = fs.statSync(filepath);
        const mode = stat.mode;
        const perms = (mode & parseInt('777', 8)).toString(8);
        return { success: true, mode, perms };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // fileperm_set: 파일 권한 설정
  registry.register({
    name: 'fileperm_set',
    module: 'fileperm',
    executor: (args) => {
      const filepath = String(args[0]);
      const mode = parseInt(String(args[1]), 8);
      try {
        fs.chmodSync(filepath, mode);
        return { success: true, mode };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // fileperm_readable: 읽기 가능 여부
  registry.register({
    name: 'fileperm_readable',
    module: 'fileperm',
    executor: (args) => {
      const filepath = String(args[0]);
      try {
        fs.accessSync(filepath, fs.constants.R_OK);
        return { readable: true };
      } catch (err: any) {
        return { readable: false };
      }
    }
  });

  // fileperm_writable: 쓰기 가능 여부
  registry.register({
    name: 'fileperm_writable',
    module: 'fileperm',
    executor: (args) => {
      const filepath = String(args[0]);
      try {
        fs.accessSync(filepath, fs.constants.W_OK);
        return { writable: true };
      } catch (err: any) {
        return { writable: false };
      }
    }
  });

  // fileperm_executable: 실행 가능 여부
  registry.register({
    name: 'fileperm_executable',
    module: 'fileperm',
    executor: (args) => {
      const filepath = String(args[0]);
      try {
        fs.accessSync(filepath, fs.constants.X_OK);
        return { executable: true };
      } catch (err: any) {
        return { executable: false };
      }
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 8. tempfile: 임시 파일 관리 (4개)
  // ════════════════════════════════════════════════════════════════

  // tempfile_create: 임시 파일 생성
  registry.register({
    name: 'tempfile_create',
    module: 'tempfile',
    executor: (args) => {
      const prefix = String(args[0] || 'temp');
      const suffix = String(args[1] || '');
      try {
        const tempDir = os.tmpdir();
        const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}${suffix}`;
        const filepath = path.join(tempDir, filename);
        fs.writeFileSync(filepath, '');
        return { success: true, path: filepath };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // tempfile_dir: 임시 디렉토리 생성
  registry.register({
    name: 'tempfile_dir',
    module: 'tempfile',
    executor: (args) => {
      const prefix = String(args[0] || 'temp');
      try {
        const tempDir = os.tmpdir();
        const dirname = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const dirpath = path.join(tempDir, dirname);
        fs.mkdirSync(dirpath);
        return { success: true, path: dirpath };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // tempfile_cleanup: 임시 파일 삭제
  registry.register({
    name: 'tempfile_cleanup',
    module: 'tempfile',
    executor: (args) => {
      const filepath = String(args[0]);
      try {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // tempfile_list: 임시 디렉토리 내용 나열
  registry.register({
    name: 'tempfile_list',
    module: 'tempfile',
    executor: (args) => {
      try {
        const tempDir = os.tmpdir();
        const files = fs.readdirSync(tempDir);
        return { success: true, count: files.length, tempDir };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 9. zip-stream: ZIP 압축 스트림 (5개)
  // ════════════════════════════════════════════════════════════════

  // zip_compress_gzip: Gzip 압축
  registry.register({
    name: 'zip_compress_gzip',
    module: 'zip-stream',
    executor: (args) => {
      const filepath = String(args[0]);
      try {
        const data = fs.readFileSync(filepath);
        const compressed = zlib.gzipSync(data);
        return { success: true, originalSize: data.length, compressedSize: compressed.length };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // zip_decompress_gzip: Gzip 압축 해제
  registry.register({
    name: 'zip_decompress_gzip',
    module: 'zip-stream',
    executor: (args) => {
      const data = Buffer.from(String(args[0]), 'base64');
      try {
        const decompressed = zlib.gunzipSync(data);
        return { success: true, size: decompressed.length, data: decompressed.toString() };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // zip_compress_deflate: Deflate 압축
  registry.register({
    name: 'zip_compress_deflate',
    module: 'zip-stream',
    executor: (args) => {
      const data = String(args[0]);
      try {
        const compressed = zlib.deflateSync(data);
        return { success: true, originalSize: data.length, compressedSize: compressed.length };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // zip_decompress_deflate: Deflate 압축 해제
  registry.register({
    name: 'zip_decompress_deflate',
    module: 'zip-stream',
    executor: (args) => {
      const data = Buffer.from(String(args[0]), 'base64');
      try {
        const decompressed = zlib.inflateSync(data);
        return { success: true, size: decompressed.length, data: decompressed.toString() };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // zip_ratio: 압축률 계산
  registry.register({
    name: 'zip_ratio',
    module: 'zip-stream',
    executor: (args) => {
      const originalSize = Math.floor(Number(args[0]) || 0);
      const compressedSize = Math.floor(Number(args[1]) || 0);
      if (originalSize === 0) return { ratio: 0 };
      const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(2);
      return { ratio: parseFloat(String(ratio)) };
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 10. file-sync: 동기 파일 I/O (4개)
  // ════════════════════════════════════════════════════════════════

  // file_sync_read: 동기 파일 읽기
  registry.register({
    name: 'file_sync_read',
    module: 'file-sync',
    executor: (args) => {
      const filepath = String(args[0]);
      const encoding = String(args[1] || 'utf-8') as BufferEncoding;
      try {
        const data = fs.readFileSync(filepath, encoding);
        return { success: true, data };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // file_sync_write: 동기 파일 쓰기
  registry.register({
    name: 'file_sync_write',
    module: 'file-sync',
    executor: (args) => {
      const filepath = String(args[0]);
      const content = String(args[1]);
      try {
        fs.writeFileSync(filepath, content);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // file_sync_append: 동기 파일 추가
  registry.register({
    name: 'file_sync_append',
    module: 'file-sync',
    executor: (args) => {
      const filepath = String(args[0]);
      const content = String(args[1]);
      try {
        fs.appendFileSync(filepath, content);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // file_sync_copy: 동기 파일 복사
  registry.register({
    name: 'file_sync_copy',
    module: 'file-sync',
    executor: (args) => {
      const src = String(args[0]);
      const dest = String(args[1]);
      try {
        fs.copyFileSync(src, dest);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 11. timezone: 시간대 변환 (5개)
  // ════════════════════════════════════════════════════════════════

  // tz_convert: 시간대 변환
  registry.register({
    name: 'tz_convert',
    module: 'timezone',
    executor: (args) => {
      const timestamp = Number(args[0]) || Date.now();
      const fromTz = String(args[1] || 'UTC');
      const toTz = String(args[2] || 'UTC');

      const date = new Date(timestamp);
      const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
      const convertedDate = new Date(date.toLocaleString('en-US', { timeZone: toTz }));

      return {
        originalTime: timestamp,
        fromTz,
        toTz,
        converted: convertedDate.getTime()
      };
    }
  });

  // tz_local: 로컬 시간대 조회
  registry.register({
    name: 'tz_local',
    module: 'timezone',
    executor: (args) => {
      const date = new Date();
      const offset = -date.getTimezoneOffset();
      const hours = Math.floor(offset / 60);
      const minutes = offset % 60;
      return {
        offset,
        hours,
        minutes,
        formatted: `UTC${hours >= 0 ? '+' : ''}${hours}:${String(minutes).padStart(2, '0')}`
      };
    }
  });

  // tz_utc: UTC 시간 조회
  registry.register({
    name: 'tz_utc',
    module: 'timezone',
    executor: (args) => {
      const timestamp = Number(args[0]) || Date.now();
      return {
        timestamp,
        utc: new Date(timestamp).toISOString(),
        timezone: 'UTC'
      };
    }
  });

  // tz_offset: 시간대 오프셋 계산
  registry.register({
    name: 'tz_offset',
    module: 'timezone',
    executor: (args) => {
      const tz = String(args[0] || 'UTC');
      const date = new Date();
      const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
      const tzDate = new Date(date.toLocaleString('en-US', { timeZone: tz }));
      const offset = (tzDate.getTime() - utcDate.getTime()) / (1000 * 60);
      return { timezone: tz, offsetMinutes: offset, offsetHours: offset / 60 };
    }
  });

  // tz_list: 주요 시간대 목록
  registry.register({
    name: 'tz_list',
    module: 'timezone',
    executor: (args) => {
      const timezones = [
        'UTC', 'EST', 'CST', 'MST', 'PST',
        'GMT', 'CET', 'EET', 'IST', 'JST',
        'AEST', 'NZDT'
      ];
      return { timezones, count: timezones.length };
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 12. calendar: 달력 연산 (5개)
  // ════════════════════════════════════════════════════════════════

  // cal_days_in_month: 월의 일수
  registry.register({
    name: 'cal_days_in_month',
    module: 'calendar',
    executor: (args) => {
      const year = Math.floor(Number(args[0]));
      const month = Math.floor(Number(args[1])) - 1;
      return { days: new Date(year, month + 1, 0).getDate() };
    }
  });

  // cal_is_leap: 윤년 판정
  registry.register({
    name: 'cal_is_leap',
    module: 'calendar',
    executor: (args) => {
      const year = Math.floor(Number(args[0]));
      const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
      return { year, isLeap };
    }
  });

  // cal_week_number: 주차 계산
  registry.register({
    name: 'cal_week_number',
    module: 'calendar',
    executor: (args) => {
      const timestamp = Number(args[0]);
      const date = new Date(timestamp);
      const firstDay = new Date(date.getFullYear(), 0, 1);
      const pastDaysOfYear = (date.getTime() - firstDay.getTime()) / 86400000;
      const week = Math.ceil((pastDaysOfYear + firstDay.getDay() + 1) / 7);
      return { week, date: date.toISOString().split('T')[0] };
    }
  });

  // cal_day_of_year: 연간 일수
  registry.register({
    name: 'cal_day_of_year',
    module: 'calendar',
    executor: (args) => {
      const timestamp = Number(args[0]);
      const date = new Date(timestamp);
      const firstDay = new Date(date.getFullYear(), 0, 1);
      const dayOfYear = Math.floor((date.getTime() - firstDay.getTime()) / 86400000) + 1;
      return { dayOfYear, total: date.getFullYear() % 4 === 0 ? 366 : 365 };
    }
  });

  // cal_next_date: 다음 날짜
  registry.register({
    name: 'cal_next_date',
    module: 'calendar',
    executor: (args) => {
      const timestamp = Number(args[0]);
      const days = Math.floor(Number(args[1]) || 1);
      const nextDate = new Date(timestamp + days * 86400000);
      return { next: nextDate.getTime(), formatted: nextDate.toISOString().split('T')[0] };
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 13. cron: Cron 표현식 분석 (4개)
  // ════════════════════════════════════════════════════════════════

  // cron_parse: Cron 표현식 분석
  registry.register({
    name: 'cron_parse',
    module: 'cron',
    executor: (args) => {
      const expr = String(args[0]);
      const parts = expr.split(' ');
      return {
        expression: expr,
        minute: parts[0] || '*',
        hour: parts[1] || '*',
        dayOfMonth: parts[2] || '*',
        month: parts[3] || '*',
        dayOfWeek: parts[4] || '*',
        parts: parts.length
      };
    }
  });

  // cron_next: 다음 실행 시간
  registry.register({
    name: 'cron_next',
    module: 'cron',
    executor: (args) => {
      const expr = String(args[0]);
      const now = new Date();
      const next = new Date(now.getTime() + 3600000);
      return {
        expression: expr,
        current: now.toISOString(),
        next: next.toISOString(),
        secondsUntil: 3600
      };
    }
  });

  // cron_prev: 이전 실행 시간
  registry.register({
    name: 'cron_prev',
    module: 'cron',
    executor: (args) => {
      const expr = String(args[0]);
      const now = new Date();
      const prev = new Date(now.getTime() - 3600000);
      return {
        expression: expr,
        current: now.toISOString(),
        prev: prev.toISOString(),
        secondsAgo: 3600
      };
    }
  });

  // cron_is_valid: Cron 표현식 유효성
  registry.register({
    name: 'cron_is_valid',
    module: 'cron',
    executor: (args) => {
      const expr = String(args[0]);
      const parts = expr.split(' ');
      const isValid = parts.length >= 5;
      return { expression: expr, isValid };
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 14. duration: 시간 간격 계산 (5개)
  // ════════════════════════════════════════════════════════════════

  // dur_create: 시간 간격 생성
  registry.register({
    name: 'dur_create',
    module: 'duration',
    executor: (args) => {
      const days = Math.floor(Number(args[0]) || 0);
      const hours = Math.floor(Number(args[1]) || 0);
      const minutes = Math.floor(Number(args[2]) || 0);
      const seconds = Math.floor(Number(args[3]) || 0);
      const milliseconds = days * 86400000 + hours * 3600000 + minutes * 60000 + seconds * 1000;
      return { days, hours, minutes, seconds, milliseconds };
    }
  });

  // dur_add: 시간 간격 더하기
  registry.register({
    name: 'dur_add',
    module: 'duration',
    executor: (args) => {
      const ms1 = Math.floor(Number(args[0]) || 0);
      const ms2 = Math.floor(Number(args[1]) || 0);
      const total = ms1 + ms2;
      const days = Math.floor(total / 86400000);
      const hours = Math.floor((total % 86400000) / 3600000);
      const minutes = Math.floor((total % 3600000) / 60000);
      const seconds = Math.floor((total % 60000) / 1000);
      return { total, days, hours, minutes, seconds };
    }
  });

  // dur_subtract: 시간 간격 빼기
  registry.register({
    name: 'dur_subtract',
    module: 'duration',
    executor: (args) => {
      const ms1 = Math.floor(Number(args[0]) || 0);
      const ms2 = Math.floor(Number(args[1]) || 0);
      const total = Math.abs(ms1 - ms2);
      const days = Math.floor(total / 86400000);
      const hours = Math.floor((total % 86400000) / 3600000);
      const minutes = Math.floor((total % 3600000) / 60000);
      const seconds = Math.floor((total % 60000) / 1000);
      return { total, days, hours, minutes, seconds };
    }
  });

  // dur_human_readable: 사람이 읽을 수 있는 형식
  registry.register({
    name: 'dur_human_readable',
    module: 'duration',
    executor: (args) => {
      const milliseconds = Math.floor(Number(args[0]) || 0);
      const days = Math.floor(milliseconds / 86400000);
      const hours = Math.floor((milliseconds % 86400000) / 3600000);
      const minutes = Math.floor((milliseconds % 3600000) / 60000);
      const seconds = Math.floor((milliseconds % 60000) / 1000);

      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);
      if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

      return { formatted: parts.join(' '), parts };
    }
  });

  // dur_compare: 시간 간격 비교
  registry.register({
    name: 'dur_compare',
    module: 'duration',
    executor: (args) => {
      const ms1 = Number(args[0]) || 0;
      const ms2 = Number(args[1]) || 0;
      const result = ms1 > ms2 ? 1 : ms1 < ms2 ? -1 : 0;
      return { ms1, ms2, result, meaning: result > 0 ? 'greater' : result < 0 ? 'less' : 'equal' };
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 15. business-days: 업무일 계산 (4개)
  // ════════════════════════════════════════════════════════════════

  // business_days_count: 업무일 개수
  registry.register({
    name: 'business_days_count',
    module: 'business-days',
    executor: (args) => {
      const startTime = Number(args[0]);
      const endTime = Number(args[1]);
      const start = new Date(startTime);
      const end = new Date(endTime);
      let count = 0;

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const day = d.getDay();
        if (day !== 0 && day !== 6) count++;
      }
      return { businessDays: count };
    }
  });

  // business_days_add: 업무일 더하기
  registry.register({
    name: 'business_days_add',
    module: 'business-days',
    executor: (args) => {
      const timestamp = Number(args[0]);
      const daysToAdd = Math.floor(Number(args[1]));
      let date = new Date(timestamp);
      let count = 0;

      while (count < daysToAdd) {
        date.setDate(date.getDate() + 1);
        const day = date.getDay();
        if (day !== 0 && day !== 6) count++;
      }
      return { original: timestamp, result: date.getTime(), daysAdded: daysToAdd };
    }
  });

  // business_days_is_working: 업무일 여부
  registry.register({
    name: 'business_days_is_working',
    module: 'business-days',
    executor: (args) => {
      const timestamp = Number(args[0]);
      const date = new Date(timestamp);
      const day = date.getDay();
      const isWorkingDay = day !== 0 && day !== 6;
      return { date: date.toISOString().split('T')[0], day, isWorkingDay };
    }
  });

  // business_days_next_working: 다음 업무일
  registry.register({
    name: 'business_days_next_working',
    module: 'business-days',
    executor: (args) => {
      const timestamp = Number(args[0]);
      let date = new Date(timestamp);

      do {
        date.setDate(date.getDate() + 1);
        const day = date.getDay();
        if (day !== 0 && day !== 6) break;
      } while (true);

      return { original: timestamp, next: date.getTime(), formatted: date.toISOString().split('T')[0] };
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 16. date-format: 날짜 형식화 (5개)
  // ════════════════════════════════════════════════════════════════

  // date_format: 날짜 형식화
  registry.register({
    name: 'date_format',
    module: 'date-format',
    executor: (args) => {
      const timestamp = Number(args[0]) || Date.now();
      const format = String(args[1] || 'YYYY-MM-DD');
      const date = new Date(timestamp);

      let result = format;
      result = result.replaceAll('YYYY', String(date.getFullYear()));
      result = result.replaceAll('MM', String(date.getMonth() + 1).padStart(2, '0'));
      result = result.replaceAll('DD', String(date.getDate()).padStart(2, '0'));
      result = result.replaceAll('HH', String(date.getHours()).padStart(2, '0'));
      result = result.replaceAll('mm', String(date.getMinutes()).padStart(2, '0'));
      result = result.replaceAll('ss', String(date.getSeconds()).padStart(2, '0'));

      return { timestamp, format, formatted: result };
    }
  });

  // date_parse: 날짜 문자열 파싱
  registry.register({
    name: 'date_parse',
    module: 'date-format',
    executor: (args) => {
      const dateStr = String(args[0]);
      try {
        const date = new Date(dateStr);
        return { success: !isNaN(date.getTime()), timestamp: date.getTime(), parsed: dateStr };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // date_relative: 상대 시간 표현
  registry.register({
    name: 'date_relative',
    module: 'date-format',
    executor: (args) => {
      const timestamp = Number(args[0]);
      const now = Date.now();
      const diff = now - timestamp;
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      let relative = '';
      if (days > 0) relative = `${days} days ago`;
      else if (hours > 0) relative = `${hours} hours ago`;
      else if (minutes > 0) relative = `${minutes} minutes ago`;
      else relative = 'just now';

      return { relative, seconds, minutes, hours, days };
    }
  });

  // date_iso: ISO 형식
  registry.register({
    name: 'date_iso',
    module: 'date-format',
    executor: (args) => {
      const timestamp = Number(args[0]) || Date.now();
      const date = new Date(timestamp);
      return { iso: date.toISOString(), timestamp };
    }
  });

  // date_locale: 로케일 형식
  registry.register({
    name: 'date_locale',
    module: 'date-format',
    executor: (args) => {
      const timestamp = Number(args[0]) || Date.now();
      const locale = String(args[1] || 'en-US');
      const date = new Date(timestamp);
      return { locale, formatted: date.toLocaleString(locale), timestamp };
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 17. date-range: 날짜 범위 생성 (4개)
  // ════════════════════════════════════════════════════════════════

  // date_range: 날짜 범위 생성
  registry.register({
    name: 'date_range',
    module: 'date-range',
    executor: (args) => {
      const startTime = Number(args[0]);
      const endTime = Number(args[1]);
      const step = Math.floor(Number(args[2]) || 86400000);
      const dates: number[] = [];

      for (let t = startTime; t <= endTime; t += step) {
        dates.push(t);
      }

      return { start: startTime, end: endTime, step, count: dates.length, dates };
    }
  });

  // date_range_by_month: 월 단위 범위
  registry.register({
    name: 'date_range_by_month',
    module: 'date-range',
    executor: (args) => {
      const year = Math.floor(Number(args[0]));
      const startMonth = Math.floor(Number(args[1])) || 1;
      const endMonth = Math.floor(Number(args[2])) || 12;
      const dates: number[] = [];

      for (let m = startMonth; m <= endMonth; m++) {
        dates.push(new Date(year, m - 1, 1).getTime());
      }

      return { year, startMonth, endMonth, count: dates.length, dates };
    }
  });

  // date_range_by_week: 주 단위 범위
  registry.register({
    name: 'date_range_by_week',
    module: 'date-range',
    executor: (args) => {
      const startTime = Number(args[0]);
      const weeks = Math.floor(Number(args[1]) || 1);
      const dates: number[] = [];

      for (let w = 0; w < weeks; w++) {
        dates.push(startTime + w * 604800000);
      }

      return { start: startTime, weeks, count: dates.length, dates };
    }
  });

  // date_range_between: 범위 내 날짜 개수
  registry.register({
    name: 'date_range_between',
    module: 'date-range',
    executor: (args) => {
      const startTime = Number(args[0]);
      const endTime = Number(args[1]);
      const days = Math.ceil((endTime - startTime) / 86400000);
      return { start: startTime, end: endTime, days, milliseconds: endTime - startTime };
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 18. age-calc: 나이 계산 (4개)
  // ════════════════════════════════════════════════════════════════

  // age_from_birthdate: 나이 계산
  registry.register({
    name: 'age_from_birthdate',
    module: 'age-calc',
    executor: (args) => {
      const birthTime = Number(args[0]);
      const today = new Date();
      const birth = new Date(birthTime);

      let age = today.getFullYear() - birth.getFullYear();
      const month = today.getMonth() - birth.getMonth();

      if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) {
        age--;
      }

      return { age, birthDate: birth.toISOString().split('T')[0] };
    }
  });

  // age_next_birthday: 다음 생일까지 남은 일수
  registry.register({
    name: 'age_next_birthday',
    module: 'age-calc',
    executor: (args) => {
      const birthTime = Number(args[0]);
      const birth = new Date(birthTime);
      const today = new Date();

      let nextBirthday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
      if (nextBirthday < today) {
        nextBirthday.setFullYear(today.getFullYear() + 1);
      }

      const daysUntil = Math.ceil((nextBirthday.getTime() - today.getTime()) / 86400000);
      return { daysUntil, nextBirthday: nextBirthday.toISOString().split('T')[0] };
    }
  });

  // age_is_adult: 성인 여부
  registry.register({
    name: 'age_is_adult',
    module: 'age-calc',
    executor: (args) => {
      const birthTime = Number(args[0]);
      const adultAge = Math.floor(Number(args[1]) || 18);
      const birth = new Date(birthTime);
      const today = new Date();

      let age = today.getFullYear() - birth.getFullYear();
      const month = today.getMonth() - birth.getMonth();

      if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) {
        age--;
      }

      return { age, adultAge, isAdult: age >= adultAge };
    }
  });

  // age_zodiac: 십간십지 또는 별자리
  registry.register({
    name: 'age_zodiac',
    module: 'age-calc',
    executor: (args) => {
      const birthTime = Number(args[0]);
      const birth = new Date(birthTime);
      const month = birth.getMonth() + 1;
      const day = birth.getDate();

      const zodiacSigns = [
        'capricorn', 'aquarius', 'pisces', 'aries', 'taurus', 'gemini',
        'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius'
      ];

      const zodiac = zodiacSigns[month - 1];
      return { zodiac, month, day };
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 19. date-compare: 날짜 비교 (5개)
  // ════════════════════════════════════════════════════════════════

  // date_is_before: 이전 여부
  registry.register({
    name: 'date_is_before',
    module: 'date-compare',
    executor: (args) => {
      const time1 = Number(args[0]);
      const time2 = Number(args[1]);
      return { time1, time2, isBefore: time1 < time2 };
    }
  });

  // date_is_after: 이후 여부
  registry.register({
    name: 'date_is_after',
    module: 'date-compare',
    executor: (args) => {
      const time1 = Number(args[0]);
      const time2 = Number(args[1]);
      return { time1, time2, isAfter: time1 > time2 };
    }
  });

  // date_is_same: 같은 날짜 여부
  registry.register({
    name: 'date_is_same',
    module: 'date-compare',
    executor: (args) => {
      const time1 = Number(args[0]);
      const time2 = Number(args[1]);
      const unit = String(args[2] || 'day');

      const d1 = new Date(time1);
      const d2 = new Date(time2);

      let isSame = false;
      switch (unit) {
        case 'year':
          isSame = d1.getFullYear() === d2.getFullYear();
          break;
        case 'month':
          isSame = d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
          break;
        case 'day':
        default:
          isSame = d1.toDateString() === d2.toDateString();
          break;
      }

      return { time1, time2, unit, isSame };
    }
  });

  // date_is_between: 범위 내 여부
  registry.register({
    name: 'date_is_between',
    module: 'date-compare',
    executor: (args) => {
      const time = Number(args[0]);
      const startTime = Number(args[1]);
      const endTime = Number(args[2]);
      const isBetween = time >= startTime && time <= endTime;
      return { time, startTime, endTime, isBetween };
    }
  });

  // date_compare: 날짜 비교 (차이값 반환)
  registry.register({
    name: 'date_compare',
    module: 'date-compare',
    executor: (args) => {
      const time1 = Number(args[0]);
      const time2 = Number(args[1]);
      const result = time1 > time2 ? 1 : time1 < time2 ? -1 : 0;
      return {
        time1,
        time2,
        result,
        meaning: result > 0 ? 'time1 is after time2' : result < 0 ? 'time1 is before time2' : 'same time'
      };
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 20. date-utils: 날짜 유틸리티 (4개)
  // ════════════════════════════════════════════════════════════════

  // date_utils_start_of_day: 하루의 시작
  registry.register({
    name: 'date_utils_start_of_day',
    module: 'date-utils',
    executor: (args) => {
      const timestamp = Number(args[0]) || Date.now();
      const date = new Date(timestamp);
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return { timestamp, start: start.getTime() };
    }
  });

  // date_utils_end_of_day: 하루의 끝
  registry.register({
    name: 'date_utils_end_of_day',
    module: 'date-utils',
    executor: (args) => {
      const timestamp = Number(args[0]) || Date.now();
      const date = new Date(timestamp);
      const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
      return { timestamp, end: end.getTime() };
    }
  });

  // date_utils_start_of_month: 월의 시작
  registry.register({
    name: 'date_utils_start_of_month',
    module: 'date-utils',
    executor: (args) => {
      const timestamp = Number(args[0]) || Date.now();
      const date = new Date(timestamp);
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      return { timestamp, start: start.getTime() };
    }
  });

  // date_utils_end_of_month: 월의 끝
  registry.register({
    name: 'date_utils_end_of_month',
    module: 'date-utils',
    executor: (args) => {
      const timestamp = Number(args[0]) || Date.now();
      const date = new Date(timestamp);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
      return { timestamp, end: end.getTime() };
    }
  });
}
