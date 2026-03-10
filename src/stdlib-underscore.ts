/**
 * FreeLang v2 stdlib — stdlib-underscore.ts
 * npm underscore 완전 대체 네이티브 함수 등록
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

export function registerUnderscoreFunctions(registry: NativeFunctionRegistry): void {
  // 컬렉션 함수
  registry.register({ name: 'underscore_each', module: 'underscore', paramCount: 2,
    executor: (args: any[]) => { (args[0] as any[]).forEach(args[1]); return null; }
  });

  registry.register({ name: 'underscore_map', module: 'underscore', paramCount: 2,
    executor: (args: any[]) => (args[0] as any[]).map(args[1])
  });

  registry.register({ name: 'underscore_filter', module: 'underscore', paramCount: 2,
    executor: (args: any[]) => (args[0] as any[]).filter(args[1])
  });

  registry.register({ name: 'underscore_reject', module: 'underscore', paramCount: 2,
    executor: (args: any[]) => (args[0] as any[]).filter((x: any) => !args[1](x))
  });

  registry.register({ name: 'underscore_reduce', module: 'underscore', paramCount: 3,
    executor: (args: any[]) => (args[0] as any[]).reduce(args[1], args[2])
  });

  registry.register({ name: 'underscore_find', module: 'underscore', paramCount: 2,
    executor: (args: any[]) => (args[0] as any[]).find(args[1]) ?? null
  });

  registry.register({ name: 'underscore_every', module: 'underscore', paramCount: 2,
    executor: (args: any[]) => (args[0] as any[]).every(args[1])
  });

  registry.register({ name: 'underscore_some', module: 'underscore', paramCount: 2,
    executor: (args: any[]) => (args[0] as any[]).some(args[1])
  });

  registry.register({ name: 'underscore_contains', module: 'underscore', paramCount: 2,
    executor: (args: any[]) => (args[0] as any[]).includes(args[1])
  });

  registry.register({ name: 'underscore_pluck', module: 'underscore', paramCount: 2,
    executor: (args: any[]) => (args[0] as any[]).map((item: any) => item[args[1]])
  });

  registry.register({ name: 'underscore_where', module: 'underscore', paramCount: 2,
    executor: (args: any[]) => {
      const props = args[1] as Record<string, any>;
      return (args[0] as any[]).filter((item: any) =>
        Object.keys(props).every(k => item[k] === props[k])
      );
    }
  });

  registry.register({ name: 'underscore_find_where', module: 'underscore', paramCount: 2,
    executor: (args: any[]) => {
      const props = args[1] as Record<string, any>;
      return (args[0] as any[]).find((item: any) =>
        Object.keys(props).every(k => item[k] === props[k])
      ) ?? null;
    }
  });

  registry.register({ name: 'underscore_max', module: 'underscore', paramCount: 1,
    executor: (args: any[]) => {
      const arr = args[0] as any[];
      return arr.length === 0 ? null : arr.reduce((m, x) => x > m ? x : m);
    }
  });

  registry.register({ name: 'underscore_min', module: 'underscore', paramCount: 1,
    executor: (args: any[]) => {
      const arr = args[0] as any[];
      return arr.length === 0 ? null : arr.reduce((m, x) => x < m ? x : m);
    }
  });

  registry.register({ name: 'underscore_sort_by', module: 'underscore', paramCount: 2,
    executor: (args: any[]) => {
      const key = args[1];
      return [...(args[0] as any[])].sort((a, b) => {
        const va = typeof key === 'function' ? key(a) : a[key];
        const vb = typeof key === 'function' ? key(b) : b[key];
        return va < vb ? -1 : va > vb ? 1 : 0;
      });
    }
  });

  registry.register({ name: 'underscore_group_by', module: 'underscore', paramCount: 2,
    executor: (args: any[]) => {
      const key = args[1];
      const result: Record<string, any[]> = {};
      for (const item of args[0] as any[]) {
        const k = typeof key === 'function' ? key(item) : item[key];
        (result[k] ??= []).push(item);
      }
      return result;
    }
  });

  registry.register({ name: 'underscore_index_by', module: 'underscore', paramCount: 2,
    executor: (args: any[]) => {
      const key = args[1];
      const result: Record<string, any> = {};
      for (const item of args[0] as any[]) {
        const k = typeof key === 'function' ? key(item) : item[key];
        result[k] = item;
      }
      return result;
    }
  });

  registry.register({ name: 'underscore_count_by', module: 'underscore', paramCount: 2,
    executor: (args: any[]) => {
      const key = args[1];
      const result: Record<string, number> = {};
      for (const item of args[0] as any[]) {
        const k = typeof key === 'function' ? key(item) : item[key];
        result[k] = (result[k] ?? 0) + 1;
      }
      return result;
    }
  });

  registry.register({ name: 'underscore_shuffle', module: 'underscore', paramCount: 1,
    executor: (args: any[]) => {
      const arr = [...(args[0] as any[])];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
  });

  registry.register({ name: 'underscore_sample', module: 'underscore', paramCount: 2,
    executor: (args: any[]) => {
      const arr = [...(args[0] as any[])];
      const n = Math.min(Number(args[1]), arr.length);
      for (let i = arr.length - 1; i > arr.length - n - 1; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr.slice(arr.length - n);
    }
  });

  registry.register({ name: 'underscore_to_array', module: 'underscore', paramCount: 1,
    executor: (args: any[]) => {
      const v = args[0];
      if (Array.isArray(v)) return v;
      if (v && typeof v === 'object') return Object.values(v);
      return [];
    }
  });

  registry.register({ name: 'underscore_size', module: 'underscore', paramCount: 1,
    executor: (args: any[]) => {
      const v = args[0];
      if (Array.isArray(v)) return v.length;
      if (v && typeof v === 'object') return Object.keys(v).length;
      if (typeof v === 'string') return v.length;
      return 0;
    }
  });

  // 배열 함수
  registry.register({ name: 'underscore_first', module: 'underscore', paramCount: 2,
    executor: (args: any[]) => {
      const arr = args[0] as any[];
      const n = Number(args[1]);
      return n <= 1 ? arr[0] : arr.slice(0, n);
    }
  });

  registry.register({ name: 'underscore_last', module: 'underscore', paramCount: 2,
    executor: (args: any[]) => {
      const arr = args[0] as any[];
      const n = Number(args[1]);
      return n <= 1 ? arr[arr.length - 1] : arr.slice(-n);
    }
  });

  registry.register({ name: 'underscore_initial', module: 'underscore', paramCount: 2,
    executor: (args: any[]) => {
      const arr = args[0] as any[];
      const n = Number(args[1]) || 1;
      return arr.slice(0, -n);
    }
  });

  registry.register({ name: 'underscore_rest', module: 'underscore', paramCount: 2,
    executor: (args: any[]) => {
      const arr = args[0] as any[];
      const n = Number(args[1]) || 1;
      return arr.slice(n);
    }
  });

  registry.register({ name: 'underscore_compact', module: 'underscore', paramCount: 1,
    executor: (args: any[]) => (args[0] as any[]).filter(Boolean)
  });

  registry.register({ name: 'underscore_flatten', module: 'underscore', paramCount: 2,
    executor: (args: any[]) => {
      const arr = args[0] as any[];
      const shallow = Boolean(args[1]);
      return shallow ? arr.flat(1) : arr.flat(Infinity);
    }
  });

  registry.register({ name: 'underscore_without', module: 'underscore', paramCount: 2,
    executor: (args: any[]) => {
      const exclude = new Set(args[1] as any[]);
      return (args[0] as any[]).filter((x: any) => !exclude.has(x));
    }
  });

  registry.register({ name: 'underscore_uniq', module: 'underscore', paramCount: 1,
    executor: (args: any[]) => [...new Set(args[0] as any[])]
  });

  registry.register({ name: 'underscore_union', module: 'underscore', paramCount: 1,
    executor: (args: any[]) => [...new Set((args[0] as any[][]).flat())]
  });

  registry.register({ name: 'underscore_intersection', module: 'underscore', paramCount: 1,
    executor: (args: any[]) => {
      const arrays = args[0] as any[][];
      if (arrays.length === 0) return [];
      const sets = arrays.map(a => new Set(a));
      return [...sets[0]!].filter(x => sets.every(s => s.has(x)));
    }
  });

  registry.register({ name: 'underscore_difference', module: 'underscore', paramCount: 2,
    executor: (args: any[]) => {
      const others = new Set((args[1] as any[]).flat());
      return (args[0] as any[]).filter((x: any) => !others.has(x));
    }
  });

  registry.register({ name: 'underscore_zip', module: 'underscore', paramCount: 1,
    executor: (args: any[]) => {
      const arrays = args[0] as any[][];
      if (arrays.length === 0) return [];
      const maxLen = Math.max(...arrays.map(a => a.length));
      return Array.from({ length: maxLen }, (_, i) => arrays.map(a => a[i] ?? null));
    }
  });

  registry.register({ name: 'underscore_range', module: 'underscore', paramCount: 3,
    executor: (args: any[]) => {
      const start = Number(args[0]);
      const stop = Number(args[1]);
      const step = Number(args[2]) || 1;
      const result: number[] = [];
      for (let i = start; step > 0 ? i < stop : i > stop; i += step) {
        result.push(i);
      }
      return result;
    }
  });

  // 객체 함수
  registry.register({ name: 'underscore_pick', module: 'underscore', paramCount: 2,
    executor: (args: any[]) => {
      const obj = args[0] as Record<string, any>;
      const keys = args[1] as string[];
      const result: Record<string, any> = {};
      for (const k of keys) { if (k in obj) result[k] = obj[k]; }
      return result;
    }
  });

  registry.register({ name: 'underscore_omit', module: 'underscore', paramCount: 2,
    executor: (args: any[]) => {
      const obj = args[0] as Record<string, any>;
      const omitKeys = new Set(args[1] as string[]);
      const result: Record<string, any> = {};
      for (const k of Object.keys(obj)) { if (!omitKeys.has(k)) result[k] = obj[k]; }
      return result;
    }
  });

  registry.register({ name: 'underscore_extend', module: 'underscore', paramCount: 2,
    executor: (args: any[]) => Object.assign(args[0], ...(args[1] as any[]))
  });

  registry.register({ name: 'underscore_defaults', module: 'underscore', paramCount: 2,
    executor: (args: any[]) => {
      const obj = args[0] as Record<string, any>;
      const defs = args[1] as Record<string, any>;
      for (const k of Object.keys(defs)) {
        if (obj[k] === undefined) obj[k] = defs[k];
      }
      return obj;
    }
  });

  registry.register({ name: 'underscore_keys', module: 'underscore', paramCount: 1,
    executor: (args: any[]) => Object.keys(args[0] ?? {})
  });

  registry.register({ name: 'underscore_values', module: 'underscore', paramCount: 1,
    executor: (args: any[]) => Object.values(args[0] ?? {})
  });

  registry.register({ name: 'underscore_pairs', module: 'underscore', paramCount: 1,
    executor: (args: any[]) => Object.entries(args[0] ?? {})
  });

  registry.register({ name: 'underscore_invert', module: 'underscore', paramCount: 1,
    executor: (args: any[]) => {
      const result: Record<string, any> = {};
      for (const [k, v] of Object.entries(args[0] ?? {})) result[String(v)] = k;
      return result;
    }
  });

  // 타입 검사
  registry.register({ name: 'underscore_is_equal', module: 'underscore', paramCount: 2,
    executor: (args: any[]) => JSON.stringify(args[0]) === JSON.stringify(args[1])
  });

  registry.register({ name: 'underscore_is_empty', module: 'underscore', paramCount: 1,
    executor: (args: any[]) => {
      const v = args[0];
      if (v == null) return true;
      if (Array.isArray(v)) return v.length === 0;
      if (typeof v === 'object') return Object.keys(v).length === 0;
      if (typeof v === 'string') return v.length === 0;
      return false;
    }
  });

  registry.register({ name: 'underscore_is_string', module: 'underscore', paramCount: 1,
    executor: (args: any[]) => typeof args[0] === 'string'
  });

  registry.register({ name: 'underscore_is_number', module: 'underscore', paramCount: 1,
    executor: (args: any[]) => typeof args[0] === 'number' && !isNaN(args[0])
  });

  registry.register({ name: 'underscore_is_array', module: 'underscore', paramCount: 1,
    executor: (args: any[]) => Array.isArray(args[0])
  });

  registry.register({ name: 'underscore_is_object', module: 'underscore', paramCount: 1,
    executor: (args: any[]) => args[0] !== null && typeof args[0] === 'object'
  });

  registry.register({ name: 'underscore_is_null', module: 'underscore', paramCount: 1,
    executor: (args: any[]) => args[0] === null
  });

  registry.register({ name: 'underscore_is_undefined', module: 'underscore', paramCount: 1,
    executor: (args: any[]) => args[0] === undefined
  });

  registry.register({ name: 'underscore_is_boolean', module: 'underscore', paramCount: 1,
    executor: (args: any[]) => typeof args[0] === 'boolean'
  });

  registry.register({ name: 'underscore_is_function', module: 'underscore', paramCount: 1,
    executor: (args: any[]) => typeof args[0] === 'function'
  });

  registry.register({ name: 'underscore_memoize', module: 'underscore', paramCount: 2,
    executor: (args: any[]) => {
      const fn = args[0] as Function;
      const cache = new Map<string, any>();
      return (x: any) => {
        const key = JSON.stringify(x);
        if (!cache.has(key)) cache.set(key, fn(x));
        return cache.get(key);
      };
    }
  });

  registry.register({ name: 'underscore_once', module: 'underscore', paramCount: 1,
    executor: (args: any[]) => {
      const fn = args[0] as Function;
      let called = false;
      let result: any;
      return (...a: any[]) => { if (!called) { called = true; result = fn(...a); } return result; };
    }
  });

  registry.register({ name: 'underscore_compose', module: 'underscore', paramCount: 1,
    executor: (args: any[]) => {
      const fns = (args[0] as Function[]).slice().reverse();
      return (x: any) => fns.reduce((acc, fn) => fn(acc), x);
    }
  });
}
