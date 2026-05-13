# Veloadout — Operations Runbook

Concrete reference for everything that keeps `veloadout.com` running:
which services we use and why, which secrets live where, which DNS
records point at what, and what to do when something breaks at 2am.

Audience: future-you, with admin access to all the dashboards listed
below. For the **why** of how the code is structured, see
[`architecture.md`](./architecture.md). This file is the **what** and
the **where**.

---

## 1. The big picture in one diagram

```
                        ┌────────────────────┐
                        │  veloadout.com     │
                        │  (Cloudflare DNS)  │
                        └─────────┬──────────┘
                                  │ A 76.76.21.21
                                  │ MX → Cloudflare Email Routing
                                  ▼
       ┌──────────────────────────────────────────────────────────┐
       │  Vercel — Next.js 15 on serverless (iad1)                │
       │  • static pages + API routes                             │
       │  • TLS terminated here                                   │
       └─────┬──────────────┬───────────────┬───────────────┬─────┘
             │              │               │               │
             ▼              ▼               ▼               ▼
       Supabase EU    Upstash eu-west-1  Anthropic       (Cloudflare
       (Postgres +    (Redis: rate       Console         Email Routing
       Auth + RLS)    limits & budgets)  (Claude)        → operator inbox
                              │                            for support@)
                              │
                              ▼
                       Resend EU (SMTP for auth emails)
```

Seven external dependencies. Each section below explains what one is,
why we picked it, and what to do if it falls over.

---

## 2. Services we depend on, in detail

### 2.1 GitHub — source of truth

- **What:** Git host for the codebase. Vercel watches `main` and
  auto-deploys on push.
- **Repo:** `https://github.com/alexzhel-io/veloadout`
- **Login:** GitHub account in the `alexzhel-io` org.
- **Why:** Vercel's GitHub integration gives us "git push → live"
  with zero CI config. GitLab/Bitbucket would work too, but the
  GitHub integration is the most mature.
- **What can go wrong:** GitHub outage stops deploys but does NOT
  affect the running site (Vercel only pulls on push). Status:
  https://www.githubstatus.com.

### 2.2 Vercel — hosting & serverless

- **What:** Hosts the Next.js app — both static assets and the API
  routes (which run as serverless functions). TLS, edge cache, CDN.
- **Project:** `dev-6363s-projects/veloadout`
- **Plan:** Hobby (free).
- **Region:** `iad1` (Washington D.C.) for serverless. Edge cache is
  global.
- **Why Vercel:** Next.js is from the same company; the platform is
  optimised for it. Preview deployments per PR, automatic TLS,
  generous free tier. The main alternative would be Railway or Fly.io
  — both viable but require more config and Docker.
- **Why Hobby plan:** the app is small. The serverless function
  duration cap of 60 s is enough for AI calls (`maxDuration = 60` is
  set on `/api/lookup`). If we ever need longer-running AI loops or
  >100 GB bandwidth/month, we upgrade to Pro ($20/month).
- **What can go wrong:**
  - Build failure on push — see Deployments tab, then the failed
    build's logs.
  - Function timeout — usually means Anthropic web-search took too
    long. Check `vercel logs`.
  - Region outage — rare; Vercel auto-fails over.
  - Quota exhaustion — Hobby caps 100 GB/month. Watch
    Project → Usage.

### 2.3 Supabase — Postgres, Auth, Storage

- **What:** Managed Postgres database with built-in Auth and RLS. We
  use Postgres + Auth; no Storage, no Realtime, no Edge Functions.
- **Project URL:** `https://pmesjklljvybdtudegxe.supabase.co`
- **Region:** EU (Ireland).
- **Plan:** Free.
- **Why Supabase:** Postgres with RLS is the cheapest way to skip
  writing a backend. The alternatives — Firebase (NoSQL, weird query
  model), self-hosted Postgres (ops burden), Neon + custom Auth — are
  each worse along the dimensions we care about.
- **Schema lives in code:** `src/infrastructure/supabase/schema.sql`
  is the canonical source. Apply migrations by pasting SQL into the
  Supabase SQL editor. We deliberately don't use Prisma/Drizzle
  migrations — schema changes are rare and the SQL file documents
  intent better than a migration history.
