import { useCallback, useMemo, useState } from 'react';
import {
  ALL_COMPONENTS,
  DEVICE_CATALOG,
  HISTORICAL_DRIFT,
  MARKET_INDICES,
  SHOCK_SCENARIO_PRESETS,
} from '../data/electronicsData';
import { DeviceType } from '../types/scm';
import {
  buildForecastTrajectory,
  calculateComponentShock,
  calculateDeviceSummary,
  resolveEffectiveComponent,
  sanitizeShockValue,
} from '../utils/shockMath';

function getInitialBaselineShocks(): Record<string, number> {
  return { ...SHOCK_SCENARIO_PRESETS[0].shocks };
}

export function useSimulationEngine() {
  const [deviceType, setDeviceTypeState] = useState<DeviceType>('smartphone');
  const [selectedComponentId, setSelectedComponentId] = useState<string>(
    ALL_COMPONENTS.smartphone[0].id
  );
  const [shocks, setShocks] = useState<Record<string, number>>(getInitialBaselineShocks);
  const [activePresetId, setActivePresetId] = useState<string>('baseline');
  const [isRegionalized, setIsRegionalized] = useState<boolean>(false);
  const [substitutedIds, setSubstitutedIds] = useState<Set<string>>(() => new Set());
  const [isTransitioningDevice, setIsTransitioningDevice] = useState<boolean>(false);

  const components = useMemo(() => ALL_COMPONENTS[deviceType], [deviceType]);
  const deviceMeta = useMemo(() => DEVICE_CATALOG[deviceType], [deviceType]);

  const selectedBaseComponent = useMemo(
    () => components.find((c) => c.id === selectedComponentId) ?? components[0],
    [components, selectedComponentId]
  );

  const useSubstitution = substitutedIds.has(selectedBaseComponent.id);

  const activeComponent = useMemo(
    () => resolveEffectiveComponent(selectedBaseComponent, useSubstitution),
    [selectedBaseComponent, useSubstitution]
  );

  const componentShock = useMemo(
    () =>
      calculateComponentShock(selectedBaseComponent, shocks, {
        isRegionalized,
        useSubstitution,
      }),
    [selectedBaseComponent, shocks, isRegionalized, useSubstitution]
  );

  const deviceSummary = useMemo(
    () =>
      calculateDeviceSummary(deviceType, components, shocks, {
        isRegionalized,
        substitutedComponentIds: substitutedIds,
      }),
    [deviceType, components, shocks, isRegionalized, substitutedIds]
  );

  const forecastData = useMemo(
    () => buildForecastTrajectory(componentShock.totalShockPct),
    [componentShock.totalShockPct]
  );

  const setDeviceType = useCallback((nextDevice: DeviceType) => {
    setIsTransitioningDevice(true);
    setDeviceTypeState(nextDevice);
    setSelectedComponentId(ALL_COMPONENTS[nextDevice][0].id);
    window.setTimeout(() => {
      setIsTransitioningDevice(false);
    }, 120);
  }, []);

  const selectComponent = useCallback((id: string) => {
    setSelectedComponentId(id);
  }, []);

  const updateShock = useCallback((indexName: string, rawValue: number) => {
    const clean = sanitizeShockValue(rawValue);
    setActivePresetId('custom');
    setShocks((prev) => ({
      ...prev,
      [indexName]: clean,
    }));
  }, []);

  const applyPreset = useCallback((presetId: string) => {
    const found = SHOCK_SCENARIO_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setActivePresetId(found.id);
    setShocks({ ...found.shocks });
  }, []);

  const toggleRegionalized = useCallback(() => {
    setIsRegionalized((prev) => !prev);
  }, []);

  const toggleSubstitution = useCallback(() => {
    const targetId = selectedBaseComponent.id;
    setSubstitutedIds((prev) => {
      const next = new Set(prev);
      if (next.has(targetId)) {
        next.delete(targetId);
      } else {
        next.add(targetId);
      }
      return next;
    });
  }, [selectedBaseComponent.id]);

  return {
    deviceType,
    deviceMeta,
    components,
    indices: MARKET_INDICES,
    presets: SHOCK_SCENARIO_PRESETS,
    historical: HISTORICAL_DRIFT,
    selectedBaseComponent,
    activeComponent,
    selectedComponentId: selectedBaseComponent.id,
    shocks,
    activePresetId,
    isRegionalized,
    useSubstitution,
    substitutedIds,
    isTransitioningDevice,
    componentShock,
    deviceSummary,
    forecastData,
    setDeviceType,
    selectComponent,
    updateShock,
    applyPreset,
    toggleRegionalized,
    toggleSubstitution,
  };
}
