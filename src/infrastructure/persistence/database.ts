import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'gear.db');

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (db) return db;

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS gear_items (
      id          TEXT PRIMARY KEY,
      names_json  TEXT NOT NULL,
      aliases_json TEXT NOT NULL DEFAULT '[]',
      volume_liters REAL NOT NULL,
      weight_grams  REAL,
      category    TEXT NOT NULL,
      source_url  TEXT,
      verified_at TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_gear_items_category ON gear_items(category);
  `);

  seedIfEmpty(db);

  return db;
}

interface SeedRow {
  names: Record<string, string>;
  aliases: string[];
  volume: number;
  weight?: number;
  category: string;
  source?: string;
}

function seedIfEmpty(db: Database.Database) {
  const count = (db.prepare('SELECT COUNT(*) as c FROM gear_items').get() as { c: number }).c;
  if (count > 0) return;

  const items: SeedRow[] = [
    { names: { en: 'Sleeping bag (3-season)', de: 'Schlafsack (3 Jahreszeiten)', ru: 'Спальник (3 сезона)' }, aliases: ['sleeping bag 3 season', 'schlafsack', 'спальник'], volume: 9, weight: 900, category: 'sleep' },
    { names: { en: 'Sleeping bag (ultralight)', de: 'Schlafsack (Ultraleicht)', ru: 'Спальник ультралёгкий' }, aliases: ['ultralight sleeping bag', 'sleeping bag ultralight'], volume: 4, weight: 500, category: 'sleep' },
    { names: { en: 'Inflatable sleeping pad', de: 'Aufblasbare Isomatte', ru: 'Надувной коврик' }, aliases: ['sleeping pad', 'isomatte', 'inflatable pad', 'коврик'], volume: 3, weight: 500, category: 'sleep' },
    { names: { en: 'Foam sleeping pad', de: 'Schaum-Isomatte', ru: 'Пенный коврик' }, aliases: ['foam pad', 'ccf pad', 'ridgerest'], volume: 4.5, weight: 400, category: 'sleep' },
    { names: { en: 'Bivy sack', de: 'Biwaksack', ru: 'Бивак' }, aliases: ['bivy', 'bivi', 'bivouac sack'], volume: 2, weight: 350, category: 'shelter' },
    { names: { en: 'Tent (1-person)', de: 'Zelt (1 Person)', ru: 'Палатка одноместная' }, aliases: ['tent 1p', 'solo tent', 'zelt 1p', 'палатка 1'], volume: 4, weight: 1200, category: 'shelter' },
    { names: { en: 'Tent (2-person)', de: 'Zelt (2 Personen)', ru: 'Палатка двухместная' }, aliases: ['tent 2p', 'two person tent', 'zelt 2p', 'палатка 2'], volume: 7, weight: 1800, category: 'shelter' },
    { names: { en: 'Tarp', de: 'Plane', ru: 'Тарп' }, aliases: ['tarp shelter', 'silnylon tarp'], volume: 1.5, weight: 400, category: 'shelter' },
    { names: { en: 'Rain jacket', de: 'Regenjacke', ru: 'Дождевик' }, aliases: ['rain coat', 'waterproof jacket', 'regenjacke', 'дождевик'], volume: 1.5, weight: 350, category: 'clothing' },
    { names: { en: 'Rain pants', de: 'Regenhose', ru: 'Дождевые штаны' }, aliases: ['waterproof pants', 'regenhose'], volume: 0.8, weight: 250, category: 'clothing' },
    { names: { en: 'Down jacket', de: 'Daunenjacke', ru: 'Пуховик' }, aliases: ['puffy jacket', 'down puffy', 'daunenjacke', 'пуховик'], volume: 3, weight: 400, category: 'clothing' },
    { names: { en: 'Cycling jersey (x3)', de: 'Radtrikot (x3)', ru: 'Веломайки (x3)' }, aliases: ['cycling jerseys', 'bike jersey'], volume: 1.5, weight: 300, category: 'clothing' },
    { names: { en: 'Cycling bib shorts (x2)', de: 'Radhose (x2)', ru: 'Велошорты (x2)' }, aliases: ['bib shorts', 'cycling shorts', 'radhose'], volume: 1, weight: 400, category: 'clothing' },
    { names: { en: 'Gas canister 230g', de: 'Gaskartusche 230g', ru: 'Газовый баллон 230г' }, aliases: ['gas canister', 'fuel canister', '230g gas', 'isobutane'], volume: 0.6, weight: 390, category: 'cooking' },
    { names: { en: 'Camp stove', de: 'Campingkocher', ru: 'Туристическая горелка' }, aliases: ['camping stove', 'backpacking stove', 'kocher', 'горелка'], volume: 0.5, weight: 200, category: 'cooking' },
    { names: { en: 'Titanium pot 0.9L', de: 'Titan-Topf 0,9L', ru: 'Титановый котелок 0.9Л' }, aliases: ['titanium pot', 'camp pot', 'cooking pot', 'котелок'], volume: 1, weight: 130, category: 'cooking' },
    { names: { en: 'Bike multi-tool', de: 'Fahrrad-Multitool', ru: 'Мультитул для велосипеда' }, aliases: ['multitool', 'multi tool', 'bike tool', 'мультитул'], volume: 0.3, weight: 200, category: 'tools' },
    { names: { en: 'Spare tubes (x2)', de: 'Ersatzschläuche (x2)', ru: 'Запасные камеры (x2)' }, aliases: ['inner tubes', 'spare tube', 'запасные камеры', 'камеры'], volume: 0.5, weight: 250, category: 'tools' },
    { names: { en: 'Tire levers + patch kit', de: 'Reifenheber + Flickzeug', ru: 'Монтажки + латки' }, aliases: ['patch kit', 'tire lever', 'tyre lever', 'монтажки'], volume: 0.2, weight: 80, category: 'tools' },
    { names: { en: 'Mini pump', de: 'Minipumpe', ru: 'Мининасос' }, aliases: ['bike pump', 'frame pump', 'насос'], volume: 0.3, weight: 120, category: 'tools' },
    { names: { en: 'Chain lube + rag', de: 'Kettenöl + Lappen', ru: 'Смазка для цепи + тряпка' }, aliases: ['chain lube', 'bike lube', 'смазка'], volume: 0.2, weight: 100, category: 'tools' },
    { names: { en: 'First aid kit', de: 'Erste-Hilfe-Set', ru: 'Аптечка' }, aliases: ['first aid', 'medical kit', 'аптечка', 'erste hilfe'], volume: 0.5, weight: 200, category: 'hygiene' },
    { names: { en: 'Toiletry bag', de: 'Kulturbeutel', ru: 'Косметичка' }, aliases: ['toiletries', 'wash bag', 'kulturbeutel', 'косметичка'], volume: 1.5, weight: 500, category: 'hygiene' },
    { names: { en: 'Sunscreen + chamois cream', de: 'Sonnencreme + Sitzcrème', ru: 'Солнцезащитный крем + мазь' }, aliases: ['sunscreen', 'chamois cream', 'sonnencreme'], volume: 0.4, weight: 200, category: 'hygiene' },
    { names: { en: 'Smartphone', de: 'Smartphone', ru: 'Смартфон' }, aliases: ['phone', 'handy', 'телефон', 'iphone', 'android'], volume: 0.2, weight: 200, category: 'electronics' },
    { names: { en: 'Power bank 20000mAh', de: 'Powerbank 20000mAh', ru: 'Павербанк 20000мАч' }, aliases: ['powerbank', 'power bank', 'portable charger', 'павербанк'], volume: 0.8, weight: 450, category: 'electronics' },
    { names: { en: 'USB charger + cables', de: 'USB-Ladegerät + Kabel', ru: 'Зарядник + кабели' }, aliases: ['charger', 'usb cable', 'зарядник'], volume: 0.3, weight: 150, category: 'electronics' },
    { names: { en: 'Bike computer', de: 'Fahrradcomputer', ru: 'Велокомпьютер' }, aliases: ['garmin', 'wahoo', 'bike gps', 'велокомпьютер', 'fahrradcomputer'], volume: 0.2, weight: 100, category: 'navigation' },
    { names: { en: 'Handlebar mount', de: 'Lenkermontage', ru: 'Крепление на руль' }, aliases: ['phone mount', 'gps mount', 'bar mount'], volume: 0.1, weight: 60, category: 'navigation' },
    { names: { en: 'Water filter', de: 'Wasserfilter', ru: 'Фильтр для воды' }, aliases: ['filter', 'sawyer', 'waterfilter', 'фильтр'], volume: 0.3, weight: 100, category: 'water' },
    { names: { en: 'Water bottle 750ml', de: 'Trinkflasche 750ml', ru: 'Бутылка 750мл' }, aliases: ['water bottle', 'trinkflasche', 'бутылка с водой', '750ml bottle'], volume: 0.75, weight: 100, category: 'water' },
    { names: { en: 'Hydration bladder 2L', de: 'Trinkblase 2L', ru: 'Гидратор 2Л' }, aliases: ['hydration bladder', 'camelback', 'platypus', 'гидратор'], volume: 2, weight: 200, category: 'water' },

    // Specific branded items
    { names: { en: 'Ortlieb Seat-Pack S (11L)', de: 'Ortlieb Seat-Pack S (11L)', ru: 'Ortlieb Seat-Pack S (11L)' }, aliases: ['ortlieb seat-pack s', 'ortlieb seatpack s', 'seat-pack s'], volume: 11, weight: 390, category: 'other', source: 'https://www.ortlieb.com/en/seat-pack' },
    { names: { en: 'Ortlieb Seat-Pack QR (13L)', de: 'Ortlieb Seat-Pack QR (13L)', ru: 'Ortlieb Seat-Pack QR (13L)' }, aliases: ['ortlieb seat-pack qr', 'seat-pack qr'], volume: 13, weight: 430, category: 'other', source: 'https://www.ortlieb.com/en/seat-pack-qr' },
    { names: { en: 'Revelate Designs Terrapin (14L)', de: 'Revelate Designs Terrapin (14L)', ru: 'Revelate Designs Terrapin (14L)' }, aliases: ['revelate terrapin', 'terrapin system'], volume: 14, weight: 460, category: 'other', source: 'https://www.revelatedesigns.com' },
    { names: { en: 'Apidura Backcountry Handlebar Pack (9L)', de: 'Apidura Backcountry Handlebar Pack (9L)', ru: 'Apidura Backcountry Handlebar Pack (9L)' }, aliases: ['apidura handlebar', 'apidura backcountry handlebar'], volume: 9, weight: 330, category: 'other', source: 'https://www.apidura.com' },
  ];

  const insert = db.prepare(`
    INSERT INTO gear_items (id, names_json, aliases_json, volume_liters, weight_grams, category, source_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const insertMany = db.transaction((rows: SeedRow[]) => {
    rows.forEach((row, i) => {
      insert.run(
        `seed-${i}`,
        JSON.stringify(row.names),
        JSON.stringify(row.aliases),
        row.volume,
        row.weight ?? null,
        row.category,
        row.source ?? null,
      );
    });
  });

  insertMany(items);
}
