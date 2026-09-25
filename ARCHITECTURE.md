# Zurl — Architecture

> Short links. Zero hassle.
> Production domain: `https://zurl.world`

---

## 1. Phase 0 audit

The target directory (`/Users/skalbemullge/Desktop/Zurl`) was **empty** at the start of
this project. There was no existing `package.json`, no routes, no database, no
components, no styling and no tests to preserve or reuse.

Environment facts that shaped the stack decisions:

| Fact | Consequence |
| --- | --- |
| Node v24.19.0, npm 11 | Modern toolchain available. |
| No local PostgreSQL server (`psql` absent) | Dev/test DB must not assume a running server. |
| No Docker | Cannot spin up a Postgres container for tests. |
| npm registry reachable | Dependency install is fine. |

Because there was nothing to preserve, this is a greenfield build. No destructive
changes were made to anything.

---

## 2. Stack decisions

Every decision below chose **the simplest production-grade option**, per the brief.

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) | Server-first rendering, route handlers, and a fast redirect path in one deployable unit. Vercel-compatible. |
| Language | TypeScript (strict) | `any` is banned by lint; explicit types throughout. |
| Styling | Tailwind CSS v4 | Zero-runtime CSS. Design tokens live in `@theme` in `app/globals.css`. |
| ORM | **Drizzle** | Chosen over Prisma: no query engine binary, far smaller cold start, and SQL-shaped queries that keep the redirect hot path predictable. Migrations are plain `.sql`. |
| Database | PostgreSQL | Required by brief. |
| Dev/test DB | **PGlite** (Postgres compiled to WASM) | No local Postgres and no Docker in this environment. PGlite runs the *same* schema and the *same* migration SQL in-process, so tests exercise real Postgres semantics (constraints, partial indexes, `ON CONFLICT`) instead of mocks. Production uses `node-postgres`. |
| Validation | Zod v4 | One schema per boundary; inferred types. |
| Auth | Hand-rolled server sessions | Not "insecure auth from scratch": it is the standard Lucia-style pattern — opaque 256-bit token, SHA-256 hashed at rest, HttpOnly/SameSite/Secure cookie, scrypt password hashing via Node `crypto`. Avoids a heavyweight dependency for an email+password flow. |
| Charts | Hand-written SVG | A charting library would be the single largest bundle in the app for three small charts. |
| QR codes | Hand-written encoder (`lib/qr`) | A full QR spec implementation for byte mode, ~8KB, no dependency, and it runs on the server so the QR page ships no client JS for rendering. |
| Tests | Vitest | Fast, native ESM/TS. |

### Dependency budget

Runtime dependencies are deliberately few: `next`, `react`, `react-dom`,
`drizzle-orm`, `pg`, `@electric-sql/pglite`, `zod`. There is no UI kit, no chart
library, no QR library, no auth library, no date library.

---

## 3. Directory layout

```
app/
  (marketing)/           Public, indexable pages. Shared header/footer.
    page.tsx             Homepage
    url-shortener/       ... 12 SEO tool landing pages
    blog/                Blog index + articles
    pricing, about, contact, privacy, terms, report-abuse, api/
  (app)/                 Authenticated area. noindex.
    dashboard/           Overview, links table
    links/[id]/          Per-link analytics + edit
    account/
  (auth)/                Sign in / sign up. noindex.
  admin/                 Moderation. noindex, role-gated.
  api/
    links/               Anonymous + session link creation
    v1/                  Public API (API-key auth)
    reports/, qr/
  [code]/                THE REDIRECT ROUTE. Must stay minimal.
  sitemap.ts, robots.ts, not-found.tsx
components/
  ui/                    Design system primitives
  marketing/, app/, seo/
lib/
  db/                    schema, client, migrations
  links/                 validation, short codes, reserved aliases
  auth/                  sessions, passwords, api keys
  security/              rate limiting, headers, url safety
  seo/                   metadata builders, JSON-LD
  qr/                    QR encoder
  analytics/             UA parsing, geo, aggregation
content/blog/            Article source (typed TS modules)
drizzle/                 Generated SQL migrations
tests/                   Unit + integration
```

---

## 4. Database model

