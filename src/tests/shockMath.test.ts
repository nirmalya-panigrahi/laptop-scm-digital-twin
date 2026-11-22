import { describe, expect, it } from 'vitest';
import { LAPTOP_COMPONENTS, SMARTPHONE_COMPONENTS } from '../data/electronicsData';
import {
  buildBomCsv,
  buildForecastTrajectory,
  calculateComponentShock,
  calculateDeviceSummary,
  classifyRiskLevel,
  sanitizeShockValue,
} from '../utils/shockMath';

describe('shockMath utilities — Blue Pill (Happy Path)', () => {
  it('calculates weighted material + freight shock accurately for smartphone SoC', () => {
    const soc = SMARTPHONE_COMPONENTS[0]; // 3nm SoC
    const shocks = {
      'TSMC / Foundry Index': 20,
      'SOX Index': 10,
      'LME Copper': 0,
      'Air & Ocean Freight': 40,
    };

    const result = calculateComponentShock(soc, shocks, {
      isRegionalized: false,
      useSubstitution: false,
    });

    // Material: (20*0.65 + 10*0.20 + 0*0.15) * (9.4/6) = 15 * 1.5666667 = 23.5%
    // Freight: 40 * 0.25 * 1.0 = 10%
    expect(result.materialShockPct).toBeCloseTo(23.5, 2);
    expect(result.logisticsShockPct).toBeCloseTo(10.0, 2);
    expect(result.totalShockPct).toBeCloseTo(33.5, 2);
    expect(result.riskLevel).toBe('Extreme');
    expect(result.shockedCostUsd).toBeGreaterThan(soc.baselineCostUsd);
  });

  it('reduces freight shock by 75% when regionalized sourcing is enabled', () => {
    const bat = LAPTOP_COMPONENTS.find((c) => c.id === 'bat-laptop')!;
    const shocks = {
      'Lithium & Battery Index': 0,
      'LME Copper': 0,
      'LME Aluminum': 0,
      'Air & Ocean Freight': 100,
    };

    const globalRes = calculateComponentShock(bat, shocks, {
      isRegionalized: false,
      useSubstitution: false,
    });
    const regionalRes = calculateComponentShock(bat, shocks, {
      isRegionalized: true,
      useSubstitution: false,
    });

    expect(globalRes.logisticsShockPct).toBeCloseTo(80, 2);
    expect(regionalRes.logisticsShockPct).toBeCloseTo(20, 2);
  });

  it('applies engineering substitution baseline cost and material weights', () => {
    const oled = LAPTOP_COMPONENTS.find((c) => c.id === 'oled-laptop')!;
    const shocks = { 'Display Panel Index': 50 };

    const baseRes = calculateComponentShock(oled, shocks, {
      isRegionalized: false,
      useSubstitution: false,
    });
    const subRes = calculateComponentShock(oled, shocks, {
      isRegionalized: false,
      useSubstitution: true,
    });

    expect(subRes.baselineCostUsd).toBe(oled.substitution!.baselineCostUsd);
    expect(subRes.shockedCostUsd).toBeLessThan(baseRes.shockedCostUsd);
  });

  it('aggregates full-device BOM summary and identifies top driver', () => {
    const shocks = {
      'DRAM/NAND Spot Index': 90,
      'TSMC / Foundry Index': 5,
    };

    const summary = calculateDeviceSummary('smartphone', SMARTPHONE_COMPONENTS, shocks, {
      isRegionalized: false,
      substitutedComponentIds: new Set(),
    });

    expect(summary.totalShockedUsd).toBeGreaterThan(summary.totalBaselineUsd);
    expect(summary.topDriverComponentId).toBe('mem-phone');
    expect(summary.topDriverDeltaUsd).toBeGreaterThan(40);
  });

  it('generates 5-point forecast trajectory from T+0 to T+6', () => {
    const pts = buildForecastTrajectory(20);
    expect(pts).toHaveLength(5);
    expect(pts[0].shock).toBe(0);
    expect(pts[3].shock).toBe(20);
    expect(pts[4].shock).toBeCloseTo(15.6, 2);
  });
});

describe('shockMath utilities — Red Pill (Adversarial & Edge Cases)', () => {
  it('sanitizes NaN, Infinity, and out-of-bounds shock inputs safely', () => {
    expect(sanitizeShockValue(Number.NaN)).toBe(0);
    expect(sanitizeShockValue(Number.POSITIVE_INFINITY)).toBe(0);
    expect(sanitizeShockValue(-9999)).toBe(-50);
    expect(sanitizeShockValue(5000)).toBe(200);
    expect(sanitizeShockValue(12.37)).toBe(12.5);
  });

  it('handles empty component arrays without division-by-zero', () => {
    const summary = calculateDeviceSummary('laptop', [], { 'SOX Index': 50 }, {
      isRegionalized: false,
      substitutedComponentIds: new Set(),
    });
    expect(summary.totalBaselineUsd).toBe(0);
    expect(summary.weightedShockPct).toBe(0);
    expect(summary.topDriverComponentName).toBe('None');
  });

  it('handles missing index entries and extreme negative shocks gracefully', () => {
    const chassis = SMARTPHONE_COMPONENTS.find((c) => c.id === 'chassis-phone')!;
    const res = calculateComponentShock(
      chassis,
      { 'Rare Earth Index': -500, 'LME Aluminum': -500 },
      { isRegionalized: true, useSubstitution: false }
    );
    expect(res.shockedCostUsd).toBeGreaterThanOrEqual(0);
    expect(res.totalShockPct).toBeGreaterThanOrEqual(-60);
    expect(classifyRiskLevel(res.totalShockPct, true)).toBe('Minimal');
  });

  it('neutralizes CSV formula injection in exported BOM rows', () => {
    const maliciousComp = {
      ...SMARTPHONE_COMPONENTS[0],
      supplier: '=CMD("calc")',
    };
    const csv = buildBomCsv([maliciousComp], {}, {
      isRegionalized: false,
      substitutedComponentIds: new Set(),
    });
    expect(csv).toContain("'=CMD");
    expect(csv).not.toContain(',=CMD');
  });
});
