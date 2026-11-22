export type DeviceType = 'smartphone' | 'laptop';

export type WorkspaceTab = 'simulator' | 'matrix' | 'network' | 'taxonomy';

export type RiskLevel = 'Minimal' | 'Stable' | 'Elevated' | 'Extreme';

export interface MaterialSource {
  name: string;
  index: string;
  weight: number;
}

export interface ComponentSubstitution {
  name: string;
  rationale: string;
  materials: {
    primary: MaterialSource;
    secondary?: MaterialSource;
    tertiary?: MaterialSource;
  };
  baselineCostUsd: number;
  massGrams: number;
}

export interface ElectronicsComponent {
  id: string;
  deviceType: DeviceType;
  name: string;
  category: 'Compute Silicon' | 'Display & Optics' | 'Memory & Storage' | 'Power & Battery' | 'Chassis & Thermal' | 'I/O & Acoustics';
  materials: {
    primary: MaterialSource;
    secondary?: MaterialSource;
    tertiary?: MaterialSource;
  };
  sensitivityScore: number;
  supplier: string;
  supplierRegion: string;
  baselineCostUsd: number;
  massGrams: number;
  logisticsSensitivity: number;
  isGlobalSourcing: boolean;
  substitution?: ComponentSubstitution;
}

export interface MarketIndex {
  id: string;
  name: string;
  currentValue: number;
  change3m: number;
  unit: string;
  benchmarkRegion: string;
}

export interface ShockScenarioPreset {
  id: string;
  name: string;
  summary: string;
  shocks: Record<string, number>;
}

export interface HistoricalDriftPoint {
  month: string;
  'TSMC / Foundry Index': number;
  'DRAM/NAND Spot Index': number;
  'SOX Index': number;
  'Lithium & Battery Index': number;
  'LME Copper': number;
}

export interface ComponentShockResult {
  componentId: string;
  materialShockPct: number;
  logisticsShockPct: number;
  totalShockPct: number;
  baselineCostUsd: number;
  shockedCostUsd: number;
  costDeltaUsd: number;
  riskLevel: RiskLevel;
}

export interface DeviceBomSummary {
  deviceType: DeviceType;
  totalBaselineUsd: number;
  totalShockedUsd: number;
  totalDeltaUsd: number;
  weightedShockPct: number;
  totalMassGrams: number;
  topDriverComponentId: string;
  topDriverComponentName: string;
  topDriverDeltaUsd: number;
}

export interface RiskPillar {
  id: string;
  category: string;
  vulnerability: string;
  driver: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  indicators: string[];
  mitigation: string;
}
