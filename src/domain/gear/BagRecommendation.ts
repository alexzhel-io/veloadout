export type BagSlotKey = 'handlebar' | 'frame' | 'seatpack' | 'fork' | 'panniers';
export type BagDistributionMode = 'cumulative' | 'each';

export interface BagSlot {
  key: BagSlotKey;
  name: Record<string, string>;
  typicalRangeL: [number, number];
  capacityPerBagL: number;  // value the user entered (per single bag — for fork this is one of the pair)
  capacityL: number;        // effective capacity used in distribution math (per × multiplier)
  assignedL: number;        // how much volume is assigned to this bag under current mode
  fillPercent: number;      // assignedL / capacityL (capped at 100; overflow flagged separately)
  overflow: boolean;        // assignedL > capacityL
  paired: boolean;          // true for fork (rendered with ×2 badge)
  active: boolean;          // user has the bag and wants it included in calculations
}

export interface BagRecommendation {
  handlebar: BagSlot;
  frame: BagSlot;
  seatpack: BagSlot;
  fork: BagSlot;
  panniers: BagSlot;
  total: number;            // total gear volume
  totalCapacity: number;    // sum of bag capacities
  mode: BagDistributionMode;
}

export const SLOT_RANGES: Record<BagSlotKey, {
  range: [number, number];
  defaultCapacity: number;
  paired: boolean;
  multiplier: number;
  names: Record<string, string>;
}> = {
  handlebar: {
    range: [5, 15],
    defaultCapacity: 10,
    paired: false,
    multiplier: 1,
    names: { en: 'Handlebar Bag', de: 'Lenkertasche', uk: 'Кермова сумка', ru: 'Сумка на руль' },
  },
  frame: {
    range: [3, 12],
    defaultCapacity: 6,
    paired: false,
    multiplier: 1,
    names: { en: 'Frame Bag', de: 'Rahmentasche', uk: 'Рамна сумка', ru: 'Сумка в раму' },
  },
  seatpack: {
    range: [6, 16],
    defaultCapacity: 12,
    paired: false,
    multiplier: 1,
    names: { en: 'Seat Pack', de: 'Satteltasche', uk: 'Підсідельна сумка', ru: 'Подседельная сумка' },
  },
  fork: {
    // Per-bag capacity. Typical single fork bag is 3–4L → effective pair 6–8L.
    range: [2, 8],
    defaultCapacity: 3,
    paired: true,
    multiplier: 2,
    names: { en: 'Fork Bags', de: 'Gabel­taschen', uk: 'Сумки на вилку', ru: 'Сумки на вилку' },
  },
  panniers: {
    // Per-bag rear-rack panniers. Typical single 10–20L → effective pair 20–40L.
    range: [8, 25],
    defaultCapacity: 15,
    paired: true,
    multiplier: 2,
    names: { en: 'Panniers', de: 'Packtaschen', uk: 'Велобаули', ru: 'Велобаулы' },
  },
};

export interface BagCapacities {
  handlebar: number;
  frame: number;
  seatpack: number;
  fork: number;
  panniers: number;
}

export const DEFAULT_BAG_CAPACITIES: BagCapacities = {
  handlebar: SLOT_RANGES.handlebar.defaultCapacity,
  frame: SLOT_RANGES.frame.defaultCapacity,
  seatpack: SLOT_RANGES.seatpack.defaultCapacity,
  fork: SLOT_RANGES.fork.defaultCapacity,
  panniers: SLOT_RANGES.panniers.defaultCapacity,
};

export interface BagActive {
  handlebar: boolean;
  frame: boolean;
  seatpack: boolean;
  fork: boolean;
  panniers: boolean;
}

export const DEFAULT_BAG_ACTIVE: BagActive = {
  handlebar: true,
  frame: true,
  seatpack: true,
  fork: false,      // fork bags are less common; default off so users opt-in
  panniers: false,  // panniers belong to touring rigs more than bikepacking — opt-in too
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
/**
 * `capacities` is what the user typed for each slot. For paired slots
 * (fork) that's the size of ONE bag; the multiplier in SLOT_RANGES
 * scales it into an effective total. Inactive slots contribute zero to
 * total capacity and receive zero assigned volume — they're displayed
 * greyed-out as "disabled".
 */
export function computeBagRecommendation(
  totalL: number,
  capacities: BagCapacities,
  active: BagActive,
  mode: BagDistributionMode = 'cumulative',
): BagRecommendation {
  const slotKeys: BagSlotKey[] = ['handlebar', 'frame', 'seatpack', 'fork', 'panniers'];

  // Effective capacity per slot — paired bags counted ×2; inactive slots count as 0.
  const effectiveCapacities: Record<BagSlotKey, number> = {
    handlebar: 0, frame: 0, seatpack: 0, fork: 0, panniers: 0,
  };
  for (const k of slotKeys) {
    if (!active[k]) continue;
    const meta = SLOT_RANGES[k];
    effectiveCapacities[k] = Math.max(0, capacities[k]) * meta.multiplier;
  }

  const totalCapacity = slotKeys.reduce((s, k) => s + effectiveCapacities[k], 0);
  const activeCount = slotKeys.filter(k => active[k]).length;

  function slot(key: BagSlotKey): BagSlot {
    const meta = SLOT_RANGES[key];
    const isActive = active[key];
    const capacityPerBagL = Math.max(0, capacities[key]);
    const capacityL = effectiveCapacities[key];

    let assignedL: number;
    if (!isActive) {
      assignedL = 0;
    } else if (mode === 'each') {
      assignedL = totalL;
    } else if (totalCapacity > 0) {
      // Distribute proportionally to (effective) capacity.
      assignedL = Math.round((totalL * (capacityL / totalCapacity)) * 10) / 10;
    } else {
      // All active slots have zero capacity — fall back to equal split.
      assignedL = activeCount > 0
        ? Math.round((totalL / activeCount) * 10) / 10
        : 0;
    }

    const overflow = isActive && capacityL > 0 && assignedL > capacityL;
    const fillPercent = capacityL > 0
      ? Math.min(Math.round((assignedL / capacityL) * 100), 100)
      : 0;

    return {
      key,
      name: meta.names,
      typicalRangeL: meta.range,
      capacityPerBagL,
      capacityL,
      assignedL,
      fillPercent,
      overflow,
      paired: meta.paired,
      active: isActive,
    };
  }

  return {
    handlebar: slot('handlebar'),
    frame: slot('frame'),
    seatpack: slot('seatpack'),
    fork: slot('fork'),
    panniers: slot('panniers'),
    total: totalL,
    totalCapacity,
    mode,
  };
}
