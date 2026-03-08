/**
 * FreeLang v2 - Commit-Gate CLI
 *
 * .git/hooks 미사용. git config core.hooksPath 방식으로
 * ~/.freelang-gate/hooks/ 를 훅 디렉토리로 등록.
 *
 * 명령어:
 *   freelang gate install <file.free>  → Gate 설치 + hook 스크립트 생성
 *   freelang gate uninstall            → Gate 제거 + core.hooksPath 복원
 *   freelang gate status               → 현재 상태 표시
 *   freelang gate run <event>          → 훅 수동 실행 (pre-commit, pre-push)
 *   freelang gate list                 → 등록된 훅 목록
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  installGate,
  uninstallGate,
  gateStatus,
  getRegisteredHooks,
  GitHookEvent,
  GateHookEntry
} from '../vcs/vcs-bridge';
import { ProgramRunner } from './runner';
import { registerVCSFunctions } from '../stdlib/stdlib-vcs';

/** gate CLI 진입점 */
export async function runGateCLI(subArgs: string[]): Promise<void> {
  const subCommand = subArgs[0];

  switch (subCommand) {
    case 'install':
      await cmdInstall(subArgs.slice(1));
      break;
    case 'uninstall':
      cmdUninstall();
      break;
    case 'status':
      cmdStatus();
      break;
    case 'run':
      await cmdRun(subArgs.slice(1));
      break;
    case 'list':
      cmdList();
      break;
    default:
      showGateUsage();
      if (subCommand) process.exit(1);
  }
}

/** freelang gate install <file.free> */
async function cmdInstall(args: string[]): Promise<void> {
  const sourceArg = args[0];

  if (!sourceArg) {
    // 현재 디렉토리에서 .free 파일 자동 탐색
    const freeFiles = fs.readdirSync(process.cwd()).filter(f => f.endsWith('.free'));
    if (freeFiles.length === 0) {
      console.error('[gate] .free 파일을 찾을 수 없습니다. 경로를 지정하세요.');
      console.error('Usage: freelang gate install <file.free>');
      process.exit(1);
    }
    if (freeFiles.length > 1) {
      console.log('[gate] 발견된 .free 파일:');
      freeFiles.forEach(f => console.log(`  ${f}`));
      console.error('\n여러 파일이 있습니다. 명시적으로 지정하세요:');
      console.error(`  freelang gate install <file.free>`);
      process.exit(1);
    }
    return cmdInstall([freeFiles[0]]);
  }

  const resolvedSource = path.resolve(sourceArg);
  if (!fs.existsSync(resolvedSource)) {
    console.error(`[gate] 파일을 찾을 수 없습니다: ${resolvedSource}`);
    process.exit(1);
  }

  const source = fs.readFileSync(resolvedSource, 'utf8');
  // 프로젝트 루트: git root 우선, 없으면 소스 파일의 상위 디렉토리
  const { getGitRoot } = await import('../vcs/vcs-bridge');
  const projectRoot = getGitRoot(path.dirname(resolvedSource)) || path.dirname(resolvedSource);

  console.log(`[gate] 분석 중: ${path.basename(resolvedSource)}`);

  const { installed, hooksPath } = installGate(resolvedSource, source, projectRoot);

  if (installed.length === 0) {
    console.warn('[gate] @git_hook 어노테이션이 있는 함수를 찾지 못했습니다.');
    console.warn('예시:');
    console.warn('  @git_hook(event: .pre_commit)');
    console.warn('  fn validate_before_save() {');
    console.warn('    vcs_lint()');
    console.warn('  }');
    process.exit(0);
  }

  console.log('\n[Commit-Gate] 설치 완료:');
  console.log(`  훅 디렉토리: ${hooksPath}`);
  console.log(`  .git/hooks: 미사용 (core.hooksPath 방식)`);
  console.log('\n  등록된 훅:');
  for (const h of installed) {
    const eventName = h.event.replace(/_/g, '-');
    console.log(`    @git_hook(event: .${h.event}) fn ${h.fnName}() → ${eventName}`);
  }
  console.log('\n  이제 git commit/push 시 자동으로 Gate가 실행됩니다.');
}

/** freelang gate uninstall */
function cmdUninstall(): void {
  const projectRoot = process.cwd();
  const before = gateStatus(projectRoot);

  if (!before.active) {
    console.log('[gate] Gate가 설치되어 있지 않습니다.');
    return;
  }

  uninstallGate(projectRoot);
  console.log('[gate] Gate 제거 완료. core.hooksPath 복원됨.');
}

