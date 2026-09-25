/**
 * QR code encoder (ISO/IEC 18004), byte mode.
 *
 * Implemented directly rather than pulling a dependency: short URLs are short,
 * so only byte mode and versions 1–10 are needed, which is a few hundred lines.
 * It runs on the server, so the QR page ships no client-side JS to render a code.
 *
 * Pipeline: data -> byte-mode bitstream -> Reed-Solomon ECC -> interleave ->
 * matrix placement -> masking (all 8 masks scored) -> format/version info.
 */

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export type QrMatrix = {
  size: number;
  /** Row-major; true = dark module. */
  modules: boolean[][];
  version: number;
};

// --- Galois field GF(256) tables, primitive polynomial 0x11d ----------------

const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);

(function buildTables() {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    EXP_TABLE[i] = x;
    LOG_TABLE[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) {
    EXP_TABLE[i] = EXP_TABLE[i - 255] as number;
  }
})();

function gfMultiply(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[((LOG_TABLE[a] as number) + (LOG_TABLE[b] as number)) % 255] as number;
}

/** Generator polynomial for `degree` error-correction codewords. */
function generatorPolynomial(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i += 1) {
    const next = new Array<number>(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j += 1) {
      next[j] = (next[j] as number) ^ (poly[j] as number);
      next[j + 1] = (next[j + 1] as number) ^ gfMultiply(poly[j] as number, EXP_TABLE[i] as number);
    }
    poly = next;
  }
  return poly;
}

function reedSolomon(data: number[], eccLength: number): number[] {
  const generator = generatorPolynomial(eccLength);
  const remainder = new Array<number>(eccLength).fill(0);

  for (const byte of data) {
    const factor = byte ^ (remainder[0] as number);
    remainder.shift();
    remainder.push(0);
    for (let i = 0; i < eccLength; i += 1) {
      remainder[i] = (remainder[i] as number) ^ gfMultiply(generator[i + 1] as number, factor);
    }
  }

  return remainder;
}

// --- Capacity and block structure tables (versions 1-20, byte mode) ---------

/**
 * Highest version supported.
 *
 * Version 20 holds 861 bytes at level L and 652 at level M. That is far beyond
 * any short link (a Zurl URL is ~26 characters) and comfortably covers the
 * free-form text the QR tool accepts. Supporting versions 21-40 would add ~20
 * more table rows to encode content that does not scan reliably from a screen
 * or a printed page anyway, so the limit is deliberate.
 */
export const MAX_QR_VERSION = 20;

/**
 * Largest byte payload encodable, at the most permissive correction level.
 * Derived from the block table rather than hardcoded, so it cannot drift.
 */
export function maxQrBytes(ecl: ErrorCorrectionLevel = 'L'): number {
  const capacityBits = totalDataCodewords(MAX_QR_VERSION, ecl) * 8;
  const headerBits = 4 + 16; // mode indicator + 16-bit length for v10+
  return Math.floor((capacityBits - headerBits) / 8);
}

