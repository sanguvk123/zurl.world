import { describe, expect, it } from 'vitest';
import {
  CODE_ALPHABET,
  DEFAULT_CODE_LENGTH,
  MAX_ALIAS_LENGTH,
  MIN_ALIAS_LENGTH,
  generateId,
  generateShortCode,
  looksGenerated,
  validateAlias,
} from '@/lib/links/short-code';
import { isNonCodePath, isReservedAlias } from '@/lib/links/reserved';

describe('generateShortCode', () => {
  it('produces the default length', () => {
    expect(generateShortCode()).toHaveLength(DEFAULT_CODE_LENGTH);
  });

  it('honours an explicit length', () => {
    for (const length of [6, 7, 8]) {
      expect(generateShortCode(length)).toHaveLength(length);
    }
  });

  it('rejects lengths outside the supported range', () => {
    expect(() => generateShortCode(5)).toThrow(RangeError);
    expect(() => generateShortCode(9)).toThrow(RangeError);
  });

  it('only uses alphabet characters', () => {
    for (let i = 0; i < 200; i += 1) {
      for (const char of generateShortCode()) {
        expect(CODE_ALPHABET).toContain(char);
      }
    }
  });

  it('excludes visually ambiguous characters', () => {
    // 0/O/o and 1/l/I are the classic misread pairs.
    for (const char of ['0', 'O', 'o', '1', 'l', 'I']) {
      expect(CODE_ALPHABET).not.toContain(char);
    }
  });

  it('is effectively collision free across many samples', () => {
    const seen = new Set<string>();
    const iterations = 20_000;
    for (let i = 0; i < iterations; i += 1) {
      seen.add(generateShortCode());
    }
    // 56^7 is ~1.7e12; 20k draws should essentially never repeat.
    expect(seen.size).toBe(iterations);
  });

  it('is not sequential or prefix-clustered', () => {
    const codes = Array.from({ length: 50 }, () => generateShortCode());
    const firstChars = new Set(codes.map((code) => code[0]));
    // Sequential generation would collapse the leading character.
    expect(firstChars.size).toBeGreaterThan(5);
  });

  it('distributes characters roughly uniformly', () => {
    // Guards the rejection sampling: a naive modulo would over-represent the
    // first 256 % 56 = 32 characters of the alphabet.
    const counts = new Map<string, number>();
    const samples = 60_000;
    for (let i = 0; i < samples / DEFAULT_CODE_LENGTH; i += 1) {
      for (const char of generateShortCode()) {
        counts.set(char, (counts.get(char) ?? 0) + 1);
      }
    }
    const expected = samples / CODE_ALPHABET.length;
    for (const char of CODE_ALPHABET) {
      const actual = counts.get(char) ?? 0;
      // Within 35% of the expected frequency; modulo bias would show ~78% skew.
      expect(Math.abs(actual - expected) / expected).toBeLessThan(0.35);
    }
  });
});

describe('generateId', () => {
  it('prefixes the id and contains no dashes', () => {
    const id = generateId('lnk');
    expect(id.startsWith('lnk_')).toBe(true);
    expect(id.slice(4)).toHaveLength(32);
  });

  it('is unique across many draws', () => {
    const ids = new Set(Array.from({ length: 5_000 }, () => generateId('usr')));
    expect(ids.size).toBe(5_000);
  });

  it('never exposes a sequential integer', () => {
    const id = generateId('lnk');
    expect(Number.isNaN(Number(id.slice(4)))).toBe(true);
  });
});

