# Veloadout — Investor Lens & Acquisition Roadmap

Honest assessment of the project as a sellable asset, with a multi-year
roadmap to acquisition-readiness. Use this as a north star — not every
item needs doing tomorrow, but every item should make sense.

> **Bottom line today:** Veloadout is an excellent technical foundation
> for a business — but on its own, it's a feature, not a company. To
> become sellable, it needs to evolve from "gear volume calculator" into
> a platform: **gear DB → trip planner → social → marketplace**.

---

## Where we stand today (May 2026)

Scored 1–10 on the dimensions an investor cares about:

| Dimension | Score | Honest read |
|---|---|---|
| Defensibility | 2/10 | Any dev clones it in a weekend. Catalog of 256 items isn't a moat. |
| Monetisation | 0/10 | No payment rails, no revenue model implemented. |
| Traction | ?/10 | Zero analytics — we can't even claim numbers honestly. |
| TAM | 6/10 | Bikepacking is growing but niche. €5–50M ARR realistic, billion-dollar market no. |
| Unit economics | n/a | No CAC, no LTV, hosting costs ~$0/mo on free tiers. |
| Team / IP | 3/10 | One developer, no entity, no trademark. |
| Operational readiness | 7/10 | Production runs, docs are good, GDPR-aware. Best part of the picture. |

Total: **~3/10 today.** A buyer would pay for the domain + maybe a
month of hosting — call it €0–5k.

---

## What an investor looks for

1. **Defensibility** — what stops a competitor copying in a month
2. **Monetisation** — who pays, for what, how much, recurring?
3. **Traction** — real users, growing
4. **TAM** — addressable market large enough to justify their bet
5. **Unit economics** — each user contributes more than they cost
6. **Team / IP** — what the buyer gets beyond code
7. **Operational readiness** — can they take the keys without it burning down

We're strong on #7, neutral on #4, weak on everything else. That's the
gap to close.

---

## Monetisation models, ranked

| Model | Pros | Cons |
|---|---|---|
| **Affiliate links** (REI / Backcountry / Amazon) | Zero friction for the user. Easy to bolt on. | Needs traffic to matter. Saturated market. |
| **Pro subscription** (€3–5/mo): unlimited AI search, list history, sharing, PDF export | Recurring revenue — what acquirers love. | Need 10× current value before users will pay. |
| **B2B**: API for bag/shop brands, content licensing | High ARPU, few clients needed | Long sales cycles. |
| **White-label**: bag brands embed our calculator on their store | Stable revenue stream | Sales-heavy, custom support per client. |
| **Ads** | Trivial to integrate | Awful UX, low RPM at our scale. |

**Recommendation:** start with affiliate + a "Pro is coming" hint. Get
real conversion data before building Pro features. Premium tier should
solve a problem people are already asking about — analytics tell you
which.

---

## Realistic exit scenarios at different stages

| Scenario | What's true | Exit price range |
|---|---|---|
| Walk away today | as-is, no revenue, no users | €0–5k (domain + a year of hosting) |
| Lifestyle | 1k MAU, ~€500/mo affiliate, side-project | €15–50k (Acquire.com / MicroAcquire tier) |
| Bootstrapped SaaS | 10k MAU, €3k MRR Pro, retention >30% | €100–300k (3–5× ARR multiplier) |
| Strategic acquihire | feature inside Komoot / Strava / outdoor brand | €50–500k (depends on data) |
| Series A target | €50k+ MRR growing 20% MoM | €5–20M valuation (venture path) |

The lifestyle scenario is achievable in 6–9 months on part-time work.
The bootstrapped SaaS in 18–24 months. Series A would require quitting
the day job — different lifestyle bet entirely.

---

## Roadmap to sellable

### Phase 1 (months 1–3) — Foundation

1. **Analytics** — Plausible or Vercel Analytics. Without numbers, no
   investor conversation is possible. Track DAU/MAU, signup
   conversion, list-save rate, AI-search rate.
2. **Affiliate links** — sign up for REI, Backcountry, Amazon
   Associates. Wrap every `sourceUrl` in a server-side redirect so we
   can later swap in affiliate IDs without a DB migration.
