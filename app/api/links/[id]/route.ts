/**
 * Session-authenticated link mutations, used by the dashboard.
 *
 * PATCH  /api/links/:id
 * DELETE /api/links/:id
 *
 * Distinct from `/api/v1/links/:id`, which authenticates with an API key. Both
 * delegate to the same service functions, so ownership rules cannot diverge.
 */

import type { NextRequest } from 'next/server';
import { apiError, apiSuccess, readJsonBody } from '@/lib/api/response';
import { fieldErrors, updateLinkSchema } from '@/lib/api/schemas';
import { getUserFromRequest } from '@/lib/auth/session';
import { deleteUserLink, updateUserLink } from '@/lib/links/service';
import { serialiseLink } from '@/app/api/v1/serialise';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const user = await getUserFromRequest(request);
  if (!user) return apiError('unauthorized', 'Sign in to manage your links.');

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = updateLinkSchema.safeParse(body.value);
  if (!parsed.success) {
    return apiError('validation_error', 'Check the details and try again.', {
      fields: fieldErrors(parsed.error),
    });
  }

  const { id } = await context.params;

  const result = await updateUserLink(id, user.id, {
    ...(parsed.data.url !== undefined ? { destinationUrl: parsed.data.url } : {}),
    ...(parsed.data.title !== undefined ? { title: parsed.data.title ?? null } : {}),
    ...(parsed.data.expiresAt !== undefined
      ? { expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null }
      : {}),
    ...(parsed.data.disabled !== undefined ? { disabled: parsed.data.disabled } : {}),
  });

  if (!result.ok) {
    if (result.error.code === 'not_found') {
      return apiError('not_found', 'That link could not be found.');
    }
    return apiError('validation_error', result.error.message, { field: result.error.field });
  }

  return apiSuccess(serialiseLink(result.link));
}

export async function DELETE(request: NextRequest, context: Context) {
  const user = await getUserFromRequest(request);
  if (!user) return apiError('unauthorized', 'Sign in to manage your links.');

  const { id } = await context.params;
  const deleted = await deleteUserLink(id, user.id);

  if (!deleted) return apiError('not_found', 'That link could not be found.');

  return apiSuccess({ deleted: true });
}
