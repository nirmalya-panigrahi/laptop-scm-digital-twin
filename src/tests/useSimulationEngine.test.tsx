import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSimulationEngine } from '../hooks/useSimulationEngine';

describe('useSimulationEngine hook', () => {
  it('initializes with smartphone baseline and switches to laptop cleanly (Blue Pill)', () => {
    const { result } = renderHook(() => useSimulationEngine());

    expect(result.current.deviceType).toBe('smartphone');
    expect(result.current.components).toHaveLength(7);
    expect(result.current.selectedComponentId).toBe('soc-phone');

    act(() => {
      result.current.setDeviceType('laptop');
    });

    expect(result.current.deviceType).toBe('laptop');
    expect(result.current.selectedComponentId).toBe('soc-laptop');
    expect(result.current.deviceSummary.totalBaselineUsd).toBeGreaterThan(900);
  });

  it('applies scenario presets, regionalization, and substitution toggles', () => {
    const { result } = renderHook(() => useSimulationEngine());

    act(() => {
      result.current.applyPreset('memory-squeeze');
    });
    expect(result.current.activePresetId).toBe('memory-squeeze');
    expect(result.current.shocks['DRAM/NAND Spot Index']).toBe(95);

    const beforeSubCost = result.current.componentShock.baselineCostUsd;
    act(() => {
      result.current.toggleSubstitution();
    });
    expect(result.current.useSubstitution).toBe(true);
    expect(result.current.componentShock.baselineCostUsd).not.toBe(beforeSubCost);

    act(() => {
      result.current.toggleRegionalized();
    });
    expect(result.current.isRegionalized).toBe(true);
  });

  it('ignores unknown preset IDs and sanitizes invalid slider values (Red Pill)', () => {
    const { result } = renderHook(() => useSimulationEngine());
    const initialPreset = result.current.activePresetId;

    act(() => {
      result.current.applyPreset('non-existent-preset-id');
    });
    expect(result.current.activePresetId).toBe(initialPreset);

    act(() => {
      result.current.updateShock('SOX Index', Number.NaN);
    });
    expect(result.current.shocks['SOX Index']).toBe(0);

    act(() => {
      result.current.updateShock('SOX Index', 9999);
    });
    expect(result.current.shocks['SOX Index']).toBe(200);
  });
});
