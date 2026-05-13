# Security & Stability TODO

Tracking deferred work from the security/stability review and ongoing
hardening. Pick these up before promoting the project beyond pet-scale
(HN front page, real userbase, paid tier).

---

## Done

- ~~**#11**~~ Distributed rate limit via Upstash Redis (commit `9238e2f`).
- ~~**#12**~~ `category` in `api/lists` uses `nativeEnum` (commit `9ddf4d9`).
- ~~**#13**~~ Auto-save flushes on unmount, toast timer tracked (commit `dfb3dbf`).
- ~~**#14**~~ Content-Security-Policy header enforced (commit `4a69f6b`).
- ~~**#15**~~ List load no longer clobbers local edits (commit `dfb3dbf`).
- ~~**#16A**~~ Resend SMTP wired up. Magic-link emails now sent from
  `noreply@veloadout.com` via Resend (100/day free). Supabase built-in
  SMTP 2/hour limit no longer applies. Domain on Cloudflare with SPF /
  DKIM / DMARC verified.

---

## 🟡 #7a — Full GDPR Article 17 erasure not automated

**File:** `src/app/api/lists/route.ts` (DELETE handler)

Currently the DELETE endpoint clears `gear_lists` and signs the user out,
but the `auth.users` row remains. We accepted this trade-off (option B):
the privacy policy now correctly says users must email to request full
deletion, and the operator deletes via Supabase dashboard.

**To automate** (option A):
1. Copy the **service-role** key from Supabase dashboard
2. Add to Vercel env vars as `SUPABASE_SERVICE_ROLE_KEY` — **Production only**,
   not Preview
3. Create `src/infrastructure/supabase/admin.ts`:
   ```ts
   import 'server-only';
   import { createClient } from '@supabase/supabase-js';
   export const adminClient = () => createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY!,
     { auth: { persistSession: false } },
   );
   ```
4. In the DELETE handler, after clearing `gear_lists`:
   ```ts
   await adminClient().auth.admin.deleteUser(user.id);
   ```

**Risk:** service-role key bypasses ALL RLS. Single leak = full DB
compromise. Treat as a much higher-stakes secret than the anon key.
Never log it, never use `NEXT_PUBLIC_` prefix, never import into a Client
Component (the `import 'server-only'` line above prevents this at build time).

---

## 🟢 #17 — Replace or supplement Vercel Analytics with Plausible

Vercel Analytics is now wired up (`@vercel/analytics/next`) and gives
DAU/MAU + top pages out of the box, free on Hobby tier. It's good
enough for the first 6–12 months of accumulating traction data.

When to revisit:
- Need richer custom events (e.g. funnel from search → confirm → add to list)
- Need data outside Vercel's dashboard (API export to a spreadsheet)
- Want a public dashboard to show investors

**Two paths to Plausible:**

### A. Plausible Cloud — $9/month
1. Sign up at [plausible.io](https://plausible.io), add domain
   `veloadout.com`
2. Set env var on Vercel: `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=veloadout.com`
3. The `<Script>` tag in `src/app/[locale]/layout.tsx` already
   exists, gated on that env var. Adding the value activates it.
4. Update CSP in `next.config.mjs`: add `https://plausible.io` to
   `script-src` and `connect-src`.

### B. Self-hosted on home server via Cloudflare Tunnel — free
1. On home server: install Docker + `cloudflared`
2. `docker run -d --name plausible plausible/community-edition` (with
   docker-compose for the ClickHouse + Postgres deps)
3. Authenticate `cloudflared` to your Cloudflare account
4. Create a tunnel: `cloudflared tunnel create veloadout-analytics`
5. Point `analytics.veloadout.com` to the tunnel in Cloudflare DNS
6. `cloudflared` runs as a service, holds the outbound connection
7. Same Vercel env + CSP changes as path A, but with
   `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=veloadout.com` and a custom
   `data-api` URL pointing to `https://analytics.veloadout.com`.

Cost: €4/year electricity, ~3 hours setup, ~30 min/month maintenance.
Avoids the $9/month and keeps all analytics data on your hardware.

**Important caveat:** historical Vercel Analytics data does NOT
migrate to Plausible. If continuity matters (showing 12+ months of
graphs to an investor), run both in parallel for some time before
switching.

---

## 🟡 #16B — Optional password auth alongside magic link

Magic-link works great now that Resend is in place, so this is no longer
blocking. Keep as a UX upgrade for users who don't want to leave the
page to check email.

**Implementation outline:**
1. Add `signInWithPassword` / `signUp` routes alongside the existing magic-link route
2. Update the auth UI (`AuthModal` / similar) with email + password fields and a "or use magic link" toggle
3. Supabase Auth Settings → enable email/password provider (already enabled by default)
4. Set minimum password length to 8+ in Supabase Auth settings
5. Reuse the existing callback flow for "forgot password" emails

---

## Suggested order when picking these up

1. **#16B** — UX nice-to-have, instant login without email round-trip
2. **#7a** — only if/when GDPR erasure requests become frequent
