import { AlertTriangle, BatteryCharging, Cpu, Layers, ShieldCheck } from 'lucide-react';
import { RISK_PILLARS } from '../data/electronicsData';

const ICON_MAP: Record<string, typeof Cpu> = {
  'risk-foundry': Cpu,
  'risk-memory': Layers,
  'risk-display': AlertTriangle,
  'risk-battery': BatteryCharging,
};

function getSeverityStyle(severity: string) {
  if (severity === 'Critical') return 'text-rose-400';
  if (severity === 'High') return 'text-amber-400';
  if (severity === 'Medium') return 'text-cyan-300';
  return 'text-emerald-400';
}

export default function RiskTaxonomy() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Electronics Supply Chain Risk Taxonomy
        </h2>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          Structural chokepoints across flagship smartphone and laptop hardware tiers, mapped to global commodity and fab utilization indices.
        </p>
      </div>

      {/* 4 Risk Pillar Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {RISK_PILLARS.map((pillar) => {
          const Icon = ICON_MAP[pillar.id] ?? ShieldCheck;
          return (
            <article
              key={pillar.id}
              className="rounded-xl border border-slate-800 bg-[#11192c] p-5 flex flex-col justify-between gap-5"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="p-2 rounded-lg border border-slate-700 bg-slate-900 text-cyan-300">
                    <Icon size={18} />
                  </div>
                  <span className={`font-mono text-xs font-semibold ${getSeverityStyle(pillar.severity)}`}>
                    {pillar.severity} Risk
                  </span>
                </div>

                <h3 className="text-base font-bold text-white tracking-tight mb-1.5">
                  {pillar.category}
                </h3>
                <div className="text-xs font-mono text-cyan-400/90 mb-3">
                  {pillar.vulnerability}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{pillar.driver}</p>
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-2.5 text-xs">
                <div>
                  <div className="text-[11px] font-mono text-slate-500 mb-0.5">Tracked Indices</div>
                  <div className="font-mono text-slate-200">{pillar.indicators.join(' · ')}</div>
                </div>
                <div>
                  <div className="text-[11px] font-mono text-slate-500 mb-0.5">Engineering Mitigation</div>
                  <div className="text-slate-300 leading-relaxed">{pillar.mitigation}</div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Deterministic Shock Formula & Methodology */}
      <section className="rounded-xl border border-slate-800 bg-[#11192c] p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <h3 className="text-base font-bold text-white">
              Deterministic Price Shock & Elasticity Model
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Every assembly cost variance combines weighted commodity index movements, assembly manufacturing complexity, and sourcing lane freight exposure. Engineering substitutions swap the underlying material weights and baseline unit cost in real time.
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#0b1120] px-4 py-3 font-mono text-xs text-slate-200 space-y-1.5 shrink-0">
            <div>
              <span className="text-cyan-400">Material Shock %</span> = Σ (Index Δ% × Feedstock Weight) × (Sensitivity / 6)
            </div>
            <div>
              <span className="text-indigo-400">Freight Shock %</span> = Air/Ocean Δ% × Logistics Sensitivity × Lane Factor
            </div>
            <div className="text-slate-400 pt-1 border-t border-slate-800">
              Lane Factor = 1.00 (Global) · 0.25 (Regionalized / Friendshored)
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