/** [ecc codewords per block, group1 blocks, group1 data cw, group2 blocks, group2 data cw] */
const BLOCK_TABLE: Record<ErrorCorrectionLevel, ReadonlyArray<readonly number[]>> = {
  L: [
    [7, 1, 19, 0, 0],
    [10, 1, 34, 0, 0],
    [15, 1, 55, 0, 0],
    [20, 1, 80, 0, 0],
    [26, 1, 108, 0, 0],
    [18, 2, 68, 0, 0],
    [20, 2, 78, 0, 0],
    [24, 2, 97, 0, 0],
    [30, 2, 116, 0, 0],
    [18, 2, 68, 2, 69],
    [20, 4, 81, 0, 0],
    [24, 2, 92, 2, 93],
    [26, 4, 107, 0, 0],
    [30, 3, 115, 1, 116],
    [22, 5, 87, 1, 88],
    [24, 5, 98, 1, 99],
    [28, 1, 107, 5, 108],
    [30, 5, 120, 1, 121],
    [28, 3, 113, 4, 114],
    [28, 3, 107, 5, 108],
  ],
  M: [
    [10, 1, 16, 0, 0],
    [16, 1, 28, 0, 0],
    [26, 1, 44, 0, 0],
    [18, 2, 32, 0, 0],
    [24, 2, 43, 0, 0],
    [16, 4, 27, 0, 0],
    [18, 4, 31, 0, 0],
    [22, 2, 38, 2, 39],
    [22, 3, 36, 2, 37],
    [26, 4, 43, 1, 44],
    [30, 1, 50, 4, 51],
    [22, 6, 36, 2, 37],
    [22, 8, 37, 1, 38],
    [24, 4, 40, 5, 41],
    [24, 5, 41, 5, 42],
    [28, 7, 45, 3, 46],
    [28, 10, 46, 1, 47],
    [26, 9, 43, 4, 44],
    [26, 3, 44, 11, 45],
    [26, 3, 41, 13, 42],
  ],
  Q: [
    [13, 1, 13, 0, 0],
    [22, 1, 22, 0, 0],
    [18, 2, 17, 0, 0],
    [26, 2, 24, 0, 0],
    [18, 2, 15, 2, 16],
    [24, 4, 19, 0, 0],
    [18, 2, 14, 4, 15],
    [22, 4, 18, 2, 19],
    [20, 4, 16, 4, 17],
    [24, 6, 19, 2, 20],
    [28, 4, 22, 4, 23],
    [26, 4, 20, 6, 21],
    [24, 8, 20, 4, 21],
    [20, 11, 16, 5, 17],
    [30, 5, 24, 7, 25],
    [24, 15, 19, 2, 20],
    [28, 1, 22, 15, 23],
    [28, 17, 22, 1, 23],
    [26, 17, 21, 4, 22],
    [30, 15, 24, 5, 25],
  ],
  H: [
    [17, 1, 9, 0, 0],
    [28, 1, 16, 0, 0],
    [22, 2, 13, 0, 0],
    [16, 4, 9, 0, 0],
    [22, 2, 11, 2, 12],
    [28, 4, 15, 0, 0],
    [26, 4, 13, 1, 14],
    [26, 4, 14, 2, 15],
    [24, 4, 12, 4, 13],
    [28, 6, 15, 2, 16],
    [24, 3, 12, 8, 13],
    [28, 7, 14, 4, 15],
    [22, 12, 11, 4, 12],
    [24, 11, 12, 5, 13],
    [24, 11, 12, 7, 13],
    [30, 3, 15, 13, 16],
    [28, 2, 14, 17, 15],
    [28, 2, 14, 19, 15],
    [26, 9, 13, 16, 14],
    [28, 15, 15, 10, 16],
  ],
};

/** Alignment pattern centre coordinates per version (index = version). */
const ALIGNMENT_POSITIONS: ReadonlyArray<readonly number[]> = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
  [6, 26, 50, 74],
  [6, 30, 54, 78],
  [6, 30, 56, 82],
  [6, 30, 58, 86],
  [6, 34, 62, 90],
];

function totalDataCodewords(version: number, ecl: ErrorCorrectionLevel): number {
  const row = BLOCK_TABLE[ecl][version - 1];
  if (!row) throw new Error(`Unsupported version ${version}`);
  const [, g1Blocks, g1Data, g2Blocks, g2Data] = row as [
    number,
    number,
    number,
    number,
    number,
  ];
  return g1Blocks * g1Data + g2Blocks * g2Data;
}

/** Smallest version that fits `byteLength` bytes at the given ECC level. */
function chooseVersion(byteLength: number, ecl: ErrorCorrectionLevel): number {
  for (let version = 1; version <= MAX_QR_VERSION; version += 1) {
    const capacity = totalDataCodewords(version, ecl);
    // 4 bits mode + character-count bits + payload.
    const headerBits = 4 + (version < 10 ? 8 : 16);
    const requiredBits = headerBits + byteLength * 8;
    if (requiredBits <= capacity * 8) return version;
  }
  throw new Error(`Content is too long for a version 1-${MAX_QR_VERSION} QR code.`);
}

