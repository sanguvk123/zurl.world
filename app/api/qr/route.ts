/**
 * GET /api/qr — render a QR code.
 *
 * `?format=svg` (default) returns an SVG document; `?format=png` returns a PNG.
 * Works without an account, as the brief requires.
 */

import type { NextRequest } from 'next/server';
import { apiError } from '@/lib/api/response';
import { qrSchema } from '@/lib/api/schemas';
import { encodeQr, type ErrorCorrectionLevel } from '@/lib/qr/encoder';
import { matrixToPng, matrixToSvg } from '@/lib/qr/render';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { getClientIp, hashIp } from '@/lib/security/request';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const parsed = qrSchema.safeParse({
    content: searchParams.get('content') ?? '',
    level: searchParams.get('level') ?? 'M',
  });

  if (!parsed.success) {
    return apiError('validation_error', 'Enter a URL or text to encode.');
  }

  const limit = await checkRateLimit('qrGenerate', hashIp(getClientIp(request.headers)));
  if (!limit.allowed) {
    return apiError('rate_limited', 'Too many QR codes. Try again shortly.');
  }

  const format = searchParams.get('format') === 'png' ? 'png' : 'svg';

  let matrix;
  try {
    matrix = encodeQr(parsed.data.content, parsed.data.level as ErrorCorrectionLevel);
  } catch {
    return apiError('validation_error', 'That content is too long to encode in a QR code.');
  }

  // QR output is a pure function of its input, so it is safe to cache hard.
  const cacheControl = 'public, max-age=31536000, immutable';

  if (format === 'png') {
    const png = matrixToPng(matrix, 10);
    return new Response(new Uint8Array(png), {
      headers: {
        'content-type': 'image/png',
        'cache-control': cacheControl,
        'content-disposition': 'inline; filename="qr.png"',
      },
    });
  }

  const svg = matrixToSvg(matrix, '#0A0A0A', '#FFFFFF');
  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': cacheControl,
    },
  });
}
