/**
 * Short code generation and custom alias validation.
 */

import { randomBytes, randomUUID } from 'node:crypto';
import { isReservedAlias } from './reserved';

/**
 * Code alphabet.
 *
 * Base62 minus the characters people reliably misread when a link is written
 * down, read aloud, or passed through OCR:
 *   removed: 0 O o  (zero / letter O)
 *            1 l I  (one / lowercase L / uppercase i)
 *
 * 56 characters. A 7-character code gives 56^7 ≈ 1.7 x 10^12 possibilities,
 * so collisions stay negligible far past any realistic link volume and codes
 * are not practically enumerable.
 */
export const CODE_ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const DEFAULT_CODE_LENGTH = 7;
export const MIN_CODE_LENGTH = 6;
export const MAX_CODE_LENGTH = 8;

/**
 * Generates a cryptographically secure short code.
 *
 * Uses rejection sampling so every character in the alphabet is equally likely.
 * A naive `byte % alphabet.length` would bias the first
 * `256 % 56 = 32` characters, which is a real (if small) predictability leak.
 */
export function generateShortCode(length: number = DEFAULT_CODE_LENGTH): string {
  if (length < MIN_CODE_LENGTH || length > MAX_CODE_LENGTH) {
    throw new RangeError(
      `Short code length must be between ${MIN_CODE_LENGTH} and ${MAX_CODE_LENGTH}.`,
    );
  }

  const alphabetLength = CODE_ALPHABET.length;
  // Largest multiple of the alphabet length that fits in a byte; bytes at or
  // above this are discarded to keep the distribution uniform.
  const cutoff = Math.floor(256 / alphabetLength) * alphabetLength;

  let out = '';
  while (out.length < length) {
    const buffer = randomBytes(length * 2);
    for (const byte of buffer) {
      if (byte >= cutoff) continue;
      out += CODE_ALPHABET[byte % alphabetLength];
      if (out.length === length) break;
    }
  }

  return out;
}

/** Prefixed, non-sequential primary key. Internal ids are never exposed. */
export function generateId(prefix: string): string {
  return `${prefix}_${randomUUID().replaceAll('-', '')}`;
}

// ---------------------------------------------------------------------------
// Custom aliases
// ---------------------------------------------------------------------------

export const MIN_ALIAS_LENGTH = 3;
export const MAX_ALIAS_LENGTH = 48;

/**
 * Allowed alias characters: lowercase letters, digits, hyphen, underscore.
 *
 * Case policy: aliases are **stored and matched lowercase**. Mixed case in
 * links is a well-known source of "the link doesn't work" support tickets, and
 * having both `/Sale` and `/sale` owned by different people is a phishing
 * vector. Generated codes remain case-sensitive (they are never typed by hand);
 * user-chosen aliases are folded to lowercase.
 */
const ALIAS_PATTERN = /^[a-z0-9][a-z0-9_-]*[a-z0-9]$/;

export type AliasRejectionReason =
  | 'too_short'
  | 'too_long'
  | 'invalid_characters'
  | 'invalid_boundary'
  | 'consecutive_separators'
  | 'reserved'
  | 'looks_generated';

export type AliasValidationResult =
  | { ok: true; alias: string }
  | { ok: false; reason: AliasRejectionReason; message: string };

export function validateAlias(rawAlias: string): AliasValidationResult {
  const alias = rawAlias.trim().toLowerCase();

  if (alias.length < MIN_ALIAS_LENGTH) {
    return {
      ok: false,
      reason: 'too_short',
      message: `Custom links must be at least ${MIN_ALIAS_LENGTH} characters.`,
    };
  }

  if (alias.length > MAX_ALIAS_LENGTH) {
    return {
      ok: false,
      reason: 'too_long',
      message: `Custom links must be ${MAX_ALIAS_LENGTH} characters or fewer.`,
    };
  }

  if (!/^[a-z0-9_-]+$/.test(alias)) {
    return {
      ok: false,
      reason: 'invalid_characters',
      message: 'Use only letters, numbers, hyphens and underscores.',
    };
  }

  if (!ALIAS_PATTERN.test(alias)) {
    return {
      ok: false,
      reason: 'invalid_boundary',
      message: 'Custom links must start and end with a letter or number.',
    };
  }

  // "a--b" and "a__b" read as typos and enable near-duplicate impersonation
  // of an existing alias.
  if (/[-_]{2,}/.test(alias)) {
    return {
      ok: false,
      reason: 'consecutive_separators',
      message: 'Avoid repeated hyphens or underscores.',
    };
  }

  if (isReservedAlias(alias)) {
    return {
      ok: false,
      reason: 'reserved',
      message: 'That name is reserved. Try something else.',
    };
  }

  return { ok: true, alias };
}

/**
 * True when a stored code was randomly generated rather than user-chosen.
 * Used only for display ("custom" badge); authority lives in the DB column.
 */
export function looksGenerated(code: string): boolean {
  if (code.length < MIN_CODE_LENGTH || code.length > MAX_CODE_LENGTH) return false;
  return [...code].every((char) => CODE_ALPHABET.includes(char));
}
