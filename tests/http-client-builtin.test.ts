/**
 * Phase 13: HTTP Client Builtin Tests
 * HTTP 함수들의 시그니처 검증
 */

import {
  BUILTINS,
  getBuiltinType,
  getBuiltinImpl,
  getBuiltinC,
  isBuiltin,
} from '../src/engine/builtins';

describe('HTTP Client Builtins (Phase 13)', () => {
  /**
   * http_get 함수 검증
   */
  describe('http_get', () => {
    test('should be registered', () => {
      expect(isBuiltin('http_get')).toBe(true);
      expect(BUILTINS['http_get']).toBeDefined();
    });

    test('should have correct signature', () => {
      const type = getBuiltinType('http_get');
      expect(type).not.toBeNull();
      expect(type!.params.length).toBe(1);
      expect(type!.params[0].name).toBe('url');
      expect(type!.params[0].type).toBe('string');
      expect(type!.return_type).toBe('object');
    });

    test('should have C mapping', () => {
      const cMapping = getBuiltinC('http_get');
      expect(cMapping).not.toBeNull();
      expect(cMapping!.c_name).toBe('http_get');
      expect(cMapping!.headers).toContain('curl.h');
    });

    test('should have impl function', () => {
      const impl = getBuiltinImpl('http_get');
      expect(impl).not.toBeNull();
      expect(typeof impl).toBe('function');
    });
  });

  /**
   * http_post 함수 검증
   */
  describe('http_post', () => {
    test('should be registered', () => {
      expect(isBuiltin('http_post')).toBe(true);
      expect(BUILTINS['http_post']).toBeDefined();
    });

    test('should have correct signature', () => {
      const type = getBuiltinType('http_post');
      expect(type).not.toBeNull();
      expect(type!.params.length).toBe(2);
      expect(type!.params[0].name).toBe('url');
      expect(type!.params[0].type).toBe('string');
      expect(type!.params[1].name).toBe('body');
      expect(type!.params[1].type).toBe('string');
      expect(type!.return_type).toBe('object');
    });

    test('should have C mapping', () => {
      const cMapping = getBuiltinC('http_post');
      expect(cMapping).not.toBeNull();
      expect(cMapping!.c_name).toBe('http_post');
      expect(cMapping!.headers).toContain('curl.h');
    });

    test('should have impl function', () => {
      const impl = getBuiltinImpl('http_post');
      expect(impl).not.toBeNull();
      expect(typeof impl).toBe('function');
    });
  });

  /**
   * http_json_get 함수 검증
   */
  describe('http_json_get', () => {
    test('should be registered', () => {
      expect(isBuiltin('http_json_get')).toBe(true);
      expect(BUILTINS['http_json_get']).toBeDefined();
    });

    test('should have correct signature', () => {
      const type = getBuiltinType('http_json_get');
      expect(type).not.toBeNull();
      expect(type!.params.length).toBe(1);
      expect(type!.params[0].name).toBe('url');
      expect(type!.params[0].type).toBe('string');
      expect(type!.return_type).toBe('object');
    });

    test('should have impl function', () => {
      const impl = getBuiltinImpl('http_json_get');
      expect(impl).not.toBeNull();
      expect(typeof impl).toBe('function');
    });
  });

  /**
   * http_json_post 함수 검증
   */
  describe('http_json_post', () => {
    test('should be registered', () => {
      expect(isBuiltin('http_json_post')).toBe(true);
      expect(BUILTINS['http_json_post']).toBeDefined();
    });

    test('should have correct signature', () => {
      const type = getBuiltinType('http_json_post');
      expect(type).not.toBeNull();
      expect(type!.params.length).toBe(2);
      expect(type!.params[0].name).toBe('url');
      expect(type!.params[0].type).toBe('string');
      expect(type!.params[1].name).toBe('data');
      expect(type!.params[1].type).toBe('object');
      expect(type!.return_type).toBe('object');
    });

    test('should have impl function', () => {
      const impl = getBuiltinImpl('http_json_post');
      expect(impl).not.toBeNull();
      expect(typeof impl).toBe('function');
    });
  });

  /**
   * http_head 함수 검증
   */
  describe('http_head', () => {
    test('should be registered', () => {
      expect(isBuiltin('http_head')).toBe(true);
      expect(BUILTINS['http_head']).toBeDefined();
    });

    test('should have correct signature', () => {
      const type = getBuiltinType('http_head');
      expect(type).not.toBeNull();
      expect(type!.params.length).toBe(1);
      expect(type!.params[0].name).toBe('url');
      expect(type!.params[0].type).toBe('string');
      expect(type!.return_type).toBe('object');
    });

    test('should have impl function', () => {
      const impl = getBuiltinImpl('http_head');
      expect(impl).not.toBeNull();
      expect(typeof impl).toBe('function');
    });
  });

  /**
   * http_patch 함수 검증
   */
  describe('http_patch', () => {
    test('should be registered', () => {
      expect(isBuiltin('http_patch')).toBe(true);
      expect(BUILTINS['http_patch']).toBeDefined();
    });

    test('should have correct signature', () => {
      const type = getBuiltinType('http_patch');
      expect(type).not.toBeNull();
      expect(type!.params.length).toBe(2);
      expect(type!.params[0].name).toBe('url');
      expect(type!.params[0].type).toBe('string');
      expect(type!.params[1].name).toBe('body');
      expect(type!.params[1].type).toBe('string');
      expect(type!.return_type).toBe('object');
    });

    test('should have impl function', () => {
      const impl = getBuiltinImpl('http_patch');
      expect(impl).not.toBeNull();
      expect(typeof impl).toBe('function');
    });
  });

  /**
   * 통합 검증
   */
  describe('Integration', () => {
    test('all HTTP functions should have impl', () => {
      const httpFuncs = ['http_get', 'http_post', 'http_json_get', 'http_json_post', 'http_head', 'http_patch'];
      for (const fn of httpFuncs) {
        const impl = getBuiltinImpl(fn);
        expect(impl).not.toBeNull();
        expect(impl).toBeDefined();
      }
    });

    test('all HTTP functions should have C mappings', () => {
      const httpFuncs = ['http_get', 'http_post', 'http_json_get', 'http_json_post', 'http_head', 'http_patch'];
      for (const fn of httpFuncs) {
        const cMapping = getBuiltinC(fn);
        expect(cMapping).not.toBeNull();
        expect(cMapping!.c_name).toBe(fn);
        expect(cMapping!.headers).toContain('curl.h');
      }
    });

    test('HTTP functions should return object type', () => {
      const httpFuncs = ['http_get', 'http_post', 'http_json_get', 'http_json_post', 'http_head', 'http_patch'];
      for (const fn of httpFuncs) {
        const type = getBuiltinType(fn);
        expect(type).not.toBeNull();
        expect(type!.return_type).toBe('object');
      }
    });
  });
});
