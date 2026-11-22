import {
  ComponentShockResult,
  DeviceBomSummary,
  DeviceType,
  ElectronicsComponent,
  RiskLevel,
} from '../types/scm';

export const MIN_SHOCK_PCT = -50;
export const MAX_SHOCK_PCT = 200;

export interface SimulationOptions {
  isRegionalized: boolean;
  useSubstitution: boolean;
}

export function sanitizeShockValue(rawValue: number): number {
  if (!Number.isFinite(rawValue)) return 0;
  const clamped = Math.min(MAX_SHOCK_PCT, Math.max(MIN_SHOCK_PCT, rawValue));
  return Math.round(clamped * 2) / 2;
}

export function resolveEffectiveComponent(
  component: ElectronicsComponent,
  useSubstitution: boolean
): ElectronicsComponent {
  if (!useSubstitution || !component.substitution) {
    return component;
  }
  return {
    ...component,
    name: `${component.name} (${component.substitution.name})`,
    materials: component.substitution.materials,
    baselineCostUsd: component.substitution.baselineCostUsd,
    massGrams: component.substitution.massGrams,
  };
}

export function classifyRiskLevel(shockPct: number, isRegionalized: boolean): RiskLevel {
  if (shockPct > 25) return 'Extreme';
  if (shockPct > 10) return 'Elevated';
  if (isRegionalized && shockPct <= 5) return 'Minimal';
  return 'Stable';
}

export function calculateComponentShock(
  component: ElectronicsComponent,
  shocks: Record<string, number>,
  options: SimulationOptions
): ComponentShockResult {
  const effective = resolveEffectiveComponent(component, options.useSubstitution);
  const { primary, secondary, tertiary } = effective.materials;

  let rawMaterialShock = sanitizeShockValue(shocks[primary.index] ?? 0) * primary.weight;
  if (secondary) {
    rawMaterialShock += sanitizeShockValue(shocks[secondary.index] ?? 0) * secondary.weight;
  }
  if (tertiary) {
    rawMaterialShock += sanitizeShockValue(shocks[tertiary.index] ?? 0) * tertiary.weight;
  }

  const complexityFactor = effective.sensitivityScore / 6;
  const materialShockPct = rawMaterialShock * complexityFactor;

  const freightShock = sanitizeShockValue(shocks['Air & Ocean Freight'] ?? 0);
  const logisticsMultiplier = effective.isGlobalSourcing && !options.isRegionalized ? 1.0 : 0.25;
  const logisticsShockPct = freightShock * effective.logisticsSensitivity * logisticsMultiplier;

  const totalShockPct = Math.max(-60, materialShockPct + logisticsShockPct);
  const baselineCostUsd = effective.baselineCostUsd;
  const shockedCostUsd = Math.max(0, baselineCostUsd * (1 + totalShockPct / 100));
  const costDeltaUsd = shockedCostUsd - baselineCostUsd;

  return {
    componentId: component.id,
    materialShockPct,
    logisticsShockPct,
    totalShockPct,
    baselineCostUsd,
    shockedCostUsd,
    costDeltaUsd,
    riskLevel: classifyRiskLevel(totalShockPct, options.isRegionalized),
  };
}

export function calculateDeviceSummary(
  deviceType: DeviceType,
  components: ElectronicsComponent[],
  shocks: Record<string, number>,
  options: { isRegionalized: boolean; substitutedComponentIds: Set<string> }
): DeviceBomSummary {
  if (components.length === 0) {
    return {
      deviceType,
      totalBaselineUsd: 0,
      totalShockedUsd: 0,
      totalDeltaUsd: 0,
      weightedShockPct: 0,
      totalMassGrams: 0,
      topDriverComponentId: '',
      topDriverComponentName: 'None',
      topDriverDeltaUsd: 0,
    };
  }

  let totalBaselineUsd = 0;
  let totalShockedUsd = 0;
  let totalMassGrams = 0;
  let topDriverComponentId = components[0].id;
  let topDriverComponentName = components[0].name;
  let topDriverDeltaUsd = -Infinity;

  for (const comp of components) {
    const useSub = options.substitutedComponentIds.has(comp.id);
    const effective = resolveEffectiveComponent(comp, useSub);
    const result = calculateComponentShock(comp, shocks, {
      isRegionalized: options.isRegionalized,
      useSubstitution: useSub,
    });

    totalBaselineUsd += result.baselineCostUsd;
    totalShockedUsd += result.shockedCostUsd;
    totalMassGrams += effective.massGrams;

    if (Math.abs(result.costDeltaUsd) > Math.abs(topDriverDeltaUsd) || topDriverDeltaUsd === -Infinity) {
      topDriverDeltaUsd = result.costDeltaUsd;
      topDriverComponentId = comp.id;
      topDriverComponentName = effective.name;
    }
  }

  const totalDeltaUsd = totalShockedUsd - totalBaselineUsd;
  const weightedShockPct = totalBaselineUsd > 0 ? (totalDeltaUsd / totalBaselineUsd) * 100 : 0;

  return {
    deviceType,
    totalBaselineUsd,
    totalShockedUsd,
    totalDeltaUsd,
    weightedShockPct,
    totalMassGrams,
    topDriverComponentId,
    topDriverComponentName,
    topDriverDeltaUsd: topDriverDeltaUsd === -Infinity ? 0 : topDriverDeltaUsd,
  };
}

export interface ForecastPoint {
  month: string;
  shock: number;
}

export function buildForecastTrajectory(totalShockPct: number): ForecastPoint[] {
  const safe = Number.isFinite(totalShockPct) ? totalShockPct : 0;
  return [
    { month: 'Current', shock: 0 },
    { month: 'T+1 Mo', shock: Number((safe * 0.38).toFixed(2)) },
    { month: 'T+2 Mo', shock: Number((safe * 0.72).toFixed(2)) },
    { month: 'T+3 Peak', shock: Number(safe.toFixed(2)) },
    { month: 'T+6 Recede', shock: Number((safe * 0.78).toFixed(2)) },
  ];
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function buildBomCsv(
  components: ElectronicsComponent[],
  shocks: Record<string, number>,
  options: { isRegionalized: boolean; substitutedComponentIds: Set<string> }
): string {
  const headers = [
    'Component ID',
    'Device',
    'Category',
    'Assembly Name',
    'Supplier',
    'Sourcing Region',
    'Primary Feedstock',
    'Primary Index',
    'Primary Weight %',
    'Baseline Cost (USD)',
    'Shocked Cost (USD)',
    'Cost Variance (%)',
    'Risk Level',
  ];

  const rows = components.map((comp) => {
    const useSub = options.substitutedComponentIds.has(comp.id);
    const effective = resolveEffectiveComponent(comp, useSub);
    const res = calculateComponentShock(comp, shocks, {
      isRegionalized: options.isRegionalized,
      useSubstitution: useSub,
    });

    return [
      effective.id,
      effective.deviceType,
      effective.category,
      effective.name,
      effective.supplier,
      options.isRegionalized ? 'Nearshored (India/Vietnam/MX)' : effective.supplierRegion,
      effective.materials.primary.name,
      effective.materials.primary.index,
      Math.round(effective.materials.primary.weight * 100),
      res.baselineCostUsd.toFixed(2),
      res.shockedCostUsd.toFixed(2),
      res.totalShockPct.toFixed(2),
      res.riskLevel,
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  return [headers.map(escapeCsvCell).join(','), ...rows].join('\n');
}
