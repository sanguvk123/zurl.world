/**
 * Security headers applied to every response.
 *
 * The CSP is deliberately strict. Next.js injects inline bootstrap scripts, so
 * `'unsafe-inline'` is required for `script-src` in the absence of a nonce
 * pipeline; everything else is locked to `'self'`. No external script, style,
 * font or frame origin is permitted, because the app loads none.
 */

const isProduction = process.env.NODE_ENV === 'production';

const CSP_DIRECTIVES: Record<string, string[]> = {
  'default-src': ["'self'"],
  // Next's inline runtime bootstrap requires unsafe-inline. eval is only
  // tolerated in development for React Refresh.
  'script-src': isProduction
    ? ["'self'", "'unsafe-inline'"]
    : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'blob:'],
  'font-src': ["'self'", 'data:'],
  // The app talks only to its own origin.
  'connect-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'frame-src': ["'none'"],
  'manifest-src': ["'self'"],
  'worker-src': ["'self'", 'blob:'],
};

export function contentSecurityPolicy(): string {
  const directives = Object.entries(CSP_DIRECTIVES).map(
    ([key, values]) => `${key} ${values.join(' ')}`,
  );

  if (isProduction) {
    directives.push('upgrade-insecure-requests');
  }

  return directives.join('; ');
}

export function securityHeaders(): { key: string; value: string }[] {
  const headers = [
    { key: 'Content-Security-Policy', value: contentSecurityPolicy() },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-DNS-Prefetch-Control', value: 'on' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ];

  if (isProduction) {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload',
    });
  }

  return headers;
}
