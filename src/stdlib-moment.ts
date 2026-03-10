/**
 * FreeLang v2 stdlib — stdlib-moment.ts
 * npm moment 완전 대체 네이티브 함수 등록
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

const UNIT_MS: Record<string, number> = {
  ms: 1, millisecond: 1, milliseconds: 1,
  s: 1000, second: 1000, seconds: 1000,
  m: 60000, minute: 60000, minutes: 60000,
  h: 3600000, hour: 3600000, hours: 3600000,
  d: 86400000, day: 86400000, days: 86400000,
  w: 604800000, week: 604800000, weeks: 604800000,
  M: 30 * 86400000, month: 30 * 86400000, months: 30 * 86400000,
  y: 365 * 86400000, year: 365 * 86400000, years: 365 * 86400000
};

function relativeTime(diffMs: number): string {
  const abs = Math.abs(diffMs);
  const past = diffMs < 0;
  let label: string;
  if (abs < 45000) label = 'a few seconds';
  else if (abs < 90000) label = 'a minute';
  else if (abs < 45 * 60000) label = `${Math.round(abs / 60000)} minutes`;
  else if (abs < 90 * 60000) label = 'an hour';
  else if (abs < 22 * 3600000) label = `${Math.round(abs / 3600000)} hours`;
  else if (abs < 36 * 3600000) label = 'a day';
  else if (abs < 25 * 86400000) label = `${Math.round(abs / 86400000)} days`;
  else if (abs < 45 * 86400000) label = 'a month';
  else if (abs < 345 * 86400000) label = `${Math.round(abs / (30 * 86400000))} months`;
  else if (abs < 545 * 86400000) label = 'a year';
  else label = `${Math.round(abs / (365 * 86400000))} years`;
  return past ? `${label} ago` : `in ${label}`;
}

export function registerMomentFunctions(registry: NativeFunctionRegistry): void {
  registry.register({
    name: 'moment_now',
    module: 'moment',
    paramCount: 0,
    executor: () => Date.now()
  });

  registry.register({
    name: 'moment_parse',
    module: 'moment',
    paramCount: 1,
    executor: (args: any[]) => {
      const d = new Date(args[0]);
      return isNaN(d.getTime()) ? -1 : d.getTime();
    }
  });

  registry.register({
    name: 'moment_format',
    module: 'moment',
    paramCount: 2,
    executor: (args: any[]) => {
      const d = new Date(Number(args[0]));
      const fmt = String(args[1] || 'YYYY-MM-DD');
      return fmt
        .replace('YYYY', d.getFullYear().toString())
        .replace('YY', d.getFullYear().toString().slice(-2))
        .replace('MM', String(d.getMonth() + 1).padStart(2, '0'))
        .replace('DD', String(d.getDate()).padStart(2, '0'))
        .replace('HH', String(d.getHours()).padStart(2, '0'))
        .replace('mm', String(d.getMinutes()).padStart(2, '0'))
        .replace('ss', String(d.getSeconds()).padStart(2, '0'))
        .replace('SSS', String(d.getMilliseconds()).padStart(3, '0'));
    }
  });

  registry.register({
    name: 'moment_add',
    module: 'moment',
    paramCount: 3,
    executor: (args: any[]) => {
      const ts = Number(args[0]);
      const amount = Number(args[1]);
      const unit = String(args[2]);
      if (unit === 'M' || unit === 'month' || unit === 'months') {
        const d = new Date(ts);
        d.setMonth(d.getMonth() + amount);
        return d.getTime();
      }
      if (unit === 'y' || unit === 'year' || unit === 'years') {
        const d = new Date(ts);
        d.setFullYear(d.getFullYear() + amount);
        return d.getTime();
      }
      return ts + (UNIT_MS[unit] ?? 86400000) * amount;
    }
  });

  registry.register({
    name: 'moment_subtract',
    module: 'moment',
    paramCount: 3,
    executor: (args: any[]) => {
      const ts = Number(args[0]);
      const amount = Number(args[1]);
      const unit = String(args[2]);
      if (unit === 'M' || unit === 'month' || unit === 'months') {
        const d = new Date(ts);
        d.setMonth(d.getMonth() - amount);
        return d.getTime();
      }
      if (unit === 'y' || unit === 'year' || unit === 'years') {
        const d = new Date(ts);
        d.setFullYear(d.getFullYear() - amount);
        return d.getTime();
      }
      return ts - (UNIT_MS[unit] ?? 86400000) * amount;
    }
  });

  registry.register({
    name: 'moment_diff',
    module: 'moment',
    paramCount: 3,
    executor: (args: any[]) => {
      const a = Number(args[0]);
      const b = Number(args[1]);
      const unit = String(args[2]);
      return Math.floor((a - b) / (UNIT_MS[unit] ?? 86400000));
    }
  });

  registry.register({
    name: 'moment_from_now',
    module: 'moment',
    paramCount: 1,
    executor: (args: any[]) => relativeTime(Number(args[0]) - Date.now())
  });

  registry.register({
    name: 'moment_to_now',
    module: 'moment',
    paramCount: 1,
    executor: (args: any[]) => relativeTime(Date.now() - Number(args[0]))
  });

  registry.register({
    name: 'moment_start_of',
    module: 'moment',
    paramCount: 2,
    executor: (args: any[]) => {
      const d = new Date(Number(args[0]));
      const unit = String(args[1]);
      if (unit === 'day' || unit === 'd') { d.setHours(0, 0, 0, 0); }
      else if (unit === 'month' || unit === 'M') { d.setDate(1); d.setHours(0, 0, 0, 0); }
      else if (unit === 'year' || unit === 'y') { d.setMonth(0, 1); d.setHours(0, 0, 0, 0); }
      else if (unit === 'hour' || unit === 'h') { d.setMinutes(0, 0, 0); }
      return d.getTime();
    }
  });

  registry.register({
    name: 'moment_end_of',
    module: 'moment',
    paramCount: 2,
    executor: (args: any[]) => {
      const d = new Date(Number(args[0]));
      const unit = String(args[1]);
      if (unit === 'day' || unit === 'd') { d.setHours(23, 59, 59, 999); }
      else if (unit === 'month' || unit === 'M') { d.setMonth(d.getMonth() + 1, 0); d.setHours(23, 59, 59, 999); }
      else if (unit === 'year' || unit === 'y') { d.setMonth(11, 31); d.setHours(23, 59, 59, 999); }
      return d.getTime();
    }
  });

  registry.register({
    name: 'moment_to_iso_string',
    module: 'moment',
    paramCount: 1,
    executor: (args: any[]) => new Date(Number(args[0])).toISOString()
  });
}