// --- Bit buffer -------------------------------------------------------------

class BitBuffer {
  private readonly bits: number[] = [];

  put(value: number, length: number): void {
    for (let i = length - 1; i >= 0; i -= 1) {
      this.bits.push((value >>> i) & 1);
    }
  }

  get length(): number {
    return this.bits.length;
  }

  toBytes(): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < this.bits.length; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8; j += 1) {
        byte = (byte << 1) | (this.bits[i + j] ?? 0);
      }
      bytes.push(byte);
    }
    return bytes;
  }
}

// --- Matrix construction ----------------------------------------------------

type Grid = { modules: (boolean | null)[][]; reserved: boolean[][]; size: number };

function createGrid(size: number): Grid {
  return {
    modules: Array.from({ length: size }, () => new Array<boolean | null>(size).fill(null)),
    reserved: Array.from({ length: size }, () => new Array<boolean>(size).fill(false)),
    size,
  };
}

function setModule(grid: Grid, row: number, col: number, dark: boolean, reserve = true): void {
  if (row < 0 || col < 0 || row >= grid.size || col >= grid.size) return;
  (grid.modules[row] as (boolean | null)[])[col] = dark;
  if (reserve) (grid.reserved[row] as boolean[])[col] = true;
}

function placeFinderPattern(grid: Grid, row: number, col: number): void {
  for (let r = -1; r <= 7; r += 1) {
    for (let c = -1; c <= 7; c += 1) {
      const rr = row + r;
      const cc = col + c;
      if (rr < 0 || cc < 0 || rr >= grid.size || cc >= grid.size) continue;
      const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
      const isCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      const inPattern = r >= 0 && r <= 6 && c >= 0 && c <= 6;
      setModule(grid, rr, cc, inPattern && (isBorder || isCore));
    }
  }
}

function placeAlignmentPatterns(grid: Grid, version: number): void {
  const positions = ALIGNMENT_POSITIONS[version] ?? [];
  for (const row of positions) {
    for (const col of positions) {
      // Skip the three corners occupied by finder patterns.
      if (
        (row === 6 && col === 6) ||
        (row === 6 && col === grid.size - 7) ||
        (row === grid.size - 7 && col === 6)
      ) {
        continue;
      }
      for (let r = -2; r <= 2; r += 1) {
        for (let c = -2; c <= 2; c += 1) {
          const dark = Math.max(Math.abs(r), Math.abs(c)) !== 1;
          setModule(grid, row + r, col + c, dark);
        }
      }
    }
  }
}

function placeTimingPatterns(grid: Grid): void {
  for (let i = 8; i < grid.size - 8; i += 1) {
    const dark = i % 2 === 0;
    if (!(grid.reserved[6] as boolean[])[i]) setModule(grid, 6, i, dark);
    if (!(grid.reserved[i] as boolean[])[6]) setModule(grid, i, 6, dark);
  }
}

/**
 * Coordinates of the 15 format-information modules, in bit order (bit 0 first).
 *
 * Taken from ISO/IEC 18004 figure 25. The mapping is irregular where it steps
 * over the timing patterns, so it is listed explicitly rather than derived.
 * `reserveFormatAreas` and `applyFormatInfo` both read from this function, which
 * guarantees the reserved set and the written set can never drift apart — a
 * mismatch silently corrupts data placement.
 */
function formatModulePositions(size: number): {
  primary: readonly (readonly [number, number])[];
  secondary: readonly (readonly [number, number])[];
} {
  const last = size - 1;
  return {
    primary: [
      [8, 0],
      [8, 1],
      [8, 2],
      [8, 3],
      [8, 4],
      [8, 5],
      [8, 7],
      [8, 8],
      [7, 8],
      [5, 8],
      [4, 8],
      [3, 8],
      [2, 8],
      [1, 8],
      [0, 8],
    ],
    // Bits 0-6 run upward from the bottom-left; bits 7-14 run rightward along
    // row 8 to the final column. Note the last entry is column `last`, not
    // `last - 1`: omitting it leaves one module unreserved and shifts the
    // entire data stream by a bit.
    secondary: [
      [last, 8],
      [last - 1, 8],
      [last - 2, 8],
      [last - 3, 8],
      [last - 4, 8],
      [last - 5, 8],
      [last - 6, 8],
      [8, last - 7],
      [8, last - 6],
      [8, last - 5],
      [8, last - 4],
      [8, last - 3],
      [8, last - 2],
      [8, last - 1],
      [8, last],
    ],
  };
}

