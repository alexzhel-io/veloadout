-- Seed: bag_products
--
-- Idempotent — uses ON CONFLICT (id) DO UPDATE so re-running keeps the
-- catalogue in sync with this file.
--
-- image_url and amazon_asin are left NULL on first insert. Run
-- `npx tsx scripts/fetch-bag-images.ts` after this to auto-fill image_url
-- from manufacturer og:image meta tags.

begin;

-- ============================================================
-- HANDLEBAR (12)
-- ============================================================
insert into bag_products (id, brand, model, slot, paired, capacity_per_bag_l, weight_grams, image_url, amazon_asin, source_url, price_eur) values
  ('ortlieb-handlebar-pack-9',         'Ortlieb',  'Handlebar-Pack 9L',          'handlebar', false,  9, 380, null, null, 'https://www.ortlieb.com/en/handlebar-pack', 90),
  ('ortlieb-handlebar-pack-15',        'Ortlieb',  'Handlebar-Pack 15L',         'handlebar', false, 15, 430, null, null, 'https://www.ortlieb.com/en/handlebar-pack', 95),
  ('ortlieb-accessory-pack',           'Ortlieb',  'Accessory-Pack 3.5L',        'handlebar', false, 3.5, 220, null, null, 'https://www.ortlieb.com/en/accessory-pack', 60),
  ('apidura-backcountry-bar-9',        'Apidura',  'Backcountry Handlebar 9L',   'handlebar', false,  9, 220, null, null, 'https://www.apidura.com/shop/backcountry-handlebar-pack-9l/', 135),
  ('apidura-backcountry-bar-14',       'Apidura',  'Backcountry Handlebar 14L',  'handlebar', false, 14, 260, null, null, 'https://www.apidura.com/shop/backcountry-handlebar-pack-14l/', 150),
  ('apidura-expedition-bar-14',        'Apidura',  'Expedition Handlebar 14L',   'handlebar', false, 14, 290, null, null, 'https://www.apidura.com/shop/expedition-handlebar-pack-14l/', 145),
  ('restrap-bar-pack-14',              'Restrap',  'Bar Pack 14L',               'handlebar', false, 14, 590, null, null, 'https://restrap.com/products/bar-pack', 120),
  ('restrap-bar-pack-17',              'Restrap',  'Bar Pack 17L',               'handlebar', false, 17, 620, null, null, 'https://restrap.com/products/bar-pack', 130),
  ('topeak-frontloader-8',             'Topeak',   'FrontLoader 8L',             'handlebar', false,  8, 420, null, null, 'https://www.topeak.com/global/en/products/bikepacking-bag/2055-frontloader', 75),
  ('salsa-anything-cradle',            'Salsa',    'EXP Anything Cradle 14L',    'handlebar', false, 14, 540, null, null, 'https://salsacycles.com/components/exp_series/exp_anything_cradle', 90),
  ('revelate-egress-pocket',           'Revelate Designs', 'Egress Pocket 4.5L', 'handlebar', false, 4.5, 220, null, null, 'https://revelatedesigns.com/shop/handlebar-bags/egress-pocket/', 95),
  ('revelate-pronghorn',               'Revelate Designs', 'Pronghorn 16L',      'handlebar', false, 16, 580, null, null, 'https://revelatedesigns.com/shop/handlebar-bags/pronghorn/', 165)
on conflict (id) do update set
  brand = excluded.brand, model = excluded.model, slot = excluded.slot, paired = excluded.paired,
  capacity_per_bag_l = excluded.capacity_per_bag_l, weight_grams = excluded.weight_grams,
  source_url = excluded.source_url, price_eur = excluded.price_eur, updated_at = now();

-- ============================================================
-- FRAME (10)
-- ============================================================
insert into bag_products (id, brand, model, slot, paired, capacity_per_bag_l, weight_grams, image_url, amazon_asin, source_url, price_eur) values
  ('ortlieb-frame-pack-4',             'Ortlieb',  'Frame-Pack 4L',              'frame', false,  4, 330, null, null, 'https://www.ortlieb.com/en/frame-pack', 95),
  ('ortlieb-frame-pack-6',             'Ortlieb',  'Frame-Pack 6L',              'frame', false,  6, 380, null, null, 'https://www.ortlieb.com/en/frame-pack', 105),
  ('ortlieb-frame-pack-top-tube-4',    'Ortlieb',  'Frame-Pack Top-Tube 4L',     'frame', false,  4, 320, null, null, 'https://www.ortlieb.com/en/frame-pack-top-tube', 100),
  ('apidura-backcountry-frame-2',      'Apidura',  'Backcountry Frame 2L',       'frame', false,  2, 145, null, null, 'https://www.apidura.com/shop/backcountry-frame-pack/', 95),
  ('apidura-backcountry-frame-4',      'Apidura',  'Backcountry Frame 4L',       'frame', false,  4, 175, null, null, 'https://www.apidura.com/shop/backcountry-frame-pack/', 110),
  ('apidura-backcountry-frame-6',      'Apidura',  'Backcountry Full Frame 6L',  'frame', false,  6, 250, null, null, 'https://www.apidura.com/shop/backcountry-full-frame-pack/', 130),
  ('restrap-frame-bag-s',              'Restrap',  'Frame Bag (S) 3L',           'frame', false,  3, 280, null, null, 'https://restrap.com/products/frame-bag', 65),
  ('restrap-frame-bag-m',              'Restrap',  'Frame Bag (M) 5L',           'frame', false,  5, 360, null, null, 'https://restrap.com/products/frame-bag', 75),
  ('topeak-midloader-4-5',             'Topeak',   'MidLoader 4.5L',             'frame', false,  4.5, 280, null, null, 'https://www.topeak.com/global/en/products/bikepacking-bag/2056-midloader', 55),
  ('topeak-midloader-6',               'Topeak',   'MidLoader 6L',               'frame', false,  6, 310, null, null, 'https://www.topeak.com/global/en/products/bikepacking-bag/2056-midloader', 65)
