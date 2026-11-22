import {
  ChevronDown,
  Globe,
  History,
  Info,
  Laptop,
  Plane,
  Smartphone,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { motion } from 'motion/react';
import {
  ComponentShockResult,
  DeviceBomSummary,
  DeviceType,
  ElectronicsComponent,
  HistoricalDriftPoint,
  MarketIndex,
  ShockScenarioPreset,
} from '../types/scm';
import { ForecastPoint } from '../utils/shockMath';
import DeviceTwinViewport from './twin3d/DeviceTwinViewport';

interface ShockSimulatorProps {
  deviceType: DeviceType;
  deviceModelName: string;
  targetMsrpUsd: number;
  components: ElectronicsComponent[];
  indices: MarketIndex[];
  presets: ShockScenarioPreset[];
  historical: HistoricalDriftPoint[];
  selectedBaseComponent: ElectronicsComponent;
  activeComponent: ElectronicsComponent;
  selectedComponentId: string;
  shocks: Record<string, number>;
  activePresetId: string;
  isRegionalized: boolean;
  useSubstitution: boolean;
  isTransitioningDevice: boolean;
  componentShock: ComponentShockResult;
  deviceSummary: DeviceBomSummary;
  forecastData: ForecastPoint[];
  onDeviceChange: (device: DeviceType) => void;
  onSelectComponent: (id: string) => void;
  onUpdateShock: (indexName: string, val: number) => void;
  onApplyPreset: (presetId: string) => void;
  onToggleRegionalized: () => void;
  onToggleSubstitution: () => void;
}

function getRiskColorClass(riskLevel: string): string {
  if (riskLevel === 'Extreme') return 'text-rose-400';
  if (riskLevel === 'Elevated') return 'text-amber-400';
  return 'text-emerald-400';
}

function IndexSlider({
  idx,
  value,
  onChange,
}: {
  idx: MarketIndex;
  value: number;
  onChange: (val: number) => void;
}) {
  const safeVal = Number.isFinite(value) ? value : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs font-mono gap-2">
        <label
          htmlFor={`slider-${idx.id}`}
          className="text-slate-300 flex items-center gap-1.5 truncate"
        >
          {idx.id === 'freight' && <Plane size={12} className="text-indigo-400 shrink-0" />}
          <span className="truncate">{idx.name}</span>
        </label>
        <span
          className={`font-semibold tabular-nums shrink-0 ${
            safeVal > 0 ? 'text-rose-400' : safeVal < 0 ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          {safeVal > 0 ? '+' : safeVal < 0 ? '-' : ''}
          {Math.abs(safeVal).toFixed(1)}%
        </span>
      </div>
      <input
        id={`slider-${idx.id}`}
        type="range"
        min="-50"
        max="200"
        step="0.5"
        value={safeVal}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="twin-slider w-full"
      />
    </div>
  );
}

function MaterialBar({
  name,
  weight,
  index,
  barColorClass,
  textColorClass,
}: {
  name: string;
  weight: number;
  index: string;
  barColorClass: string;
  textColorClass: string;
}) {
  const pct = Math.round((weight || 0) * 100);
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5 gap-2 text-xs">
        <span className="text-slate-200 truncate">
          {name} <span className="text-slate-500 font-mono text-[11px]">· {index}</span>
        </span>
        <span className={`${textColorClass} font-mono font-semibold tabular-nums shrink-0`}>
          {pct}%
        </span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className={`h-full ${barColorClass}`}
        />
      </div>
    </div>
  );
}

export default function ShockSimulator({
  deviceType,
  deviceModelName,
  targetMsrpUsd,
  components,
  indices,
  presets,
  historical,
  selectedBaseComponent,
  activeComponent,
  selectedComponentId,
  shocks,
  activePresetId,
  isRegionalized,
  useSubstitution,
  isTransitioningDevice,
  componentShock,
  deviceSummary,
  forecastData,
  onDeviceChange,
  onSelectComponent,
  onUpdateShock,
  onApplyPreset,
  onToggleRegionalized,
  onToggleSubstitution,
}: ShockSimulatorProps) {
  const materialRows = [
    {
      ...activeComponent.materials.primary,
      barColorClass: 'bg-cyan-400',
      textColorClass: 'text-cyan-300',
    },
    ...(activeComponent.materials.secondary
      ? [
          {
            ...activeComponent.materials.secondary,
            barColorClass: 'bg-sky-400',
            textColorClass: 'text-sky-300',
          },
        ]
      : []),
    ...(activeComponent.materials.tertiary
      ? [
          {
            ...activeComponent.materials.tertiary,
            barColorClass: 'bg-indigo-400',
            textColorClass: 'text-indigo-300',
          },
        ]
      : []),
  ];

  const riskColor = getRiskColorClass(componentShock.riskLevel);
  const impactPositive = componentShock.totalShockPct > 0;
  const impactNegative = componentShock.totalShockPct < 0;

  return (
    <div className="space-y-6">
      {/* 1. Device Platform & Command Telemetry Bar */}
      <section className="rounded-xl border border-slate-800 bg-[#11192c] px-5 py-4 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
          {/* Device Platform Toggle */}
          <div className="shrink-0">
            <div className="text-[11px] font-mono text-slate-400 mb-1.5">Device Platform</div>
            <div
              className="inline-flex items-center gap-1 p-1 bg-[#0b1120] border border-slate-800 rounded-lg"
              role="group"
              aria-label="Select Device Platform"
            >
              <button
                type="button"
                onClick={() => onDeviceChange('smartphone')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  deviceType === 'smartphone'
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone size={14} />
                Smartphone
              </button>
              <button
                type="button"
                onClick={() => onDeviceChange('laptop')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  deviceType === 'laptop'
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Laptop size={14} />
                Laptop
              </button>
            </div>
          </div>

          {/* Component Selector */}
          <div className="min-w-[240px] sm:min-w-[280px]">
            <label
              htmlFor="device-component-select"
              className="block text-[11px] font-mono text-slate-400 mb-1.5"
            >
              Inspect Hardware Assembly
            </label>
            <div className="relative">
              <select
                id="device-component-select"
                value={selectedComponentId}
                onChange={(e) => onSelectComponent(e.target.value)}
                className="appearance-none w-full bg-[#0b1120] text-slate-100 font-mono text-xs border border-slate-700 pl-3.5 pr-9 py-2.5 rounded-lg focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                {components.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
              />
            </div>
          </div>

          {/* Assembly Metadata (Zero-Pill unboxed text) */}
          <div className="md:border-l md:border-slate-800 md:pl-5 space-y-1">
            <div className="text-xs font-medium text-slate-200">
              {selectedBaseComponent.category}
              <span className="text-slate-600 mx-1.5">·</span>
              {selectedBaseComponent.supplier}
            </div>
            <div className="text-xs font-mono text-slate-400 tabular-nums">
              Base Cost: ${activeComponent.baselineCostUsd.toFixed(2)}
              <span className="text-slate-600 mx-2">/</span>
              Mass: {activeComponent.massGrams.toFixed(1)} g
              <span className="text-slate-600 mx-2">/</span>
              Sensitivity: {selectedBaseComponent.sensitivityScore.toFixed(1)}
            </div>
          </div>
        </div>

        {/* Horizontal KPI Strip */}
        <div className="flex flex-wrap items-center gap-6 pt-3 xl:pt-0 border-t xl:border-t-0 border-slate-800 shrink-0">
          <div>
            <div className="text-[11px] font-mono text-slate-500 mb-0.5">Sourcing</div>
            <div className="text-sm font-mono font-semibold text-slate-200">
              {isRegionalized
                ? 'Nearshored'
                : selectedBaseComponent.isGlobalSourcing
                  ? 'Global'
                  : 'Regional'}
            </div>
          </div>

          <div className="border-l border-slate-800 pl-5">
            <div className="text-[11px] font-mono text-slate-500 mb-0.5">Volatility Risk</div>
            <div className={`text-sm font-mono font-semibold ${riskColor}`}>
              {componentShock.riskLevel}
            </div>
          </div>

          <div className="border-l border-slate-800 pl-5 text-right">
            <div className="text-[11px] font-mono text-slate-500 mb-0.5">Assembly Cost Impact</div>
            <div className="flex items-baseline justify-end gap-2.5">
              <span
                className={`text-2xl sm:text-3xl font-mono font-bold tracking-tight tabular-nums ${
                  impactPositive
                    ? 'text-rose-400'
                    : impactNegative
                      ? 'text-emerald-400'
                      : 'text-slate-300'
                }`}
              >
                {impactPositive ? '+' : ''}
                {componentShock.totalShockPct.toFixed(2)}%
              </span>
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                (${componentShock.shockedCostUsd.toFixed(2)})
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Primary Interactive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Market Index Studio */}
        <aside className="lg:col-span-4 rounded-xl border border-slate-800 bg-[#11192c] p-5 flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h2 className="text-sm font-bold text-white tracking-tight">Market Shock Studio</h2>
              <span className="text-[11px] font-mono text-slate-400">
                {activePresetId === 'custom'
                  ? 'Custom'
                  : presets.find((p) => p.id === activePresetId)?.name}
              </span>
            </div>

            {/* Scenario Preset Selector */}
            <div className="mb-4">
              <div className="text-[11px] font-mono text-slate-400 mb-2">Scenario Presets</div>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onApplyPreset(preset.id)}
                    title={preset.summary}
                    className={`px-2.5 py-1.5 text-[11px] font-mono rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                      activePresetId === preset.id
                        ? 'bg-cyan-500/15 border-cyan-500/70 text-cyan-300'
                        : 'bg-[#0b1120] border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 9 Index Sliders */}
            <div className="space-y-3.5 max-h-[340px] overflow-y-auto pr-2 custom-scrollbar">
              {indices.map((idx) => (
                <IndexSlider
                  key={idx.id}
                  idx={idx}
                  value={shocks[idx.name] ?? 0}
                  onChange={(val) => onUpdateShock(idx.name, val)}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => onApplyPreset('baseline')}
              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg border border-slate-700 font-mono text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <History size={13} />
              3M Trend
            </button>
            <button
              type="button"
              onClick={() => onApplyPreset('zero')}
              className="py-2 px-3 bg-[#0b1120] hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 font-mono text-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              Zero Shocks
            </button>
          </div>
        </aside>

        {/* Right: 3D Device Digital Twin + Mitigation Controls */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {isTransitioningDevice ? (
            <div
              className="h-[430px] sm:h-[490px] rounded-xl border border-slate-800 bg-[#090f1e] flex items-center justify-center"
              role="status"
              aria-label="Loading device twin"
            >
              <div className="text-center space-y-2">
                <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-mono text-slate-400">Loading 3D hardware assembly...</p>
              </div>
            </div>
          ) : (
            <DeviceTwinViewport
              deviceType={deviceType}
              components={components}
              selectedComponentId={selectedComponentId}
              onSelectComponent={onSelectComponent}
              useSubstitution={useSubstitution}
              calculatedShockPct={componentShock.totalShockPct}
            />
          )}

          {/* Strategy & Engineering Mitigation Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-800 bg-[#11192c] p-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Globe size={14} className="text-indigo-400" />
                  Sourcing Corridor Strategy
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isRegionalized
                    ? 'India / Vietnam / Mexico nearshoring cuts air-freight shock by 75%.'
                    : 'Concentrated East Asia fab & assembly lanes (full freight elasticity).'}
                </p>
              </div>
              <button
                type="button"
                onClick={onToggleRegionalized}
                aria-pressed={isRegionalized}
                className={`px-3.5 py-2 rounded-lg text-xs font-mono font-medium border transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
                  isRegionalized
                    ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300'
                    : 'bg-[#0b1120] border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                {isRegionalized ? 'Nearshored' : 'Global Lanes'}
              </button>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#11192c] p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Zap size={14} className="text-cyan-400 shrink-0" />
                  <span className="truncate">Engineering Substitution</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                  {selectedBaseComponent.substitution
                    ? useSubstitution
                      ? selectedBaseComponent.substitution.rationale
                      : `Switch to: ${selectedBaseComponent.substitution.name}`
                    : 'No alternate BOM qualified for this assembly.'}
                </p>
              </div>
              {selectedBaseComponent.substitution && (
                <button
                  type="button"
                  onClick={onToggleSubstitution}
                  aria-pressed={useSubstitution}
                  className={`px-3.5 py-2 rounded-lg text-xs font-mono font-medium border transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
                    useSubstitution
                      ? 'bg-cyan-500/15 border-cyan-500/70 text-cyan-300'
                      : 'bg-[#0b1120] border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {useSubstitution ? 'Alternate Active' : 'Apply Alt BOM'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Full-Device BOM Cost Rollup Strip */}
      <section className="rounded-xl border border-slate-800 bg-[#11192c] px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-slate-400">
            Total Device BOM Rollup · {deviceModelName}
          </div>
          <div className="flex flex-wrap items-baseline gap-3 mt-1">
            <span className="text-xl sm:text-2xl font-mono font-bold text-white tabular-nums">
              ${deviceSummary.totalShockedUsd.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              vs ${deviceSummary.totalBaselineUsd.toFixed(2)} baseline
            </span>
            <span
              className={`text-xs font-mono font-semibold tabular-nums ${
                deviceSummary.totalDeltaUsd > 0
                  ? 'text-rose-400'
                  : deviceSummary.totalDeltaUsd < 0
                    ? 'text-emerald-400'
                    : 'text-slate-400'
              }`}
            >
              ({deviceSummary.totalDeltaUsd >= 0 ? '+' : ''}$
              {deviceSummary.totalDeltaUsd.toFixed(2)} /{' '}
              {deviceSummary.weightedShockPct >= 0 ? '+' : ''}
              {deviceSummary.weightedShockPct.toFixed(2)}%)
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 border-t md:border-t-0 border-slate-800 pt-3 md:pt-0">
          <div>
            <div className="text-[11px] font-mono text-slate-500">Est. Gross Margin Impact</div>
            <div className="text-sm font-mono font-semibold text-slate-200 tabular-nums">
              {((1 - deviceSummary.totalShockedUsd / targetMsrpUsd) * 100).toFixed(1)}% vs $
              {targetMsrpUsd} MSRP
            </div>
          </div>

          <div className="border-l border-slate-800 pl-5">
            <div className="text-[11px] font-mono text-slate-500">Top Variance Driver</div>
            <button
              type="button"
              onClick={() => onSelectComponent(deviceSummary.topDriverComponentId)}
              className="text-xs font-mono font-semibold text-cyan-300 hover:underline cursor-pointer text-left"
            >
              {deviceSummary.topDriverComponentName} (
              {deviceSummary.topDriverDeltaUsd >= 0 ? '+' : ''}$
              {deviceSummary.topDriverDeltaUsd.toFixed(2)})
            </button>
          </div>
        </div>
      </section>

      {/* 4. Middle Analytics Trio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* 6-Month Landed Cost Projection */}
        <section className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#11192c] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp size={15} className="text-cyan-400" />
                6-Month Landed Cost Trajectory
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Projected contract lag & inventory buffer pass-through
              </p>
            </div>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={{ stroke: '#334155' }}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                />
                <YAxis
                  axisLine={{ stroke: '#334155' }}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0b1120',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#e2e8f0',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="shock"
                  name="Cost Variance"
                  stroke={componentShock.totalShockPct > 10 ? '#fb7185' : '#22d3ee'}
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#22d3ee', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Material Sensitivity Matrix */}
        <section className="lg:col-span-4 rounded-xl border border-slate-800 bg-[#11192c] p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 mb-4">
              Material & Logistics Sensitivity
            </h3>
            <div className="space-y-4">
              {materialRows.map((mat) => (
                <MaterialBar
                  key={`${mat.name}-${mat.index}`}
                  name={mat.name}
                  weight={mat.weight}
                  index={mat.index}
                  barColorClass={mat.barColorClass}
                  textColorClass={mat.textColorClass}
                />
              ))}
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-800">
            <MaterialBar
              name="Air & Ocean Freight Exposure"
              weight={selectedBaseComponent.logisticsSensitivity}
              index={isRegionalized ? 'Nearshored 0.25x' : 'Global 1.0x'}
              barColorClass="bg-amber-400"
              textColorClass="text-amber-300"
            />
          </div>
        </section>

        {/* Propagation Insights */}
        <section className="lg:col-span-3 rounded-xl border border-slate-800 bg-[#11192c] p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 mb-4 flex items-center gap-2">
              <Info size={14} className="text-slate-400" />
              Propagation Insights
            </h3>
            <dl className="space-y-3 text-xs">
              <div className="flex justify-between items-center gap-2">
                <dt className="text-slate-400">Baseline Unit Cost</dt>
                <dd className="font-mono text-slate-200 tabular-nums">
                  ${componentShock.baselineCostUsd.toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between items-center gap-2">
                <dt className="text-slate-400">Shocked Unit Cost</dt>
                <dd className={`font-mono font-semibold tabular-nums ${riskColor}`}>
                  ${componentShock.shockedCostUsd.toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between items-center gap-2">
                <dt className="text-slate-400">Assembly Mass</dt>
                <dd className="font-mono text-slate-200 tabular-nums">
                  {activeComponent.massGrams.toFixed(1)} g
                </dd>
              </div>
              <div className="flex justify-between items-center gap-2">
                <dt className="text-slate-400">Material Component</dt>
                <dd className="font-mono text-slate-200 tabular-nums">
                  {componentShock.materialShockPct >= 0 ? '+' : ''}
                  {componentShock.materialShockPct.toFixed(2)}%
                </dd>
              </div>
              <div className="flex justify-between items-center gap-2">
                <dt className="text-slate-400">Freight Component</dt>
                <dd className="font-mono text-slate-200 tabular-nums">
                  {componentShock.logisticsShockPct >= 0 ? '+' : ''}
                  {componentShock.logisticsShockPct.toFixed(2)}%
                </dd>
              </div>
              <div className="flex justify-between items-center gap-2">
                <dt className="text-slate-400">BOM State</dt>
                <dd className="font-mono text-cyan-300">
                  {useSubstitution ? 'Substituted' : 'Baseline'}
                </dd>
              </div>
            </dl>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-800 text-xs font-mono text-slate-400 truncate">
            Tier-1: {selectedBaseComponent.supplier}
          </div>
        </section>
      </div>

      {/* 5. Historical Market Drift (6M Window) */}
      <section className="rounded-xl border border-slate-800 bg-[#11192c] p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              Historical Market Drift (6-Month Rolling Index)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Observed cumulative index movement across foundry wafers, memory spot, semiconductors, and metals
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-cyan-400 inline-block" /> TSMC / Foundry
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-rose-400 inline-block" /> DRAM/NAND Spot
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-amber-400 inline-block" /> SOX Index
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" /> Lithium & Battery
            </span>
          </div>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historical}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={{ stroke: '#334155' }}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
              />
              <YAxis
                axisLine={{ stroke: '#334155' }}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0b1120',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#e2e8f0',
                }}
              />
              <Line
                type="monotone"
                dataKey="TSMC / Foundry Index"
                stroke="#22d3ee"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="DRAM/NAND Spot Index"
                stroke="#fb7185"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="SOX Index"
                stroke="#fbbf24"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="Lithium & Battery Index"
                stroke="#34d399"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
