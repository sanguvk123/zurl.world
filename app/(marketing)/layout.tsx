import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';

/**
 * Marketing shell.
 *
 * Wraps every public, indexable page. Deliberately reads no session here: doing
 * so would opt every SEO page into per-request rendering. Session-dependent
 * header controls are handled client-side in `AuthNav`.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
