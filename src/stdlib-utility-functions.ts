/**
 * FreeLang v2 - Utility Functions (Phase F)
 *
 * 날짜/시간 처리, 통화 변환, 단위 변환, 유틸리티 (40개 함수)
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

export function registerUtilityFunctions(registry: NativeFunctionRegistry): void {
  // ─────────────────────────────────────────────────────────────
  // Date/Time Functions (12 functions)
  // ─────────────────────────────────────────────────────────────

  registry.register({
    name: 'now',
    module: 'utility',
    executor: (args) => Date.now()
  });

  registry.register({
    name: 'date_create',
    module: 'utility',
    executor: (args) => {
      const year = Math.floor(Number(args[0]) || new Date().getFullYear());
      const month = Math.floor(Number(args[1]) || 1) - 1;
      const day = Math.floor(Number(args[2]) || 1);
      return new Date(year, month, day).getTime();
    }
  });

  registry.register({
    name: 'date_format',
    module: 'utility',
    executor: (args) => {
      const timestamp = Number(args[0]) || Date.now();
      const format = String(args[1] || 'YYYY-MM-DD');
      const date = new Date(timestamp);

      let result = format;
      result = result.replaceAll('YYYY', String(date.getFullYear()));
      result = result.replaceAll('MM', String(date.getMonth() + 1).padStart(2, '0'));
      result = result.replaceAll('DD', String(date.getDate()).padStart(2, '0'));
      result = result.replaceAll('HH', String(date.getHours()).padStart(2, '0'));
      result = result.replaceAll('mm', String(date.getMinutes()).padStart(2, '0'));
      result = result.replaceAll('ss', String(date.getSeconds()).padStart(2, '0'));

      return result;
    }
  });

  registry.register({
    name: 'date_parse',
    module: 'utility',
    executor: (args) => {
      const str = String(args[0]);
      const date = new Date(str);
      return isNaN(date.getTime()) ? 0 : date.getTime();
    }
  });

  registry.register({
    name: 'date_add',
    module: 'utility',
    executor: (args) => {
      const timestamp = Number(args[0]);
      const amount = Math.floor(Number(args[1]) || 0);
      const unit = String(args[2] || 'ms');

      let ms = 0;
      switch (unit.toLowerCase()) {
        case 'ms': ms = amount; break;
        case 's': ms = amount * 1000; break;
        case 'm': ms = amount * 60000; break;
        case 'h': ms = amount * 3600000; break;
        case 'd': ms = amount * 86400000; break;
        case 'w': ms = amount * 604800000; break;
        case 'y': {
          const date = new Date(timestamp);
          date.setFullYear(date.getFullYear() + amount);
          return date.getTime();
        }
        default: ms = amount;
      }

      return timestamp + ms;
    }
  });

  registry.register({
    name: 'date_diff',
    module: 'utility',
    executor: (args) => {
      const date1 = Number(args[0]);
      const date2 = Number(args[1]);
      const unit = String(args[2] || 'ms');

      const diff = Math.abs(date2 - date1);
      switch (unit.toLowerCase()) {
        case 's': return Math.floor(diff / 1000);
        case 'm': return Math.floor(diff / 60000);
        case 'h': return Math.floor(diff / 3600000);
        case 'd': return Math.floor(diff / 86400000);
        case 'w': return Math.floor(diff / 604800000);
        default: return diff;
      }
    }
  });

  registry.register({
    name: 'timestamp_to_iso',
    module: 'utility',
    executor: (args) => {
      const timestamp = Number(args[0]) || Date.now();
      return new Date(timestamp).toISOString();
    }
  });

  registry.register({
    name: 'iso_to_timestamp',
    module: 'utility',
    executor: (args) => {
      const iso = String(args[0]);
      return new Date(iso).getTime();
    }
  });

  registry.register({
    name: 'day_of_week',
    module: 'utility',
    executor: (args) => {
      const timestamp = Number(args[0]) || Date.now();
      const date = new Date(timestamp);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[date.getDay()];
    }
  });

  registry.register({
    name: 'is_leap_year',
    module: 'utility',
    executor: (args) => {
      const year = Math.floor(Number(args[0]) || new Date().getFullYear());
      return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    }
  });

  registry.register({
    name: 'time_ago',
    module: 'utility',
    executor: (args) => {
      const timestamp = Number(args[0]);
      const now = Date.now();
      const diff = now - timestamp;

      if (diff < 60000) return Math.floor(diff / 1000) + 's ago';
      if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
      if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
      if (diff < 2592000000) return Math.floor(diff / 86400000) + 'd ago';
      return Math.floor(diff / 2592000000) + 'mo ago';
    }
  });

  registry.register({
    name: 'timezone_offset',
    module: 'utility',
    executor: (args) => {
      const tz = String(args[0] || 'UTC');
      const date = new Date();
      // Simplified timezone offset
      const offset = date.getTimezoneOffset();
      return -offset * 60000;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // Currency Conversion (8 functions)
  // ─────────────────────────────────────────────────────────────

  registry.register({
    name: 'currency_format',
    module: 'utility',
    executor: (args) => {
      const amount = Number(args[0]);
      const currency = String(args[1] || 'USD');
      const locale = String(args[2] || 'en-US');

      const symbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'CNY': '¥',
        'KRW': '₩'
      };

      const symbol = symbols[currency] || currency;
      return symbol + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
  });

  registry.register({
    name: 'currency_convert',
    module: 'utility',
    executor: (args) => {
      const amount = Number(args[0]);
      const from = String(args[1] || 'USD');
      const to = String(args[2] || 'EUR');

      // Simplified rates (should be from API in real usage)
      const rates = {
        'USD': 1,
        'EUR': 0.92,
        'GBP': 0.79,
        'JPY': 149.5,
        'CNY': 7.24,
        'KRW': 1319.5
      };

      const fromRate = rates[from] || 1;
      const toRate = rates[to] || 1;
      return (amount / fromRate) * toRate;
    }
  });

  registry.register({
    name: 'currency_parse',
    module: 'utility',
    executor: (args) => {
      const str = String(args[0]);
      const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
      return isNaN(num) ? 0 : num;
    }
  });

  registry.register({
    name: 'currency_list',
    module: 'utility',
    executor: (args) => {
      return ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'KRW', 'CHF', 'CAD'];
    }
  });

  registry.register({
    name: 'currency_symbol',
    module: 'utility',
    executor: (args) => {
      const currency = String(args[0] || 'USD');
      const symbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'CNY': '¥',
        'KRW': '₩',
        'CHF': 'CHF',
        'CAD': '$'
      };
      return symbols[currency] || '';
    }
  });

  registry.register({
    name: 'currency_round',
    module: 'utility',
    executor: (args) => {
      const amount = Number(args[0]);
      const decimals = Math.floor(Number(args[1]) || 2);
      return Math.round(amount * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }
  });

  registry.register({
    name: 'currency_is_negative',
    module: 'utility',
    executor: (args) => {
      const amount = Number(args[0]);
      return amount < 0;
    }
  });

  registry.register({
    name: 'currency_absolute',
    module: 'utility',
    executor: (args) => {
      const amount = Number(args[0]);
      return Math.abs(amount);
    }
  });

  // ─────────────────────────────────────────────────────────────
  // Unit Conversion (12 functions)
  // ─────────────────────────────────────────────────────────────

  registry.register({
    name: 'convert_distance',
    module: 'utility',
    executor: (args) => {
      const value = Number(args[0]);
      const from = String(args[1] || 'km');
      const to = String(args[2] || 'mi');

      const toMeter = {
        'mm': 0.001,
        'cm': 0.01,
        'm': 1,
        'km': 1000,
        'in': 0.0254,
        'ft': 0.3048,
        'yd': 0.9144,
        'mi': 1609.34
      };

      const meters = value * (toMeter[from] || 1);
      return meters / (toMeter[to] || 1);
    }
  });

  registry.register({
    name: 'convert_weight',
    module: 'utility',
    executor: (args) => {
      const value = Number(args[0]);
      const from = String(args[1] || 'kg');
      const to = String(args[2] || 'lb');

      const toGram = {
        'mg': 0.001,
        'g': 1,
        'kg': 1000,
        'oz': 28.3495,
        'lb': 453.592,
        't': 1000000
      };

      const grams = value * (toGram[from] || 1);
      return grams / (toGram[to] || 1);
    }
  });

  registry.register({
    name: 'convert_temperature',
    module: 'utility',
    executor: (args) => {
      const value = Number(args[0]);
      const from = String(args[1] || 'C');
      const to = String(args[2] || 'F');

      let celsius = value;
      if (from === 'F') celsius = (value - 32) * 5 / 9;
      else if (from === 'K') celsius = value - 273.15;

      if (to === 'F') return celsius * 9 / 5 + 32;
      if (to === 'K') return celsius + 273.15;
      return celsius;
    }
  });

  registry.register({
    name: 'convert_volume',
    module: 'utility',
    executor: (args) => {
      const value = Number(args[0]);
      const from = String(args[1] || 'L');
      const to = String(args[2] || 'mL');

      const toMilliliter = {
        'mL': 1,
        'L': 1000,
        'fl oz': 29.5735,
        'cup': 236.588,
        'pint': 473.176,
        'gallon': 3785.41
      };

      const ml = value * (toMilliliter[from] || 1);
      return ml / (toMilliliter[to] || 1);
    }
  });

  registry.register({
    name: 'convert_speed',
    module: 'utility',
    executor: (args) => {
      const value = Number(args[0]);
      const from = String(args[1] || 'kph');
      const to = String(args[2] || 'mph');

      const toMps = {
        'mps': 1,
        'kph': 1 / 3.6,
        'mph': 1 / 2.237,
        'knot': 1 / 1.944
      };

      const mps = value * (toMps[from] || 1);
      return mps / (toMps[to] || 1);
    }
  });

  registry.register({
    name: 'convert_area',
    module: 'utility',
    executor: (args) => {
      const value = Number(args[0]);
      const from = String(args[1] || 'm2');
      const to = String(args[2] || 'ft2');

      const toM2 = {
        'mm2': 0.000001,
        'cm2': 0.0001,
        'm2': 1,
        'km2': 1000000,
        'in2': 0.00064516,
        'ft2': 0.092903,
        'yd2': 0.836127,
        'mi2': 2589988
      };

      const m2 = value * (toM2[from] || 1);
      return m2 / (toM2[to] || 1);
    }
  });

  registry.register({
    name: 'convert_storage',
    module: 'utility',
    executor: (args) => {
      const value = Number(args[0]);
      const from = String(args[1] || 'MB');
      const to = String(args[2] || 'GB');

      const toByte = {
        'B': 1,
        'KB': 1024,
        'MB': 1024 * 1024,
        'GB': 1024 * 1024 * 1024,
        'TB': 1024 * 1024 * 1024 * 1024
      };

      const bytes = value * (toByte[from] || 1);
      return bytes / (toByte[to] || 1);
    }
  });

  registry.register({
    name: 'convert_energy',
    module: 'utility',
    executor: (args) => {
      const value = Number(args[0]);
      const from = String(args[1] || 'kWh');
      const to = String(args[2] || 'MJ');

      const toJoule = {
        'J': 1,
        'kJ': 1000,
        'MJ': 1000000,
        'kWh': 3600000,
        'cal': 4.184,
        'kcal': 4184
      };

      const joules = value * (toJoule[from] || 1);
      return joules / (toJoule[to] || 1);
    }
  });

  registry.register({
    name: 'byte_readable',
    module: 'utility',
    executor: (args) => {
      const bytes = Number(args[0]);
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      let size = bytes;
      let unitIndex = 0;

      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
      }

      return size.toFixed(2) + ' ' + units[unitIndex];
    }
  });

  registry.register({
    name: 'percent_change',
    module: 'utility',
    executor: (args) => {
      const oldValue = Number(args[0]);
      const newValue = Number(args[1]);
      if (oldValue === 0) return newValue === 0 ? 0 : Infinity;
      return ((newValue - oldValue) / oldValue) * 100;
    }
  });

  registry.register({
    name: 'percent_of',
    module: 'utility',
    executor: (args) => {
      const value = Number(args[0]);
      const total = Number(args[1]);
      return total === 0 ? 0 : (value / total) * 100;
    }
  });

  registry.register({
    name: 'ratio_simplify',
    module: 'utility',
    executor: (args) => {
      const a = Math.floor(Number(args[0]));
      const b = Math.floor(Number(args[1]));

      const gcd = (x, y) => y === 0 ? x : gcd(y, x % y);
      const divisor = gcd(Math.abs(a), Math.abs(b));

      return [a / divisor, b / divisor];
    }
  });

  // ─────────────────────────────────────────────────────────────
  // Misc Utilities (8 functions)
  // ─────────────────────────────────────────────────────────────

  registry.register({
    name: 'uuid_v4',
    module: 'utility',
    executor: (args) => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
  });

  registry.register({
    name: 'hash_simple',
    module: 'utility',
    executor: (args) => {
      const str = String(args[0]);
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash);
    }
  });

  registry.register({
    name: 'md5_mock',
    module: 'utility',
    executor: (args) => {
      const str = String(args[0]);
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16);
    }
  });

  registry.register({
    name: 'base64_encode',
    module: 'utility',
    executor: (args) => {
      const str = String(args[0]);
      try {
        return Buffer.from(str).toString('base64');
      } catch {
        return '';
      }
    }
  });

  registry.register({
    name: 'base64_decode',
    module: 'utility',
    executor: (args) => {
      const str = String(args[0]);
      try {
        return Buffer.from(str, 'base64').toString('utf8');
      } catch {
        return '';
      }
    }
  });

  registry.register({
    name: 'url_encode',
    module: 'utility',
    executor: (args) => {
      return encodeURIComponent(String(args[0]));
    }
  });

  registry.register({
    name: 'url_decode',
    module: 'utility',
    executor: (args) => {
      try {
        return decodeURIComponent(String(args[0]));
      } catch {
        return String(args[0]);
      }
    }
  });

  registry.register({
    name: 'retry',
    module: 'utility',
    executor: (args) => {
      const fn = args[0];
      const maxRetries = Math.floor(Number(args[1]) || 3);
      const delay = Math.floor(Number(args[2]) || 100);

      if (typeof fn !== 'function') return null;

      let result = null;
      for (let i = 0; i < maxRetries; i++) {
        try {
          result = fn();
          break;
        } catch (e) {
          if (i === maxRetries - 1) throw e;
        }
      }

      return result;
    }
  });
}
