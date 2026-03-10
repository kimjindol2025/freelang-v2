/**
 * FreeLang v2 - bcrypt 네이티브 함수
 *
 * npm bcrypt 패키지 완전 대체
 * 패스워드 해싱 구현 (Node.js crypto 기반 bcrypt 유사 구현)
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';
import * as crypto from 'crypto';

// bcrypt 유사 구현 (실제 bcrypt 알고리즘 근사)
// 실제 프로덕션에서는 native bcrypt 바인딩 사용 권장

const BCRYPT_PREFIX = '$2b$';

function generateSalt(rounds: number): string {
  const validRounds = Math.max(4, Math.min(31, rounds));
  const saltBytes = crypto.randomBytes(16);
  const saltHex = saltBytes.toString('base64').replace(/\+/g, '.').replace(/\//g, '/').replace(/=/g, '').substring(0, 22);
  const roundStr = validRounds.toString().padStart(2, '0');
  return `${BCRYPT_PREFIX}${roundStr}$${saltHex}`;
}

function hashPassword(password: string, saltOrRounds: any): string {
  let salt: string;
  let rounds: number;

  if (typeof saltOrRounds === 'number') {
    rounds = saltOrRounds;
    salt = generateSalt(rounds);
  } else if (typeof saltOrRounds === 'string' && saltOrRounds.startsWith(BCRYPT_PREFIX)) {
    salt = saltOrRounds;
    const roundMatch = saltOrRounds.match(/\$2b\$(\d+)\$/);
    rounds = roundMatch ? parseInt(roundMatch[1]) : 10;
  } else {
    rounds = 10;
    salt = generateSalt(rounds);
  }

  // bcrypt 근사: PBKDF2 with many iterations
  const iterations = Math.pow(2, rounds);
  const saltPart = salt.split('$')[3] || '';
  const saltBuffer = Buffer.from(saltPart + 'bcrypt', 'utf8');

  const hash = crypto.pbkdf2Sync(
    password,
    saltBuffer,
    Math.min(iterations, 100000), // 성능을 위해 최대 100000으로 제한
    32,
    'sha256'
  );

  const hashEncoded = hash.toString('base64')
    .replace(/\+/g, '.')
    .replace(/\//g, '/')
    .replace(/=/g, '')
    .substring(0, 31);

  return `${salt}${hashEncoded}`;
}

function verifyPassword(password: string, hash: string): boolean {
  if (!hash.startsWith(BCRYPT_PREFIX)) return false;

  try {
    // 솔트 추출 (첫 29자: $2b$XX$<22자 salt>)
    const saltEnd = hash.indexOf('$', 7) + 1 + 22;
    const salt = hash.substring(0, saltEnd);

    const expectedHash = hashPassword(password, salt);
    return crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(expectedHash)
    );
  } catch {
    return false;
  }
}

function getRounds(hash: string): number {
  const match = hash.match(/\$2[ab]?\$(\d+)\$/);
  return match ? parseInt(match[1]) : 0;
}

function isBcryptHash(str: string): boolean {
  return /^\$2[ab]?\$\d{2}\$/.test(str);
}

export function registerBcryptFunctions(registry: NativeFunctionRegistry): void {
  // bcrypt_hash(data, saltOrRounds, sync) -> string
  registry.register({
    name: 'bcrypt_hash',
    module: 'bcrypt',
    executor: async (args: any[]) => {
      const data = String(args[0] || '');
      const saltOrRounds = args[1];
      const sync = Boolean(args[2]);

      if (!data) throw new Error('bcrypt_hash: data is required');

      const rounds = typeof saltOrRounds === 'number'
        ? saltOrRounds
        : (typeof saltOrRounds === 'string' ? undefined : 10);

      const salt = typeof saltOrRounds === 'string' ? saltOrRounds : generateSalt(rounds || 10);

      if (sync) {
        return hashPassword(data, salt);
      } else {
        // 비동기 시뮬레이션 (setImmediate로 non-blocking)
        return new Promise<string>((resolve) => {
          setImmediate(() => {
            resolve(hashPassword(data, salt));
          });
        });
      }
    }
  });

  // bcrypt_compare(data, hash, sync) -> bool
  registry.register({
    name: 'bcrypt_compare',
    module: 'bcrypt',
    executor: async (args: any[]) => {
      const data = String(args[0] || '');
      const hash = String(args[1] || '');
      const sync = Boolean(args[2]);

      if (sync) {
        return verifyPassword(data, hash);
      } else {
        return new Promise<boolean>((resolve) => {
          setImmediate(() => {
            resolve(verifyPassword(data, hash));
          });
        });
      }
    }
  });

  // bcrypt_gen_salt(rounds, sync) -> string
  registry.register({
    name: 'bcrypt_gen_salt',
    module: 'bcrypt',
    executor: async (args: any[]) => {
      const rounds = Math.max(4, Math.min(31, parseInt(String(args[0] || 10))));
      const sync = Boolean(args[1]);

      if (sync) {
        return generateSalt(rounds);
      } else {
        return new Promise<string>((resolve) => {
          setImmediate(() => {
            resolve(generateSalt(rounds));
          });
        });
      }
    }
  });

  // bcrypt_get_rounds(hash) -> int
  registry.register({
    name: 'bcrypt_get_rounds',
    module: 'bcrypt',
    executor: (args: any[]) => {
      return getRounds(String(args[0] || ''));
    }
  });

  // bcrypt_is_hash(str) -> bool
  registry.register({
    name: 'bcrypt_is_hash',
    module: 'bcrypt',
    executor: (args: any[]) => {
      return isBcryptHash(String(args[0] || ''));
    }
  });
}
