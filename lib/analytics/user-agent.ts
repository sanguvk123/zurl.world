/**
 * User-agent parsing.
 *
 * Deliberately small: the raw UA string is a high-entropy fingerprinting
 * surface, so it is reduced to three low-cardinality enums and then discarded.
 * A full UA library would add a dependency and more precision than we want to
 * store.
 *
 * Order matters — many UAs impersonate others (Edge contains "Chrome", Chrome
 * contains "Safari"), so the most specific token is always tested first.
 */

import type { DeviceType } from '@/lib/db/schema';

export type ParsedUserAgent = {
  deviceType: DeviceType;
  browser: string;
  os: string;
};

const UNKNOWN: ParsedUserAgent = {
  deviceType: 'unknown',
  browser: 'Unknown',
  os: 'Unknown',
};

/** Substrings that identify automated traffic. */
const BOT_TOKENS = [
  'bot',
  'crawler',
  'spider',
  'crawling',
  'facebookexternalhit',
  'slackbot',
  'twitterbot',
  'whatsapp',
  'telegrambot',
  'discordbot',
  'linkedinbot',
  'pinterest',
  'headlesschrome',
  'phantomjs',
  'curl/',
  'wget/',
  'python-requests',
  'go-http-client',
  'axios/',
  'node-fetch',
  'postmanruntime',
  'lighthouse',
  'pingdom',
  'uptimerobot',
];

export function parseUserAgent(rawUserAgent: string | null | undefined): ParsedUserAgent {
  if (!rawUserAgent) return UNKNOWN;

  const ua = rawUserAgent.toLowerCase();
  if (ua.length === 0) return UNKNOWN;

  if (BOT_TOKENS.some((token) => ua.includes(token))) {
    return { deviceType: 'bot', browser: 'Bot', os: detectOs(ua) };
  }

  return {
    deviceType: detectDevice(ua),
    browser: detectBrowser(ua),
    os: detectOs(ua),
  };
}

function detectDevice(ua: string): DeviceType {
  // Tablets must be tested before phones: iPads and many Android tablets also
  // match generic mobile tokens.
  if (ua.includes('ipad')) return 'tablet';
  if (ua.includes('tablet')) return 'tablet';
  if (ua.includes('android') && !ua.includes('mobile')) return 'tablet';
  if (ua.includes('kindle') || ua.includes('silk/')) return 'tablet';

  if (ua.includes('iphone') || ua.includes('ipod')) return 'mobile';
  if (ua.includes('mobile')) return 'mobile';
  if (ua.includes('android')) return 'mobile';
  if (ua.includes('windows phone')) return 'mobile';

  if (
    ua.includes('windows') ||
    ua.includes('macintosh') ||
    ua.includes('linux') ||
    ua.includes('cros') ||
    ua.includes('x11')
  ) {
    return 'desktop';
  }

  return 'unknown';
}

function detectBrowser(ua: string): string {
  // Most specific first.
  if (ua.includes('edg/') || ua.includes('edga/') || ua.includes('edgios/')) return 'Edge';
  if (ua.includes('opr/') || ua.includes('opera')) return 'Opera';
  if (ua.includes('samsungbrowser')) return 'Samsung Internet';
  if (ua.includes('brave/')) return 'Brave';
  if (ua.includes('vivaldi')) return 'Vivaldi';
  if (ua.includes('duckduckgo')) return 'DuckDuckGo';
  if (ua.includes('firefox') || ua.includes('fxios')) return 'Firefox';
  if (ua.includes('chrome') || ua.includes('crios')) return 'Chrome';
  // Safari only after every Chromium-based browser has been excluded.
  if (ua.includes('safari')) return 'Safari';
  return 'Other';
}

function detectOs(ua: string): string {
  if (ua.includes('windows nt')) return 'Windows';
  // iOS before macOS: iPadOS reports "macintosh" in desktop-mode.
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) return 'iOS';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('cros')) return 'ChromeOS';
  if (ua.includes('mac os x') || ua.includes('macintosh')) return 'macOS';
  if (ua.includes('ubuntu')) return 'Ubuntu';
  if (ua.includes('linux')) return 'Linux';
  return 'Unknown';
}

/** Human label for a device enum. */
export function deviceLabel(device: string | null): string {
  switch (device) {
    case 'desktop':
      return 'Desktop';
    case 'mobile':
      return 'Mobile';
    case 'tablet':
      return 'Tablet';
    case 'bot':
      return 'Bot';
    default:
      return 'Unknown';
  }
}
