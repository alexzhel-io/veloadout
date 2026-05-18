-- Seed: bag_products
--
-- Run once in the Supabase SQL Editor after `schema.sql` has created
-- the bag_products table. Idempotent — uses ON CONFLICT (id) DO UPDATE
-- so re-running keeps the catalogue in sync with this file.
--
-- IMPORTANT — image_url and amazon_asin are intentionally left NULL.
-- We don't have verified ASINs or stable Amazon CDN URLs at seed time,
-- and bad ones would point users at wrong products.
--
-- To enrich a bag later:
--   1. Find the product on amazon.de
--   2. ASIN is the 10-char code in the URL: /dp/B07XYZ1234
--   3. Image URL: right-click the main product image → Copy image address
--      (should look like https://m.media-amazon.com/images/I/<id>.jpg)
--   4. Update via Supabase Dashboard → Table editor → bag_products
--      OR via this file: amend the row, re-run the script.
--
-- Until ASIN is filled, the app falls back to Amazon search via product
-- name (still affiliate-tagged, slightly worse conversion).

begin;

-- ============================================================
-- HANDLEBAR (6)
-- ============================================================
insert into bag_products (id, brand, model, slot, paired, capacity_per_bag_l, weight_grams, image_url, amazon_asin, source_url, price_eur) values
  ('ortlieb-handlebar-pack-9',     'Ortlieb',  'Handlebar-Pack 9L',          'handlebar', false,  9, 380, null, null, 'https://www.ortlieb.com/en/handlebar-pack', 90),
  ('ortlieb-handlebar-pack-15',    'Ortlieb',  'Handlebar-Pack 15L',         'handlebar', false, 15, 430, null, null, 'https://www.ortlieb.com/en/handlebar-pack', 95),
  ('apidura-backcountry-bar-9',    'Apidura',  'Backcountry Handlebar 9L',   'handlebar', false,  9, 220, null, null, 'https://www.apidura.com/shop/backcountry-handlebar-pack-9l/', 135),
  ('restrap-bar-pack-14',          'Restrap',  'Bar Pack 14L',               'handlebar', false, 14, 590, null, null, 'https://restrap.com/products/bar-pack', 120),
  ('topeak-frontloader-8',         'Topeak',   'FrontLoader 8L',             'handlebar', false,  8, 420, null, null, 'https://www.topeak.com/global/en/products/bikepacking-bag/2055-frontloader', 75),
  ('salsa-anything-cradle',        'Salsa',    'EXP Anything Cradle 14L',    'handlebar', false, 14, 540, null, null, 'https://salsacycles.com/components/exp_series/exp_anything_cradle', 90)
on conflict (id) do update set
  brand = excluded.brand, model = excluded.model, slot = excluded.slot, paired = excluded.paired,
  capacity_per_bag_l = excluded.capacity_per_bag_l, weight_grams = excluded.weight_grams,
  source_url = excluded.source_url, price_eur = excluded.price_eur, updated_at = now();

-- ============================================================
-- FRAME (5)
-- ============================================================
insert into bag_products (id, brand, model, slot, paired, capacity_per_bag_l, weight_grams, image_url, amazon_asin, source_url, price_eur) values
  ('ortlieb-frame-pack-4',         'Ortlieb',  'Frame-Pack 4L',              'frame', false,  4, 330, null, null, 'https://www.ortlieb.com/en/frame-pack', 95),
  ('ortlieb-frame-pack-6',         'Ortlieb',  'Frame-Pack 6L',              'frame', false,  6, 380, null, null, 'https://www.ortlieb.com/en/frame-pack', 105),
  ('apidura-backcountry-frame-6',  'Apidura',  'Backcountry Full Frame 6L',  'frame', false,  6, 250, null, null, 'https://www.apidura.com/shop/backcountry-full-frame-pack/', 130),
  ('restrap-frame-bag-m',          'Restrap',  'Frame Bag (M)',              'frame', false,  5, 360, null, null, 'https://restrap.com/products/frame-bag', 75),
  ('topeak-midloader-4-5',         'Topeak',   'MidLoader 4.5L',             'frame', false,  4.5, 280, null, null, 'https://www.topeak.com/global/en/products/bikepacking-bag/2056-midloader', 55)
on conflict (id) do update set
  brand = excluded.brand, model = excluded.model, slot = excluded.slot, paired = excluded.paired,
  capacity_per_bag_l = excluded.capacity_per_bag_l, weight_grams = excluded.weight_grams,
  source_url = excluded.source_url, price_eur = excluded.price_eur, updated_at = now();

-- ============================================================
-- SEATPACK (6)
-- ============================================================
insert into bag_products (id, brand, model, slot, paired, capacity_per_bag_l, weight_grams, image_url, amazon_asin, source_url, price_eur) values
  ('ortlieb-seat-pack-11',         'Ortlieb',  'Seat-Pack 11L',              'seatpack', false, 11, 430, null, null, 'https://www.ortlieb.com/en/seat-pack', 110),
  ('ortlieb-seat-pack-16-5',       'Ortlieb',  'Seat-Pack 16.5L',            'seatpack', false, 16.5, 456, null, null, 'https://www.ortlieb.com/en/seat-pack', 120),
  ('apidura-backcountry-saddle-14','Apidura',  'Backcountry Saddle 14L',     'seatpack', false, 14, 380, null, null, 'https://www.apidura.com/shop/backcountry-saddle-pack/', 165),
  ('restrap-saddle-bag-18',        'Restrap',  'Saddle Bag 18L',             'seatpack', false, 18, 620, null, null, 'https://restrap.com/products/saddle-bag', 130),
  ('topeak-backloader-15',         'Topeak',   'BackLoader X 15L',           'seatpack', false, 15, 480, null, null, 'https://www.topeak.com/global/en/products/bikepacking-bag/2106-backloader-x', 95),
  ('tailfin-aeropack-22',          'Tailfin',  'AeroPack 22L',               'seatpack', false, 22, 600, null, null, 'https://www.tailfin.cc/aeropack/', 380)
on conflict (id) do update set
  brand = excluded.brand, model = excluded.model, slot = excluded.slot, paired = excluded.paired,
  capacity_per_bag_l = excluded.capacity_per_bag_l, weight_grams = excluded.weight_grams,
  source_url = excluded.source_url, price_eur = excluded.price_eur, updated_at = now();

-- ============================================================
-- FORK (4) — paired; capacity is per single bag (panel applies ×2)
-- ============================================================
insert into bag_products (id, brand, model, slot, paired, capacity_per_bag_l, weight_grams, image_url, amazon_asin, source_url, price_eur) values
  ('apidura-expedition-fork-7',    'Apidura',  'Expedition Fork Pack 7.5L',  'fork', true, 7.5, 230, null, null, 'https://www.apidura.com/shop/expedition-fork-pack/', 90),
  ('restrap-fork-bag-6',           'Restrap',  'Fork Bag 6L',                'fork', true, 6,   340, null, null, 'https://restrap.com/products/fork-bag', 65),
  ('salsa-anything-cage-hd',       'Salsa',    'Anything Cage HD (with bag)','fork', true, 3.5, 280, null, null, 'https://salsacycles.com/components/exp_series/exp_anything_cage_hd', 50),
  ('topeak-versacage',             'Topeak',   'VersaCage',                  'fork', true, 3,   200, null, null, 'https://www.topeak.com/global/en/products/cages/2057-versacage', 35)
on conflict (id) do update set
  brand = excluded.brand, model = excluded.model, slot = excluded.slot, paired = excluded.paired,
  capacity_per_bag_l = excluded.capacity_per_bag_l, weight_grams = excluded.weight_grams,
  source_url = excluded.source_url, price_eur = excluded.price_eur, updated_at = now();

-- ============================================================
-- PANNIERS (5) — paired; capacity is per single pannier (panel applies ×2)
-- ============================================================
insert into bag_products (id, brand, model, slot, paired, capacity_per_bag_l, weight_grams, image_url, amazon_asin, source_url, price_eur) values
  ('ortlieb-back-roller-classic',  'Ortlieb',  'Back-Roller Classic 20L',    'panniers', true, 20, 950, null, null, 'https://www.ortlieb.com/en/back-roller-classic', 110),
  ('ortlieb-back-roller-plus',     'Ortlieb',  'Back-Roller Plus 20L',       'panniers', true, 20, 970, null, null, 'https://www.ortlieb.com/en/back-roller-plus', 130),
  ('ortlieb-front-roller-classic', 'Ortlieb',  'Front-Roller Classic 12.5L', 'panniers', true, 12.5, 760, null, null, 'https://www.ortlieb.com/en/front-roller-classic', 100),
  ('crosso-dry-30',                'Crosso',   'Dry 30L',                    'panniers', true, 30, 1100, null, null, 'https://www.crosso.eu/products/dry-30/', 75),
  ('vaude-aqua-back-24',           'Vaude',    'Aqua Back Plus 24L',         'panniers', true, 24, 940, null, null, 'https://www.vaude.com/en/aqua-back-plus', 130)
on conflict (id) do update set
  brand = excluded.brand, model = excluded.model, slot = excluded.slot, paired = excluded.paired,
  capacity_per_bag_l = excluded.capacity_per_bag_l, weight_grams = excluded.weight_grams,
  source_url = excluded.source_url, price_eur = excluded.price_eur, updated_at = now();

commit;
