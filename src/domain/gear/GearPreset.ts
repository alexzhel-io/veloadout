import { GearCategory } from './GearCategory';

export interface GearPreset {
  id: string;
  names: Record<string, string>;
  volumeLiters: number;
  category: GearCategory;
}

export const GEAR_PRESETS: GearPreset[] = [
  {
    id: 'preset-sleep-3season',
    names: { en: 'Sleeping bag (3-season)', de: 'Schlafsack (3 Jahreszeiten)', ru: 'Спальник (3 сезона)' },
    volumeLiters: 9,
    category: GearCategory.SLEEP,
  },
  {
    id: 'preset-sleep-ultralight',
    names: { en: 'Sleeping bag (ultralight)', de: 'Schlafsack (Ultraleicht)', ru: 'Спальник (ультралёгкий)' },
    volumeLiters: 4,
    category: GearCategory.SLEEP,
  },
  {
    id: 'preset-pad-inflatable',
    names: { en: 'Inflatable sleeping pad', de: 'Aufblasbare Isomatte', ru: 'Надувной коврик' },
    volumeLiters: 3,
    category: GearCategory.SLEEP,
  },
  {
    id: 'preset-tent-1p',
    names: { en: 'Tent (1-person)', de: 'Zelt (1 Person)', ru: 'Палатка (1-местная)' },
    volumeLiters: 4,
    category: GearCategory.SHELTER,
  },
  {
    id: 'preset-tent-2p',
    names: { en: 'Tent (2-person)', de: 'Zelt (2 Personen)', ru: 'Палатка (2-местная)' },
    volumeLiters: 7,
    category: GearCategory.SHELTER,
  },
  {
    id: 'preset-bivy',
    names: { en: 'Bivy sack', de: 'Biwaksack', ru: 'Бивак' },
    volumeLiters: 2,
    category: GearCategory.SHELTER,
  },
  {
    id: 'preset-rain-jacket',
    names: { en: 'Rain jacket', de: 'Regenjacke', ru: 'Дождевик' },
    volumeLiters: 1.5,
    category: GearCategory.CLOTHING,
  },
  {
    id: 'preset-clothing-3day',
    names: { en: 'Clothing (3 days)', de: 'Kleidung (3 Tage)', ru: 'Одежда (3 дня)' },
    volumeLiters: 4,
    category: GearCategory.CLOTHING,
  },
  {
    id: 'preset-stove-pot',
    names: { en: 'Stove + pot', de: 'Kocher + Topf', ru: 'Горелка + кастрюля' },
    volumeLiters: 1.5,
    category: GearCategory.COOKING,
  },
  {
    id: 'preset-repair-kit',
    names: { en: 'Bike repair kit', de: 'Reparaturset', ru: 'Ремкомплект' },
    volumeLiters: 1,
    category: GearCategory.TOOLS,
  },
  {
    id: 'preset-first-aid',
    names: { en: 'First aid kit', de: 'Erste-Hilfe-Set', ru: 'Аптечка' },
    volumeLiters: 0.5,
    category: GearCategory.HYGIENE,
  },
  {
    id: 'preset-electronics',
    names: { en: 'Electronics (phone, charger, powerbank)', de: 'Elektronik (Handy, Ladegerät, Powerbank)', ru: 'Электроника (телефон, зарядник, павербанк)' },
    volumeLiters: 1,
    category: GearCategory.ELECTRONICS,
  },
  {
    id: 'preset-food-1day',
    names: { en: 'Food (1 day)', de: 'Essen (1 Tag)', ru: 'Еда (1 день)' },
    volumeLiters: 2,
    category: GearCategory.FOOD,
  },
  {
    id: 'preset-water-bottles',
    names: { en: 'Water bottles (2 × 750ml)', de: 'Wasserflaschen (2 × 750ml)', ru: 'Бутылки с водой (2 × 750мл)' },
    volumeLiters: 1.5,
    category: GearCategory.WATER,
  },
];