/** freelang gate status */
function cmdStatus(): void {
  const projectRoot = process.cwd();
  const status = gateStatus(projectRoot);

  console.log('\n[Commit-Gate 상태]');
  console.log(`  활성: ${status.active ? 'YES' : 'NO'}`);
  console.log(`  Git 루트: ${status.gitRoot || '없음'}`);
  console.log(`  core.hooksPath: ${status.hooksPath || '미설정 (.git/hooks 기본값)'}`);

  if (status.hooks.length === 0) {
    console.log('  등록된 훅: 없음');
  } else {
    console.log('\n  등록된 훅:');
    for (const h of status.hooks) {
      console.log(`    [${h.event.replace(/_/g, '-')}] fn ${h.fnName}()`);
      console.log(`      소스: ${h.sourceFile}`);
      console.log(`      등록: ${new Date(h.installedAt).toLocaleString('ko-KR')}`);
    }
  }
  console.log('');
}

/** freelang gate list */
function cmdList(): void {
  const hooks = getRegisteredHooks();
  if (hooks.length === 0) {
    console.log('[gate] 등록된 훅이 없습니다. `freelang gate install` 을 실행하세요.');
    return;
  }

  console.log('\n[Commit-Gate 훅 목록]');
  const byEvent: Record<string, GateHookEntry[]> = {};
  for (const h of hooks) {
    if (!byEvent[h.event]) byEvent[h.event] = [];
    byEvent[h.event].push(h);
  }

  for (const [event, entries] of Object.entries(byEvent)) {
    console.log(`\n  [${event.replace(/_/g, '-')}]`);
    for (const e of entries) {
      console.log(`    fn ${e.fnName}()  ← ${e.sourceFile}`);
    }
  }
  console.log('');
}

/**
 * freelang gate run <pre-commit|pre-push|commit-msg|post-commit>
 *
 * Gate가 실제 Git hook에서 호출하는 함수.
 * 등록된 @git_hook 함수를 FreeLang VM에서 실행.
 */
async function cmdRun(args: string[]): Promise<void> {
  const eventArg = (args[0] || 'pre-commit').replace(/-/g, '_') as GitHookEvent;
  const hooks = getRegisteredHooks(eventArg);

  if (hooks.length === 0) {
    // 훅 없으면 통과 (조용히)
    process.exit(0);
  }

  let anyFailed = false;

  for (const hook of hooks) {
    if (!fs.existsSync(hook.sourceFile)) {
      process.stderr.write(`[Commit-Gate] 소스 파일 없음: ${hook.sourceFile}\n`);
      anyFailed = true;
      continue;
    }

    const source = fs.readFileSync(hook.sourceFile, 'utf8');

    try {
      const runner = new ProgramRunner();
      // VCS stdlib 등록 (gate 전용): getNativeRegistry()로 VM native registry에 등록
      registerVCSFunctions(runner.getNativeRegistry());

      // 소스 전체를 로드하고 특정 훅 함수만 호출
      const gateSource = `${source}\n\nfn main() {\n  ${hook.fnName}()\n}\n`;
      const result = runner.runString(gateSource);

      if (!result.success) {
        process.stderr.write(`[Commit-Gate] ${hook.fnName}() 실패: ${result.error}\n`);
        anyFailed = true;
      }
    } catch (err) {
      process.stderr.write(`[Commit-Gate] ${hook.fnName}() 오류: ${err instanceof Error ? err.message : String(err)}\n`);
      anyFailed = true;
    }
  }

  process.exit(anyFailed ? 1 : 0);
}

/**
 * 외부에서 직접 호출 가능한 Gate 실행 함수 (hook 스크립트에서 require()로 사용)
 */
export async function runGateHooks(event: string): Promise<void> {
  await cmdRun([event]);
}

function showGateUsage(): void {
  console.log(`
[Commit-Gate] FreeLang v2 Native Guard Hook (Husky 대체)

Usage:
  freelang gate install [file.free]   Gate 설치 + @git_hook 함수 등록
  freelang gate uninstall             Gate 제거
  freelang gate status                현재 상태 확인
  freelang gate run <event>           훅 수동 실행
  freelang gate list                  등록된 훅 목록

Events:
  pre-commit    커밋 전 (기본값)
  pre-push      푸시 전
  commit-msg    커밋 메시지 검사
  post-commit   커밋 후

원리:
  - .git/hooks 미사용 → git config core.hooksPath 방식
  - ~/.freelang-gate/hooks/ 에 hook 스크립트 자동 생성
  - @git_hook(event: .pre_commit) 어노테이션 컴파일러 수준 처리

예시:
  # 1. .free 파일에 Gate 정의
  @git_hook(event: .pre_commit)
  fn validate_before_save() {
    vcs_check_secrets()
    vcs_lint()
    vcs_test()
  }

  # 2. Gate 설치
  freelang gate install my-gate.free

  # 3. 이제 git commit 시 자동 실행
  git add .
  git commit -m "feat: 새 기능"  # → Gate 자동 실행
  `);
}
