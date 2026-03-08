/**
 * FreeLang v2 stdlib — stdlib-nodemailer.ts
 *
 * npm nodemailer 완전 대체 네이티브 구현
 * Node.js 내장 net / tls 모듈만 사용 (외부 npm 0개)
 *
 * 등록 함수:
 *   nodemailer_connect(host, port, secure, user, pass, timeout) → connectionId: string
 *   nodemailer_send(connId, from, to, cc, bcc, subject, text, html, replyTo, priority) → MailResult map
 *   nodemailer_send_attachment(connId, mailJson) → MailResult map
 *   nodemailer_verify(connId) → bool
 *   nodemailer_close(connId) → void
 *   nodemailer_basename(filePath) → string
 *   nodemailer_extname(filePath) → string
 *   nodemailer_mime_type(ext) → string
 *
 * SMTP 흐름:
 *   1. TCP 연결 (net.connect 또는 tls.connect)
 *   2. EHLO 핸드셰이크
 *   3. STARTTLS 업그레이드 (포트 587, secure=false)
 *   4. AUTH LOGIN (Base64 user/pass)
 *   5. MAIL FROM / RCPT TO / DATA
 *   6. MIME 본문 조립 (multipart/mixed for attachments)
 *   7. QUIT
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';
import * as net from 'net';
import * as tls from 'tls';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// 내부 타입 정의
// ─────────────────────────────────────────────────────────────────────────────

interface SmtpConnection {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  timeout: number;
  id: string;
}

interface MailResultInternal {
  accepted: string[];
  rejected: string[];
  messageId: string;
  error: string;
}

interface AttachmentSpec {
  filename: string;
  path?: string;
  content?: string;
  contentType: string;
  encoding?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 커넥션 레지스트리
// ─────────────────────────────────────────────────────────────────────────────

const connections = new Map<string, SmtpConnection>();

// ─────────────────────────────────────────────────────────────────────────────
// MIME 유틸리티
// ─────────────────────────────────────────────────────────────────────────────

const MIME_TYPES: Record<string, string> = {
  '.pdf':  'application/pdf',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.txt':  'text/plain',
  '.html': 'text/html',
  '.csv':  'text/csv',
  '.zip':  'application/zip',
  '.gz':   'application/gzip',
  '.tar':  'application/x-tar',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.json': 'application/json',
  '.xml':  'application/xml',
  '.mp3':  'audio/mpeg',
  '.mp4':  'video/mp4',
};

function getMimeType(ext: string): string {
  return MIME_TYPES[ext.toLowerCase()] ?? 'application/octet-stream';
}

function base64Encode(str: string): string {
  return Buffer.from(str).toString('base64');
}

function generateMessageId(domain: string): string {
  const rand = crypto.randomBytes(12).toString('hex');
  const ts = Date.now();
  return `<${ts}.${rand}@${domain}>`;
}

function extractDomain(email: string): string {
  const match = email.match(/@([^>]+)/);
  return match ? match[1] : 'localhost';
}

// ─────────────────────────────────────────────────────────────────────────────
// MIME 본문 조립
// ─────────────────────────────────────────────────────────────────────────────

function buildMimeBody(opts: {
  from: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  text: string;
  html: string;
  replyTo: string;
  priority: string;
  attachments: AttachmentSpec[];
  messageId: string;
  date: string;
}): string {
  const boundary = `----=_Part_${crypto.randomBytes(8).toString('hex')}`;
  const hasHtml = opts.html && opts.html.trim().length > 0;
  const hasAttachments = opts.attachments.length > 0;

  const priorityHeader = opts.priority === 'high'
    ? 'X-Priority: 1\r\nX-MSMail-Priority: High\r\nImportance: High\r\n'
    : opts.priority === 'low'
      ? 'X-Priority: 5\r\nX-MSMail-Priority: Low\r\nImportance: Low\r\n'
      : '';

  const replyToHeader = opts.replyTo ? `Reply-To: ${opts.replyTo}\r\n` : '';
  const ccHeader = opts.cc ? `Cc: ${opts.cc}\r\n` : '';

  // 헤더 공통 부분
  let headers = [
    `Message-ID: ${opts.messageId}`,
    `Date: ${opts.date}`,
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    ccHeader.trimEnd(),
    replyToHeader.trimEnd(),
    `Subject: =?UTF-8?B?${base64Encode(opts.subject)}?=`,
    `MIME-Version: 1.0`,
    priorityHeader.trimEnd(),
  ].filter(Boolean).join('\r\n');

  // 첨부파일 없음 + plain text 전용
  if (!hasAttachments && !hasHtml) {
    return `${headers}\r\n`
      + `Content-Type: text/plain; charset=UTF-8\r\n`
      + `Content-Transfer-Encoding: base64\r\n`
      + `\r\n`
      + Buffer.from(opts.text || '').toString('base64').match(/.{1,76}/g)!.join('\r\n')
      + `\r\n`;
  }

  // 첨부파일 없음 + HTML 전용
  if (!hasAttachments && hasHtml) {
    const altBoundary = `----=_Alt_${crypto.randomBytes(8).toString('hex')}`;
    return `${headers}\r\n`
      + `Content-Type: multipart/alternative; boundary="${altBoundary}"\r\n`
      + `\r\n`
      + `--${altBoundary}\r\n`
      + `Content-Type: text/plain; charset=UTF-8\r\n`
      + `Content-Transfer-Encoding: base64\r\n`
      + `\r\n`
      + Buffer.from(opts.text || opts.html.replace(/<[^>]+>/g, '')).toString('base64').match(/.{1,76}/g)!.join('\r\n')
      + `\r\n`
      + `--${altBoundary}\r\n`
      + `Content-Type: text/html; charset=UTF-8\r\n`
      + `Content-Transfer-Encoding: base64\r\n`
      + `\r\n`
      + Buffer.from(opts.html).toString('base64').match(/.{1,76}/g)!.join('\r\n')
      + `\r\n`
      + `--${altBoundary}--\r\n`;
  }

  // 첨부파일 있음 — multipart/mixed
  let body = `${headers}\r\n`
    + `Content-Type: multipart/mixed; boundary="${boundary}"\r\n`
    + `\r\n`;

  // 본문 파트
  if (hasHtml) {
    body += `--${boundary}\r\n`
      + `Content-Type: text/html; charset=UTF-8\r\n`
      + `Content-Transfer-Encoding: base64\r\n`
      + `\r\n`
      + Buffer.from(opts.html).toString('base64').match(/.{1,76}/g)!.join('\r\n')
      + `\r\n`;
  } else {
    body += `--${boundary}\r\n`
      + `Content-Type: text/plain; charset=UTF-8\r\n`
      + `Content-Transfer-Encoding: base64\r\n`
      + `\r\n`
      + Buffer.from(opts.text || '').toString('base64').match(/.{1,76}/g)!.join('\r\n')
      + `\r\n`;
  }

  // 첨부파일 파트
  for (const att of opts.attachments) {
    let attData: Buffer;
    try {
      if (att.path && fs.existsSync(att.path)) {
        attData = fs.readFileSync(att.path);
      } else if (att.content) {
        attData = Buffer.from(att.content, (att.encoding as BufferEncoding) || 'utf8');
      } else {
        continue;
      }
    } catch {
      continue;
    }

    const contentType = att.contentType || getMimeType(path.extname(att.filename));
    body += `--${boundary}\r\n`
      + `Content-Type: ${contentType}; name="${att.filename}"\r\n`
      + `Content-Transfer-Encoding: base64\r\n`
      + `Content-Disposition: attachment; filename="${att.filename}"\r\n`
      + `\r\n`
      + attData.toString('base64').match(/.{1,76}/g)!.join('\r\n')
      + `\r\n`;
  }

  body += `--${boundary}--\r\n`;
  return body;
}

// ─────────────────────────────────────────────────────────────────────────────
// 핵심 SMTP 전송 (Promise-based, 내부 전용)
// ─────────────────────────────────────────────────────────────────────────────

function smtpSend(conn: SmtpConnection, mimeBody: string, recipients: string[]): Promise<MailResultInternal> {
  return new Promise((resolve) => {
    const messageId = generateMessageId(extractDomain(conn.user || 'localhost'));
    const accepted: string[] = [];
    const rejected: string[] = [];

    let socket: net.Socket;
    let phase = 'GREETING';
    let buffer = '';
    let tlsUpgraded = false;

    const timeout = conn.timeout || 10000;

    function send(cmd: string): void {
      socket.write(cmd + '\r\n');
    }

    function done(error = ''): void {
      try { socket.destroy(); } catch {}
      resolve({ accepted, rejected, messageId, error });
    }

    function handleLine(line: string): void {
      // 3자리 응답 코드 파싱
      const code = parseInt(line.slice(0, 3), 10);
      const isOk = code >= 200 && code < 400;

      if (!isOk && phase !== 'STARTTLS_WAIT') {
        done(`SMTP 오류 [${phase}]: ${line}`);
        return;
      }

      switch (phase) {
        case 'GREETING':
          phase = 'EHLO';
          send(`EHLO freelang`);
          break;

        case 'EHLO':
          if (line.startsWith('250 ') || line.startsWith('250-') && !line.includes('250-')) {
            // EHLO 멀티라인 — 마지막 줄(250 )에서 다음 단계
          }
          if (line.startsWith('250 ')) {
            if (!tlsUpgraded && !conn.secure && conn.port === 587) {
              phase = 'STARTTLS';
              send('STARTTLS');
            } else {
              phase = 'AUTH';
              send('AUTH LOGIN');
            }
          }
          break;

        case 'STARTTLS':
          if (code === 220) {
            // STARTTLS 업그레이드
            phase = 'STARTTLS_WAIT';
            const plainSocket = socket;
            const tlsSocket = tls.connect({
              socket: plainSocket as any,
              host: conn.host,
              rejectUnauthorized: false,
            });
            tlsSocket.on('secure', () => {
              socket = tlsSocket as any;
              tlsUpgraded = true;
              buffer = '';
              phase = 'EHLO2';
              send(`EHLO freelang`);
              tlsSocket.on('data', (d: Buffer) => {
                buffer += d.toString();
                const lines = buffer.split('\r\n');
                buffer = lines.pop()!;
                for (const l of lines) {
                  if (l.trim()) handleLine(l);
                }
              });
            });
            tlsSocket.on('error', (e: Error) => done(`TLS 오류: ${e.message}`));
          } else {
            // STARTTLS 미지원 → 평문 AUTH
            phase = 'AUTH';
            send('AUTH LOGIN');
          }
          break;

        case 'EHLO2':
          if (line.startsWith('250 ')) {
            phase = 'AUTH';
            send('AUTH LOGIN');
          }
          break;

        case 'AUTH':
          if (code === 334) {
            phase = 'AUTH_USER';
            send(base64Encode(conn.user));
          } else if (code === 235) {
            // 인증 완료 (일부 서버)
            phase = 'MAIL_FROM';
            const fromAddr = conn.user;
            send(`MAIL FROM:<${fromAddr}>`);
          } else {
            done(`AUTH 실패: ${line}`);
          }
          break;

        case 'AUTH_USER':
          phase = 'AUTH_PASS';
          send(base64Encode(conn.pass));
          break;

        case 'AUTH_PASS':
          if (code === 235) {
            phase = 'MAIL_FROM';
            send(`MAIL FROM:<${conn.user}>`);
          } else {
            done(`인증 실패 (비밀번호): ${line}`);
          }
          break;

        case 'MAIL_FROM':
          phase = 'RCPT_TO';
          // 첫 번째 수신자
          if (recipients.length > 0) {
            send(`RCPT TO:<${recipients[0]}>`);
          } else {
            done('수신자 없음');
          }
          break;

        case 'RCPT_TO': {
          const currentIdx = accepted.length + rejected.length;
          if (code >= 200 && code < 400) {
            accepted.push(recipients[currentIdx - 1] || recipients[0]);
          } else {
            rejected.push(recipients[currentIdx - 1] || recipients[0]);
          }
          if (currentIdx < recipients.length) {
            send(`RCPT TO:<${recipients[currentIdx]}>`);
          } else {
            phase = 'DATA';
            send('DATA');
          }
          break;
        }

        case 'DATA':
          if (code === 354) {
            phase = 'BODY';
            // 본문 전송 + 종료 마커
            socket.write(mimeBody);
            socket.write('\r\n.\r\n');
          } else {
            done(`DATA 실패: ${line}`);
          }
          break;

        case 'BODY':
          if (code === 250) {
            phase = 'QUIT';
            send('QUIT');
          } else {
            done(`본문 전송 실패: ${line}`);
          }
          break;

        case 'QUIT':
          done(); // 성공
          break;
      }
    }

    // TCP 연결
    try {
      if (conn.secure) {
        socket = tls.connect({
          host: conn.host,
          port: conn.port,
          rejectUnauthorized: false,
        }) as any;
      } else {
        socket = net.connect({ host: conn.host, port: conn.port });
      }
    } catch (e: any) {
      resolve({ accepted: [], rejected: recipients, messageId: '', error: e.message });
      return;
    }

    socket.setTimeout(timeout);
    socket.on('timeout', () => done(`타임아웃 (${timeout}ms)`));
    socket.on('error', (e) => done(`소켓 오류: ${e.message}`));
    socket.on('data', (data: Buffer) => {
      if (phase === 'STARTTLS_WAIT') return;
      buffer += data.toString();
      const lines = buffer.split('\r\n');
      buffer = lines.pop()!;
      for (const line of lines) {
        if (line.trim()) handleLine(line);
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 동기 래퍼 (FreeLang VM은 동기 실행 → child_process workaround)
// ─────────────────────────────────────────────────────────────────────────────

function runSync<T>(fn: () => Promise<T>, fallback: T): T {
  // deasync 없이도 작동하는 방식:
  // Atomics.wait + SharedArrayBuffer로 동기 대기
  let result: T = fallback;
  let done = false;
  fn().then(r => { result = r; done = true; }).catch(() => { done = true; });

  const limit = Date.now() + 15000;
  while (!done && Date.now() < limit) {
    // 짧은 블로킹 대기 (Node.js event loop spin)
    const sa = new SharedArrayBuffer(4);
    Atomics.wait(new Int32Array(sa), 0, 0, 50);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// resultToMap — MailResultInternal → FreeLang Map
// ─────────────────────────────────────────────────────────────────────────────

function resultToMap(r: MailResultInternal): Map<string, any> {
  const m = new Map<string, any>();
  m.set('accepted', r.accepted);
  m.set('rejected', r.rejected);
  m.set('messageId', r.messageId);
  m.set('error', r.error);
  return m;
}

// ─────────────────────────────────────────────────────────────────────────────
// 수신자 문자열 파싱 → 주소 배열
// ─────────────────────────────────────────────────────────────────────────────

function parseRecipients(str: string): string[] {
  if (!str || !str.trim()) return [];
  return str.split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(addr => {
      const match = addr.match(/<([^>]+)>/);
      return match ? match[1] : addr;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// registerNodemailerFunctions — 메인 등록 함수
// ─────────────────────────────────────────────────────────────────────────────

export function registerNodemailerFunctions(registry: NativeFunctionRegistry): void {

  // ── nodemailer_connect ─────────────────────────────────────────────────────
  // nodemailer_connect(host, port, secure, user, pass, timeout) → string (connectionId)
  registry.register({
    name: 'nodemailer_connect',
    module: 'nodemailer',
    executor: (args) => {
      const [host, port, secure, user, pass, timeout] = args;
      const id = `smtp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const conn: SmtpConnection = {
        host:    String(host  ?? 'localhost'),
        port:    Number(port  ?? 587),
        secure:  Boolean(secure ?? false),
        user:    String(user  ?? ''),
        pass:    String(pass  ?? ''),
        timeout: Number(timeout ?? 10000),
        id,
      };
      connections.set(id, conn);
      return id;
    }
  });

  // ── nodemailer_send ────────────────────────────────────────────────────────
  // nodemailer_send(connId, from, to, cc, bcc, subject, text, html, replyTo, priority) → map
  registry.register({
    name: 'nodemailer_send',
    module: 'nodemailer',
    executor: (args) => {
      const [connId, from, to, cc, bcc, subject, text, html, replyTo, priority] = args;
      const conn = connections.get(String(connId));
      if (!conn) {
        return resultToMap({ accepted: [], rejected: [], messageId: '', error: '연결을 찾을 수 없음: ' + connId });
      }

      const toStr    = String(to    ?? '');
      const ccStr    = String(cc    ?? '');
      const bccStr   = String(bcc   ?? '');
      const fromStr  = String(from  ?? conn.user);

      const allRecipients = [
        ...parseRecipients(toStr),
        ...parseRecipients(ccStr),
        ...parseRecipients(bccStr),
      ];

      if (allRecipients.length === 0) {
        return resultToMap({ accepted: [], rejected: [], messageId: '', error: '수신자를 지정하세요' });
      }

      const messageId = generateMessageId(extractDomain(fromStr));
      const mimeBody = buildMimeBody({
        from: fromStr,
        to: toStr,
        cc: ccStr,
        bcc: bccStr,
        subject: String(subject ?? ''),
        text:    String(text    ?? ''),
        html:    String(html    ?? ''),
        replyTo: String(replyTo ?? ''),
        priority: String(priority ?? 'normal'),
        attachments: [],
        messageId,
        date: new Date().toUTCString(),
      });

      const result = runSync(
        () => smtpSend(conn, mimeBody, allRecipients),
        { accepted: [], rejected: allRecipients, messageId: '', error: '타임아웃' }
      );
      return resultToMap(result);
    }
  });

  // ── nodemailer_send_attachment ─────────────────────────────────────────────
  // nodemailer_send_attachment(connId, mailJson) → map
  registry.register({
    name: 'nodemailer_send_attachment',
    module: 'nodemailer',
    executor: (args) => {
      const [connId, mailJson] = args;
      const conn = connections.get(String(connId));
      if (!conn) {
        return resultToMap({ accepted: [], rejected: [], messageId: '', error: '연결을 찾을 수 없음: ' + connId });
      }

      let opts: any = {};
      try {
        opts = JSON.parse(String(mailJson ?? '{}'));
      } catch (e: any) {
        return resultToMap({ accepted: [], rejected: [], messageId: '', error: 'JSON 파싱 오류: ' + e.message });
      }

      const fromStr = String(opts.from ?? conn.user);
      const toStr   = String(opts.to   ?? '');
      const ccStr   = String(opts.cc   ?? '');
      const bccStr  = String(opts.bcc  ?? '');

      const allRecipients = [
        ...parseRecipients(toStr),
        ...parseRecipients(ccStr),
        ...parseRecipients(bccStr),
      ];

      const attachments: AttachmentSpec[] = Array.isArray(opts.attachments)
        ? opts.attachments.map((a: any) => ({
            filename:    String(a.filename    ?? 'file'),
            path:        a.path        ? String(a.path)        : undefined,
            content:     a.content     ? String(a.content)     : undefined,
            contentType: String(a.contentType ?? 'application/octet-stream'),
            encoding:    String(a.encoding   ?? 'base64'),
          }))
        : [];

      const messageId = generateMessageId(extractDomain(fromStr));
      const mimeBody = buildMimeBody({
        from:     fromStr,
        to:       toStr,
        cc:       ccStr,
        bcc:      bccStr,
        subject:  String(opts.subject  ?? ''),
        text:     String(opts.text     ?? ''),
        html:     String(opts.html     ?? ''),
        replyTo:  String(opts.replyTo  ?? ''),
        priority: String(opts.priority ?? 'normal'),
        attachments,
        messageId,
        date: new Date().toUTCString(),
      });

      const result = runSync(
        () => smtpSend(conn, mimeBody, allRecipients),
        { accepted: [], rejected: allRecipients, messageId: '', error: '타임아웃' }
      );
      return resultToMap(result);
    }
  });

  // ── nodemailer_verify ──────────────────────────────────────────────────────
  // nodemailer_verify(connId) → bool
  registry.register({
    name: 'nodemailer_verify',
    module: 'nodemailer',
    executor: (args) => {
      const conn = connections.get(String(args[0] ?? ''));
      if (!conn) return false;

      // EHLO 핸드셰이크만 수행하여 연결 가능 여부 확인
      let verified = false;
      let done = false;

      const doVerify = (): Promise<boolean> => new Promise((resolve) => {
        let socket: net.Socket;
        let phase = 'GREETING';
        let buf = '';

        function cleanup(ok: boolean) {
          try { socket.destroy(); } catch {}
          resolve(ok);
        }

        function onData(data: Buffer) {
          buf += data.toString();
          const lines = buf.split('\r\n');
          buf = lines.pop()!;
          for (const line of lines) {
            const code = parseInt(line.slice(0, 3), 10);
            if (phase === 'GREETING' && code === 220) {
              phase = 'EHLO';
              socket.write('EHLO freelang\r\n');
            } else if (phase === 'EHLO' && line.startsWith('250 ')) {
              socket.write('QUIT\r\n');
              cleanup(true);
            } else if (code >= 400) {
              cleanup(false);
            }
          }
        }

        try {
          socket = conn.secure
            ? tls.connect({ host: conn.host, port: conn.port, rejectUnauthorized: false }) as any
            : net.connect({ host: conn.host, port: conn.port });

          socket.setTimeout(conn.timeout);
          socket.on('timeout', () => cleanup(false));
          socket.on('error',   () => cleanup(false));
          socket.on('data', onData);
        } catch {
          resolve(false);
        }
      });

      const sa = new SharedArrayBuffer(4);
      doVerify().then(r => { verified = r; done = true; }).catch(() => { done = true; });
      const limit = Date.now() + conn.timeout + 1000;
      while (!done && Date.now() < limit) {
        Atomics.wait(new Int32Array(sa), 0, 0, 50);
      }
      return verified;
    }
  });

  // ── nodemailer_close ───────────────────────────────────────────────────────
  // nodemailer_close(connId) → void
  registry.register({
    name: 'nodemailer_close',
    module: 'nodemailer',
    executor: (args) => {
      const id = String(args[0] ?? '');
      connections.delete(id);
      return null;
    }
  });

  // ── nodemailer_basename ────────────────────────────────────────────────────
  // nodemailer_basename(filePath) → string
  registry.register({
    name: 'nodemailer_basename',
    module: 'nodemailer',
    executor: (args) => path.basename(String(args[0] ?? ''))
  });

  // ── nodemailer_extname ─────────────────────────────────────────────────────
  // nodemailer_extname(filePath) → string
  registry.register({
    name: 'nodemailer_extname',
    module: 'nodemailer',
    executor: (args) => path.extname(String(args[0] ?? ''))
  });

  // ── nodemailer_mime_type ───────────────────────────────────────────────────
  // nodemailer_mime_type(ext) → string
  registry.register({
    name: 'nodemailer_mime_type',
    module: 'nodemailer',
    executor: (args) => getMimeType(String(args[0] ?? ''))
  });
}
