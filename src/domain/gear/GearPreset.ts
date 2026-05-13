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
    names: { en: 'Sleeping bag (3-season)', de: 'Schlafsack (3 Jahreszeiten)', uk: 'Спальник (3 сезони)', ru: 'Спальник (3 сезона)' },
    volumeLiters: 9,
    category: GearCategory.SLEEP,
  },
  {
    id: 'preset-sleep-ultralight',
    names: { en: 'Sleeping bag (ultralight)', de: 'Schlafsack (Ultraleicht)', uk: 'Спальник (ультралегкий)', ru: 'Спальник (ультралёгкий)' },
    volumeLiters: 4,
    category: GearCategory.SLEEP,
  },
  {
    id: 'preset-pad-inflatable',
    names: { en: 'Inflatable sleeping pad', de: 'Aufblasbare Isomatte', uk: 'Надувний килимок', ru: 'Надувной коврик' },
    volumeLiters: 3,
    category: GearCategory.SLEEP,
  },
  {
    id: 'preset-tent-1p',
    names: { en: 'Tent (1-person)', de: 'Zelt (1 Person)', uk: 'Намет (1-місний)', ru: 'Палатка (1-местная)' },
    volumeLiters: 4,
    category: GearCategory.SHELTER,
  },
  {
    id: 'preset-tent-2p',
    names: { en: 'Tent (2-person)', de: 'Zelt (2 Personen)', uk: 'Намет (2-місний)', ru: 'Палатка (2-местная)' },
    volumeLiters: 7,
    category: GearCategory.SHELTER,
  },
  {
    id: 'preset-bivy',
    names: { en: 'Bivy sack', de: 'Biwaksack', uk: 'Бівак', ru: 'Бивак' },
    volumeLiters: 2,
    category: GearCategory.SHELTER,
  },
  {
    id: 'preset-rain-jacket',
    names: { en: 'Rain jacket', de: 'Regenjacke', uk: 'Дощовик', ru: 'Дождевик' },
    volumeLiters: 1.5,
    category: GearCategory.CLOTHING,
  },
  {
    id: 'preset-clothing-3day',
    names: { en: 'Clothing (3 days)', de: 'Kleidung (3 Tage)', uk: 'Одяг (3 дні)', ru: 'Одежда (3 дня)' },
    volumeLiters: 4,
    category: GearCategory.CLOTHING,
  },
  {
    id: 'preset-stove-pot',
    names: { en: 'Stove + pot', de: 'Kocher + Topf', uk: 'Пальник + казанок', ru: 'Горелка + кастрюля' },
    volumeLiters: 1.5,
    category: GearCategory.COOKING,
  },
  {
    id: 'preset-repair-kit',
    names: { en: 'Bike repair kit', de: 'Reparaturset', uk: 'Ремкомплект', ru: 'Ремкомплект' },
    volumeLiters: 1,
    category: GearCategory.TOOLS,
  },
  {
    id: 'preset-first-aid',
    names: { en: 'First aid kit', de: 'Erste-Hilfe-Set', uk: 'Аптечка', ru: 'Аптечка' },
    volumeLiters: 0.5,
    category: GearCategory.HYGIENE,
  },
  {
    id: 'preset-electronics',
    names: { en: 'Electronics (phone, charger, powerbank)', de: 'Elektronik (Handy, Ladegerät, Powerbank)', uk: 'Електроніка (телефон, зарядка, павербанк)', ru: 'Электроника (телефон, зарядник, павербанк)' },
    volumeLiters: 1,
    category: GearCategory.ELECTRONICS,
  },
  {
    id: 'preset-food-1day',
    names: { en: 'Food (1 day)', de: 'Essen (1 Tag)', uk: 'Їжа (1 день)', ru: 'Еда (1 день)' },
    volumeLiters: 2,
    category: GearCategory.FOOD,
  },
  {
    id: 'preset-water-bottles',
    names: { en: 'Water bottles (2 × 750ml)', de: 'Wasserflaschen (2 × 750ml)', uk: 'Пляшки з водою (2 × 750мл)', ru: 'Бутылки с водой (2 × 750мл)' },
    volumeLiters: 1.5,
    category: GearCategory.WATER,
  },
];
