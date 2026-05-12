export enum GearCategory {
  SLEEP = 'sleep',
  SHELTER = 'shelter',
  CLOTHING = 'clothing',
  COOKING = 'cooking',
  TOOLS = 'tools',
  ELECTRONICS = 'electronics',
  NAVIGATION = 'navigation',
  HYGIENE = 'hygiene',
  FOOD = 'food',
  WATER = 'water',
  OTHER = 'other',
}

export const CATEGORY_LABELS: Record<GearCategory, Record<string, string>> = {
  [GearCategory.SLEEP]:       { en: 'Sleep', de: 'Schlafen', ru: 'Сон' },
  [GearCategory.SHELTER]:     { en: 'Shelter', de: 'Unterkunft', ru: 'Укрытие' },
  [GearCategory.CLOTHING]:    { en: 'Clothing', de: 'Kleidung', ru: 'Одежда' },
  [GearCategory.COOKING]:     { en: 'Cooking', de: 'Kochen', ru: 'Готовка' },
  [GearCategory.TOOLS]:       { en: 'Tools & Repair', de: 'Werkzeug', ru: 'Инструменты' },
  [GearCategory.ELECTRONICS]: { en: 'Electronics', de: 'Elektronik', ru: 'Электроника' },
  [GearCategory.NAVIGATION]:  { en: 'Navigation', de: 'Navigation', ru: 'Навигация' },
  [GearCategory.HYGIENE]:     { en: 'Hygiene', de: 'Hygiene', ru: 'Гигиена' },
  [GearCategory.FOOD]:        { en: 'Food', de: 'Essen', ru: 'Питание' },
  [GearCategory.WATER]:       { en: 'Water', de: 'Wasser', ru: 'Вода' },
  [GearCategory.OTHER]:       { en: 'Other', de: 'Sonstiges', ru: 'Прочее' },
};
