import { describe, expect, it } from 'vitest';
import { computeBagRecommendation, DEFAULT_BAG_CAPACITIES } from '../BagRecommendation';

describe('computeBagRecommendation', () => {
  it('cumulative mode distributes total proportionally to capacities', () => {
    const rec = computeBagRecommendation(
      24,
      { handlebar: 10, frame: 5, seatpack: 15, fork: 6 },
      'cumulative',
    );
    // total capacity 36; total volume 24 → ~67% fill across all bags
    expect(rec.total).toBe(24);
    expect(rec.totalCapacity).toBe(36);
    expect(rec.handlebar.assignedL).toBeCloseTo(6.7, 1);
    expect(rec.frame.assignedL).toBeCloseTo(3.3, 1);
    expect(rec.seatpack.assignedL).toBeCloseTo(10, 1);
    expect(rec.fork.assignedL).toBeCloseTo(4, 1);
    expect(rec.handlebar.overflow).toBe(false);
    expect(rec.fork.overflow).toBe(false);
  });

  it('each mode assigns the full total to every bag (including fork pair)', () => {
    const rec = computeBagRecommendation(
      8,
      { handlebar: 10, frame: 5, seatpack: 15, fork: 6 },
      'each',
    );
    expect(rec.handlebar.assignedL).toBe(8);
    expect(rec.frame.assignedL).toBe(8);
    expect(rec.seatpack.assignedL).toBe(8);
    expect(rec.fork.assignedL).toBe(8);
    expect(rec.frame.overflow).toBe(true);
    expect(rec.fork.overflow).toBe(true);
    expect(rec.handlebar.overflow).toBe(false);
  });

  it('fork slot is flagged as paired', () => {
    const rec = computeBagRecommendation(10, DEFAULT_BAG_CAPACITIES);
    expect(rec.fork.paired).toBe(true);
    expect(rec.handlebar.paired).toBe(false);
    expect(rec.frame.paired).toBe(false);
    expect(rec.seatpack.paired).toBe(false);
  });

  it('cumulative overflow when total volume exceeds total capacity', () => {
    const rec = computeBagRecommendation(50, DEFAULT_BAG_CAPACITIES, 'cumulative');
    // default total capacity = 10 + 6 + 12 + 6 = 34; 50 > 34
    expect(rec.totalCapacity).toBe(34);
    expect(rec.seatpack.overflow).toBe(true);
  });

  it('fillPercent caps at 100', () => {
    const rec = computeBagRecommendation(500, DEFAULT_BAG_CAPACITIES);
    for (const slot of [rec.handlebar, rec.frame, rec.seatpack, rec.fork]) {
      expect(slot.fillPercent).toBeLessThanOrEqual(100);
    }
  });

  it('zero capacity is handled without dividing by zero', () => {
    const rec = computeBagRecommendation(10, { handlebar: 0, frame: 0, seatpack: 0, fork: 0 });
    expect(rec.handlebar.fillPercent).toBe(0);
    expect(rec.totalCapacity).toBe(0);
    // assigned falls back to equal split across 4 slots
    expect(rec.handlebar.assignedL).toBeCloseTo(2.5, 1);
    expect(rec.fork.assignedL).toBeCloseTo(2.5, 1);
  });

  it('localised names available in all four languages', () => {
    const rec = computeBagRecommendation(15, DEFAULT_BAG_CAPACITIES);
    for (const slot of [rec.handlebar, rec.frame, rec.seatpack, rec.fork]) {
      expect(slot.name.en).toBeTruthy();
      expect(slot.name.de).toBeTruthy();
      expect(slot.name.uk).toBeTruthy();
      expect(slot.name.ru).toBeTruthy();
    }
  });
});
