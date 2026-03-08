/**
 * FreeLang v2 VCS 표준 라이브러리 - Commit-Gate 전용
 *
 * @git_hook 함수 내에서 사용 가능한 내장 함수 모음:
 *   git_staged_files()       → staged 파일 목록 반환
 *   git_root()               → 프로젝트 git 루트 경로
 *   git_branch()             → 현재 브랜치명
 *   vcs_lint(path?)          → 린트 실행 (실패 시 에러 던짐)
 *   vcs_test(pattern?)       → 테스트 실행 (실패 시 에러 던짐)
 *   vcs_exit_error(msg)      → 커밋 차단 + 메시지 출력
 *   vcs_check_secrets()      → 하드코딩된 시크릿 감지
 *   vcs_typecheck()          → FreeLang 타입 검사
 */

import { NativeFunctionRegistry } from '../vm/native-function-registry';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
  getStagedFiles,
  getGitRoot,
  getCurrentBranch
} from '../vcs/vcs-bridge';

export function registerVCSFunctions(registry: NativeFunctionRegistry): void {

  // ──────────────────────────────────────────────────────────────────
  // git_staged_files() → string[]
  // staged 상태의 파일 목록 반환
  // ──────────────────────────────────────────────────────────────────
  registry.register({
    name: 'git_staged_files',
    module: 'vcs',
    executor: (_args) => {
      const root = getGitRoot(process.cwd()) || process.cwd();
      return getStagedFiles(root);
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // git_root() → string
  // ──────────────────────────────────────────────────────────────────
  registry.register({
    name: 'git_root',
    module: 'vcs',
    executor: (_args) => {
      return getGitRoot(process.cwd()) || process.cwd();
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // git_branch() → string
  // ──────────────────────────────────────────────────────────────────
  registry.register({
    name: 'git_branch',
    module: 'vcs',
    executor: (_args) => {
      const root = getGitRoot(process.cwd()) || process.cwd();
      return getCurrentBranch(root);
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // vcs_lint(path?: string) → bool
  // 린트 실행. 실패하면 커밋을 차단(process.exit(1))
  // 지원: tsc, eslint, biome
  // ──────────────────────────────────────────────────────────────────
  registry.register({
    name: 'vcs_lint',
    module: 'vcs',
    executor: (args) => {
      const cwd = (args[0] as string | undefined) || process.cwd();

      // TypeScript 타입 검사
      if (fs.existsSync(path.join(cwd, 'tsconfig.json'))) {
        const tsc = spawnSync('npx', ['tsc', '--noEmit', '--strict'], {
          cwd, encoding: 'utf8', shell: true
        });
        if (tsc.status !== 0) {
          process.stderr.write(`[Commit-Gate/lint] TypeScript 오류:\n${tsc.stdout}${tsc.stderr}\n`);
          process.exit(1);
        }
      }

      // ESLint
      if (fs.existsSync(path.join(cwd, '.eslintrc.js')) ||
          fs.existsSync(path.join(cwd, '.eslintrc.json')) ||
          fs.existsSync(path.join(cwd, 'eslint.config.js'))) {
        const eslint = spawnSync('npx', ['eslint', '--max-warnings=0', '.'], {
          cwd, encoding: 'utf8', shell: true
        });
        if (eslint.status !== 0) {
          process.stderr.write(`[Commit-Gate/lint] ESLint 오류:\n${eslint.stdout}${eslint.stderr}\n`);
          process.exit(1);
        }
      }

      return true;
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // vcs_test(pattern?: string) → bool
  // 테스트 실행. 실패하면 커밋 차단.
  // 지원: jest, vitest, bun test, freelang test
  // ──────────────────────────────────────────────────────────────────
  registry.register({
    name: 'vcs_test',
    module: 'vcs',
    executor: (args) => {
      const cwd = (args[0] as string | undefined) || process.cwd();
      const pkg = (() => {
        try {
          return JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
        } catch { return null; }
      })();

      let testResult;
      if (pkg?.scripts?.test) {
        testResult = spawnSync('npm', ['test', '--', '--passWithNoTests'], {
          cwd, encoding: 'utf8', shell: true
        });
      } else if (fs.existsSync(path.join(cwd, 'vitest.config.ts'))) {
        testResult = spawnSync('npx', ['vitest', 'run'], {
          cwd, encoding: 'utf8', shell: true
        });
      } else {
        // 테스트 없으면 통과
        return true;
      }

      if (testResult.status !== 0) {
        process.stderr.write(`[Commit-Gate/test] 테스트 실패:\n${testResult.stdout}${testResult.stderr}\n`);
        process.exit(1);
      }
      return true;
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // vcs_exit_error(msg: string) → never
  // 커밋을 즉시 차단하고 사용자에게 메시지 출력
  // ──────────────────────────────────────────────────────────────────
  registry.register({
    name: 'vcs_exit_error',
    module: 'vcs',
    executor: (args) => {
      const msg = String(args[0] || '무결성 검증 실패');
      process.stderr.write(`\n[Commit-Gate] ❌ ${msg}\n`);
      process.exit(1);
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // vcs_check_secrets() → bool
  // staged 파일에서 하드코딩된 시크릿 패턴 감지.
  // 발견 시 커밋 차단.
  // ──────────────────────────────────────────────────────────────────
  registry.register({
    name: 'vcs_check_secrets',
    module: 'vcs',
    executor: (_args) => {
      const root = getGitRoot(process.cwd()) || process.cwd();
      const staged = getStagedFiles(root);
      if (staged.length === 0) return true;

      // 시크릿 패턴: API 키, 비밀번호, 토큰
      const patterns = [
        /password\s*=\s*["'][^"']{4,}["']/i,
        /secret\s*=\s*["'][^"']{8,}["']/i,
        /api[_-]?key\s*=\s*["'][^"']{8,}["']/i,
        /token\s*=\s*["'][^"']{16,}["']/i,
        /private[_-]?key\s*=\s*["'][^"']{16,}["']/i,
        /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/,
        /AKIA[0-9A-Z]{16}/,   // AWS 액세스 키
        /ghp_[a-zA-Z0-9]{36}/ // GitHub PAT
      ];

      const violations: string[] = [];
      for (const file of staged) {
        const fullPath = path.join(root, file);
        if (!fs.existsSync(fullPath)) continue;
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          for (const pattern of patterns) {
            if (pattern.test(content)) {
              violations.push(`${file}: 시크릿 패턴 감지 (${pattern.source.slice(0, 40)}...)`);
            }
          }
        } catch { /* 바이너리 파일 무시 */ }
      }

      if (violations.length > 0) {
        process.stderr.write('\n[Commit-Gate] 🔐 시크릿 감지됨:\n');
        violations.forEach(v => process.stderr.write(`  ✗ ${v}\n`));
        process.stderr.write('\n커밋이 차단되었습니다. 시크릿을 제거하거나 .gitignore에 추가하세요.\n');
        process.exit(1);
      }

      return true;
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // vcs_typecheck() → bool
  // FreeLang .free 파일 타입 검사 (staged 파일 중 .free 파일만)
  // ──────────────────────────────────────────────────────────────────
  registry.register({
    name: 'vcs_typecheck',
    module: 'vcs',
    executor: (_args) => {
      const root = getGitRoot(process.cwd()) || process.cwd();
      const staged = getStagedFiles(root).filter(f => f.endsWith('.free'));

      if (staged.length === 0) return true;

      const freeLangBin = path.join(__dirname, '..', '..', 'src', 'index.ts');
      for (const file of staged) {
        const fullPath = path.join(root, file);
        const result = spawnSync('npx', ['ts-node', freeLangBin, 'check', fullPath], {
          cwd: root, encoding: 'utf8', shell: true
        });
        if (result.status !== 0) {
          process.stderr.write(`[Commit-Gate/typecheck] ${file} 타입 오류:\n${result.stderr}\n`);
          process.exit(1);
        }
      }
      return true;
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // vcs_info() → map { staged, branch, root }
  // 현재 VCS 컨텍스트 정보 반환 (디버깅/로깅용)
  // ──────────────────────────────────────────────────────────────────
  registry.register({
    name: 'vcs_info',
    module: 'vcs',
    executor: (_args) => {
      const root = getGitRoot(process.cwd()) || process.cwd();
      const staged = getStagedFiles(root);
      const branch = getCurrentBranch(root);
      return { root, branch, staged, staged_count: staged.length };
    }
  });
}
