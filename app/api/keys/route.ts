/**
 * POST /api/keys — issue an API key for the signed-in user.
 * The plaintext key is returned once and never again.
 */

import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiSuccess, readJsonBody } from '@/lib/api/response';
import { createApiKey, listApiKeys } from '@/lib/auth/api-key';
import { getUserFromRequest } from '@/lib/auth/session';
import { logger } from '@/lib/observability/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ name: z.string().trim().max(64).optional() });

/** Hard cap so a single account cannot create unbounded keys. */
const MAX_KEYS = 10;

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return apiError('unauthorized', 'Sign in to manage API keys.');

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = schema.safeParse(body.value);
  if (!parsed.success) {
    return apiError('validation_error', 'That key name is not valid.');
  }

  const existing = await listApiKeys(user.id);
  if (existing.length >= MAX_KEYS) {
    return apiError(
      'forbidden',
      `You can have up to ${MAX_KEYS} active keys. Revoke one to create another.`,
    );
  }

  const { key, record } = await createApiKey(user.id, parsed.data.name ?? 'API key');

  logger.info('apikey.created', { userId: user.id, keyId: record.id });

  return apiSuccess(
    {
      // Shown once. Only the hash is persisted.
      key,
      record: {
        id: record.id,
        name: record.name,
        prefix: record.prefix,
        createdAt: record.createdAt.toISOString(),
        lastUsedAt: null,
      },
    },
    { status: 201 },
  );
}
