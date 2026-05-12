import { describe, expect, it } from 'vitest';
import { averageVariant, matchVariantByQuery, GearVariant } from '../GearVariant';

describe('averageVariant', () => {
  it('returns zero for empty variants', () => {
    expect(averageVariant([])).toEqual({ volumeLiters: 0 });
  });

  it('averages volume and weight rounded to 1 decimal / int', () => {
    const variants: GearVariant[] = [
      { sizeLabel: 'Regular', volumeLiters: 2.0, weightGrams: 400 },
      { sizeLabel: 'Long', volumeLiters: 3.0, weightGrams: 600 },
    ];
    expect(averageVariant(variants)).toEqual({ volumeLiters: 2.5, weightGrams: 500 });
  });

  it('omits weight when no variant has it', () => {
    const variants: GearVariant[] = [{ sizeLabel: 'Regular', volumeLiters: 1 }];
    expect(averageVariant(variants).weightGrams).toBeUndefined();
  });
});

describe('matchVariantByQuery', () => {
  const variants: GearVariant[] = [
    { sizeLabel: 'Regular', volumeLiters: 2.5 },
    { sizeLabel: 'Large Wide', volumeLiters: 4 },
  ];

  it('matches by direct size label', () => {
    expect(matchVariantByQuery(variants, 'NeoAir Regular')?.sizeLabel).toBe('Regular');
  });

  it('matches by alias', () => {
    expect(matchVariantByQuery(variants, 'NeoAir large')?.sizeLabel).toBe('Large Wide');
  });

  it('returns null when no match', () => {
    expect(matchVariantByQuery(variants, 'unrelated query')).toBeNull();
  });
});
