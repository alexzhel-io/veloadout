export interface GearVariant {
  sizeLabel: string;
  volumeLiters: number;
  weightGrams?: number;
}

export function averageVariant(variants: GearVariant[]): { volumeLiters: number; weightGrams?: number } {
  if (variants.length === 0) return { volumeLiters: 0 };
  const vol = variants.reduce((s, v) => s + v.volumeLiters, 0) / variants.length;
  const weights = variants.filter(v => v.weightGrams != null).map(v => v.weightGrams!);
  const wgt = weights.length > 0 ? weights.reduce((s, w) => s + w, 0) / weights.length : undefined;
  return { volumeLiters: Math.round(vol * 10) / 10, weightGrams: wgt ? Math.round(wgt) : undefined };
}

export function matchVariantByQuery(variants: GearVariant[], query: string): GearVariant | null {
  const q = query.toLowerCase();
  // try to find a size keyword in the query
  for (const v of variants) {
    if (q.includes(v.sizeLabel.toLowerCase())) return v;
  }
  // common size aliases
  const aliases: Record<string, string[]> = {
    regular: ['regular', ' r ', ' r,', 'reg'],
    large:   ['large', ' l ', ' l,', 'largo'],
    small:   ['small', ' s ', ' s,', 'sm'],
    xlarge:  ['xlarge', 'xl ', 'x-large', 'extra large'],
    wide:    ['wide', ' w '],
  };
  for (const [key, words] of Object.entries(aliases)) {
    if (words.some(w => q.includes(w))) {
      const match = variants.find(v => v.sizeLabel.toLowerCase().includes(key));
      if (match) return match;
    }
  }
  return null;
}
