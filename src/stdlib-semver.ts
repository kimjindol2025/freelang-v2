/**
 * FreeLang v2 stdlib — stdlib-semver.ts
 * npm semver 완전 대체 네이티브 함수 등록
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

const SEMVER_RE = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([\w.-]+))?(?:\+([\w.-]+))?$/;

function parseSemver(v: string): { major: number; minor: number; patch: number; pre: string; build: string } | null {
  const clean = v.trim().replace(/^v/, '');
  const m = SEMVER_RE.exec(clean);
  if (!m) return null;
  return {
    major: parseInt(m[1]!, 10),
    minor: parseInt(m[2]!, 10),
    patch: parseInt(m[3]!, 10),
    pre: m[4] ?? '',
    build: m[5] ?? ''
  };
}

function compareSemver(v1: string, v2: string): number {
  const a = parseSemver(v1);
  const b = parseSemver(v2);
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;

  if (a.major !== b.major) return a.major > b.major ? 1 : -1;
  if (a.minor !== b.minor) return a.minor > b.minor ? 1 : -1;
  if (a.patch !== b.patch) return a.patch > b.patch ? 1 : -1;

  // prerelease: no pre > has pre
  if (!a.pre && b.pre) return 1;
  if (a.pre && !b.pre) return -1;
  if (a.pre !== b.pre) return a.pre > b.pre ? 1 : -1;
  return 0;
}

function satisfiesRange(version: string, range: string): boolean {
  const v = parseSemver(version);
  if (!v) return false;

  // Handle simple ranges: ^1.2.3, ~1.2.3, >=1.2.3, >1.2.3, <=1.2.3, <1.2.3, =1.2.3, 1.2.3, *
  range = range.trim();
  if (range === '*' || range === '') return true;

  const parts = range.split(/\s*\|\|\s*/);
  return parts.some(part => {
    part = part.trim();
    if (part.startsWith('^')) {
      const base = parseSemver(part.slice(1));
      if (!base) return false;
      const cmp = compareSemver(version, part.slice(1));
      if (cmp < 0) return false;
      if (base.major > 0) return v.major === base.major;
      if (base.minor > 0) return v.major === 0 && v.minor === base.minor;
      return v.major === 0 && v.minor === 0 && v.patch >= base.patch;
    }
    if (part.startsWith('~')) {
      const base = parseSemver(part.slice(1));
      if (!base) return false;
      const cmp = compareSemver(version, part.slice(1));
      return cmp >= 0 && v.major === base.major && v.minor === base.minor;
    }
    if (part.startsWith('>=')) return compareSemver(version, part.slice(2)) >= 0;
    if (part.startsWith('<=')) return compareSemver(version, part.slice(2)) <= 0;
    if (part.startsWith('>')) return compareSemver(version, part.slice(1)) > 0;
    if (part.startsWith('<')) return compareSemver(version, part.slice(1)) < 0;
    if (part.startsWith('=')) return compareSemver(version, part.slice(1)) === 0;
    return compareSemver(version, part) === 0;
  });
}

