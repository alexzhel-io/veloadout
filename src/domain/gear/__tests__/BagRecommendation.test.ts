import { describe, expect, it } from 'vitest';
import { computeBagRecommendation, DEFAULT_BAG_CAPACITIES } from '../BagRecommendation';

describe('computeBagRecommendation', () => {
  it('cumulative mode distributes total proportionally to capacities', () => {
    const rec = computeBagRecommendation(20, { handlebar: 10, frame: 5, seatpack: 15 }, 'cumulative');
    // total capacity 30; total volume 20 → ~67% fill across all bags
    expect(rec.total).toBe(20);
    expect(rec.totalCapacity).toBe(30);
    expect(rec.handlebar.assignedL).toBeCloseTo(6.7, 1);
    expect(rec.frame.assignedL).toBeCloseTo(3.3, 1);
    expect(rec.seatpack.assignedL).toBeCloseTo(10, 1);
    expect(rec.handlebar.overflow).toBe(false);
    expect(rec.seatpack.overflow).toBe(false);
  });

  it('each mode assigns the full total to every bag', () => {
    const rec = computeBagRecommendation(8, { handlebar: 10, frame: 5, seatpack: 15 }, 'each');
    expect(rec.handlebar.assignedL).toBe(8);
    expect(rec.frame.assignedL).toBe(8);
    expect(rec.seatpack.assignedL).toBe(8);
    // frame is too small (8L > 5L) → overflow flag
    expect(rec.frame.overflow).toBe(true);
    expect(rec.handlebar.overflow).toBe(false);
  });

  it('cumulative overflow when total volume exceeds total capacity', () => {
    const rec = computeBagRecommendation(50, DEFAULT_BAG_CAPACITIES, 'cumulative');
    // default total capacity = 10 + 6 + 12 = 28; 50 > 28
    expect(rec.totalCapacity).toBe(28);
    expect(rec.seatpack.overflow).toBe(true);
  });

  it('fillPercent caps at 100', () => {
    const rec = computeBagRecommendation(500, DEFAULT_BAG_CAPACITIES);
    for (const slot of [rec.handlebar, rec.frame, rec.seatpack]) {
      expect(slot.fillPercent).toBeLessThanOrEqual(100);
    }
  });

  it('zero capacity is handled without dividing by zero', () => {
    const rec = computeBagRecommendation(10, { handlebar: 0, frame: 0, seatpack: 0 });
    expect(rec.handlebar.fillPercent).toBe(0);
    expect(rec.totalCapacity).toBe(0);
    // assigned falls back to equal split
    expect(rec.handlebar.assignedL).toBeCloseTo(3.3, 1);
  });

  it('localised names available in all four languages', () => {
    const rec = computeBagRecommendation(15, DEFAULT_BAG_CAPACITIES);
    for (const slot of [rec.handlebar, rec.frame, rec.seatpack]) {
      expect(slot.name.en).toBeTruthy();
      expect(slot.name.de).toBeTruthy();
      expect(slot.name.uk).toBeTruthy();
      expect(slot.name.ru).toBeTruthy();
    }
  });
});
