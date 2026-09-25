# Zurl

**Short links. Zero hassle.**

A URL shortener and link-tooling platform. Paste a long URL, get a short one.
Plus QR codes, click analytics, a URL expander, a URL checker and a UTM builder.

Production domain: `https://zurl.world`

---

## Quick start

```bash
npm install
cp .env.example .env.local     # then set IP_HASH_SECRET
npm run db:migrate
npm run db:seed                # optional: demo data
npm run dev
```

Open <http://localhost:3000>.

The seed creates two accounts, both with the password `zurl-dev-password`:

| Email | Role |
| --- | --- |
| `demo@zurl.world` | user |
| `admin@zurl.world` | admin (can reach `/admin`) |

---

## Requirements

- Node.js 20 or newer
- A PostgreSQL database **for production**

There is no local database to install for development: `DATABASE_URL` defaults
to PGlite, which is PostgreSQL compiled to WebAssembly and runs in-process. It
executes the same migration SQL and enforces the same constraints, so local
behaviour matches production.

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm test` | Run the full test suite |
| `npm run test:watch` | Tests in watch mode |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Insert development data |
| `npm run db:generate` | Generate migration SQL from the schema |

---

## Environment variables

See `.env.example` for the annotated list. The essentials:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Production | Postgres connection string. Omit locally to use PGlite. |
| `NEXT_PUBLIC_APP_URL` | Yes | Absolute origin, no trailing slash. Drives canonical URLs, OG tags and the sitemap. |
| `IP_HASH_SECRET` | Production | Salt for hashing visitor IPs. Generate with `openssl rand -base64 32`. |
| `DATABASE_POOL_MAX` | No | Pool size. Keep low on serverless. |
| `LOG_LEVEL` | No | `debug` \| `info` \| `warn` \| `error`. |

Never commit real values. `.env.local` is gitignored.

---

## Database

### Setup

Any managed Postgres works — Neon, Supabase, RDS, Cloud SQL.

```bash
export DATABASE_URL="postgresql://user:pass@host:5432/zurl?sslmode=require"
npm run db:migrate
```

### Migrations

Plain `.sql` files in `drizzle/`, applied in filename order and recorded in a
`_migrations` table, so re-running is a no-op.

Migrations are **forward-only**. There are no down-migrations: rolling a schema
backwards in production is almost always more dangerous than rolling forward
with a corrective migration.

To change the schema, edit `lib/db/schema.ts`, run `npm run db:generate`, review
the generated SQL, then apply it.

Never edit a production database by hand.

---

## Deployment

The app is Vercel-compatible and has no platform-specific code beyond reading
standard proxy headers.

1. Provision a Postgres database and note its connection string.
2. Set `DATABASE_URL`, `NEXT_PUBLIC_APP_URL` and `IP_HASH_SECRET` in the host's
   environment settings.
3. Run `npm run db:migrate` against the production database.
4. Deploy.

### Domain configuration

`zurl.world` (apex) is the canonical host. `www.zurl.world` is redirected to it
with a 308 by `next.config.ts`. Point both at the deployment; the redirect is
handled in the application, so there is one canonical URL for every page.

If you use a different domain, update `SITE.domain` in `lib/seo/site.ts`, the
redirect rule in `next.config.ts`, and `NEXT_PUBLIC_APP_URL`.

### Monitoring

The application emits single-line JSON to stdout, which any log aggregator can
parse without a custom pattern. Events worth alerting on:

| Event | Meaning |
| --- | --- |
| `redirect.lookup_failed` | Database error on the redirect path. User-visible. |
| `analytics.record_failed` | Click write failed. Not user-visible, but data is lost. |
| `ratelimit.create_link` | Someone is hitting creation limits. |
| `abuse.auto_disabled` | A link was auto-disabled after repeated reports. |
| `auth.signin_ip_limited` | Possible credential stuffing. |

Logs deliberately exclude IP addresses, email addresses, tokens and API keys.

---

## Architecture

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full picture: stack
decisions and their rationale, the database model and index strategy, the
redirect hot path, the security model, and the SEO architecture.

Short version:

```
app/
  (marketing)/   Public, indexable pages — statically prerendered
  (app)/         Dashboard — authenticated, noindex
  (auth)/        Sign in / sign up — noindex
  admin/         Moderation — role-gated, returns 404 to non-admins
  api/           Route handlers
  [code]/        The redirect. One indexed query, then respond.
lib/
  db/ links/ auth/ security/ seo/ qr/ analytics/ observability/
components/
content/blog/    Articles as typed TS modules
drizzle/         Migration SQL
tests/           Unit + integration
```

---

## Testing

```bash
npm test
```

Integration tests run against a real PostgreSQL instance (PGlite) with the real
migration SQL applied, so constraints, unique indexes and `ON CONFLICT`
behaviour are genuinely exercised rather than mocked.

Coverage includes URL validation and the malicious-URL corpus, short-code
generation and distribution, collision handling, alias and reserved-word rules,
the full redirect lifecycle, analytics recording and its privacy guarantees,
authentication, API-key auth, cross-user authorization boundaries, rate
limiting, abuse reporting, SEO metadata and sitemap integrity, and QR encoding
verified against an independent decoder.

---

## Privacy

Zurl does not store visitor IP addresses or raw user-agent strings, sets no
cookie on people who click links, and records only the *host* of a referrer.
The [privacy page](https://zurl.world/privacy) describes the implemented
behaviour precisely.

Zurl does **not** scan destinations for malware or phishing, and never claims
to. Abuse is handled reactively through reports and moderation.

---

## Before going live

A few things must be supplied by whoever operates the service:

- **Contact addresses.** `/contact` lists `support@`, `privacy@` and
  `security@` on `zurl.world`. Configure real mailboxes or change them.
- **Legal entity details.** `/terms` deliberately contains no company
  registration, address or governing jurisdiction, because inventing them would
  be false. Add real details before accepting public traffic.
- **`IP_HASH_SECRET`.** Required in production. Without it the fallback
  development salt is used, which is public.
- **A shared rate-limit store.** The default limiter is in-process, so limits
  are per-instance. Implement `RateLimitStore` against Redis/Upstash before
  running more than one instance; no call site changes.