function reserveFormatAreas(grid: Grid, version: number): void {
  const { primary, secondary } = formatModulePositions(grid.size);
  for (const [row, col] of [...primary, ...secondary]) {
    setModule(grid, row, col, false);
  }

  // The always-dark module, immediately above the bottom-left format strip.
  setModule(grid, grid.size - 8, 8, true);

  // Version information blocks (versions 7 and above).
  if (version >= 7) {
    for (let i = 0; i < 6; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        setModule(grid, grid.size - 11 + j, i, false);
        setModule(grid, i, grid.size - 11 + j, false);
      }
    }
  }
}

/**
 * Places the payload in the standard two-column zigzag.
 *
 * Column 6 is the vertical timing pattern. The walk must *skip past* it by
 * shifting the loop variable itself — merely substituting the pair index would
 * emit overlapping column pairs and never reach column 0.
 */
function placeData(grid: Grid, data: number[]): void {
  let bitIndex = 0;
  let upward = true;

  for (let right = grid.size - 1; right > 0; right -= 2) {
    if (right === 6) right = 5;

    for (let i = 0; i < grid.size; i += 1) {
      const row = upward ? grid.size - 1 - i : i;
      for (let c = 0; c < 2; c += 1) {
        const col = right - c;
        if ((grid.reserved[row] as boolean[])[col]) continue;

        const byte = data[bitIndex >>> 3] ?? 0;
        const bit = ((byte >>> (7 - (bitIndex & 7))) & 1) === 1;
        (grid.modules[row] as (boolean | null)[])[col] = bit;
        bitIndex += 1;
      }
    }
    upward = !upward;
  }
}

function maskFunction(mask: number, row: number, col: number): boolean {
  switch (mask) {
    case 0:
      return (row + col) % 2 === 0;
    case 1:
      return row % 2 === 0;
    case 2:
      return col % 3 === 0;
    case 3:
      return (row + col) % 3 === 0;
    case 4:
      return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5:
      return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6:
      return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    default:
      return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
  }
}

const FORMAT_GENERATOR = 0b10100110111;
const FORMAT_MASK = 0b101010000010010;
const ECL_BITS: Record<ErrorCorrectionLevel, number> = { L: 0b01, M: 0b00, Q: 0b11, H: 0b10 };

function formatBits(ecl: ErrorCorrectionLevel, mask: number): number {
  const data = ((ECL_BITS[ecl] as number) << 3) | mask;
  let value = data << 10;
  for (let i = 4; i >= 0; i -= 1) {
    if (value & (1 << (i + 10))) value ^= FORMAT_GENERATOR << i;
  }
  return ((data << 10) | value) ^ FORMAT_MASK;
}

function versionBits(version: number): number {
  let value = version << 12;
  for (let i = 5; i >= 0; i -= 1) {
    if (value & (1 << (i + 12))) value ^= 0b1111100100101 << i;
  }
  return (version << 12) | value;
}

/**
 * Writes the 15-bit format information in both required locations.
 *
 * Bit 0 is the least significant bit of the format value. The coordinate lists
 * below are taken directly from ISO/IEC 18004 figure 25 rather than derived
 * arithmetically — the mapping is irregular around the timing patterns, and an
 * off-by-one here makes the symbol undecodable while still looking correct.
 */
