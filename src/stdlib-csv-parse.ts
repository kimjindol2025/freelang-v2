/**
 * FreeLang v2 - csv-parse 네이티브 함수
 *
 * npm csv-parse 패키지 완전 대체
 * CSV 파싱 구현
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';
import * as fs from 'fs';

function parseCsvLine(line: string, delimiter: string, quote: string, trim: boolean): string[] {
  const cells: string[] = [];
  let inQuote = false;
  let cell = '';

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === quote) {
      if (inQuote && line[i + 1] === quote) {
        cell += quote;
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (c === delimiter && !inQuote) {
      cells.push(trim ? cell.trim() : cell);
      cell = '';
    } else {
      cell += c;
    }
  }
  cells.push(trim ? cell.trim() : cell);
  return cells;
}

export function registerCsvParseFunctions(registry: NativeFunctionRegistry): void {
  // csv_parse(input, delimiter, quote, escape, header, skipEmpty, trim, comment) -> array
  registry.register({
    name: 'csv_parse',
    module: 'csv-parse',
    paramCount: 8,
    executor: (args: any[]) => {
      const input = String(args[0] || '');
      const delimiter = String(args[1] || ',');
      const quote = String(args[2] || '"');
      const skipEmpty = Boolean(args[5] !== false);
      const trim = Boolean(args[6]);
      const comment = String(args[7] || '');

      const lines = input.split('\n');
      const result: string[][] = [];

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (skipEmpty && !trimmedLine) continue;
        if (comment && trimmedLine.startsWith(comment)) continue;
        result.push(parseCsvLine(line, delimiter, quote, trim));
      }

      return result;
    }
  });

  // csv_parse_header(input) -> array of objects
  registry.register({
    name: 'csv_parse_header',
    module: 'csv-parse',
    paramCount: 1,
    executor: (args: any[]) => {
      const input = String(args[0] || '');
      const lines = input.split('\n').filter((l) => l.trim());
      if (lines.length < 2) return [];

      const headers = parseCsvLine(lines[0], ',', '"', true);
      return lines.slice(1).map((line) => {
        const cells = parseCsvLine(line, ',', '"', true);
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
          obj[h] = cells[i] !== undefined ? cells[i] : '';
        });
        return obj;
      });
    }
  });

  // csv_get_headers(input) -> array
  registry.register({
    name: 'csv_get_headers',
    module: 'csv-parse',
    paramCount: 1,
    executor: (args: any[]) => {
      const input = String(args[0] || '');
      const firstLine = input.split('\n')[0] || '';
      return parseCsvLine(firstLine, ',', '"', true);
    }
  });

  // csv_first_line(input) -> string
  registry.register({
    name: 'csv_first_line',
    module: 'csv-parse',
    paramCount: 1,
    executor: (args: any[]) => {
      const input = String(args[0] || '');
      return input.split('\n')[0] || '';
    }
  });

  // csv_split_line(line, delimiter) -> array
  registry.register({
    name: 'csv_split_line',
    module: 'csv-parse',
    paramCount: 2,
    executor: (args: any[]) => {
      const line = String(args[0] || '');
      const delimiter = String(args[1] || ',');
      return parseCsvLine(line, delimiter, '"', true);
    }
  });
}