Five tables. All ids are `text` primary keys holding a prefixed, random,
URL-safe id (`usr_…`, `lnk_…`) so **no internal sequential id is ever exposed**.

### `users`
`id`, `email` (citext-style lowercased, unique), `passwordHash`, `role`
(`user` | `admin`), `plan` (`free` | `pro` | `business`), timestamps.

### `links`
`id`, `shortCode` (unique), `destinationUrl`, `title`, `userId` (nullable — anonymous
links are supported), `createdAt`, `updatedAt`, `expiresAt`, `disabledAt`,
`disabledReason`, `passwordHash`, `clickCount`, `lastClickedAt`, `creatorIpHash`.

**Design note — `customAlias`:** the brief lists `shortCode` and `customAlias` as
separate fields. Storing an alias in a second column means the redirect route
must check two columns (two index probes, or an `OR` that can defeat index use),
and it creates a whole class of bugs where a generated code collides with an
existing alias. Instead there is **one** `shortCode` column that is the single
source of truth for the URL path, plus a boolean `isCustomAlias` recording how it
was created. This keeps the redirect a single unique-index lookup and makes
"alias collides with generated code" impossible by construction. The distinction
the brief cares about (was this user-chosen?) is fully preserved.

### `clickEvents`
`id`, `linkId`, `timestamp`, `country`, `region`, `city`, `referrerHost`,
`deviceType`, `browser`, `os`.

**Privacy:** raw IP addresses and raw user-agent strings are **never stored**. The
IP is used transiently to derive a coarse country/region (from CDN geo headers)
and is then discarded. The user-agent is parsed to a small enum triple
(device/browser/OS) and discarded. Referrers are reduced to their **host** only,
so query strings and paths from the referring page cannot leak.

### `apiKeys`
`id`, `userId`, `name`, `keyHash` (SHA-256; the plaintext key is shown exactly
once), `prefix` (for display), `lastUsedAt`, `revokedAt`.

### `abuseReports`
`id`, `linkId`, `category`, `details`, `reporterEmail` (optional),
`status` (`open` | `actioned` | `dismissed`), `createdAt`, `resolvedAt`, `resolvedBy`.

### Indexes

Driven by real query patterns, not guesswork:

| Index | Serves |
| --- | --- |
| `links.shortCode` UNIQUE | The redirect. Single equality probe, the hottest query in the system. |
| `links(userId, createdAt DESC)` | Dashboard link list, newest first. |
| `links.expiresAt` WHERE NOT NULL (partial) | Expiry sweeps without indexing the ~majority of rows that never expire. |
| `clickEvents(linkId, timestamp DESC)` | Per-link analytics and "recent clicks". |
| `clickEvents.timestamp` | Global/admin time-series. |
| `apiKeys.keyHash` UNIQUE | API auth lookup. |
| `sessions.id` PK + `sessions.userId` | Session validation and revoke-all. |
| `abuseReports(status, createdAt DESC)` | Moderation queue. |

---

## 5. Redirect path (performance-critical)

`GET /:code` is the only route where latency genuinely matters.

1. Reject known non-code paths cheaply before touching the DB.
2. **One** indexed query on `links.shortCode` selecting only the columns needed.
3. Evaluate state in memory: missing → 404 page; disabled → 410; expired → 410;
   password-protected → interstitial form.
4. Issue the redirect **immediately** (302, `Cache-Control: no-store`).
5. Record analytics **after** the response is committed, via `waitUntil` when the
   host provides it, otherwise a detached promise. The user never waits on an
   analytics write.

302 (not 301) is deliberate: 301 is cached by browsers essentially forever, which
would make link disabling, expiry and destination edits silently fail for anyone
who has already visited. Correctness beats a marginal RTT saving.

---

## 6. Security model