- **Auth:** Magic-link only. Email/password is NOT enabled. See
  `architecture.md` for the rationale.
- **Custom SMTP:** Resend (see §2.6). The built-in SMTP's 2-emails-per-hour
  cap is fatal for production.
- **What can go wrong:**
  - DB connection failures — usually transient. Check
    https://status.supabase.com.
  - RLS denial showing as "succeeded but no row affected" — easy to
    misread; we now check `{ error }` on every Supabase call and
    throw.
  - Free-tier quota: 500 MB database, 50 000 monthly active users,
    2 GB egress/month. We won't hit these for a while.

### 2.4 Anthropic — Claude AI

- **What:** Provides the `claude-haiku-4-5-20251001` model and the
  `web_search_20250305` tool for AI gear lookups.
- **API key:** `VELOADOUT_API_KEY` env var (historical naming — not
  `ANTHROPIC_API_KEY`).
- **Where called:** `src/infrastructure/ai/ClaudeGearSearchService.ts`.
- **Why Claude (not OpenAI):** the `web_search` tool is the
  decider. OpenAI's equivalent (browsing) requires extra plumbing or
  routing through ChatGPT plugins. Anthropic's tool is server-side,
  results are deterministic, and the multi-turn loop is well-documented.
- **Why Haiku specifically:** good enough for spec extraction,
  10–20× cheaper than Sonnet/Opus. We trade some accuracy for cost;
  the "dig deeper" retry handles cases where Haiku missed details.
- **Cost shape:** pay-per-call. Soft cap of 500/day in our code (see
  `checkDailyBudget`). At today's Haiku pricing that's roughly
  $0.25/day worst-case. Anthropic dashboard shows real spend.
- **What can go wrong:**
  - Quota / billing — check Anthropic Console → Usage.
  - Model deprecation — Anthropic announces months ahead. When
    Haiku 4.5 retires, update the model string in
    `ClaudeGearSearchService.ts`.
  - 5xx from Anthropic — we log and return `not_found`; the user
    sees the not-found UI but no error.

### 2.5 Cloudflare — DNS & Email Routing

- **What:** Two unrelated services on the same domain:
  - **DNS** for `veloadout.com` (A and CNAME records pointing at
    Vercel).
  - **Email Routing** that forwards `support@veloadout.com` to the
    operator's real inbox.
- **Plan:** Free.
- **Why Cloudflare for DNS:** their DNS UI is the cleanest of the
  free providers and their nameservers are fast. We could use the
  registrar's nameservers directly, but Cloudflare is more pleasant
  to work with.
- **Why we DON'T use Cloudflare's proxy (orange cloud):** their
  proxy terminates TLS at their edge and re-encrypts to the origin.
  Vercel does its own TLS and the double-TLS fights produce SSL
  errors. All our A/CNAME records are "DNS only" (grey cloud).
- **Why Email Routing:** free, no third-party email provider needed
  for an inbound-only address.
- **What can go wrong:**
  - Cloudflare DNS outage — entire site becomes unreachable. Their
    SLA is high. Status: https://www.cloudflarestatus.com.
  - Someone toggles a record to proxied — site breaks with TLS
    errors. Fix: toggle it back to DNS only.
  - Email forwarding stops — inbound `support@` mail bounces. Check
    Email Routing → Routes for failures.

### 2.6 Resend — outgoing email (SMTP)

- **What:** SMTP provider used by Supabase Auth to send magic-link
  emails. Configured inside Supabase Auth → SMTP Settings.
- **Account:** signed in via GitHub.
- **Domain:** `veloadout.com`, verified with SPF/DKIM/DMARC TXT
  records in Cloudflare DNS.
- **Region:** EU (Frankfurt).
- **API key name:** `supabase-smtp` (scope: Sending only — not Full
  access, to limit blast radius if leaked).
