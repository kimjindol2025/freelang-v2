/**
 * FreeLang v2 stdlib — stdlib-ramda.ts
 * npm ramda 완전 대체 네이티브 함수 등록
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

export function registerRamdaFunctions(registry: NativeFunctionRegistry): void {
  registry.register({ name: 'ramda_map', module: 'ramda', paramCount: 2,
    executor: (args: any[]) => (args[1] as any[]).map(args[0])
  });

  registry.register({ name: 'ramda_filter', module: 'ramda', paramCount: 2,
    executor: (args: any[]) => (args[1] as any[]).filter(args[0])
  });

  registry.register({ name: 'ramda_reduce', module: 'ramda', paramCount: 3,
    executor: (args: any[]) => (args[2] as any[]).reduce(args[0], args[1])
  });

  registry.register({ name: 'ramda_compose', module: 'ramda', paramCount: 1,
    executor: (args: any[]) => {
      const fns = (args[0] as Function[]).slice().reverse();
      return (x: any) => fns.reduce((acc, fn) => fn(acc), x);
    }
  });

  registry.register({ name: 'ramda_pipe', module: 'ramda', paramCount: 1,
    executor: (args: any[]) => {
      const fns = args[0] as Function[];
      return (x: any) => fns.reduce((acc, fn) => fn(acc), x);
    }
  });

  registry.register({ name: 'ramda_curry', module: 'ramda', paramCount: 1,
    executor: (args: any[]) => {
      const fn = args[0] as Function;
      const arity = fn.length;
      const curried = (...a: any[]): any =>
        a.length >= arity ? fn(...a) : (...b: any[]) => curried(...a, ...b);
      return curried;
    }
  });

  registry.register({ name: 'ramda_prop', module: 'ramda', paramCount: 2,
    executor: (args: any[]) => (args[1] ?? {})[args[0]] ?? null
  });

  registry.register({ name: 'ramda_path', module: 'ramda', paramCount: 2,
    executor: (args: any[]) => {
      const keys = args[0] as string[];
      return keys.reduce((obj: any, k) => obj?.[k] ?? null, args[1]);
    }
  });

  registry.register({ name: 'ramda_assoc', module: 'ramda', paramCount: 3,
    executor: (args: any[]) => ({ ...args[2], [args[0]]: args[1] })
  });

  registry.register({ name: 'ramda_dissoc', module: 'ramda', paramCount: 2,
    executor: (args: any[]) => {
      const { [args[0]]: _, ...rest } = args[1] ?? {};
      return rest;
    }
  });

  registry.register({ name: 'ramda_merge', module: 'ramda', paramCount: 2,
    executor: (args: any[]) => ({ ...args[0], ...args[1] })
  });

  registry.register({ name: 'ramda_merge_right', module: 'ramda', paramCount: 2,
    executor: (args: any[]) => ({ ...args[0], ...args[1] })
  });

  registry.register({ name: 'ramda_pick', module: 'ramda', paramCount: 2,
    executor: (args: any[]) => {
      const result: Record<string, any> = {};
      for (const k of args[0] as string[]) { if (k in args[1]) result[k] = args[1][k]; }
      return result;
    }
  });

  registry.register({ name: 'ramda_omit', module: 'ramda', paramCount: 2,
    executor: (args: any[]) => {
      const omitSet = new Set(args[0] as string[]);
      const result: Record<string, any> = {};
      for (const k of Object.keys(args[1] ?? {})) { if (!omitSet.has(k)) result[k] = args[1][k]; }
      return result;
    }
  });

  registry.register({ name: 'ramda_sort', module: 'ramda', paramCount: 2,
    executor: (args: any[]) => [...(args[1] as any[])].sort(args[0])
  });

  registry.register({ name: 'ramda_sort_by', module: 'ramda', paramCount: 2,
    executor: (args: any[]) => {
      const fn = args[0] as Function;
      return [...(args[1] as any[])].sort((a, b) => {
        const va = fn(a), vb = fn(b);
        return va < vb ? -1 : va > vb ? 1 : 0;
      });
    }
  });

  registry.register({ name: 'ramda_group_by', module: 'ramda', paramCount: 2,
    executor: (args: any[]) => {
      const fn = args[0] as Function;
      const result: Record<string, any[]> = {};
      for (const item of args[1] as any[]) {
        const k = fn(item);
        (result[k] ??= []).push(item);
      }
      return result;
    }
  });

  registry.register({ name: 'ramda_uniq', module: 'ramda', paramCount: 1,
    executor: (args: any[]) => {
      const seen = new Set<string>();
      return (args[0] as any[]).filter(x => {
        const k = JSON.stringify(x);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    }
  });

  registry.register({ name: 'ramda_flatten', module: 'ramda', paramCount: 1,
    executor: (args: any[]) => (args[0] as any[]).flat(Infinity)
  });

  registry.register({ name: 'ramda_append', module: 'ramda', paramCount: 2,
    executor: (args: any[]) => [...(args[1] as any[]), args[0]]
  });

  registry.register({ name: 'ramda_prepend', module: 'ramda', paramCount: 2,
    executor: (args: any[]) => [args[0], ...(args[1] as any[])]
  });

  registry.register({ name: 'ramda_concat', module: 'ramda', paramCount: 2,
    executor: (args: any[]) => [...(args[0] as any[]), ...(args[1] as any[])]
  });

  registry.register({ name: 'ramda_length', module: 'ramda', paramCount: 1,
    executor: (args: any[]) => (args[0] as any[]).length
  });

  registry.register({ name: 'ramda_head', module: 'ramda', paramCount: 1,
    executor: (args: any[]) => (args[0] as any[])[0] ?? null
  });

  registry.register({ name: 'ramda_tail', module: 'ramda', paramCount: 1,
    executor: (args: any[]) => (args[0] as any[]).slice(1)
  });

  registry.register({ name: 'ramda_last', module: 'ramda', paramCount: 1,
    executor: (args: any[]) => { const a = args[0] as any[]; return a[a.length - 1] ?? null; }
  });

  registry.register({ name: 'ramda_init', module: 'ramda', paramCount: 1,
    executor: (args: any[]) => (args[0] as any[]).slice(0, -1)
  });

  registry.register({ name: 'ramda_nth', module: 'ramda', paramCount: 2,
    executor: (args: any[]) => {
      const arr = args[1] as any[];
      const n = Number(args[0]);
      return n >= 0 ? arr[n] ?? null : arr[arr.length + n] ?? null;
    }
  });

  registry.register({ name: 'ramda_take', module: 'ramda', paramCount: 2,
    executor: (args: any[]) => (args[1] as any[]).slice(0, Number(args[0]))
  });

  registry.register({ name: 'ramda_drop', module: 'ramda', paramCount: 2,
    executor: (args: any[]) => (args[1] as any[]).slice(Number(args[0]))
  });

  registry.register({ name: 'ramda_split_at', module: 'ramda', paramCount: 2,
    executor: (args: any[]) => {
      const arr = args[1] as any[];
      const n = Number(args[0]);
      return [arr.slice(0, n), arr.slice(n)];
    }
  });

  registry.register({ name: 'ramda_split_every', module: 'ramda', paramCount: 2,
    executor: (args: any[]) => {
      const arr = args[1] as any[];
      const n = Number(args[0]);
      const result: any[][] = [];
      for (let i = 0; i < arr.length; i += n) result.push(arr.slice(i, i + n));
      return result;
    }
  });

  registry.register({ name: 'ramda_zip', module: 'ramda', paramCount: 2,
    executor: (args: any[]) => {
      const a = args[0] as any[], b = args[1] as any[];
      return Array.from({ length: Math.min(a.length, b.length) }, (_, i) => [a[i], b[i]]);
    }
  });

  registry.register({ name: 'ramda_zip_with', module: 'ramda', paramCount: 3,
    executor: (args: any[]) => {
      const fn = args[0] as Function;
      const a = args[1] as any[], b = args[2] as any[];
      return Array.from({ length: Math.min(a.length, b.length) }, (_, i) => fn(a[i], b[i]));
    }
  });

  registry.register({ name: 'ramda_always', module: 'ramda', paramCount: 1,
    executor: (args: any[]) => () => args[0]
  });

  registry.register({ name: 'ramda_equals', module: 'ramda', paramCount: 2,
    executor: (args: any[]) => JSON.stringify(args[0]) === JSON.stringify(args[1])
  });
}
