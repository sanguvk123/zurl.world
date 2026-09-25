import { describe, expect, it } from 'vitest';
import { encodeQr } from '@/lib/qr/encoder';
import { QUIET_ZONE, renderQrPng, renderQrSvg } from '@/lib/qr/render';

describe('encodeQr — structure', () => {
  it('produces a matrix of the correct size for its version', () => {
    const qr = encodeQr('https://zurl.world/a8K3xPq');
    expect(qr.size).toBe(qr.version * 4 + 17);
    expect(qr.modules).toHaveLength(qr.size);
    for (const row of qr.modules) {
      expect(row).toHaveLength(qr.size);
    }
  });

  it('chooses version 1 for content that fits in it', () => {
    // Version 1 at level M holds 16 data codewords, of which 14 are payload
    // once the mode and length header are subtracted.
    const qr = encodeQr('short-text');
    expect(qr.version).toBe(1);
    expect(qr.size).toBe(21);
  });

  it('chooses the smallest version that fits a typical short URL', () => {
    const qr = encodeQr('https://zurl.world/abc');
    expect(qr.version).toBe(2);
    expect(qr.size).toBe(25);
  });

  it('scales the version up as content grows', () => {
    const small = encodeQr('https://zurl.world/abc');
    const large = encodeQr(`https://zurl.world/${'a'.repeat(200)}`);
    expect(large.version).toBeGreaterThan(small.version);
  });

  it('throws on empty content', () => {
    expect(() => encodeQr('')).toThrow();
  });

  it('throws when content exceeds the maximum capacity', () => {
    expect(() => encodeQr('a'.repeat(5000))).toThrow(/too long/i);
  });

  it('handles UTF-8 content', () => {
    expect(() => encodeQr('https://example.com/café-☕')).not.toThrow();
  });
});

/**
 * The three finder patterns are the features a scanner locates first. If these
 * are wrong the code is unreadable regardless of payload correctness.
 */
describe('encodeQr — finder patterns', () => {
  const qr = encodeQr('https://zurl.world/a8K3xPq');

  function assertFinder(originRow: number, originCol: number): void {
    for (let r = 0; r < 7; r += 1) {
      for (let c = 0; c < 7; c += 1) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        const expected = isBorder || isCore;
        const actual = (qr.modules[originRow + r] as boolean[])[originCol + c];
        expect(actual, `finder module (${originRow + r},${originCol + c})`).toBe(expected);
      }
    }
  }

  it('places the top-left finder', () => assertFinder(0, 0));
  it('places the top-right finder', () => assertFinder(0, qr.size - 7));
  it('places the bottom-left finder', () => assertFinder(qr.size - 7, 0));

  it('places the separator around the top-left finder', () => {
    for (let i = 0; i < 8; i += 1) {
      expect((qr.modules[7] as boolean[])[i]).toBe(false);
      expect((qr.modules[i] as boolean[])[7]).toBe(false);
    }
  });
});

describe('encodeQr — timing patterns', () => {
  const qr = encodeQr('https://zurl.world/a8K3xPq');

  it('alternates along row 6', () => {
    for (let i = 8; i < qr.size - 8; i += 1) {
      expect((qr.modules[6] as boolean[])[i], `row 6 col ${i}`).toBe(i % 2 === 0);
    }
  });

  it('alternates down column 6', () => {
    for (let i = 8; i < qr.size - 8; i += 1) {
      expect((qr.modules[i] as boolean[])[6], `row ${i} col 6`).toBe(i % 2 === 0);
    }
  });
});

describe('encodeQr — dark module', () => {
  it('sets the always-dark module', () => {
    const qr = encodeQr('https://zurl.world/a8K3xPq');
    expect((qr.modules[qr.size - 8] as boolean[])[8]).toBe(true);
  });
});

