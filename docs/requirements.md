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

### FR-6: Internationalisation

| # | Requirement | Status |
|---|---|---|
| FR-6.1 | Support EN / DE / RU | ✅ |
| FR-6.2 | Language switcher in the header | ✅ |
| FR-6.3 | Localised category names, UI strings, bag recommendation copy | ✅ |
| FR-6.4 | Locale in URL: `/en`, `/de`, `/ru` | ✅ |

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

### NFR-3: Reliability

| # | Requirement | Solution |
|---|---|---|
| NFR-3.1 | Save errors are visible to the user | Toast notifications |
| NFR-3.2 | No race condition on auto-save | AbortController cancels the previous request |
| NFR-3.3 | Render errors don't crash the whole UI | Error boundary + global-error |
| NFR-3.4 | 404 page | Custom not-found |
| NFR-3.5 | Tests for domain logic | 11 Vitest tests |

### NFR-4: GDPR / Legal

| # | Requirement | Solution |
|---|---|---|
| NFR-4.1 | Privacy Policy | `/privacy` page in 3 languages |
| NFR-4.2 | Terms of Service | `/terms` page |
| NFR-4.3 | Impressum (DE) | `/impressum` page |
| NFR-4.4 | Cookie banner | Essential cookies only, no tracking |
| NFR-4.5 | User data deletion | DELETE `/api/lists` |

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
| NFR-5.8 | hreflang | alternates in metadata |

### NFR-6: Hosting and deployment

| # | Requirement | Solution |
|---|---|---|
| NFR-6.1 | Works on serverless (no local file storage) | SQLite → Supabase Postgres |
| NFR-6.2 | Preview deployments for every PR | VERCEL_URL in redirect URL |
| NFR-6.3 | Portable away from Vercel | `output: 'standalone'` |

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
