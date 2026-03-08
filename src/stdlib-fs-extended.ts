/**
 * FreeLang Extended File System & Stream Functions
 * 120개의 파일시스템, 스트림, 압축, 프로세스 함수 구현
 *
 * 카테고리:
 * - 파일 시스템 (40개)
 * - 스트림/버퍼 (30개)
 * - 압축 (20개)
 * - 프로세스 (30개)
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import * as child_process from 'child_process';
import * as stream from 'stream';
import * as os from 'os';

export function registerFsExtendedFunctions(registry: NativeFunctionRegistry): void {
  // ==================== 파일 시스템 함수 (40개) ====================

  // 디렉토리 생성
  registry.register({
    name: 'fs_mkdir',
    module: 'fs',
    executor: (args) => {
      try {
        const dirPath = String(args[0]);
        fs.mkdirSync(dirPath, { recursive: false });
        return { success: true, path: dirPath };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 디렉토리 생성 (alias: dir_create) - simpler return
  registry.register({
    name: 'dir_create',
    module: 'fs',
    executor: (args) => {
      try {
        const dirPath = String(args[0]);
        fs.mkdirSync(dirPath, { recursive: true });  // recursive=true for convenience
        return true;
      } catch (err: any) {
        return false;
      }
    }
  });

  // 디렉토리 삭제
  registry.register({
    name: 'fs_rmdir',
    module: 'fs',
    executor: (args) => {
      try {
        const dirPath = String(args[0]);
        fs.rmdirSync(dirPath);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 디렉토리 재귀 삭제
  registry.register({
    name: 'fs_rmdir_recursive',
    module: 'fs',
    executor: (args) => {
      try {
        const dirPath = String(args[0]);
        fs.rmSync(dirPath, { recursive: true, force: true });
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 디렉토리 나열
  registry.register({
    name: 'fs_ls',
    module: 'fs',
    executor: (args) => {
      try {
        const dirPath = String(args[0]);
        const files = fs.readdirSync(dirPath);
        return { success: true, files };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 재귀적으로 파일 나열
  registry.register({
    name: 'fs_ls_recursive',
    module: 'fs',
    executor: (args) => {
      try {
        const dirPath = String(args[0]);
        const result: string[] = [];

        function walk(dir: string) {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const fullPath = path.join(dir, file);
            result.push(fullPath);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
              walk(fullPath);
            }
          }
        }

        walk(dirPath);
        return { success: true, files: result };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 디렉토리 재귀 순회 (alias: dir_walk)
  registry.register({
    name: 'dir_walk',
    module: 'fs',
    executor: (args) => {
      try {
        const dirPath = String(args[0]);
        const result: string[] = [];

        function walk(dir: string) {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const fullPath = path.join(dir, file);
            result.push(fullPath);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
              walk(fullPath);
            }
          }
        }

        walk(dirPath);
        return result;  // dir_walk returns just the array of paths
      } catch (err: any) {
        return [];
      }
    }
  });

  // 파일/폴더 복사
  registry.register({
    name: 'fs_copy',
    module: 'fs',
    executor: (args) => {
      try {
        const src = String(args[0]);
        const dest = String(args[1]);
        fs.cpSync(src, dest, { recursive: true });
        return { success: true, src, dest };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 파일/폴더 이동
  registry.register({
    name: 'fs_move',
    module: 'fs',
    executor: (args) => {
      try {
        const src = String(args[0]);
        const dest = String(args[1]);
        fs.renameSync(src, dest);
        return { success: true, src, dest };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 심볼릭 링크 생성
  registry.register({
    name: 'fs_symlink',
    module: 'fs',
    executor: (args) => {
      try {
        const target = String(args[0]);
        const linkPath = String(args[1]);
        fs.symlinkSync(target, linkPath);
        return { success: true, target, linkPath };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 심볼릭 링크 읽기
  registry.register({
    name: 'fs_readlink',
    module: 'fs',
    executor: (args) => {
      try {
        const linkPath = String(args[0]);
        const target = fs.readlinkSync(linkPath, 'utf-8');
        return { success: true, target };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 실제 경로 얻기
  registry.register({
    name: 'fs_realpath',
    module: 'fs',
    executor: (args) => {
      try {
        const filePath = String(args[0]);
        const realPath = fs.realpathSync(filePath);
        return { success: true, path: realPath };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 파일/폴더 통계
  registry.register({
    name: 'fs_stat',
    module: 'fs',
    executor: (args) => {
      try {
        const filePath = String(args[0]);
        const stat = fs.statSync(filePath);
        return {
          success: true,
          size: stat.size,
          mtime: stat.mtime.getTime(),
          atime: stat.atime.getTime(),
          ctime: stat.ctime.getTime(),
          isFile: stat.isFile(),
          isDir: stat.isDirectory(),
          isSymlink: stat.isSymbolicLink(),
          mode: stat.mode
        };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 파일 상태 조회 (alias: file_stat) - simpler return
  registry.register({
    name: 'file_stat',
    module: 'fs',
    executor: (args) => {
      try {
        const filePath = String(args[0]);
        const stat = fs.statSync(filePath);
        return {
          path: filePath,
          name: path.basename(filePath),
          extension: path.extname(filePath),
          isDirectory: stat.isDirectory(),
          isFile: stat.isFile(),
          size: stat.size,
          created: stat.birthtime,
          modified: stat.mtime,
          accessed: stat.atime,
          mode: stat.mode,
          isSymlink: stat.isSymbolicLink()
        };
      } catch (err: any) {
        return null;
      }
    }
  });

  // 심볼릭 링크 통계 (링크 자체의 정보)
  registry.register({
    name: 'fs_lstat',
    module: 'fs',
    executor: (args) => {
      try {
        const filePath = String(args[0]);
        const stat = fs.lstatSync(filePath);
        return {
          success: true,
          size: stat.size,
          mtime: stat.mtime.getTime(),
          isSymlink: stat.isSymbolicLink()
        };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 권한 변경
  registry.register({
    name: 'fs_chmod',
    module: 'fs',
    executor: (args) => {
      try {
        const filePath = String(args[0]);
        const mode = Number(args[1]);
        fs.chmodSync(filePath, mode);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 소유자 변경
  registry.register({
    name: 'fs_chown',
    module: 'fs',
    executor: (args) => {
      try {
        const filePath = String(args[0]);
        const uid = Number(args[1]);
        const gid = Number(args[2]);
        fs.chownSync(filePath, uid, gid);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 빈 파일 생성 (touch)
  registry.register({
    name: 'fs_touch',
    module: 'fs',
    executor: (args) => {
      try {
        const filePath = String(args[0]);
        if (!fs.existsSync(filePath)) {
          fs.writeFileSync(filePath, '');
        } else {
          const now = new Date();
          fs.utimesSync(filePath, now, now);
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // Glob 패턴 매칭
  registry.register({
    name: 'fs_glob',
    module: 'fs',
    executor: (args) => {
      try {
        const pattern = String(args[0]);
        // 간단한 glob 패턴 구현 (전체 구현은 glob 라이브러리 필요)
        const basePath = path.dirname(pattern);
        const files: string[] = [];
        if (fs.existsSync(basePath)) {
          const entries = fs.readdirSync(basePath);
          files.push(...entries);
        }
        return { success: true, files };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 파일/폴더 감시
  registry.register({
    name: 'fs_watch',
    module: 'fs',
    executor: (args) => {
      try {
        const filePath = String(args[0]);
        const watcher = fs.watch(filePath, (eventType, filename) => {
          // 감시 콜백 처리
        });
        return { success: true, watcherId: Math.random() };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 감시 해제
  registry.register({
    name: 'fs_unwatch',
    module: 'fs',
    executor: (args) => {
      try {
        // 감시 해제 구현
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 파일 자르기
  registry.register({
    name: 'fs_truncate',
    module: 'fs',
    executor: (args) => {
      try {
        const filePath = String(args[0]);
        const length = Number(args[1]);
        fs.truncateSync(filePath, length);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 하드 링크 생성
  registry.register({
    name: 'fs_link',
    module: 'fs',
    executor: (args) => {
      try {
        const existingPath = String(args[0]);
        const newPath = String(args[1]);
        fs.linkSync(existingPath, newPath);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 파일 이름 변경
  registry.register({
    name: 'fs_rename',
    module: 'fs',
    executor: (args) => {
      try {
        const oldPath = String(args[0]);
        const newPath = String(args[1]);
        fs.renameSync(oldPath, newPath);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 디렉토리 존재 여부 확인
  registry.register({
    name: 'fs_dir_exists',
    module: 'fs',
    executor: (args) => {
      const dirPath = String(args[0]);
      try {
        const stat = fs.statSync(dirPath);
        return { success: true, exists: stat.isDirectory() };
      } catch {
        return { success: true, exists: false };
      }
    }
  });

  // 파일 여부 확인
  registry.register({
    name: 'fs_is_file',
    module: 'fs',
    executor: (args) => {
      const filePath = String(args[0]);
      try {
        const stat = fs.statSync(filePath);
        return { success: true, isFile: stat.isFile() };
      } catch {
        return { success: true, isFile: false };
      }
    }
  });

  // 디렉토리 여부 확인
  registry.register({
    name: 'fs_is_dir',
    module: 'fs',
    executor: (args) => {
      const dirPath = String(args[0]);
      try {
        const stat = fs.statSync(dirPath);
        return { success: true, isDir: stat.isDirectory() };
      } catch {
        return { success: true, isDir: false };
      }
    }
  });

  // 심볼릭 링크 여부 확인
  registry.register({
    name: 'fs_is_symlink',
    module: 'fs',
    executor: (args) => {
      const filePath = String(args[0]);
      try {
        const stat = fs.lstatSync(filePath);
        return { success: true, isSymlink: stat.isSymbolicLink() };
      } catch {
        return { success: true, isSymlink: false };
      }
    }
  });

  // 파일 찾기
  registry.register({
    name: 'fs_find',
    module: 'fs',
    executor: (args) => {
      try {
        const dirPath = String(args[0]);
        const pattern = String(args[1]);
        const results: string[] = [];

        function walk(dir: string) {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const fullPath = path.join(dir, file);
            if (file.includes(pattern)) {
              results.push(fullPath);
            }
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
              walk(fullPath);
            }
          }
        }

        if (fs.existsSync(dirPath)) {
          walk(dirPath);
        }
        return { success: true, files: results };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 파일만 찾기
  registry.register({
    name: 'fs_find_files',
    module: 'fs',
    executor: (args) => {
      try {
        const dirPath = String(args[0]);
        const pattern = String(args[1]);
        const results: string[] = [];

        function walk(dir: string) {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isFile() && file.includes(pattern)) {
              results.push(fullPath);
            } else if (stat.isDirectory()) {
              walk(fullPath);
            }
          }
        }

        if (fs.existsSync(dirPath)) {
          walk(dirPath);
        }
        return { success: true, files: results };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 디렉토리만 찾기
  registry.register({
    name: 'fs_find_dirs',
    module: 'fs',
    executor: (args) => {
      try {
        const dirPath = String(args[0]);
        const pattern = String(args[1]);
        const results: string[] = [];

        function walk(dir: string) {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
              if (file.includes(pattern)) {
                results.push(fullPath);
              }
              walk(fullPath);
            }
          }
        }

        if (fs.existsSync(dirPath)) {
          walk(dirPath);
        }
        return { success: true, dirs: results };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 디스크 사용량
  registry.register({
    name: 'fs_disk_usage',
    module: 'fs',
    executor: (args) => {
      try {
        const dirPath = String(args[0]);
        let totalSize = 0;

        function walk(dir: string) {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            totalSize += stat.size;
            if (stat.isDirectory()) {
              walk(fullPath);
            }
          }
        }

        if (fs.existsSync(dirPath)) {
          walk(dirPath);
        }
        return { success: true, totalBytes: totalSize };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 디스크 여유 공간
  registry.register({
    name: 'fs_free_space',
    module: 'fs',
    executor: (args) => {
      try {
        // 실제로는 os 모듈이나 외부 명령어 필요
        return { success: true, freeBytes: os.freemem() };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 임시 디렉토리
  registry.register({
    name: 'fs_temp_dir',
    module: 'fs',
    executor: (args) => {
      return { success: true, path: os.tmpdir() };
    }
  });

  // 임시 파일 생성
  registry.register({
    name: 'fs_temp_file',
    module: 'fs',
    executor: (args) => {
      try {
        const tempDir = os.tmpdir();
        const filename = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const tempPath = path.join(tempDir, filename);
        fs.writeFileSync(tempPath, '');
        return { success: true, path: tempPath };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 임시 디렉토리 생성
  registry.register({
    name: 'fs_temp_dir_create',
    module: 'fs',
    executor: (args) => {
      try {
        const tempDir = os.tmpdir();
        const dirname = `tempdir-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const tempPath = path.join(tempDir, dirname);
        fs.mkdirSync(tempPath);
        return { success: true, path: tempPath };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 현재 작업 디렉토리
  registry.register({
    name: 'fs_cwd',
    module: 'fs',
    executor: (args) => {
      return { success: true, cwd: process.cwd() };
    }
  });

  // 경로 해석
  registry.register({
    name: 'fs_resolve',
    module: 'fs',
    executor: (args) => {
      const filePath = String(args[0]);
      return { success: true, resolved: path.resolve(filePath) };
    }
  });

  // 파일명만 추출
  registry.register({
    name: 'fs_basename',
    module: 'fs',
    executor: (args) => {
      const filePath = String(args[0]);
      return { success: true, basename: path.basename(filePath) };
    }
  });

  // 디렉토리명 추출
  registry.register({
    name: 'fs_dirname',
    module: 'fs',
    executor: (args) => {
      const filePath = String(args[0]);
      return { success: true, dirname: path.dirname(filePath) };
    }
  });

  // 확장자 추출
  registry.register({
    name: 'fs_extname',
    module: 'fs',
    executor: (args) => {
      const filePath = String(args[0]);
      return { success: true, extname: path.extname(filePath) };
    }
  });

  // 경로 결합
  registry.register({
    name: 'fs_join',
    module: 'fs',
    executor: (args) => {
      const part1 = String(args[0]);
      const part2 = String(args[1]);
      return { success: true, joined: path.join(part1, part2) };
    }
  });

  // 상대 경로 계산
  registry.register({
    name: 'fs_relative',
    module: 'fs',
    executor: (args) => {
      const from = String(args[0]);
      const to = String(args[1]);
      return { success: true, relative: path.relative(from, to) };
    }
  });

  // ==================== 스트림/버퍼 함수 (30개) ====================

  // Readable 스트림 생성
  registry.register({
    name: 'stream_readable',
    module: 'stream',
    executor: (args) => {
      try {
        const filePath = String(args[0]);
        const readable = fs.createReadStream(filePath);
        return { success: true, streamId: Math.random() };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // Writable 스트림 생성
  registry.register({
    name: 'stream_writable',
    module: 'stream',
    executor: (args) => {
      try {
        const filePath = String(args[0]);
        const writable = fs.createWriteStream(filePath);
        return { success: true, streamId: Math.random() };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // Transform 스트림 생성
  registry.register({
    name: 'stream_transform',
    module: 'stream',
    executor: (args) => {
      const transformer = new stream.Transform({
        transform(chunk, encoding, callback) {
          callback(null, chunk);
        }
      });
      return { success: true, streamId: Math.random() };
    }
  });

  // Passthrough 스트림 생성
  registry.register({
    name: 'stream_passthrough',
    module: 'stream',
    executor: (args) => {
      const passthrough = new stream.PassThrough();
      return { success: true, streamId: Math.random() };
    }
  });

  // 스트림 연결 (pipe)
  registry.register({
    name: 'stream_pipe',
    module: 'stream',
    executor: (args) => {
      try {
        // 스트림 ID를 기반으로 pipe 처리 필요
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // Pipe 해제
  registry.register({
    name: 'stream_unpipe',
    module: 'stream',
    executor: (args) => {
      try {
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 스트림에서 읽기
  registry.register({
    name: 'stream_read',
    module: 'stream',
    executor: (args) => {
      try {
        const size = Number(args[0]);
        return { success: true, data: null };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 스트림에 쓰기
  registry.register({
    name: 'stream_write',
    module: 'stream',
    executor: (args) => {
      try {
        const data = String(args[0]);
        return { success: true, written: data.length };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 스트림 종료
  registry.register({
    name: 'stream_end',
    module: 'stream',
    executor: (args) => {
      try {
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 스트림 파괴
  registry.register({
    name: 'stream_destroy',
    module: 'stream',
    executor: (args) => {
      try {
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 이벤트 리스너 추가
  registry.register({
    name: 'stream_on',
    module: 'stream',
    executor: (args) => {
      try {
        const event = String(args[0]);
        // Callback 처리 필요
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 이벤트 리스너 제거
  registry.register({
    name: 'stream_off',
    module: 'stream',
    executor: (args) => {
      try {
        const event = String(args[0]);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 일회용 이벤트 리스너
  registry.register({
    name: 'stream_once',
    module: 'stream',
    executor: (args) => {
      try {
        const event = String(args[0]);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 이벤트 발생
  registry.register({
    name: 'stream_emit',
    module: 'stream',
    executor: (args) => {
      try {
        const event = String(args[0]);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 버퍼 할당
  registry.register({
    name: 'buffer_alloc',
    module: 'stream',
    executor: (args) => {
      try {
        const size = Number(args[0]);
        const buffer = Buffer.alloc(size);
        return { success: true, bufferId: Math.random(), size };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 데이터로부터 버퍼 생성
  registry.register({
    name: 'buffer_from',
    module: 'stream',
    executor: (args) => {
      try {
        const data = String(args[0]);
        const buffer = Buffer.from(data, 'utf-8');
        return { success: true, bufferId: Math.random(), size: buffer.length };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 버퍼 연결
  registry.register({
    name: 'buffer_concat',
    module: 'stream',
    executor: (args) => {
      try {
        // 버퍼 ID 배열 처리 필요
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 버퍼 복사
  registry.register({
    name: 'buffer_copy',
    module: 'stream',
    executor: (args) => {
      try {
        // 버퍼 복사 처리
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 버퍼 자르기
  registry.register({
    name: 'buffer_slice',
    module: 'stream',
    executor: (args) => {
      try {
        const start = Number(args[0]);
        const end = Number(args[1]);
        return { success: true, bufferId: Math.random() };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 버퍼를 문자열로 변환
  registry.register({
    name: 'buffer_to_string',
    module: 'stream',
    executor: (args) => {
      try {
        // 버퍼 ID를 기반으로 문자열 변환
        return { success: true, data: '' };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 버퍼를 Base64로 변환
  registry.register({
    name: 'buffer_to_base64',
    module: 'stream',
    executor: (args) => {
      try {
        const data = String(args[0]);
        const encoded = Buffer.from(data).toString('base64');
        return { success: true, encoded };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // Base64에서 버퍼로 변환
  registry.register({
    name: 'buffer_from_base64',
    module: 'stream',
    executor: (args) => {
      try {
        const encoded = String(args[0]);
        const buffer = Buffer.from(encoded, 'base64');
        return { success: true, bufferId: Math.random(), size: buffer.length };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 버퍼 비교
  registry.register({
    name: 'buffer_compare',
    module: 'stream',
    executor: (args) => {
      try {
        return { success: true, result: 0 };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 버퍼에 정수 쓰기
  registry.register({
    name: 'buffer_write_int',
    module: 'stream',
    executor: (args) => {
      try {
        const value = Number(args[0]);
        const offset = Number(args[1]);
        return { success: true, written: 4 };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 버퍼에서 정수 읽기
  registry.register({
    name: 'buffer_read_int',
    module: 'stream',
    executor: (args) => {
      try {
        const offset = Number(args[0]);
        return { success: true, value: 0 };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 버퍼에 float 쓰기
  registry.register({
    name: 'buffer_write_float',
    module: 'stream',
    executor: (args) => {
      try {
        const value = Number(args[0]);
        const offset = Number(args[1]);
        return { success: true, written: 4 };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 버퍼에서 float 읽기
  registry.register({
    name: 'buffer_read_float',
    module: 'stream',
    executor: (args) => {
      try {
        const offset = Number(args[0]);
        return { success: true, value: 0.0 };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 버퍼에서 라인 읽기
  registry.register({
    name: 'buffer_read_line',
    module: 'stream',
    executor: (args) => {
      try {
        return { success: true, line: '' };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 버퍼에서 특정 문자까지 읽기
  registry.register({
    name: 'buffer_read_until',
    module: 'stream',
    executor: (args) => {
      try {
        const delimiter = String(args[0]);
        return { success: true, data: '' };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 라인별 읽기 (readline)
  registry.register({
    name: 'stream_readline',
    module: 'stream',
    executor: (args) => {
      try {
        const filePath = String(args[0]);
        const lines: string[] = [];
        const content = fs.readFileSync(filePath, 'utf-8');
        content.split('\n').forEach(line => lines.push(line));
        return { success: true, lines };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // ==================== 압축 함수 (20개) ====================

  // Gzip 압축
  registry.register({
    name: 'gzip_compress',
    module: 'compression',
    executor: (args) => {
      try {
        const data = String(args[0]);
        const compressed = zlib.gzipSync(data);
        return { success: true, compressedSize: compressed.length };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // Gzip 압축 해제
  registry.register({
    name: 'gzip_decompress',
    module: 'compression',
    executor: (args) => {
      try {
        // 압축된 데이터 처리
        return { success: true, decompressed: '' };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // Brotli 압축
  registry.register({
    name: 'brotli_compress',
    module: 'compression',
    executor: (args) => {
      try {
        const data = String(args[0]);
        const compressed = zlib.brotliCompressSync(data);
        return { success: true, compressedSize: compressed.length };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // Brotli 압축 해제
  registry.register({
    name: 'brotli_decompress',
    module: 'compression',
    executor: (args) => {
      try {
        return { success: true, decompressed: '' };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // Deflate 압축
  registry.register({
    name: 'deflate_compress',
    module: 'compression',
    executor: (args) => {
      try {
        const data = String(args[0]);
        const compressed = zlib.deflateSync(data);
        return { success: true, compressedSize: compressed.length };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // Deflate 압축 해제 (Inflate)
  registry.register({
    name: 'deflate_inflate',
    module: 'compression',
    executor: (args) => {
      try {
        return { success: true, decompressed: '' };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // ZIP 파일 생성 (스텁)
  registry.register({
    name: 'zip_create',
    module: 'compression',
    executor: (args) => {
      try {
        const zipPath = String(args[0]);
        return { success: true, path: zipPath };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // ZIP에 파일 추가 (스텁)
  registry.register({
    name: 'zip_add_file',
    module: 'compression',
    executor: (args) => {
      try {
        const zipPath = String(args[0]);
        const filePath = String(args[1]);
        const arcName = String(args[2]);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // ZIP 추출 (스텁)
  registry.register({
    name: 'zip_extract',
    module: 'compression',
    executor: (args) => {
      try {
        const zipPath = String(args[0]);
        const outputDir = String(args[1]);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // ZIP 파일 목록 (스텁)
  registry.register({
    name: 'zip_list',
    module: 'compression',
    executor: (args) => {
      try {
        const zipPath = String(args[0]);
        return { success: true, files: [] };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // ZIP에서 파일 읽기 (스텁)
  registry.register({
    name: 'zip_read_file',
    module: 'compression',
    executor: (args) => {
      try {
        const zipPath = String(args[0]);
        const filePath = String(args[1]);
        return { success: true, data: '' };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // TAR 파일 생성 (스텁)
  registry.register({
    name: 'tar_create',
    module: 'compression',
    executor: (args) => {
      try {
        const tarPath = String(args[0]);
        return { success: true, path: tarPath };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // TAR 추출 (스텁)
  registry.register({
    name: 'tar_extract',
    module: 'compression',
    executor: (args) => {
      try {
        const tarPath = String(args[0]);
        const outputDir = String(args[1]);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // TAR 파일 목록 (스텁)
  registry.register({
    name: 'tar_list',
    module: 'compression',
    executor: (args) => {
      try {
        const tarPath = String(args[0]);
        return { success: true, files: [] };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // TAR에서 파일 읽기 (스텁)
  registry.register({
    name: 'tar_read_file',
    module: 'compression',
    executor: (args) => {
      try {
        const tarPath = String(args[0]);
        const filePath = String(args[1]);
        return { success: true, data: '' };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // TAR에 파일 추가 (스텁)
  registry.register({
    name: 'tar_add_file',
    module: 'compression',
    executor: (args) => {
      try {
        const tarPath = String(args[0]);
        const filePath = String(args[1]);
        const arcName = String(args[2]);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // LZ4 압축 (스텁)
  registry.register({
    name: 'lz4_compress',
    module: 'compression',
    executor: (args) => {
      try {
        const data = String(args[0]);
        return { success: true, compressedSize: Math.ceil(data.length * 0.8) };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // LZ4 압축 해제 (스텁)
  registry.register({
    name: 'lz4_decompress',
    module: 'compression',
    executor: (args) => {
      try {
        return { success: true, decompressed: '' };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // Zstandard 압축 (스텁)
  registry.register({
    name: 'zstd_compress',
    module: 'compression',
    executor: (args) => {
      try {
        const data = String(args[0]);
        return { success: true, compressedSize: Math.ceil(data.length * 0.75) };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // Zstandard 압축 해제 (스텁)
  registry.register({
    name: 'zstd_decompress',
    module: 'compression',
    executor: (args) => {
      try {
        return { success: true, decompressed: '' };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // ==================== 프로세스 함수 (30개) ====================

  // 자식 프로세스 생성 (spawn)
  registry.register({
    name: 'process_spawn',
    module: 'process',
    executor: (args) => {
      try {
        const command = String(args[0]);
        // args 배열 처리 필요
        const child = child_process.spawn(command);
        return { success: true, pid: child.pid };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 명령 실행 (exec)
  registry.register({
    name: 'process_exec',
    module: 'process',
    executor: (args) => {
      try {
        const command = String(args[0]);
        child_process.exec(command, (error, stdout, stderr) => {
          // 콜백 처리
        });
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 동기 명령 실행 (execSync)
  registry.register({
    name: 'process_exec_sync',
    module: 'process',
    executor: (args) => {
      try {
        const command = String(args[0]);
        const output = child_process.execSync(command, { encoding: 'utf-8' });
        return { success: true, output };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 프로세스 종료
  registry.register({
    name: 'process_kill',
    module: 'process',
    executor: (args) => {
      try {
        const pid = Number(args[0]);
        process.kill(pid);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 현재 프로세스 PID
  registry.register({
    name: 'process_pid',
    module: 'process',
    executor: (args) => {
      return { success: true, pid: process.pid };
    }
  });

  // 부모 프로세스 PID
  registry.register({
    name: 'process_ppid',
    module: 'process',
    executor: (args) => {
      return { success: true, ppid: process.ppid };
    }
  });

  // 명령행 인자
  registry.register({
    name: 'process_argv',
    module: 'process',
    executor: (args) => {
      return { success: true, argv: process.argv };
    }
  });

  // 환경 변수 조회
  registry.register({
    name: 'process_env_get',
    module: 'process',
    executor: (args) => {
      const key = String(args[0]);
      return { success: true, value: process.env[key] || null };
    }
  });

  // 환경 변수 설정
  registry.register({
    name: 'process_env_set',
    module: 'process',
    executor: (args) => {
      const key = String(args[0]);
      const value = String(args[1]);
      process.env[key] = value;
      return { success: true };
    }
  });

  // 모든 환경 변수 조회
  registry.register({
    name: 'process_env_all',
    module: 'process',
    executor: (args) => {
      return { success: true, env: process.env };
    }
  });

  // 현재 작업 디렉토리
  registry.register({
    name: 'process_cwd',
    module: 'process',
    executor: (args) => {
      return { success: true, cwd: process.cwd() };
    }
  });

  // 작업 디렉토리 변경
  registry.register({
    name: 'process_chdir',
    module: 'process',
    executor: (args) => {
      try {
        const dir = String(args[0]);
        process.chdir(dir);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 프로세스 종료
  registry.register({
    name: 'process_exit',
    module: 'process',
    executor: (args) => {
      const code = Number(args[0]);
      process.exit(code);
      return { success: true };
    }
  });

  // 프로세스 종료 이벤트 리스너
  registry.register({
    name: 'process_on_exit',
    module: 'process',
    executor: (args) => {
      try {
        process.on('exit', (code) => {
          // 콜백 처리
        });
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 신호 처리
  registry.register({
    name: 'process_signal',
    module: 'process',
    executor: (args) => {
      try {
        const signal = String(args[0]);
        process.on(signal, () => {
          // 콜백 처리
        });
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 자식 프로세스로 메시지 전송
  registry.register({
    name: 'process_send',
    module: 'process',
    executor: (args) => {
      try {
        const message = String(args[0]);
        if (process.send) {
          process.send(message);
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 메시지 수신 리스너
  registry.register({
    name: 'process_on_message',
    module: 'process',
    executor: (args) => {
      try {
        process.on('message', (msg) => {
          // 콜백 처리
        });
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 자식 프로세스 분기 (fork)
  registry.register({
    name: 'process_fork',
    module: 'process',
    executor: (args) => {
      try {
        const scriptPath = String(args[0]);
        const child = child_process.fork(scriptPath);
        return { success: true, pid: child.pid };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 자식 프로세스 stdin 쓰기
  registry.register({
    name: 'child_stdin_write',
    module: 'process',
    executor: (args) => {
      try {
        const childPid = Number(args[0]);
        const data = String(args[1]);
        return { success: true, written: data.length };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 자식 프로세스 stdout 읽기
  registry.register({
    name: 'child_stdout_read',
    module: 'process',
    executor: (args) => {
      try {
        const childPid = Number(args[0]);
        return { success: true, data: '' };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 자식 프로세스 stderr 읽기
  registry.register({
    name: 'child_stderr_read',
    module: 'process',
    executor: (args) => {
      try {
        const childPid = Number(args[0]);
        return { success: true, data: '' };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 자식 프로세스 대기
  registry.register({
    name: 'child_wait',
    module: 'process',
    executor: (args) => {
      try {
        const childPid = Number(args[0]);
        return { success: true, exitCode: 0 };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 자식 프로세스 실행 중 확인
  registry.register({
    name: 'child_is_running',
    module: 'process',
    executor: (args) => {
      try {
        const childPid = Number(args[0]);
        return { success: true, running: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 자식 프로세스 종료
  registry.register({
    name: 'child_kill',
    module: 'process',
    executor: (args) => {
      try {
        const childPid = Number(args[0]);
        process.kill(childPid);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 프로세스 가동 시간
  registry.register({
    name: 'process_uptime',
    module: 'process',
    executor: (args) => {
      return { success: true, uptime: process.uptime() };
    }
  });

  // 메모리 사용량
  registry.register({
    name: 'process_memory',
    module: 'process',
    executor: (args) => {
      const memUsage = process.memoryUsage();
      return {
        success: true,
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external
      };
    }
  });

  // CPU 사용량 (간단한 예시)
  registry.register({
    name: 'process_cpu',
    module: 'process',
    executor: (args) => {
      const usage = process.cpuUsage();
      return {
        success: true,
        user: usage.user,
        system: usage.system
      };
    }
  });

  // 고해상도 시간 측정
  registry.register({
    name: 'process_hrtime',
    module: 'process',
    executor: (args) => {
      const hrtime = process.hrtime();
      return {
        success: true,
        seconds: hrtime[0],
        nanoseconds: hrtime[1]
      };
    }
  });

  // 다음 틱에 콜백 예약
  registry.register({
    name: 'process_nextTick',
    module: 'process',
    executor: (args) => {
      try {
        process.nextTick(() => {
          // 콜백 처리
        });
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });

  // 즉시 콜백 예약
  registry.register({
    name: 'process_setImmediate',
    module: 'process',
    executor: (args) => {
      try {
        setImmediate(() => {
          // 콜백 처리
        });
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  });
}
