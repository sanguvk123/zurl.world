import { ImageResponse } from 'next/og';
import { SITE } from '@/lib/seo/site';

/**
 * Open Graph card.
 *
 * Generated at build time with `next/og` — no design tool, no binary asset to
 * keep in sync with the brand, and it guarantees every page has a real card.
 */

export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#08090B',
          padding: '72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: '#4DD8C0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 40,
              fontWeight: 700,
              color: '#06231F',
            }}
          >
            Z
          </div>
          <div style={{ fontSize: 40, fontWeight: 600, color: '#F4F6F8' }}>Zurl</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 82,
              fontWeight: 600,
              color: '#F4F6F8',
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
            }}
          >
            Short links.
          </div>
          <div
            style={{
              fontSize: 82,
              fontWeight: 600,
              color: '#4DD8C0',
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
            }}
          >
            Zero hassle.
          </div>
          <div style={{ marginTop: 28, fontSize: 30, color: '#9AA4B2' }}>
            Create short, shareable links in seconds.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid #1F242C',
            paddingTop: 28,
          }}
        >
          <div style={{ fontSize: 26, color: '#6B7280' }}>zurl.world</div>
          <div style={{ fontSize: 26, color: '#6B7280' }}>Free URL shortener &amp; QR codes</div>
        </div>
      </div>
    ),
    size,
  );
}
