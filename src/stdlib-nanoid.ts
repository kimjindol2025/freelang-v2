/**
 * FreeLang v2 stdlib — stdlib-nanoid.ts
 * npm nanoid 완전 대체 네이티브 함수 등록
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';
import { randomBytes } from 'crypto';

const URL_ALPHABET = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';

function generateId(alphabet: string, size: number): string {
  const mask = (2 << (Math.log(alphabet.length - 1) / Math.LN2)) - 1;
  const step = Math.ceil((1.6 * mask * size) / alphabet.length);
  let id = '';
  while (id.length < size) {
    const bytes = randomBytes(step);
    for (let i = 0; i < bytes.length && id.length < size; i++) {
      const byte = bytes[i]! & mask;
      if (byte < alphabet.length) {
        id += alphabet[byte];
      }
    }
  }
  return id;
}

export function registerNanoidFunctions(registry: NativeFunctionRegistry): void {
  registry.register({
    name: 'nanoid_generate',
    module: 'nanoid',
    paramCount: 1,
    executor: (args: any[]) => {
      const size = Math.max(1, Number(args[0]) || 21);
      return generateId(URL_ALPHABET, size);
    }
  });

  registry.register({
    name: 'nanoid_custom_alphabet',
    module: 'nanoid',
    paramCount: 2,
    executor: (args: any[]) => {
      const alphabet = String(args[0]);
      const size = Math.max(1, Number(args[1]) || 21);
      if (alphabet.length === 0) throw new Error('nanoid: alphabet cannot be empty');
      if (alphabet.length > 255) throw new Error('nanoid: alphabet too long');
      return generateId(alphabet, size);
    }
  });

  registry.register({
    name: 'nanoid_url_alphabet',
    module: 'nanoid',
    paramCount: 0,
    executor: () => URL_ALPHABET
  });
}