on conflict (id) do update set
  brand = excluded.brand, model = excluded.model, slot = excluded.slot, paired = excluded.paired,
  capacity_per_bag_l = excluded.capacity_per_bag_l, weight_grams = excluded.weight_grams,
  source_url = excluded.source_url, price_eur = excluded.price_eur, updated_at = now();

-- ============================================================
-- SEATPACK (14)
-- ============================================================
insert into bag_products (id, brand, model, slot, paired, capacity_per_bag_l, weight_grams, image_url, amazon_asin, source_url, price_eur) values
  ('ortlieb-seat-pack-11',             'Ortlieb',  'Seat-Pack 11L',              'seatpack', false, 11, 430, null, null, 'https://www.ortlieb.com/en/seat-pack', 110),
  ('ortlieb-seat-pack-16-5',           'Ortlieb',  'Seat-Pack 16.5L',            'seatpack', false, 16.5, 456, null, null, 'https://www.ortlieb.com/en/seat-pack', 120),
  ('apidura-backcountry-saddle-6',     'Apidura',  'Backcountry Saddle 6L',      'seatpack', false,  6, 280, null, null, 'https://www.apidura.com/shop/backcountry-saddle-pack/', 130),
  ('apidura-backcountry-saddle-11',    'Apidura',  'Backcountry Saddle 11L',     'seatpack', false, 11, 340, null, null, 'https://www.apidura.com/shop/backcountry-saddle-pack/', 150),
  ('apidura-backcountry-saddle-14',    'Apidura',  'Backcountry Saddle 14L',     'seatpack', false, 14, 380, null, null, 'https://www.apidura.com/shop/backcountry-saddle-pack/', 165),
  ('apidura-backcountry-saddle-17',    'Apidura',  'Backcountry Saddle 17L',     'seatpack', false, 17, 420, null, null, 'https://www.apidura.com/shop/backcountry-saddle-pack/', 175),
  ('restrap-saddle-bag-8',             'Restrap',  'Saddle Bag (S) 8L',          'seatpack', false,  8, 490, null, null, 'https://restrap.com/products/saddle-bag', 110),
  ('restrap-saddle-bag-14',            'Restrap',  'Saddle Bag (M) 14L',         'seatpack', false, 14, 560, null, null, 'https://restrap.com/products/saddle-bag', 120),
  ('restrap-saddle-bag-18',            'Restrap',  'Saddle Bag (L) 18L',         'seatpack', false, 18, 620, null, null, 'https://restrap.com/products/saddle-bag', 130),
  ('topeak-backloader-10',             'Topeak',   'BackLoader X 10L',           'seatpack', false, 10, 440, null, null, 'https://www.topeak.com/global/en/products/bikepacking-bag/2106-backloader-x', 85),
  ('topeak-backloader-15',             'Topeak',   'BackLoader X 15L',           'seatpack', false, 15, 480, null, null, 'https://www.topeak.com/global/en/products/bikepacking-bag/2106-backloader-x', 95),
  ('tailfin-aeropack-22',              'Tailfin',  'AeroPack 22L',               'seatpack', false, 22, 600, null, null, 'https://www.tailfin.cc/aeropack/', 380),
  ('revelate-terrapin-14',             'Revelate Designs', 'Terrapin System 14L', 'seatpack', false, 14, 470, null, null, 'https://revelatedesigns.com/shop/seat-bags/terrapin-system-14/', 215),
  ('revelate-spinelock-16',            'Revelate Designs', 'Spinelock 16L',      'seatpack', false, 16, 520, null, null, 'https://revelatedesigns.com/shop/seat-bags/spinelock-seat-bag/', 195)
