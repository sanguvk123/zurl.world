/**
 * DELETE /api/keys/:id — revoke an API key.
 * Ownership is enforced in the service query.
 */

import type { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/response';
import { revokeApiKey } from '@/lib/auth/api-key';
import { getUserFromRequest } from '@/lib/auth/session';
import { logger } from '@/lib/observability/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request);
  if (!user) return apiError('unauthorized', 'Sign in to manage API keys.');

  const { id } = await context.params;
  const revoked = await revokeApiKey(id, user.id);

  if (!revoked) return apiError('not_found', 'No such API key.');

  logger.info('apikey.revoked', { userId: user.id, keyId: id });

  return apiSuccess({ revoked: true });
}
