/**
 * FreeLang Standard Library: std/csv
 *
 * CSV parsing and generation utilities
 */

/**
 * Parse CSV string to array of records
 * @param csv CSV string
 * @param delimiter Field delimiter
 * @param hasHeader Whether first row is header
 * @returns Array of records (objects if hasHeader, arrays otherwise)
 */
export function parse(csv: string, delimiter: string = ',', hasHeader: boolean = true): any[] {
  const lines = csv.trim().split('\n');
  const result: any[] = [];

  let headers: string[] = [];
  if (hasHeader && lines.length > 0) {
    headers = parseCSVLine(lines[0], delimiter);
  }

  const startIndex = hasHeader ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i], delimiter);

    if (hasHeader) {
      const record: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        record[headers[j]] = fields[j] || '';
      }
      result.push(record);
    } else {
      result.push(fields);
    }
  }

  return result;
}

/**
 * Convert array of records to CSV string
 * @param records Array of records
 * @param headers Optional headers array
 * @param delimiter Field delimiter
 * @returns CSV string
 */
export function stringify(records: any[], headers?: string[], delimiter: string = ','): string {
  if (records.length === 0) {
    return '';
  }

  let csv = '';

  // Determine headers if not provided
  if (!headers) {
    if (typeof records[0] === 'object' && !Array.isArray(records[0])) {
      headers = Object.keys(records[0]);
    }
  }

  // Write headers
  if (headers) {
    csv += headers.map(h => escapeField(h, delimiter)).join(delimiter) + '\n';
  }

  // Write records
  for (const record of records) {
    let fields: string[] = [];

    if (typeof record === 'object' && !Array.isArray(record)) {
      if (headers) {
        fields = headers.map(h => escapeField(String(record[h] || ''), delimiter));
      } else {
        fields = Object.values(record).map(v => escapeField(String(v), delimiter));
      }
    } else if (Array.isArray(record)) {
      fields = record.map(v => escapeField(String(v), delimiter));
    } else {
      fields = [escapeField(String(record), delimiter)];
    }

    csv += fields.join(delimiter) + '\n';
  }

  return csv;
}

/**
 * Parse single CSV line
 * @param line CSV line
 * @param delimiter Field delimiter
 * @returns Array of fields
 */
export function parseCSVLine(line: string, delimiter: string = ','): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields;
}

/**
 * Escape field value for CSV
 * @param field Field value
 * @param delimiter Field delimiter
 * @returns Escaped field
 */
export function escapeField(field: string, delimiter: string = ','): string {
  if (field.includes(delimiter) || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Convert CSV to array of arrays (no headers)
 * @param csv CSV string
 * @param delimiter Field delimiter
 * @returns Array of arrays
 */
export function toArrays(csv: string, delimiter: string = ','): string[][] {
  const lines = csv.trim().split('\n');
  return lines.map(line => parseCSVLine(line, delimiter));
}

/**
 * Convert array of arrays to CSV
 * @param arrays Array of arrays
 * @param delimiter Field delimiter
 * @returns CSV string
 */
export function fromArrays(arrays: string[][], delimiter: string = ','): string {
  return arrays
    .map(row => row.map(field => escapeField(field, delimiter)).join(delimiter))
    .join('\n');
}
