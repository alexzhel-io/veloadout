import type { SupabaseClient } from '@supabase/supabase-js';
import type { GearListItem, UserGearList } from '@/domain/list/GearListItem';

export class SupabaseGearListRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getOrCreateList(userId: string): Promise<UserGearList> {
    // Get most recent list
    const { data: lists } = await this.supabase
      .from('gear_lists')
      .select('*, gear_list_items(*)')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (lists && lists.length > 0) {
      return this.mapList(lists[0]);
    }

    // Create default list
    const { data: newList } = await this.supabase
      .from('gear_lists')
      .insert({ user_id: userId, name: 'My Gear List' })
      .select('*, gear_list_items(*)')
      .single();

    return this.mapList(newList);
  }

  async saveItems(listId: string, items: Omit<GearListItem, 'id' | 'listId'>[]): Promise<void> {
    // Replace all items
    await this.supabase.from('gear_list_items').delete().eq('list_id', listId);

    if (items.length === 0) return;

    await this.supabase.from('gear_list_items').insert(
      items.map(item => ({
        list_id: listId,
        name: item.name,
        category: item.category,
        volume_liters: item.volumeLiters,
        weight_grams: item.weightGrams ?? null,
        quantity: item.quantity,
        size_label: item.sizeLabel ?? null,
        source: item.source,
        source_url: item.sourceUrl ?? null,
      })),
    );

    await this.supabase
      .from('gear_lists')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', listId);
  }

  private mapList(raw: Record<string, unknown>): UserGearList {
    const items = ((raw.gear_list_items as Record<string, unknown>[]) ?? []).map(i => ({
      id: i.id as string,
      listId: i.list_id as string,
      name: i.name as string,
      category: i.category as string,
      volumeLiters: Number(i.volume_liters),
      weightGrams: i.weight_grams ? Number(i.weight_grams) : undefined,
      quantity: Number(i.quantity),
      sizeLabel: i.size_label as string | undefined,
      source: i.source as GearListItem['source'],
      sourceUrl: i.source_url as string | undefined,
    }));

    return {
      id: raw.id as string,
      userId: raw.user_id as string,
      name: raw.name as string,
      items,
      createdAt: new Date(raw.created_at as string),
      updatedAt: new Date(raw.updated_at as string),
    };
  }
}
