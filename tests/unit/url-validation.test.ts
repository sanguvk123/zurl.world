import { describe, expect, it } from 'vitest';
import {
  MAX_URL_LENGTH,
  displayHost,
  normaliseUrl,
  truncateUrl,
  validateDestinationUrl,
} from '@/lib/links/url';

describe('validateDestinationUrl — accepts legitimate URLs', () => {
  const valid = [
    'https://example.com',
    'https://example.com/',
    'http://example.com/path',
    'https://sub.domain.example.co.uk/deep/path',
    'https://example.com/path?a=1&b=2',
    'https://example.com/path#fragment',
    'https://example.com:8443/custom-port',
    'https://example.com/%E2%9C%93',
    'https://xn--80ak6aa92e.com/',
    'https://1.1.1.1/',
  ];

  for (const url of valid) {
    it(`accepts ${url}`, () => {
      const result = validateDestinationUrl(url);
      expect(result.ok, `expected ${url} to be accepted`).toBe(true);
    });
  }

  it('assumes https when no scheme is supplied', () => {
    const result = validateDestinationUrl('example.com/products');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.url).toBe('https://example.com/products');
    }
  });
});

describe('validateDestinationUrl — rejects dangerous schemes', () => {
  const dangerous = [
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'JAVASCRIPT:alert(document.cookie)',
    'data:text/html,<script>alert(1)</script>',
    'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'ftp://example.com/file',
    'chrome://settings',
    'about:blank',
    'blob:https://example.com/uuid',
    'ws://example.com',
    'mailto:someone@example.com',
    'tel:+15551234567',
    'intent://scan/#Intent;scheme=zxing;end',
  ];

  for (const url of dangerous) {
    it(`rejects ${url}`, () => {
      const result = validateDestinationUrl(url);
      expect(result.ok, `expected ${url} to be rejected`).toBe(false);
    });
  }

  it('rejects schemes obfuscated with control characters', () => {
    // A textual check for "javascript:" misses these; parsing plus an
    // allowlist does not.
    const payloads = [
      'java\u0000script:alert(1)',
      'java\tscript:alert(1)',
      'java\nscript:alert(1)',
      'java\rscript:alert(1)',
    ];
    for (const payload of payloads) {
      expect(validateDestinationUrl(payload).ok, payload).toBe(false);
    }
  });

  it('reports unsupported_protocol for javascript URLs', () => {
    const result = validateDestinationUrl('javascript:alert(1)');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('unsupported_protocol');
    }
  });
});

describe('validateDestinationUrl — rejects private and internal hosts', () => {
  const blocked = [
    'http://localhost',
    'http://localhost:3000/admin',
    'http://127.0.0.1',
    'http://127.0.0.1:5432',
    'http://0.0.0.0',
    'http://10.0.0.5/internal',
    'http://192.168.1.1/router',
    'http://172.16.4.2',
    'http://172.31.255.255',
    'http://169.254.169.254/latest/meta-data/',
    'http://100.64.0.1',
    'http://[::1]:8080',
    'http://service.internal/api',
    'http://printer.local',
    'http://something.test',
    'http://intranet',
    'http://metadata.google.internal/computeMetadata/v1/',
  ];

  for (const url of blocked) {
    it(`rejects ${url}`, () => {
      const result = validateDestinationUrl(url);
      expect(result.ok, `expected ${url} to be rejected`).toBe(false);
      if (!result.ok) {
        expect(['private_host', 'malformed', 'missing_host']).toContain(result.reason);
      }
    });
  }

  it('still allows public IP literals', () => {
    expect(validateDestinationUrl('http://8.8.8.8/').ok).toBe(true);
  });
});

describe('validateDestinationUrl — other rejections', () => {
  it('rejects an empty string', () => {
    const result = validateDestinationUrl('');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('empty');
  });

  it('rejects whitespace only', () => {
    expect(validateDestinationUrl('     ').ok).toBe(false);
  });

  it('rejects URLs beyond the maximum length', () => {
    const long = `https://example.com/${'a'.repeat(MAX_URL_LENGTH)}`;
    const result = validateDestinationUrl(long);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('too_long');
  });

  it('rejects embedded credentials', () => {
    const result = validateDestinationUrl('https://user:password@evil.example.com/');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('credentials_in_url');
  });

  it('rejects links pointing back at Zurl', () => {
    const result = validateDestinationUrl('https://zurl.world/abc123');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('self_reference');
  });

  it('rejects malformed input', () => {
    for (const input of ['http://', 'https://', 'ht!tp://example.com', '://example.com']) {
      expect(validateDestinationUrl(input).ok, input).toBe(false);
    }
  });
});

describe('validateDestinationUrl — heuristic warnings', () => {
  it('flags punycode hosts as a homograph risk', () => {
    const result = validateDestinationUrl('https://xn--80ak6aa92e.com/');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.warnings).toContain('idn_homograph');
  });

  it('flags chaining to another shortener', () => {
    const result = validateDestinationUrl('https://bit.ly/abc');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.warnings).toContain('shortener_chain');
  });

  it('flags unusually deep subdomains', () => {
    const result = validateDestinationUrl('https://a.b.c.d.e.f.example.com/');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.warnings).toContain('deep_subdomain');
  });

  it('produces no warnings for an ordinary URL', () => {
    const result = validateDestinationUrl('https://example.com/blog/post');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.warnings).toEqual([]);
  });
});

describe('normaliseUrl — conservative by design', () => {
  it('preserves query parameter order and duplicates exactly', () => {
    const input = 'https://example.com/p?z=1&a=2&z=3&utm_source=x';
    const result = validateDestinationUrl(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.url).toBe(input);
    }
  });

  it('preserves the fragment', () => {
    const result = validateDestinationUrl('https://example.com/docs#section-2');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.url).toContain('#section-2');
  });

  it('preserves path case', () => {
    const result = validateDestinationUrl('https://example.com/Path/To/Page');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.url).toContain('/Path/To/Page');
  });

  it('lowercases the host but not the path', () => {
    const result = validateDestinationUrl('https://EXAMPLE.com/MixedCase');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.url).toBe('https://example.com/MixedCase');
  });

  it('drops default ports only', () => {
    expect(normaliseUrl(new URL('http://example.com:80/'))).toBe('http://example.com/');
    expect(normaliseUrl(new URL('https://example.com:443/'))).toBe('https://example.com/');
    expect(normaliseUrl(new URL('https://example.com:8443/'))).toBe('https://example.com:8443/');
  });

  it('adds a root path to a bare origin', () => {
    const result = validateDestinationUrl('https://example.com');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.url).toBe('https://example.com/');
  });
});

describe('display helpers', () => {
  it('strips www for display', () => {
    expect(displayHost('https://www.example.com/path')).toBe('example.com');
  });

  it('returns the input when it cannot be parsed', () => {
    expect(displayHost('not a url')).toBe('not a url');
  });

  it('truncates long URLs with an ellipsis', () => {
    const long = `https://example.com/${'a'.repeat(200)}`;
    const out = truncateUrl(long, 40);
    expect(out).toHaveLength(40);
    expect(out.endsWith('…')).toBe(true);
  });

  it('leaves short URLs untouched', () => {
    expect(truncateUrl('https://a.com', 40)).toBe('https://a.com');
  });
});
