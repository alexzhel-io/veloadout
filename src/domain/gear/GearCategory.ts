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
  [GearCategory.SLEEP]:       { en: 'Sleep', de: 'Schlafen', uk: 'Сон', ru: 'Сон' },
  [GearCategory.SHELTER]:     { en: 'Shelter', de: 'Unterkunft', uk: 'Прихисток', ru: 'Укрытие' },
  [GearCategory.CLOTHING]:    { en: 'Clothing', de: 'Kleidung', uk: 'Одяг', ru: 'Одежда' },
  [GearCategory.COOKING]:     { en: 'Cooking', de: 'Kochen', uk: 'Готування', ru: 'Готовка' },
  [GearCategory.TOOLS]:       { en: 'Tools & Repair', de: 'Werkzeug', uk: 'Інструменти', ru: 'Инструменты' },
  [GearCategory.ELECTRONICS]: { en: 'Electronics', de: 'Elektronik', uk: 'Електроніка', ru: 'Электроника' },
  [GearCategory.NAVIGATION]:  { en: 'Navigation', de: 'Navigation', uk: 'Навігація', ru: 'Навигация' },
  [GearCategory.HYGIENE]:     { en: 'Hygiene', de: 'Hygiene', uk: 'Гігієна', ru: 'Гигиена' },
  [GearCategory.FOOD]:        { en: 'Food', de: 'Essen', uk: 'Харчування', ru: 'Питание' },
  [GearCategory.WATER]:       { en: 'Water', de: 'Wasser', uk: 'Вода', ru: 'Вода' },
  [GearCategory.OTHER]:       { en: 'Other', de: 'Sonstiges', uk: 'Інше', ru: 'Прочее' },
};
