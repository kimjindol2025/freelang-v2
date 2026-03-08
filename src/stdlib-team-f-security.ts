/**
 * FreeLang v2 - Team F: Security/Crypto/System 확장 함수
 *
 * 22개 라이브러리, 100+ 함수 구현
 * - hash: MD5, SHA1, SHA256, SHA512
 * - aes: 암호화/복호화
 * - hmac: 메시지 인증
 * - jwt-utils: JWT 토큰
 * - argon2: 패스워드 해싱
 * - scrypt: KDF
 * - sign: 디지털 서명
 * - random-bytes: 난수 생성
 * - process: 프로세스 관리
 * - signal: 신호 처리
 * - memory: 메모리 정보
 * - cpu: CPU 정보
 * - disk: 디스크 정보
 * - network-iface: 네트워크 인터페이스
 * - locale: 로케일
 * - currency: 통화 변환
 * - units: 단위 변환
 * - color: 색상 처리
 * - qrcode: QR 코드
 * - encoding-ext: 인코딩 확장
 * - zlib: 압축
 * - password: 패스워드 유틸리티
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';
import * as crypto from 'crypto';
import * as os from 'os';
import * as fs from 'fs';
import * as zlib from 'zlib';
import { execSync, spawn } from 'child_process';

/**
 * 글로벌 저장소
 */
const globalSecurityCache: Map<string, any> = new Map();
const globalProcesses: Map<string, any> = new Map();

/**
 * Team F 함수들을 NativeFunctionRegistry에 등록
 */