- **Why Resend:** the cleanest dev experience among email APIs.
  Free tier (100/day, 3000/month) is enough for any non-viral
  growth. Alternatives: SendGrid (more enterprise-feeling, similar
  free tier), Postmark (great deliverability, smaller free tier),
  Amazon SES (cheapest at scale, painful to configure).
- **Why we don't call Resend directly from our code:** Supabase Auth
  needs to send the verification emails. Putting Resend in front of
  Supabase via SMTP is the simplest integration — our code stays the
  same (`signInWithOtp`), the emails just route through Resend.
- **What can go wrong:**
  - DNS record gets removed — domain unverifies, sending stops. Fix:
    re-verify in Resend dashboard.
  - 100/day cap exceeded — sending stops for 24h. Either upgrade
    Resend or temporarily revert to Supabase's built-in SMTP (with
    its 2/hour cap as fallback).
  - Resend outage — same fix: temporary fallback to Supabase
    built-in via Supabase Auth → SMTP Settings → disable custom.

### 2.7 Upstash — Redis for rate limits and the AI budget

- **What:** Serverless Redis. We use it for two things:
  - `rl:<scope>:<key>` — rate-limit counters with TTL.
  - `budget:ai_lookup:YYYY-MM-DD` — the daily AI call counter.
- **REST URL:** `https://full-halibut-122897.upstash.io`
- **Region:** eu-west-1 (Ireland), co-located with Supabase.
- **Plan:** Free (10 000 commands/day, generous).
- **Why Upstash (not in-memory):** Vercel's serverless functions are
  ephemeral — every cold start gets a new in-memory Map. A naive
  rate limit "per IP / hour" with a JS Map could be bypassed by
  hitting different instances. Upstash gives us shared state with
  near-zero latency from `iad1` to `eu-west-1` (~80 ms).
- **Why Redis (not Postgres):** Postgres works but is overkill —
  `INCR` and `EXPIRE` are atomic O(1) primitives in Redis. Doing
  the same in Postgres would either be slower (full row locking) or
  require a stored procedure.
- **Why Upstash specifically:** the REST interface eliminates
  connection-pool issues on serverless. Other options (Redis Cloud,
  Vercel KV) work, but Upstash's free tier is the largest.
- **Failure mode:** our code falls back to per-instance in-memory
  if Upstash is unreachable. Degraded (cold-start bypassable) but
  not broken. The daily budget cap fails *open* — better to let
  legitimate users through than block them all during a Redis
  outage.

---

## 3. Domain & DNS — concrete records on `veloadout.com`

The `veloadout.com` zone lives in Cloudflare. Records (snapshot of
what should be in there — actual values are in Cloudflare):

| Type | Name | Content | Proxy | Purpose |
|---|---|---|---|---|
| A | `@` | `76.76.21.21` | **DNS only** | Vercel apex |
| CNAME | `www` | `cname.vercel-dns.com` | **DNS only** | Vercel www |
| MX (×3) | `@` | Cloudflare's mailservers | **DNS only** | Inbound email for `support@` |
| TXT | `@` | `v=spf1 include:_spf.mx.cloudflare.net ~all` (or similar) | n/a | Inbound SPF (Cloudflare Email Routing) |
| TXT (Resend) | (per Resend) | Resend's verification value | n/a | Resend domain verification |
| TXT (DKIM) | (per Resend) | Resend's DKIM public key | n/a | Outbound DKIM signing |
| TXT (DMARC) | `_dmarc` | `v=DMARC1; p=none; ...` | n/a | Outbound DMARC policy |

**Why exactly these records:**

- The two A/CNAME records get user browsers to Vercel.
- The MX records receive inbound email. Cloudflare Email Routing
  delivers each `*@veloadout.com` per its routing rule (we have one
  rule: `support@` → operator inbox).
- The Resend TXT records prove we control the domain so Resend
  signs outgoing email correctly. Without DKIM, Gmail/Outlook drop
  our magic links into spam.

**If a record vanishes:**
- Site unreachable but DNS works → check the A record is still
  pointing at `76.76.21.21` and is grey (not orange) cloud.
- Magic links arrive in spam → check Resend → Domains, look for
  red marks on SPF/DKIM/DMARC. Re-add any missing TXT in Cloudflare.
