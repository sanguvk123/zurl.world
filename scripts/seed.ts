/**
 * Seeds development data.
 *
 *   npm run db:seed
 *
 * Creates two accounts, a spread of links, realistic click history and one open
 * abuse report — enough to exercise the dashboard, analytics and moderation UI.
 *
 * Refuses to run against production.
 */

import './load-env';
import { getDb } from '../lib/db';
import { runMigrations } from '../lib/db/migrate';
import { eq } from 'drizzle-orm';
import { abuseReports, clickEvents, links } from '../lib/db/schema';
import { createUser } from '../lib/auth/user';
import { createApiKey } from '../lib/auth/api-key';
import { createLink } from '../lib/links/service';
import { generateId } from '../lib/links/short-code';

const DEMO_PASSWORD = 'zurl-dev-password';

const COUNTRIES = ['IN', 'US', 'GB', 'DE', 'CA', 'AU', 'FR', 'BR', 'JP', 'NL'];
const REFERRERS = [
  'twitter.com',
  'news.ycombinator.com',
  'linkedin.com',
  'reddit.com',
  'google.com',
  null,
];
const DEVICES = ['mobile', 'desktop', 'mobile', 'desktop', 'tablet', 'bot'];
const BROWSERS = ['Chrome', 'Safari', 'Firefox', 'Edge', 'Chrome', 'Safari'];
const OSES = ['iOS', 'Windows', 'macOS', 'Android', 'Linux', 'Windows'];

function pick<T>(values: readonly T[], index: number): T {
  return values[index % values.length] as T;
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed a production database.');
  }

  const db = await getDb();
  await runMigrations(db);

  console.log('Seeding development data…');

  // --- Accounts ------------------------------------------------------------

  const owner = await createUser('demo@zurl.world', DEMO_PASSWORD);
  if (!owner.ok) throw new Error(`Could not create demo user: ${owner.message}`);

  const admin = await createUser('admin@zurl.world', DEMO_PASSWORD, 'admin');
  if (!admin.ok) throw new Error(`Could not create admin user: ${admin.message}`);

  const { key } = await createApiKey(owner.user.id, 'Development key');

  // --- Links ---------------------------------------------------------------

  const specs = [
    {
      url: 'https://example.com/products/spring-collection?utm_source=newsletter&utm_campaign=spring',
      alias: 'spring-sale',
      title: 'Spring campaign',
      clicks: 1_284,
    },
    {
      url: 'https://example.com/blog/how-we-built-our-design-system',
      title: 'Design system post',
      clicks: 412,
    },
    {
      url: 'https://example.com/docs/getting-started',
      alias: 'getting-started',
      title: 'Documentation',
      clicks: 867,
    },
    {
      url: 'https://example.com/pricing',
      alias: 'pricing-2026',
      title: 'Pricing page',
      clicks: 231,
    },
    { url: 'https://example.com/webinar/registration', title: 'Webinar signup', clicks: 96 },
    { url: 'https://example.com/careers/senior-engineer', title: 'Job posting', clicks: 44 },
    { url: 'https://example.com/changelog', clicks: 12 },
    { url: 'https://example.com/quiet-page', clicks: 0 },
  ] as const;

  let totalEvents = 0;

  for (const spec of specs) {
    const created = await createLink({
      destinationUrl: spec.url,
      ...('alias' in spec ? { alias: spec.alias } : {}),
      ...('title' in spec ? { title: spec.title } : {}),
      userId: owner.user.id,
    });

    if (!created.ok) {
      console.warn(`  skipped ${spec.url}: ${created.error.message}`);
      continue;
    }

    // Generate click history over the last 30 days, weighted toward recent
    // days so the chart has a realistic shape.
    const events: (typeof clickEvents.$inferInsert)[] = [];
    for (let i = 0; i < spec.clicks; i += 1) {
      const dayOffset = Math.floor(Math.sqrt(Math.random()) * 30);
      const timestamp = new Date(
        Date.now() - dayOffset * 24 * 60 * 60 * 1000 - Math.random() * 24 * 60 * 60 * 1000,
      );

      events.push({
        id: generateId('clk'),
        linkId: created.link.id,
        timestamp,
        country: pick(COUNTRIES, Math.floor(Math.random() * COUNTRIES.length)),
        region: null,
        city: null,
        referrerHost: pick(REFERRERS, Math.floor(Math.random() * REFERRERS.length)),
        deviceType: pick(DEVICES, Math.floor(Math.random() * DEVICES.length)),
        browser: pick(BROWSERS, Math.floor(Math.random() * BROWSERS.length)),
        os: pick(OSES, Math.floor(Math.random() * OSES.length)),
      });
    }

    // Insert in batches; a single statement with thousands of rows is slow.
    for (let i = 0; i < events.length; i += 200) {
      await db.insert(clickEvents).values(events.slice(i, i + 200));
    }

    if (spec.clicks > 0) {
      // Keep the denormalised counter consistent with the events just inserted.
      await db
        .update(links)
        .set({ clickCount: spec.clicks, lastClickedAt: new Date() })
        .where(eq(links.id, created.link.id));
    }

    totalEvents += events.length;
    console.log(`  created zurl.world/${created.link.shortCode} (${spec.clicks} clicks)`);
  }

  // --- An anonymous link, and one for moderation ---------------------------

  await createLink({ destinationUrl: 'https://example.org/anonymous-link' });

  const reported = await createLink({
    destinationUrl: 'https://suspicious-example.com/login',
    title: 'Reported link',
    userId: owner.user.id,
  });

  if (reported.ok) {
    await db.insert(abuseReports).values({
      id: generateId('rpt'),
      linkId: reported.link.id,
      category: 'phishing',
      details: 'This page imitates a bank sign-in form.',
      status: 'open',
    });
    console.log('  created one open abuse report');
  }

  console.log('\nSeed complete.');
  console.log(`  ${specs.length + 2} links, ${totalEvents} click events`);
  console.log('\nSign in with:');
  console.log(`  demo@zurl.world  / ${DEMO_PASSWORD}`);
  console.log(`  admin@zurl.world / ${DEMO_PASSWORD}   (admin)`);
  console.log(`\nAPI key (shown once): ${key}`);
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('Seed failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
