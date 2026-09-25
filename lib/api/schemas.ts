/**
 * Zod schemas for every request boundary.
 *
 * These validate *shape*; domain rules (protocol allowlist, reserved aliases,
 * expiry windows) live in the link service so they apply to every caller,
 * including internal ones.
 */

import { z } from 'zod';
import { MAX_URL_LENGTH } from '@/lib/links/url';
import { MAX_ALIAS_LENGTH, MIN_ALIAS_LENGTH } from '@/lib/links/short-code';
import { MAX_TITLE_LENGTH } from '@/lib/links/service';

/** Treats an empty string as absent, which is what an empty form field sends. */
const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? undefined : value))
  .optional();

export const createLinkSchema = z.object({
  url: z
    .string({ error: 'Enter a URL to shorten.' })
    .trim()
    .min(1, 'Enter a URL to shorten.')
    .max(MAX_URL_LENGTH, `URLs must be ${MAX_URL_LENGTH} characters or fewer.`),

  alias: optionalText.pipe(
    z
      .string()
      .min(MIN_ALIAS_LENGTH, `Custom links must be at least ${MIN_ALIAS_LENGTH} characters.`)
      .max(MAX_ALIAS_LENGTH, `Custom links must be ${MAX_ALIAS_LENGTH} characters or fewer.`)
      .optional(),
  ),

  title: optionalText.pipe(
    z.string().max(MAX_TITLE_LENGTH, `Titles must be ${MAX_TITLE_LENGTH} characters or fewer.`).optional(),
  ),

  password: optionalText.pipe(z.string().min(4).max(128).optional()),

  /** ISO 8601 datetime. */
  expiresAt: optionalText.pipe(
    z
      .string()
      .refine((value) => !Number.isNaN(Date.parse(value)), 'That expiry date is not valid.')
      .optional(),
  ),
});

export type CreateLinkRequest = z.infer<typeof createLinkSchema>;

export const updateLinkSchema = z.object({
  url: optionalText.pipe(z.string().max(MAX_URL_LENGTH).optional()),
  title: z.string().trim().max(MAX_TITLE_LENGTH).nullish(),
  expiresAt: z.string().nullish(),
  disabled: z.boolean().optional(),
});

export const abuseReportSchema = z.object({
  code: z.string().trim().min(1, 'Enter the short link you are reporting.').max(64),
  category: z.enum(['phishing', 'malware', 'spam', 'illegal', 'other'], {
    error: 'Choose a category.',
  }),
  details: z.string().trim().max(2000).optional(),
  email: z.string().trim().email('Enter a valid email address.').max(254).optional().or(z.literal('')),
});

export const signUpSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(254),
  password: z.string().min(10, 'Use at least 10 characters.').max(200),
});

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(254),
  password: z.string().min(1, 'Enter your password.').max(200),
});

export const linkPasswordSchema = z.object({
  password: z.string().min(1, 'Enter the password.').max(128),
});

export const qrSchema = z.object({
  content: z.string().trim().min(1, 'Enter a URL or text.').max(900),
  level: z.enum(['L', 'M', 'Q', 'H']).default('M'),
});

/** Flattens a ZodError into `{ field: message }` for form rendering. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !(key in out)) {
      out[key] = issue.message;
    }
  }
  return out;
}