- Inbound mail bouncing → check MX records are intact.

---

## 4. Environment variables — what each one does

All set in **Vercel → Project → Settings → Environment Variables**
under the `Production` environment. Optionally also `Preview` if you
want preview deploys to be fully functional.

| Variable | Used by | Where to find it if lost |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Every Supabase client. Public — leaks are harmless. | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Every Supabase client. Public — RLS protects data. | Supabase Dashboard → Settings → API → anon public key |
| `NEXT_PUBLIC_SITE_URL` | `/api/auth` builds the magic-link redirect URL from this. | Set to `https://veloadout.com` |
| `VELOADOUT_API_KEY` | `ClaudeGearSearchService`. Secret — leak = unbudgeted Anthropic spend. | Anthropic Console → Settings → API Keys (rotate if leaked) |
| `UPSTASH_REDIS_REST_URL` | `rateLimit.ts`. Public-ish — only useful with the token. | Upstash Console → your DB → REST API tab |
| `UPSTASH_REDIS_REST_TOKEN` | `rateLimit.ts`. Secret — leak = anyone can read/wipe Redis. | Same Upstash page |

**After changing any env var, you MUST redeploy.** Vercel does not
propagate env updates to existing deployments — only new builds
read the new values. Trigger via `npx vercel --prod` or the dashboard
"Redeploy" button.

**Local development** reads from `.env.local` (git-ignored). Copy
values from Vercel (`npx vercel env pull .env.local`) when you need
them.

---

## 5. The auth flow — exact URLs and what to whitelist

The full chain when a user clicks "Sign in":

1. Browser → `POST https://veloadout.com/api/auth` with `{email, locale}`
2. `/api/auth` calls Supabase: `signInWithOtp({email, options: {emailRedirectTo: 'https://veloadout.com/<locale>/auth/callback'}})`
3. Supabase generates a one-time code, asks Resend (over SMTP) to send the email
4. Resend delivers from `noreply@veloadout.com` to the user
5. Email contains a link to Supabase: `https://<supabase-project>.supabase.co/auth/v1/verify?token=...&redirect_to=https://veloadout.com/<locale>/auth/callback`
6. User clicks → Supabase verifies the code → 302 redirect to our callback
7. Our callback (`src/app/[locale]/auth/callback/route.ts`) calls `exchangeCodeForSession(code)` → sets session cookies → 302 to `/<locale>`

**For this to work, Supabase needs the redirect URLs whitelisted:**

Supabase Dashboard → **Authentication → URL Configuration**:
- **Site URL:** `https://veloadout.com`
- **Redirect URLs:**
  - `https://veloadout.com/en/auth/callback`
  - `https://veloadout.com/de/auth/callback`
  - `https://veloadout.com/ru/auth/callback`

If any of these are missing, Supabase rejects the redirect and the
user lands on `/<locale>?auth_error=...`. Our callback logs the
specific reason to Vercel function logs.

**Common reasons magic links don't work:**
- User clicked an old link (one-hour expiry, single-use)
- User opened the link in a different browser than where they
  requested it (PKCE cookie mismatch)
- The redirect URL isn't whitelisted (after a domain change)
- Resend domain became unverified (DNS record removed)

---

## 6. API routes — what every endpoint does

| Route | Method | Auth | Rate limit | Purpose |
|---|---|---|---|---|
| `/api/lookup?q=...&db_only=1` | GET | none | none | Fast DB search; returns `not_found` / `found_db` / `found_many` |
| `/api/lookup?q=...&depth=N` | GET | required | 20/user/hour + heuristic + miss-cache + 500/day budget | AI search, depth 1–3 |
| `/api/lookup` | POST | required | 20/user/hour | Save confirmed item to shared catalog; server generates `id` from English-name slug |
| `/api/lists` | GET | required | none | Load user's gear list |
| `/api/lists` | POST | required | none | Replace gear list atomically via `replace_gear_list_items` RPC |
| `/api/lists` | DELETE | required | none | Clear user's lists + sign out. Does NOT delete `auth.users` row (see §11) |
| `/api/auth` | POST | none | 10/IP/10min + 5/email/10min | Send magic link |
| `/api/auth` | DELETE | required | none | Sign out (browser also calls `supabase.auth.signOut()`) |
| `/api/presets` | GET | none | none | Static preset list |

