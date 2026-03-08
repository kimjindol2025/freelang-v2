/**
 * FreeLang Extended Collection & Algorithm Functions (120개)
 *
 * Module: collection
 * 포함 기능:
 * - 고급 배열 조작 (35개)
 * - 정렬 알고리즘 (15개)
 * - 검색 알고리즘 (15개)
 * - 자료구조 (30개)
 * - 그래프 알고리즘 (15개)
 * - 집합/맵 연산 (10개)
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

export function registerCollectionExtendedFunctions(registry: NativeFunctionRegistry): void {
  // ============================================
  // 1. 배열 고급 조작 함수 (35개)
  // ============================================

  // arr_chunk(arr, size) - 배열을 size 크기로 분할
  registry.register({
    name: 'arr_chunk',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr = args[0];
      const size = args[1];

      if (!Array.isArray(arr) || typeof size !== 'number' || size <= 0) return null;

      const result = [];
      for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
      }
      return result;
    }
  });

  // arr_compact(arr) - null/undefined 제거
  registry.register({
    name: 'arr_compact',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const arr = args[0];
      if (!Array.isArray(arr)) return null;
      return arr.filter(x => x !== null && x !== undefined);
    }
  });

  // arr_flatten(arr, depth=1) - 1단계만 평탄화
  registry.register({
    name: 'arr_flatten',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const arr = args[0];
      const depth = args[1] !== undefined ? args[1] : 1;

      if (!Array.isArray(arr) || typeof depth !== 'number') return null;

      const flatten = (a, d) => {
        if (d <= 0) return a;
        const result = [];
        for (const item of a) {
          if (Array.isArray(item)) {
            result.push(...flatten(item, d - 1));
          } else {
            result.push(item);
          }
        }
        return result;
      };

      return flatten(arr, depth);
    }
  });

  // arr_flatten_deep(arr) - 완전 평탄화
  registry.register({
    name: 'arr_flatten_deep',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const arr = args[0];

      if (!Array.isArray(arr)) return null;

      const flatten = (a) => {
        const result = [];
        for (const item of a) {
          if (Array.isArray(item)) {
            result.push(...flatten(item));
          } else {
            result.push(item);
          }
        }
        return result;
      };

      return flatten(arr);
    }
  });

  // arr_unique(arr) - 중복 제거
  registry.register({
    name: 'arr_unique',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const arr = args[0];
      if (!Array.isArray(arr)) return null;
      return [...new Set(arr)];
    }
  });

  // arr_unique_by(arr, fn) - 조건에 따라 중복 제거
  registry.register({
    name: 'arr_unique_by',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr = args[0];
      const fn = args[1];

      if (!Array.isArray(arr) || typeof fn !== 'function') return null;

      const seen = new Set();
      const result = [];
      for (const item of arr) {
        const key = fn(item);
        if (!seen.has(key)) {
          seen.add(key);
          result.push(item);
        }
      }
      return result;
    }
  });

  // arr_group_by(arr, fn) - 함수 결과로 그룹화
  registry.register({
    name: 'arr_group_by',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr = args[0];
      const fn = args[1];

      if (!Array.isArray(arr) || typeof fn !== 'function') return null;

      const groups = {};
      for (const item of arr) {
        const key = fn(item);
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      }
      return groups;
    }
  });

  // arr_partition(arr, fn) - 조건 만족/불만족으로 분할
  registry.register({
    name: 'arr_partition',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr = args[0];
      const fn = args[1];

      if (!Array.isArray(arr) || typeof fn !== 'function') return null;

      const yes = [], no = [];
      for (const item of arr) {
        if (fn(item)) yes.push(item);
        else no.push(item);
      }
      return [yes, no];
    }
  });

  // arr_zip(...arrs) - 여러 배열을 쌍으로 묶기
  registry.register({
    name: 'arr_zip',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;

      const arrs = args;
      for (const arr of arrs) {
        if (!Array.isArray(arr)) return null;
      }

      if (arrs.length === 0) return [];
      const len = Math.min(...arrs.map(a => a.length));
      const result = [];
      for (let i = 0; i < len; i++) {
        result.push(arrs.map(a => a[i]));
      }
      return result;
    }
  });

  // arr_zip_with(fn, ...arrs) - 함수와 함께 쌍으로 묶기
  registry.register({
    name: 'arr_zip_with',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;

      const fn = args[0];
      const arrs = args.slice(1);

      if (typeof fn !== 'function') return null;
      for (const arr of arrs) {
        if (!Array.isArray(arr)) return null;
      }

      if (arrs.length === 0) return [];
      const len = Math.min(...arrs.map(a => a.length));
      const result = [];
      for (let i = 0; i < len; i++) {
        const items = arrs.map(a => a[i]);
        result.push(fn(...items));
      }
      return result;
    }
  });

  // arr_unzip(arr) - 쌍을 풀기
  registry.register({
    name: 'arr_unzip',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const arr = args[0];

      if (!Array.isArray(arr) || arr.length === 0) return null;

      const result = [];
      const len = arr[0].length || 0;
      for (let i = 0; i < len; i++) {
        result.push(arr.map(item => Array.isArray(item) ? item[i] : null));
      }
      return result;
    }
  });

  // arr_product(...arrs) - 카르테시안 곱
  registry.register({
    name: 'arr_product',
    module: 'collection',
    executor: (args) => {
      const arrs = args;
      for (const arr of arrs) {
        if (!Array.isArray(arr)) return null;
      }

      if (arrs.length === 0) return [];

      let result = arrs[0].map(x => [x]);
      for (let i = 1; i < arrs.length; i++) {
        const newResult = [];
        for (const combo of result) {
          for (const item of arrs[i]) {
            newResult.push([...combo, item]);
          }
        }
        result = newResult;
      }
      return result;
    }
  });

  // arr_permutations(arr) - 순열
  registry.register({
    name: 'arr_permutations',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const arr = args[0];
      if (!Array.isArray(arr)) return null;

      const result = [];
      const permute = (items, memo = []) => {
        if (items.length === 0) {
          result.push([...memo]);
        } else {
          for (let i = 0; i < items.length; i++) {
            const current = items.slice();
            const next = current.splice(i, 1);
            permute(current.slice(), memo.concat(next));
          }
        }
      };

      permute(arr);
      return result;
    }
  });

  // arr_combinations(arr, r) - 조합
  registry.register({
    name: 'arr_combinations',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr = args[0];
      const r = args[1];

      if (!Array.isArray(arr) || typeof r !== 'number') return null;

      const result = [];
      const combine = (items, r, start = 0, memo = []) => {
        if (r === 0) {
          result.push([...memo]);
          return;
        }
        for (let i = start; i <= items.length - r; i++) {
          memo.push(items[i]);
          combine(items, r - 1, i + 1, memo);
          memo.pop();
        }
      };

      combine(arr, r);
      return result;
    }
  });

  // arr_take(arr, n) - 처음 n개 가져오기
  registry.register({
    name: 'arr_take',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr = args[0];
      const n = args[1];

      if (!Array.isArray(arr) || typeof n !== 'number') return null;
      return arr.slice(0, n);
    }
  });

  // arr_take_while(arr, fn) - 조건 만족할 때까지 가져오기
  registry.register({
    name: 'arr_take_while',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr = args[0];
      const fn = args[1];

      if (!Array.isArray(arr) || typeof fn !== 'function') return null;

      const result = [];
      for (const item of arr) {
        if (fn(item)) {
          result.push(item);
        } else {
          break;
        }
      }
      return result;
    }
  });

  // arr_drop(arr, n) - 처음 n개 제거
  registry.register({
    name: 'arr_drop',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr = args[0];
      const n = args[1];

      if (!Array.isArray(arr) || typeof n !== 'number') return null;
      return arr.slice(n);
    }
  });

  // arr_drop_while(arr, fn) - 조건 만족할 때까지 제거
  registry.register({
    name: 'arr_drop_while',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr = args[0];
      const fn = args[1];

      if (!Array.isArray(arr) || typeof fn !== 'function') return null;

      let i = 0;
      while (i < arr.length && fn(arr[i])) i++;
      return arr.slice(i);
    }
  });

  // arr_span(arr, fn) - take_while + drop_while 결과 반환
  registry.register({
    name: 'arr_span',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr = args[0];
      const fn = args[1];

      if (!Array.isArray(arr) || typeof fn !== 'function') return null;

      let i = 0;
      while (i < arr.length && fn(arr[i])) i++;
      return [arr.slice(0, i), arr.slice(i)];
    }
  });

  // arr_break_at(arr, index) - 특정 인덱스에서 분할
  registry.register({
    name: 'arr_break_at',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr = args[0];
      const index = args[1];

      if (!Array.isArray(arr) || typeof index !== 'number') return null;
      return [arr.slice(0, index), arr.slice(index)];
    }
  });

  // arr_intersperse(arr, sep) - 구분자 삽입
  registry.register({
    name: 'arr_intersperse',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr = args[0];
      const sep = args[1];

      if (!Array.isArray(arr)) return null;

      if (arr.length <= 1) return arr;
      const result = [];
      for (let i = 0; i < arr.length; i++) {
        result.push(arr[i]);
        if (i < arr.length - 1) result.push(sep);
      }
      return result;
    }
  });

  // arr_transpose(arr) - 행렬 전치
  registry.register({
    name: 'arr_transpose',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const arr = args[0];

      if (!Array.isArray(arr) || arr.length === 0) return null;
      if (!Array.isArray(arr[0])) return null;

      const cols = arr[0].length;
      const result = [];
      for (let i = 0; i < cols; i++) {
        const row = [];
        for (let j = 0; j < arr.length; j++) {
          if (Array.isArray(arr[j]) && i < arr[j].length) {
            row.push(arr[j][i]);
          }
        }
        result.push(row);
      }
      return result;
    }
  });

  // arr_rotate(arr, n) - 배열 회전
  registry.register({
    name: 'arr_rotate',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr = args[0];
      const n = args[1];

      if (!Array.isArray(arr) || typeof n !== 'number') return null;

      const len = arr.length;
      if (len === 0) return arr;
      const shift = ((n % len) + len) % len;
      return arr.slice(-shift).concat(arr.slice(0, -shift || len));
    }
  });

  // arr_pad_left(arr, size, val) - 왼쪽 패드
  registry.register({
    name: 'arr_pad_left',
    module: 'collection',
    executor: (args) => {
      if (args.length < 3) return null;
      const arr = args[0];
      const size = args[1];
      const val = args[2];

      if (!Array.isArray(arr) || typeof size !== 'number') return null;

      const result = [...arr];
      while (result.length < size) {
        result.unshift(val);
      }
      return result;
    }
  });

  // arr_pad_right(arr, size, val) - 오른쪽 패드
  registry.register({
    name: 'arr_pad_right',
    module: 'collection',
    executor: (args) => {
      if (args.length < 3) return null;
      const arr = args[0];
      const size = args[1];
      const val = args[2];

      if (!Array.isArray(arr) || typeof size !== 'number') return null;

      const result = [...arr];
      while (result.length < size) {
        result.push(val);
      }
      return result;
    }
  });

  // arr_fill_range(start, end, step=1) - 범위로 배열 생성
  registry.register({
    name: 'arr_fill_range',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const start = args[0];
      const end = args[1];
      const step = args[2] !== undefined ? args[2] : 1;

      if (typeof start !== 'number' || typeof end !== 'number' || typeof step !== 'number') return null;

      const result = [];
      if (step > 0) {
        for (let i = start; i < end; i += step) result.push(i);
      } else if (step < 0) {
        for (let i = start; i > end; i += step) result.push(i);
      }
      return result;
    }
  });

  // arr_diff(arr1, arr2) - 차집합
  registry.register({
    name: 'arr_diff',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr1 = args[0];
      const arr2 = args[1];

      if (!Array.isArray(arr1) || !Array.isArray(arr2)) return null;

      const set2 = new Set(arr2);
      return arr1.filter(x => !set2.has(x));
    }
  });

  // arr_intersect(arr1, arr2) - 교집합
  registry.register({
    name: 'arr_intersect',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr1 = args[0];
      const arr2 = args[1];

      if (!Array.isArray(arr1) || !Array.isArray(arr2)) return null;

      const set2 = new Set(arr2);
      return [...new Set(arr1.filter(x => set2.has(x)))];
    }
  });

  // arr_union(arr1, arr2) - 합집합
  registry.register({
    name: 'arr_union',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr1 = args[0];
      const arr2 = args[1];

      if (!Array.isArray(arr1) || !Array.isArray(arr2)) return null;

      return [...new Set([...arr1, ...arr2])];
    }
  });

  // arr_symmetric_diff(arr1, arr2) - 대칭 차집합
  registry.register({
    name: 'arr_symmetric_diff',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr1 = args[0];
      const arr2 = args[1];

      if (!Array.isArray(arr1) || !Array.isArray(arr2)) return null;

      const set1 = new Set(arr1);
      const set2 = new Set(arr2);
      const result = [];

      for (const x of set1) {
        if (!set2.has(x)) result.push(x);
      }
      for (const x of set2) {
        if (!set1.has(x)) result.push(x);
      }
      return result;
    }
  });

  // arr_count_by(arr, fn) - 조건별 개수 세기
  registry.register({
    name: 'arr_count_by',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr = args[0];
      const fn = args[1];

      if (!Array.isArray(arr) || typeof fn !== 'function') return null;

      const counts = {};
      for (const item of arr) {
        const key = fn(item);
        counts[key] = (counts[key] || 0) + 1;
      }
      return counts;
    }
  });

  // arr_min_by(arr, fn) - 조건에 따른 최솟값
  registry.register({
    name: 'arr_min_by',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr = args[0];
      const fn = args[1];

      if (!Array.isArray(arr) || arr.length === 0 || typeof fn !== 'function') return null;

      let min = arr[0];
      let minVal = fn(min);
      for (let i = 1; i < arr.length; i++) {
        const val = fn(arr[i]);
        if (val < minVal) {
          min = arr[i];
          minVal = val;
        }
      }
      return min;
    }
  });

  // arr_max_by(arr, fn) - 조건에 따른 최댓값
  registry.register({
    name: 'arr_max_by',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr = args[0];
      const fn = args[1];

      if (!Array.isArray(arr) || arr.length === 0 || typeof fn !== 'function') return null;

      let max = arr[0];
      let maxVal = fn(max);
      for (let i = 1; i < arr.length; i++) {
        const val = fn(arr[i]);
        if (val > maxVal) {
          max = arr[i];
          maxVal = val;
        }
      }
      return max;
    }
  });

  // arr_sum_by(arr, fn) - 조건에 따른 합
  registry.register({
    name: 'arr_sum_by',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr = args[0];
      const fn = args[1];

      if (!Array.isArray(arr) || typeof fn !== 'function') return null;

      let sum = 0;
      for (const item of arr) {
        sum += fn(item);
      }
      return sum;
    }
  });

  // arr_avg_by(arr, fn) - 조건에 따른 평균
  registry.register({
    name: 'arr_avg_by',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr = args[0];
      const fn = args[1];

      if (!Array.isArray(arr) || arr.length === 0 || typeof fn !== 'function') return null;

      let sum = 0;
      for (const item of arr) {
        sum += fn(item);
      }
      return sum / arr.length;
    }
  });

  // ============================================
  // 2. 정렬 알고리즘 (15개)
  // ============================================

  // sort_bubble(arr, cmp?) - 버블 정렬
  registry.register({
    name: 'sort_bubble',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const arr = [...args[0]];
      const cmp = args[1] || ((a, b) => a - b);

      if (!Array.isArray(arr)) return null;

      for (let i = 0; i < arr.length; i++) {
        for (let j = 0; j < arr.length - i - 1; j++) {
          if (cmp(arr[j], arr[j + 1]) > 0) {
            [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
          }
        }
      }
      return arr;
    }
  });

  // sort_selection(arr, cmp?) - 선택 정렬
  registry.register({
    name: 'sort_selection',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const arr = [...args[0]];
      const cmp = args[1] || ((a, b) => a - b);

      if (!Array.isArray(arr)) return null;

      for (let i = 0; i < arr.length; i++) {
        let minIdx = i;
        for (let j = i + 1; j < arr.length; j++) {
          if (cmp(arr[j], arr[minIdx]) < 0) {
            minIdx = j;
          }
        }
        [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
      }
      return arr;
    }
  });

  // sort_insertion(arr, cmp?) - 삽입 정렬
  registry.register({
    name: 'sort_insertion',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const arr = [...args[0]];
      const cmp = args[1] || ((a, b) => a - b);

      if (!Array.isArray(arr)) return null;

      for (let i = 1; i < arr.length; i++) {
        const key = arr[i];
        let j = i - 1;
        while (j >= 0 && cmp(arr[j], key) > 0) {
          arr[j + 1] = arr[j];
          j--;
        }
        arr[j + 1] = key;
      }
      return arr;
    }
  });

  // sort_merge(arr, cmp?) - 병합 정렬
  registry.register({
    name: 'sort_merge',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const arr = args[0];
      const cmp = args[1] || ((a, b) => a - b);

      if (!Array.isArray(arr)) return null;

      const merge = (left, right) => {
        const result = [];
        let l = 0, r = 0;
        while (l < left.length && r < right.length) {
          if (cmp(left[l], right[r]) <= 0) {
            result.push(left[l++]);
          } else {
            result.push(right[r++]);
          }
        }
        return [...result, ...left.slice(l), ...right.slice(r)];
      };

      const mergeSort = (a) => {
        if (a.length <= 1) return a;
        const mid = Math.floor(a.length / 2);
        return merge(mergeSort(a.slice(0, mid)), mergeSort(a.slice(mid)));
      };

      return mergeSort(arr);
    }
  });

  // sort_quick(arr, cmp?) - 빠른 정렬
  registry.register({
    name: 'sort_quick',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const arr = [...args[0]];
      const cmp = args[1] || ((a, b) => a - b);

      if (!Array.isArray(arr)) return null;

      const quickSort = (a) => {
        if (a.length <= 1) return a;
        const pivot = a[Math.floor(a.length / 2)];
        const left = a.filter(x => cmp(x, pivot) < 0);
        const mid = a.filter(x => cmp(x, pivot) === 0);
        const right = a.filter(x => cmp(x, pivot) > 0);
        return [...quickSort(left), ...mid, ...quickSort(right)];
      };

      return quickSort(arr);
    }
  });

  // sort_heap(arr, cmp?) - 힙 정렬
  registry.register({
    name: 'sort_heap',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const arr = [...args[0]];
      const cmp = args[1] || ((a, b) => a - b);

      if (!Array.isArray(arr)) return null;

      const heapify = (arr, n, i) => {
        let largest = i;
        const left = 2 * i + 1;
        const right = 2 * i + 2;

        if (left < n && cmp(arr[left], arr[largest]) > 0) largest = left;
        if (right < n && cmp(arr[right], arr[largest]) > 0) largest = right;

        if (largest !== i) {
          [arr[i], arr[largest]] = [arr[largest], arr[i]];
          heapify(arr, n, largest);
        }
      };

      for (let i = Math.floor(arr.length / 2) - 1; i >= 0; i--) {
        heapify(arr, arr.length, i);
      }

      for (let i = arr.length - 1; i > 0; i--) {
        [arr[0], arr[i]] = [arr[i], arr[0]];
        heapify(arr, i, 0);
      }

      return arr;
    }
  });

  // sort_radix(arr) - 기수 정렬 (정수 배열용)
  registry.register({
    name: 'sort_radix',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const arr = [...args[0]];

      if (!Array.isArray(arr)) return null;

      const max = Math.max(...arr);
      for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
        const buckets = Array.from({ length: 10 }, () => []);
        for (const num of arr) {
          const digit = Math.floor(num / exp) % 10;
          buckets[digit].push(num);
        }
        let idx = 0;
        for (const bucket of buckets) {
          for (const num of bucket) {
            arr[idx++] = num;
          }
        }
      }
      return arr;
    }
  });

  // sort_counting(arr, max?) - 계수 정렬
  registry.register({
    name: 'sort_counting',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const arr = args[0];
      const maxVal = args[1] || Math.max(...arr);

      if (!Array.isArray(arr)) return null;

      const count = new Array(maxVal + 1).fill(0);
      for (const num of arr) {
        if (num >= 0 && num <= maxVal) count[num]++;
      }

      const result = [];
      for (let i = 0; i <= maxVal; i++) {
        for (let j = 0; j < count[i]; j++) {
          result.push(i);
        }
      }
      return result;
    }
  });

  // sort_topological(graph) - 위상 정렬
  registry.register({
    name: 'sort_topological',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const graph = args[0];

      if (typeof graph !== 'object' || graph === null) return null;

      const visited = new Set();
      const stack = [];

      const dfs = (node) => {
        visited.add(node);
        const neighbors = graph[node] || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            dfs(neighbor);
          }
        }
        stack.push(node);
      };

      for (const node in graph) {
        if (!visited.has(node)) {
          dfs(node);
        }
      }

      return stack.reverse();
    }
  });

  // sort_by_key(arr, fn) - 키 함수로 정렬
  registry.register({
    name: 'sort_by_key',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr = [...args[0]];
      const fn = args[1];

      if (!Array.isArray(arr) || typeof fn !== 'function') return null;

      return arr.sort((a, b) => {
        const keyA = fn(a);
        const keyB = fn(b);
        return keyA < keyB ? -1 : keyA > keyB ? 1 : 0;
      });
    }
  });

  // sort_stable(arr, cmp?) - 안정 정렬 (병합 정렬 기반)
  registry.register({
    name: 'sort_stable',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const arr = args[0];
      const cmp = args[1] || ((a, b) => a - b);

      if (!Array.isArray(arr)) return null;

      const merge = (left, right) => {
        const result = [];
        let l = 0, r = 0;
        while (l < left.length && r < right.length) {
          if (cmp(left[l], right[r]) <= 0) {
            result.push(left[l++]);
          } else {
            result.push(right[r++]);
          }
        }
        return [...result, ...left.slice(l), ...right.slice(r)];
      };

      const mergeSort = (a) => {
        if (a.length <= 1) return a;
        const mid = Math.floor(a.length / 2);
        return merge(mergeSort(a.slice(0, mid)), mergeSort(a.slice(mid)));
      };

      return mergeSort(arr);
    }
  });

  // sort_reverse(arr) - 역순 정렬
  registry.register({
    name: 'sort_reverse',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const arr = args[0];

      if (!Array.isArray(arr)) return null;
      return [...arr].reverse();
    }
  });

  // sort_compare(val1, val2, cmp?) - 두 값 비교
  registry.register({
    name: 'sort_compare',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const val1 = args[0];
      const val2 = args[1];
      const cmp = args[2] || ((a, b) => a - b);

      if (typeof cmp !== 'function') return null;

      return cmp(val1, val2);
    }
  });

  // sort_natural(arr) - 자연 정렬 (숫자 인식)
  registry.register({
    name: 'sort_natural',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const arr = [...args[0]];

      if (!Array.isArray(arr)) return null;

      const naturalCompare = (a: any, b: any) => {
        const reA = /[^0-9]+|\d+/g;
        const aA = String(a).match(reA) || [];
        const bA = String(b).match(reA) || [];

        for (let i = 0; i < Math.min(aA.length, bA.length); i++) {
          const aa = aA[i];
          const ba = bA[i];

          const aNum = parseInt(aa as string, 10);
          const bNum = parseInt(ba as string, 10);
          const isNum = !isNaN(aNum) && !isNaN(bNum);
          if (isNum) {
            if (aNum !== bNum) return aNum - bNum;
          } else if (aa !== ba) {
            return aa < ba ? -1 : 1;
          }
        }
        return aA.length - bA.length;
      };

      return arr.sort(naturalCompare);
    }
  });

  // sort_locale(arr, locale?) - 로케일 정렬
  registry.register({
    name: 'sort_locale',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const arr = [...args[0]];
      const locale = args[1] || 'en';

      if (!Array.isArray(arr)) return null;

      return arr.sort((a, b) => {
        return String(a).localeCompare(String(b), locale);
      });
    }
  });

  // ============================================
  // 3. 검색 알고리즘 (15개)
  // ============================================

  // search_binary(arr, target) - 이진 검색
  registry.register({
    name: 'search_binary',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr = args[0];
      const target = args[1];

      if (!Array.isArray(arr)) return null;

      let left = 0, right = arr.length - 1;
      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (arr[mid] === target) return mid;
        if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
      }
      return -1;
    }
  });

  // search_linear(arr, target) - 선형 검색
  registry.register({
    name: 'search_linear',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr = args[0];
      const target = args[1];

      if (!Array.isArray(arr)) return null;
      return arr.indexOf(target);
    }
  });

  // search_ternary(arr, target) - 삼진 검색
  registry.register({
    name: 'search_ternary',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr = args[0];
      const target = args[1];

      if (!Array.isArray(arr)) return null;

      const ternarySearch = (left, right) => {
        if (left > right) return -1;
        const mid1 = left + Math.floor((right - left) / 3);
        const mid2 = right - Math.floor((right - left) / 3);

        if (arr[mid1] === target) return mid1;
        if (arr[mid2] === target) return mid2;

        if (target < arr[mid1]) return ternarySearch(left, mid1 - 1);
        if (target > arr[mid2]) return ternarySearch(mid2 + 1, right);
        return ternarySearch(mid1 + 1, mid2 - 1);
      };

      return ternarySearch(0, arr.length - 1);
    }
  });

  // search_jump(arr, target) - 점프 검색
  registry.register({
    name: 'search_jump',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr = args[0];
      const target = args[1];

      if (!Array.isArray(arr)) return null;

      const n = arr.length;
      let step = Math.floor(Math.sqrt(n));
      let prev = 0;

      while (arr[Math.min(step, n) - 1] < target) {
        prev = step;
        step += Math.floor(Math.sqrt(n));
        if (prev >= n) return -1;
      }

      while (arr[prev] < target) {
        prev++;
        if (prev === Math.min(step, n)) return -1;
      }

      if (arr[prev] === target) return prev;
      return -1;
    }
  });

  // search_interpolation(arr, target) - 보간 검색
  registry.register({
    name: 'search_interpolation',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr = args[0];
      const target = args[1];

      if (!Array.isArray(arr)) return null;

      let left = 0, right = arr.length - 1;
      while (left <= right && target >= arr[left] && target <= arr[right]) {
        const pos = left + Math.floor(((target - arr[left]) / (arr[right] - arr[left])) * (right - left));

        if (arr[pos] === target) return pos;
        if (arr[pos] < target) left = pos + 1;
        else right = pos - 1;
      }
      return -1;
    }
  });

  // search_exponential(arr, target) - 지수 검색
  registry.register({
    name: 'search_exponential',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr = args[0];
      const target = args[1];

      if (!Array.isArray(arr)) return null;

      if (arr[0] === target) return 0;

      let i = 1;
      while (i < arr.length && arr[i] < target) i *= 2;

      let left = Math.floor(i / 2);
      let right = Math.min(i, arr.length - 1);

      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (arr[mid] === target) return mid;
        if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
      }
      return -1;
    }
  });

  // search_fibonacci(arr, target) - 피보나치 검색
  registry.register({
    name: 'search_fibonacci',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr = args[0];
      const target = args[1];

      if (!Array.isArray(arr)) return null;

      const n = arr.length;
      let fib2 = 0, fib1 = 1, fib = fib2 + fib1;

      while (fib < n) {
        fib2 = fib1;
        fib1 = fib;
        fib = fib2 + fib1;
      }

      let offset = -1;
      while (fib > 1) {
        const i = Math.min(offset + fib2, n - 1);
        if (arr[i] < target) {
          fib = fib1;
          fib1 = fib2;
          fib2 = fib - fib1;
          offset = i;
        } else if (arr[i] > target) {
          fib = fib2;
          fib1 = fib1 - fib2;
          fib2 = fib - fib1;
        } else {
          return i;
        }
      }

      if (fib1 && offset + 1 < n && arr[offset + 1] === target) {
        return offset + 1;
      }
      return -1;
    }
  });

  // search_first(arr, target) - 첫 번째 위치 찾기
  registry.register({
    name: 'search_first',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr = args[0];
      const target = args[1];

      if (!Array.isArray(arr)) return null;

      let left = 0, right = arr.length - 1, result = -1;
      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (arr[mid] === target) {
          result = mid;
          right = mid - 1;
        } else if (arr[mid] < target) {
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }
      return result;
    }
  });

  // search_last(arr, target) - 마지막 위치 찾기
  registry.register({
    name: 'search_last',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr = args[0];
      const target = args[1];

      if (!Array.isArray(arr)) return null;

      let left = 0, right = arr.length - 1, result = -1;
      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (arr[mid] === target) {
          result = mid;
          left = mid + 1;
        } else if (arr[mid] < target) {
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }
      return result;
    }
  });

  // search_all_indices(arr, target) - 모든 위치 찾기
  registry.register({
    name: 'search_all_indices',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr = args[0];
      const target = args[1];

      if (!Array.isArray(arr)) return null;

      const indices = [];
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] === target) indices.push(i);
      }
      return indices;
    }
  });

  // search_threshold(arr, threshold, cmp?) - 임계값으로 검색
  registry.register({
    name: 'search_threshold',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const arr = args[0];
      const threshold = args[1];
      const cmp = args[2] || ((a, b) => a >= b);

      if (!Array.isArray(arr) || typeof cmp !== 'function') return null;

      const result = [];
      for (let i = 0; i < arr.length; i++) {
        if (cmp(arr[i], threshold)) {
          result.push(i);
        }
      }
      return result;
    }
  });

  // search_fuzzy(haystack, needle) - 퍼지 검색
  registry.register({
    name: 'search_fuzzy',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const haystack = String(args[0]).toLowerCase();
      const needle = String(args[1]).toLowerCase();

      let idx = 0;
      for (let i = 0; i < haystack.length; i++) {
        if (haystack[i] === needle[idx]) idx++;
        if (idx === needle.length) return true;
      }
      return false;
    }
  });

  // search_knn(points, query, k) - K-최근접 이웃
  registry.register({
    name: 'search_knn',
    module: 'collection',
    executor: (args) => {
      if (args.length < 3) return null;
      const points = args[0];
      const query = args[1];
      const k = args[2];

      if (!Array.isArray(points) || !Array.isArray(query) || typeof k !== 'number') return null;

      const distances = points.map((p, idx) => {
        let dist = 0;
        for (let i = 0; i < Math.min(p.length, query.length); i++) {
          dist += Math.pow(p[i] - query[i], 2);
        }
        return { index: idx, point: p, distance: Math.sqrt(dist) };
      });

      return distances.sort((a, b) => a.distance - b.distance).slice(0, k);
    }
  });

  // search_nearest(points, query) - 가장 가까운 점
  registry.register({
    name: 'search_nearest',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const points = args[0];
      const query = args[1];

      if (!Array.isArray(points) || !Array.isArray(query)) return null;

      let minDist = Infinity;
      let nearest = null;

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        let dist = 0;
        for (let j = 0; j < Math.min(p.length, query.length); j++) {
          dist += Math.pow(p[j] - query[j], 2);
        }
        dist = Math.sqrt(dist);
        if (dist < minDist) {
          minDist = dist;
          nearest = { index: i, point: p, distance: dist };
        }
      }
      return nearest;
    }
  });

  // search_range(arr, min, max) - 범위 검색
  registry.register({
    name: 'search_range',
    module: 'collection',
    executor: (args) => {
      if (args.length < 3) return null;
      const arr = args[0];
      const min = args[1];
      const max = args[2];

      if (!Array.isArray(arr)) return null;

      const result = [];
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] >= min && arr[i] <= max) {
          result.push(i);
        }
      }
      return result;
    }
  });

  // ============================================
  // 4. 자료구조 함수 (30개)
  // ============================================

  // 스택 (5개)
  registry.register({
    name: 'stack_push',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const stack = args[0] || [];
      const val = args[1];
      return [...stack, val];
    }
  });

  registry.register({
    name: 'stack_pop',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const stack = args[0];
      if (!Array.isArray(stack) || stack.length === 0) return null;
      return stack.slice(0, -1);
    }
  });

  registry.register({
    name: 'stack_peek',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const stack = args[0];
      if (!Array.isArray(stack) || stack.length === 0) return null;
      return stack[stack.length - 1];
    }
  });

  registry.register({
    name: 'stack_is_empty',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const stack = args[0];
      if (!Array.isArray(stack)) return null;
      return stack.length === 0;
    }
  });

  registry.register({
    name: 'stack_size',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const stack = args[0];
      if (!Array.isArray(stack)) return null;
      return stack.length;
    }
  });

  // 큐 (5개)
  registry.register({
    name: 'queue_enqueue',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const queue = args[0] || [];
      const val = args[1];
      return [...queue, val];
    }
  });

  registry.register({
    name: 'queue_dequeue',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const queue = args[0];
      if (!Array.isArray(queue) || queue.length === 0) return null;
      return queue.slice(1);
    }
  });

  registry.register({
    name: 'queue_peek',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const queue = args[0];
      if (!Array.isArray(queue) || queue.length === 0) return null;
      return queue[0];
    }
  });

  registry.register({
    name: 'queue_is_empty',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const queue = args[0];
      if (!Array.isArray(queue)) return null;
      return queue.length === 0;
    }
  });

  registry.register({
    name: 'queue_size',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const queue = args[0];
      if (!Array.isArray(queue)) return null;
      return queue.length;
    }
  });

  // Deque (5개)
  registry.register({
    name: 'deque_push_front',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const deque = args[0] || [];
      const val = args[1];
      return [val, ...deque];
    }
  });

  registry.register({
    name: 'deque_push_back',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const deque = args[0] || [];
      const val = args[1];
      return [...deque, val];
    }
  });

  registry.register({
    name: 'deque_pop_front',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const deque = args[0];
      if (!Array.isArray(deque) || deque.length === 0) return null;
      return deque.slice(1);
    }
  });

  registry.register({
    name: 'deque_pop_back',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const deque = args[0];
      if (!Array.isArray(deque) || deque.length === 0) return null;
      return deque.slice(0, -1);
    }
  });

  registry.register({
    name: 'deque_size',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const deque = args[0];
      if (!Array.isArray(deque)) return null;
      return deque.length;
    }
  });

  // Priority Queue (2개)
  registry.register({
    name: 'priority_queue_push',
    module: 'collection',
    executor: (args) => {
      if (args.length < 3) return null;
      const pq = args[0] || [];
      const val = args[1];
      const priority = args[2];

      if (!Array.isArray(pq)) return null;

      const item = { value: val, priority };
      const result = [...pq];
      let inserted = false;

      for (let i = 0; i < result.length; i++) {
        if (priority > result[i].priority) {
          result.splice(i, 0, item);
          inserted = true;
          break;
        }
      }

      if (!inserted) result.push(item);
      return result;
    }
  });

  registry.register({
    name: 'priority_queue_pop',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const pq = args[0];
      if (!Array.isArray(pq) || pq.length === 0) return null;
      return pq.slice(1);
    }
  });

  registry.register({
    name: 'priority_queue_peek',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const pq = args[0];
      if (!Array.isArray(pq) || pq.length === 0) return null;
      return pq[0];
    }
  });

  // Linked List 기초 (6개)
  registry.register({
    name: 'linked_list_push',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const list = args[0] || [];
      const val = args[1];
      return [...list, val];
    }
  });

  registry.register({
    name: 'linked_list_pop',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const list = args[0];
      if (!Array.isArray(list) || list.length === 0) return null;
      return list.slice(0, -1);
    }
  });

  registry.register({
    name: 'linked_list_insert',
    module: 'collection',
    executor: (args) => {
      if (args.length < 3) return null;
      const list = args[0];
      const idx = args[1];
      const val = args[2];

      if (!Array.isArray(list) || typeof idx !== 'number') return null;

      const result = [...list];
      result.splice(idx, 0, val);
      return result;
    }
  });

  registry.register({
    name: 'linked_list_delete',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const list = args[0];
      const idx = args[1];

      if (!Array.isArray(list) || typeof idx !== 'number') return null;

      const result = [...list];
      result.splice(idx, 1);
      return result;
    }
  });

  registry.register({
    name: 'linked_list_find',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const list = args[0];
      const val = args[1];

      if (!Array.isArray(list)) return null;
      return list.indexOf(val);
    }
  });

  // Binary Tree 기초 (8개)
  registry.register({
    name: 'tree_node',
    module: 'collection',
    executor: (args) => {
      const val = args[0] !== undefined ? args[0] : null;
      return { value: val, left: null, right: null };
    }
  });

  registry.register({
    name: 'tree_insert',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const tree = args[0];
      const val = args[1];

      if (tree === null) {
        return { value: val, left: null, right: null };
      }

      if (val < tree.value) {
        return { ...tree, left: registry.call('tree_insert', [tree.left, val]) };
      } else {
        return { ...tree, right: registry.call('tree_insert', [tree.right, val]) };
      }
    }
  });

  registry.register({
    name: 'tree_search',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const tree = args[0];
      const val = args[1];

      if (tree === null) return false;
      if (tree.value === val) return true;
      if (val < tree.value) return registry.call('tree_search', [tree.left, val]);
      return registry.call('tree_search', [tree.right, val]);
    }
  });

  registry.register({
    name: 'tree_delete',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const tree = args[0];
      const val = args[1];

      if (tree === null) return null;

      if (val < tree.value) {
        return { ...tree, left: registry.call('tree_delete', [tree.left, val]) };
      } else if (val > tree.value) {
        return { ...tree, right: registry.call('tree_delete', [tree.right, val]) };
      } else {
        if (tree.left === null) return tree.right;
        if (tree.right === null) return tree.left;

        const minRight = (node) => {
          while (node.left !== null) node = node.left;
          return node.value;
        };

        const successor = minRight(tree.right);
        return { ...tree, value: successor, right: registry.call('tree_delete', [tree.right, successor]) };
      }
    }
  });

  registry.register({
    name: 'tree_traverse_inorder',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const tree = args[0];

      if (tree === null) return [];

      const result = [];
      const traverse = (node) => {
        if (node === null) return;
        traverse(node.left);
        result.push(node.value);
        traverse(node.right);
      };
      traverse(tree);
      return result;
    }
  });

  registry.register({
    name: 'tree_traverse_preorder',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const tree = args[0];

      if (tree === null) return [];

      const result = [];
      const traverse = (node) => {
        if (node === null) return;
        result.push(node.value);
        traverse(node.left);
        traverse(node.right);
      };
      traverse(tree);
      return result;
    }
  });

  registry.register({
    name: 'tree_traverse_postorder',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const tree = args[0];

      if (tree === null) return [];

      const result = [];
      const traverse = (node) => {
        if (node === null) return;
        traverse(node.left);
        traverse(node.right);
        result.push(node.value);
      };
      traverse(tree);
      return result;
    }
  });

  registry.register({
    name: 'tree_height',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const tree = args[0];

      if (tree === null) return 0;
      return 1 + Math.max(
        registry.call('tree_height', [tree.left]) || 0,
        registry.call('tree_height', [tree.right]) || 0
      );
    }
  });

  // ============================================
  // 5. 그래프 알고리즘 (15개)
  // ============================================

  registry.register({
    name: 'graph_create',
    module: 'collection',
    executor: (args) => {
      return {};
    }
  });

  registry.register({
    name: 'graph_add_node',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const graph = args[0] || {};
      const node = args[1];

      if (typeof graph !== 'object') return null;

      return { ...graph, [node]: graph[node] || [] };
    }
  });

  registry.register({
    name: 'graph_add_edge',
    module: 'collection',
    executor: (args) => {
      if (args.length < 3) return null;
      const graph = args[0] || {};
      const from = args[1];
      const to = args[2];
      const weight = args[3] || 1;

      if (typeof graph !== 'object') return null;

      const result = { ...graph };
      if (!result[from]) result[from] = [];
      if (!result[to]) result[to] = [];

      result[from].push({ node: to, weight });
      return result;
    }
  });

  registry.register({
    name: 'graph_remove_node',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const graph = args[0];
      const node = args[1];

      if (typeof graph !== 'object') return null;

      const result = { ...graph };
      delete result[node];

      for (const key in result) {
        result[key] = result[key].filter(edge => edge.node !== node);
      }
      return result;
    }
  });

  registry.register({
    name: 'graph_remove_edge',
    module: 'collection',
    executor: (args) => {
      if (args.length < 3) return null;
      const graph = args[0];
      const from = args[1];
      const to = args[2];

      if (typeof graph !== 'object' || !graph[from]) return null;

      const result = { ...graph };
      result[from] = result[from].filter(edge => edge.node !== to);
      return result;
    }
  });

  registry.register({
    name: 'graph_bfs',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const graph = args[0];
      const start = args[1];

      if (typeof graph !== 'object' || !graph[start]) return null;

      const visited = new Set();
      const queue = [start];
      const result = [];

      while (queue.length > 0) {
        const node = queue.shift();
        if (visited.has(node)) continue;
        visited.add(node);
        result.push(node);

        for (const edge of graph[node] || []) {
          if (!visited.has(edge.node)) {
            queue.push(edge.node);
          }
        }
      }
      return result;
    }
  });

  registry.register({
    name: 'graph_dfs',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const graph = args[0];
      const start = args[1];

      if (typeof graph !== 'object' || !graph[start]) return null;

      const visited = new Set();
      const result = [];

      const dfs = (node) => {
        visited.add(node);
        result.push(node);
        for (const edge of graph[node] || []) {
          if (!visited.has(edge.node)) {
            dfs(edge.node);
          }
        }
      };

      dfs(start);
      return result;
    }
  });

  registry.register({
    name: 'graph_dijkstra',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const graph = args[0];
      const start = args[1];

      if (typeof graph !== 'object' || !graph[start]) return null;

      const distances = {};
      const visited = new Set();

      for (const node in graph) {
        distances[node] = Infinity;
      }
      distances[start] = 0;

      for (const node in graph) {
        let current = null;
        let minDist = Infinity;

        for (const n in distances) {
          if (!visited.has(n) && distances[n] < minDist) {
            current = n;
            minDist = distances[n];
          }
        }

        if (current === null) break;
        visited.add(current);

        for (const edge of graph[current] || []) {
          const alt = distances[current] + edge.weight;
          if (alt < distances[edge.node]) {
            distances[edge.node] = alt;
          }
        }
      }

      return distances;
    }
  });

  registry.register({
    name: 'graph_bellman_ford',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const graph = args[0];
      const start = args[1];

      if (typeof graph !== 'object' || !graph[start]) return null;

      const distances = {};
      for (const node in graph) {
        distances[node] = Infinity;
      }
      distances[start] = 0;

      const nodes = Object.keys(graph);
      for (let i = 0; i < nodes.length - 1; i++) {
        for (const u in graph) {
          for (const edge of graph[u] || []) {
            if (distances[u] !== Infinity && distances[u] + edge.weight < distances[edge.node]) {
              distances[edge.node] = distances[u] + edge.weight;
            }
          }
        }
      }

      return distances;
    }
  });

  registry.register({
    name: 'graph_floyd_warshall',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const graph = args[0];

      if (typeof graph !== 'object') return null;

      const nodes = Object.keys(graph);
      const dist = {};

      for (const u of nodes) {
        dist[u] = {};
        for (const v of nodes) {
          dist[u][v] = Infinity;
        }
        dist[u][u] = 0;
      }

      for (const u in graph) {
        for (const edge of graph[u] || []) {
          dist[u][edge.node] = edge.weight;
        }
      }

      for (const k of nodes) {
        for (const i of nodes) {
          for (const j of nodes) {
            dist[i][j] = Math.min(dist[i][j], dist[i][k] + dist[k][j]);
          }
        }
      }

      return dist;
    }
  });

  registry.register({
    name: 'graph_topological_sort',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const graph = args[0];

      if (typeof graph !== 'object') return null;

      const visited = new Set();
      const stack = [];

      const dfs = (node) => {
        visited.add(node);
        for (const edge of graph[node] || []) {
          if (!visited.has(edge.node)) {
            dfs(edge.node);
          }
        }
        stack.push(node);
      };

      for (const node in graph) {
        if (!visited.has(node)) {
          dfs(node);
        }
      }

      return stack.reverse();
    }
  });

  registry.register({
    name: 'graph_scc',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const graph = args[0];

      if (typeof graph !== 'object') return null;

      // Kosaraju 알고리즘
      const visited = new Set();
      const stack = [];

      const dfs1 = (node) => {
        visited.add(node);
        for (const edge of graph[node] || []) {
          if (!visited.has(edge.node)) {
            dfs1(edge.node);
          }
        }
        stack.push(node);
      };

      for (const node in graph) {
        if (!visited.has(node)) {
          dfs1(node);
        }
      }

      const reverseGraph = {};
      for (const node in graph) {
        reverseGraph[node] = reverseGraph[node] || [];
      }
      for (const u in graph) {
        for (const edge of graph[u] || []) {
          if (!reverseGraph[edge.node]) reverseGraph[edge.node] = [];
          reverseGraph[edge.node].push({ node: u });
        }
      }

      visited.clear();
      const sccs = [];

      const dfs2 = (node, scc) => {
        visited.add(node);
        scc.push(node);
        for (const edge of reverseGraph[node] || []) {
          if (!visited.has(edge.node)) {
            dfs2(edge.node, scc);
          }
        }
      };

      while (stack.length > 0) {
        const node = stack.pop();
        if (!visited.has(node)) {
          const scc = [];
          dfs2(node, scc);
          sccs.push(scc);
        }
      }

      return sccs;
    }
  });

  registry.register({
    name: 'graph_mst_kruskal',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const graph = args[0];

      if (typeof graph !== 'object') return null;

      const edges = [];
      for (const u in graph) {
        for (const edge of graph[u] || []) {
          edges.push({ from: u, to: edge.node, weight: edge.weight });
        }
      }

      edges.sort((a, b) => a.weight - b.weight);

      const parent = {};
      for (const node in graph) {
        parent[node] = node;
      }

      const find = (x) => {
        if (parent[x] !== x) {
          parent[x] = find(parent[x]);
        }
        return parent[x];
      };

      const union = (x, y) => {
        const px = find(x);
        const py = find(y);
        if (px !== py) {
          parent[px] = py;
          return true;
        }
        return false;
      };

      const mst = [];
      for (const edge of edges) {
        if (union(edge.from, edge.to)) {
          mst.push(edge);
        }
      }

      return mst;
    }
  });

  registry.register({
    name: 'graph_mst_prim',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const graph = args[0];

      if (typeof graph !== 'object') return null;

      const nodes = Object.keys(graph);
      if (nodes.length === 0) return [];

      const inMST = new Set();
      const mst = [];
      const edges = [];

      inMST.add(nodes[0]);
      for (const edge of graph[nodes[0]] || []) {
        edges.push({ from: nodes[0], to: edge.node, weight: edge.weight });
      }

      while (edges.length > 0 && inMST.size < nodes.length) {
        edges.sort((a, b) => a.weight - b.weight);
        const edge = edges.shift();

        if (!inMST.has(edge.to)) {
          inMST.add(edge.to);
          mst.push(edge);

          for (const e of graph[edge.to] || []) {
            if (!inMST.has(e.node)) {
              edges.push({ from: edge.to, to: e.node, weight: e.weight });
            }
          }
        }
      }

      return mst;
    }
  });

  registry.register({
    name: 'graph_cycle_detect',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const graph = args[0];

      if (typeof graph !== 'object') return null;

      const visited = new Set();
      const recursionStack = new Set();

      const hasCycle = (node) => {
        visited.add(node);
        recursionStack.add(node);

        for (const edge of graph[node] || []) {
          if (recursionStack.has(edge.node)) {
            return true;
          }
          if (!visited.has(edge.node) && hasCycle(edge.node)) {
            return true;
          }
        }

        recursionStack.delete(node);
        return false;
      };

      for (const node in graph) {
        if (!visited.has(node)) {
          if (hasCycle(node)) return true;
        }
      }
      return false;
    }
  });

  // ============================================
  // 6. 집합/맵 연산 (10개)
  // ============================================

  registry.register({
    name: 'map_get_or_default',
    module: 'collection',
    executor: (args) => {
      if (args.length < 3) return null;
      const map = args[0];
      const key = args[1];
      const defaultVal = args[2];

      if (typeof map !== 'object') return null;

      return map.hasOwnProperty(key) ? map[key] : defaultVal;
    }
  });

  registry.register({
    name: 'map_put_if_absent',
    module: 'collection',
    executor: (args) => {
      if (args.length < 3) return null;
      const map = args[0] || {};
      const key = args[1];
      const val = args[2];

      if (typeof map !== 'object') return null;

      if (!map.hasOwnProperty(key)) {
        map[key] = val;
      }
      return map;
    }
  });

  registry.register({
    name: 'map_compute',
    module: 'collection',
    executor: (args) => {
      if (args.length < 3) return null;
      const map = args[0] || {};
      const key = args[1];
      const fn = args[2];

      if (typeof map !== 'object' || typeof fn !== 'function') return null;

      const newMap = { ...map };
      newMap[key] = fn(newMap[key]);
      return newMap;
    }
  });

  registry.register({
    name: 'map_merge_maps',
    module: 'collection',
    executor: (args) => {
      const result = {};

      for (const map of args) {
        if (typeof map === 'object' && map !== null) {
          for (const key in map) {
            result[key] = map[key];
          }
        }
      }
      return result;
    }
  });

  registry.register({
    name: 'map_filter',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const map = args[0];
      const fn = args[1];

      if (typeof map !== 'object' || typeof fn !== 'function') return null;

      const result = {};
      for (const key in map) {
        if (fn(key, map[key])) {
          result[key] = map[key];
        }
      }
      return result;
    }
  });

  registry.register({
    name: 'map_transform',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const map = args[0];
      const fn = args[1];

      if (typeof map !== 'object' || typeof fn !== 'function') return null;

      const result = {};
      for (const key in map) {
        result[key] = fn(map[key]);
      }
      return result;
    }
  });

  registry.register({
    name: 'map_invert',
    module: 'collection',
    executor: (args) => {
      if (args.length < 1) return null;
      const map = args[0];

      if (typeof map !== 'object') return null;

      const result = {};
      for (const key in map) {
        result[map[key]] = key;
      }
      return result;
    }
  });

  registry.register({
    name: 'map_group',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const map = args[0];
      const fn = args[1];

      if (typeof map !== 'object' || typeof fn !== 'function') return null;

      const result = {};
      for (const key in map) {
        const groupKey = fn(key, map[key]);
        if (!result[groupKey]) result[groupKey] = {};
        result[groupKey][key] = map[key];
      }
      return result;
    }
  });

  registry.register({
    name: 'set_difference',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const set1 = args[0];
      const set2 = args[1];

      if (typeof set1 !== 'object' || typeof set2 !== 'object') return null;

      const result = {};
      for (const key in set1) {
        if (!set2.hasOwnProperty(key)) {
          result[key] = set1[key];
        }
      }
      return result;
    }
  });

  registry.register({
    name: 'set_cartesian_product',
    module: 'collection',
    executor: (args) => {
      if (args.length < 2) return null;
      const set1 = args[0];
      const set2 = args[1];

      if (typeof set1 !== 'object' || typeof set2 !== 'object') return null;

      const result = {};
      let idx = 0;

      for (const key1 in set1) {
        for (const key2 in set2) {
          result[idx] = [set1[key1], set2[key2]];
          idx++;
        }
      }
      return result;
    }
  });
}