describe('validateAlias', () => {
  it('accepts sensible aliases', () => {
    for (const alias of ['my-product', 'launch2026', 'spring_sale', 'abc', 'a-b_c-1']) {
      const result = validateAlias(alias);
      expect(result.ok, alias).toBe(true);
    }
  });

  it('lowercases input', () => {
    const result = validateAlias('MyProduct');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.alias).toBe('myproduct');
  });

  it('trims surrounding whitespace', () => {
    const result = validateAlias('  spring-sale  ');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.alias).toBe('spring-sale');
  });

  it('enforces the minimum length', () => {
    const result = validateAlias('ab');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('too_short');
  });

  it('enforces the maximum length', () => {
    const result = validateAlias('a'.repeat(MAX_ALIAS_LENGTH + 1));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('too_long');
  });

  it('accepts exactly the boundary lengths', () => {
    expect(validateAlias('a'.repeat(MIN_ALIAS_LENGTH)).ok).toBe(true);
    expect(validateAlias('a'.repeat(MAX_ALIAS_LENGTH)).ok).toBe(true);
  });

  it('rejects disallowed characters', () => {
    const bad = [
      'my product',
      'my.product',
      'my/product',
      'my?product',
      'my#product',
      'my%20product',
      'emoji-🎉',
      'my@product',
      'my+product',
      'my\\product',
    ];
    for (const alias of bad) {
      const result = validateAlias(alias);
      expect(result.ok, alias).toBe(false);
    }
  });

  it('rejects XSS payloads', () => {
    const payloads = [
      '<script>alert(1)</script>',
      '"><img src=x onerror=alert(1)>',
      "javascript:alert('xss')",
      '%3Cscript%3E',
      '../../etc/passwd',
      '..%2f..%2fadmin',
    ];
    for (const payload of payloads) {
      expect(validateAlias(payload).ok, payload).toBe(false);
    }
  });

  it('rejects SQL injection payloads', () => {
    const payloads = [
      "'; DROP TABLE links;--",
      "' OR '1'='1",
      'admin\'--',
      '1; SELECT * FROM users',
    ];
    for (const payload of payloads) {
      expect(validateAlias(payload).ok, payload).toBe(false);
    }
  });

  it('requires alphanumeric boundaries', () => {
    for (const alias of ['-abc', 'abc-', '_abc', 'abc_']) {
      const result = validateAlias(alias);
      expect(result.ok, alias).toBe(false);
      if (!result.ok) expect(result.reason).toBe('invalid_boundary');
    }
  });

  it('rejects repeated separators', () => {
    for (const alias of ['a--b', 'a__b', 'a-_b']) {
      const result = validateAlias(alias);
      expect(result.ok, alias).toBe(false);
      if (!result.ok) expect(result.reason).toBe('consecutive_separators');
    }
  });

  it('rejects reserved aliases', () => {
    for (const alias of ['api', 'admin', 'login', 'dashboard', 'pricing', 'blog']) {
      const result = validateAlias(alias);
      expect(result.ok, alias).toBe(false);
      if (!result.ok) expect(result.reason).toBe('reserved');
    }
  });

  it('rejects reserved aliases regardless of case', () => {
    for (const alias of ['API', 'Admin', 'DASHBOARD']) {
      expect(validateAlias(alias).ok, alias).toBe(false);
    }
  });
});

describe('reserved aliases', () => {
  it('protects every SEO landing page route', () => {
    const seoRoutes = [
      'url-shortener',
      'short-url',
      'link-shortener',
      'free-url-shortener',
      'shorten-url',
      'custom-url-shortener',
      'qr-code-generator',
      'bulk-url-shortener',
      'url-expander',
      'url-checker',
      'utm-builder',
      'link-analytics',
    ];
    for (const route of seoRoutes) {
      expect(isReservedAlias(route), route).toBe(true);
    }
  });

  it('protects impersonation-prone words', () => {
    for (const word of ['verify', 'reset-password', 'billing', 'zurl', 'official']) {
      expect(isReservedAlias(word), word).toBe(true);
    }
  });

  it('protects well-known files', () => {
    for (const file of ['robots.txt', 'sitemap.xml', 'favicon.ico']) {
      expect(isReservedAlias(file), file).toBe(true);
    }
  });

  it('allows ordinary names', () => {
    for (const name of ['my-product', 'summer-sale', 'team-offsite']) {
      expect(isReservedAlias(name), name).toBe(false);
    }
  });
});

describe('isNonCodePath', () => {
  it('rejects asset-like paths before hitting the database', () => {
    for (const path of ['', '.env', '_next', 'favicon.ico', 'style.css', 'app.js', 'photo.png']) {
      expect(isNonCodePath(path), path).toBe(true);
    }
  });

  it('allows real short codes', () => {
    for (const code of ['a8K3xPq', 'my-product', 'abc123']) {
      expect(isNonCodePath(code), code).toBe(false);
    }
  });
});

describe('looksGenerated', () => {
  it('recognises generated codes', () => {
    for (let i = 0; i < 20; i += 1) {
      expect(looksGenerated(generateShortCode())).toBe(true);
    }
  });

  it('rejects custom aliases containing excluded characters', () => {
    expect(looksGenerated('my-product')).toBe(false);
    expect(looksGenerated('hello0')).toBe(false);
  });
});