3. **SEO content** — weekly long-form articles ("Best ultralight tents
   2026", "7-day bikepacking gear list"). 50 articles in a year =
   5–50k organic visits/month. Without traffic, no monetisation
   matters.
4. **Trademark "Veloadout"** — EUIPO (~€850) or DPMA (~€300). Protects
   the brand at acquisition time.

### Phase 2 (months 4–6) — Product depth

5. **User-generated content** — ratings, reviews, "Is this volume
   right? Submit your measurement." Photos of packed items. First
   real step toward a moat.
6. **List sharing** — public URLs for gear lists ("Look at my setup").
   Each share is a free acquisition channel.
7. **Trip mode** — weather, route integration (Komoot, Strava). Move
   up the value chain from calculator to trip planner.
8. **Pro tier launch** (€3–5/mo) — choose features based on Phase 1
   analytics. Probably: unlimited AI search, list history, advanced
   sharing, exports.

### Phase 3 (months 7–12) — Scale

9. **First B2B pilot** — embed-the-calculator deal with one or two
   bag brands. Even at €50–100/mo per partner, this is a reference
   case for future enterprise pitches.
10. **Legal entity** — UG (mini-GmbH) in Germany, ~€350 setup. Without
    an entity, no real acquisition is possible.
11. **Bookkeeping** — Lexoffice or Datev. As soon as there's revenue,
    books need to be clean.
12. **Insurance** — Betriebshaftpflicht (~€20–50/mo). Standard
    expectation for acquirers in DACH.

### Phase 4 (year 2) — Acquisition-ready

13. **MRR €1–5k** — Acquire.com / MicroAcquire territory. Multiplier
    2–4× ARR ⇒ €25–250k exit.
14. **MRR €10–50k** — serious acquisition discussions. €500k–€2M.
15. **Strategic outreach** — Komoot, Outdooractive, Bergfreunde,
    REI-owned tech. Even if no exit, partnership talks raise
    visibility.

---

## What's missing from a buyer's diligence perspective

A buyer's lawyer / due-diligence team will ask for these things. None
exist today:

- [ ] Legal entity (UG / GmbH / equivalent)
- [ ] Trademark registration
- [ ] Cap table / single-owner ownership documentation
- [ ] Code IP ownership statement (clear: "all written by founder")
- [ ] LICENSE file in repo
- [ ] Contributor agreements if anyone else has ever pushed
- [ ] Privacy Policy reviewed by a German lawyer (current is a generic template)
- [ ] Data Processing Agreement (DPA) with Supabase / Anthropic / Vercel
- [ ] Financial accounts (when revenue exists)
- [ ] Insurance certificates
- [ ] Recurring user analytics (12+ months history)

Many of these are paperwork, not code. But not having them at the
moment a deal is on the table will cost weeks of cleanup or kill the
deal.

---

## The three highest-leverage actions today

If only three things are done in the next 30 days, do these:

1. **Set up analytics now.** Even if nobody looks at the dashboard for
   six months, the data accumulates from day one. Without it, we have
   no story to tell later.

2. **Wire one affiliate program.** Even REI's free signup. Conversion
   data from real users is worth more than any roadmap document. Wrap
   `sourceUrl` in a server-side redirect so swapping in affiliate IDs
   is a one-file change, not a migration.

3. **Write one piece of SEO content a week.** Compound interest. Year
   one is when this looks pointless; year two is when it's the
   biggest source of free traffic.

Everything else can wait.

---

## The honest closing thought

Veloadout's technical foundation is strong — Clean Architecture, solid
security model, good documentation. That's rare for a solo project and
will save weeks of cleanup at acquisition time.

What it lacks is everything **outside** the technical foundation:
revenue model, traffic, brand presence, legal structure. Code quality
doesn't sell apps. Users sell apps.

To go from "pet project" to "lifestyle business": 6–9 months part-time.
To "real SaaS": 18–24 months and probably a co-founder doing
marketing / biz dev. To "venture-scale": different game entirely,
full-time commitment.

Pick the goal first, then we adjust the technical roadmap to fit.
