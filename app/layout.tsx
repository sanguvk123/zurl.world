import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SITE, absoluteUrl } from '@/lib/seo/site';

/**
 * Root layout.
 *
 * Holds only what every route needs. Marketing chrome (header/footer) lives in
 * the `(marketing)` group so the redirect route and app routes do not pay for it.
 */

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl('/')),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    // Every page title gets the brand suffix without repeating it per page.
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  referrer: 'strict-origin-when-cross-origin',
  formatDetection: { telephone: false, address: false, email: false },
  alternates: { canonical: absoluteUrl('/') },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-icon.png', sizes: '180x180' }],
  },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#08090b',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  // Never block zoom: doing so is a WCAG 1.4.4 failure.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only-focusable absolute top-2 left-2 z-50 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-ink"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