function applyFormatInfo(grid: Grid, ecl: ErrorCorrectionLevel, mask: number): void {
  const bits = formatBits(ecl, mask);
  const { primary, secondary } = formatModulePositions(grid.size);

  // The coordinate lists run in spec order, where the FIRST position holds the
  // most significant bit (bit 14) and the last holds bit 0.
  for (let i = 0; i < 15; i += 1) {
    const dark = ((bits >>> (14 - i)) & 1) === 1;
    const [pr, pc] = primary[i] as readonly [number, number];
    const [sr, sc] = secondary[i] as readonly [number, number];
    setModule(grid, pr, pc, dark);
    setModule(grid, sr, sc, dark);
  }

  // Re-assert the always-dark module: it sits inside the secondary strip range
  // and must not be overwritten by a format bit.
  setModule(grid, grid.size - 8, 8, true);
}

function applyVersionInfo(grid: Grid, version: number): void {
  if (version < 7) return;
  const bits = versionBits(version);
  for (let i = 0; i < 18; i += 1) {
    const dark = ((bits >>> i) & 1) === 1;
    const row = Math.floor(i / 3);
    const col = (i % 3) + grid.size - 11;
    setModule(grid, row, col, dark);
    setModule(grid, col, row, dark);
  }
}

/** Penalty scoring per the specification; the lowest-scoring mask wins. */
function scoreMatrix(modules: boolean[][], size: number): number {
  let penalty = 0;

  // Rule 1: runs of five or more identical modules.
  for (let i = 0; i < size; i += 1) {
    for (const isRow of [true, false]) {
      let runColour = false;
      let runLength = 0;
      for (let j = 0; j < size; j += 1) {
        const value = isRow
          ? ((modules[i] as boolean[])[j] as boolean)
          : ((modules[j] as boolean[])[i] as boolean);
        if (value === runColour) {
          runLength += 1;
        } else {
          if (runLength >= 5) penalty += runLength - 2;
          runColour = value;
          runLength = 1;
        }
      }
      if (runLength >= 5) penalty += runLength - 2;
    }
  }

  // Rule 2: 2x2 blocks of one colour.
  for (let r = 0; r < size - 1; r += 1) {
    for (let c = 0; c < size - 1; c += 1) {
      const a = (modules[r] as boolean[])[c] as boolean;
      if (
        a === ((modules[r] as boolean[])[c + 1] as boolean) &&
        a === ((modules[r + 1] as boolean[])[c] as boolean) &&
        a === ((modules[r + 1] as boolean[])[c + 1] as boolean)
      ) {
        penalty += 3;
      }
    }
  }

  // Rule 3: finder-like 1:1:3:1:1 patterns.
  const pattern = [true, false, true, true, true, false, true];
  for (let i = 0; i < size; i += 1) {
    for (let j = 0; j < size - 6; j += 1) {
      for (const isRow of [true, false]) {
        let matches = true;
        for (let k = 0; k < 7; k += 1) {
          const value = isRow
            ? ((modules[i] as boolean[])[j + k] as boolean)
            : ((modules[j + k] as boolean[])[i] as boolean);
          if (value !== (pattern[k] as boolean)) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;

        const hasLightBefore = (start: number) => {
          for (let k = start; k < start + 4; k += 1) {
            if (k < 0 || k >= size) continue;
            const value = isRow
              ? ((modules[i] as boolean[])[k] as boolean)
              : ((modules[k] as boolean[])[i] as boolean);
            if (value) return false;
          }
          return true;
        };
        if (hasLightBefore(j - 4) || hasLightBefore(j + 7)) penalty += 40;
      }
    }
  }

  // Rule 4: deviation from a 50% dark ratio.
  let dark = 0;
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if ((modules[r] as boolean[])[c]) dark += 1;
    }
  }
  const ratio = (dark * 100) / (size * size);
  penalty += Math.floor(Math.abs(ratio - 50) / 5) * 10;

  return penalty;
}

/**
 * Encodes `text` into a QR matrix.
 * @param text Content, UTF-8 encoded in byte mode.
 * @param ecl  Error correction level. 'M' (~15% recovery) is a good default.
 */
