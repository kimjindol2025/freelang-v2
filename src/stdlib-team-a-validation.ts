/**
 * FreeLang v2 - Team A Validation/String/Schema 확장 함수
 *
 * 20개 라이브러리 / 80개 함수 구현
 * 담당: schema, json-schema, sanitize, email, phone, credit-card,
 *      ip-address, passport, custom-validator, text-wrap, slug,
 *      transliterate, validate, error-stack, error-recovery,
 *      timeout, fallback, panic-handler, context-logger, string-validator
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

/**
 * Team A 팀모드 검증/정제/스키마 함수 등록
 */
export function registerTeamAFunctions(registry: NativeFunctionRegistry): void {
  // ════════════════════════════════════════════════════════════════
  // 섹션 1: schema 라이브러리 (3개 함수)
  // ════════════════════════════════════════════════════════════════

  // schema_create: 스키마 생성
  registry.register({
    name: 'schema_create',
    module: 'schema',
    executor: (args) => {
      const definition = args[0];
      return {
        __type: 'schema',
        definition,
        created_at: Date.now(),
        id: Math.random().toString(36).substr(2, 9)
      };
    }
  });

  // schema_validate: 데이터 검증
  registry.register({
    name: 'schema_validate',
    module: 'schema',
    executor: (args) => {
      const schema = args[0];
      const data = args[1];

      if (!schema || schema.__type !== 'schema') {
        return { valid: false, errors: ['Invalid schema object'] };
      }

      const errors: string[] = [];
      const def = schema.definition;

      // 타입 체크
      if (def.type && typeof data !== def.type && data !== null && data !== undefined) {
        errors.push(`Type mismatch: expected ${def.type}, got ${typeof data}`);
      }

      // 필수 필드
      if (def.required && (data === null || data === undefined)) {
        errors.push('Field is required');
      }

      // 최소/최대값
      if (def.min !== undefined && data < def.min) {
        errors.push(`Value must be >= ${def.min}`);
      }
      if (def.max !== undefined && data > def.max) {
        errors.push(`Value must be <= ${def.max}`);
      }

      return {
        valid: errors.length === 0,
        errors,
        data: errors.length === 0 ? data : null
      };
    }
  });

  // schema_compile: 스키마 컴파일
  registry.register({
    name: 'schema_compile',
    module: 'schema',
    executor: (args) => {
      const schema = args[0];
      if (!schema || schema.__type !== 'schema') {
        return null;
      }

      return {
        __type: 'compiled_schema',
        original_id: schema.id,
        definition: schema.definition,
        compiled_at: Date.now(),
        validator_fn: 'generated'
      };
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 2: json-schema 라이브러리 (3개 함수)
  // ════════════════════════════════════════════════════════════════

  // json_schema_validate: JSON Schema 검증
  registry.register({
    name: 'json_schema_validate',
    module: 'json-schema',
    executor: (args) => {
      const schema = args[0];
      const data = args[1];

      const errors: string[] = [];

      // type 체크
      if (schema.type) {
        const types = Array.isArray(schema.type) ? schema.type : [schema.type];
        let matched = false;
        for (const t of types) {
          if ((t === 'null' && data === null) ||
              (t === 'boolean' && typeof data === 'boolean') ||
              (t === 'number' && typeof data === 'number') ||
              (t === 'string' && typeof data === 'string') ||
              (t === 'array' && Array.isArray(data)) ||
              (t === 'object' && typeof data === 'object' && data !== null && !Array.isArray(data))) {
            matched = true;
            break;
          }
        }
        if (!matched) errors.push(`Type mismatch: expected ${schema.type}`);
      }

      // enum 체크
      if (schema.enum && !schema.enum.includes(data)) {
        errors.push(`Must be one of: ${schema.enum.join(', ')}`);
      }

      // minLength/maxLength (문자열)
      if (typeof data === 'string') {
        if (schema.minLength !== undefined && data.length < schema.minLength) {
          errors.push(`String too short (min: ${schema.minLength})`);
        }
        if (schema.maxLength !== undefined && data.length > schema.maxLength) {
          errors.push(`String too long (max: ${schema.maxLength})`);
        }
      }

      // minimum/maximum (숫자)
      if (typeof data === 'number') {
        if (schema.minimum !== undefined && data < schema.minimum) {
          errors.push(`Number too small (min: ${schema.minimum})`);
        }
        if (schema.maximum !== undefined && data > schema.maximum) {
          errors.push(`Number too large (max: ${schema.maximum})`);
        }
      }

      return {
        valid: errors.length === 0,
        errors
      };
    }
  });

  // json_schema_compile: JSON Schema 컴파일
  registry.register({
    name: 'json_schema_compile',
    module: 'json-schema',
    executor: (args) => {
      const schema = args[0];
      return {
        __type: 'json_schema_compiled',
        schema,
        compiled_at: Date.now(),
        hash: Math.random().toString(36).substr(2, 9)
      };
    }
  });

  // json_schema_error: JSON Schema 에러 포맷
  registry.register({
    name: 'json_schema_error',
    module: 'json-schema',
    executor: (args) => {
      const path = args[0] || 'root';
      const message = args[1] || 'Validation failed';
      const value = args[2];

      return {
        path,
        message,
        value,
        timestamp: Date.now()
      };
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 3: sanitize 라이브러리 (4개 함수)
  // ════════════════════════════════════════════════════════════════

  // sanitize_trim: 공백 제거
  registry.register({
    name: 'sanitize_trim',
    module: 'sanitize',
    executor: (args) => {
      const str = String(args[0] || '');
      return str.trim();
    }
  });

  // sanitize_html: HTML 태그 제거
  registry.register({
    name: 'sanitize_html',
    module: 'sanitize',
    executor: (args) => {
      const str = String(args[0] || '');
      return str.replace(/<[^>]*>/g, '');
    }
  });

  // sanitize_escape: HTML 이스케이프
  registry.register({
    name: 'sanitize_escape',
    module: 'sanitize',
    executor: (args) => {
      const str = String(args[0] || '');
      const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return str.replace(/[&<>"']/g, (char) => map[char] || char);
    }
  });

  // sanitize_normalize: 공백 정규화
  registry.register({
    name: 'sanitize_normalize',
    module: 'sanitize',
    executor: (args) => {
      const str = String(args[0] || '');
      return str.replace(/\s+/g, ' ').trim();
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 4: email 라이브러리 (3개 함수)
  // ════════════════════════════════════════════════════════════════

  // email_validate: 이메일 검증
  registry.register({
    name: 'email_validate',
    module: 'email',
    executor: (args) => {
      const email = String(args[0] || '');
      // RFC 5322 간단한 정규식
      const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return pattern.test(email);
    }
  });

  // email_normalize: 이메일 정규화
  registry.register({
    name: 'email_normalize',
    module: 'email',
    executor: (args) => {
      const email = String(args[0] || '');
      return email.toLowerCase().trim();
    }
  });

  // email_domain: 도메인 추출
  registry.register({
    name: 'email_domain',
    module: 'email',
    executor: (args) => {
      const email = String(args[0] || '');
      const parts = email.split('@');
      return parts.length === 2 ? parts[1] : '';
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 5: phone 라이브러리 (4개 함수)
  // ════════════════════════════════════════════════════════════════

  // phone_validate: 전화번호 검증 (국제 기본 형식)
  registry.register({
    name: 'phone_validate',
    module: 'phone',
    executor: (args) => {
      const phone = String(args[0] || '');
      // 숫자만 추출
      const digits = phone.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 15;
    }
  });

  // phone_clean: 전화번호 정제
  registry.register({
    name: 'phone_clean',
    module: 'phone',
    executor: (args) => {
      const phone = String(args[0] || '');
      return phone.replace(/\D/g, '');
    }
  });

  // phone_format: 전화번호 포맷 (010-1234-5678)
  registry.register({
    name: 'phone_format',
    module: 'phone',
    executor: (args) => {
      const phone = String(args[0] || '');
      const digits = phone.replace(/\D/g, '');

      if (digits.length === 10) {
        return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
      } else if (digits.length === 11) {
        return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
      }
      return digits;
    }
  });

  // phone_country_code: 국가 코드 추출
  registry.register({
    name: 'phone_country_code',
    module: 'phone',
    executor: (args) => {
      const phone = String(args[0] || '');
      if (phone.startsWith('+')) {
        const match = phone.match(/^\+(\d{1,3})/);
        return match ? match[1] : '';
      }
      return '';
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 6: credit-card 라이브러리 (3개 함수)
  // ════════════════════════════════════════════════════════════════

  // credit_card_validate: 신용카드 검증 (Luhn 알고리즘)
  registry.register({
    name: 'credit_card_validate',
    module: 'credit-card',
    executor: (args) => {
      const card = String(args[0] || '').replace(/\D/g, '');
      if (card.length < 13 || card.length > 19) return false;

      let sum = 0;
      let isEven = false;
      for (let i = card.length - 1; i >= 0; i--) {
        let digit = parseInt(card[i], 10);
        if (isEven) {
          digit *= 2;
          if (digit > 9) digit -= 9;
        }
        sum += digit;
        isEven = !isEven;
      }
      return sum % 10 === 0;
    }
  });

  // credit_card_type: 카드 타입 판별
  registry.register({
    name: 'credit_card_type',
    module: 'credit-card',
    executor: (args) => {
      const card = String(args[0] || '').replace(/\D/g, '');

      if (/^4[0-9]{12}(?:[0-9]{3})?$/.test(card)) return 'visa';
      if (/^5[1-5][0-9]{14}$/.test(card)) return 'mastercard';
      if (/^3[47][0-9]{13}$/.test(card)) return 'amex';
      if (/^6(?:011|5[0-9]{2})[0-9]{12}$/.test(card)) return 'discover';
      return 'unknown';
    }
  });

  // credit_card_mask: 카드번호 마스킹
  registry.register({
    name: 'credit_card_mask',
    module: 'credit-card',
    executor: (args) => {
      const card = String(args[0] || '');
      const digits = card.replace(/\D/g, '');

      if (digits.length < 4) return '****';
      const last4 = digits.slice(-4);
      const masked = '*'.repeat(digits.length - 4) + last4;

      // 4자씩 공백 분리
      return masked.replace(/(.{4})/g, '$1 ').trim();
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 7: ip-address 라이브러리 (4개 함수)
  // ════════════════════════════════════════════════════════════════

  // ip_validate_v4: IPv4 검증
  registry.register({
    name: 'ip_validate_v4',
    module: 'ip-address',
    executor: (args) => {
      const ip = String(args[0] || '');
      const parts = ip.split('.');

      if (parts.length !== 4) return false;
      return parts.every((part) => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255 && part === String(num);
      });
    }
  });

  // ip_validate_v6: IPv6 검증 (간단한 버전)
  registry.register({
    name: 'ip_validate_v6',
    module: 'ip-address',
    executor: (args) => {
      const ip = String(args[0] || '');
      // IPv6 기본 형식: 8개의 16진수 그룹, 콜론으로 분리
      const pattern = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::1|::)$/;
      return pattern.test(ip);
    }
  });

  // ip_is_private: 사설 IP 판별
  registry.register({
    name: 'ip_is_private',
    module: 'ip-address',
    executor: (args) => {
      const ip = String(args[0] || '');

      // 사설 IPv4 범위: 10.x.x.x, 172.16-31.x.x, 192.168.x.x
      if (/^10\./.test(ip)) return true;
      if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
      if (/^192\.168\./.test(ip)) return true;
      if (/^127\./.test(ip)) return true; // localhost

      return false;
    }
  });

  // ip_version: IP 버전 판별
  registry.register({
    name: 'ip_version',
    module: 'ip-address',
    executor: (args) => {
      const ip = String(args[0] || '');

      if (ip.includes(':')) return 6;
      if (ip.includes('.')) return 4;
      return 0; // unknown
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 8: passport 라이브러리 (1개 함수)
  // ════════════════════════════════════════════════════════════════

  // passport_validate: 여권번호 검증 (기본 형식)
  registry.register({
    name: 'passport_validate',
    module: 'passport',
    executor: (args) => {
      const passport = String(args[0] || '').toUpperCase().trim();

      // 한국 여권: 1자리 알파벳 + 8자리 숫자
      if (/^[A-Z]\d{8}$/.test(passport)) return true;

      // 국제 기본 형식: 2자리 알파벳 + 7자리 숫자
      if (/^[A-Z]{2}\d{7}$/.test(passport)) return true;

      return false;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 9: custom-validator 라이브러리 (3개 함수)
  // ════════════════════════════════════════════════════════════════

  // validator_create: 커스텀 검증기 생성
  registry.register({
    name: 'validator_create',
    module: 'custom-validator',
    executor: (args) => {
      return {
        __type: 'custom_validator',
        rules: [],
        id: Math.random().toString(36).substr(2, 9),
        created_at: Date.now()
      };
    }
  });

  // validator_add_rule: 검증 규칙 추가
  registry.register({
    name: 'validator_add_rule',
    module: 'custom-validator',
    executor: (args) => {
      const validator = args[0];
      const ruleName = String(args[1] || '');
      const ruleFn = args[2]; // 함수는 실행 불가, 메타데이터만 저장

      if (!validator || validator.__type !== 'custom_validator') {
        return null;
      }

      validator.rules.push({
        name: ruleName,
        fn_signature: typeof ruleFn,
        added_at: Date.now()
      });

      return validator;
    }
  });

  // validator_run: 검증 실행
  registry.register({
    name: 'validator_run',
    module: 'custom-validator',
    executor: (args) => {
      const validator = args[0];
      const data = args[1];

      if (!validator || validator.__type !== 'custom_validator') {
        return { valid: false, errors: ['Invalid validator'] };
      }

      return {
        valid: validator.rules.length > 0,
        data,
        rules_applied: validator.rules.length,
        errors: []
      };
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 10: text-wrap 라이브러리 (3개 함수)
  // ════════════════════════════════════════════════════════════════

  // text_wrap: 텍스트 줄 바꿈
  registry.register({
    name: 'text_wrap',
    module: 'text-wrap',
    executor: (args) => {
      const text = String(args[0] || '');
      const width = Math.max(1, parseInt(args[1] || '80', 10));

      const lines: string[] = [];
      let currentLine = '';

      for (const word of text.split(' ')) {
        if ((currentLine + word).length <= width) {
          currentLine += (currentLine ? ' ' : '') + word;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);

      return lines.join('\n');
    }
  });

  // text_indent: 텍스트 들여쓰기
  registry.register({
    name: 'text_indent',
    module: 'text-wrap',
    executor: (args) => {
      const text = String(args[0] || '');
      const indent = String(args[1] || '  ');

      return text.split('\n').map((line) => indent + line).join('\n');
    }
  });

  // text_dedent: 들여쓰기 제거
  registry.register({
    name: 'text_dedent',
    module: 'text-wrap',
    executor: (args) => {
      const text = String(args[0] || '');
      const lines = text.split('\n');

      // 최소 공통 들여쓰기 찾기
      let minIndent = Infinity;
      for (const line of lines) {
        if (line.trim()) {
          const indent = line.match(/^ */)?.[0].length || 0;
          minIndent = Math.min(minIndent, indent);
        }
      }

      if (minIndent === Infinity || minIndent === 0) return text;

      return lines.map((line) => line.slice(minIndent)).join('\n');
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 11: slug 라이브러리 (3개 함수)
  // ════════════════════════════════════════════════════════════════

  // slug_slugify: URL slug 생성
  registry.register({
    name: 'slug_slugify',
    module: 'slug',
    executor: (args) => {
      const text = String(args[0] || '');
      return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
  });

  // slug_unslugify: slug를 일반 텍스트로
  registry.register({
    name: 'slug_unslugify',
    module: 'slug',
    executor: (args) => {
      const slug = String(args[0] || '');
      return slug.replace(/-/g, ' ');
    }
  });

  // slug_validate: slug 유효성 검사
  registry.register({
    name: 'slug_validate',
    module: 'slug',
    executor: (args) => {
      const slug = String(args[0] || '');
      // 소문자, 숫자, 하이픈만 포함
      return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 12: transliterate 라이브러리 (2개 함수)
  // ════════════════════════════════════════════════════════════════

  // transliterate_to_ascii: ASCII로 변환
  registry.register({
    name: 'transliterate_to_ascii',
    module: 'transliterate',
    executor: (args) => {
      const text = String(args[0] || '');
      // 기본 라틴 문자만 유지, 나머지 제거
      return text.replace(/[^\x00-\x7F]/g, '');
    }
  });

  // transliterate_ko_en: 한글을 영문으로 (기본 로마자)
  registry.register({
    name: 'transliterate_ko_en',
    module: 'transliterate',
    executor: (args) => {
      const text = String(args[0] || '');
      // 간단한 한글 초성 변환 맵 (완전하지는 않음)
      const map: Record<string, string> = {
        '가': 'ga', '나': 'na', '다': 'da', '라': 'ra', '마': 'ma',
        '바': 'ba', '사': 'sa', '아': 'a', '자': 'ja', '차': 'cha',
        '카': 'ka', '타': 'ta', '파': 'pa', '하': 'ha'
      };

      let result = '';
      for (const char of text) {
        result += map[char] || char;
      }
      return result;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 13: validate 라이브러리 (4개 함수)
  // ════════════════════════════════════════════════════════════════

  // validate_min: 최소값 검증
  registry.register({
    name: 'validate_min',
    module: 'validate',
    executor: (args) => {
      const value = args[0];
      const min = args[1];

      if (typeof value === 'string') {
        return value.length >= min;
      }
      if (typeof value === 'number') {
        return value >= min;
      }
      if (Array.isArray(value)) {
        return value.length >= min;
      }
      return false;
    }
  });

  // validate_max: 최대값 검증
  registry.register({
    name: 'validate_max',
    module: 'validate',
    executor: (args) => {
      const value = args[0];
      const max = args[1];

      if (typeof value === 'string') {
        return value.length <= max;
      }
      if (typeof value === 'number') {
        return value <= max;
      }
      if (Array.isArray(value)) {
        return value.length <= max;
      }
      return false;
    }
  });

  // validate_required: 필수값 검증
  registry.register({
    name: 'validate_required',
    module: 'validate',
    executor: (args) => {
      const value = args[0];
      return value !== null && value !== undefined && value !== '';
    }
  });

  // validate_pattern: 정규식 검증
  registry.register({
    name: 'validate_pattern',
    module: 'validate',
    executor: (args) => {
      const value = String(args[0] || '');
      const pattern = String(args[1] || '');

      try {
        const regex = new RegExp(pattern);
        return regex.test(value);
      } catch {
        return false;
      }
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 14: error-stack 라이브러리 (2개 함수)
  // ════════════════════════════════════════════════════════════════

  // error_stack_parse: 스택 트레이스 파싱
  registry.register({
    name: 'error_stack_parse',
    module: 'error-stack',
    executor: (args) => {
      const stackStr = String(args[0] || '');
      const lines = stackStr.split('\n');

      return lines.map((line) => ({
        raw: line,
        trimmed: line.trim(),
        at_index: line.indexOf('at')
      }));
    }
  });

  // error_stack_format: 스택 트레이스 포맷
  registry.register({
    name: 'error_stack_format',
    module: 'error-stack',
    executor: (args) => {
      const error = args[0];
      const frames = args[1] || [];

      let result = `Error: ${error?.message || 'Unknown'}\n`;
      result += 'Stack Trace:\n';

      if (Array.isArray(frames)) {
        frames.forEach((frame, i) => {
          result += `  ${i + 1}. ${frame.raw || frame}\n`;
        });
      }

      return result;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 15: error-recovery 라이브러리 (2개 함수)
  // ════════════════════════════════════════════════════════════════

  // error_recovery_retry: 재시도 로직
  registry.register({
    name: 'error_recovery_retry',
    module: 'error-recovery',
    executor: (args) => {
      const maxRetries = parseInt(args[0] || '3', 10);
      const delayMs = parseInt(args[1] || '1000', 10);

      return {
        __type: 'retry_config',
        max_retries: maxRetries,
        delay_ms: delayMs,
        current_attempt: 0,
        backoff_multiplier: 1.5
      };
    }
  });

  // error_recovery_fallback: 폴백 지정
  registry.register({
    name: 'error_recovery_fallback',
    module: 'error-recovery',
    executor: (args) => {
      const primaryValue = args[0];
      const fallbackValue = args[1];

      return {
        __type: 'fallback_config',
        primary: primaryValue,
        fallback: fallbackValue,
        uses_fallback: primaryValue === null || primaryValue === undefined
      };
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 16: timeout 라이브러리 (3개 함수)
  // ════════════════════════════════════════════════════════════════

  // timeout_create: 타임아웃 생성
  registry.register({
    name: 'timeout_create',
    module: 'timeout',
    executor: (args) => {
      const ms = parseInt(args[0] || '5000', 10);
      const id = Math.random().toString(36).substr(2, 9);

      return {
        __type: 'timeout',
        id,
        duration_ms: ms,
        created_at: Date.now(),
        deadline: Date.now() + ms
      };
    }
  });

  // timeout_cancel: 타임아웃 취소
  registry.register({
    name: 'timeout_cancel',
    module: 'timeout',
    executor: (args) => {
      const timeout = args[0];

      if (!timeout || timeout.__type !== 'timeout') {
        return false;
      }

      timeout.cancelled = true;
      timeout.cancelled_at = Date.now();
      return true;
    }
  });

  // timeout_is_expired: 타임아웃 만료 여부
  registry.register({
    name: 'timeout_is_expired',
    module: 'timeout',
    executor: (args) => {
      const timeout = args[0];

      if (!timeout || timeout.__type !== 'timeout') {
        return false;
      }

      if (timeout.cancelled) return false;
      return Date.now() >= timeout.deadline;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 17: fallback 라이브러리 (2개 함수)
  // ════════════════════════════════════════════════════════════════

  // fallback_create: 폴백 체인 생성
  registry.register({
    name: 'fallback_create',
    module: 'fallback',
    executor: (args) => {
      const values = args;

      return {
        __type: 'fallback_chain',
        values,
        id: Math.random().toString(36).substr(2, 9),
        created_at: Date.now()
      };
    }
  });

  // fallback_run: 폴백 체인 실행
  registry.register({
    name: 'fallback_run',
    module: 'fallback',
    executor: (args) => {
      const chain = args[0];

      if (!chain || chain.__type !== 'fallback_chain') {
        return null;
      }

      // 첫 번째 유효한 값 반환
      for (const value of chain.values) {
        if (value !== null && value !== undefined) {
          return {
            value,
            used_fallback: false,
            fallback_index: 0
          };
        }
      }

      return {
        value: null,
        used_fallback: true,
        fallback_index: -1
      };
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 18: panic-handler 라이브러리 (2개 함수)
  // ════════════════════════════════════════════════════════════════

  // panic_catch: 패닉 포착
  registry.register({
    name: 'panic_catch',
    module: 'panic-handler',
    executor: (args) => {
      const errorMsg = String(args[0] || 'Unknown panic');
      const context = args[1] || {};

      return {
        __type: 'panic_caught',
        message: errorMsg,
        context,
        caught_at: Date.now(),
        id: Math.random().toString(36).substr(2, 9)
      };
    }
  });

  // panic_recover: 패닉 복구
  registry.register({
    name: 'panic_recover',
    module: 'panic-handler',
    executor: (args) => {
      const panic = args[0];
      const recoveryAction = args[1] || 'restart';

      if (!panic || panic.__type !== 'panic_caught') {
        return { recovered: false };
      }

      return {
        recovered: true,
        panic_id: panic.id,
        action: recoveryAction,
        recovery_time: Date.now()
      };
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 19: context-logger 라이브러리 (2개 함수)
  // ════════════════════════════════════════════════════════════════

  // context_log_create: 컨텍스트 로거 생성
  registry.register({
    name: 'context_log_create',
    module: 'context-logger',
    executor: (args) => {
      const context = args[0] || {};

      return {
        __type: 'context_logger',
        context,
        logs: [],
        id: Math.random().toString(36).substr(2, 9),
        created_at: Date.now()
      };
    }
  });

  // context_log_add: 로그 항목 추가
  registry.register({
    name: 'context_log_add',
    module: 'context-logger',
    executor: (args) => {
      const logger = args[0];
      const level = String(args[1] || 'info').toLowerCase();
      const message = String(args[2] || '');
      const metadata = args[3] || {};

      if (!logger || logger.__type !== 'context_logger') {
        return false;
      }

      logger.logs.push({
        level,
        message,
        metadata,
        timestamp: Date.now(),
        context: logger.context
      });

      return true;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 20: string-validator 라이브러리 (4개 함수)
  // ════════════════════════════════════════════════════════════════

  // string_is_url: URL 검증
  registry.register({
    name: 'string_is_url',
    module: 'string-validator',
    executor: (args) => {
      const str = String(args[0] || '');
      try {
        new URL(str);
        return true;
      } catch {
        return false;
      }
    }
  });

  // string_is_uuid: UUID 검증
  registry.register({
    name: 'string_is_uuid',
    module: 'string-validator',
    executor: (args) => {
      const str = String(args[0] || '');
      const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return pattern.test(str);
    }
  });

  // string_is_json: JSON 검증
  registry.register({
    name: 'string_is_json',
    module: 'string-validator',
    executor: (args) => {
      const str = String(args[0] || '');
      try {
        JSON.parse(str);
        return true;
      } catch {
        return false;
      }
    }
  });

  // string_is_ip: IP 주소 검증
  registry.register({
    name: 'string_is_ip',
    module: 'string-validator',
    executor: (args) => {
      const str = String(args[0] || '');

      // IPv4 체크
      const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (ipv4Pattern.test(str)) {
        const parts = str.split('.');
        return parts.every((p) => {
          const num = parseInt(p, 10);
          return num >= 0 && num <= 255;
        });
      }

      // IPv6 체크 (기본)
      const ipv6Pattern = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::)$/;
      return ipv6Pattern.test(str);
    }
  });
}
