/**
 * Password hashing.
 *
 * scrypt from Node's standard library — memory-hard, and the parameters below
 * follow current OWASP guidance (N=2^16, r=8, p=1, ~64MB of memory per hash).
 * No third-party dependency is needed for this.
 *
 * Stored format: `scrypt$N$r$p$<salt-hex>$<hash-hex>`
 * The parameters are embedded so they can be raised later without invalidating
 * existing hashes.
 */

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

/**
 * Promisified scrypt.
 *
 * `promisify`'s overload resolution picks the 3-argument signature, so the
 * options-accepting form is typed explicitly here.
 */
const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const N = 2 ** 16;
const r = 8;
const p = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/** scrypt needs maxmem above roughly 128 * N * r bytes. */
const MAX_MEM = 128 * N * r * 2;

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 200;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, {
    N,
    r,
    p,
    maxmem: MAX_MEM,
  });

  return `scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, nRaw, rRaw, pRaw, saltHex, hashHex] = parts as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];

  const storedN = Number.parseInt(nRaw, 10);
  const storedR = Number.parseInt(rRaw, 10);
  const storedP = Number.parseInt(pRaw, 10);

  if (!Number.isFinite(storedN) || !Number.isFinite(storedR) || !Number.isFinite(storedP)) {
    return false;
  }

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltHex, 'hex');
    expected = Buffer.from(hashHex, 'hex');
  } catch {
    return false;
  }
  if (expected.length === 0) return false;

  let derived: Buffer;
  try {
    derived = await scrypt(password.normalize('NFKC'), salt, expected.length, {
      N: storedN,
      r: storedR,
      p: storedP,
      maxmem: 128 * storedN * storedR * 2,
    });
  } catch {
    return false;
  }

  // Constant-time comparison: a plain === would leak the hash byte by byte.
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

export type PasswordPolicyResult = { ok: true } | { ok: false; message: string };

/**
 * Length-first policy. Composition rules (a digit, a symbol, …) push people
 * toward `Password1!` and measurably reduce entropy, so we require length and
 * block only the most-guessed strings.
 */
export function checkPasswordPolicy(password: string): PasswordPolicyResult {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: `Passwords must be ${MAX_PASSWORD_LENGTH} characters or fewer.`,
    };
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { ok: false, message: 'That password is too common. Choose something less predictable.' };
  }
  if (/^(.)\1+$/.test(password)) {
    return { ok: false, message: 'That password is too simple.' };
  }
  return { ok: true };
}

const COMMON_PASSWORDS: ReadonlySet<string> = new Set([
  'password',
  'password1',
  'password12',
  'password123',
  'password1234',
  '1234567890',
  '12345678901',
  '123456789012',
  'qwertyuiop',
  'qwerty12345',
  'letmein123',
  'welcome123',
  'admin12345',
  'iloveyou123',
  'abc123456789',
  'passw0rd123',
  'zurlpassword',
]);
