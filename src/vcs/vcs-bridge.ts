/**
 * FreeLang v2 VCS Bridge - Commit-Gate 핵심 모듈
 *
 * .git/hooks에 의존하지 않고 git config core.hooksPath를 통해
 * ~/.freelang-gate/hooks/ 를 훅 디렉토리로 등록.
 * 컴파일러 수준에서 커밋 무결성을 강제.
 *
 * 아키텍처:
 *   @git_hook(event: .pre_commit) fn → 컴파일러 감지
 *   → GateHookEmitter → ~/.freelang-gate/hooks/pre-commit 스크립트 생성
 *   → git config core.hooksPath = ~/.freelang-gate/hooks
 *   → git commit 시 자동 실행
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawnSync } from 'child_process';

// Commit-Gate 전역 디렉토리 (~/.freelang-gate)
const GATE_HOME = path.join(process.env.HOME || '/root', '.freelang-gate');
const GATE_HOOKS_DIR = path.join(GATE_HOME, 'hooks');
const GATE_REGISTRY = path.join(GATE_HOME, 'registry.json');

export type GitHookEvent = 'pre_commit' | 'pre_push' | 'commit_msg' | 'post_commit';

export interface GateHookEntry {
  event: GitHookEvent;
  fnName: string;         // FreeLang 함수명
  sourceFile: string;     // .free 소스 파일 경로
  projectRoot: string;    // 프로젝트 루트
  installedAt: string;    // ISO 날짜
}

export interface GateRegistry {
  hooks: GateHookEntry[];
  version: string;
}

/** git root 디렉토리를 반환. 없으면 null. */
export function getGitRoot(fromDir: string = process.cwd()): string | null {
  try {
    const result = spawnSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: fromDir,
      encoding: 'utf8'
    });
    if (result.status === 0) return result.stdout.trim();
    return null;
  } catch {
    return null;
  }
}

/** 현재 staged 파일 목록 반환. */
export function getStagedFiles(gitRoot: string): string[] {
  try {
    const result = spawnSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], {
      cwd: gitRoot,
      encoding: 'utf8'
    });
    if (result.status === 0) {
      return result.stdout.trim().split('\n').filter(Boolean);
    }
    return [];
  } catch {
    return [];
  }
}

/** 현재 브랜치명 반환. */
export function getCurrentBranch(gitRoot: string): string {
  try {
    const result = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: gitRoot,
      encoding: 'utf8'
    });
    return result.status === 0 ? result.stdout.trim() : 'unknown';
  } catch {
    return 'unknown';
  }
}

/** ~/.freelang-gate/hooks/ 디렉토리 초기화 */
export function initGateHome(): void {
  fs.mkdirSync(GATE_HOOKS_DIR, { recursive: true });
  if (!fs.existsSync(GATE_REGISTRY)) {
    const initial: GateRegistry = { hooks: [], version: '1.0.0' };
    fs.writeFileSync(GATE_REGISTRY, JSON.stringify(initial, null, 2));
  }
}

/** Gate 레지스트리 읽기 */
export function readRegistry(): GateRegistry {
  if (!fs.existsSync(GATE_REGISTRY)) {
    return { hooks: [], version: '1.0.0' };
  }
  return JSON.parse(fs.readFileSync(GATE_REGISTRY, 'utf8'));
}

/** Gate 레지스트리 저장 */
export function writeRegistry(reg: GateRegistry): void {
  fs.writeFileSync(GATE_REGISTRY, JSON.stringify(reg, null, 2));
}

/**
 * git config core.hooksPath 를 ~/.freelang-gate/hooks/ 로 설정.
 * .git/hooks 디렉토리 완전 우회.
 */
export function setHooksPath(gitRoot: string): void {
  spawnSync('git', ['config', 'core.hooksPath', GATE_HOOKS_DIR], {
    cwd: gitRoot,
    encoding: 'utf8'
  });
}

/** core.hooksPath 제거 (복원) */
export function unsetHooksPath(gitRoot: string): void {
  spawnSync('git', ['config', '--unset', 'core.hooksPath'], {
    cwd: gitRoot,
    encoding: 'utf8'
  });
}

/** 현재 core.hooksPath 확인 */
export function getHooksPath(gitRoot: string): string | null {
  try {
    const result = spawnSync('git', ['config', 'core.hooksPath'], {
      cwd: gitRoot,
      encoding: 'utf8'
    });
    return result.status === 0 ? result.stdout.trim() : null;
  } catch {
    return null;
  }
}

/**
 * GateHookEmitter: FreeLang @git_hook 함수를 실제 Git hook 스크립트로 변환
 *
 * 생성된 스크립트는 `freelang gate run <event>` 를 호출하여
 * 등록된 모든 .free 훅 함수를 실행. 실패 시 exit(1) → 커밋 차단.
 */