The route catalog matches the user-facing flows. Each route name says
what it does; the auth & rate limit columns are the audit trail.

---

## 7. The 5-layer AI defence in detail

When a request hits `/api/lookup` with a query (and not `db_only=1`),
five gates run in order. Each gate is allowed to short-circuit with
either a 4xx response or a "not_found" success. The order is
intentional — cheap gates first.

1. **Auth.** `supabase.auth.getUser()`. If no user → 401, status
   `auth_required`. Cost: one Supabase call.
2. **Heuristic.** `looksLikeGarbage(query)` runs in-process, no I/O.
   Rejects "asdf", "111", strings with too few unique chars, etc. If
   garbage → return `not_found` immediately. Cost: ~0.
3. **Per-user rate limit.** Upstash `INCR rl:lookup:user:<uuid>`,
   20/hour. If exceeded → 429 with `resetIn` seconds.
4. **Negative cache.** Postgres `SELECT FROM ai_search_misses WHERE
   query_norm = ? AND expires_at > now()`. If hit → `not_found`. Cost:
   one indexed Postgres call.
5. **Daily budget.** Upstash `INCR budget:ai_lookup:<UTC-date>`,
   500/day. If exceeded → 503 with translated "try tomorrow" message.

Only after all five pass does the request reach
`ClaudeGearSearchService`. If the result is `not_found`, we write
the query to `ai_search_misses` (TTL 24h) so the same query is cheap
next time.

**Tuning the numbers.** They live as literals in
`src/app/api/lookup/route.ts`. To raise the daily budget, change `500`
in `checkDailyBudget('ai_lookup', 500)`. To raise per-user, change
the `20` in `checkRateLimit(\`lookup:user:${user.id}\`, 20, 3600)`.

---

## 8. Database — schema essentials and invariants

The schema is in `src/infrastructure/supabase/schema.sql`. Run it
through the Supabase SQL editor when applying changes.

Key invariants worth keeping in mind:

- **`gear_items.id` is server-generated.** Never trust an `id` from
  the client. `/api/lookup` POST always derives the slug from
  `names.en`. If you ever add a route that writes to `gear_items`,
  apply the same rule.

- **`search_text` is computed, never set by app code.** The
  `gear_items_search_text_trigger` populates it on insert/update.
  If you ever want to search by a new field, add it to the trigger
  body — not to app code.

- **`variants_json` is always non-empty.** Single-size products
  still get a `[{sizeLabel: "Standard", ...}]` row. Zod enforces
  `min(1)` on the AI response side.

- **`gear_list_items` doesn't have a `user_id`.** Ownership flows
  through `list_id IN (SELECT id FROM gear_lists WHERE user_id =
  auth.uid())`. Don't bypass this by joining directly on user_id.

- **`replace_gear_list_items` is the only way to replace a list.**
  Don't write code that does `delete + insert` directly — you'll
  lose atomicity.

- **`ai_search_misses` doesn't auto-clean.** Rows accumulate
  forever unless someone runs the cleanup query in §13.

---

## 9. Rate limits and budgets — the actual numbers

| What | Limit | Window |
|---|---|---|
| Magic link per IP | 10 | 10 min |
| Magic link per email | 5 | 10 min |
| AI search per user | 20 | 1 hour |
| AI catalog save per user | 20 | 1 hour |
| **Global daily AI budget** | **500 calls** | 1 day (UTC) |
| Resend outbound | 100/day, 3000/month | — |
| Supabase Auth emails | raised to ~30/hour in dashboard | — |

The magic-link numbers are after Resend was added. Pre-Resend they
were tighter (3/email/10min) because Supabase's built-in SMTP was
the bottleneck. With Resend handling delivery, 5/email/10min is
comfortable.

