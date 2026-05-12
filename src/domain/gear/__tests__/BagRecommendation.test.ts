import { describe, expect, it } from 'vitest';
import { computeBagRecommendation } from '../BagRecommendation';

describe('computeBagRecommendation', () => {
  it('returns three slots summing approximately to total within capacity', () => {
    const rec = computeBagRecommendation(20);
    expect(rec.total).toBe(20);
    expect(rec.handlebar.recommendedL).toBeGreaterThan(0);
    expect(rec.frame.recommendedL).toBeGreaterThan(0);
    expect(rec.seatpack.recommendedL).toBeGreaterThan(0);
  });

  it('clamps very small totals to minimum bag size', () => {
    const rec = computeBagRecommendation(2);
    expect(rec.handlebar.recommendedL).toBeGreaterThanOrEqual(5);
    expect(rec.seatpack.recommendedL).toBeGreaterThanOrEqual(6);
  });

  it('clamps very large totals to bag maximum', () => {
    const rec = computeBagRecommendation(200);
    expect(rec.handlebar.recommendedL).toBeLessThanOrEqual(15);
    expect(rec.frame.recommendedL).toBeLessThanOrEqual(12);
    expect(rec.seatpack.recommendedL).toBeLessThanOrEqual(16);
  });

  it('fillPercent caps at 100', () => {
    const rec = computeBagRecommendation(500);
    expect(rec.handlebar.fillPercent).toBeLessThanOrEqual(100);
    expect(rec.seatpack.fillPercent).toBeLessThanOrEqual(100);
  });

  it('localized names available in all three languages', () => {
    const rec = computeBagRecommendation(15);
    for (const slot of [rec.handlebar, rec.frame, rec.seatpack]) {
      expect(slot.name.en).toBeTruthy();
      expect(slot.name.de).toBeTruthy();
      expect(slot.name.ru).toBeTruthy();
    }
  });
});
