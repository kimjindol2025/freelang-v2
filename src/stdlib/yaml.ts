/**
 * FreeLang Standard Library: std/yaml
 *
 * Simple YAML parsing and generation (subset)
 */

/**
 * Parse simple YAML string
 * @param yaml YAML string
 * @returns Parsed object
 */
export function parse(yaml: string): any {
  const lines = yaml.split('\n');
  return parseYAML(lines, 0, 1000).value;
}

interface ParseResult {
  value: any;
  endIndex: number;
}

function parseYAML(lines: string[], startIndex: number, endIndex: number): ParseResult {
  const result: any = {};
  let i = startIndex;

  while (i < endIndex && i < lines.length) {
    const line = lines[i];
    const trimmed = line.trimStart();

    if (!trimmed || trimmed.startsWith('#')) {
      i++;
      continue;
    }

    const indent = line.length - trimmed.length;

    // Check for list item
    if (trimmed.startsWith('-')) {
      if (!result._list) {
        result._list = [];
      }
      const value = trimmed.substring(1).trim();
      result._list.push(parseValue(value));
      i++;
    } else if (trimmed.includes(':')) {
      const [key, ...rest] = trimmed.split(':');
      const value = rest.join(':').trim();

      if (value) {
        result[key.trim()] = parseValue(value);
      } else {
        // Nested object
        result[key.trim()] = {};
      }

      i++;
    } else {
      i++;
    }
  }

  if (result._list) {
    return { value: result._list, endIndex: i };
  }

  return { value: result, endIndex: i };
}

function parseValue(value: string): any {
  value = value.trim();

  if (value === 'null' || value === '') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value.match(/^-?\d+$/)) return parseInt(value, 10);
  if (value.match(/^-?\d+\.\d+$/)) return parseFloat(value);
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}

/**
 * Convert object to YAML string
 * @param obj Object to convert
 * @param indent Indentation level
 * @returns YAML string
 */
export function stringify(obj: any, indent: number = 0): string {
  const spaces = '  '.repeat(indent);
  const nextSpaces = '  '.repeat(indent + 1);

  if (obj === null) return `${spaces}null`;
  if (obj === undefined) return '';
  if (typeof obj !== 'object') {
    if (typeof obj === 'string') {
      return `${spaces}${quoteIfNeeded(obj)}`;
    }
    return `${spaces}${obj}`;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return `${spaces}[]`;

    let yaml = '';
    for (const item of obj) {
      yaml += `${spaces}- ${stringifyValue(item, 0)}\n`;
    }
    return yaml.trimEnd();
  }

  // Object
  let yaml = '';
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      yaml += `${spaces}${key}: null\n`;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      yaml += `${spaces}${key}:\n`;
      yaml += stringify(value, indent + 1) + '\n';
    } else if (Array.isArray(value)) {
      yaml += `${spaces}${key}:\n`;
      for (const item of value) {
        yaml += `${nextSpaces}- ${stringifyValue(item, 0)}\n`;
      }
    } else {
      yaml += `${spaces}${key}: ${stringifyValue(value, 0)}\n`;
    }
  }

  return yaml.trimEnd();
}

function stringifyValue(value: any, indent: number): string {
  if (typeof value === 'string') {
    return quoteIfNeeded(value);
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function quoteIfNeeded(str: string): string {
  if (str.includes(':') || str.includes('#') || str.trim() !== str) {
    return `"${str.replace(/"/g, '\\"')}"`;
  }
  return str;
}

/**
 * Get value from YAML using dot notation
 * @param yamlString YAML string
 * @param path Dot notation path
 * @returns Value or undefined
 */
export function getValue(yamlString: string, path: string): any {
  const obj = parse(yamlString);
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[key];
  }

  return current;
}
