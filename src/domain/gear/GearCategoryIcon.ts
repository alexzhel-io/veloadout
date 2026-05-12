import { GearCategory } from './GearCategory';

export const CATEGORY_ICONS: Record<GearCategory, string> = {
  [GearCategory.SLEEP]:       '🛏️',
  [GearCategory.SHELTER]:     '🏕️',
  [GearCategory.CLOTHING]:    '👕',
  [GearCategory.COOKING]:     '🍳',
  [GearCategory.TOOLS]:       '🔧',
  [GearCategory.ELECTRONICS]: '🔋',
  [GearCategory.NAVIGATION]:  '🧭',
  [GearCategory.HYGIENE]:     '🧴',
  [GearCategory.FOOD]:        '🥾',
  [GearCategory.WATER]:       '💧',
  [GearCategory.OTHER]:       '📦',
};

export function categoryIcon(category: string): string {
  return CATEGORY_ICONS[category as GearCategory] ?? '📦';
}
