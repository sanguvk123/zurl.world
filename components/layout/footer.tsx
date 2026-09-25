import Link from 'next/link';
import { LogoMark, Wordmark } from '@/components/brand/logo';
import { Container } from '@/components/ui';
import { SITE } from '@/lib/seo/site';

/**
 * Footer.
 *
 * Doubles as the site-wide internal linking hub: every tool page is reachable
 * from every page through here, which is what keeps the tool pages out of
 * orphan status.
 */

const FOOTER_SECTIONS = [
  {
    heading: 'Tools',
    links: [
      { href: '/url-shortener', label: 'URL Shortener' },
      { href: '/short-url', label: 'Short URL Generator' },
      { href: '/link-shortener', label: 'Link Shortener' },
      { href: '/custom-url-shortener', label: 'Custom URL Shortener' },
      { href: '/qr-code-generator', label: 'QR Code Generator' },
      { href: '/bulk-url-shortener', label: 'Bulk URL Shortener' },
      { href: '/url-expander', label: 'URL Expander' },
      { href: '/url-checker', label: 'URL Checker' },
      { href: '/utm-builder', label: 'UTM Builder' },
      { href: '/link-analytics', label: 'Link Analytics' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { href: '/blog', label: 'Blog' },
      { href: '/api', label: 'API Documentation' },
      { href: '/tools', label: 'All Tools' },
      { href: '/free-url-shortener', label: 'Free URL Shortener' },
      { href: '/shorten-url', label: 'How to Shorten a URL' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/pricing', label: 'Pricing' },
      { href: '/contact', label: 'Contact' },
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
      { href: '/report-abuse', label: 'Report Abuse' },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-surface/40">
      <Container>
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 sm:grid-cols-3 lg:grid-cols-4">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-2">
              <LogoMark />
              <Wordmark />
            </div>
            <p className="mt-3 max-w-xs text-sm leading-6 text-subtle">
              Simple tools for working with links on the web.
            </p>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <nav key={section.heading} aria-labelledby={`footer-${section.heading}`}>
              <h2
                id={`footer-${section.heading}`}
                className="text-2xs font-semibold tracking-widest text-faint uppercase"
              >
                {section.heading}
              </h2>
              <ul className="mt-3 space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted transition-colors hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-border py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-faint">
            © {new Date().getFullYear()} {SITE.name}
          </p>
          <p className="text-xs text-faint">{SITE.tagline}</p>
        </div>
      </Container>
    </footer>
  );
}