export function emitHookScript(event: GitHookEvent): string {
  const eventHyphen = event.replace(/_/g, '-');  // pre_commit → pre-commit
  const scriptPath = path.join(GATE_HOOKS_DIR, eventHyphen);

  const scriptContent = `#!/bin/sh
# FreeLang Commit-Gate: ${eventHyphen}
# 자동 생성됨 - 수동 편집 금지 (freelang gate install로 재생성)
# .git/hooks 미사용 | core.hooksPath: ~/.freelang-gate/hooks

set -e

FREELANG_BIN="${process.execPath}"
FREELANG_GATE="$(which freelang 2>/dev/null || echo 'npx ts-node /home/kimjin/Desktop/kim/v2-freelang-ai/src/index.ts')"

# Commit-Gate 실행: 등록된 모든 @git_hook(event: .${event}) 함수 실행
npx ts-node "${path.join(__dirname, '..', 'cli', 'gate-cli.ts')}" gate run ${event.replace(/_/g, '-')} 2>/dev/null || \\
  node -e "require('${path.join(__dirname, '..', '..', 'dist', 'cli', 'gate-cli.js')}').runGateHooks('${event}')" 2>/dev/null || \\
  $FREELANG_BIN -e "require('${path.join(__dirname, '..', 'cli', 'gate-cli.js')}').runGateHooks('${event}')"

EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  echo "[Commit-Gate] 무결성 검증 실패 - 커밋이 차단되었습니다." >&2
  exit 1
fi
exit 0
`;

  fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });
  return scriptPath;
}

/**
 * 특정 .free 파일에서 @git_hook 어노테이션이 붙은 함수 목록 추출
 */
export function extractGateHooks(
  source: string,
  sourceFile: string,
  projectRoot: string
): GateHookEntry[] {
  const entries: GateHookEntry[] = [];

  // 어노테이션 + 함수 선언 패턴 파싱 (런타임에 검사)
  // 형태: @git_hook(event: .pre_commit) fn fnName() { ... }
  const pattern = /@git_hook\s*\(\s*event\s*:\s*\.(\w+)\s*\)\s*\n?\s*(?:async\s+)?fn\s+(\w+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    const eventRaw = match[1] as GitHookEvent;
    const fnName = match[2];
    entries.push({
      event: eventRaw,
      fnName,
      sourceFile,
      projectRoot,
      installedAt: new Date().toISOString()
    });
  }

  return entries;
}

/**
 * Gate 설치: 특정 프로젝트에 Commit-Gate를 활성화
 *
 * 1. ~/.freelang-gate/hooks/ 초기화
 * 2. .free 소스에서 @git_hook 함수 탐지
 * 3. 이벤트별 hook 스크립트 생성
 * 4. git config core.hooksPath 설정 (.git/hooks 우회)
 * 5. 레지스트리에 등록
 */
export function installGate(
  sourceFile: string,
  source: string,
  projectRoot: string
): { installed: GateHookEntry[]; hooksPath: string } {
  initGateHome();

  const gitRoot = getGitRoot(projectRoot) || projectRoot;
  const hooks = extractGateHooks(source, sourceFile, projectRoot);

  if (hooks.length === 0) {
    return { installed: [], hooksPath: GATE_HOOKS_DIR };
  }

  // 이벤트별로 스크립트 생성
  const events = new Set(hooks.map(h => h.event));
  for (const event of events) {
    emitHookScript(event);
  }

  // 레지스트리 업데이트
  const reg = readRegistry();
  const absSourceFile = path.resolve(sourceFile);
  // 동일 sourceFile(상대/절대 모두)의 기존 항목 제거 후 재등록
  reg.hooks = reg.hooks.filter(h => path.resolve(h.sourceFile) !== absSourceFile);
  reg.hooks.push(...hooks);
  writeRegistry(reg);

  // .git/hooks 우회: core.hooksPath 설정
  setHooksPath(gitRoot);

  return { installed: hooks, hooksPath: GATE_HOOKS_DIR };
}

/** Gate 제거 */
export function uninstallGate(projectRoot: string): void {
  const gitRoot = getGitRoot(projectRoot) || projectRoot;
  unsetHooksPath(gitRoot);

  const reg = readRegistry();
  reg.hooks = reg.hooks.filter(h => h.projectRoot !== projectRoot);
  writeRegistry(reg);
}

/** Gate 상태 조회 */
export function gateStatus(projectRoot: string): {
  active: boolean;
  hooksPath: string | null;
  hooks: GateHookEntry[];
  gitRoot: string | null;
} {
  const gitRoot = getGitRoot(projectRoot);
  const hooksPath = gitRoot ? getHooksPath(gitRoot) : null;
  const reg = readRegistry();
  const projectHooks = reg.hooks.filter(h => h.projectRoot === projectRoot);

  return {
    active: hooksPath === GATE_HOOKS_DIR,
    hooksPath,
    hooks: projectHooks,
    gitRoot
  };
}

/** 등록된 훅 함수 목록 반환 (이벤트별 필터) */
export function getRegisteredHooks(event?: GitHookEvent): GateHookEntry[] {
  const reg = readRegistry();
  if (event) return reg.hooks.filter(h => h.event === event);
  return reg.hooks;
}
