/**
 * Round-trip verification of the QR encoder against an independent decoder.
 *
 * Structural assertions (finder patterns, timing) prove the frame is right, but
 * only a real decoder proves the Reed-Solomon codewords, interleaving, masking
 * and format information are all correct. `jsqr` is a dev dependency used
 * solely for this test; it ships nowhere near production.
 */

import jsQR from 'jsqr';
import { describe, expect, it } from 'vitest';
import {
  encodeQr,
  MAX_QR_VERSION,
  maxQrBytes,
  type ErrorCorrectionLevel,
} from '@/lib/qr/encoder';
import { QUIET_ZONE } from '@/lib/qr/render';

/** Renders a matrix to the RGBA buffer jsQR expects. */
function toRgba(text: string, ecl: ErrorCorrectionLevel, scale = 4) {
  const qr = encodeQr(text, ecl);
  const modules = qr.size + QUIET_ZONE * 2;
  const dimension = modules * scale;
  const data = new Uint8ClampedArray(dimension * dimension * 4).fill(255);

  for (let y = 0; y < dimension; y += 1) {
    const moduleRow = Math.floor(y / scale) - QUIET_ZONE;
    if (moduleRow < 0 || moduleRow >= qr.size) continue;
    const row = qr.modules[moduleRow] as boolean[];

    for (let x = 0; x < dimension; x += 1) {
      const moduleCol = Math.floor(x / scale) - QUIET_ZONE;
      if (moduleCol < 0 || moduleCol >= qr.size) continue;
      if (!row[moduleCol]) continue;

      const offset = (y * dimension + x) * 4;
      data[offset] = 0;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
      data[offset + 3] = 255;
    }
  }

  return { data, dimension, version: qr.version };
}

function decode(text: string, ecl: ErrorCorrectionLevel = 'M'): string | null {
  const { data, dimension } = toRgba(text, ecl);
  return jsQR(data, dimension, dimension)?.data ?? null;
}

describe('QR round-trip — real short URLs', () => {
  const urls = [
    'https://zurl.world/abc',
    'https://zurl.world/a8K3xPq',
    'https://zurl.world/my-product',
    'https://zurl.world/spring-sale-2026',
    'https://zurl.world/Xy9TqLm',
  ];

  for (const url of urls) {
    it(`decodes ${url}`, () => {
      expect(decode(url)).toBe(url);
    });
  }
});

describe('QR round-trip — every error correction level', () => {
  const url = 'https://zurl.world/a8K3xPq';
  for (const level of ['L', 'M', 'Q', 'H'] as const) {
    it(`decodes at level ${level}`, () => {
      expect(decode(url, level)).toBe(url);
    });
  }
});

describe('QR round-trip — content lengths across versions', () => {
  // Each length pushes the encoder into a different version, exercising the
  // multi-block interleaving and the 16-bit length header above version 9.
  const lengths = [10, 25, 50, 80, 120, 180, 260, 400, 600];

  for (const length of lengths) {
    it(`decodes ${length} characters`, () => {
      const text = `https://zurl.world/${'a'.repeat(Math.max(1, length - 19))}`;
      expect(decode(text)).toBe(text);
    });
  }
});

describe('QR round-trip — multi-block interleaving', () => {
  it('decodes content large enough to require several blocks', () => {
    // Version 10+ at level M uses two groups with differing block sizes, which
    // is where an interleaving bug would surface.
    const text = `https://zurl.world/?data=${'x'.repeat(300)}`;
    const { version } = toRgba(text, 'M');
    expect(version).toBeGreaterThanOrEqual(10);
    expect(decode(text)).toBe(text);
  });

  it('decodes at the maximum supported version', () => {
    const text = `https://zurl.world/?d=${'y'.repeat(700)}`;
    const { version } = toRgba(text, 'L');
    expect(version).toBeLessThanOrEqual(MAX_QR_VERSION);
    expect(decode(text, 'L')).toBe(text);
  });
});

describe('QR round-trip — UTF-8', () => {
  it('decodes non-ASCII content', () => {
    const text = 'https://example.com/café';
    const decoded = decode(text);
    expect(decoded).toBe(text);
  });
});

describe('QR round-trip — capacity limits', () => {
  it('encodes and decodes content at the documented maximum', () => {
    const text = 'a'.repeat(maxQrBytes('L'));
    expect(decode(text, 'L')).toBe(text);
  });

  it('throws a clear error beyond the maximum', () => {
    expect(() => encodeQr('a'.repeat(maxQrBytes('L') + 1), 'L')).toThrow(/too long/i);
  });

  it('comfortably encodes any Zurl short link', () => {
    // A Zurl short URL is ~26 characters; the longest possible custom alias
    // still lands inside version 2.
    const longest = `https://zurl.world/${'a'.repeat(48)}`;
    const { version } = toRgba(longest, 'M');
    expect(version).toBeLessThanOrEqual(5);
    expect(decode(longest)).toBe(longest);
  });
});
