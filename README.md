# Veloadout

**Bikepacking gear volume calculator.** Live at [veloadout.com](https://veloadout.com).

You enter the gear you want to bring on a trip, the app sums up the
packed volume across all items, and recommends how to distribute that
volume between three bike bags — handlebar, frame, seat. When a
product isn't already in the shared catalog, Claude AI searches the
web for the manufacturer's spec sheet, extracts the packed volume and
size variants, and offers the result to the user for confirmation.
Confirmed items are written back to the catalog so the next person who
searches for the same product gets an instant DB hit.

---

## Stack at a glance

- **Frontend & API**: Next.js 15 (App Router) on Vercel
- **Database & Auth**: Supabase (Postgres + magic-link OTP)
- **AI**: Anthropic Claude Haiku with the `web_search` tool
- **Rate limit & daily AI budget**: Upstash Redis
- **Outbound email**: Resend SMTP via Supabase Auth
- **DNS & inbound email**: Cloudflare

For the **why** behind every choice, read
[`docs/architecture.md`](./docs/architecture.md).
For the **what's where** of all services, env vars, DNS records and
recovery procedures, read [`docs/operations.md`](./docs/operations.md).

---

## Running locally

Prerequisites:
- Node.js 20+ and `npm`
- A Supabase project (free tier is fine) with the schema applied (see
  `src/infrastructure/supabase/schema.sql`)
- An Anthropic API key
- An Upstash Redis database (free tier)

```bash
git clone https://github.com/alexzhel-io/veloadout.git
cd veloadout
npm install
cp .env.example .env.local        # then fill in values
npm run dev                       # http://localhost:3000
```

Test suite (Vitest, domain-layer only — no Supabase/Anthropic mocks):

```bash
npm test
```

Type check:

```bash
npx tsc --noEmit
```

---

## Project layout

```
src/
├── domain/           ← pure business logic, no I/O
├── application/      ← use cases composing domain + interfaces
├── infrastructure/   ← Supabase, Anthropic, Upstash adapters
├── presentation/     ← React components
├── app/              ← Next.js App Router (pages + API routes)
└── i18n/             ← messages for en / de / uk / ru

docs/
├── architecture.md       ← design decisions and rationale
├── operations.md         ← service inventory, DNS, env vars, recovery
├── requirements.md       ← FR / NFR checklist
├── security-todo.md      ← deferred items, with reasoning
├── investor-roadmap.md   ← acquisition-readiness roadmap
└── gear_catalog.json     ← seed data for the shared catalog
```

---

## Deployment

The `main` branch auto-deploys to Vercel on push. Required environment
variables (see `operations.md` for what each one does and where to
find it):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL
VELOADOUT_API_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

Schema migrations are applied manually by pasting the relevant block
from `src/infrastructure/supabase/schema.sql` into the Supabase SQL
editor — we deliberately don't use Prisma/Drizzle migrations.

---

## Authorship & license

All code, schemas, prompts and documentation in this repository were
authored by **Yevgen Zhelichowski**. No third-party contributions exist
at the time of writing.

This is **proprietary software, not open source.** See
[`LICENSE`](./LICENSE) for terms. The repository is public for
transparency (and to make potential acquisition diligence easier), but
that does not grant any usage rights.

For licensing inquiries: `support@veloadout.com`
