# Veloadout — Setup & Operations Guide

Bikepacking gear volume calculator. Next.js 15 + Supabase + Claude AI.

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS |
| i18n | next-intl (EN / DE / RU) |
| Auth & DB | Supabase (Postgres + magic link) |
| AI search | Anthropic Claude Haiku (`claude-haiku-4-5-20251001`) |
| Hosting | Vercel (recommended) |
| Analytics | Plausible (optional, cookieless) |

---

## Architecture

```
src/
  domain/          — business logic, no framework deps
    gear/          — GearItem, GearVariant, BagRecommendation, presets
    list/          — GearListItem (user lists)
  application/     — use cases (LookupOrSearchGearItem, GetPresets)
  infrastructure/
    supabase/      — Supabase clients, repositories, schema
    ai/            — ClaudeGearSearchService
    security/      — in-memory rate limiter
  presentation/
    components/    — React components
  i18n/messages/   — en.json, de.json, ru.json
  app/             — Next.js App Router pages & API routes
```

**Data flow for gear search:**
1. User types query → `SearchBar` calls `GET /api/lookup?q=...&db_only=1`
2. If found in Supabase → show immediately
3. If not found → call `GET /api/lookup?q=...` → Claude searches web
4. User sees confirmation card with variants → clicks Add
5. `POST /api/lookup` saves confirmed item to Supabase `gear_items`

**User lists:**
- Authenticated users get one list per account (`gear_lists` + `gear_list_items`)
- Auto-save with 2s debounce on every list change (AbortController prevents races)

---

## Local development

### Prerequisites

- Node.js 18+
- A Supabase project (free tier works)
- Anthropic API key

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create `.env.local` in the project root:

```env
# Anthropic — MUST use this name, not ANTHROPIC_API_KEY
# (Claude Desktop overrides ANTHROPIC_API_KEY with empty string)
VELOADOUT_API_KEY=sk-ant-api03-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Site URL for magic link redirects
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Optional: Plausible analytics domain
# NEXT_PUBLIC_PLAUSIBLE_DOMAIN=veloadout.com
```

### 3. Supabase — run schema

In **Supabase Dashboard → SQL Editor**, run these two files in order:

1. `src/infrastructure/supabase/schema.sql` — creates tables, indexes, RLS policies
2. `src/infrastructure/supabase/seed.sql` — populates gear catalog with ~30 common items

> Run schema.sql first, then seed.sql. Both are idempotent (`IF NOT EXISTS` / `ON CONFLICT DO NOTHING`).

### 4. Start dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Run tests

```bash
npm test
```

11 domain tests (BagRecommendation, GearVariant). No network, no DB.

---

## Deployment — Vercel (recommended)

### Step 1: Install Vercel CLI and deploy

```bash
npm i -g vercel
vercel
```

Follow the prompts. Vercel auto-detects Next.js.

### Step 2: Add environment variables

In **Vercel Dashboard → Project → Settings → Environment Variables**, add:

```
VELOADOUT_API_KEY           = sk-ant-api03-...     (all environments)
NEXT_PUBLIC_SUPABASE_URL    = https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
NEXT_PUBLIC_SITE_URL        = https://veloadout.com
NEXT_PUBLIC_PLAUSIBLE_DOMAIN = veloadout.com       (optional)
```

> Do NOT add `NEXT_PUBLIC_SITE_URL` on preview environments — the app auto-detects `VERCEL_URL` for those.

### Step 3: Add custom domain

1. **Cloudflare Registrar** → buy `veloadout.com` (~$10/yr, no markup)
2. In Vercel: **Project → Settings → Domains** → add `veloadout.com`
3. Vercel shows a CNAME value, e.g. `cname.vercel-dns.com`
4. In Cloudflare DNS → add CNAME record:
   - Name: `@` (or `veloadout.com`)
   - Target: the value from Vercel
   - Proxy: ON (orange cloud)
5. Wait a few minutes, HTTPS activates automatically

### Step 4: Update Supabase redirect URLs

In **Supabase Dashboard → Authentication → URL Configuration**:

- **Site URL**: `https://veloadout.com`
- **Redirect URLs** (add all):
  ```
  https://veloadout.com/en/auth/callback
  https://veloadout.com/de/auth/callback
  https://veloadout.com/ru/auth/callback
  https://*.vercel.app/en/auth/callback
  https://*.vercel.app/de/auth/callback
  https://*.vercel.app/ru/auth/callback
  ```

The wildcard `*.vercel.app` covers Vercel preview deployments.

### Step 5: Production deploy

```bash
vercel --prod
```

Or push to `main` branch if you connected GitHub in Vercel.

---

## Analytics — Plausible

Plausible is GDPR-friendly (no cookies, no personal data). EU-hosted option available.