export function encodeQr(text: string, ecl: ErrorCorrectionLevel = 'M'): QrMatrix {
  if (text.length === 0) throw new Error('Cannot encode empty content.');

  const payload = Array.from(new TextEncoder().encode(text));
  const version = chooseVersion(payload.length, ecl);
  const size = version * 4 + 17;

  const row = BLOCK_TABLE[ecl][version - 1];
  if (!row) throw new Error(`Unsupported version ${version}`);
  const [eccPerBlock, g1Blocks, g1Data, g2Blocks, g2Data] = row as [
    number,
    number,
    number,
    number,
    number,
  ];

  const capacity = totalDataCodewords(version, ecl);
  const lengthBits = version < 10 ? 8 : 16;

  // Build the bitstream: mode indicator (0100 = byte), length, payload.
  const buffer = new BitBuffer();
  buffer.put(0b0100, 4);
  buffer.put(payload.length, lengthBits);
  for (const byte of payload) buffer.put(byte, 8);

  // Terminator (up to 4 zero bits) then pad to a byte boundary.
  const capacityBits = capacity * 8;
  const terminator = Math.min(4, capacityBits - buffer.length);
  if (terminator > 0) buffer.put(0, terminator);
  if (buffer.length % 8 !== 0) buffer.put(0, 8 - (buffer.length % 8));

  const dataCodewords = buffer.toBytes();
  // Alternating pad bytes specified by the standard.
  const PAD = [0xec, 0x11];
  let padIndex = 0;
  while (dataCodewords.length < capacity) {
    dataCodewords.push(PAD[padIndex % 2] as number);
    padIndex += 1;
  }

  // Split into blocks and compute ECC per block.
  const blocks: { data: number[]; ecc: number[] }[] = [];
  let offset = 0;
  for (let i = 0; i < g1Blocks; i += 1) {
    const data = dataCodewords.slice(offset, offset + g1Data);
    offset += g1Data;
    blocks.push({ data, ecc: reedSolomon(data, eccPerBlock) });
  }
  for (let i = 0; i < g2Blocks; i += 1) {
    const data = dataCodewords.slice(offset, offset + g2Data);
    offset += g2Data;
    blocks.push({ data, ecc: reedSolomon(data, eccPerBlock) });
  }

  // Interleave data then ECC codewords.
  const interleaved: number[] = [];
  const maxData = Math.max(g1Data, g2Data);
  for (let i = 0; i < maxData; i += 1) {
    for (const block of blocks) {
      if (i < block.data.length) interleaved.push(block.data[i] as number);
    }
  }
  for (let i = 0; i < eccPerBlock; i += 1) {
    for (const block of blocks) {
      interleaved.push(block.ecc[i] as number);
    }
  }

  // Build the base grid with all function patterns.
  const base = createGrid(size);
  placeFinderPattern(base, 0, 0);
  placeFinderPattern(base, 0, size - 7);
  placeFinderPattern(base, size - 7, 0);
  placeAlignmentPatterns(base, version);
  placeTimingPatterns(base);
  reserveFormatAreas(base, version);
  placeData(base, interleaved);

  // Try all eight masks, keep the lowest penalty.
  let best: boolean[][] | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let mask = 0; mask < 8; mask += 1) {
    const candidate = createGrid(size);
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        (candidate.modules[r] as (boolean | null)[])[c] = (base.modules[r] as (boolean | null)[])[
          c
        ] as boolean;
        (candidate.reserved[r] as boolean[])[c] = (base.reserved[r] as boolean[])[c] as boolean;
      }
    }

    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if ((candidate.reserved[r] as boolean[])[c]) continue;
        if (maskFunction(mask, r, c)) {
          (candidate.modules[r] as (boolean | null)[])[c] = !(candidate.modules[r] as (
            | boolean
            | null
          )[])[c];
        }
      }
    }

    applyFormatInfo(candidate, ecl, mask);
    applyVersionInfo(candidate, version);

    const solid = candidate.modules.map((r) => r.map((v) => v === true));
    const score = scoreMatrix(solid, size);
    if (score < bestScore) {
      bestScore = score;
      best = solid;
    }
  }

  if (!best) throw new Error('QR encoding failed.');
  return { size, modules: best, version };
}
