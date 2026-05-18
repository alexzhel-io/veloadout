#!/usr/bin/env npx tsx
/**
 * Production-grade bag image fetcher.
 *
 * Two-stage strategy:
 *   Stage 1 — fast HTTP fetch + meta/JSON-LD/img parsing.
 *             Works for static sites (Ortlieb, Vaude, Crosso, etc.).
 *   Stage 2 — Playwright headless Chrome that actually executes JS.
 *             Catches Shopify (Apidura, Restrap, Tailfin, Salsa,
 *             Revelate, Topeak, etc.).
 *
 * Output: docs/bag-images.sql with UPDATE statements. Paste into the
 * Supabase SQL Editor (RLS bypassed there) to apply.
 *
 * For automated periodic runs (cron / GitHub Action), see the
 * "Automation" section at the bottom of this file.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/fetch-bag-images.ts
 *
 * CLI flags:
 *   --force              re-fetch even bags that already have image_url
 *   --id <id>            only this bag (e.g. --id ortlieb-seat-pack-11)
 *   --brand <brand>      only this brand (case-insensitive substring match)
 *   --slot <slot>        only this slot (handlebar | frame | seatpack | fork | panniers)
 *   --limit <n>          process at most N bags (handy for testing)
 *   --no-browser         skip Playwright stage (HTTP-only, faster but lower coverage)
 *   --headed             run Playwright in headed (visible) mode, for debugging
 */
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { chromium, type Browser } from 'playwright';

// ─── CLI parsing ─────────────────────────────────────────────────────
const args = process.argv.slice(2);
function flag(name: string): boolean { return args.includes(name); }
function val(name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
}
const opt = {
  force:     flag('--force'),
  noBrowser: flag('--no-browser'),
  headed:    flag('--headed'),
  id:        val('--id'),
  brand:     val('--brand')?.toLowerCase(),
  slot:      val('--slot'),
  limit:     val('--limit') ? parseInt(val('--limit')!) : undefined,
};

// ─── Supabase client ─────────────────────────────────────────────────
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in env');
  process.exit(1);
}
const supabase = createClient(url, key);

// ─── Types ───────────────────────────────────────────────────────────
interface Bag {
  id: string;
  brand: string;
  model: string;
  slot: string;
  source_url: string | null;
  image_url: string | null;
}
type Source = 'meta' | 'json-ld' | 'img-fallback' | 'playwright';
interface FetchResult { url: string; via: Source }

// ─── HTTP headers (real Chrome 134) ──────────────────────────────────
const REAL_BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':         'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  'Accept':             'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language':    'en-US,en;q=0.9,de;q=0.8',
  'Accept-Encoding':    'gzip, deflate, br',
  'Cache-Control':      'no-cache',
  'Sec-Ch-Ua':          '"Chromium";v="134", "Not_A Brand";v="24"',
  'Sec-Ch-Ua-Mobile':   '?0',
  'Sec-Ch-Ua-Platform': '"macOS"',
  'Sec-Fetch-Dest':     'document',
  'Sec-Fetch-Mode':     'navigate',
  'Sec-Fetch-Site':     'none',
  'Sec-Fetch-User':     '?1',
  'Upgrade-Insecure-Requests': '1',
};

