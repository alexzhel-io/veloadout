# Security & Stability TODO

Findings from the security/stability review that were intentionally deferred.
Pick these up before promoting the project beyond pet-scale (HN front page,
real userbase, paid tier).

---

## ~~#11~~ — DONE: distributed rate limit via Upstash Redis

Fixed in commit `9238e2f`. `rateLimit.ts` now uses Upstash Redis with a
graceful fallback to in-memory when Redis is unconfigured/unreachable.
Applies to `/api/auth` and `/api/lookup`. Cold starts no longer reset
counters.

---

## ~~#12~~ — DONE: `category` in `api/lists` now uses `nativeEnum`

Fixed in commit `9ddf4d9`. `src/app/api/lists/route.ts` validates
`category` against the `GearCategory` enum.

---

## ~~#13~~ — DONE: auto-save flushes on unmount, toast timer tracked

Fixed in commit `dfb3dbf`. The unmount cleanup now calls the latest
`saveList()` via a ref (with `keepalive: true` so the fetch survives
navigation) and clears the `savedTimer` ref.

---

## ~~#14~~ — DONE (in Report-Only): Content-Security-Policy header added

Fixed in commit `9ddf4d9`. `next.config.mjs` sets a
`Content-Security-Policy-Report-Only` header. Violations are logged in
the browser console without breaking the page.

**Remaining step:** after ~1 week with no real-traffic violations,
rename the header key from `Content-Security-Policy-Report-Only` to
`Content-Security-Policy` to enforce.

---

## ~~#15~~ — DONE: list load no longer clobbers local edits

Fixed in commit `dfb3dbf`. The `.then` now uses the functional
`setEntries(current => current.length === 0 ? fetched : current)` form,
so additions made while the fetch was in flight are preserved.

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

## 🟡 #16 — Magic-link-only auth is bottlenecked by Supabase built-in SMTP

**File:** `src/app/api/auth/route.ts`, Supabase Auth Settings

The whole project supports passwordless magic-link sign-in only (FR-5.1).
Supabase's built-in SMTP is **rate-limited to 2 emails per hour for the
entire project** on the free tier — explicitly marked "for development
only" in the docs. That caps real-world sign-ups + re-logins at ~50/day
across the whole user base.

**Two ways forward, can be combined:**

### A. Custom SMTP via Resend (~5 min)
1. Sign up at [resend.com](https://resend.com) (free: 100 emails/day, 3000/month)
2. Verify a domain you own (or use their `onboarding@resend.dev` for testing)
3. Create an API key
4. Supabase Dashboard → **Project Settings → Auth → SMTP Settings**:
   - Host: `smtp.resend.com`, Port: `587`
   - User: `resend`, Password: the API key
   - Sender email: an address on your verified domain
5. Save. Test with a fresh sign-in.

### B. Add password auth alongside magic link
Supabase Auth supports both methods on the same project. Pros: instant
login without depending on email. Cons: still need SMTP for password
reset, plus more legal surface (GDPR Art. 32 — but Supabase handles
bcrypt + storage correctly out of the box).

**Implementation outline:**
1. Add `signInWithPassword` / `signUp` routes alongside the existing magic-link route
2. Update the auth UI (`AuthModal` / similar) with email + password fields and a "or use magic link" toggle
3. Supabase Auth Settings → enable email/password provider (already enabled by default)
4. Set minimum password length to 8+ in Supabase Auth settings
5. Reuse the same callback flow for "forgot password" emails (which still go through SMTP — so do A first)

**Order:** A is a quick unblock; B is a bigger UX change to consider for
public launch.

---

## Suggested order when picking these up

1. **#16A** — connect Resend SMTP, this is the most impactful single change for any kind of public usage
2. **#14 enforce** — flip CSP from Report-Only to enforcing after a week of clean reports
3. **#16B** — optional password auth if magic-link UX still feels heavy after SMTP fix
4. **#11** — only when traffic justifies Upstash setup
5. **#7a** — only if/when GDPR requests become frequent
