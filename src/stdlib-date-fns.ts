/**
 * FreeLang v2 stdlib — stdlib-date-fns.ts
 * npm date-fns 완전 대체 네이티브 함수 등록
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

export function registerDateFnsFunctions(registry: NativeFunctionRegistry): void {
  registry.register({
    name: 'datefns_now',
    module: 'date-fns',
    paramCount: 0,
    executor: () => Date.now()
  });

  registry.register({
    name: 'datefns_parse',
    module: 'date-fns',
    paramCount: 1,
    executor: (args: any[]) => {
      const d = new Date(args[0]);
      return isNaN(d.getTime()) ? -1 : d.getTime();
    }
  });

  registry.register({
    name: 'datefns_format',
    module: 'date-fns',
    paramCount: 2,
    executor: (args: any[]) => {
      const d = new Date(Number(args[0]));
      const fmt = String(args[1] || 'yyyy-MM-dd');
      const pad = (n: number, len = 2) => String(n).padStart(len, '0');
      return fmt
        .replace('yyyy', d.getFullYear().toString())
        .replace('YYYY', d.getFullYear().toString())
        .replace('yy', d.getFullYear().toString().slice(-2))
        .replace('MM', pad(d.getMonth() + 1))
        .replace('dd', pad(d.getDate()))
        .replace('DD', pad(d.getDate()))
        .replace('HH', pad(d.getHours()))
        .replace('hh', pad(d.getHours() % 12 || 12))
        .replace('mm', pad(d.getMinutes()))
        .replace('ss', pad(d.getSeconds()))
        .replace('SSS', pad(d.getMilliseconds(), 3));
    }
  });

  registry.register({
    name: 'datefns_add_days',
    module: 'date-fns',
    paramCount: 2,
    executor: (args: any[]) => Number(args[0]) + Number(args[1]) * 86400000
  });

  registry.register({
    name: 'datefns_sub_days',
    module: 'date-fns',
    paramCount: 2,
    executor: (args: any[]) => Number(args[0]) - Number(args[1]) * 86400000
  });

  registry.register({
    name: 'datefns_add_months',
    module: 'date-fns',
    paramCount: 2,
    executor: (args: any[]) => {
      const d = new Date(Number(args[0]));
      d.setMonth(d.getMonth() + Number(args[1]));
      return d.getTime();
    }
  });

  registry.register({
    name: 'datefns_add_years',
    module: 'date-fns',
    paramCount: 2,
    executor: (args: any[]) => {
      const d = new Date(Number(args[0]));
      d.setFullYear(d.getFullYear() + Number(args[1]));
      return d.getTime();
    }
  });

  registry.register({
    name: 'datefns_diff_days',
    module: 'date-fns',
    paramCount: 2,
    executor: (args: any[]) => Math.floor((Number(args[0]) - Number(args[1])) / 86400000)
  });

  registry.register({
    name: 'datefns_diff_months',
    module: 'date-fns',
    paramCount: 2,
    executor: (args: any[]) => {
      const a = new Date(Number(args[0]));
      const b = new Date(Number(args[1]));
      return (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());
    }
  });

  registry.register({
    name: 'datefns_diff_years',
    module: 'date-fns',
    paramCount: 2,
    executor: (args: any[]) => {
      const a = new Date(Number(args[0]));
      const b = new Date(Number(args[1]));
      return a.getFullYear() - b.getFullYear();
    }
  });

  registry.register({
    name: 'datefns_start_of_day',
    module: 'date-fns',
    paramCount: 1,
    executor: (args: any[]) => {
      const d = new Date(Number(args[0]));
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
  });

  registry.register({
    name: 'datefns_end_of_day',
    module: 'date-fns',
    paramCount: 1,
    executor: (args: any[]) => {
      const d = new Date(Number(args[0]));
      d.setHours(23, 59, 59, 999);
      return d.getTime();
    }
  });

  registry.register({
    name: 'datefns_start_of_month',
    module: 'date-fns',
    paramCount: 1,
    executor: (args: any[]) => {
      const d = new Date(Number(args[0]));
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
  });

  registry.register({
    name: 'datefns_end_of_month',
    module: 'date-fns',
    paramCount: 1,
    executor: (args: any[]) => {
      const d = new Date(Number(args[0]));
      d.setMonth(d.getMonth() + 1, 0);
      d.setHours(23, 59, 59, 999);
      return d.getTime();
    }
  });

  registry.register({
    name: 'datefns_get_day',
    module: 'date-fns',
    paramCount: 1,
    executor: (args: any[]) => new Date(Number(args[0])).getDay()
  });

  registry.register({
    name: 'datefns_get_month',
    module: 'date-fns',
    paramCount: 1,
    executor: (args: any[]) => new Date(Number(args[0])).getMonth() + 1
  });

  registry.register({
    name: 'datefns_get_year',
    module: 'date-fns',
    paramCount: 1,
    executor: (args: any[]) => new Date(Number(args[0])).getFullYear()
  });

  registry.register({
    name: 'datefns_get_date',
    module: 'date-fns',
    paramCount: 1,
    executor: (args: any[]) => new Date(Number(args[0])).getDate()
  });

  registry.register({
    name: 'datefns_get_hours',
    module: 'date-fns',
    paramCount: 1,
    executor: (args: any[]) => new Date(Number(args[0])).getHours()
  });

  registry.register({
    name: 'datefns_get_minutes',
    module: 'date-fns',
    paramCount: 1,
    executor: (args: any[]) => new Date(Number(args[0])).getMinutes()
  });
}
