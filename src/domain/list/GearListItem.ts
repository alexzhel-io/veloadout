export interface GearListItem {
  id: string;
  listId: string;
  name: string;
  category: string;
  volumeLiters: number;
  weightGrams?: number;
  quantity: number;
  sizeLabel?: string;
  source: 'db' | 'ai' | 'preset' | 'manual';
  sourceUrl?: string;
}

export interface UserGearList {
  id: string;
  userId: string;
  name: string;
  items: GearListItem[];
  createdAt: Date;
  updatedAt: Date;
}
