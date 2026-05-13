export type BagSlotKey = 'handlebar' | 'frame' | 'seatpack' | 'fork';
export type BagDistributionMode = 'cumulative' | 'each';

export interface BagSlot {
  key: BagSlotKey;
  name: Record<string, string>;
  typicalRangeL: [number, number];
  capacityL: number;        // user-set capacity of the bag they own (sum of pair, for fork)
  assignedL: number;        // how much volume is assigned to this bag under current mode
  fillPercent: number;      // assignedL / capacityL (capped at 100 for the bar; overflow flagged separately)
  overflow: boolean;        // assignedL > capacityL
  paired: boolean;          // true for fork (visually represented as a pair, one shared capacity)
}

export interface BagRecommendation {
  handlebar: BagSlot;
  frame: BagSlot;
  seatpack: BagSlot;
  fork: BagSlot;
  total: number;            // total gear volume
  totalCapacity: number;    // sum of bag capacities
  mode: BagDistributionMode;
}

export const SLOT_RANGES: Record<BagSlotKey, { range: [number, number]; defaultCapacity: number; paired: boolean; names: Record<string, string> }> = {
  handlebar: {
    range: [5, 15],
    defaultCapacity: 10,
    paired: false,
    names: { en: 'Handlebar Bag', de: 'Lenkertasche', uk: 'Кермова сумка', ru: 'Сумка на руль' },
  },
  frame: {
    range: [3, 12],
    defaultCapacity: 6,
    paired: false,
    names: { en: 'Frame Bag', de: 'Rahmentasche', uk: 'Рамна сумка', ru: 'Сумка в раму' },
  },
  seatpack: {
    range: [6, 16],
    defaultCapacity: 12,
    paired: false,
    names: { en: 'Seat Pack', de: 'Satteltasche', uk: 'Підсідельна сумка', ru: 'Подседельная сумка' },
  },
  fork: {
    // Sum of the pair. Typical single fork bag ~3–4L → pair 4–16L.
    range: [4, 16],
    defaultCapacity: 6,
    paired: true,
    names: { en: 'Fork Bags', de: 'Gabel­taschen', uk: 'Сумки на вилку', ru: 'Сумки на вилку' },
  },
};

export interface BagCapacities {
  handlebar: number;
  frame: number;
  seatpack: number;
  fork: number;
}

export const DEFAULT_BAG_CAPACITIES: BagCapacities = {
  handlebar: SLOT_RANGES.handlebar.defaultCapacity,
  frame: SLOT_RANGES.frame.defaultCapacity,
  seatpack: SLOT_RANGES.seatpack.defaultCapacity,
  fork: SLOT_RANGES.fork.defaultCapacity,
};

/**
 * Compute a per-bag breakdown of how the rider's total gear volume maps
 * to their bags. Two modes:
 *
 * - **cumulative** (default): the total volume is distributed across
 *   bags proportionally to each bag's capacity. Models the realistic
 *   "I'm packing everything across all my bags" case.
 *
 * - **each**: every bag is shown as if it had to carry the whole load
 *   alone. Useful for stress-testing — "would my seat pack alone fit
 *   this trip?" Overflow is flagged on bars exceeding 100% capacity.
 */
export function computeBagRecommendation(
  totalL: number,
  capacities: BagCapacities,
  mode: BagDistributionMode = 'cumulative',
): BagRecommendation {
  const slotKeys: BagSlotKey[] = ['handlebar', 'frame', 'seatpack', 'fork'];
  const totalCapacity = slotKeys.reduce((s, k) => s + Math.max(0, capacities[k]), 0);

  function slot(key: BagSlotKey): BagSlot {
    const meta = SLOT_RANGES[key];
    const capacityL = Math.max(0, capacities[key]);

    let assignedL: number;
    if (mode === 'each') {
      assignedL = totalL;
    } else {
      // Distribute proportionally to capacity. Fall back to equal split
      // if all capacities are zero (edge case).
      assignedL = totalCapacity > 0
        ? Math.round((totalL * (capacityL / totalCapacity)) * 10) / 10
        : Math.round((totalL / slotKeys.length) * 10) / 10;
    }

    const overflow = capacityL > 0 && assignedL > capacityL;
    const fillPercent = capacityL > 0
      ? Math.min(Math.round((assignedL / capacityL) * 100), 100)
      : 0;

    return {
      key,
      name: meta.names,
      typicalRangeL: meta.range,
      capacityL,
      assignedL,
      fillPercent,
      overflow,
      paired: meta.paired,
    };
  }

  return {
    handlebar: slot('handlebar'),
    frame: slot('frame'),
    seatpack: slot('seatpack'),
    fork: slot('fork'),
    total: totalL,
    totalCapacity,
    mode,
  };
}
