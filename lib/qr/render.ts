/**
 * QR rendering: matrix -> SVG string, and matrix -> PNG bytes.
 *
 * The PNG writer is hand-rolled (zlib is in Node's standard library) so QR
 * downloads need no canvas, no headless browser and no image dependency.
 */

import { deflateSync } from 'node:zlib';
import { encodeQr, type ErrorCorrectionLevel, type QrMatrix } from './encoder';

/** Quiet zone required by the spec so scanners can locate the symbol. */
export const QUIET_ZONE = 4;

export type QrRenderOptions = {
  /** Pixels per module in raster output. */
  scale?: number;
  dark?: string;
  light?: string;
  errorCorrection?: ErrorCorrectionLevel;
};

/**
 * Renders the matrix as an SVG path.
 *
 * One `<path>` with many subpaths rather than thousands of `<rect>` elements —
 * roughly an order of magnitude smaller and much faster for the browser.
 */
export function renderQrSvg(text: string, options: QrRenderOptions = {}): string {
  const { dark = '#0A0A0A', light = '#FFFFFF', errorCorrection = 'M' } = options;
  const matrix = encodeQr(text, errorCorrection);
  return matrixToSvg(matrix, dark, light);
}

export function matrixToSvg(matrix: QrMatrix, dark: string, light: string): string {
  const dimension = matrix.size + QUIET_ZONE * 2;

  const segments: string[] = [];
  for (let r = 0; r < matrix.size; r += 1) {
    const row = matrix.modules[r] as boolean[];
    let c = 0;
    while (c < matrix.size) {
      if (!row[c]) {
        c += 1;
        continue;
      }
      // Collapse horizontal runs into a single rectangle.
      let run = 1;
      while (c + run < matrix.size && row[c + run]) run += 1;
      segments.push(`M${c + QUIET_ZONE} ${r + QUIET_ZONE}h${run}v1h-${run}z`);
      c += run;
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimension} ${dimension}"`,
    ` width="${dimension * 8}" height="${dimension * 8}" shape-rendering="crispEdges"`,
    ` role="img" aria-label="QR code">`,
    `<rect width="${dimension}" height="${dimension}" fill="${light}"/>`,
    `<path d="${segments.join('')}" fill="${dark}"/>`,
    `</svg>`,
  ].join('');
}

// ---------------------------------------------------------------------------
// PNG
// ---------------------------------------------------------------------------

function crc32(buffer: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const body = new Uint8Array(typeBytes.length + data.length);
  body.set(typeBytes, 0);
  body.set(data, typeBytes.length);

  const chunk = new Uint8Array(4 + body.length + 4);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  chunk.set(body, 4);
  view.setUint32(4 + body.length, crc32(body));
  return chunk;
}

/**
 * Encodes the matrix as an 8-bit greyscale PNG.
 *
 * Greyscale keeps the file tiny (QR codes are two-tone) and every scanner and
 * image tool handles it.
 */
export function renderQrPng(text: string, options: QrRenderOptions = {}): Uint8Array {
  const { scale = 10, errorCorrection = 'M' } = options;
  const matrix = encodeQr(text, errorCorrection);
  return matrixToPng(matrix, scale);
}

export function matrixToPng(matrix: QrMatrix, scale: number): Uint8Array {
  const modules = matrix.size + QUIET_ZONE * 2;
  const dimension = modules * scale;

  // Raw scanlines: one filter byte (0 = None) per row, then one byte per pixel.
  const stride = dimension + 1;
  const raw = new Uint8Array(stride * dimension);
  raw.fill(0xff);

  for (let y = 0; y < dimension; y += 1) {
    raw[y * stride] = 0;
    const moduleRow = Math.floor(y / scale) - QUIET_ZONE;
    if (moduleRow < 0 || moduleRow >= matrix.size) continue;
    const row = matrix.modules[moduleRow] as boolean[];

    for (let x = 0; x < dimension; x += 1) {
      const moduleCol = Math.floor(x / scale) - QUIET_ZONE;
      if (moduleCol < 0 || moduleCol >= matrix.size) continue;
      if (row[moduleCol]) raw[y * stride + 1 + x] = 0x00;
    }
  }

  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, dimension);
  ihdrView.setUint32(4, dimension);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // colour type: greyscale
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const idat = new Uint8Array(deflateSync(raw, { level: 9 }));

  const chunks = [
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', new Uint8Array(0)),
  ];

  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const png = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    png.set(chunk, offset);
    offset += chunk.length;
  }
  return png;
}