describe('encodeQr — masking', () => {
  it('yields a roughly balanced dark/light ratio', () => {
    // Mask selection minimises a penalty that includes ratio deviation, so a
    // wildly skewed result indicates the scoring or masking is broken.
    const qr = encodeQr('https://zurl.world/a8K3xPq');
    let dark = 0;
    for (const row of qr.modules) {
      for (const cell of row) if (cell) dark += 1;
    }
    const ratio = dark / (qr.size * qr.size);
    expect(ratio).toBeGreaterThan(0.35);
    expect(ratio).toBeLessThan(0.65);
  });

  it('produces different matrices for different content', () => {
    const a = encodeQr('https://zurl.world/aaaaaaa');
    const b = encodeQr('https://zurl.world/bbbbbbb');
    expect(JSON.stringify(a.modules)).not.toBe(JSON.stringify(b.modules));
  });

  it('is deterministic for identical content', () => {
    const a = encodeQr('https://zurl.world/a8K3xPq');
    const b = encodeQr('https://zurl.world/a8K3xPq');
    expect(JSON.stringify(a.modules)).toBe(JSON.stringify(b.modules));
  });
});

describe('error correction levels', () => {
  it('supports every level', () => {
    for (const level of ['L', 'M', 'Q', 'H'] as const) {
      const qr = encodeQr('https://zurl.world/a8K3xPq', level);
      expect(qr.size).toBeGreaterThan(0);
    }
  });

  it('requires a larger version at higher correction levels', () => {
    const content = `https://zurl.world/${'x'.repeat(100)}`;
    expect(encodeQr(content, 'H').version).toBeGreaterThanOrEqual(
      encodeQr(content, 'L').version,
    );
  });
});

describe('renderQrSvg', () => {
  const svg = renderQrSvg('https://zurl.world/a8K3xPq');

  it('produces a well-formed SVG document', () => {
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('includes the quiet zone in the viewBox', () => {
    const qr = encodeQr('https://zurl.world/a8K3xPq');
    const expected = qr.size + QUIET_ZONE * 2;
    expect(svg).toContain(`viewBox="0 0 ${expected} ${expected}"`);
  });

  it('is accessible', () => {
    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label="QR code"');
  });

  it('uses a single path rather than thousands of rects', () => {
    const rectCount = (svg.match(/<rect/g) ?? []).length;
    expect(rectCount).toBe(1); // background only
    expect((svg.match(/<path/g) ?? []).length).toBe(1);
  });

  it('honours custom colours', () => {
    const custom = renderQrSvg('https://zurl.world/abc', {
      dark: '#123456',
      light: '#abcdef',
    });
    expect(custom).toContain('#123456');
    expect(custom).toContain('#abcdef');
  });
});

describe('renderQrPng', () => {
  const png = renderQrPng('https://zurl.world/a8K3xPq');

  it('emits a valid PNG signature', () => {
    expect(Array.from(png.slice(0, 8))).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });

  it('contains the required chunks in order', () => {
    const text = Buffer.from(png).toString('latin1');
    const ihdr = text.indexOf('IHDR');
    const idat = text.indexOf('IDAT');
    const iend = text.indexOf('IEND');
    expect(ihdr).toBeGreaterThan(0);
    expect(idat).toBeGreaterThan(ihdr);
    expect(iend).toBeGreaterThan(idat);
  });

  it('declares the expected dimensions', () => {
    const qr = encodeQr('https://zurl.world/a8K3xPq');
    const scale = 10;
    const expected = (qr.size + QUIET_ZONE * 2) * scale;
    const view = new DataView(png.buffer, png.byteOffset);
    // IHDR data begins 16 bytes in (8 signature + 4 length + 4 type).
    expect(view.getUint32(16)).toBe(expected);
    expect(view.getUint32(20)).toBe(expected);
  });

  it('respects the scale option', () => {
    const small = renderQrPng('https://zurl.world/abc', { scale: 4 });
    const large = renderQrPng('https://zurl.world/abc', { scale: 16 });
    expect(large.length).toBeGreaterThan(small.length);
  });

  it('stays small enough to serve inline', () => {
    expect(png.length).toBeLessThan(20_000);
  });
});