| Threat | Mitigation |
| --- | --- |
| `javascript:` / `data:` / `vbscript:` / `file:` URLs | Protocol allowlist: only `http:`/`https:`. Enforced after WHATWG parse, so encoding tricks cannot slip through. |
| SSRF-ish / internal targets | Block `localhost`, loopback, RFC1918, link-local, `.internal`/`.local`, and bare IPs where configured. |
| Self-referential redirect loops | Links pointing back at the Zurl host are rejected. |
| Alias squatting / route shadowing | A reserved-word list covering every app route, every API path, common admin/auth words, and file-like names (`favicon.ico`, `robots.txt`). |
| XSS via alias or title | Alias charset is `[a-z0-9-_]` only. All output goes through React's escaping; no `dangerouslySetInnerHTML` on user data. |
| SQL injection | Drizzle parameterises everything. No string-built SQL anywhere. |
| Brute-force alias enumeration | Rate limiting on the redirect route keyed by IP, plus non-sequential 7-char codes from a 57-char alphabet (~10^12 space). |
| Automated link creation | Rate limits: anonymous by IP, authenticated by user, API by key. |
| Credential brute force | Strict per-IP and per-account limits on sign-in. |
| Session theft | Opaque 256-bit tokens, SHA-256 hashed at rest, HttpOnly + SameSite=Lax + Secure, 30-day expiry with sliding refresh. |
| Timing attacks | `timingSafeEqual` for token/key comparison; scrypt for passwords. |
| Clickjacking / sniffing | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, CSP, `Referrer-Policy`, HSTS in production. |
| Abuse at scale | Public reporting flow → moderation queue → one-click disable. |

**Explicitly not claimed:** Zurl does **not** do malware or phishing detection.
There is no Safe Browsing integration. The product never says otherwise, and the
privacy page states this plainly. Heuristic checks that *are* implemented (IDN
homograph characters, excessive subdomain depth, known URL-shortener chaining)
are labelled as heuristics.

### Rate limiting

`lib/security/rate-limit.ts` defines a `RateLimitStore` interface with an
in-memory implementation. It is swappable for Redis/Upstash without touching a
single call site — limits are declared as data, not hard-coded into handlers, so
horizontal scaling is not blocked.

---

## 7. SEO architecture

- **Metadata:** one builder (`lib/seo/metadata.ts`). Every public route calls it;
  no route hand-writes an OG tag. Canonical URLs are always absolute.
- **Indexability:** public marketing/tool/blog pages are indexable. `/dashboard`,
  `/account`, `/admin`, `/api/*`, auth pages, password interstitials and short
  links themselves are `noindex, nofollow`.
- **Sitemap:** generated from a single route registry, so a page cannot be added
  without appearing in the sitemap. Individual short links are excluded — they are
  utility objects, not landing pages.
- **Structured data:** `WebSite` + `Organization` on the homepage,
  `SoftwareApplication` on tool pages, `FAQPage` where a visible FAQ exists,
  `BreadcrumbList` on nested pages, `BlogPosting` on articles. No invented ratings,
  reviews, or awards.
- **Internal linking:** a typed link graph (`lib/seo/internal-links.ts`) drives
  related-tool modules. Orphan pages are prevented by a test that asserts every
  registered route is linked from somewhere.
- **Thin content guard:** each of the 12 tool pages has genuinely distinct intent
  and its own copy, FAQs and, where it makes sense, its own working tool
  (expander, checker, UTM builder, bulk shortener are real, functioning tools —
  not doorway pages).

---

## 8. Testing strategy

- **Unit:** URL validation, short-code generation and collision retry, alias
  rules, reserved words, UA parsing, QR encoding, rate limiter, metadata builders.
- **Integration (real Postgres via PGlite):** create → redirect, custom alias →
  redirect, expired → blocked, disabled → blocked, password flow, analytics
  recording, authorization boundaries, API-key auth, admin gating.
- **SEO:** every registered public route has title/description/H1/canonical/OG;
  no public page is accidentally `noindex`; sitemap and robots are well-formed.
- **Security:** malicious URL corpus, XSS payloads through aliases and titles,
  injection strings, cross-user access attempts, rate-limit enforcement.

---

## 9. Deployment

Vercel-compatible. `DATABASE_URL` points at any managed Postgres (Neon, Supabase,
RDS). Migrations run via `npm run db:migrate` (plain SQL files, forward-only).
`www.zurl.world` 308-redirects to the apex `zurl.world`, which is the single
canonical host.

See `README.md` for the full runbook.