on conflict (id) do update set
  brand = excluded.brand, model = excluded.model, slot = excluded.slot, paired = excluded.paired,
  capacity_per_bag_l = excluded.capacity_per_bag_l, weight_grams = excluded.weight_grams,
  source_url = excluded.source_url, price_eur = excluded.price_eur, updated_at = now();

-- ============================================================
-- FORK (8) — paired; capacity is per single bag (panel applies ×2)
-- ============================================================
insert into bag_products (id, brand, model, slot, paired, capacity_per_bag_l, weight_grams, image_url, amazon_asin, source_url, price_eur) values
  ('apidura-expedition-fork-7-5',      'Apidura',  'Expedition Fork Pack 7.5L',  'fork', true, 7.5, 230, null, null, 'https://www.apidura.com/shop/expedition-fork-pack/', 90),
  ('apidura-expedition-fork-9',        'Apidura',  'Expedition Fork Pack 9L',    'fork', true, 9,   265, null, null, 'https://www.apidura.com/shop/expedition-fork-pack/', 95),
  ('restrap-fork-bag-4',               'Restrap',  'Fork Bag 4L',                'fork', true, 4,   290, null, null, 'https://restrap.com/products/fork-bag', 55),
  ('restrap-fork-bag-6',               'Restrap',  'Fork Bag 6L',                'fork', true, 6,   340, null, null, 'https://restrap.com/products/fork-bag', 65),
  ('salsa-anything-cage-hd',           'Salsa',    'Anything Cage HD (with bag)', 'fork', true, 3.5, 280, null, null, 'https://salsacycles.com/components/exp_series/exp_anything_cage_hd', 50),
  ('topeak-versacage',                 'Topeak',   'VersaCage',                  'fork', true, 3,   200, null, null, 'https://www.topeak.com/global/en/products/cages/2057-versacage', 35),
  ('revelate-mountain-feedbag',        'Revelate Designs', 'Mountain Feedbag',   'fork', true, 1.2, 110, null, null, 'https://revelatedesigns.com/shop/accessories/mountain-feedbag/', 55),
  ('revelate-joey',                    'Revelate Designs', 'Joey',               'fork', true, 1.5, 130, null, null, 'https://revelatedesigns.com/shop/accessories/joey/', 65)
on conflict (id) do update set
  brand = excluded.brand, model = excluded.model, slot = excluded.slot, paired = excluded.paired,
  capacity_per_bag_l = excluded.capacity_per_bag_l, weight_grams = excluded.weight_grams,
  source_url = excluded.source_url, price_eur = excluded.price_eur, updated_at = now();

-- ============================================================
-- PANNIERS (8) — paired; capacity is per single pannier (panel applies ×2)
-- ============================================================
insert into bag_products (id, brand, model, slot, paired, capacity_per_bag_l, weight_grams, image_url, amazon_asin, source_url, price_eur) values
  ('ortlieb-back-roller-classic',      'Ortlieb',  'Back-Roller Classic 20L',    'panniers', true, 20, 950, null, null, 'https://www.ortlieb.com/en/back-roller-classic', 110),
  ('ortlieb-back-roller-plus',         'Ortlieb',  'Back-Roller Plus 20L',       'panniers', true, 20, 970, null, null, 'https://www.ortlieb.com/en/back-roller-plus', 130),
  ('ortlieb-back-roller-pro-classic',  'Ortlieb',  'Back-Roller Pro Classic 35L', 'panniers', true, 35, 1240, null, null, 'https://www.ortlieb.com/en/back-roller-pro-classic', 165),
  ('ortlieb-front-roller-classic',     'Ortlieb',  'Front-Roller Classic 12.5L', 'panniers', true, 12.5, 760, null, null, 'https://www.ortlieb.com/en/front-roller-classic', 100),
  ('ortlieb-gravel-pack',              'Ortlieb',  'Gravel-Pack 12.5L',          'panniers', true, 12.5, 790, null, null, 'https://www.ortlieb.com/en/gravel-pack', 145),
  ('crosso-dry-30',                    'Crosso',   'Dry 30L',                    'panniers', true, 30, 1100, null, null, 'https://www.crosso.eu/products/dry-30/', 75),
  ('vaude-aqua-back-24',               'Vaude',    'Aqua Back Plus 24L',         'panniers', true, 24, 940, null, null, 'https://www.vaude.com/en/aqua-back-plus', 130),
  ('tailfin-aeropack-pannier-22',      'Tailfin',  'AeroPack Pannier 22L',       'panniers', true, 22, 720, null, null, 'https://www.tailfin.cc/pannier/', 180)
on conflict (id) do update set
  brand = excluded.brand, model = excluded.model, slot = excluded.slot, paired = excluded.paired,
  capacity_per_bag_l = excluded.capacity_per_bag_l, weight_grams = excluded.weight_grams,
  source_url = excluded.source_url, price_eur = excluded.price_eur, updated_at = now();

commit;
