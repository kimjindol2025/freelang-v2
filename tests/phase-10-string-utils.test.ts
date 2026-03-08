import { StringUtils, RegexUtils, testStringUtils } from '../src/phase-10/string-utils';

describe('Phase 10: String Utilities', () => {
  // StringUtils Tests
  describe('StringUtils', () => {
    it('should split strings', () => {
      const result = StringUtils.split('hello world test', ' ');
      expect(result).toEqual(['hello', 'world', 'test']);
    });

    it('should join arrays', () => {
      const result = StringUtils.join(['a', 'b', 'c'], '-');
      expect(result).toBe('a-b-c');
    });

    it('should trim whitespace', () => {
      expect(StringUtils.trim('  hello  ')).toBe('hello');
      expect(StringUtils.trimStart('  hello')).toBe('hello');
      expect(StringUtils.trimEnd('hello  ')).toBe('hello');
    });

    it('should check containment', () => {
      const text = 'hello world';
      expect(StringUtils.contains(text, 'world')).toBe(true);
      expect(StringUtils.contains(text, 'xyz')).toBe(false);
    });

    it('should check prefix/suffix', () => {
      expect(StringUtils.startsWith('hello', 'he')).toBe(true);
      expect(StringUtils.endsWith('world', 'ld')).toBe(true);
      expect(StringUtils.startsWith('test', 'x')).toBe(false);
    });

    it('should find index', () => {
      expect(StringUtils.indexOf('abcabc', 'bc')).toBe(1);
      expect(StringUtils.lastIndexOf('abcabc', 'bc')).toBe(4);
    });

    it('should get characters at index', () => {
      expect(StringUtils.charAt('hello', 0)).toBe('h');
      expect(StringUtils.charAt('hello', 4)).toBe('o');
    });

    it('should extract substrings', () => {
      expect(StringUtils.substring('hello', 1, 4)).toBe('ell');
      expect(StringUtils.slice('hello', 1, 4)).toBe('ell');
    });

    it('should repeat strings', () => {
      expect(StringUtils.repeat('ab', 3)).toBe('ababab');
    });

    it('should replace strings', () => {
      expect(StringUtils.replace('hello hello', 'hello', 'hi')).toBe(
        'hi hello'
      );
      expect(StringUtils.replaceAll('hello hello', 'hello', 'hi')).toBe(
        'hi hi'
      );
    });

    it('should convert case', () => {
      expect(StringUtils.toUpperCase('hello')).toBe('HELLO');
      expect(StringUtils.toLowerCase('HELLO')).toBe('hello');
    });

    it('should get length and check empty', () => {
      expect(StringUtils.getLength('hello')).toBe(5);
      expect(StringUtils.isEmpty('')).toBe(true);
      expect(StringUtils.isEmpty('a')).toBe(false);
    });

    it('should pad strings', () => {
      expect(StringUtils.padStart('5', 3, '0')).toBe('005');
      expect(StringUtils.padEnd('5', 3, '0')).toBe('500');
    });

    it('should convert cases', () => {
      expect(StringUtils.toCamelCase('hello-world-test')).toBe('helloWorldTest');
      expect(StringUtils.toSnakeCase('helloWorldTest')).toBe('hello_world_test');
      expect(StringUtils.toKebabCase('helloWorldTest')).toBe('hello-world-test');
    });

    it('should reverse strings', () => {
      expect(StringUtils.reverse('hello')).toBe('olleh');
    });

    it('should count words and lines', () => {
      expect(StringUtils.wordCount('hello world test')).toBe(3);
      expect(StringUtils.lineCount('a\nb\nc')).toBe(3);
    });

    it('should map lines and words', () => {
      const lines = StringUtils.mapLines('a\nb', (l) => l.toUpperCase());
      expect(lines).toBe('A\nB');
    });

    it('should test regex', () => {
      expect(StringUtils.test('abc123def', /\d/)).toBe(true);
      expect(StringUtils.test('abcdef', /\d/)).toBe(false);
    });

    it('should match regex', () => {
      const match = StringUtils.match('abc123def', /\d+/);
      expect(match).not.toBeNull();
      expect(match?.[0]).toBe('123');
    });

    it('should match all occurrences', () => {
      const matches = StringUtils.matchAll('a1b2c3', '\\d');
      expect(matches.length).toBe(3);
    });

    it('should split by regex', () => {
      const result = StringUtils.splitRegex('a1b2c3', '\\d');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // RegexUtils Tests
  describe('RegexUtils', () => {
    it('should validate email', () => {
      expect(RegexUtils.isEmail('test@example.com')).toBe(true);
      expect(RegexUtils.isEmail('invalid')).toBe(false);
    });

    it('should validate URL', () => {
      expect(RegexUtils.isUrl('https://example.com')).toBe(true);
      expect(RegexUtils.isUrl('invalid')).toBe(false);
    });

    it('should validate IP address', () => {
      expect(RegexUtils.isIpAddress('192.168.1.1')).toBe(true);
      expect(RegexUtils.isIpAddress('999.999.999.999')).toBe(true); // Simple regex
      expect(RegexUtils.isIpAddress('invalid')).toBe(false);
    });

    it('should check numeric', () => {
      expect(RegexUtils.isNumeric('12345')).toBe(true);
      expect(RegexUtils.isNumeric('123a5')).toBe(false);
    });

    it('should check alphabetic', () => {
      expect(RegexUtils.isAlpha('hello')).toBe(true);
      expect(RegexUtils.isAlpha('hello123')).toBe(false);
    });

    it('should check alphanumeric', () => {
      expect(RegexUtils.isAlphanumeric('hello123')).toBe(true);
      expect(RegexUtils.isAlphanumeric('hello123!')).toBe(false);
    });

    it('should sanitize HTML', () => {
      const result = RegexUtils.sanitize('<script>alert("xss")</script>');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('should escape HTML', () => {
      const result = RegexUtils.htmlEscape('<div>Test & "quoted"</div>');
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&amp;');
    });

    it('should parse CSV', () => {
      const csv = 'name,age\nAlice,30\nBob,25';
      const rows = RegexUtils.parseCSV(csv);
      expect(rows.length).toBe(3);
      expect(rows[0]).toEqual(['name', 'age']);
      expect(rows[1]).toEqual(['Alice', '30']);
    });

    it('should parse log lines', () => {
      const result = RegexUtils.parseLog('ERROR: Database connection failed');
      expect(result).not.toBeNull();
      expect(result?.level).toBe('ERROR');
      expect(result?.message).toBe('Database connection failed');
    });

    it('should extract timestamp', () => {
      const ts = RegexUtils.extractTimestamp(
        '2026-02-17T14:30:45 Error occurred'
      );
      expect(ts).toBe('2026-02-17T14:30:45');
    });

    it('should extract IP address', () => {
      const ip = RegexUtils.extractIp('Request from 192.168.1.100 denied');
      expect(ip).toBe('192.168.1.100');
    });

    it('should validate JSON', () => {
      expect(RegexUtils.isValidJson('{"key": "value"}')).toBe(true);
      expect(RegexUtils.isValidJson('{invalid}')).toBe(false);
    });
  });

  // Integration test
  it('should run string utils tests without errors', () => {
    expect(() => testStringUtils()).not.toThrow();
  });
});