The 500/day AI cap is the cost ceiling. At today's Haiku 4.5 pricing,
worst case is roughly $0.25/day. Raise it when monitoring shows
real usage approaching it (currently nowhere near).

---

## 10. Recovery scenarios — playbooks for outages

### "The site is down"
1. `curl -I https://veloadout.com` — 502/503 → Vercel; DNS failure → Cloudflare.
2. `npx vercel ls` to see recent deployments. The latest "Ready"
   should match your last `main` commit.
3. Vercel Dashboard → Deployments → click the failed one → Build
   logs and Function logs.
4. Quick rollback: in Vercel UI find the previous green deployment,
   click "..." → Promote to Production. Or `npx vercel rollback
   <previous-url>`.

### "Magic-link emails not arriving"
1. **Spam folder first** — even with DKIM, Gmail's filter is
   sensitive to new domains.
2. **Was the request rate-limited?** Look in Vercel function logs
   for `/api/auth` returning 429.
3. **Resend dashboard → Emails** — find the failed delivery, look
   at the bounce reason.
4. **Supabase Logs → Auth** — confirm the `signInWithOtp` call
   reached Supabase.
5. **PKCE mismatch?** User opened the link in a different browser
   than where they requested it. Tell them to retry from the same
   browser.
6. **Resend down?** Temporarily disable custom SMTP in Supabase Auth
   Settings — sending falls back to Supabase's built-in (2/hour
   cap, but at least works).

### "AI search always returns not_found"
1. **Heuristic filter?** Try a clearly valid query like "Thermarest
   NeoAir". If it works, the rejected query just looked like garbage
   to `looksLikeGarbage`.
2. **Negative cache?** A legitimate query got cached as a miss.
   Delete from Supabase SQL editor:
   `DELETE FROM ai_search_misses WHERE query_norm = 'msr hubba';`
3. **Daily budget exhausted?** Check Upstash: `GET budget:ai_lookup:<today's UTC date>`.
   If >500, that's the cap. Raise temporarily or wait until UTC
   midnight.
4. **Anthropic outage?** Check
   https://status.anthropic.com. Errors appear in Vercel logs as
   `[ClaudeGearSearchService] error: ...`.
5. **`VELOADOUT_API_KEY` invalid?** Most common after rotation:
   the env var on Vercel wasn't redeployed. Re-add and `vercel --prod`.

### "Custom domain stops working"
1. `dig +short veloadout.com A` — should return `76.76.21.21`.
2. If not, Cloudflare → veloadout.com → DNS → check the A record is
   present and **grey cloud (DNS only)**, not orange.
3. If you just changed nameservers at the registrar, wait 24h for
   propagation.

### "User reports lost gear list"
1. `gear_lists` and `gear_list_items` are RLS-scoped to `auth.uid()`.
   The user might have signed in with a different email this time.
2. Did they call `DELETE /api/lists`? That clears their lists.
3. `replace_gear_list_items` is transactional — partial loss is
   impossible unless the RPC itself errored. Supabase Logs →
   Database → look for failed RPC calls in the right timeframe.
4. Supabase free tier includes 7-day point-in-time recovery —
   dashboard → Database → Backups. Roll back to a known-good time
   if needed.

### "Upstash Redis is unreachable"
1. **The site keeps working** — rate limit falls back to in-memory.
2. **Daily budget fails open** — AI calls aren't bounded. Watch
   Anthropic's Console → Usage tab manually until Upstash recovers.
3. Upstash status: https://status.upstash.com.

### "Supabase is down"
1. Auth, lists, and gear catalog all stop working.
2. The frontend doesn't crash — error boundaries handle the dead
   API gracefully. But anonymous DB search also fails.
3. Status: https://status.supabase.com. Their SLO on the free tier
   is best-effort; their actual uptime is high.

---

## 11. Things we deliberately did NOT do

These are conscious deferrals, tracked in
[`security-todo.md`](./security-todo.md). Listed here so future
contributors know they're aware-but-deprioritised, not bugs.

