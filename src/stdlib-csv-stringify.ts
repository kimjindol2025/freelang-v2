/**
 * FreeLang v2 - csv-stringify 네이티브 함수
 *
 * npm csv-stringify 패키지 완전 대체
 * 배열/객체 → CSV 변환 구현
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

function escapeCell(value: any, quote: string, quoted: boolean, quotedEmpty: boolean): string {
  const str = value === null || value === undefined ? '' : String(value);
  const needsQuoting =
    quoted ||
    (quotedEmpty && str === '') ||
    str.includes(',') ||
    str.includes(quote) ||
    str.includes('\n') ||
    str.includes('\r');

  if (needsQuoting) {
    return quote + str.replace(new RegExp(quote, 'g'), quote + quote) + quote;
  }
  return str;
}

function rowToString(row: any[], delimiter: string, quote: string, quoted: boolean, quotedEmpty: boolean): string {
  return row.map((cell) => escapeCell(cell, quote, quoted, quotedEmpty)).join(delimiter);
}

export function registerCsvStringifyFunctions(registry: NativeFunctionRegistry): void {
  // csv_stringify(data, delimiter, quote, header, columns, quoted, quotedEmpty, recordDelimiter) -> string
  registry.register({
    name: 'csv_stringify',
    module: 'csv-stringify',
    executor: (args: any[]) => {
      const data = Array.isArray(args[0]) ? args[0] : [];
      const delimiter = String(args[1] || ',');
      const quote = String(args[2] || '"');
      const quoted = Boolean(args[5]);
      const quotedEmpty = Boolean(args[6]);
      const recordDelimiter = String(args[7] || '\n');

      const lines: string[] = [];
      for (const row of data) {
        if (Array.isArray(row)) {
          lines.push(rowToString(row, delimiter, quote, quoted, quotedEmpty));
        } else if (typeof row === 'object' && row !== null) {
          const values = Object.values(row);
          lines.push(rowToString(values, delimiter, quote, quoted, quotedEmpty));
        }
      }
      return lines.join(recordDelimiter);
    }
  });

  // csv_stringify_row(row, delimiter, quote, quoted) -> string
  registry.register({
    name: 'csv_stringify_row',
    module: 'csv-stringify',
    executor: (args: any[]) => {
      const row = Array.isArray(args[0]) ? args[0] : [];
      const delimiter = String(args[1] || ',');
      const quote = String(args[2] || '"');
      const quoted = Boolean(args[3]);
      return rowToString(row, delimiter, quote, quoted, false);
    }
  });

  // csv_stringify_with_header(headers, data, delimiter, quote) -> string
  registry.register({
    name: 'csv_stringify_with_header',
    module: 'csv-stringify',
    executor: (args: any[]) => {
      const headers = Array.isArray(args[0]) ? args[0] : [];
      const data = Array.isArray(args[1]) ? args[1] : [];
      const delimiter = String(args[2] || ',');
      const quote = String(args[3] || '"');

      const lines: string[] = [];
      lines.push(rowToString(headers, delimiter, quote, false, false));

      for (const row of data) {
        if (Array.isArray(row)) {
          lines.push(rowToString(row, delimiter, quote, false, false));
        } else if (typeof row === 'object' && row !== null) {
          const values = headers.map((h: string) => (row as any)[h] ?? '');
          lines.push(rowToString(values, delimiter, quote, false, false));
        }
      }
      return lines.join('\n');
    }
  });

  // csv_stringify_objects(objects, columns, delimiter, quote) -> string
  registry.register({
    name: 'csv_stringify_objects',
    module: 'csv-stringify',
    executor: (args: any[]) => {
      const objects = Array.isArray(args[0]) ? args[0] : [];
      const columns = Array.isArray(args[1]) ? args[1] : [];
      const delimiter = String(args[2] || ',');
      const quote = String(args[3] || '"');

      const effectiveColumns = columns.length > 0
        ? columns
        : objects.length > 0 ? Object.keys(objects[0]) : [];

      const lines: string[] = [];
      lines.push(rowToString(effectiveColumns, delimiter, quote, false, false));

      for (const obj of objects) {
        const values = effectiveColumns.map((col: string) => (obj as any)[col] ?? '');
        lines.push(rowToString(values, delimiter, quote, false, false));
      }
      return lines.join('\n');
    }
  });
}
