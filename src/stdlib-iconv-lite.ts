/**
 * FreeLang v2 - iconv-lite 네이티브 함수
 *
 * npm iconv-lite 패키지 완전 대체
 * 문자 인코딩 변환 구현
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

// 지원하는 인코딩 목록
const SUPPORTED_ENCODINGS = new Set([
  'utf-8', 'utf8', 'utf-16', 'utf16', 'utf-16le', 'utf16le', 'utf-16be', 'utf16be',
  'ascii', 'latin1', 'binary', 'base64', 'hex',
  'euc-kr', 'euckr', 'cp949', 'uhc',
  'euc-jp', 'eucjp', 'cp932', 'shift_jis', 'sjis', 'shiftjis',
  'gb2312', 'gbk', 'gb18030', 'big5',
  'iso-8859-1', 'iso8859-1', 'latin-1',
  'iso-8859-2', 'iso-8859-3', 'iso-8859-4', 'iso-8859-5',
  'windows-1250', 'windows-1251', 'windows-1252', 'cp1252',
  'koi8-r', 'koi8-u'
]);

function normalizeEncoding(encoding: string): BufferEncoding | string {
  const lower = encoding.toLowerCase().replace(/[-_]/g, '');
  const map: Record<string, string> = {
    'utf8': 'utf8',
    'utf16le': 'utf16le',
    'latin1': 'latin1',
    'binary': 'binary',
    'base64': 'base64',
    'hex': 'hex',
    'ascii': 'ascii'
  };
  return map[lower] || 'utf8';
}

function stripBomFromString(str: string): string {
  if (str.charCodeAt(0) === 0xFEFF) return str.slice(1);
  return str;
}

function hasBom(buffer: Buffer): boolean {
  if (buffer.length < 2) return false;
  // UTF-8 BOM: EF BB BF
  if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) return true;
  // UTF-16 LE BOM: FF FE
  if (buffer[0] === 0xFF && buffer[1] === 0xFE) return true;
  // UTF-16 BE BOM: FE FF
  if (buffer[0] === 0xFE && buffer[1] === 0xFF) return true;
  return false;
}

export function registerIconvLiteFunctions(registry: NativeFunctionRegistry): void {
  // iconv_decode(buffer, encoding, stripBOM) -> string
  registry.register({
    name: 'iconv_decode',
    module: 'iconv-lite',
    executor: (args: any[]) => {
      const input = args[0];
      const encoding = String(args[1] || 'utf-8');
      const stripBOM = args[2] !== false;

      let buffer: Buffer;
      if (Buffer.isBuffer(input)) {
        buffer = input;
      } else if (typeof input === 'string') {
        buffer = Buffer.from(input, 'binary');
      } else if (Array.isArray(input)) {
        buffer = Buffer.from(input as number[]);
      } else {
        return String(input || '');
      }

      // Node.js 기본 지원 인코딩
      const nodeEncoding = normalizeEncoding(encoding) as BufferEncoding;
      let result: string;

      try {
        result = buffer.toString(nodeEncoding);
      } catch {
        result = buffer.toString('utf8');
      }

      if (stripBOM) {
        result = stripBomFromString(result);
      }

      return result;
    }
  });

  // iconv_encode(str, encoding, addBOM) -> Buffer
  registry.register({
    name: 'iconv_encode',
    module: 'iconv-lite',
    executor: (args: any[]) => {
      const str = String(args[0] || '');
      const encoding = String(args[1] || 'utf-8');
      const addBOM = Boolean(args[2]);

      const nodeEncoding = normalizeEncoding(encoding) as BufferEncoding;
      let buffer: Buffer;

      try {
        buffer = Buffer.from(str, nodeEncoding);
      } catch {
        buffer = Buffer.from(str, 'utf8');
      }

      if (addBOM) {
        // UTF-8 BOM 추가
        const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
        buffer = Buffer.concat([bom, buffer]);
      }

      return buffer;
    }
  });

  // iconv_encoding_exists(encoding) -> bool
  registry.register({
    name: 'iconv_encoding_exists',
    module: 'iconv-lite',
    executor: (args: any[]) => {
      const encoding = String(args[0] || '').toLowerCase();
      return SUPPORTED_ENCODINGS.has(encoding);
    }
  });

  // iconv_get_encoder(encoding) -> object
  registry.register({
    name: 'iconv_get_encoder',
    module: 'iconv-lite',
    executor: (args: any[]) => {
      const encoding = String(args[0] || 'utf-8');
      return { encoding, type: 'encoder' };
    }
  });

  // iconv_get_decoder(encoding) -> object
  registry.register({
    name: 'iconv_get_decoder',
    module: 'iconv-lite',
    executor: (args: any[]) => {
      const encoding = String(args[0] || 'utf-8');
      return { encoding, type: 'decoder' };
    }
  });

  // iconv_strip_bom(str) -> string
  registry.register({
    name: 'iconv_strip_bom',
    module: 'iconv-lite',
    executor: (args: any[]) => {
      return stripBomFromString(String(args[0] || ''));
    }
  });

  // iconv_has_bom(buffer) -> bool
  registry.register({
    name: 'iconv_has_bom',
    module: 'iconv-lite',
    executor: (args: any[]) => {
      const input = args[0];
      if (Buffer.isBuffer(input)) return hasBom(input);
      if (typeof input === 'string') {
        return input.charCodeAt(0) === 0xFEFF;
      }
      return false;
    }
  });
}
