/**
 * GET /api/auth/session — minimal session probe.
 *
 * Exists so the header can show the right controls while the marketing pages
 * remain statically prerendered. Returns only a boolean and the email: never
 * the role, plan, or anything else that a public page has no use for.
 */

import { apiSuccess } from '@/lib/api/response';
import { getCurrentUser } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();

  const response = apiSuccess(
    user ? { signedIn: true as const, email: user.email } : { signedIn: false as const },
  );

  // Per-user and must never be cached by a CDN or shared proxy.
  response.headers.set('cache-control', 'private, no-store');
  return response;
}
