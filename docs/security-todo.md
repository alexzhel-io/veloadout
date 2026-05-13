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
