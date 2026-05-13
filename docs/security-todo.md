# Security & Stability TODO

Findings from the security/stability review that were intentionally deferred.
Pick these up before promoting the project beyond pet-scale (HN front page,
real userbase, paid tier).

---

## 🟡 #11 — Magic-link rate limit is bypassable via cold start

**File:** `src/infrastructure/security/rateLimit.ts`, `src/app/api/auth/route.ts`

The in-memory rate limit (3 magic links / email / 10 min) lives in a JS `Map`
inside one serverless function instance. Vercel spins up new instances under
load — each gets a fresh, empty Map, so an attacker hitting different cold
instances multiplies the quota by N.

**Mitigation in place:** Supabase Auth itself enforces 30 magic-links /
email / hour, so the worst-case is bounded.

**Proper fix:**
1. Sign up at [upstash.com](https://upstash.com) → create free Redis DB
2. Add env vars to Vercel: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
3. Replace the in-memory `Map` in `rateLimit.ts` with `INCR key EX window`
   via the Upstash REST API
4. Apply to both `/api/auth` and `/api/lookup`

Free tier: 10 000 req/day — more than enough at current scale.

---

## 🟢 #12 — `category` in `api/lists` is `z.string()`, not the enum

**File:** `src/app/api/lists/route.ts:11`

```ts
category: z.string().min(1).max(50),  // ← should be z.nativeEnum(GearCategory)
```

Impact is limited (only that user's own list can break for them on reload),
but still allows storing garbage that breaks `categoryIcon()` /
`CATEGORY_LABELS` rendering.

**Fix:** Same pattern as `saveItemSchema` in `lookup/route.ts`:
```ts
import { GearCategory } from '@/domain/gear/GearCategory';
category: z.nativeEnum(GearCategory),
```

---

## 🟢 #13 — Auto-save debounce doesn't flush on unmount

**File:** `src/presentation/components/GearCalculator.tsx:106-111`

The debounced auto-save (2 s after edit) is cleared on cleanup but never
fired. If the user navigates away within the 2 s window, the last edit
is lost. Separate issue: the "Saved" toast `setTimeout` on line 96 isn't
tracked, so it leaks if the component unmounts.

**Fix:**
- On cleanup, if a pending save timer is set, call `saveList()` immediately
  before clearing — accept the trade-off that the in-flight fetch may not
  complete, OR use `navigator.sendBeacon` for true fire-and-forget on unload.
- Track the toast `setTimeout` in a `useRef` and clear it on unmount.

---

## 🟢 #14 — Content-Security-Policy header missing

**File:** `next.config.ts`

HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy and
Permissions-Policy are set. No CSP. Given the inline JSON-LD
(`dangerouslySetInnerHTML`) and any third-party scripts, a CSP would
meaningfully reduce XSS blast radius.

**Fix:** Start in report-only mode to avoid breaking anything:
```ts
{
  key: 'Content-Security-Policy-Report-Only',
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'", // tighten with nonces later
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://api.anthropic.com",
    "frame-ancestors 'none'",
  ].join('; '),
}
```

After a week of report-only with no violations, switch to enforcing
(`Content-Security-Policy`).

---

## 🟢 #15 — Initial list load races with local edits

**File:** `src/presentation/components/GearCalculator.tsx:46-72`

If the user adds an item before `/api/lists` resolves, `setEntries(...)`
in the `.then` overwrites the local addition. `initialized.current` guards
the auto-save effect from firing pre-init, but the local edit is still
clobbered.

**Fix options:**
- Disable the search bar and preset buttons until `initialized.current === true`
- Or merge the fetched list with local edits by id (more permissive UX)
- Show a small "Loading your list…" spinner during the fetch

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

## Suggested order when picking these up

1. **#12** — trivial, 2-line change
2. **#14** — easy win, deploy in report-only first
3. **#13 + #15** — UX bugs around list loading/saving, tackle together
4. **#11** — only when traffic justifies Upstash setup
5. **#7a** — only if/when GDPR requests become frequent
