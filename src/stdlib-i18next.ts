/**
 * FreeLang v2 - i18next 다국어 지원 네이티브 함수
 *
 * i18n_load_file(path, lang, ns) → translations map
 * i18n_load_json(jsonStr, lang, ns) → translations map
 * i18n_plural(count, key) → string
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';
import * as fs from 'fs';
import * as path from 'path';

/**
 * i18next 함수 등록
 */
export function registerI18nextFunctions(registry: NativeFunctionRegistry): void {
  // i18n_load_file(filePath, lang, ns) -> map
  registry.register({
    name: 'i18n_load_file',
    module: 'i18next',
    executor: (args) => {
      const filePath = String(args[0]);
      const lang = String(args[1]);
      const ns = String(args[2]);

      try {
        // JSON 파일 읽기
        const content = fs.readFileSync(filePath, 'utf-8');
        const translations = JSON.parse(content);
        return translations;
      } catch (error: any) {
        // 파일 없으면 빈 map 반환
        return {};
      }
    }
  });

  // i18n_load_json(jsonStr, lang, ns) -> map
  registry.register({
    name: 'i18n_load_json',
    module: 'i18next',
    executor: (args) => {
      const jsonStr = String(args[0]);
      const lang = String(args[1]);
      const ns = String(args[2]);

      try {
        const translations = JSON.parse(jsonStr);
        return translations;
      } catch (error) {
        return {};
      }
    }
  });

  // i18n_plural(count, key, lang) -> string
  // 복수형 처리: key_zero, key_one, key_other 등
  registry.register({
    name: 'i18n_plural',
    module: 'i18next',
    executor: (args) => {
      const count = parseInt(String(args[0]));
      const key = String(args[1]);
      const lang = String(args[2] || 'en');

      // 영어: 0=zero, 1=one, other
      // 한국어: always other
      let suffix = 'other';

      if (lang === 'en') {
        if (count === 0) suffix = 'zero';
        else if (count === 1) suffix = 'one';
      }

      return `${key}_${suffix}`;
    }
  });

  // i18n_format(text, variables) -> string
  // 변수 치환 ({{name}} → value)
  registry.register({
    name: 'i18n_format',
    module: 'i18next',
    executor: (args) => {
      let text = String(args[0]);
      const variables = args[1] as Record<string, any> || {};

      // {{key}} 패턴 치환
      Object.keys(variables).forEach((key) => {
        const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        text = text.replace(pattern, String(variables[key]));
      });

      return text;
    }
  });

  // i18n_list_languages(resourceDir) -> array
  // 리소스 디렉토리에서 언어 목록 조회
  registry.register({
    name: 'i18n_list_languages',
    module: 'i18next',
    executor: (args) => {
      const resourceDir = String(args[0]);

      try {
        const files = fs.readdirSync(resourceDir);
        const languages: string[] = [];

        files.forEach((file) => {
          // en.json, ko.json 형태로 인식
          if (file.endsWith('.json')) {
            const lang = file.replace('.json', '');
            languages.push(lang);
          }
        });

        return languages;
      } catch (error) {
        return [];
      }
    }
  });

  // i18n_detect_language(acceptLanguage) -> string
  // Accept-Language 헤더에서 언어 감지
  registry.register({
    name: 'i18n_detect_language',
    module: 'i18next',
    executor: (args) => {
      const acceptLanguage = String(args[0] || '');
      const supportedLangs = args[1] as string[] || ['en', 'ko'];

      if (!acceptLanguage) {
        return supportedLangs[0] || 'en';
      }

      // Accept-Language: en-US,en;q=0.9,ko;q=0.8
      const langParts = acceptLanguage.split(',');

      for (const part of langParts) {
        const lang = part.split(';')[0].trim().split('-')[0].toLowerCase();
        if (supportedLangs.includes(lang)) {
          return lang;
        }
      }

      return supportedLangs[0] || 'en';
    }
  });
}
