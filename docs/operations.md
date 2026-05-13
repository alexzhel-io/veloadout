# Veloadout — Operations Runbook

Concrete inventory of every service, secret, DNS record, redirect, and
budget that keeps veloadout.com running. Written so that, six months
from now, you can rebuild the deployment from scratch — or debug an
outage at 2am — without re-reading the codebase.

> **Audience:** future-you, with admin access to all the dashboards
> listed below.

---

## 1. Production URL map

| URL | Hosted by | Purpose |
|---|---|---|
| `https://veloadout.com` | Vercel | Production site |
| `https://www.veloadout.com` | Vercel | Redirects to apex |
| `https://veloadout.vercel.app` | Vercel | Default Vercel alias — same deployment, still works |
| `https://*.veloadout-*-dev-6363s-projects.vercel.app` | Vercel | Unique per-deployment URLs (used for `vercel inspect` etc.) |
| `mailto:support@veloadout.com` | Cloudflare Email Routing | Public contact email; forwards to operator inbox |
| `noreply@veloadout.com` | Resend SMTP | Sender for magic-link auth emails (outgoing only) |

The git remote is `https://github.com/alexzhel-io/veloadout`. The
Vercel team scope is `dev-6363s-projects` (visible in CLI output).

---

## 2. External services (in dependency order)

### 2.1 GitHub — source of truth