export function registerSemverFunctions(registry: NativeFunctionRegistry): void {
  registry.register({
    name: 'semver_valid',
    module: 'semver',
    paramCount: 1,
    executor: (args: any[]) => {
      const v = String(args[0]).trim().replace(/^v/, '');
      return SEMVER_RE.test(v) ? v : null;
    }
  });

  registry.register({
    name: 'semver_clean',
    module: 'semver',
    paramCount: 1,
    executor: (args: any[]) => {
      const v = String(args[0]).trim().replace(/^v/, '').replace(/\s+/g, '');
      return SEMVER_RE.test(v) ? v : null;
    }
  });

  registry.register({
    name: 'semver_parse',
    module: 'semver',
    paramCount: 1,
    executor: (args: any[]) => {
      const p = parseSemver(String(args[0]));
      if (!p) return null;
      return { major: p.major, minor: p.minor, patch: p.patch, prerelease: p.pre, raw: String(args[0]) };
    }
  });

  registry.register({
    name: 'semver_satisfies',
    module: 'semver',
    paramCount: 2,
    executor: (args: any[]) => satisfiesRange(String(args[0]), String(args[1]))
  });

  registry.register({
    name: 'semver_compare',
    module: 'semver',
    paramCount: 2,
    executor: (args: any[]) => compareSemver(String(args[0]), String(args[1]))
  });

  registry.register({
    name: 'semver_inc',
    module: 'semver',
    paramCount: 2,
    executor: (args: any[]) => {
      const p = parseSemver(String(args[0]));
      if (!p) return null;
      const release = String(args[1]);
      if (release === 'major') return `${p.major + 1}.0.0`;
      if (release === 'minor') return `${p.major}.${p.minor + 1}.0`;
      if (release === 'patch') return `${p.major}.${p.minor}.${p.patch + 1}`;
      if (release === 'premajor') return `${p.major + 1}.0.0-0`;
      if (release === 'preminor') return `${p.major}.${p.minor + 1}.0-0`;
      if (release === 'prepatch') return `${p.major}.${p.minor}.${p.patch + 1}-0`;
      if (release === 'prerelease') {
        if (p.pre) {
          const num = parseInt(p.pre.split('.').pop() ?? '0', 10);
          return `${p.major}.${p.minor}.${p.patch}-${isNaN(num) ? p.pre + '.0' : p.pre.replace(/\d+$/, String(num + 1))}`;
        }
        return `${p.major}.${p.minor}.${p.patch + 1}-0`;
      }
      return null;
    }
  });

  registry.register({
    name: 'semver_major',
    module: 'semver',
    paramCount: 1,
    executor: (args: any[]) => parseSemver(String(args[0]))?.major ?? 0
  });

  registry.register({
    name: 'semver_minor',
    module: 'semver',
    paramCount: 1,
    executor: (args: any[]) => parseSemver(String(args[0]))?.minor ?? 0
  });

  registry.register({
    name: 'semver_patch',
    module: 'semver',
    paramCount: 1,
    executor: (args: any[]) => parseSemver(String(args[0]))?.patch ?? 0
  });

  registry.register({
    name: 'semver_prerelease',
    module: 'semver',
    paramCount: 1,
    executor: (args: any[]) => parseSemver(String(args[0]))?.pre ?? null
  });

  registry.register({
    name: 'semver_valid_range',
    module: 'semver',
    paramCount: 1,
    executor: (args: any[]) => {
      const range = String(args[0]).trim();
      if (!range || range === '*') return range;
      return range;
    }
  });

  registry.register({
    name: 'semver_max_satisfying',
    module: 'semver',
    paramCount: 2,
    executor: (args: any[]) => {
      const versions = (args[0] as string[]).filter(v => satisfiesRange(v, String(args[1])));
      if (versions.length === 0) return null;
      return versions.sort((a, b) => compareSemver(b, a))[0];
    }
  });

  registry.register({
    name: 'semver_min_satisfying',
    module: 'semver',
    paramCount: 2,
    executor: (args: any[]) => {
      const versions = (args[0] as string[]).filter(v => satisfiesRange(v, String(args[1])));
      if (versions.length === 0) return null;
      return versions.sort((a, b) => compareSemver(a, b))[0];
    }
  });

  registry.register({
    name: 'semver_sort',
    module: 'semver',
    paramCount: 2,
    executor: (args: any[]) => {
      const reverse = Boolean(args[1]);
      return [...(args[0] as string[])].sort((a, b) =>
        reverse ? compareSemver(b, a) : compareSemver(a, b)
      );
    }
  });

  registry.register({
    name: 'semver_coerce',
    module: 'semver',
    paramCount: 1,
    executor: (args: any[]) => {
      const m = /(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(String(args[0]));
      if (!m) return null;
      return `${m[1] ?? 0}.${m[2] ?? 0}.${m[3] ?? 0}`;
    }
  });
}