// ─── Parsers (also used to scan Playwright's rendered HTML) ──────────
function normaliseUrl(maybeRelative: string, base: string): string | null {
  try {
    const u = new URL(maybeRelative, base);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch { return null; }
}

function fromMetaTags(html: string, base: string): string | null {
  const patterns: RegExp[] = [
    /<meta\s+(?:[^>]*?\s+)?property=["']og:image:secure_url["'][^>]*?content=["']([^"']+)["']/i,
    /<meta\s+(?:[^>]*?\s+)?property=["']og:image["'][^>]*?content=["']([^"']+)["']/i,
    /<meta\s+(?:[^>]*?\s+)?content=["']([^"']+)["'][^>]*?property=["']og:image["']/i,
    /<meta\s+(?:[^>]*?\s+)?name=["']twitter:image["'][^>]*?content=["']([^"']+)["']/i,
    /<meta\s+(?:[^>]*?\s+)?content=["']([^"']+)["'][^>]*?name=["']twitter:image["']/i,
    /<meta\s+(?:[^>]*?\s+)?itemprop=["']image["'][^>]*?content=["']([^"']+)["']/i,
    /<link\s+(?:[^>]*?\s+)?rel=["']image_src["'][^>]*?href=["']([^"']+)["']/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m && m[1]) {
      const u = normaliseUrl(m[1], base);
      if (u) return u;
    }
  }
  return null;
}

function fromJsonLd(html: string, base: string): string | null {
  const blockRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = blockRe.exec(html)) !== null) {
    try {
      const json = JSON.parse(match[1].trim());
      const candidates = Array.isArray(json) ? json : [json];
      const allNodes: unknown[] = [];
      for (const c of candidates) {
        allNodes.push(c);
        if (c && typeof c === 'object' && '@graph' in c && Array.isArray((c as Record<string, unknown>)['@graph'])) {
          allNodes.push(...((c as Record<string, unknown>)['@graph'] as unknown[]));
        }
      }
      for (const node of allNodes) {
        if (!node || typeof node !== 'object') continue;
        const n = node as Record<string, unknown>;
        const t = n['@type'];
        const isProduct = t === 'Product' || (Array.isArray(t) && t.includes('Product')) || t === 'ItemPage';
        if (!isProduct) continue;
        const img = n.image;
        let candidate: string | null = null;
        if (typeof img === 'string') candidate = img;
        else if (Array.isArray(img) && typeof img[0] === 'string') candidate = img[0] as string;
        else if (Array.isArray(img) && img[0] && typeof img[0] === 'object' && 'url' in (img[0] as object)) {
          candidate = (img[0] as { url: string }).url;
        } else if (img && typeof img === 'object' && 'url' in (img as object)) {
          candidate = (img as { url: string }).url;
        }
        if (candidate) {
          const u = normaliseUrl(candidate, base);
          if (u) return u;
        }
      }
    } catch { /* malformed JSON-LD, skip */ }
  }
  return null;
}

function fromFirstImg(html: string, base: string): string | null {
  const imgRe = /<img\b[^>]*?\bsrc=["']([^"']+)["'][^>]*>/gi;
  let m;
  const skipPatterns = /\b(logo|favicon|icon|sprite|pixel|tracking|placeholder|spacer|blank)\b|\.svg(?:\?|$)/i;
  while ((m = imgRe.exec(html)) !== null) {
    const src = m[1];
    if (skipPatterns.test(src)) continue;
    const u = normaliseUrl(src, base);
    if (!u) continue;
    const fullTag = m[0];
    const widthMatch = fullTag.match(/\bwidth=["']?(\d+)/i);
    if (widthMatch && parseInt(widthMatch[1]) < 100) continue;
    return u;
  }
  return null;
}

function parseAny(html: string, base: string): { url: string; via: Source } | null {
  const meta = fromMetaTags(html, base);
  if (meta) return { url: meta, via: 'meta' };
  const jsonld = fromJsonLd(html, base);
  if (jsonld) return { url: jsonld, via: 'json-ld' };
  const img = fromFirstImg(html, base);
  if (img) return { url: img, via: 'img-fallback' };
  return null;
}

// ─── Stage 1: fast HTTP fetch ────────────────────────────────────────
async function fetchViaHttp(bag: Bag): Promise<FetchResult | null> {
  if (!bag.source_url) return null;
  try {
    const res = await fetch(bag.source_url, {
      headers: REAL_BROWSER_HEADERS,
      redirect: 'follow',
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return parseAny(html, res.url || bag.source_url);
  } catch {
    return null;
  }
}

// ─── Stage 2: Playwright headless fetch ──────────────────────────────
async function fetchViaPlaywright(bag: Bag, browser: Browser): Promise<FetchResult | null> {
  if (!bag.source_url) return null;
  const ctx = await browser.newContext({
    userAgent: REAL_BROWSER_HEADERS['User-Agent'],
    viewport: { width: 1366, height: 768 },
    locale: 'en-US',
  });
  const page = await ctx.newPage();
  try {
    // domcontentloaded is faster than networkidle and usually enough —
    // og:image tags are emitted during the first render pass.
    await page.goto(bag.source_url, { waitUntil: 'domcontentloaded', timeout: 25_000 });
    // Give SPA frameworks a beat to hydrate meta tags
    await page.waitForTimeout(800);

    // 1) Read meta directly via DOM (fastest, no HTML round-trip)
    const directMeta = await page.evaluate(() => {
      const sel = (s: string) => document.querySelector(s)?.getAttribute('content');
      return (
        sel('meta[property="og:image:secure_url"]') ??
        sel('meta[property="og:image"]') ??
        sel('meta[name="twitter:image"]') ??
        sel('meta[itemprop="image"]') ??
        document.querySelector('link[rel="image_src"]')?.getAttribute('href') ??
        null
      );
    });
    const finalUrl = page.url();
    if (directMeta) {
      const u = normaliseUrl(directMeta, finalUrl);
      if (u) return { url: u, via: 'playwright' };
    }

    // 2) Fall back to full HTML scan (catches JSON-LD products, img tags)
    const html = await page.content();
    const parsed = parseAny(html, finalUrl);
    if (parsed) return { url: parsed.url, via: 'playwright' };

    return null;
  } catch {
    return null;
  } finally {
    await ctx.close();
  }
}

// ─── Run ─────────────────────────────────────────────────────────────
async function run() {
  console.log('Loading bags from Supabase…');
  let query = supabase
    .from('bag_products')
    .select('id, brand, model, slot, source_url, image_url')
    .order('id');
  const { data, error } = await query;
  if (error) {
    console.error('Failed to load bags:', error.message);
    process.exit(1);
  }

  let bags = (data ?? []) as Bag[];
  const initialTotal = bags.length;

  // Filters
  if (opt.id) bags = bags.filter(b => b.id === opt.id);
  if (opt.brand) bags = bags.filter(b => b.brand.toLowerCase().includes(opt.brand!));
  if (opt.slot) bags = bags.filter(b => b.slot === opt.slot);
  if (!opt.force) bags = bags.filter(b => !b.image_url);
  bags = bags.filter(b => !!b.source_url);
  if (opt.limit) bags = bags.slice(0, opt.limit);

  console.log(`${initialTotal} bags total, ${bags.length} to process (force=${opt.force}, no-browser=${opt.noBrowser})`);
  if (bags.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  // Pre-warm Playwright once for the whole run if Stage 2 is enabled
  let browser: Browser | null = null;
  if (!opt.noBrowser) {
    console.log('Launching headless Chrome…');
    browser = await chromium.launch({ headless: !opt.headed });
  }

  const updates: string[] = [];
  const viaStats: Record<string, number> = {};
  let ok = 0, fail = 0;

  for (let i = 0; i < bags.length; i++) {
    const bag = bags[i];
    process.stdout.write(`[${i + 1}/${bags.length}] ${bag.id} → `);

    // Stage 1: fast HTTP
    let result = await fetchViaHttp(bag);

    // Stage 2: Playwright fallback
    if (!result && browser) {
      process.stdout.write('http miss, trying browser… ');
      result = await fetchViaPlaywright(bag, browser);
    }

    if (result) {
      ok++;
      viaStats[result.via] = (viaStats[result.via] ?? 0) + 1;
      console.log(`(${result.via}) ${result.url.slice(0, 70)}${result.url.length > 70 ? '…' : ''}`);
      const safeImg = result.url.replace(/'/g, "''");
      const safeId  = bag.id.replace(/'/g, "''");
      updates.push(`UPDATE bag_products SET image_url = '${safeImg}', updated_at = now() WHERE id = '${safeId}';`);
    } else {
      fail++;
      console.log('(none)');
    }
    // Be polite — pause between requests
    await new Promise(r => setTimeout(r, 300));
  }

  if (browser) await browser.close();

  const outPath = join(process.cwd(), 'docs', 'bag-images.sql');
  const header = `-- Auto-generated by scripts/fetch-bag-images.ts at ${new Date().toISOString()}\n-- ${ok} bags resolved, ${fail} failed.\n-- Sources: ${JSON.stringify(viaStats)}\n-- Paste into Supabase SQL Editor.\n\nbegin;\n\n`;
  const footer = '\ncommit;\n';
  writeFileSync(outPath, header + updates.join('\n') + footer);
  console.log(`\nWrote ${updates.length} UPDATE statements → ${outPath}`);
  console.log(`Success: ${ok}, failed: ${fail}`);
  console.log('By source:', viaStats);
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

/* ─── Automation notes (read me before scheduling) ──────────────────

   For periodic refresh (e.g. weekly), two paths:

   PATH A — semi-automatic via GitHub Action.
     1. Add a workflow that runs this script on cron schedule.
        Use `actions/setup-node` + `npx playwright install --with-deps chromium`.
     2. Commit the generated docs/bag-images.sql to a PR.
     3. You review the PR, merge, then paste the SQL into Supabase.
     This keeps you in the loop. No service-role key needed.

   PATH B — fully automatic with service-role key (requires more care).
     1. Get SUPABASE_SERVICE_ROLE_KEY from Supabase dashboard (Settings → API).
     2. Add it as a GitHub Action secret (NEVER commit it, NEVER use NEXT_PUBLIC_).
     3. Modify this script to use the service-role client for UPDATE
        instead of writing SQL. Service-role bypasses RLS.
     4. Workflow runs weekly, updates DB directly, posts a Slack/email
        summary.
     Risk: a service-role key leak = full DB compromise. Treat it as
     much more sensitive than the anon key. Use GitHub Action OIDC if
     possible to avoid persistent secrets.
   ────────────────────────────────────────────────────────────────── */