1. Sign up at [plausible.io](https://plausible.io) (~$9/mo for 10k pageviews)
2. Add site: `veloadout.com`
3. Add to Vercel env vars: `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=veloadout.com`
4. Redeploy — the script loads automatically

Self-hosted alternative: [Umami](https://umami.is) (free, Docker).

---

## Monitoring — Sentry (optional)

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

The wizard creates `sentry.client.config.ts`, `sentry.server.config.ts`, and updates `next.config.mjs`. Add `SENTRY_DSN` to Vercel env vars.

---

## SEO — after deployment

1. **Google Search Console**
   - Go to [search.google.com/search-console](https://search.google.com/search-console)
   - Add property → Domain → `veloadout.com`
   - Verify via DNS TXT record in Cloudflare
   - Submit sitemap: `https://veloadout.com/sitemap.xml`

2. **Bing Webmaster Tools**
   - [bing.com/webmasters](https://www.bing.com/webmasters)
   - Import from Google Search Console (one click)

3. **llms.txt** — already deployed at `https://veloadout.com/llms.txt`
   - Helps AI assistants (Perplexity, ChatGPT) understand and cite your site

---

## Legal — before going public

### Impressum (required in Germany)

Edit `src/app/[locale]/impressum/page.tsx` — fill in your full address:

```tsx
Eugene Z.
Musterstraße 1        ← your street
12345 Berlin          ← your city
Deutschland
```

German law requires a real postal address. This is publicly visible.

### Privacy Policy

`src/app/[locale]/privacy/page.tsx` — already written, update the contact email if needed.
Currently set to `eugenez@gmx.de`.

### Terms of Service

`src/app/[locale]/terms/page.tsx` — generic terms, no changes required.

---

## Rate limits

Current limits (in-memory, resets on cold start):

| Endpoint | Limit | Window |
|---|---|---|
| `GET /api/lookup` (AI) | 20 req / IP | 1 hour |
| `POST /api/lookup` (AI) | 20 req / IP | 1 hour |
| `POST /api/auth` | 5 req / IP + 3 req / email | 10 minutes |

**To scale:** replace `src/infrastructure/security/rateLimit.ts` with [Upstash Redis](https://upstash.com) (free tier, persistent across cold starts):

```bash
npm install @upstash/ratelimit @upstash/redis
```

Add to Vercel env: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`.

---

## Supabase — production checklist

- [ ] RLS enabled on `gear_items`, `gear_lists`, `gear_list_items` (done in schema.sql)
- [ ] `anon` key only in frontend — never the `service_role` key
- [ ] Backups: Supabase free tier = 7-day PITR. Enable nightly export for extra safety:
  - Dashboard → Settings → Backups → Download backup
- [ ] Database size: free tier = 500 MB. Gear catalog stays well under this.

---

## Adding content

### Adding more gear items to the catalog

Run in Supabase SQL Editor:

```sql
INSERT INTO gear_items (id, names_json, aliases_json, volume_liters, weight_grams, category, variants_json)
VALUES (
  'custom-item-1',
  '{"en": "My Item", "de": "Mein Produkt", "ru": "Мой товар"}',
  '["alias1", "alias2"]',
  3.5,
  450,
  'sleep',
  '[]'
)
ON CONFLICT (id) DO NOTHING;
```

Valid categories: `sleep`, `shelter`, `clothing`, `cooking`, `tools`, `electronics`, `navigation`, `hygiene`, `food`, `water`, `other`

### Adding variants (multiple sizes)

```sql
INSERT INTO gear_items (id, names_json, aliases_json, volume_liters, weight_grams, category, variants_json)
VALUES (
  'custom-pad-1',
  '{"en": "NeoAir XLite NXT", "de": "NeoAir XLite NXT", "ru": "NeoAir XLite NXT"}',
  '["neоair xlite", "thermarest neоair"]',
  2.5,
  340,
  'sleep',
  '[
    {"sizeLabel": "Regular", "volumeLiters": 2.1, "weightGrams": 300},
    {"sizeLabel": "Regular Wide", "volumeLiters": 2.5, "weightGrams": 340},
    {"sizeLabel": "Large", "volumeLiters": 3.0, "weightGrams": 400}
  ]'
)
ON CONFLICT (id) DO NOTHING;
```

---

## Environment variables — full reference

| Variable | Required | Where used | Notes |
|---|---|---|---|
| `VELOADOUT_API_KEY` | Yes | Server only | Anthropic API key |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Client + Server | Project URL from Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Client + Server | Safe to expose, protected by RLS |
| `NEXT_PUBLIC_SITE_URL` | Prod only | Server | Used for magic link redirect |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | No | Client | If set, loads Plausible script |

---

## Migration — leaving Vercel

```js
// next.config.mjs — add:
output: 'standalone'
```

Then:

```bash
npm run build
# Output: .next/standalone/
node .next/standalone/server.js
```

Containerize with Docker, deploy anywhere. Supabase stays untouched.