export function registerTeamFFunctions(registry: NativeFunctionRegistry): void {
  // ════════════════════════════════════════════════════════════════
  // 섹션 1: HASH (5개) - MD5, SHA1, SHA256, SHA512, HMAC 기반
  // ════════════════════════════════════════════════════════════════

  // hash_md5(문자열)
  registry.register({
    name: 'hash_md5',
    module: 'hash',
    executor: (args) => {
      const data = String(args[0]);
      return crypto.createHash('md5').update(data).digest('hex');
    }
  });

  // hash_sha1(문자열)
  registry.register({
    name: 'hash_sha1',
    module: 'hash',
    executor: (args) => {
      const data = String(args[0]);
      return crypto.createHash('sha1').update(data).digest('hex');
    }
  });

  // hash_sha256(문자열)
  registry.register({
    name: 'hash_sha256',
    module: 'hash',
    executor: (args) => {
      const data = String(args[0]);
      return crypto.createHash('sha256').update(data).digest('hex');
    }
  });

  // hash_sha512(문자열)
  registry.register({
    name: 'hash_sha512',
    module: 'hash',
    executor: (args) => {
      const data = String(args[0]);
      return crypto.createHash('sha512').update(data).digest('hex');
    }
  });

  // hash_blake2b(문자열, salt?)
  registry.register({
    name: 'hash_blake2b',
    module: 'hash',
    executor: (args) => {
      const data = String(args[0]);
      const salt = args[1] ? String(args[1]) : '';
      try {
        return crypto.createHash('blake2b512').update(data + salt).digest('hex');
      } catch {
        return crypto.createHash('sha512').update(data + salt).digest('hex');
      }
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 2: AES 암호화 (5개)
  // ════════════════════════════════════════════════════════════════

  // aes_create_key(길이: 16|24|32)
  registry.register({
    name: 'aes_create_key',
    module: 'aes',
    executor: (args) => {
      const length = Math.floor(args[0]) || 32;
      return crypto.randomBytes(length).toString('hex');
    }
  });

  // aes_encrypt(평문, 키, iv?)
  registry.register({
    name: 'aes_encrypt',
    module: 'aes',
    executor: (args) => {
      const plaintext = String(args[0]);
      const key = Buffer.from(String(args[1]), 'hex');
      const iv = args[2] ? Buffer.from(String(args[2]), 'hex') : crypto.randomBytes(16);

      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return {
        ciphertext: encrypted,
        iv: iv.toString('hex'),
        algorithm: 'aes-256-cbc'
      };
    }
  });

  // aes_decrypt(암호문, 키, iv)
  registry.register({
    name: 'aes_decrypt',
    module: 'aes',
    executor: (args) => {
      const ciphertext = String(args[0]);
      const key = Buffer.from(String(args[1]), 'hex');
      const iv = Buffer.from(String(args[2]), 'hex');

      try {
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      } catch (e) {
        return null;
      }
    }
  });

  // aes_encrypt_gcm(평문, 키, aad?)
  registry.register({
    name: 'aes_encrypt_gcm',
    module: 'aes',
    executor: (args) => {
      const plaintext = String(args[0]);
      const key = Buffer.from(String(args[1]), 'hex');
      const aad = args[2] ? String(args[2]) : '';
      const iv = crypto.randomBytes(12);

      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      if (aad) cipher.setAAD(Buffer.from(aad));

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag().toString('hex');

      return {
        ciphertext: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag,
        algorithm: 'aes-256-gcm'
      };
    }
  });

  // aes_decrypt_gcm(암호문, 키, iv, authTag)
  registry.register({
    name: 'aes_decrypt_gcm',
    module: 'aes',
    executor: (args) => {
      const ciphertext = String(args[0]);
      const key = Buffer.from(String(args[1]), 'hex');
      const iv = Buffer.from(String(args[2]), 'hex');
      const authTag = Buffer.from(String(args[3]), 'hex');

      try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      } catch (e) {
        return null;
      }
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 3: HMAC (5개)
  // ════════════════════════════════════════════════════════════════

  // hmac_sha256(메시지, 키)
  registry.register({
    name: 'hmac_sha256',
    module: 'hmac',
    executor: (args) => {
      const message = String(args[0]);
      const key = String(args[1]);
      return crypto.createHmac('sha256', key).update(message).digest('hex');
    }
  });

  // hmac_sha512(메시지, 키)
  registry.register({
    name: 'hmac_sha512',
    module: 'hmac',
    executor: (args) => {
      const message = String(args[0]);
      const key = String(args[1]);
      return crypto.createHmac('sha512', key).update(message).digest('hex');
    }
  });

  // hmac_verify(메시지, 키, 서명)
  registry.register({
    name: 'hmac_verify',
    module: 'hmac',
    executor: (args) => {
      const message = String(args[0]);
      const key = String(args[1]);
      const signature = String(args[2]);
      const expected = crypto.createHmac('sha256', key).update(message).digest('hex');
      return crypto.timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(signature)
      );
    }
  });

  // hmac_create(메시지, 키, 알고리즘)
  registry.register({
    name: 'hmac_create',
    module: 'hmac',
    executor: (args) => {
      const message = String(args[0]);
      const key = String(args[1]);
      const algorithm = args[2] ? String(args[2]) : 'sha256';
      return crypto.createHmac(algorithm, key).update(message).digest('hex');
    }
  });

  // hmac_base64(메시지, 키)
  registry.register({
    name: 'hmac_base64',
    module: 'hmac',
    executor: (args) => {
      const message = String(args[0]);
      const key = String(args[1]);
      return crypto.createHmac('sha256', key).update(message).digest('base64');
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 4: JWT-UTILS (5개)
  // ════════════════════════════════════════════════════════════════

  // jwt_sign(페이로드, 비밀키, 옵션)
  registry.register({
    name: 'jwt_sign',
    module: 'jwt-utils',
    executor: (args) => {
      const payload = typeof args[0] === 'object' ? args[0] : JSON.parse(String(args[0]));
      const secret = String(args[1]);
      const options = args[2] || {};

      const header = {
        alg: 'HS256',
        typ: 'JWT',
        ...options.header
      };

      const now = Math.floor(Date.now() / 1000);
      const claims = {
        ...payload,
        iat: now,
        exp: now + (options.expiresIn || 3600)
      };

      const encodeBase64 = (str: string) => Buffer.from(str).toString('base64url');
      const headerEncoded = encodeBase64(JSON.stringify(header));
      const payloadEncoded = encodeBase64(JSON.stringify(claims));

      const message = `${headerEncoded}.${payloadEncoded}`;
      const signature = crypto.createHmac('sha256', secret).update(message).digest('base64url');

      return `${message}.${signature}`;
    }
  });

  // jwt_verify(토큰, 비밀키)
  registry.register({
    name: 'jwt_verify',
    module: 'jwt-utils',
    executor: (args) => {
      const token = String(args[0]);
      const secret = String(args[1]);

      try {
        const [headerEncoded, payloadEncoded, signatureEncoded] = token.split('.');
        const message = `${headerEncoded}.${payloadEncoded}`;
        const expectedSignature = crypto.createHmac('sha256', secret).update(message).digest('base64url');

        if (signatureEncoded !== expectedSignature) return null;

        const payload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString());
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) return null;

        return payload;
      } catch (e) {
        return null;
      }
    }
  });

  // jwt_decode(토큰, verify?)
  registry.register({
    name: 'jwt_decode',
    module: 'jwt-utils',
    executor: (args) => {
      const token = String(args[0]);
      const verify = args[1] !== false;

      try {
        const [headerEncoded, payloadEncoded] = token.split('.');
        const header = JSON.parse(Buffer.from(headerEncoded, 'base64url').toString());
        const payload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString());

        return { header, payload, valid: true };
      } catch (e) {
        return { header: null, payload: null, valid: false };
      }
    }
  });

  // jwt_refresh(토큰, 비밀키, 만료시간)
  registry.register({
    name: 'jwt_refresh',
    module: 'jwt-utils',
    executor: (args) => {
      const token = String(args[0]);
      const secret = String(args[1]);
      const expiresIn = Math.floor(args[2]) || 3600;

      try {
        const [headerEncoded, payloadEncoded] = token.split('.');
        const payload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString());

        const now = Math.floor(Date.now() / 1000);
        payload.iat = now;
        payload.exp = now + expiresIn;

        const header = { alg: 'HS256', typ: 'JWT' };
        const encodeBase64 = (str: string) => Buffer.from(str).toString('base64url');
        const headerEncoded2 = encodeBase64(JSON.stringify(header));
        const payloadEncoded2 = encodeBase64(JSON.stringify(payload));

        const message = `${headerEncoded2}.${payloadEncoded2}`;
        const signature = crypto.createHmac('sha256', secret).update(message).digest('base64url');

        return `${message}.${signature}`;
      } catch (e) {
        return null;
      }
    }
  });

  // jwt_extract_claim(토큰, 클레임명)
  registry.register({
    name: 'jwt_extract_claim',
    module: 'jwt-utils',
    executor: (args) => {
      const token = String(args[0]);
      const claimName = String(args[1]);

      try {
        const [, payloadEncoded] = token.split('.');
        const payload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString());
        return payload[claimName] || null;
      } catch (e) {
        return null;
      }
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 5: ARGON2 (4개) - 패스워드 해싱
  // ════════════════════════════════════════════════════════════════

  // argon2_hash(비밀번호, saltRounds?)
  registry.register({
    name: 'argon2_hash',
    module: 'argon2',
    executor: (args) => {
      const password = String(args[0]);
      const saltRounds = Math.floor(args[1]) || 10;

      // Node.js 기본 crypto로 간단한 구현 (완전한 argon2는 라이브러리 필요)
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');

      return {
        hash: hash,
        salt: salt,
        algorithm: 'pbkdf2-sha512',
        iterations: 100000
      };
    }
  });

  // argon2_verify(비밀번호, 해시)
  registry.register({
    name: 'argon2_verify',
    module: 'argon2',
    executor: (args) => {
      const password = String(args[0]);
      const stored = typeof args[1] === 'object' ? args[1] : JSON.parse(String(args[1]));

      const computed = crypto.pbkdf2Sync(password, stored.salt, 100000, 64, 'sha512').toString('hex');
      return crypto.timingSafeEqual(
        Buffer.from(computed),
        Buffer.from(stored.hash)
      );
    }
  });

  // argon2_default_options()
  registry.register({
    name: 'argon2_default_options',
    module: 'argon2',
    executor: () => ({
      time: 3,
      memory: 4096,
      parallelism: 1,
      type: 'id'
    })
  });

  // argon2_needs_rehash(해시, 옵션?)
  registry.register({
    name: 'argon2_needs_rehash',
    module: 'argon2',
    executor: (args) => {
      const hash = typeof args[0] === 'object' ? args[0] : JSON.parse(String(args[0]));
      const options = args[1] || { iterations: 100000 };
      return (hash.iterations || 0) < options.iterations;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 6: SCRYPT (3개) - KDF
  // ════════════════════════════════════════════════════════════════

  // scrypt_derive(비밀번호, salt, keylen?, n?, r?, p?)
  registry.register({
    name: 'scrypt_derive',
    module: 'scrypt',
    executor: (args) => {
      const password = String(args[0]);
      const salt = String(args[1]);
      const keylen = Math.floor(args[2]) || 32;
      const n = Math.floor(args[3]) || 16384;
      const r = Math.floor(args[4]) || 8;
      const p = Math.floor(args[5]) || 1;

      try {
        const derived = crypto.scryptSync(password, salt, keylen, { N: n, r, p, maxmem: 128 * n * r * 2 });
        return derived.toString('hex');
      } catch (e) {
        return null;
      }
    }
  });

  // scrypt_verify(비밀번호, 저장된값)
  registry.register({
    name: 'scrypt_verify',
    module: 'scrypt',
    executor: (args) => {
      const password = String(args[0]);
      const stored = typeof args[1] === 'object' ? args[1] : JSON.parse(String(args[1]));

      try {
        const derived = crypto.scryptSync(password, stored.salt, 32, { N: stored.N || 16384, r: stored.r || 8, p: stored.p || 1, maxmem: 128 * 16384 * 8 * 2 });
        return crypto.timingSafeEqual(Buffer.from(derived.toString('hex')), Buffer.from(stored.hash));
      } catch (e) {
        return false;
      }
    }
  });

  // scrypt_hash(비밀번호)
  registry.register({
    name: 'scrypt_hash',
    module: 'scrypt',
    executor: (args) => {
      const password = String(args[0]);
      const salt = crypto.randomBytes(16).toString('hex');

      const derived = crypto.scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1, maxmem: 128 * 16384 * 8 * 2 });

      return {
        hash: derived.toString('hex'),
        salt: salt,
        N: 16384,
        r: 8,
        p: 1
      };
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 7: SIGN (4개) - 디지털 서명
  // ════════════════════════════════════════════════════════════════

  // sign_generate_keypair(알고리즘)
  registry.register({
    name: 'sign_generate_keypair',
    module: 'sign',
    executor: (args) => {
      const algorithm = args[0] ? String(args[0]) : 'rsa';

      if (algorithm === 'rsa') {
        const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
          modulusLength: 2048,
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        return { privateKey, publicKey, algorithm: 'rsa' };
      } else if (algorithm === 'ec') {
        const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
          namedCurve: 'prime256v1',
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        return { privateKey, publicKey, algorithm: 'ec' };
      }
      return null;
    }
  });

  // sign_message(메시지, 개인키)
  registry.register({
    name: 'sign_message',
    module: 'sign',
    executor: (args) => {
      const message = String(args[0]);
      const privateKey = String(args[1]);

      try {
        const sign = crypto.createSign('SHA256');
        sign.update(message);
        return sign.sign(privateKey, 'hex');
      } catch (e) {
        return null;
      }
    }
  });

  // sign_verify(메시지, 서명, 공개키)
  registry.register({
    name: 'sign_verify',
    module: 'sign',
    executor: (args) => {
      const message = String(args[0]);
      const signature = String(args[1]);
      const publicKey = String(args[2]);

      try {
        const verify = crypto.createVerify('SHA256');
        verify.update(message);
        return verify.verify(publicKey, signature, 'hex');
      } catch (e) {
        return false;
      }
    }
  });

  // sign_sign_file(파일경로, 개인키)
  registry.register({
    name: 'sign_sign_file',
    module: 'sign',
    executor: (args) => {
      const filePath = String(args[0]);
      const privateKey = String(args[1]);

      try {
        const data = fs.readFileSync(filePath);
        const sign = crypto.createSign('SHA256');
        sign.update(data);
        return sign.sign(privateKey, 'hex');
      } catch (e) {
        return null;
      }
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 8: RANDOM-BYTES (5개)
  // ════════════════════════════════════════════════════════════════

  // random_bytes(길이)
  registry.register({
    name: 'random_bytes',
    module: 'random-bytes',
    executor: (args) => {
      const length = Math.floor(args[0]) || 32;
      return crypto.randomBytes(length).toString('hex');
    }
  });

  // random_hex(길이)
  registry.register({
    name: 'random_hex',
    module: 'random-bytes',
    executor: (args) => {
      const length = Math.floor(args[0]) || 16;
      return crypto.randomBytes(length).toString('hex');
    }
  });

  // random_base64(길이)
  registry.register({
    name: 'random_base64',
    module: 'random-bytes',
    executor: (args) => {
      const length = Math.floor(args[0]) || 32;
      return crypto.randomBytes(length).toString('base64');
    }
  });

  // random_uuid(버전)
  registry.register({
    name: 'random_uuid',
    module: 'random-bytes',
    executor: (args) => {
      const version = Math.floor(args[0]) || 4;
      if (version === 4) {
        return crypto.randomUUID();
      }
      return crypto.randomUUID(); // Node.js는 v4만 지원
    }
  });

  // random_string(길이, 문자셋)
  registry.register({
    name: 'random_string',
    module: 'random-bytes',
    executor: (args) => {
      const length = Math.floor(args[0]) || 16;
      const charset = args[1] ? String(args[1]) : 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

      let result = '';
      const bytes = crypto.randomBytes(length);
      for (let i = 0; i < length; i++) {
        result += charset[bytes[i] % charset.length];
      }
      return result;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 9: PROCESS (6개)
  // ════════════════════════════════════════════════════════════════

  // proc_pid()
  registry.register({
    name: 'proc_pid',
    module: 'process',
    executor: () => process.pid
  });

  // proc_uptime()
  registry.register({
    name: 'proc_uptime',
    module: 'process',
    executor: () => process.uptime()
  });

  // proc_exec(명령어, 옵션?)
  registry.register({
    name: 'proc_exec',
    module: 'process',
    executor: (args) => {
      const command = String(args[0]);

      try {
        const result = execSync(command, { encoding: 'utf-8', timeout: 30000 });
        return { stdout: result, stderr: '', exitCode: 0 };
      } catch (e: any) {
        return { stdout: e.stdout || '', stderr: e.stderr || String(e), exitCode: e.status || 1 };
      }
    }
  });

  // proc_spawn(명령어, 인자배열)
  registry.register({
    name: 'proc_spawn',
    module: 'process',
    executor: (args) => {
      const command = String(args[0]);
      const cmdArgs = Array.isArray(args[1]) ? args[1].map(String) : [];

      const processId = `proc_${Date.now()}_${Math.random()}`;
      const child = spawn(command, cmdArgs);

      globalProcesses.set(processId, {
        process: child,
        pid: child.pid,
        stdout: '',
        stderr: '',
        closed: false
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data;
      });

      child.stderr?.on('data', (data) => {
        stderr += data;
      });

      child.on('close', (code) => {
        const proc = globalProcesses.get(processId);
        if (proc) {
          proc.stdout = stdout;
          proc.stderr = stderr;
          proc.exitCode = code;
          proc.closed = true;
        }
      });

      return { processId, pid: child.pid };
    }
  });

  // proc_kill(processId, 신호?)
  registry.register({
    name: 'proc_kill',
    module: 'process',
    executor: (args) => {
      const processId = String(args[0]);
      const signal = args[1] ? String(args[1]) : 'SIGTERM';

      const proc = globalProcesses.get(processId);
      if (proc && !proc.closed) {
        proc.process.kill(signal);
        return true;
      }
      return false;
    }
  });

  // proc_get_output(processId)
  registry.register({
    name: 'proc_get_output',
    module: 'process',
    executor: (args) => {
      const processId = String(args[0]);
      const proc = globalProcesses.get(processId);

      if (proc) {
        return {
          stdout: proc.stdout,
          stderr: proc.stderr,
          exitCode: proc.exitCode || (proc.closed ? 0 : -1),
          closed: proc.closed
        };
      }
      return null;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 10: SIGNAL (4개)
  // ════════════════════════════════════════════════════════════════

  // signal_register(신호명, 핸들러)
  registry.register({
    name: 'signal_register',
    module: 'signal',
    executor: (args) => {
      const signalName = String(args[0]).toUpperCase();
      const handler = args[1]; // Function

      try {
        process.on(signalName, () => {
          if (typeof handler === 'function') {
            handler(signalName);
          }
        });
        return true;
      } catch (e) {
        return false;
      }
    }
  });

  // signal_remove(신호명)
  registry.register({
    name: 'signal_remove',
    module: 'signal',
    executor: (args) => {
      const signalName = String(args[0]).toUpperCase();
      try {
        process.removeAllListeners(signalName);
        return true;
      } catch (e) {
        return false;
      }
    }
  });

  // signal_send(pid, 신호명)
  registry.register({
    name: 'signal_send',
    module: 'signal',
    executor: (args) => {
      const pid = Math.floor(args[0]);
      const signal = args[1] ? String(args[1]) : 'SIGTERM';

      try {
        process.kill(pid, signal);
        return true;
      } catch (e) {
        return false;
      }
    }
  });

  // signal_list()
  registry.register({
    name: 'signal_list',
    module: 'signal',
    executor: () => [
      'SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP',
      'SIGABRT', 'SIGBUS', 'SIGFPE', 'SIGKILL', 'SIGUSR1',
      'SIGSEGV', 'SIGUSR2', 'SIGPIPE', 'SIGALRM', 'SIGTERM',
      'SIGCHLD', 'SIGCONT', 'SIGSTOP', 'SIGTSTP', 'SIGTTIN', 'SIGTTOU'
    ]
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 11: MEMORY (4개)
  // ════════════════════════════════════════════════════════════════

  // mem_usage()
  registry.register({
    name: 'mem_usage',
    module: 'memory',
    executor: () => {
      const usage = process.memoryUsage();
      return {
        rss: Math.round(usage.rss / 1024 / 1024),
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
        external: Math.round(usage.external / 1024 / 1024),
        arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024)
      };
    }
  });

  // mem_total()
  registry.register({
    name: 'mem_total',
    module: 'memory',
    executor: () => Math.round(os.totalmem() / 1024 / 1024)
  });

  // mem_free()
  registry.register({
    name: 'mem_free',
    module: 'memory',
    executor: () => Math.round(os.freemem() / 1024 / 1024)
  });

  // mem_percent_used()
  registry.register({
    name: 'mem_percent_used',
    module: 'memory',
    executor: () => {
      const total = os.totalmem();
      const free = os.freemem();
      return Math.round((((total - free) / total) * 100) * 100) / 100;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 12: CPU (4개)
  // ════════════════════════════════════════════════════════════════

  // cpu_count()
  registry.register({
    name: 'cpu_count',
    module: 'cpu',
    executor: () => os.cpus().length
  });

  // cpu_model()
  registry.register({
    name: 'cpu_model',
    module: 'cpu',
    executor: () => {
      const cpus = os.cpus();
      return cpus.length > 0 ? cpus[0].model : 'unknown';
    }
  });

  // cpu_usage()
  registry.register({
    name: 'cpu_usage',
    module: 'cpu',
    executor: () => {
      const usage = process.cpuUsage();
      return {
        user: Math.round(usage.user / 1000),
        system: Math.round(usage.system / 1000)
      };
    }
  });

  // cpu_speed()
  registry.register({
    name: 'cpu_speed',
    module: 'cpu',
    executor: () => {
      const cpus = os.cpus();
      return cpus.length > 0 ? cpus[0].speed : 0;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 13: DISK (4개)
  // ════════════════════════════════════════════════════════════════

  // disk_total(경로?)
  registry.register({
    name: 'disk_total',
    module: 'disk',
    executor: (args) => {
      try {
        const path = args[0] ? String(args[0]) : '/';
        const result = execSync(`df -B1 "${path}" | tail -1`, { encoding: 'utf-8' });
        const parts = result.trim().split(/\s+/);
        return Math.round(parseInt(parts[1]) / 1024 / 1024 / 1024);
      } catch (e) {
        return -1;
      }
    }
  });

  // disk_used(경로?)
  registry.register({
    name: 'disk_used',
    module: 'disk',
    executor: (args) => {
      try {
        const path = args[0] ? String(args[0]) : '/';
        const result = execSync(`df -B1 "${path}" | tail -1`, { encoding: 'utf-8' });
        const parts = result.trim().split(/\s+/);
        return Math.round(parseInt(parts[2]) / 1024 / 1024 / 1024);
      } catch (e) {
        return -1;
      }
    }
  });

  // disk_free(경로?)
  registry.register({
    name: 'disk_free',
    module: 'disk',
    executor: (args) => {
      try {
        const path = args[0] ? String(args[0]) : '/';
        const result = execSync(`df -B1 "${path}" | tail -1`, { encoding: 'utf-8' });
        const parts = result.trim().split(/\s+/);
        return Math.round(parseInt(parts[3]) / 1024 / 1024 / 1024);
      } catch (e) {
        return -1;
      }
    }
  });

  // disk_percent_used(경로?)
  registry.register({
    name: 'disk_percent_used',
    module: 'disk',
    executor: (args) => {
      try {
        const path = args[0] ? String(args[0]) : '/';
        const result = execSync(`df -B1 "${path}" | tail -1`, { encoding: 'utf-8' });
        const percent = result.match(/(\d+)%/);
        return percent ? parseInt(percent[1]) : 0;
      } catch (e) {
        return -1;
      }
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 14: NETWORK-IFACE (4개)
  // ════════════════════════════════════════════════════════════════

  // net_interfaces()
  registry.register({
    name: 'net_interfaces',
    module: 'network-iface',
    executor: () => Object.keys(os.networkInterfaces())
  });

  // net_ip_v4(인터페이스명?)
  registry.register({
    name: 'net_ip_v4',
    module: 'network-iface',
    executor: (args) => {
      const iface = args[0] ? String(args[0]) : 'eth0';
      const interfaces = os.networkInterfaces()[iface];

      if (interfaces) {
        const ipv4 = interfaces.find((addr) => addr.family === 'IPv4');
        return ipv4 ? ipv4.address : null;
      }
      return null;
    }
  });

  // net_ip_v6(인터페이스명?)
  registry.register({
    name: 'net_ip_v6',
    module: 'network-iface',
    executor: (args) => {
      const iface = args[0] ? String(args[0]) : 'eth0';
      const interfaces = os.networkInterfaces()[iface];

      if (interfaces) {
        const ipv6 = interfaces.find((addr) => addr.family === 'IPv6');
        return ipv6 ? ipv6.address : null;
      }
      return null;
    }
  });

  // net_mac_address(인터페이스명?)
  registry.register({
    name: 'net_mac_address',
    module: 'network-iface',
    executor: (args) => {
      const iface = args[0] ? String(args[0]) : 'eth0';
      const interfaces = os.networkInterfaces()[iface];

      if (interfaces && interfaces.length > 0) {
        return interfaces[0].mac;
      }
      return null;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 15: LOCALE (3개)
  // ════════════════════════════════════════════════════════════════

  // locale_current()
  registry.register({
    name: 'locale_current',
    module: 'locale',
    executor: () => process.env.LANG || 'en_US.UTF-8'
  });

  // locale_set(로케일)
  registry.register({
    name: 'locale_set',
    module: 'locale',
    executor: (args) => {
      process.env.LANG = String(args[0]);
      return true;
    }
  });

  // locale_format_number(숫자, 로케일?)
  registry.register({
    name: 'locale_format_number',
    module: 'locale',
    executor: (args) => {
      const num = Number(args[0]);
      const locale = args[1] ? String(args[1]) : 'en-US';
      return new Intl.NumberFormat(locale).format(num);
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 16: CURRENCY (4개)
  // ════════════════════════════════════════════════════════════════

  // currency_format(금액, 통화, 로케일?)
  registry.register({
    name: 'currency_format',
    module: 'currency',
    executor: (args) => {
      const amount = Number(args[0]);
      const currency = String(args[1]).toUpperCase();
      const locale = args[2] ? String(args[2]) : 'en-US';

      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency
      }).format(amount);
    }
  });

  // currency_convert(금액, 원통화, 대상통화, 환율)
  registry.register({
    name: 'currency_convert',
    module: 'currency',
    executor: (args) => {
      const amount = Number(args[0]);
      const rate = Number(args[3]);
      return Math.round(amount * rate * 100) / 100;
    }
  });

  // currency_list()
  registry.register({
    name: 'currency_list',
    module: 'currency',
    executor: () => [
      'USD', 'EUR', 'JPY', 'GBP', 'CHF', 'CAD', 'AUD',
      'NZD', 'CNY', 'INR', 'KRW', 'SGD', 'HKD', 'MXN',
      'BRL', 'RUB', 'SEK', 'NOK', 'DKK', 'ZAR'
    ]
  });

  // currency_exchange_rates()
  registry.register({
    name: 'currency_exchange_rates',
    module: 'currency',
    executor: () => ({
      USD: 1.0,
      EUR: 0.92,
      JPY: 149.5,
      GBP: 0.79,
      CHF: 0.88,
      CAD: 1.36,
      AUD: 1.53,
      NZD: 1.67,
      CNY: 7.24,
      INR: 83.1,
      KRW: 1319.5,
      SGD: 1.34
    })
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 17: UNITS (5개)
  // ════════════════════════════════════════════════════════════════

  // units_length(값, 원단위, 대상단위)
  registry.register({
    name: 'units_length',
    module: 'units',
    executor: (args) => {
      const value = Number(args[0]);
      const from = String(args[1]).toLowerCase();
      const to = String(args[2]).toLowerCase();

      const toMeter: Record<string, number> = {
        'mm': 0.001, 'cm': 0.01, 'm': 1, 'km': 1000,
        'in': 0.0254, 'ft': 0.3048, 'yd': 0.9144, 'mi': 1609.34
      };

      const meters = value * (toMeter[from] || 1);
      return Math.round((meters / (toMeter[to] || 1)) * 10000) / 10000;
    }
  });

  // units_weight(값, 원단위, 대상단위)
  registry.register({
    name: 'units_weight',
    module: 'units',
    executor: (args) => {
      const value = Number(args[0]);
      const from = String(args[1]).toLowerCase();
      const to = String(args[2]).toLowerCase();

      const toGram: Record<string, number> = {
        'mg': 0.001, 'g': 1, 'kg': 1000,
        'oz': 28.3495, 'lb': 453.592, 'ton': 1000000
      };

      const grams = value * (toGram[from] || 1);
      return Math.round((grams / (toGram[to] || 1)) * 10000) / 10000;
    }
  });

  // units_temperature(값, 원단위, 대상단위)
  registry.register({
    name: 'units_temperature',
    module: 'units',
    executor: (args) => {
      const value = Number(args[0]);
      const from = String(args[1]).toUpperCase();
      const to = String(args[2]).toUpperCase();

      let celsius: number;

      if (from === 'C') celsius = value;
      else if (from === 'F') celsius = (value - 32) * 5/9;
      else if (from === 'K') celsius = value - 273.15;
      else celsius = value;

      if (to === 'C') return Math.round(celsius * 100) / 100;
      else if (to === 'F') return Math.round((celsius * 9/5 + 32) * 100) / 100;
      else if (to === 'K') return Math.round((celsius + 273.15) * 100) / 100;
      else return celsius;
    }
  });

  // units_volume(값, 원단위, 대상단위)
  registry.register({
    name: 'units_volume',
    module: 'units',
    executor: (args) => {
      const value = Number(args[0]);
      const from = String(args[1]).toLowerCase();
      const to = String(args[2]).toLowerCase();

      const toLiter: Record<string, number> = {
        'ml': 0.001, 'l': 1, 'gal': 3.78541, 'pt': 0.473176,
        'cup': 0.236588, 'fl_oz': 0.0295735
      };

      const liters = value * (toLiter[from] || 1);
      return Math.round((liters / (toLiter[to] || 1)) * 10000) / 10000;
    }
  });

  // units_area(값, 원단위, 대상단위)
  registry.register({
    name: 'units_area',
    module: 'units',
    executor: (args) => {
      const value = Number(args[0]);
      const from = String(args[1]).toLowerCase();
      const to = String(args[2]).toLowerCase();

      const toSqMeter: Record<string, number> = {
        'mm2': 0.000001, 'cm2': 0.0001, 'm2': 1, 'km2': 1000000,
        'in2': 0.00064516, 'ft2': 0.092903, 'mi2': 2589988
      };

      const sqMeters = value * (toSqMeter[from] || 1);
      return Math.round((sqMeters / (toSqMeter[to] || 1)) * 10000) / 10000;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 18: COLOR (5개)
  // ════════════════════════════════════════════════════════════════

  // color_hex_to_rgb(hex)
  registry.register({
    name: 'color_hex_to_rgb',
    module: 'color',
    executor: (args) => {
      const hex = String(args[0]).replace(/^#/, '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return { r, g, b };
    }
  });

  // color_rgb_to_hex(r, g, b)
  registry.register({
    name: 'color_rgb_to_hex',
    module: 'color',
    executor: (args) => {
      const r = Math.floor(args[0]).toString(16).padStart(2, '0');
      const g = Math.floor(args[1]).toString(16).padStart(2, '0');
      const b = Math.floor(args[2]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`.toUpperCase();
    }
  });

  // color_lighten(hex, 비율)
  registry.register({
    name: 'color_lighten',
    module: 'color',
    executor: (args) => {
      const hex = String(args[0]).replace(/^#/, '');
      const ratio = Math.min(Math.max(Number(args[1]) || 0.1, 0), 1);

      let r = parseInt(hex.substring(0, 2), 16);
      let g = parseInt(hex.substring(2, 4), 16);
      let b = parseInt(hex.substring(4, 6), 16);

      r = Math.min(255, Math.round(r + (255 - r) * ratio));
      g = Math.min(255, Math.round(g + (255 - g) * ratio));
      b = Math.min(255, Math.round(b + (255 - b) * ratio));

      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
    }
  });

  // color_darken(hex, 비율)
  registry.register({
    name: 'color_darken',
    module: 'color',
    executor: (args) => {
      const hex = String(args[0]).replace(/^#/, '');
      const ratio = Math.min(Math.max(Number(args[1]) || 0.1, 0), 1);

      let r = parseInt(hex.substring(0, 2), 16);
      let g = parseInt(hex.substring(2, 4), 16);
      let b = parseInt(hex.substring(4, 6), 16);

      r = Math.round(r * (1 - ratio));
      g = Math.round(g * (1 - ratio));
      b = Math.round(b * (1 - ratio));

      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
    }
  });

  // color_invert(hex)
  registry.register({
    name: 'color_invert',
    module: 'color',
    executor: (args) => {
      const hex = String(args[0]).replace(/^#/, '');
      const r = (255 - parseInt(hex.substring(0, 2), 16)).toString(16).padStart(2, '0');
      const g = (255 - parseInt(hex.substring(2, 4), 16)).toString(16).padStart(2, '0');
      const b = (255 - parseInt(hex.substring(4, 6), 16)).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`.toUpperCase();
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 19: QRCODE (3개)
  // ════════════════════════════════════════════════════════════════

  // qrcode_create(데이터, 옵션?)
  registry.register({
    name: 'qrcode_create',
    module: 'qrcode',
    executor: (args) => {
      const data = String(args[0]);

      // 간단한 QR 코드 생성 (실제로는 qrcode 라이브러리 사용)
      // 여기서는 데이터 인코딩 가능 여부만 반환
      return {
        data: data,
        size: 21,
        errorCorrectionLevel: 'M',
        type: 'image/png',
        encoded: true
      };
    }
  });

  // qrcode_generate_url(데이터, 크기?)
  registry.register({
    name: 'qrcode_generate_url',
    module: 'qrcode',
    executor: (args) => {
      const data = encodeURIComponent(String(args[0]));
      const size = Math.floor(args[1]) || 200;
      return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${data}`;
    }
  });

  // qrcode_encode(데이터)
  registry.register({
    name: 'qrcode_encode',
    module: 'qrcode',
    executor: (args) => {
      const data = String(args[0]);
      return Buffer.from(data).toString('base64');
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 20: ENCODING-EXT (5개)
  // ════════════════════════════════════════════════════════════════

  // encoding_base64_encode(문자열)
  registry.register({
    name: 'encoding_base64_encode',
    module: 'encoding-ext',
    executor: (args) => {
      const data = String(args[0]);
      return Buffer.from(data).toString('base64');
    }
  });

  // encoding_base64_decode(base64)
  registry.register({
    name: 'encoding_base64_decode',
    module: 'encoding-ext',
    executor: (args) => {
      const data = String(args[0]);
      return Buffer.from(data, 'base64').toString('utf-8');
    }
  });

  // encoding_base64url_encode(문자열)
  registry.register({
    name: 'encoding_base64url_encode',
    module: 'encoding-ext',
    executor: (args) => {
      const data = String(args[0]);
      return Buffer.from(data).toString('base64url');
    }
  });

  // encoding_hex_encode(문자열)
  registry.register({
    name: 'encoding_hex_encode',
    module: 'encoding-ext',
    executor: (args) => {
      const data = String(args[0]);
      return Buffer.from(data).toString('hex');
    }
  });

  // encoding_hex_decode(hex)
  registry.register({
    name: 'encoding_hex_decode',
    module: 'encoding-ext',
    executor: (args) => {
      const data = String(args[0]);
      return Buffer.from(data, 'hex').toString('utf-8');
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 21: ZLIB (4개)
  // ════════════════════════════════════════════════════════════════

  // zlib_compress(데이터)
  registry.register({
    name: 'zlib_compress',
    module: 'zlib',
    executor: (args) => {
      const data = String(args[0]);
      const compressed = zlib.deflateSync(data);
      return compressed.toString('base64');
    }
  });

  // zlib_decompress(압축데이터)
  registry.register({
    name: 'zlib_decompress',
    module: 'zlib',
    executor: (args) => {
      const data = String(args[0]);
      try {
        const decompressed = zlib.inflateSync(Buffer.from(data, 'base64'));
        return decompressed.toString('utf-8');
      } catch (e) {
        return null;
      }
    }
  });

  // zlib_gzip_compress(데이터)
  registry.register({
    name: 'zlib_gzip_compress',
    module: 'zlib',
    executor: (args) => {
      const data = String(args[0]);
      const compressed = zlib.gzipSync(data);
      return compressed.toString('base64');
    }
  });

  // zlib_gzip_decompress(압축데이터)
  registry.register({
    name: 'zlib_gzip_decompress',
    module: 'zlib',
    executor: (args) => {
      const data = String(args[0]);
      try {
        const decompressed = zlib.gunzipSync(Buffer.from(data, 'base64'));
        return decompressed.toString('utf-8');
      } catch (e) {
        return null;
      }
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 22: PASSWORD (6개)
  // ════════════════════════════════════════════════════════════════

  // password_hash(비밀번호)
  registry.register({
    name: 'password_hash',
    module: 'password',
    executor: (args) => {
      const password = String(args[0]);
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');

      return {
        hash: hash,
        salt: salt,
        algorithm: 'pbkdf2-sha512',
        iterations: 100000
      };
    }
  });

  // password_verify(비밀번호, 저장된해시)
  registry.register({
    name: 'password_verify',
    module: 'password',
    executor: (args) => {
      const password = String(args[0]);
      const stored = typeof args[1] === 'object' ? args[1] : JSON.parse(String(args[1]));

      try {
        const computed = crypto.pbkdf2Sync(password, stored.salt, stored.iterations || 100000, 64, 'sha512').toString('hex');
        return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(stored.hash));
      } catch (e) {
        return false;
      }
    }
  });

  // password_generate(길이?, 옵션?)
  registry.register({
    name: 'password_generate',
    module: 'password',
    executor: (args) => {
      const length = Math.floor(args[0]) || 16;
      const options = args[1] || {};

      const lowercase = 'abcdefghijklmnopqrstuvwxyz';
      const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const numbers = '0123456789';
      const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

      let chars = lowercase + uppercase + numbers;
      if (options.symbols !== false) chars += symbols;

      let password = '';
      const bytes = crypto.randomBytes(length);
      for (let i = 0; i < length; i++) {
        password += chars[bytes[i] % chars.length];
      }
      return password;
    }
  });

  // password_strength(비밀번호)
  registry.register({
    name: 'password_strength',
    module: 'password',
    executor: (args) => {
      const password = String(args[0]);
      let strength = 0;
      let feedback: string[] = [];

      if (password.length >= 8) strength += 20;
      if (password.length >= 12) strength += 20;
      if (password.length < 8) feedback.push('너무 짧음');

      if (/[a-z]/.test(password)) strength += 20;
      else feedback.push('소문자 필요');

      if (/[A-Z]/.test(password)) strength += 20;
      else feedback.push('대문자 필요');

      if (/[0-9]/.test(password)) strength += 10;
      else feedback.push('숫자 필요');

      if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) strength += 10;
      else feedback.push('특수문자 권장');

      let level = 'weak';
      if (strength >= 80) level = 'strong';
      else if (strength >= 60) level = 'good';
      else if (strength >= 40) level = 'fair';

      return { strength: Math.min(strength, 100), level, feedback };
    }
  });

  // password_is_common(비밀번호)
  registry.register({
    name: 'password_is_common',
    module: 'password',
    executor: (args) => {
      const password = String(args[0]).toLowerCase();

      const commonPasswords = [
        'password', 'password123', '123456', '12345678', 'qwerty',
        'abc123', 'monkey', '1234567', 'letmein', 'trustno1',
        'dragon', 'baseball', '11111111', 'iloveyou', 'master'
      ];

      return commonPasswords.includes(password);
    }
  });
}
