/**
 * FreeLang v2 stdlib — stdlib-form-data.ts
 * npm form-data 완전 대체 네이티브 함수 등록
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

interface FormField {
  name: string;
  value: string;
  filename: string;
  isFile: boolean;
  contentType: string;
}

class FormDataStore {
  boundary: string;
  fields: FormField[] = [];

  constructor() {
    this.boundary = '----FreeLangFormBoundary' + randomBytes(12).toString('hex');
  }

  append(name: string, value: string, filename = ''): void {
    this.fields.push({ name, value, filename, isFile: false, contentType: 'text/plain' });
  }

  appendFile(name: string, filePath: string, filename = ''): void {
    const actualFilename = filename || path.basename(filePath);
    let content = '';
    try { content = fs.readFileSync(filePath, 'base64'); } catch { content = ''; }
    this.fields.push({ name, value: content, filename: actualFilename, isFile: true, contentType: 'application/octet-stream' });
  }

  getHeaders(): Record<string, string> {
    return { 'Content-Type': `multipart/form-data; boundary=${this.boundary}` };
  }

  toString(): string {
    const lines: string[] = [];
    for (const field of this.fields) {
      lines.push(`--${this.boundary}`);
      let disposition = `Content-Disposition: form-data; name="${field.name}"`;
      if (field.filename) disposition += `; filename="${field.filename}"`;
      lines.push(disposition);
      if (field.isFile) lines.push(`Content-Type: ${field.contentType}`);
      lines.push('');
      lines.push(field.isFile ? `[binary data: ${field.filename}]` : field.value);
    }
    lines.push(`--${this.boundary}--`);
    return lines.join('\r\n');
  }

  getLength(): number {
    return Buffer.byteLength(this.toString());
  }
}

const formStores = new Map<string, FormDataStore>();

export function registerFormDataFunctions(registry: NativeFunctionRegistry): void {
  registry.register({
    name: 'formdata_create',
    module: 'form-data',
    paramCount: 0,
    executor: () => {
      const id = randomBytes(8).toString('hex');
      const store = new FormDataStore();
      formStores.set(id, store);
      return { id, boundary: store.boundary };
    }
  });

  registry.register({
    name: 'formdata_append',
    module: 'form-data',
    paramCount: 4,
    executor: (args: any[]) => {
      const store = formStores.get(String(args[0]));
      if (store) store.append(String(args[1]), String(args[2]), String(args[3] ?? ''));
      return null;
    }
  });

  registry.register({
    name: 'formdata_append_file',
    module: 'form-data',
    paramCount: 4,
    executor: (args: any[]) => {
      const store = formStores.get(String(args[0]));
      if (store) store.appendFile(String(args[1]), String(args[2]), String(args[3] ?? ''));
      return null;
    }
  });

  registry.register({
    name: 'formdata_get_headers',
    module: 'form-data',
    paramCount: 1,
    executor: (args: any[]) => formStores.get(String(args[0]))?.getHeaders() ?? {}
  });

  registry.register({
    name: 'formdata_get_length',
    module: 'form-data',
    paramCount: 1,
    executor: (args: any[]) => formStores.get(String(args[0]))?.getLength() ?? 0
  });

  registry.register({
    name: 'formdata_to_string',
    module: 'form-data',
    paramCount: 1,
    executor: (args: any[]) => formStores.get(String(args[0]))?.toString() ?? ''
  });

  registry.register({
    name: 'formdata_to_buffer',
    module: 'form-data',
    paramCount: 1,
    executor: (args: any[]) => formStores.get(String(args[0]))?.toString() ?? ''
  });

  registry.register({
    name: 'formdata_get_fields',
    module: 'form-data',
    paramCount: 1,
    executor: (args: any[]) => {
      const store = formStores.get(String(args[0]));
      if (!store) return [];
      return store.fields.map(f => ({ name: f.name, value: f.value, filename: f.filename }));
    }
  });
}
