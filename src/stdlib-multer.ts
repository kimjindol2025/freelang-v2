/**
 * FreeLang v2 - stdlib-multer: 파일 업로드 네이티브 함수
 *
 * npm multer 완전 대체 구현
 * multipart/form-data 파싱 및 파일 저장
 *
 * 등록 함수 목록:
 *   multer_ensure_dir(dirPath)                    → void
 *   multer_get_boundary(contentType)              → string
 *   multer_parse_multipart(body, boundary)        → array
 *   multer_save_file(data, dest, filename)        → string
 *   multer_generate_filename(originalname)        → string
 *   multer_get_mimetype(filename)                 → string
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export function registerMulterFunctions(registry: NativeFunctionRegistry): void {

  // ════════════════════════════════════════════════════════════════
  // multer_ensure_dir: 디렉터리 재귀 생성
  // ════════════════════════════════════════════════════════════════

  // multer_ensure_dir(dirPath) → void
  // 지정된 경로의 디렉터리가 없으면 재귀적으로 생성
  // 이미 존재하면 아무 동작도 하지 않음
  registry.register({
    name: 'multer_ensure_dir',
    module: 'multer',
    executor: (args) => {
      const dirPath = String(args[0]);
      try {
        fs.mkdirSync(dirPath, { recursive: true });
        return null;
      } catch (err: any) {
        // 생성 실패 시 에러 객체 반환 (FreeLang에서 null 체크 가능)
        return { error: err.message };
      }
    }
  });

  // ════════════════════════════════════════════════════════════════
  // multer_get_boundary: Content-Type 헤더에서 boundary 추출
  // ════════════════════════════════════════════════════════════════

  // multer_get_boundary(contentType) → string
  // "multipart/form-data; boundary=XYZ" 형식에서 "XYZ" 추출
  // boundary가 없으면 빈 문자열 반환
  registry.register({
    name: 'multer_get_boundary',
    module: 'multer',
    executor: (args) => {
      const contentType = String(args[0] || '');

      // boundary= 파라미터 위치 탐색
      const boundaryIndex = contentType.indexOf('boundary=');
      if (boundaryIndex === -1) {
        return '';
      }

      // boundary 값 추출 (세미콜론 이전까지)
      let boundary = contentType.slice(boundaryIndex + 'boundary='.length).trim();

      // 세미콜론이 있는 경우 앞부분만 사용
      const semicolonIdx = boundary.indexOf(';');
      if (semicolonIdx !== -1) {
        boundary = boundary.slice(0, semicolonIdx).trim();
      }

      // 따옴표 제거 (boundary="XYZ" 형식 지원)
      if (boundary.startsWith('"') && boundary.endsWith('"')) {
        boundary = boundary.slice(1, -1);
      }

      return boundary;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // multer_parse_multipart: multipart/form-data 본문 파싱
  // ════════════════════════════════════════════════════════════════

  // multer_parse_multipart(body, boundary) → array of parts
  // 각 파트: { fieldname, filename, encoding, mimetype, data, isFile }
  // 파일 파트: isFile=true, filename에 원본 파일명
  // 텍스트 파트: isFile=false, filename=""
  registry.register({
    name: 'multer_parse_multipart',
    module: 'multer',
    executor: (args) => {
      const body = String(args[0] || '');
      const boundary = String(args[1] || '');
      const parts: any[] = [];

      if (!boundary) {
        return parts;
      }

      // boundary 구분자로 본문 분할
      const delimiter = `--${boundary}`;
      const sections = body.split(delimiter);

      for (const section of sections) {
        // 빈 섹션 및 종료 구분자("--") 건너뜀
        if (section === '' || section === '--\r\n' || section === '--' || section.trim() === '--') {
          continue;
        }

        // 헤더와 바디를 \r\n\r\n으로 분리
        const crlfcrlfIdx = section.indexOf('\r\n\r\n');
        if (crlfcrlfIdx === -1) {
          // 헤더/바디 구분 없으면 건너뜀
          continue;
        }

        const headerSection = section.slice(0, crlfcrlfIdx);
        // 바디 끝의 \r\n 제거
        let bodyContent = section.slice(crlfcrlfIdx + 4);
        if (bodyContent.endsWith('\r\n')) {
          bodyContent = bodyContent.slice(0, -2);
        }

        // 헤더 라인별 파싱
        const headers: Record<string, string> = {};
        for (const line of headerSection.split('\r\n')) {
          if (!line.trim()) continue;
          const colonIdx = line.indexOf(':');
          if (colonIdx > 0) {
            const headerName = line.slice(0, colonIdx).toLowerCase().trim();
            const headerValue = line.slice(colonIdx + 1).trim();
            headers[headerName] = headerValue;
          }
        }

        // Content-Disposition 파싱
        const disposition = headers['content-disposition'] || '';
        const mimeType = headers['content-type'] || 'text/plain';

        // name="fieldname" 추출
        const fieldnameMatch = disposition.match(/name="([^"]+)"/);
        // filename="originalname" 추출
        const filenameMatch = disposition.match(/filename="([^"]+)"/);

        const fieldname = fieldnameMatch ? fieldnameMatch[1] : '';
        const filename = filenameMatch ? filenameMatch[1] : '';
        const isFile = !!filename;

        // 파트 배열에 추가
        parts.push({
          fieldname,
          filename,
          encoding: '7bit',
          mimetype: mimeType,
          data: bodyContent,
          isFile
        });
      }

      return parts;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // multer_save_file: 파일 데이터를 디스크에 저장
  // ════════════════════════════════════════════════════════════════

  // multer_save_file(data, dest, filename) → string (저장된 전체 경로)
  // dest 디렉터리가 없으면 자동 생성 후 저장
  // 반환값: 저장된 파일의 절대/상대 경로
  registry.register({
    name: 'multer_save_file',
    module: 'multer',
    executor: (args) => {
      const data = String(args[0] || '');
      const dest = String(args[1] || './uploads');
      const filename = String(args[2] || '');

      try {
        // 저장 디렉터리 생성 (없으면)
        fs.mkdirSync(dest, { recursive: true });

        const fullPath = path.join(dest, filename);

        // 데이터 쓰기 (UTF-8 텍스트로 저장)
        // 바이너리 파일의 경우 Buffer로 처리 필요하지만
        // 현재 FreeLang은 문자열 기반 전달을 사용함
        fs.writeFileSync(fullPath, data, 'utf-8');

        return fullPath;
      } catch (err: any) {
        return { error: err.message };
      }
    }
  });

  // ════════════════════════════════════════════════════════════════
  // multer_generate_filename: UUID 기반 고유 파일명 생성
  // ════════════════════════════════════════════════════════════════

  // multer_generate_filename(originalname) → string
  // 원본 파일의 확장자를 보존하며 UUID v4 기반 파일명 생성
  // 예: "photo.jpg" → "550e8400-e29b-41d4-a716-446655440000.jpg"
  // 확장자 없는 파일: "data" → "550e8400-e29b-41d4-a716-446655440000"
  registry.register({
    name: 'multer_generate_filename',
    module: 'multer',
    executor: (args) => {
      const originalname = String(args[0] || '');

      // 확장자 추출 (path.extname은 ".jpg" 형태 반환)
      const ext = path.extname(originalname);

      // UUID v4 생성
      const uuid = crypto.randomUUID();

      // UUID + 확장자 조합
      return uuid + ext;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // multer_get_mimetype: 파일명 기반 MIME 타입 반환
  // ════════════════════════════════════════════════════════════════

  // multer_get_mimetype(filename) → string
  // 파일 확장자를 분석해 MIME 타입을 결정
  // 알 수 없는 확장자: "application/octet-stream" 반환
  registry.register({
    name: 'multer_get_mimetype',
    module: 'multer',
    executor: (args) => {
      const filename = String(args[0] || '');

      // 확장자 추출 및 소문자 변환 (점 제거)
      const ext = path.extname(filename).toLowerCase().replace('.', '');

      // MIME 타입 매핑 테이블
      const mimeMap: Record<string, string> = {
        // 이미지
        'jpg':  'image/jpeg',
        'jpeg': 'image/jpeg',
        'png':  'image/png',
        'gif':  'image/gif',
        'webp': 'image/webp',
        'svg':  'image/svg+xml',
        'bmp':  'image/bmp',
        'ico':  'image/x-icon',
        'tiff': 'image/tiff',
        'tif':  'image/tiff',
        'avif': 'image/avif',

        // 동영상
        'mp4':  'video/mp4',
        'avi':  'video/x-msvideo',
        'mov':  'video/quicktime',
        'wmv':  'video/x-ms-wmv',
        'flv':  'video/x-flv',
        'mkv':  'video/x-matroska',
        'webm': 'video/webm',

        // 오디오
        'mp3':  'audio/mpeg',
        'wav':  'audio/wav',
        'ogg':  'audio/ogg',
        'flac': 'audio/flac',
        'aac':  'audio/aac',
        'm4a':  'audio/mp4',

        // 문서
        'pdf':  'application/pdf',
        'doc':  'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls':  'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt':  'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

        // 텍스트
        'txt':  'text/plain',
        'csv':  'text/csv',
        'html': 'text/html',
        'htm':  'text/html',
        'css':  'text/css',
        'js':   'text/javascript',
        'ts':   'text/typescript',
        'xml':  'application/xml',
        'md':   'text/markdown',

        // 데이터
        'json': 'application/json',
        'yaml': 'application/yaml',
        'yml':  'application/yaml',

        // 압축
        'zip':  'application/zip',
        'tar':  'application/x-tar',
        'gz':   'application/gzip',
        'bz2':  'application/x-bzip2',
        '7z':   'application/x-7z-compressed',
        'rar':  'application/x-rar-compressed',

        // 폰트
        'ttf':   'font/ttf',
        'otf':   'font/otf',
        'woff':  'font/woff',
        'woff2': 'font/woff2',
        'eot':   'application/vnd.ms-fontobject',
      };

      return mimeMap[ext] || 'application/octet-stream';
    }
  });

}