- **Full GDPR Article 17 erasure is manual.** The DELETE
  `/api/lists` endpoint clears the user's gear lists and signs them
  out, but the `auth.users` row stays. Full row deletion would
  require the Supabase **service-role key**, which we don't have
  deployed because a single leak of that key = full database
  compromise. The privacy policy directs users to
  `support@veloadout.com` for full erasure; the operator deletes via
  the Supabase dashboard.

- **No password auth alongside magic link.** Magic-link works fine
  now that Resend is wired up; adding passwords would add a
  forgot-password flow (still email-dependent) and a password-hash
  storage liability. Not worth the complexity at current scale.

- **No paid SMTP fallback.** If Resend fully goes down, magic-link
  rate drops back to Supabase's 2-emails/hour fallback. Acceptable
  for now.

- **No `pg_dump` cron / backup automation.** Relies on Supabase's
  built-in 7-day PITR. Fine for free tier; revisit if data becomes
  business-critical.

- **No structured logging or observability stack.** Only
  `console.error` to Vercel function logs. Sentry/Logflare would be
  the next step if traffic grows.

- **No CI running tests on PRs.** Vitest runs locally before push.
  When the suite grows past ~50 tests, add a GitHub Actions step.

- **Serverless region is `iad1` (US), backing services are EU.**
  Costs about 80–100 ms of latency to Supabase / Upstash / Resend.
  Moving the function region to `fra1` would close that gap but
  requires Vercel Pro.

---

## 12. Costs — current state and what triggers paid tiers

| Service | Plan | Current cost | When we'd pay |
|---|---|---|---|
| Vercel | Hobby | $0 | >100 GB bandwidth/month, or need `maxDuration > 60s`, or want per-PR previews behind passwords |
| Supabase | Free | $0 | >500 MB DB, >50 000 MAU, >2 GB egress, or need daily backups |
| Anthropic | Pay-per-use | ~$0–$0.25/day | Real usage growth (Haiku is cheap, watch monthly) |
| Cloudflare | Free | $0 | Custom (Pro tier adds advanced features we don't need) |
| Resend | Free | $0 | >100 emails/day or >3000/month |
| Upstash | Free | $0 | >10 000 commands/day |
| Domain | Cloudflare registrar | ~$10/year | renewal |
| **Total** | | **~$1/month amortised** | |

The first paid trigger will almost certainly be Anthropic if AI
search gets popular. Monitor `budget:ai_lookup:<date>` in Upstash
and the Anthropic Console alongside it.

---

## 13. Routine maintenance — monthly checklist

Run roughly monthly, or after an incident:

- [ ] **Anthropic Console → Usage.** Sanity-check daily spend
      against the 500-call budget.
- [ ] **Upstash → Browser → Keys.** `GET budget:ai_lookup:<today>`
      to see how close we are to the cap.
- [ ] **`ai_search_misses` table size.** In Supabase SQL editor:
      `SELECT count(*) FROM ai_search_misses;`. If >10 000, run
      `DELETE FROM ai_search_misses WHERE expires_at < now();`.
- [ ] **Resend → Domains.** SPF/DKIM/DMARC should all be green.
- [ ] **Supabase Dashboard banner.** Accept any TLS/DB-version
      upgrades the platform is recommending.
- [ ] **`npm audit`.** Bump `@upstash/redis`, `@supabase/*`,
      `@anthropic-ai/sdk` to the latest patch versions.
- [ ] **CSP violations.** Open the live site in DevTools → Console.
      Tighten `next.config.mjs` if no violations show up.

---

## 14. Bookmarks — every dashboard you'll ever need

| Service | URL | Auth |
|---|---|---|
| Vercel | https://vercel.com/dev-6363s-projects/veloadout | GitHub |
| Supabase | https://supabase.com/dashboard/project/pmesjklljvybdtudegxe | GitHub |
| Anthropic | https://console.anthropic.com | email |
| Cloudflare | https://dash.cloudflare.com → veloadout.com | email |
| Resend | https://resend.com/domains | GitHub |
| Upstash | https://console.upstash.com | email |
| GitHub repo | https://github.com/alexzhel-io/veloadout | alexzhel-io org |

Don't store credentials in this document. Use a password manager.
