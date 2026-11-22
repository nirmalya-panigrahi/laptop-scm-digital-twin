import { useMemo, useState } from 'react';
import { DeviceType, ElectronicsComponent } from '../types/scm';
import { calculateComponentShock } from '../utils/shockMath';

interface SupplyChainNetworkProps {
  deviceType: DeviceType;
  components: ElectronicsComponent[];
  shocks: Record<string, number>;
  isRegionalized: boolean;
  substitutedIds: Set<string>;
  onInspectComponent: (componentId: string) => void;
}

interface TopologyNode {
  id: string;
  label: string;
  tier: 'oem' | 'tier1' | 'tier2';
  x: number;
  y: number;
  shockPct: number;
  subtitle: string;
  componentId?: string;
}

interface TopologyEdge {
  from: string;
  to: string;
  severity: 'extreme' | 'elevated' | 'stable';
}

function getStrokeColor(severity: TopologyEdge['severity']): string {
  if (severity === 'extreme') return '#fb7185';
  if (severity === 'elevated') return '#fbbf24';
  return '#334155';
}

export default function SupplyChainNetwork({
  deviceType,
  components,
  shocks,
  isRegionalized,
  substitutedIds,
  onInspectComponent,
}: SupplyChainNetworkProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('oem');

  const { nodes, edges } = useMemo(() => {
    const center: TopologyNode = {
      id: 'oem',
      label: deviceType === 'smartphone' ? 'Phone OEM' : 'Laptop OEM',
      tier: 'oem',
      x: 500,
      y: 280,
      shockPct: 0,
      subtitle: 'Final EMS Integration & QA',
    };

    const tier1: TopologyNode[] = [];
    const tier2Map = new Map<string, TopologyNode>();
    const linkList: TopologyEdge[] = [];

    const radius1 = 155;
    const radius2 = 248;

    components.forEach((comp, idx) => {
      const angle = (idx / components.length) * Math.PI * 2 - Math.PI / 2;
      const shockRes = calculateComponentShock(comp, shocks, {
        isRegionalized,
        useSubstitution: substitutedIds.has(comp.id),
      });

      const severity: TopologyEdge['severity'] =
        shockRes.totalShockPct > 25
          ? 'extreme'
          : shockRes.totalShockPct > 10
            ? 'elevated'
            : 'stable';

      const t1Id = `t1-${comp.id}`;
      tier1.push({
        id: t1Id,
        label: comp.supplier.split(' / ')[0],
        tier: 'tier1',
        x: 500 + radius1 * Math.cos(angle),
        y: 280 + radius1 * Math.sin(angle),
        shockPct: shockRes.totalShockPct,
        subtitle: `${comp.name} · $${shockRes.shockedCostUsd.toFixed(2)}`,
        componentId: comp.id,
      });

      linkList.push({ from: 'oem', to: t1Id, severity });

      const primaryIdx = comp.materials.primary.index;
      const t2Id = `t2-${primaryIdx}`;
      if (!tier2Map.has(t2Id)) {
        const idxAngle = angle + 0.14;
        const idxVal = shocks[primaryIdx] ?? 0;
        tier2Map.set(t2Id, {
          id: t2Id,
          label: primaryIdx.replace(' Index', ''),
          tier: 'tier2',
          x: 500 + radius2 * Math.cos(idxAngle),
          y: 280 + radius2 * Math.sin(idxAngle),
          shockPct: idxVal,
          subtitle: 'Upstream Commodity / Fab Index',
        });
      }

      const idxVal = shocks[primaryIdx] ?? 0;
      const t2Severity: TopologyEdge['severity'] =
        idxVal > 30 ? 'extreme' : idxVal > 12 ? 'elevated' : 'stable';
      linkList.push({ from: t1Id, to: t2Id, severity: t2Severity });
    });

    return {
      nodes: [center, ...tier1, ...Array.from(tier2Map.values())],
      edges: linkList,
    };
  }, [deviceType, components, shocks, isRegionalized, substitutedIds]);

  const activeNode = nodes.find((n) => n.id === selectedNodeId) ?? nodes[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Interactive Radial Topology */}
      <div className="lg:col-span-8 rounded-xl border border-slate-800 bg-[#11192c] p-5 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Multi-Tier Supply Network Topology
            </h2>
            <p className="text-xs text-slate-400">
              OEM Final Assembly → Tier-1 Module Suppliers → Tier-2 Foundry & Material Indices
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <span className="text-cyan-300">OEM Hub</span>
            <span className="text-indigo-300">Tier-1 EMS</span>
            <span className="text-slate-300">Tier-2 Index</span>
          </div>
        </div>

        <div className="w-full overflow-hidden rounded-lg border border-slate-800 bg-[#090f1e]">
          <svg
            viewBox="0 0 1000 560"
            className="w-full h-[360px] sm:h-[460px]"
            role="img"
            aria-label="Multi-tier electronics supply chain network graph"
          >
            {/* Reference rings */}
            <circle cx={500} cy={280} r={155} fill="none" stroke="#1e293b" strokeDasharray="4 6" />
            <circle cx={500} cy={280} r={248} fill="none" stroke="#1e293b" strokeDasharray="2 6" />

            {/* Edges */}
            {edges.map((edge, i) => {
              const fromNode = nodes.find((n) => n.id === edge.from);
              const toNode = nodes.find((n) => n.id === edge.to);
              if (!fromNode || !toNode) return null;
              return (
                <line
                  key={`${edge.from}-${edge.to}-${i}`}
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke={getStrokeColor(edge.severity)}
                  strokeWidth={edge.severity === 'stable' ? 1.5 : 2.2}
                  strokeOpacity={0.75}
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const isSelected = node.id === activeNode.id;
              const radius = node.tier === 'oem' ? 32 : node.tier === 'tier1' ? 18 : 13;
              const fill =
                node.tier === 'oem'
                  ? '#0891b2'
                  : node.shockPct > 25
                    ? '#e11d48'
                    : node.shockPct > 10
                      ? '#d97706'
                      : node.tier === 'tier1'
                        ? '#4f46e5'
                        : '#334155';

              return (
                <g
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={radius + (isSelected ? 5 : 0)}
                    fill="none"
                    stroke={isSelected ? '#22d3ee' : 'transparent'}
                    strokeWidth={2}
                  />
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={radius}
                    fill={fill}
                    stroke="#0b1120"
                    strokeWidth={2}
                  />
                  <text
                    x={node.x}
                    y={node.y + radius + 14}
                    textAnchor="middle"
                    fill="#cbd5e1"
                    fontSize="11"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Node Inspector & Tier Directory */}
      <aside className="lg:col-span-4 rounded-xl border border-slate-800 bg-[#11192c] p-5 flex flex-col justify-between gap-5">
        <div className="space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <div className="text-[11px] font-mono text-cyan-400">
              {activeNode.tier === 'oem'
                ? 'OEM Assembly Center'
                : activeNode.tier === 'tier1'
                  ? 'Tier-1 Component Supplier'
                  : 'Tier-2 Commodity / Foundry Index'}
            </div>
            <h3 className="text-lg font-bold text-white mt-0.5">{activeNode.label}</h3>
            <p className="text-xs text-slate-400 mt-1">{activeNode.subtitle}</p>
          </div>

          {activeNode.tier !== 'oem' && (
            <div className="rounded-lg border border-slate-800 bg-[#0b1120] p-4 flex items-center justify-between">
              <span className="text-xs text-slate-400">Live Shock Signal</span>
              <span
                className={`text-lg font-mono font-bold tabular-nums ${
                  activeNode.shockPct > 25
                    ? 'text-rose-400'
                    : activeNode.shockPct > 10
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                }`}
              >
                {activeNode.shockPct >= 0 ? '+' : ''}
                {activeNode.shockPct.toFixed(1)}%
              </span>
            </div>
          )}

          {activeNode.componentId && (
            <button
              type="button"
              onClick={() => onInspectComponent(activeNode.componentId!)}
              className="w-full py-2.5 px-4 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Inspect Assembly in 3D Simulator
            </button>
          )}

          <div>
            <div className="text-xs font-mono text-slate-400 mb-2">Tier-1 Dependencies</div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
              {nodes
                .filter((n) => n.tier === 'tier1')
                .map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setSelectedNodeId(n.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      activeNode.id === n.id
                        ? 'bg-cyan-500/10 border-cyan-500/60 text-white'
                        : 'bg-[#0b1120] border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span className="truncate">{n.label}</span>
                    <span
                      className={`font-mono tabular-nums shrink-0 ${
                        n.shockPct > 25
                          ? 'text-rose-400'
                          : n.shockPct > 10
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                      }`}
                    >
                      {n.shockPct >= 0 ? '+' : ''}
                      {n.shockPct.toFixed(1)}%
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 text-xs text-slate-400">
          Sourcing Mode: <span className="font-mono text-slate-200">{isRegionalized ? 'Nearshored (0.25x Freight)' : 'Global Corridors (1.0x)'}</span>
        </div>
      </aside>
    </div>
  );
}
