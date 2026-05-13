# Veloadout — Requirements

## Product vision

A web application for bikepacking riders: the user enters their gear, the system calculates total volume and recommends the right bags. If an item is not found in the catalog — Claude AI searches the web and returns real specs.

---

## Functional requirements

### FR-1: Gear search

| # | Requirement | Status |
|---|---|---|
| FR-1.1 | User types a product name into the search bar | ✅ |
| FR-1.2 | Fast database search (no AI) | ✅ |
| FR-1.3 | If not found — AI searches the web via Claude Haiku + web_search | ✅ |
| FR-1.4 | AI result is shown as a confirmation card, not added automatically | ✅ |
| FR-1.5 | For products with multiple sizes AI returns all variants with volume and weight | ✅ |
| FR-1.6 | User selects a size (Regular / Long / Wide etc.) before adding | ✅ |
| FR-1.7 | If a size is mentioned in the query — the matching variant is pre-selected | ✅ |
| FR-1.8 | Confirmed AI item is saved to the shared catalog (for all users) | ✅ |
| FR-1.9 | On repeat search the item is found from DB and variants are shown again | ✅ |
| FR-1.10 | "Dig deeper" button lets the user re-run AI search up to 2 more times (depth 2 → 3) with a larger web-search budget and stricter prompt — works for both AI and DB results | ✅ |
| FR-1.11 | Refining an existing DB record preserves its id so upsert updates the row in place | ✅ |
| FR-1.12 | If DB search returns multiple matches a PickList is shown; user picks the exact product, then sees ConfirmCard with variant selector | ✅ |
| FR-1.13 | If "Dig deeper" AI search returns not_found, the previous result card is restored instead of showing an error | ✅ |
| FR-1.14 | Catalog product names are English-only — translating brand/model names produced unreadable transliterations | ✅ |
| FR-1.15 | Bikepacking bags (Ortlieb, Apidura, Restrap, etc.) are excluded from the catalog and rejected on both search and save | ✅ |

### FR-2: Gear list

| # | Requirement | Status |
|---|---|---|
| FR-2.1 | Add items to the list | ✅ |
| FR-2.2 | Remove items from the list | ✅ |
| FR-2.3 | Change quantity of each item | ✅ |
| FR-2.4 | Display category with emoji icon | ✅ |
| FR-2.5 | Display weight of each item | ✅ |
| FR-2.6 | Total volume and weight in the list footer | ✅ |
| FR-2.7 | Format: `🏕️ Shelter · Regular — Product Name` | ✅ |

### FR-3: Presets

| # | Requirement | Status |
|---|---|---|
| FR-3.1 | Quick preset panel with typical gear items | ✅ |
| FR-3.2 | Clicking a preset toggles it on/off in the list | ✅ |
| FR-3.3 | Active presets are visually highlighted | ✅ |

### FR-4: Bag recommendations

| # | Requirement | Status |
|---|---|---|
| FR-4.1 | Based on total volume — recommend handlebar / frame / seat pack | ✅ |
| FR-4.2 | Show recommended volume for each bag and fill percentage | ✅ |
| FR-4.3 | Volumes are clamped to realistic ranges | ✅ |

### FR-5: Auth and persistence

| # | Requirement | Status |
|---|---|---|
| FR-5.1 | Magic link auth via email (passwordless) | ✅ |
| FR-5.2 | Gear list is saved to user account | ✅ |
| FR-5.3 | Auto-save with 2-second debounce after every change | ✅ |
| FR-5.4 | Manual save button in the header | ✅ |
| FR-5.5 | After sign-in the list is loaded automatically | ✅ |
| FR-5.6 | Guest sees a "Sign in to save" prompt | ✅ |
| FR-5.7 | Magic-link emails sent via custom SMTP (Resend) from `noreply@veloadout.com` | ✅ |
| FR-5.8 | Auth callback surfaces exchange errors via `?auth_error=` query param | ✅ |
| FR-5.9 | Auto-save survives navigation: pending debounce is flushed on unmount with `keepalive` | ✅ |
| FR-5.10 | Initial list load merges with local edits instead of clobbering them | ✅ |

### FR-7: Onboarding

| # | Requirement | Status |
|---|---|---|
| FR-7.1 | Dismissible welcome banner for first-time visitors (localStorage) | ✅ |
| FR-7.2 | `/[locale]/help` page with quick-start guide in EN / DE / UK / RU | ✅ |
| FR-7.3 | Help link in the footer alongside Privacy / Terms / Impressum | ✅ |

