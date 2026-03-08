import { NativeFunctionRegistry } from './vm/native-function-registry';

/**
 * String Extended Library - 120+ functions for advanced string/text operations
 * Categories: String Advanced (35) + Regex Advanced (25) + i18n (25) + Encoding (20) + Text Analysis (15)
 */

export function registerStringExtendedFunctions(registry: NativeFunctionRegistry): void {
  // ==================== STRING ADVANCED (35 functions) ====================

  registry.register({
    name: 'str_format',
    module: 'string',
    executor: (args) => {
      const template = String(args[0]);
      const values = args.slice(1);
      return template.replace(/\{(\d+)\}/g, (_, index) =>
        String(values[parseInt(index)] ?? '')
      );
    }
  });

  registry.register({
    name: 'str_template',
    module: 'string',
    executor: (args) => {
      const template = String(args[0]);
      const obj = args[1] as Record<string, any>;
      return template.replace(/\{([^}]+)\}/g, (_, key) =>
        String(obj[key] ?? '')
      );
    }
  });

  registry.register({
    name: 'str_interpolate',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      const context = args[1] as Record<string, any>;
      return str.replace(/\$\{([^}]+)\}/g, (_, expr) => {
        try {
          return String(eval(`(function() { return ${expr}; }).call(context)`) ?? '');
        } catch {
          return '';
        }
      });
    }
  });

  registry.register({
    name: 'str_escape',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      const type = String(args[1] ?? 'html');

      const escapes: Record<string, Record<string, string>> = {
        html: { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' },
        xml: { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' },
        json: { '"': '\\"', '\\': '\\\\', '\b': '\\b', '\f': '\\f', '\n': '\\n', '\r': '\\r', '\t': '\\t' },
        csv: { '"': '""' },
        url: {},
        regex: {}
      };

      if (type === 'url') {
        return encodeURIComponent(str);
      }
      if (type === 'regex') {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }

      const map = escapes[type] || escapes.html;
      return str.replace(/./g, c => map[c] || c);
    }
  });

  registry.register({
    name: 'str_unescape',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      const type = String(args[1] ?? 'html');

      const unescapes: Record<string, Record<string, string>> = {
        html: { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" },
        xml: { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" },
        json: { '\\"': '"', '\\\\': '\\', '\\b': '\b', '\\f': '\f', '\\n': '\n', '\\r': '\r', '\\t': '\t' },
        csv: { '""': '"' }
      };

      if (type === 'url') {
        return decodeURIComponent(str);
      }

      const map = unescapes[type] || unescapes.html;
      let result = str;
      for (const [esc, unesc] of Object.entries(map)) {
        result = result.replace(new RegExp(esc, 'g'), unesc);
      }
      return result;
    }
  });

  registry.register({
    name: 'str_normalize',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      const form = String(args[1] ?? 'NFC') as any;
      return str.normalize(form);
    }
  });

  registry.register({
    name: 'str_slug',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
  });

  registry.register({
    name: 'str_camel_case',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      return str
        .replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => {
          if (+match === 0 || /\s+/.test(match)) return '';
          return index === 0 ? match.toLowerCase() : match.toUpperCase();
        });
    }
  });

  registry.register({
    name: 'str_pascal_case',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      return str
        .replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match) => {
          if (/\s+/.test(match)) return '';
          return match.toUpperCase();
        });
    }
  });

  registry.register({
    name: 'str_snake_case',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      return str
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toLowerCase();
    }
  });

  registry.register({
    name: 'str_kebab_case',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
    }
  });

  registry.register({
    name: 'str_constant_case',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      return str
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toUpperCase();
    }
  });

  registry.register({
    name: 'str_title_case',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      return str.replace(/\b\w/g, c => c.toUpperCase());
    }
  });

  registry.register({
    name: 'str_capitalize',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      return str.charAt(0).toUpperCase() + str.slice(1);
    }
  });

  registry.register({
    name: 'str_uncapitalize',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      return str.charAt(0).toLowerCase() + str.slice(1);
    }
  });

  registry.register({
    name: 'str_is_ascii',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      return /^[\x00-\x7F]*$/.test(str);
    }
  });

  registry.register({
    name: 'str_is_alpha',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      return /^[a-zA-Z]+$/.test(str);
    }
  });

  registry.register({
    name: 'str_is_digit',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      return /^\d+$/.test(str);
    }
  });

  registry.register({
    name: 'str_is_alnum',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      return /^[a-zA-Z0-9]+$/.test(str);
    }
  });

  registry.register({
    name: 'str_is_space',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      return /^\s+$/.test(str);
    }
  });

  registry.register({
    name: 'str_is_upper',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      return str === str.toUpperCase() && /[a-z]/i.test(str);
    }
  });

  registry.register({
    name: 'str_is_lower',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      return str === str.toLowerCase() && /[a-z]/i.test(str);
    }
  });

  registry.register({
    name: 'str_is_email',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
    }
  });

  registry.register({
    name: 'str_is_url',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      try {
        new URL(str);
        return true;
      } catch {
        return false;
      }
    }
  });

  registry.register({
    name: 'str_is_uuid',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    }
  });

  registry.register({
    name: 'str_is_ip',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      return /^(\d{1,3}\.){3}\d{1,3}$/.test(str) &&
             str.split('.').every(n => parseInt(n) <= 255);
    }
  });

  registry.register({
    name: 'str_is_ipv6',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      return /^([\da-f]{1,4}:){7}[\da-f]{1,4}$|^::([\da-f]{1,4}:){0,6}[\da-f]{1,4}$/i.test(str);
    }
  });

  registry.register({
    name: 'str_count',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      const needle = String(args[1]);
      if (!needle) return 0;
      return str.split(needle).length - 1;
    }
  });

  registry.register({
    name: 'str_count_occurrences',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      const pattern = String(args[1]);
      const flags = String(args[2] ?? 'g');
      try {
        const regex = new RegExp(pattern, flags);
        const matches = str.match(regex);
        return matches ? matches.length : 0;
      } catch {
        return 0;
      }
    }
  });

  registry.register({
    name: 'str_extract',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      const pattern = String(args[1]);
      try {
        const match = str.match(new RegExp(pattern));
        return match ? match[0] : '';
      } catch {
        return '';
      }
    }
  });

  registry.register({
    name: 'str_between',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      const start = String(args[1]);
      const end = String(args[2]);
      const startIndex = str.indexOf(start);
      if (startIndex === -1) return '';
      const contentStart = startIndex + start.length;
      const endIndex = str.indexOf(end, contentStart);
      if (endIndex === -1) return str.slice(contentStart);
      return str.slice(contentStart, endIndex);
    }
  });

  registry.register({
    name: 'str_before',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      const delimiter = String(args[1]);
      const index = str.indexOf(delimiter);
      return index === -1 ? str : str.slice(0, index);
    }
  });

  registry.register({
    name: 'str_after',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      const delimiter = String(args[1]);
      const index = str.indexOf(delimiter);
      return index === -1 ? '' : str.slice(index + delimiter.length);
    }
  });

  registry.register({
    name: 'str_char_at',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      const index = Math.floor(Number(args[1]));
      return str.charAt(index);
    }
  });

  registry.register({
    name: 'str_code_at',
    module: 'string',
    executor: (args) => {
      const str = String(args[0]);
      const index = Math.floor(Number(args[1]));
      return str.charCodeAt(index);
    }
  });

  // ==================== REGEX ADVANCED (25 functions) ====================

  registry.register({
    name: 'regex_flags',
    module: 'regex',
    executor: (args) => {
      const pattern = String(args[0]);
      const flags = String(args[1] ?? '');
      try {
        new RegExp(pattern, flags);
        return flags;
      } catch {
        return '';
      }
    }
  });

  registry.register({
    name: 'regex_named_groups',
    module: 'regex',
    executor: (args) => {
      const str = String(args[0]);
      const pattern = String(args[1]);
      try {
        const regex = new RegExp(pattern, 'd');
        const match = str.match(regex);
        if (!match || !match.groups) return {};
        return match.groups;
      } catch {
        return {};
      }
    }
  });

  registry.register({
    name: 'regex_global',
    module: 'regex',
    executor: (args) => {
      const str = String(args[0]);
      const pattern = String(args[1]);
      try {
        const regex = new RegExp(pattern, 'g');
        return str.match(regex) || [];
      } catch {
        return [];
      }
    }
  });

  registry.register({
    name: 'regex_multiline',
    module: 'regex',
    executor: (args) => {
      const str = String(args[0]);
      const pattern = String(args[1]);
      try {
        const regex = new RegExp(pattern, 'gm');
        return str.match(regex) || [];
      } catch {
        return [];
      }
    }
  });

  registry.register({
    name: 'regex_sticky',
    module: 'regex',
    executor: (args) => {
      const str = String(args[0]);
      const pattern = String(args[1]);
      try {
        const regex = new RegExp(pattern, 'gy');
        return str.match(regex) || [];
      } catch {
        return [];
      }
    }
  });

  registry.register({
    name: 'regex_unicode',
    module: 'regex',
    executor: (args) => {
      const str = String(args[0]);
      const pattern = String(args[1]);
      try {
        const regex = new RegExp(pattern, 'gu');
        return str.match(regex) || [];
      } catch {
        return [];
      }
    }
  });

  registry.register({
    name: 'regex_match_all',
    module: 'regex',
    executor: (args) => {
      const str = String(args[0]);
      const pattern = String(args[1]);
      try {
        const regex = new RegExp(pattern, 'g');
        const matches = [];
        let match;
        while ((match = regex.exec(str)) !== null) {
          matches.push({
            text: match[0],
            index: match.index,
            groups: match.slice(1)
          });
        }
        return matches;
      } catch {
        return [];
      }
    }
  });

  registry.register({
    name: 'regex_index',
    module: 'regex',
    executor: (args) => {
      const str = String(args[0]);
      const pattern = String(args[1]);
      try {
        const match = str.match(new RegExp(pattern));
        return match ? str.indexOf(match[0]) : -1;
      } catch {
        return -1;
      }
    }
  });

  registry.register({
    name: 'regex_input',
    module: 'regex',
    executor: (args) => {
      const str = String(args[0]);
      return str;
    }
  });

  registry.register({
    name: 'regex_groups',
    module: 'regex',
    executor: (args) => {
      const str = String(args[0]);
      const pattern = String(args[1]);
      try {
        const match = str.match(new RegExp(pattern));
        return match ? match.slice(1) : [];
      } catch {
        return [];
      }
    }
  });

  registry.register({
    name: 'regex_replace_all',
    module: 'regex',
    executor: (args) => {
      const str = String(args[0]);
      const pattern = String(args[1]);
      const replacement = String(args[2]);
      try {
        const regex = new RegExp(pattern, 'g');
        return str.replace(regex, replacement);
      } catch {
        return str;
      }
    }
  });

  registry.register({
    name: 'regex_replace_fn',
    module: 'regex',
    executor: (args) => {
      const str = String(args[0]);
      const pattern = String(args[1]);
      const fn = args[2] as Function;
      try {
        const regex = new RegExp(pattern, 'g');
        return str.replace(regex, (...m) => String(fn(m[0])));
      } catch {
        return str;
      }
    }
  });

  registry.register({
    name: 'regex_split_with_sep',
    module: 'regex',
    executor: (args) => {
      const str = String(args[0]);
      const pattern = String(args[1]);
      try {
        return str.split(new RegExp(`(${pattern})`, 'g'));
      } catch {
        return [str];
      }
    }
  });

  registry.register({
    name: 'regex_is_valid',
    module: 'regex',
    executor: (args) => {
      const pattern = String(args[0]);
      try {
        new RegExp(pattern);
        return true;
      } catch {
        return false;
      }
    }
  });

  registry.register({
    name: 'regex_escape',
    module: 'regex',
    executor: (args) => {
      const str = String(args[0]);
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  });

  registry.register({
    name: 'regex_anchor',
    module: 'regex',
    executor: (args) => {
      const pattern = String(args[0]);
      const anchor = String(args[1] ?? 'both');
      if (anchor === 'start') return `^${pattern}`;
      if (anchor === 'end') return `${pattern}$`;
      return `^${pattern}$`;
    }
  });

  registry.register({
    name: 'regex_word_boundary',
    module: 'regex',
    executor: (args) => {
      const pattern = String(args[0]);
      return `\\b${pattern}\\b`;
    }
  });

  registry.register({
    name: 'regex_lookahead',
    module: 'regex',
    executor: (args) => {
      const pattern = String(args[0]);
      return `(?=${pattern})`;
    }
  });

  registry.register({
    name: 'regex_lookbehind',
    module: 'regex',
    executor: (args) => {
      const pattern = String(args[0]);
      return `(?<=${pattern})`;
    }
  });

  registry.register({
    name: 'regex_positive_lookahead',
    module: 'regex',
    executor: (args) => {
      const str = String(args[0]);
      const pattern = String(args[1]);
      try {
        const regex = new RegExp(`(?=${pattern})`);
        return regex.test(str);
      } catch {
        return false;
      }
    }
  });

  registry.register({
    name: 'regex_negative_lookahead',
    module: 'regex',
    executor: (args) => {
      const str = String(args[0]);
      const pattern = String(args[1]);
      try {
        const regex = new RegExp(`(?!${pattern})`);
        return regex.test(str);
      } catch {
        return false;
      }
    }
  });

  registry.register({
    name: 'regex_quantifier',
    module: 'regex',
    executor: (args) => {
      const pattern = String(args[0]);
      const min = Math.floor(Number(args[1]));
      const max = Math.floor(Number(args[2] ?? min));
      if (min === max) return `${pattern}{${min}}`;
      if (max === Infinity) return `${pattern}{${min},}`;
      return `${pattern}{${min},${max}}`;
    }
  });

  registry.register({
    name: 'regex_alternation',
    module: 'regex',
    executor: (args) => {
      const patterns = args.map(a => String(a));
      return `(${patterns.join('|')})`;
    }
  });

  registry.register({
    name: 'regex_char_class',
    module: 'regex',
    executor: (args) => {
      const chars = String(args[0]);
      const negate = Boolean(args[1]);
      return negate ? `[^${chars}]` : `[${chars}]`;
    }
  });

  registry.register({
    name: 'regex_compile',
    module: 'regex',
    executor: (args) => {
      const pattern = String(args[0]);
      const flags = String(args[1] ?? '');
      try {
        return new RegExp(pattern, flags);
      } catch {
        return null;
      }
    }
  });

  // ==================== i18n (25 functions) ====================

  registry.register({
    name: 'i18n_format_number',
    module: 'i18n',
    executor: (args) => {
      const num = Number(args[0]);
      const locale = String(args[1] ?? 'en-US');
      try {
        return new Intl.NumberFormat(locale).format(num);
      } catch {
        return String(num);
      }
    }
  });

  registry.register({
    name: 'i18n_format_currency',
    module: 'i18n',
    executor: (args) => {
      const num = Number(args[0]);
      const currency = String(args[1] ?? 'USD');
      const locale = String(args[2] ?? 'en-US');
      try {
        return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(num);
      } catch {
        return String(num);
      }
    }
  });

  registry.register({
    name: 'i18n_format_date',
    module: 'i18n',
    executor: (args) => {
      const date = new Date(args[0]);
      const locale = String(args[1] ?? 'en-US');
      try {
        return new Intl.DateTimeFormat(locale).format(date);
      } catch {
        return date.toString();
      }
    }
  });

  registry.register({
    name: 'i18n_format_time',
    module: 'i18n',
    executor: (args) => {
      const date = new Date(args[0]);
      const locale = String(args[1] ?? 'en-US');
      try {
        return new Intl.DateTimeFormat(locale, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }).format(date);
      } catch {
        return date.toTimeString();
      }
    }
  });

  registry.register({
    name: 'i18n_format_datetime',
    module: 'i18n',
    executor: (args) => {
      const date = new Date(args[0]);
      const locale = String(args[1] ?? 'en-US');
      try {
        return new Intl.DateTimeFormat(locale, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }).format(date);
      } catch {
        return date.toString();
      }
    }
  });

  registry.register({
    name: 'i18n_format_relative',
    module: 'i18n',
    executor: (args) => {
      const date = new Date(args[0]);
      const locale = String(args[1] ?? 'en-US');
      const now = Date.now();
      const diff = now - date.getTime();
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
      if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
      if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
      return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
    }
  });

  registry.register({
    name: 'i18n_format_unit',
    module: 'i18n',
    executor: (args) => {
      const value = Number(args[0]);
      const unit = String(args[1] ?? 'kilometer');
      const locale = String(args[2] ?? 'en-US');
      try {
        return new Intl.NumberFormat(locale, {
          style: 'unit',
          unit
        }).format(value);
      } catch {
        return String(value);
      }
    }
  });

  registry.register({
    name: 'i18n_plural',
    module: 'i18n',
    executor: (args) => {
      const num = Number(args[0]);
      const locale = String(args[1] ?? 'en-US');
      try {
        const pr = new Intl.PluralRules(locale);
        return pr.select(num);
      } catch {
        return num === 1 ? 'one' : 'other';
      }
    }
  });

  registry.register({
    name: 'i18n_ordinal',
    module: 'i18n',
    executor: (args) => {
      const num = Math.floor(Number(args[0]));
      const locale = String(args[1] ?? 'en-US');
      try {
        const pr = new Intl.PluralRules(locale, { type: 'ordinal' });
        const rule = pr.select(num);
        const suffixes: Record<string, string> = {
          one: 'st',
          two: 'nd',
          few: 'rd',
          other: 'th'
        };
        return `${num}${suffixes[rule] || 'th'}`;
      } catch {
        return String(num);
      }
    }
  });

  registry.register({
    name: 'i18n_collate',
    module: 'i18n',
    executor: (args) => {
      const a = String(args[0]);
      const b = String(args[1]);
      const locale = String(args[2] ?? 'en-US');
      try {
        return new Intl.Collator(locale).compare(a, b);
      } catch {
        return a.localeCompare(b);
      }
    }
  });

  registry.register({
    name: 'i18n_locale_info',
    module: 'i18n',
    executor: (args) => {
      const locale = String(args[0]);
      try {
        const display = new Intl.DisplayNames([locale], { type: 'language' });
        return { locale, displayName: display.of(locale) };
      } catch {
        return { locale, displayName: locale };
      }
    }
  });

  registry.register({
    name: 'i18n_currency_symbol',
    module: 'i18n',
    executor: (args) => {
      const currency = String(args[0] ?? 'USD');
      try {
        const nf = new Intl.NumberFormat('en-US', { style: 'currency', currency });
        const parts = nf.formatToParts(1);
        const symbol = parts.find(p => p.type === 'currency')?.value || currency;
        return symbol;
      } catch {
        return currency;
      }
    }
  });

  registry.register({
    name: 'i18n_decimal_sep',
    module: 'i18n',
    executor: (args) => {
      const locale = String(args[0] ?? 'en-US');
      try {
        const nf = new Intl.NumberFormat(locale);
        const parts = nf.formatToParts(1.1);
        const decimal = parts.find(p => p.type === 'decimal')?.value || '.';
        return decimal;
      } catch {
        return '.';
      }
    }
  });

  registry.register({
    name: 'i18n_thousands_sep',
    module: 'i18n',
    executor: (args) => {
      const locale = String(args[0] ?? 'en-US');
      try {
        const nf = new Intl.NumberFormat(locale);
        const parts = nf.formatToParts(1000);
        const thousands = parts.find(p => p.type === 'group')?.value || ',';
        return thousands;
      } catch {
        return ',';
      }
    }
  });

  registry.register({
    name: 'i18n_timezone',
    module: 'i18n',
    executor: (args) => {
      const date = new Date(args[0] ?? Date.now());
      const offset = -date.getTimezoneOffset();
      const hours = Math.floor(Math.abs(offset) / 60);
      const minutes = Math.abs(offset) % 60;
      const sign = offset >= 0 ? '+' : '-';
      return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  });

  registry.register({
    name: 'i18n_direction',
    module: 'i18n',
    executor: (args) => {
      const locale = String(args[0] ?? 'en-US');
      const rtlLanguages = ['ar', 'he', 'fa', 'ur', 'yi'];
      const lang = locale.split('-')[0].toLowerCase();
      return rtlLanguages.includes(lang) ? 'rtl' : 'ltr';
    }
  });

  registry.register({
    name: 'char_to_unicode',
    module: 'i18n',
    executor: (args) => {
      const str = String(args[0]);
      if (!str) return 0;
      return str.charCodeAt(0);
    }
  });

  registry.register({
    name: 'unicode_to_char',
    module: 'i18n',
    executor: (args) => {
      const code = Math.floor(Number(args[0]));
      return String.fromCharCode(code);
    }
  });

  registry.register({
    name: 'unicode_category',
    module: 'i18n',
    executor: (args) => {
      const char = String(args[0]);
      if (!char) return 'Cc';
      if (/[a-z]/.test(char)) return 'Ll';
      if (/[A-Z]/.test(char)) return 'Lu';
      if (/\d/.test(char)) return 'Nd';
      if (/\s/.test(char)) return 'Zs';
      return 'Po';
    }
  });

  registry.register({
    name: 'unicode_name',
    module: 'i18n',
    executor: (args) => {
      const char = String(args[0]);
      const code = char.charCodeAt(0);
      const names: Record<number, string> = {
        32: 'SPACE',
        45: 'HYPHEN-MINUS',
        48: 'DIGIT ZERO',
        65: 'LATIN CAPITAL LETTER A',
        97: 'LATIN SMALL LETTER A'
      };
      return names[code] || `U+${code.toString(16).toUpperCase().padStart(4, '0')}`;
    }
  });

  registry.register({
    name: 'unicode_normalize_nfc',
    module: 'i18n',
    executor: (args) => {
      return String(args[0]).normalize('NFC');
    }
  });

  registry.register({
    name: 'unicode_normalize_nfd',
    module: 'i18n',
    executor: (args) => {
      return String(args[0]).normalize('NFD');
    }
  });

  registry.register({
    name: 'unicode_normalize_nfkc',
    module: 'i18n',
    executor: (args) => {
      return String(args[0]).normalize('NFKC');
    }
  });

  registry.register({
    name: 'unicode_normalize_nfkd',
    module: 'i18n',
    executor: (args) => {
      return String(args[0]).normalize('NFKD');
    }
  });

  registry.register({
    name: 'unicode_is_printable',
    module: 'i18n',
    executor: (args) => {
      const char = String(args[0]);
      const code = char.charCodeAt(0);
      return code >= 32 && code !== 127;
    }
  });

  // ==================== ENCODING EXTENDED (20 functions) ====================

  registry.register({
    name: 'charset_encode',
    module: 'encoding',
    executor: (args) => {
      const str = String(args[0]);
      const charset = String(args[1] ?? 'utf-8');
      // Simplified - JavaScript uses UTF-16 internally
      if (charset === 'utf-8' || charset === 'utf8') {
        return str;
      }
      return str;
    }
  });

  registry.register({
    name: 'charset_decode',
    module: 'encoding',
    executor: (args) => {
      const str = String(args[0]);
      const charset = String(args[1] ?? 'utf-8');
      return str;
    }
  });

  registry.register({
    name: 'utf8_encode',
    module: 'encoding',
    executor: (args) => {
      const str = String(args[0]);
      return Buffer.from(str, 'utf-8').toString('utf-8');
    }
  });

  registry.register({
    name: 'utf8_decode',
    module: 'encoding',
    executor: (args) => {
      const str = String(args[0]);
      return Buffer.from(str, 'utf-8').toString('utf-8');
    }
  });

  registry.register({
    name: 'utf16_encode',
    module: 'encoding',
    executor: (args) => {
      const str = String(args[0]);
      return Buffer.from(str, 'utf-16le').toString('hex');
    }
  });

  registry.register({
    name: 'utf16_decode',
    module: 'encoding',
    executor: (args) => {
      const str = String(args[0]);
      return Buffer.from(str, 'hex').toString('utf-16le');
    }
  });

  registry.register({
    name: 'latin1_encode',
    module: 'encoding',
    executor: (args) => {
      const str = String(args[0]);
      return Buffer.from(str, 'latin1').toString('latin1');
    }
  });

  registry.register({
    name: 'latin1_decode',
    module: 'encoding',
    executor: (args) => {
      const str = String(args[0]);
      return Buffer.from(str, 'latin1').toString('latin1');
    }
  });

  registry.register({
    name: 'hex_encode',
    module: 'encoding',
    executor: (args) => {
      const str = String(args[0]);
      return Buffer.from(str, 'utf-8').toString('hex');
    }
  });

  registry.register({
    name: 'hex_decode',
    module: 'encoding',
    executor: (args) => {
      const str = String(args[0]);
      return Buffer.from(str, 'hex').toString('utf-8');
    }
  });

  registry.register({
    name: 'base32_encode',
    module: 'encoding',
    executor: (args) => {
      const str = String(args[0]);
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
      const bytes = Buffer.from(str, 'utf-8');
      let result = '';
      for (let i = 0; i < bytes.length; i += 5) {
        const chunk = bytes.slice(i, i + 5);
        let bits = 0;
        for (let j = 0; j < chunk.length; j++) {
          bits = (bits << 8) | chunk[j];
        }
        bits <<= (5 - chunk.length) * 8;
        for (let j = 0; j < Math.ceil(chunk.length * 8 / 5); j++) {
          result += alphabet[(bits >> (32 - (j + 1) * 5)) & 31];
        }
      }
      return result;
    }
  });

  registry.register({
    name: 'base32_decode',
    module: 'encoding',
    executor: (args) => {
      const str = String(args[0]);
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
      let bits = 0;
      let value = 0;
      const result: number[] = [];

      for (let i = 0; i < str.length; i++) {
        const c = str[i];
        const d = alphabet.indexOf(c.toUpperCase());
        if (d === -1) continue;
        bits += 5;
        value = (value << 5) | d;
        if (bits >= 8) {
          bits -= 8;
          result.push((value >> bits) & 255);
        }
      }
      return Buffer.from(result).toString('utf-8');
    }
  });

  registry.register({
    name: 'base64url_encode',
    module: 'encoding',
    executor: (args) => {
      const str = String(args[0]);
      return Buffer.from(str, 'utf-8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }
  });

  registry.register({
    name: 'base64url_decode',
    module: 'encoding',
    executor: (args) => {
      let str = String(args[0]);
      str = str.replace(/-/g, '+').replace(/_/g, '/');
      while (str.length % 4) str += '=';
      return Buffer.from(str, 'base64').toString('utf-8');
    }
  });

  registry.register({
    name: 'percent_encode',
    module: 'encoding',
    executor: (args) => {
      return encodeURIComponent(String(args[0]));
    }
  });

  registry.register({
    name: 'percent_decode',
    module: 'encoding',
    executor: (args) => {
      return decodeURIComponent(String(args[0]));
    }
  });

  registry.register({
    name: 'html_encode',
    module: 'encoding',
    executor: (args) => {
      const str = String(args[0]);
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  });

  registry.register({
    name: 'html_decode',
    module: 'encoding',
    executor: (args) => {
      const str = String(args[0]);
      const map: Record<string, string> = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&apos;': "'"
      };
      return str.replace(/&[a-z]+;/gi, m => map[m] || m);
    }
  });

  registry.register({
    name: 'punycode_encode',
    module: 'encoding',
    executor: (args) => {
      const str = String(args[0]);
      try {
        return require('punycode/').encode(str);
      } catch {
        return str;
      }
    }
  });

  registry.register({
    name: 'punycode_decode',
    module: 'encoding',
    executor: (args) => {
      const str = String(args[0]);
      try {
        return require('punycode/').decode(str);
      } catch {
        return str;
      }
    }
  });

  // ==================== TEXT ANALYSIS (15 functions) ====================

  registry.register({
    name: 'text_word_count',
    module: 'text_analysis',
    executor: (args) => {
      const str = String(args[0]);
      return str.trim().split(/\s+/).filter(w => w.length > 0).length;
    }
  });

  registry.register({
    name: 'text_char_count',
    module: 'text_analysis',
    executor: (args) => {
      return String(args[0]).length;
    }
  });

  registry.register({
    name: 'text_line_count',
    module: 'text_analysis',
    executor: (args) => {
      const str = String(args[0]);
      return str.split('\n').length;
    }
  });

  registry.register({
    name: 'text_sentence_count',
    module: 'text_analysis',
    executor: (args) => {
      const str = String(args[0]);
      return str.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    }
  });

  registry.register({
    name: 'text_readability',
    module: 'text_analysis',
    executor: (args) => {
      const str = String(args[0]);
      const words = str.split(/\s+/).length;
      const sentences = str.split(/[.!?]+/).length;
      const syllables = (str.match(/[aeiouy]/gi) || []).length;

      if (words === 0 || sentences === 0) return 0;

      const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
      return Math.max(0, Math.min(100, score));
    }
  });

  registry.register({
    name: 'text_similarity',
    module: 'text_analysis',
    executor: (args) => {
      const a = String(args[0]).toLowerCase();
      const b = String(args[1]).toLowerCase();

      const setA = new Set(a.split(''));
      const setB = new Set(b.split(''));
      const intersection = new Set([...setA].filter(x => setB.has(x)));
      const union = new Set([...setA, ...setB]);

      return union.size === 0 ? 0 : intersection.size / union.size;
    }
  });

  registry.register({
    name: 'text_levenshtein',
    module: 'text_analysis',
    executor: (args) => {
      const a = String(args[0]);
      const b = String(args[1]);
      const matrix: number[][] = [];

      for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
      }
      for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
      }

      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          if (b[i - 1] === a[j - 1]) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }

      return matrix[b.length][a.length];
    }
  });

  registry.register({
    name: 'text_jaro_winkler',
    module: 'text_analysis',
    executor: (args) => {
      const a = String(args[0]).toLowerCase();
      const b = String(args[1]).toLowerCase();

      const maxLen = Math.max(a.length, b.length);
      const matchDist = Math.floor(maxLen / 2) - 1;

      const aMatches: boolean[] = new Array(a.length);
      const bMatches: boolean[] = new Array(b.length);

      let matches = 0;
      let transpositions = 0;

      for (let i = 0; i < a.length; i++) {
        const start = Math.max(0, i - matchDist);
        const end = Math.min(i + matchDist + 1, b.length);

        for (let j = start; j < end; j++) {
          if (bMatches[j] || a[i] !== b[j]) continue;
          aMatches[i] = true;
          bMatches[j] = true;
          matches++;
          break;
        }
      }

      if (matches === 0) return 0;

      let k = 0;
      for (let i = 0; i < a.length; i++) {
        if (!aMatches[i]) continue;
        while (!bMatches[k]) k++;
        if (a[i] !== b[k]) transpositions++;
        k++;
      }

      const jaro = (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;

      let prefix = 0;
      for (let i = 0; i < Math.min(4, Math.min(a.length, b.length)); i++) {
        if (a[i] === b[i]) prefix++;
        else break;
      }

      return jaro + prefix * 0.1 * (1 - jaro);
    }
  });

  registry.register({
    name: 'text_hamming',
    module: 'text_analysis',
    executor: (args) => {
      const a = String(args[0]);
      const b = String(args[1]);

      if (a.length !== b.length) return -1;

      let distance = 0;
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) distance++;
      }
      return distance;
    }
  });

  registry.register({
    name: 'text_lcs',
    module: 'text_analysis',
    executor: (args) => {
      const a = String(args[0]);
      const b = String(args[1]);
      const m = a.length;
      const n = b.length;

      const dp = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));

      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          if (a[i - 1] === b[j - 1]) {
            dp[i][j] = dp[i - 1][j - 1] + 1;
          } else {
            dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
          }
        }
      }

      return dp[m][n];
    }
  });

  registry.register({
    name: 'text_diff',
    module: 'text_analysis',
    executor: (args) => {
      const a = String(args[0]).split('\n');
      const b = String(args[1]).split('\n');
      const diff = [];

      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if (i >= a.length) {
          diff.push(`+ ${b[i]}`);
        } else if (i >= b.length) {
          diff.push(`- ${a[i]}`);
        } else if (a[i] !== b[i]) {
          diff.push(`- ${a[i]}`);
          diff.push(`+ ${b[i]}`);
        } else {
          diff.push(`  ${a[i]}`);
        }
      }

      return diff.join('\n');
    }
  });

  registry.register({
    name: 'text_patch',
    module: 'text_analysis',
    executor: (args) => {
      const text = String(args[0]);
      const patch = String(args[1]);
      let result = text;

      const lines = patch.split('\n');
      for (const line of lines) {
        if (line.startsWith('- ')) {
          result = result.replace(line.slice(2), '');
        } else if (line.startsWith('+ ')) {
          result += '\n' + line.slice(2);
        }
      }

      return result;
    }
  });

  registry.register({
    name: 'text_tokenize',
    module: 'text_analysis',
    executor: (args) => {
      const str = String(args[0]);
      return str.match(/\b\w+\b/g) || [];
    }
  });

  registry.register({
    name: 'text_ngram',
    module: 'text_analysis',
    executor: (args) => {
      const str = String(args[0]);
      const n = Math.floor(Number(args[1] ?? 2));
      const words = str.split(/\s+/);
      const ngrams = [];

      for (let i = 0; i <= words.length - n; i++) {
        ngrams.push(words.slice(i, i + n).join(' '));
      }

      return ngrams;
    }
  });

  registry.register({
    name: 'text_tfidf',
    module: 'text_analysis',
    executor: (args) => {
      const term = String(args[0]);
      const doc = String(args[1]);
      const corpus = args[2] as string[];

      // TF (Term Frequency)
      const docWords = doc.toLowerCase().split(/\s+/);
      const termCount = docWords.filter(w => w === term.toLowerCase()).length;
      const tf = termCount / docWords.length;

      // IDF (Inverse Document Frequency)
      const docsWithTerm = corpus.filter(d =>
        d.toLowerCase().split(/\s+/).includes(term.toLowerCase())
      ).length;
      const idf = Math.log(corpus.length / (docsWithTerm || 1));

      return tf * idf;
    }
  });
}
