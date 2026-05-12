export interface BagSlot {
  name: Record<string, string>;
  typicalRangeL: [number, number];
  recommendedL: number;
  fillPercent: number;
}

export interface BagRecommendation {
  handlebar: BagSlot;
  frame: BagSlot;
  seatpack: BagSlot;
  total: number;
}

const SLOT_RANGES: Record<keyof Omit<BagRecommendation, 'total'>, { range: [number, number]; names: Record<string, string> }> = {
  handlebar: {
    range: [5, 15],
    names: { en: 'Handlebar Bag', de: 'Lenkertasche', ru: 'Сумка на руль' },
  },
  frame:  {
    range: [3, 12],
    names: { en: 'Frame Bag', de: 'Rahmentasche', ru: 'Сумка в раму' },
  },
  seatpack: {
    range: [6, 16],
    names: { en: 'Seat Pack', de: 'Satteltasche', ru: 'Подседельная сумка' },
  },
};

export function computeBagRecommendation(totalL: number): BagRecommendation {
  const splits = { handlebar: 0.35, frame: 0.25, seatpack: 0.40 };
  const slots = {} as Record<keyof typeof splits, BagSlot>;

  for (const [key, ratio] of Object.entries(splits) as [keyof typeof splits, number][]) {
    const { range, names } = SLOT_RANGES[key];
    const raw = totalL * ratio;
    const clamped = Math.min(Math.max(raw, range[0]), range[1]);
    slots[key] = {
      name: names,
      typicalRangeL: range,
      recommendedL: Math.round(clamped * 10) / 10,
      fillPercent: Math.min(Math.round((raw / range[1]) * 100), 100),
    };
  }

  return { ...slots, total: totalL };
}
