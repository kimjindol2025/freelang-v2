/**
 * FreeLang v2 stdlib — stdlib-dayjs.ts
 * npm dayjs 완전 대체 네이티브 함수 등록
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

const UNIT_MS: Record<string, number> = {
  ms: 1, millisecond: 1, milliseconds: 1,
  s: 1000, second: 1000, seconds: 1000,
  m: 60000, minute: 60000, minutes: 60000,
  h: 3600000, hour: 3600000, hours: 3600000,
  d: 86400000, day: 86400000, days: 86400000,
  w: 604800000, week: 604800000, weeks: 604800000
};

export function registerDayjsFunctions(registry: NativeFunctionRegistry): void {
  registry.register({
    name: 'dayjs_now',
    module: 'dayjs',
    paramCount: 0,
    executor: () => Date.now()
  });

  registry.register({
    name: 'dayjs_parse',
    module: 'dayjs',
    paramCount: 1,
    executor: (args: any[]) => {
      const d = new Date(args[0]);
      return isNaN(d.getTime()) ? -1 : d.getTime();
    }
  });

  registry.register({
    name: 'dayjs_format',
    module: 'dayjs',
    paramCount: 2,
    executor: (args: any[]) => {
      const d = new Date(Number(args[0]));
      const fmt = String(args[1] || 'YYYY-MM-DD');
      return fmt
        .replace('YYYY', d.getFullYear().toString())
        .replace('MM', String(d.getMonth() + 1).padStart(2, '0'))
        .replace('DD', String(d.getDate()).padStart(2, '0'))
        .replace('HH', String(d.getHours()).padStart(2, '0'))
        .replace('mm', String(d.getMinutes()).padStart(2, '0'))
        .replace('ss', String(d.getSeconds()).padStart(2, '0'));
    }
  });

  registry.register({
    name: 'dayjs_add',
    module: 'dayjs',
    paramCount: 3,
    executor: (args: any[]) => {
      const ts = Number(args[0]);
      const amount = Number(args[1]);
      const unit = String(args[2]);
      return ts + (UNIT_MS[unit] ?? 86400000) * amount;
    }
  });

  registry.register({
    name: 'dayjs_subtract',
    module: 'dayjs',
    paramCount: 3,
    executor: (args: any[]) => {
      const ts = Number(args[0]);
      const amount = Number(args[1]);
      const unit = String(args[2]);
      return ts - (UNIT_MS[unit] ?? 86400000) * amount;
    }
  });

  registry.register({
    name: 'dayjs_diff',
    module: 'dayjs',
    paramCount: 3,
    executor: (args: any[]) => {
      const a = Number(args[0]);
      const b = Number(args[1]);
      const unit = String(args[2]);
      return Math.floor((a - b) / (UNIT_MS[unit] ?? 86400000));
    }
  });

  registry.register({
    name: 'dayjs_start_of',
    module: 'dayjs',
    paramCount: 2,
    executor: (args: any[]) => {
      const d = new Date(Number(args[0]));
      const unit = String(args[1]);
      if (unit === 'day' || unit === 'd') {
        d.setHours(0, 0, 0, 0);
      } else if (unit === 'month' || unit === 'M') {
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
      } else if (unit === 'year' || unit === 'y') {
        d.setMonth(0, 1);
        d.setHours(0, 0, 0, 0);
      } else if (unit === 'hour' || unit === 'h') {
        d.setMinutes(0, 0, 0);
      }
      return d.getTime();
    }
  });

  registry.register({
    name: 'dayjs_end_of',
    module: 'dayjs',
    paramCount: 2,
    executor: (args: any[]) => {
      const d = new Date(Number(args[0]));
      const unit = String(args[1]);
      if (unit === 'day' || unit === 'd') {
        d.setHours(23, 59, 59, 999);
      } else if (unit === 'month' || unit === 'M') {
        d.setMonth(d.getMonth() + 1, 0);
        d.setHours(23, 59, 59, 999);
      } else if (unit === 'year' || unit === 'y') {
        d.setMonth(11, 31);
        d.setHours(23, 59, 59, 999);
      } else if (unit === 'hour' || unit === 'h') {
        d.setMinutes(59, 59, 999);
      }
      return d.getTime();
    }
  });

  registry.register({
    name: 'dayjs_to_date_string',
    module: 'dayjs',
    paramCount: 1,
    executor: (args: any[]) => new Date(Number(args[0])).toISOString()
  });
}