### FR-8: Outbound link tracking & monetisation readiness

| # | Requirement | Status |
|---|---|---|
| FR-8.1 | All product source links route through `/r?to=...&item=...` redirect for click tracking | ✅ |
| FR-8.2 | Click counters (`clicks:total:<date>`, `clicks:item:<id>:<date>`) stored in Upstash | ✅ |
| FR-8.3 | Centralised `buildAffiliateUrl()` hook lets future partner tags activate without DB migration | ✅ |
| FR-8.4 | Outbound links carry `rel="sponsored noopener noreferrer"` to comply with Google guidelines | ✅ |

### FR-6: Internationalisation

| # | Requirement | Status |
|---|---|---|
| FR-6.1 | Support EN / DE / UK / RU (Ukrainian uses ISO `uk`, displayed as `UA` in UI) | ✅ |
| FR-6.2 | Language switcher in the header | ✅ |
| FR-6.3 | Localised category names, UI strings, bag recommendation copy, error states | ✅ |
| FR-6.4 | Locale in URL: `/en`, `/de`, `/uk`, `/ru` | ✅ |

---

## Non-functional requirements

### NFR-1: Performance

| # | Requirement | Solution |
|---|---|---|
| NFR-1.1 | DB search — fast without AI latency | Two-stage search: db_only → AI |
| NFR-1.2 | Catalog search scales with catalog growth | GIN trigram index on `search_text` |
| NFR-1.3 | AI search — only when item is not found in DB | `db_only=1` fast path |

### NFR-2: Security

| # | Requirement | Solution |
|---|---|---|
| NFR-2.1 | Rate limiting on AI search (expensive resource) | 20 requests / IP / hour |
| NFR-2.2 | Rate limiting on magic link (anti-spam) | 5 req / IP + 3 req / email / 10 min |
| NFR-2.3 | Input validation on all routes | Zod on all API routes |
| NFR-2.4 | Security headers | HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy |
| NFR-2.5 | No open debug endpoints | `/api/debug-env` removed |
| NFR-2.6 | User data isolation | Supabase RLS |
| NFR-2.7 | Shared catalog writes require authentication | `auth.uid() is not null` RLS on `gear_items` + `getUser()` check in `POST /api/lookup` |
| NFR-2.8 | Clients cannot hijack catalog rows by passing chosen ids | Server derives item id from a slug of the English name |
| NFR-2.9 | Category strings cannot break UI rendering | `z.nativeEnum(GearCategory)` on every API boundary |
| NFR-2.10 | Locale params in redirects cannot be arbitrary strings | Auth callback validates locale against `routing.locales`, falls back to default |
| NFR-2.11 | AI responses cannot inject malformed data | Zod schema validates the parsed JSON; invalid responses become `not_found` |
| NFR-2.12 | `sourceUrl` rendered as a link is always safe | `safeHttpUrl()` helper rejects anything but `http(s)` at render time |
| NFR-2.13 | Deferred security TODOs are tracked | [`docs/security-todo.md`](./security-todo.md) |
| NFR-2.14 | AI search requires authentication | `auth.getUser()` check in POST `/api/lookup` — anonymous traffic can't burn Anthropic quota |
| NFR-2.15 | Heuristic pre-filter rejects obvious garbage queries before AI call | `looksLikeGarbage()` — length, alphabetic content, repeated chars, vowel test |
| NFR-2.16 | Distributed rate limit survives serverless cold starts | Upstash Redis `INCR + EXPIRE`, falls back to in-memory if unconfigured |
| NFR-2.17 | Repeat `not_found` queries short-circuit AI | `ai_search_misses` table cached for 24h with RLS |
| NFR-2.18 | Global daily AI budget cap | 500 calls / day / project in Redis; 503 when exhausted |
| NFR-2.19 | Email sending decoupled from Supabase built-in SMTP | Custom SMTP via Resend (100/day free, 3000/month) for magic-link emails |
| NFR-2.20 | CSP enforced (not report-only) | `Content-Security-Policy` header in `next.config.mjs` |

### NFR-3: Reliability