- **Repo:** `alexzhel-io/veloadout`
- **Branch deployed to prod:** `main`
- **Push triggers:** auto-deploy on Vercel (via Vercel's GitHub app)
- **Login:** the alexzhel-io org account

### 2.2 Vercel — hosting / serverless / CDN

- **Project:** `dev-6363s-projects/veloadout`
- **Framework:** Next.js 15 (App Router, `nodejs` runtime on API routes)
- **Build command:** default (`next build`)
- **Build cache:** auto via Vercel
- **Edge regions:** auto; primary serverless function region is `iad1` (Washington D.C.)
- **TLS certs:** Vercel-issued (Let's Encrypt) — auto-renewed
- **Important config in code:**
  - `maxDuration = 60` on `/api/lookup` (allows Anthropic web-search multi-turn loops)
  - `output: 'standalone'` for portability
  - Security headers (CSP, HSTS, X-Frame, etc.) in `next.config.mjs`
- **Cost:** Hobby plan (free). Watch out: Hobby caps serverless duration at 60s. AI calls deeper than that → upgrade required.

### 2.3 Supabase — Postgres + Auth

- **Project URL:** `https://pmesjklljvybdtudegxe.supabase.co`
- **Region:** EU (Ireland)
- **Schema source:** `src/infrastructure/supabase/schema.sql` — keep this as the canonical source. SQL run manually in the Supabase SQL Editor when migrating.
- **Tables:** `gear_items`, `gear_lists`, `gear_list_items`, `ai_search_misses`
- **Trigger:** `gear_items_search_text_trigger` computes `search_text` from `names_json || aliases_json` on insert/update
- **RPC:** `replace_gear_list_items(p_list_id, p_items jsonb)` — atomic list save
- **RLS:** enabled on every table — see `schema.sql` for exact policies
- **Auth provider:** Magic link / OTP. Email/password is NOT enabled.
- **SMTP:** Custom SMTP via Resend (configured in Supabase dashboard → Auth → SMTP)
- **Rate limits:** raised in dashboard → Auth → Rate Limits (was 2/hour default — raised to ~30/hour because Resend handles delivery)
- **Cost:** Free tier

### 2.4 Anthropic — Claude API

- **Model used:** `claude-haiku-4-5-20251001`
- **Where called:** `src/infrastructure/ai/ClaudeGearSearchService.ts`
- **Tool used:** `web_search_20250305` (multi-turn loop, max 3/6/10 searches by depth)
- **API key env var:** `VELOADOUT_API_KEY` (note: not `ANTHROPIC_API_KEY` — historical naming)
- **Cost:** pay-per-call. Soft cap: 500 calls/day via `checkDailyBudget('ai_lookup', 500)` in `/api/lookup`.

### 2.5 Cloudflare — DNS + Email Routing

- **Zone:** `veloadout.com`
- **Plan:** Free
- **Nameservers (at registrar):** `donna.ns.cloudflare.com`, `seth.ns.cloudflare.com`
- **What it does for us:**
  - DNS resolution (A / CNAME / MX / TXT records — see §3 below)
  - Email Routing: forwards `support@veloadout.com` to the operator inbox
- **What it does NOT do:**
  - Not proxying HTTP traffic — all A/CNAME records are **DNS-only** (grey cloud) because Cloudflare's proxy conflicts with Vercel's TLS handshake

### 2.6 Resend — outgoing SMTP

- **Account:** signed in via GitHub
- **Domain verified:** `veloadout.com` (SPF / DKIM / DMARC TXT records in Cloudflare)
- **Region:** EU (Frankfurt)
- **API key name:** `supabase-smtp` (scope: Sending only)
- **Where used:** Supabase Auth SMTP settings only. NOT directly called from our code.
- **Cost:** Free tier — 100 emails/day, 3000/month

### 2.7 Upstash — Redis (rate limit + budget)

- **REST URL:** `https://full-halibut-122897.upstash.io`
- **Region:** eu-west-1 (Ireland) — co-located with Supabase
- **Where used:** `src/infrastructure/security/rateLimit.ts`
- **What it stores:**
  - `rl:<scope>:<key>` — counters with TTL for rate limits
  - `budget:ai_lookup:YYYY-MM-DD` — global daily AI call counter
- **Behaviour if Redis is unreachable:** falls back to in-memory per-instance counters (degraded, not broken)
- **Cost:** Free tier — 10 000 commands/day

---

## 3. DNS records on Cloudflare (`veloadout.com`)

| Type | Name | Content | Proxy | Why |
|---|---|---|---|---|
| A | `@` (apex) | `76.76.21.21` | DNS only | Vercel hosting |
| CNAME | `www` | `cname.vercel-dns.com` | DNS only | Vercel hosting (www subdomain) |
| MX | `@` | (3 records, Cloudflare Email Routing's MX) | DNS only | Inbound email for `support@veloadout.com` |
| TXT | `@` | `v=spf1 include:_spf.mx.cloudflare.net ~all` (or similar) | n/a | SPF for inbound |
| MX + TXT | (Resend records) | (Resend-provided) | DNS only | Outbound SMTP via Resend — SPF, DKIM, DMARC |

> If a record disappears, check Cloudflare → veloadout.com → DNS → Records. The actual MX values are visible there — don't hardcode them here because Cloudflare's mailservers can change.

---

## 4. Environment variables

All set in **Vercel → Project → Settings → Environment Variables**, environment = `Production` (and optionally `Preview`).

| Variable | Used by | Where to get it (if lost) |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | every Supabase client | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | every Supabase client | Supabase Dashboard → Settings → API → anon public key |
| `NEXT_PUBLIC_SITE_URL` | auth callback redirects (`/api/auth`) | Set to `https://veloadout.com` |
| `VELOADOUT_API_KEY` | `ClaudeGearSearchService` | Anthropic Console → API Keys |
| `UPSTASH_REDIS_REST_URL` | `rateLimit.ts` | Upstash Console → Database → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | `rateLimit.ts` | Upstash Console → Database → REST API |

After changing any env var: **must redeploy** (`npx vercel --prod`) — env updates do not propagate to existing deployments.

Local development reads from `.env.local` (which is git-ignored — never commit).

---

## 5. Auth / magic-link flow — concrete URLs

The full round-trip:

1. User clicks **Sign in** in the UI → submits email
2. Browser → `POST https://veloadout.com/api/auth` with `{email, locale}`
3. Our handler calls `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: 'https://veloadout.com/<locale>/auth/callback' } })`
4. Supabase Auth generates a one-time code, asks Resend SMTP to send the email
5. Resend delivers from `noreply@veloadout.com` — link points to `https://<your-supabase-project>.supabase.co/auth/v1/verify?token=...&redirect_to=https://veloadout.com/<locale>/auth/callback`
6. User clicks → Supabase verifies the code → 302 redirect to `https://veloadout.com/<locale>/auth/callback?code=...`
7. Our callback (`src/app/[locale]/auth/callback/route.ts`) calls `exchangeCodeForSession(code)` → sets session cookies → redirects to `/<locale>`

**Whitelisted redirect URLs in Supabase Dashboard → Auth → URL Configuration:**
- Site URL: `https://veloadout.com`
- Redirect URLs:
  - `https://veloadout.com/en/auth/callback`
  - `https://veloadout.com/de/auth/callback`
  - `https://veloadout.com/ru/auth/callback`

If Supabase rejects a redirect URL → user lands on `/<locale>?auth_error=...` and our callback logs the reason server-side.

---

## 6. API routes — full catalog

| Route | Method | Auth | Rate limit | Notes |
|---|---|---|---|---|
| `/api/lookup?q=...&db_only=1` | GET | none | none | Fast DB search, returns `not_found` / `found_db` / `found_many` |
| `/api/lookup?q=...&depth=N` | GET | **required** | 20/user/hour (Upstash) | AI search, depth 1-3, daily budget cap 500/day |
| `/api/lookup` | POST | **required** | 20/user/hour (Upstash) | Save confirmed item to shared catalog. Server-generates `id` from English name slug |
| `/api/lists` | GET | required | none | Load user's gear list |
| `/api/lists` | POST | required | none | Replace gear list (atomic via `replace_gear_list_items` RPC) |
| `/api/lists` | DELETE | required | none | Clear user's lists + sign out. Does NOT delete `auth.users` row |
| `/api/auth` | POST | none | 10/IP/10min + 5/email/10min (Upstash) | Send magic link |
| `/api/auth` | DELETE | required | none | Sign out (browser also calls `supabase.auth.signOut()` directly) |
| `/api/presets` | GET | none | none | Static preset list |

---

## 7. Security layers on AI search (`POST` / `GET ?depth=N`)

Five gates, in order:

1. **Auth gate** — `supabase.auth.getUser()` must succeed; else 401 `auth_required`
2. **Heuristic filter** — `looksLikeGarbage(query)` (see `src/infrastructure/security/queryHeuristics.ts`) rejects keymashing
3. **Per-user rate limit** — Upstash key `rl:lookup:user:<uuid>` → 20 calls/hour
4. **Miss cache** — `ai_search_misses` table; if cached `not_found` within 24h, short-circuit
5. **Daily budget** — Upstash key `budget:ai_lookup:YYYY-MM-DD` → 500 calls/day; 503 when exceeded

Layers 3, 5 use Upstash; if Redis is unreachable, layer 3 falls back to in-memory (degraded), layer 5 fails open (allows the request).

---

## 8. Database schema — key invariants

`gear_items` (shared catalog, anyone can read; authenticated can write):
- PK `id` = server-generated slug from English name. Same English name → same id → upsert updates in place.
- `search_text` is **computed by a BEFORE trigger** — never set by app code.
- `category` constrained to `GearCategory` enum at the app boundary, but the DB column is `text` (no CHECK constraint — relies on app validation).
- `variants_json` is always a non-empty array (Zod-enforced).

`gear_lists` + `gear_list_items` (per-user, RLS by `auth.uid()`):
- Atomic replacement via `replace_gear_list_items(uuid, jsonb)` RPC. Direct `delete + insert` is not used by app code.

`ai_search_misses` (negative cache):
- `query_norm` is lowercased + whitespace-collapsed.
- `expires_at` 24h after insert. Reads filter `gt('expires_at', now)`.
- Stale rows are not auto-cleaned. If table grows large, run: `delete from ai_search_misses where expires_at < now();` periodically.

---

## 9. Rate limits & budgets — concrete numbers

| What | Where | Limit | Window |
|---|---|---|---|
| Magic link per IP | `/api/auth` (POST) | 10 | 10 min |
| Magic link per email | `/api/auth` (POST) | 5 | 10 min |
| AI search per authenticated user | `/api/lookup` (GET, AI path) | 20 | 1 hour |
| AI catalog save per user | `/api/lookup` (POST) | 20 | 1 hour |
| **Global daily AI budget** | `/api/lookup` (GET, AI path) | **500 calls** | 1 day (UTC) |
| Resend outbound emails | Resend account | 100/day, 3000/month | — |
| Supabase Auth emails (Resend) | Supabase Auth | manually raised; default ~2/hour replaced | — |

Hitting the daily budget returns 503 with a translated message — see `welcome.budget_exceeded` strings in `i18n/messages/*.json`.

---

## 10. Recovery scenarios

### 10.1 “The site is down”
1. `curl -I https://veloadout.com` — if 502/503, problem is Vercel
2. `npx vercel ls` — check last successful deployment
3. Vercel dashboard → Deployments → look at the failed build’s logs
4. Last-resort rollback: `npx vercel rollback <last-good-deployment-url>`

### 10.2 “Magic-link emails not arriving”
1. Check Resend dashboard → Emails → look for the bounce / failure
2. Check Supabase dashboard → Auth → Logs → look for the `signInWithOtp` call
3. Common causes:
   - User clicked an old link (expired 1h or already used)
   - User in different browser than where they requested the link (PKCE cookie mismatch)
   - Resend domain unverified (check Resend → Domains)
4. If Resend is fully down: temporarily turn off custom SMTP in Supabase Auth Settings → falls back to built-in (2/hour limit) until Resend recovers

### 10.3 “AI search always returns not_found”
1. Check `vercel logs` for `[ClaudeGearSearchService]` errors
2. Verify `VELOADOUT_API_KEY` is set on Vercel for Production
3. Verify Anthropic account has budget (Anthropic Console → Usage)
4. Check Upstash for budget exhaustion: log into Upstash, run `GET budget:ai_lookup:<today's date>`. If > 500, the cap is the issue — raise it in `route.ts`.
5. Check `ai_search_misses` table — maybe a real query got cached as a miss. Delete the row and retry: `delete from ai_search_misses where query_norm = 'msr hubba';`

### 10.4 “Custom domain stops working”
1. `dig +short veloadout.com A` — expect `76.76.21.21`
2. If not, check Cloudflare DNS settings — the A record may have been removed or proxied
3. **Proxy must be DNS-only (grey cloud)** — orange cloud breaks Vercel’s TLS
4. Wait 5–60 min for DNS propagation if a record was just edited

### 10.5 “User reports lost gear list”
1. `gear_lists` and `gear_list_items` are user-scoped via RLS, so a missing list means either:
   - User signed in with a different email this time
   - User actually deleted via DELETE `/api/lists`
2. `replace_gear_list_items` is transactional — partial loss should not happen. If it does, check Supabase Logs for transaction errors.
3. No backup strategy beyond Supabase's daily PITR (free tier includes 7-day point-in-time recovery)

### 10.6 “Upstash Redis is unreachable”
1. Site keeps working — rate limit falls back to in-memory (per-instance, weaker)
2. Daily budget cap fails open — AI calls go through unmonitored. Watch Anthropic console manually until Upstash recovers.
3. Upstash status: https://status.upstash.com

### 10.7 “Supabase is down”
1. Auth, lists, gear catalog all stop working
2. Status: https://status.supabase.com
3. The frontend should not crash — error boundaries handle it. But anonymous DB search returns errors too.

---

## 11. Costs — current state

| Service | Plan | Cost | Headroom |
|---|---|---|---|
| Vercel | Hobby | $0 | 100 GB bandwidth, 6000 build minutes |
| Supabase | Free | $0 | 500 MB DB, 50 000 MAU |
| Anthropic | Pay-per-use | ~$0.50 / 1k AI calls (Haiku 4.5 estimate) | budget cap = 500/day = $0.25/day max |
| Cloudflare | Free | $0 | unlimited DNS, Email Routing |
| Resend | Free | $0 | 100 emails/day, 3000/month |
| Upstash | Free | $0 | 10 000 commands/day |
| Domain `veloadout.com` | Cloudflare registrar | ~$10/year | — |
| **Total** | | **~$1/month amortised (domain only)** | |

First paid trigger will probably be Anthropic if AI search gets popular — monitor the budget Redis key.

---

## 12. Where to find credentials & dashboards

> Bookmark these. Don’t store passwords in this doc.

| Service | Dashboard URL | Login method |
|---|---|---|
| Vercel | https://vercel.com/dev-6363s-projects/veloadout | GitHub OAuth |
| Supabase | https://supabase.com/dashboard/project/pmesjklljvybdtudegxe | GitHub OAuth |
| Anthropic | https://console.anthropic.com | (email account) |
| Cloudflare | https://dash.cloudflare.com → veloadout.com | (email account) |
| Resend | https://resend.com/domains | GitHub OAuth |
| Upstash | https://console.upstash.com | (email account) |
| GitHub repo | https://github.com/alexzhel-io/veloadout | (alexzhel-io org member) |

---

## 13. Routine maintenance checklist

Run roughly monthly, or after any incident:

- [ ] **Anthropic usage** — Console → Usage. Sanity-check spend vs. expected.
- [ ] **Daily budget Redis key** — log into Upstash, `GET budget:ai_lookup:<today>`. If repeatedly hitting 500, raise the cap.
- [ ] **`ai_search_misses` table size** — `select count(*) from ai_search_misses;`. If > 10 000, run the cleanup query in §8.
- [ ] **Resend deliverability** — Resend → Domains → check that DKIM/DMARC are still green.
- [ ] **Supabase TLS / DB version** — Supabase notifies via dashboard; review and accept upgrades.
- [ ] **CSP violations** — open the live site, check browser console for CSP rejections. Tighten the policy if no violations show up.
- [ ] **Dependabot / npm audit** — `npm audit` once a month; bump `@upstash/redis`, `@supabase/*`, `@anthropic-ai/sdk` to latest.

---

## 14. Things deliberately NOT done

These are tracked in `docs/security-todo.md` — not bugs, conscious deferrals:

- **Service-role key not used** — DELETE `/api/lists` doesn’t fully delete `auth.users`. Users must email `support@veloadout.com` for full Art.17 erasure.
- **Password auth not implemented** — magic-link only. Listed as #16B in TODO.
- **No paid SMTP fallback** — if Resend goes down, magic-link rate drops back to Supabase built-in (2/hour project-wide). Acceptable for current scale.
- **No backup automation** — relies on Supabase’s built-in 7-day PITR. No `pg_dump` cron yet.
- **No structured logging / observability stack** — only `console.error` to Vercel function logs. Sentry/Logflare would be the next step if traffic grows.
