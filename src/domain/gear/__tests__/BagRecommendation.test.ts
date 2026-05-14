import { describe, expect, it } from 'vitest';
import {
  computeBagRecommendation,
  DEFAULT_BAG_CAPACITIES,
  DEFAULT_BAG_ACTIVE,
  type BagActive,
} from '../BagRecommendation';

const ALL_ACTIVE: BagActive = { handlebar: true, frame: true, seatpack: true, fork: true, panniers: true };

describe('computeBagRecommendation', () => {
  it('paired fork and panniers capacities are doubled internally', () => {
    const rec = computeBagRecommendation(
      0,
      { handlebar: 10, frame: 5, seatpack: 15, fork: 3, panniers: 12 },
      ALL_ACTIVE,
      'cumulative',
    );
    expect(rec.fork.capacityPerBagL).toBe(3);
    expect(rec.fork.capacityL).toBe(6);
    expect(rec.panniers.capacityPerBagL).toBe(12);
    expect(rec.panniers.capacityL).toBe(24);
    expect(rec.panniers.paired).toBe(true);
    expect(rec.totalCapacity).toBe(10 + 5 + 15 + 6 + 24);
  });

  it('cumulative mode distributes total proportionally to effective capacities (panniers off)', () => {
    const rec = computeBagRecommendation(
      24,
      { handlebar: 10, frame: 5, seatpack: 15, fork: 3, panniers: 15 },
      { handlebar: true, frame: true, seatpack: true, fork: true, panniers: false },
      'cumulative',
    );
    // Effective: 10, 5, 15, 6 → total 36 (panniers off, doesn't count)
    expect(rec.total).toBe(24);
    expect(rec.totalCapacity).toBe(36);
    expect(rec.handlebar.assignedL).toBeCloseTo(6.7, 1);
    expect(rec.frame.assignedL).toBeCloseTo(3.3, 1);
    expect(rec.seatpack.assignedL).toBeCloseTo(10, 1);
    expect(rec.fork.assignedL).toBeCloseTo(4, 1);
    expect(rec.panniers.assignedL).toBe(0);
    expect(rec.panniers.active).toBe(false);
  });

  it('inactive slot contributes zero capacity and receives zero volume', () => {
    const rec = computeBagRecommendation(
      20,
      { handlebar: 10, frame: 5, seatpack: 15, fork: 3, panniers: 15 },
      { handlebar: true, frame: false, seatpack: true, fork: false, panniers: false },
      'cumulative',
    );
    // Effective total = 10 + 15 = 25; frame + fork count as 0
    expect(rec.totalCapacity).toBe(25);
    expect(rec.frame.assignedL).toBe(0);
    expect(rec.fork.assignedL).toBe(0);
    expect(rec.frame.active).toBe(false);
    expect(rec.fork.active).toBe(false);
    // handlebar: 10/25 * 20 = 8
    expect(rec.handlebar.assignedL).toBeCloseTo(8, 1);
    expect(rec.seatpack.assignedL).toBeCloseTo(12, 1);
  });

  it('inactive slot in "each" mode also gets zero', () => {
    const rec = computeBagRecommendation(
      10,
      DEFAULT_BAG_CAPACITIES,
      { handlebar: true, frame: true, seatpack: true, fork: false, panniers: false },
      'each',
    );
    expect(rec.handlebar.assignedL).toBe(10);
    expect(rec.frame.assignedL).toBe(10);
    expect(rec.seatpack.assignedL).toBe(10);
    expect(rec.fork.assignedL).toBe(0);
    expect(rec.panniers.assignedL).toBe(0);
  });

  it('fork and panniers are flagged as paired', () => {
    const rec = computeBagRecommendation(10, DEFAULT_BAG_CAPACITIES, ALL_ACTIVE);
    expect(rec.fork.paired).toBe(true);
    expect(rec.panniers.paired).toBe(true);
    expect(rec.handlebar.paired).toBe(false);
    expect(rec.frame.paired).toBe(false);
    expect(rec.seatpack.paired).toBe(false);
  });

  it('fillPercent caps at 100', () => {
    const rec = computeBagRecommendation(500, DEFAULT_BAG_CAPACITIES, ALL_ACTIVE);
    for (const slot of [rec.handlebar, rec.frame, rec.seatpack, rec.fork, rec.panniers]) {
      expect(slot.fillPercent).toBeLessThanOrEqual(100);
    }
  });

  it('zero capacity is handled without dividing by zero', () => {
    const rec = computeBagRecommendation(
      10,
      { handlebar: 0, frame: 0, seatpack: 0, fork: 0, panniers: 0 },
      ALL_ACTIVE,
    );
    expect(rec.handlebar.fillPercent).toBe(0);
    expect(rec.totalCapacity).toBe(0);
    // 5 active slots → 10 / 5 = 2.0
    expect(rec.handlebar.assignedL).toBeCloseTo(2.0, 1);
  });

  it('localised names available in all four languages', () => {
    const rec = computeBagRecommendation(15, DEFAULT_BAG_CAPACITIES, ALL_ACTIVE);
    for (const slot of [rec.handlebar, rec.frame, rec.seatpack, rec.fork, rec.panniers]) {
      expect(slot.name.en).toBeTruthy();
      expect(slot.name.de).toBeTruthy();
      expect(slot.name.uk).toBeTruthy();
      expect(slot.name.ru).toBeTruthy();
    }
  });

  it('DEFAULT_BAG_ACTIVE turns fork and panniers off by default', () => {
    expect(DEFAULT_BAG_ACTIVE.fork).toBe(false);
    expect(DEFAULT_BAG_ACTIVE.panniers).toBe(false);
    expect(DEFAULT_BAG_ACTIVE.handlebar).toBe(true);
  });
});