| # | Requirement | Solution |
|---|---|---|
| NFR-3.1 | Save errors are visible to the user | Toast notifications |
| NFR-3.2 | No race condition on auto-save | AbortController cancels the previous request |
| NFR-3.3 | Render errors don't crash the whole UI | Error boundary + global-error |
| NFR-3.4 | 404 page | Custom not-found |
| NFR-3.5 | Tests for domain logic | 11 Vitest tests |
| NFR-3.6 | Gear list save is atomic — partial failure cannot wipe the user's list | Postgres RPC `replace_gear_list_items(p_list_id, p_items jsonb)` runs delete+insert+bump in a single transaction |
| NFR-3.7 | Repository errors surface as 500s, not silent `{ok:true}` | Every Supabase `{ error }` is checked and thrown; API routes catch and return 500 |

### NFR-4: GDPR / Legal

| # | Requirement | Solution |
|---|---|---|
| NFR-4.1 | Privacy Policy | `/privacy` page in 3 languages |
| NFR-4.2 | Terms of Service | `/terms` page |
| NFR-4.3 | Impressum (DE) | `/impressum` page |
| NFR-4.4 | Cookie banner | Essential cookies only, no tracking |
| NFR-4.5 | User can clear their gear data and sign out | DELETE `/api/lists` — wipes `gear_lists`, signs out |
| NFR-4.6 | Full account erasure (GDPR Art. 17) | Contact-based: user emails the operator, deletion within 30 days. Automated path documented in `docs/security-todo.md#7a` |

### NFR-5: SEO and discoverability

| # | Requirement | Solution |
|---|---|---|
| NFR-5.1 | Sitemap | `/sitemap.xml` (all locales) |
| NFR-5.2 | robots.txt | `/robots.txt` |
| NFR-5.3 | Open Graph tags | Per-locale metadata |
| NFR-5.4 | JSON-LD structured data | WebApplication schema |
| NFR-5.5 | OG image | Dynamic per-locale ImageResponse |
| NFR-5.6 | llms.txt | `/llms.txt` for AI agents |
| NFR-5.7 | Favicon + PWA manifest | SVG icon + manifest.ts |
| NFR-5.8 | hreflang | alternates in metadata (en, de, uk, ru) |
| NFR-5.9 | Production analytics | Vercel Analytics (`@vercel/analytics/next`) — DAU/MAU + top pages. Plausible queued in `security-todo.md` #17 for richer events |

### NFR-6: Hosting and deployment

| # | Requirement | Solution |
|---|---|---|
| NFR-6.1 | Works on serverless (no local file storage) | SQLite → Supabase Postgres |
| NFR-6.2 | Preview deployments for every PR | VERCEL_URL in redirect URL |
| NFR-6.3 | Portable away from Vercel | `output: 'standalone'` |
| NFR-6.4 | Custom production domain | `veloadout.com` (Cloudflare DNS, Vercel-issued TLS) |
| NFR-6.5 | AI route timeout fits a multi-turn web search | `maxDuration = 60` in `/api/lookup` |
| NFR-6.6 | Required env vars on production | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `VELOADOUT_API_KEY`, `NEXT_PUBLIC_SITE_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |

---

## AI behaviour requirements

| # | Requirement |
|---|---|
| AI-1 | Use **packed/compressed** volume, not unpacked |
| AI-2 | Realistic ranges: tents 3–12L, sleeping bags 2–8L, down jackets 1–4L |
| AI-3 | For products with sizes — return `variants` array with all sizes |
| AI-4 | Multi-turn web_search loop, budget scales with depth: 3/6/10 searches, 5/8/12 turns, 2048/4096/4096 tokens |
| AI-5 | Fallback to knowledge-only if web_search is unavailable |
| AI-6 | Confidence: `high` / `medium` / `low` |
| AI-7 | `volumeNote` explaining the figure (packed, compression sack, etc.) |
| AI-8 | Names in all three languages (EN / DE / RU) |
| AI-9 | Deeper search (depth ≥2) skips DB cache and uses a stricter prompt nudging the model to enumerate every size variant |

---

## Design requirements

| # | Requirement |
|---|---|
| D-1 | Dark theme in Proton.me style — deep purple / dark violet |
| D-2 | Accent colour: `#7c3aed` |
| D-3 | Background: `#13111c`, cards: `#1c1a2e` |
| D-4 | Responsive: mobile-first |
| D-5 | Animations: slide-up for cards, fade-in for status messages |
