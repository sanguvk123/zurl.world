/**
 * GET /api/expand — resolve a short link to its destination.
 *
 * For Zurl links this is a database lookup. For third-party shorteners it
 * follows the redirect chain with `redirect: 'manual'` so each hop is visible
 * and nothing is ever executed.
 *
 * Safety: outbound requests are only made to public hosts, the chain length and
 * timeout are bounded, and the response body is never fetched — only headers.
 */

import type { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/response';
import { findLinkByCode, linkState } from '@/lib/links/service';
import { validateDestinationUrl } from '@/lib/links/url';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { getClientIp, hashIp } from '@/lib/security/request';
import { SITE } from '@/lib/seo/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_HOPS = 5;
const TIMEOUT_MS = 5_000;

export type ExpandHop = { url: string; status: number | null };

export async function GET(request: NextRequest) {
  const raw = new URL(request.url).searchParams.get('url')?.trim() ?? '';

  if (raw.length === 0) {
    return apiError('validation_error', 'Enter a short link to expand.');
  }

  const limit = await checkRateLimit('qrGenerate', hashIp(getClientIp(request.headers)));
  if (!limit.allowed) {
    return apiError('rate_limited', 'Too many lookups. Try again shortly.');
  }

  // Reuse the destination validator: it enforces the protocol allowlist and
  // blocks private and internal hosts, which is exactly what we need before
  // making an outbound request.
  const validated = validateDestinationUrl(raw.replace(/^https?:\/\/(www\.)?zurl\.world/i, 'https://zurl.world'));

  let parsed: URL;
  try {
    parsed = new URL(raw.includes('://') ? raw : `https://${raw}`);
  } catch {
    return apiError('validation_error', 'That does not look like a valid link.');
  }

  // A Zurl link is resolved locally — no HTTP request needed, and it works for
  // disabled or expired links too, which is useful information for the user.
  if (parsed.hostname.toLowerCase().replace(/^www\./, '') === SITE.domain) {
    const code = parsed.pathname.replace(/^\//, '');
    const link = await findLinkByCode(code);

    if (!link) {
      return apiSuccess({
        input: raw,
        resolved: null,
        hops: [],
        note: 'That short link does not exist.',
      });
    }

    const state = linkState(link);
    if (state !== 'active') {
      return apiSuccess({
        input: raw,
        resolved: null,
        hops: [],
        note: state === 'expired' ? 'That link has expired.' : 'That link is no longer available.',
      });
    }

    if (link.passwordHash) {
      return apiSuccess({
        input: raw,
        resolved: null,
        hops: [],
        note: 'That link is password protected, so its destination is not shown.',
      });
    }

    return apiSuccess({
      input: raw,
      resolved: link.destinationUrl,
      hops: [{ url: parsed.toString(), status: 302 }],
      note: null,
    });
  }

  // Third-party link: follow the chain manually.
  if (!validated.ok && validated.reason === 'private_host') {
    return apiError('validation_error', 'That link points at a private address.');
  }

  const hops: ExpandHop[] = [];
  let current = parsed.toString();

  for (let hop = 0; hop < MAX_HOPS; hop += 1) {
    // Re-validate at every hop: a redirect chain can try to walk into a
    // private address after the first public one.
    const check = validateDestinationUrl(current);
    if (!check.ok) {
      return apiSuccess({
        input: raw,
        resolved: null,
        hops,
        note: 'The redirect chain pointed somewhere that cannot be followed.',
      });
    }

    let response: Response;
    try {
      response = await fetch(current, {
        method: 'HEAD',
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'user-agent': 'ZurlExpander/1.0 (+https://zurl.world/url-expander)' },
      });
    } catch {
      return apiSuccess({
        input: raw,
        resolved: hops.length > 0 ? current : null,
        hops,
        note: 'Could not reach that link. It may be offline or blocking automated requests.',
      });
    }

    hops.push({ url: current, status: response.status });

    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location) {
      current = new URL(location, current).toString();
      continue;
    }

    return apiSuccess({ input: raw, resolved: current, hops, note: null });
  }

  return apiSuccess({
    input: raw,
    resolved: current,
    hops,
    note: `Stopped after ${MAX_HOPS} redirects.`,
  });
}
