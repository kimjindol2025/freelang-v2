/**
 * FreeLang v2 - Data Processing Functions (Phase F)
 *
 * CSV/JSON/XML 파싱, 데이터 변환, 정규화, 검증 (60개 함수)
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

export function registerDataProcessingFunctions(registry: NativeFunctionRegistry): void {
  // ─────────────────────────────────────────────────────────────
  // CSV Processing (15 functions)
  // ─────────────────────────────────────────────────────────────

  registry.register({
    name: 'csv_parse',
    module: 'data',
    executor: (args) => {
      const csv = String(args[0]);
      const delimiter = args[1] ? String(args[1]) : ',';
      const lines = csv.split('\n').filter(l => l.trim());
      return lines.map(line => line.split(delimiter).map(f => f.trim()));
    }
  });

  registry.register({
    name: 'csv_parse_with_header',
    module: 'data',
    executor: (args) => {
      const csv = String(args[0]);
      const delimiter = args[1] ? String(args[1]) : ',';
      const lines = csv.split('\n').filter(l => l.trim());
      if (lines.length === 0) return [];
      const headers = lines[0].split(delimiter).map(h => h.trim());
      return lines.slice(1).map(line => {
        const values = line.split(delimiter).map(v => v.trim());
        const obj = {};
        headers.forEach((h, i) => obj[h] = values[i]);
        return obj;
      });
    }
  });

  registry.register({
    name: 'csv_stringify',
    module: 'data',
    executor: (args) => {
      const data = args[0];
      const delimiter = args[1] ? String(args[1]) : ',';
      if (!Array.isArray(data)) return '';
      return data.map(row => {
        if (Array.isArray(row)) return row.join(delimiter);
        if (typeof row === 'object') return Object.values(row).join(delimiter);
        return String(row);
      }).join('\n');
    }
  });

  registry.register({
    name: 'csv_quote_fields',
    module: 'data',
    executor: (args) => {
      const data = args[0];
      if (!Array.isArray(data)) return data;
      return data.map(row => {
        if (Array.isArray(row)) {
          return row.map(f => {
            const s = String(f);
            return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
          });
        }
        return row;
      });
    }
  });

  registry.register({
    name: 'csv_unquote_fields',
    module: 'data',
    executor: (args) => {
      const data = args[0];
      if (!Array.isArray(data)) return data;
      return data.map(row => {
        if (Array.isArray(row)) {
          return row.map(f => {
            const s = String(f);
            if (s.startsWith('"') && s.endsWith('"')) {
              return s.slice(1, -1).replace(/""/g, '"');
            }
            return s;
          });
        }
        return row;
      });
    }
  });

  registry.register({
    name: 'csv_escape',
    module: 'data',
    executor: (args) => {
      const str = String(args[0]);
      return str.replace(/"/g, '""');
    }
  });

  registry.register({
    name: 'csv_unescape',
    module: 'data',
    executor: (args) => {
      const str = String(args[0]);
      return str.replace(/""/g, '"');
    }
  });

  registry.register({
    name: 'csv_get_column',
    module: 'data',
    executor: (args) => {
      const data = args[0];
      const colIndex = Math.floor(args[1] || 0);
      if (!Array.isArray(data)) return [];
      return data.map(row => Array.isArray(row) ? row[colIndex] : row[Object.keys(row)[colIndex]]);
    }
  });

  registry.register({
    name: 'csv_filter_rows',
    module: 'data',
    executor: (args) => {
      const data = args[0];
      const colIndex = Math.floor(args[1] || 0);
      const value = args[2];
      if (!Array.isArray(data)) return [];
      return data.filter(row => {
        if (Array.isArray(row)) return row[colIndex] === value;
        const vals = Object.values(row);
        return vals[colIndex] === value;
      });
    }
  });

  registry.register({
    name: 'csv_sort_by_column',
    module: 'data',
    executor: (args) => {
      const data = args[0];
      const colIndex = Math.floor(args[1] || 0);
      const desc = args[2] || false;
      if (!Array.isArray(data)) return data;
      const sorted = [...data].sort((a, b) => {
        const aVal = Array.isArray(a) ? a[colIndex] : Object.values(a)[colIndex];
        const bVal = Array.isArray(b) ? b[colIndex] : Object.values(b)[colIndex];
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return desc ? -cmp : cmp;
      });
      return sorted;
    }
  });

  registry.register({
    name: 'csv_aggregate',
    module: 'data',
    executor: (args) => {
      const data = args[0];
      const colIndex = Math.floor(args[1] || 0);
      const operation = String(args[2] || 'sum');
      if (!Array.isArray(data) || data.length === 0) return null;

      const values = data.map(row => {
        const v = Array.isArray(row) ? row[colIndex] : Object.values(row)[colIndex];
        return Number(v) || 0;
      });

      switch (operation.toLowerCase()) {
        case 'sum': return values.reduce((a, b) => a + b, 0);
        case 'avg': return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        case 'min': return Math.min(...values);
        case 'max': return Math.max(...values);
        case 'count': return values.length;
        default: return 0;
      }
    }
  });

  registry.register({
    name: 'csv_deduplicate',
    module: 'data',
    executor: (args) => {
      const data = args[0];
      if (!Array.isArray(data)) return data;
      const seen = new Set();
      return data.filter(row => {
        const key = JSON.stringify(row);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
  });

  registry.register({
    name: 'csv_transpose',
    module: 'data',
    executor: (args) => {
      const data = args[0];
      if (!Array.isArray(data) || data.length === 0) return [];
      const maxLen = Math.max(...data.map(r => Array.isArray(r) ? r.length : 1));
      const result = [];
      for (let i = 0; i < maxLen; i++) {
        const row = [];
        for (let j = 0; j < data.length; j++) {
          const cell = Array.isArray(data[j]) ? data[j][i] : (i === 0 ? data[j] : undefined);
          row.push(cell);
        }
        result.push(row);
      }
      return result;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // JSON Processing (15 functions)
  // ─────────────────────────────────────────────────────────────

  registry.register({
    name: 'json_parse',
    module: 'data',
    executor: (args) => {
      try {
        return JSON.parse(String(args[0]));
      } catch (e) {
        return null;
      }
    }
  });

  registry.register({
    name: 'json_stringify',
    module: 'data',
    executor: (args) => {
      try {
        const indent = args[1] ? Number(args[1]) : 0;
        return JSON.stringify(args[0], null, indent > 0 ? indent : undefined);
      } catch (e) {
        return '';
      }
    }
  });

  registry.register({
    name: 'json_pretty',
    module: 'data',
    executor: (args) => {
      try {
        return JSON.stringify(args[0], null, 2);
      } catch (e) {
        return '';
      }
    }
  });

  registry.register({
    name: 'json_compact',
    module: 'data',
    executor: (args) => {
      try {
        return JSON.stringify(args[0]);
      } catch (e) {
        return '';
      }
    }
  });

  registry.register({
    name: 'json_merge',
    module: 'data',
    executor: (args) => {
      const obj1 = args[0] || {};
      const obj2 = args[1] || {};
      if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1;
      return { ...obj1, ...obj2 };
    }
  });

  registry.register({
    name: 'json_deep_merge',
    module: 'data',
    executor: (args) => {
      const obj1 = args[0] || {};
      const obj2 = args[1] || {};

      const merge = (a, b) => {
        if (typeof a !== 'object' || typeof b !== 'object') return b;
        const result = { ...a };
        for (const key in b) {
          if (key in result && typeof result[key] === 'object' && typeof b[key] === 'object') {
            result[key] = merge(result[key], b[key]);
          } else {
            result[key] = b[key];
          }
        }
        return result;
      };

      return merge(obj1, obj2);
    }
  });

  registry.register({
    name: 'json_get_path',
    module: 'data',
    executor: (args) => {
      const obj = args[0];
      const path = String(args[1]);
      const keys = path.split('.');
      let current = obj;
      for (const key of keys) {
        if (typeof current !== 'object' || current === null) return undefined;
        current = current[key];
      }
      return current;
    }
  });

  registry.register({
    name: 'json_set_path',
    module: 'data',
    executor: (args) => {
      const obj = JSON.parse(JSON.stringify(args[0] || {}));
      const path = String(args[1]);
      const value = args[2];
      const keys = path.split('.');
      let current = obj;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current)) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return obj;
    }
  });

  registry.register({
    name: 'json_delete_path',
    module: 'data',
    executor: (args) => {
      const obj = JSON.parse(JSON.stringify(args[0] || {}));
      const path = String(args[1]);
      const keys = path.split('.');
      let current = obj;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current)) return obj;
        current = current[keys[i]];
      }
      delete current[keys[keys.length - 1]];
      return obj;
    }
  });

  registry.register({
    name: 'json_has_path',
    module: 'data',
    executor: (args) => {
      const obj = args[0];
      const path = String(args[1]);
      const keys = path.split('.');
      let current = obj;

      for (const key of keys) {
        if (typeof current !== 'object' || current === null || !(key in current)) return false;
        current = current[key];
      }
      return true;
    }
  });

  registry.register({
    name: 'json_keys',
    module: 'data',
    executor: (args) => {
      const obj = args[0];
      if (typeof obj !== 'object' || obj === null) return [];
      return Object.keys(obj);
    }
  });

  registry.register({
    name: 'json_values',
    module: 'data',
    executor: (args) => {
      const obj = args[0];
      if (typeof obj !== 'object' || obj === null) return [];
      return Object.values(obj);
    }
  });

  registry.register({
    name: 'json_entries',
    module: 'data',
    executor: (args) => {
      const obj = args[0];
      if (typeof obj !== 'object' || obj === null) return [];
      return Object.entries(obj);
    }
  });

  registry.register({
    name: 'json_filter',
    module: 'data',
    executor: (args) => {
      const obj = args[0];
      const predicate = args[1];
      if (typeof obj !== 'object' || obj === null) return obj;

      const result = {};
      for (const key in obj) {
        if (typeof predicate === 'function' ? predicate([key, obj[key]]) : true) {
          result[key] = obj[key];
        }
      }
      return result;
    }
  });

  registry.register({
    name: 'json_map',
    module: 'data',
    executor: (args) => {
      const obj = args[0];
      const mapper = args[1];
      if (typeof obj !== 'object' || obj === null) return obj;

      const result = {};
      for (const key in obj) {
        result[key] = typeof mapper === 'function' ? mapper(obj[key], key) : obj[key];
      }
      return result;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // Data Normalization (15 functions)
  // ─────────────────────────────────────────────────────────────

  registry.register({
    name: 'normalize_string',
    module: 'data',
    executor: (args) => {
      const str = String(args[0]);
      const form = args[1] ? String(args[1]) : 'NFC';
      return str.normalize(form);
    }
  });

  registry.register({
    name: 'normalize_number',
    module: 'data',
    executor: (args) => {
      const num = Number(args[0]);
      const decimals = args[1] ? Math.floor(Number(args[1])) : 2;
      return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }
  });

  registry.register({
    name: 'normalize_whitespace',
    module: 'data',
    executor: (args) => {
      const str = String(args[0]);
      return str.replace(/\s+/g, ' ').trim();
    }
  });

  registry.register({
    name: 'normalize_case',
    module: 'data',
    executor: (args) => {
      const str = String(args[0]);
      const form = args[1] ? String(args[1]).toLowerCase() : 'lower';
      if (form === 'upper') return str.toUpperCase();
      if (form === 'title') return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      if (form === 'pascal') return str.split(/[-_\s]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
      if (form === 'camel') {
        const words = str.split(/[-_\s]/);
        return words[0].toLowerCase() + words.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
      }
      return str.toLowerCase();
    }
  });

  registry.register({
    name: 'normalize_email',
    module: 'data',
    executor: (args) => {
      const email = String(args[0]).toLowerCase().trim();
      return email.replace(/\s+/g, '');
    }
  });

  registry.register({
    name: 'normalize_phone',
    module: 'data',
    executor: (args) => {
      const phone = String(args[0]);
      return phone.replace(/\D/g, '');
    }
  });

  registry.register({
    name: 'normalize_url',
    module: 'data',
    executor: (args) => {
      const url = String(args[0]);
      try {
        const u = new URL(url.startsWith('http') ? url : 'http://' + url);
        return u.href;
      } catch {
        return url.toLowerCase();
      }
    }
  });

  registry.register({
    name: 'normalize_array',
    module: 'data',
    executor: (args) => {
      const arr = Array.isArray(args[0]) ? args[0] : [args[0]];
      const operation = String(args[1] || 'dedupe');

      switch (operation.toLowerCase()) {
        case 'dedupe':
          return [...new Set(arr)];
        case 'sort':
          return [...arr].sort();
        case 'reverse':
          return [...arr].reverse();
        case 'compact':
          return arr.filter(v => v !== null && v !== undefined);
        default:
          return arr;
      }
    }
  });

  registry.register({
    name: 'normalize_range',
    module: 'data',
    executor: (args) => {
      const value = Number(args[0]);
      const min = Number(args[1] || 0);
      const max = Number(args[2] || 1);
      return (value - min) / (max - min);
    }
  });

  registry.register({
    name: 'normalize_scale',
    module: 'data',
    executor: (args) => {
      const value = Number(args[0]);
      const fromMin = Number(args[1] || 0);
      const fromMax = Number(args[2] || 100);
      const toMin = Number(args[3] || 0);
      const toMax = Number(args[4] || 1);
      const normalized = (value - fromMin) / (fromMax - fromMin);
      return toMin + normalized * (toMax - toMin);
    }
  });

  registry.register({
    name: 'normalize_percent',
    module: 'data',
    executor: (args) => {
      const value = Number(args[0]);
      const total = Number(args[1] || 100);
      return (value / total) * 100;
    }
  });

  registry.register({
    name: 'normalize_trim',
    module: 'data',
    executor: (args) => {
      const str = String(args[0]);
      const char = args[1] ? String(args[1]) : undefined;
      if (!char) return str.trim();
      const regex = new RegExp(`^[${char}]+|[${char}]+$`, 'g');
      return str.replace(regex, '');
    }
  });

  // ─────────────────────────────────────────────────────────────
  // Data Validation (15 functions)
  // ─────────────────────────────────────────────────────────────

  registry.register({
    name: 'is_email',
    module: 'data',
    executor: (args) => {
      const email = String(args[0]);
      const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return pattern.test(email);
    }
  });

  registry.register({
    name: 'is_phone',
    module: 'data',
    executor: (args) => {
      const phone = String(args[0]);
      const pattern = /^[\d\s\-\+\(\)]{10,}$/;
      return pattern.test(phone);
    }
  });

  registry.register({
    name: 'is_url',
    module: 'data',
    executor: (args) => {
      const url = String(args[0]);
      try {
        new URL(url.startsWith('http') ? url : 'http://' + url);
        return true;
      } catch {
        return false;
      }
    }
  });

  registry.register({
    name: 'is_ipv4',
    module: 'data',
    executor: (args) => {
      const ip = String(args[0]);
      const pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!pattern.test(ip)) return false;
      return ip.split('.').every(part => {
        const num = Number(part);
        return num >= 0 && num <= 255;
      });
    }
  });

  registry.register({
    name: 'is_ipv6',
    module: 'data',
    executor: (args) => {
      const ip = String(args[0]);
      const pattern = /^([\da-f]{1,4}:){7}[\da-f]{1,4}$/i;
      return pattern.test(ip);
    }
  });

  registry.register({
    name: 'is_uuid',
    module: 'data',
    executor: (args) => {
      const uuid = String(args[0]);
      const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return pattern.test(uuid);
    }
  });

  registry.register({
    name: 'is_credit_card',
    module: 'data',
    executor: (args) => {
      const cc = String(args[0]).replace(/\D/g, '');
      if (cc.length < 13 || cc.length > 19) return false;
      let sum = 0;
      for (let i = 0; i < cc.length; i++) {
        let digit = parseInt(cc[cc.length - 1 - i]);
        if (i % 2 === 1) {
          digit *= 2;
          if (digit > 9) digit -= 9;
        }
        sum += digit;
      }
      return sum % 10 === 0;
    }
  });

  registry.register({
    name: 'is_json',
    module: 'data',
    executor: (args) => {
      try {
        JSON.parse(String(args[0]));
        return true;
      } catch {
        return false;
      }
    }
  });

  registry.register({
    name: 'is_numeric',
    module: 'data',
    executor: (args) => {
      const value = args[0];
      if (typeof value === 'number') return !isNaN(value);
      const str = String(value).trim();
      return str !== '' && !isNaN(Number(str));
    }
  });

  registry.register({
    name: 'is_alpha',
    module: 'data',
    executor: (args) => {
      const str = String(args[0]);
      return /^[a-zA-Z]+$/.test(str);
    }
  });

  registry.register({
    name: 'is_alphanumeric',
    module: 'data',
    executor: (args) => {
      const str = String(args[0]);
      return /^[a-zA-Z0-9]+$/.test(str);
    }
  });

  registry.register({
    name: 'validate_length',
    module: 'data',
    executor: (args) => {
      const value = args[0];
      const minLen = args[1] ? Number(args[1]) : 0;
      const maxLen = args[2] ? Number(args[2]) : Infinity;
      const len = String(value).length;
      return len >= minLen && len <= maxLen;
    }
  });

  registry.register({
    name: 'validate_range',
    module: 'data',
    executor: (args) => {
      const value = Number(args[0]);
      const min = Number(args[1]);
      const max = Number(args[2]);
      return value >= min && value <= max;
    }
  });

  registry.register({
    name: 'validate_pattern',
    module: 'data',
    executor: (args) => {
      const value = String(args[0]);
      const pattern = String(args[1]);
      try {
        const regex = new RegExp(pattern);
        return regex.test(value);
      } catch {
        return false;
      }
    }
  });

  registry.register({
    name: 'validate_required',
    module: 'data',
    executor: (args) => {
      const value = args[0];
      if (value === null || value === undefined) return false;
      const str = String(value).trim();
      return str.length > 0;
    }
  });
}
