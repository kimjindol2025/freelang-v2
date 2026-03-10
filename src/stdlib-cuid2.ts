/**
 * FreeLang v2 stdlib — stdlib-cuid2.ts
 * npm @paralleldrive/cuid2 완전 대체 네이티브 함수 등록
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';
import { createHash, randomBytes } from 'crypto';

const CUID2_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
let counter = 0;

function createCuid2(length: number, fingerprint: string): string {
  const time = Date.now().toString(36);
  const count = (counter++).toString(36);
  const fp = fingerprint || createHash('sha256')
    .update(randomBytes(16))
    .digest('hex')
    .slice(0, 8);
  const random = randomBytes(Math.ceil(length * 1.1))
    .toString('base64')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
  const raw = `c${time}${count}${fp}${random}`;
  const hash = createHash('sha256').update(raw).digest('hex');
  const base36 = BigInt('0x' + hash).toString(36);
  const padded = base36.padStart(length - 1, '0');
  return 'c' + padded.slice(0, length - 1);
}

export function registerCuid2Functions(registry: NativeFunctionRegistry): void {
  registry.register({
    name: 'cuid2_create_id',
    module: 'cuid2',
    paramCount: 2,
    executor: (args: any[]) => {
      const length = Math.max(2, Math.min(32, Number(args[0]) || 24));
      const fingerprint = String(args[1] || '');
      return createCuid2(length, fingerprint);
    }
  });

  registry.register({
    name: 'cuid2_is_cuid',
    module: 'cuid2',
    paramCount: 1,
    executor: (args: any[]) => {
      const id = String(args[0]);
      return id.length >= 2 && id.length <= 32 && /^c[a-z0-9]+$/.test(id);
    }
  });

  registry.register({
    name: 'cuid2_get_length',
    module: 'cuid2',
    paramCount: 1,
    executor: (args: any[]) => String(args[0]).length
  });
}
