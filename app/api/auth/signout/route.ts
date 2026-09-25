/**
 * POST /api/auth/signout
 *
 * POST only. A GET sign-out could be triggered by any image tag on any site,
 * which is a (minor) cross-site request forgery.
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, clearSessionCookie, invalidateSession } from '@/lib/auth/session';
import { absoluteUrl } from '@/lib/seo/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    // Delete the server-side record as well as the cookie; clearing only the
    // cookie would leave a usable session behind.
    await invalidateSession(token).catch(() => undefined);
  }

  await clearSessionCookie();

  return NextResponse.redirect(absoluteUrl('/'), { status: 303 });
}
