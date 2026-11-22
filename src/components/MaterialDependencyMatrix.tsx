import { ArrowUpDown, Download, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DeviceType, ElectronicsComponent } from '../types/scm';
import { calculateComponentShock, resolveEffectiveComponent } from '../utils/shockMath';

interface MaterialDependencyMatrixProps {
  deviceType: DeviceType;
  components: ElectronicsComponent[];
  shocks: Record<string, number>;
  isRegionalized: boolean;
  substitutedIds: Set<string>;
  onInspectComponent: (componentId: string) => void;
  onExportCsv: () => void;
}

type SortKey = 'name' | 'baselineCostUsd' | 'shockedCostUsd' | 'totalShockPct';

export default function MaterialDependencyMatrix({
  deviceType,
  components,
  shocks,
  isRegionalized,
  substitutedIds,
  onInspectComponent,
  onExportCsv,
}: MaterialDependencyMatrixProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortKey, setSortKey] = useState<SortKey>('shockedCostUsd');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(components.map((c) => c.category)));
    return ['All', ...unique];
  }, [components]);

  const enrichedRows = useMemo(() => {
    return components.map((comp) => {
      const useSub = substitutedIds.has(comp.id);
      const effective = resolveEffectiveComponent(comp, useSub);
      const result = calculateComponentShock(comp, shocks, {
        isRegionalized,
        useSubstitution: useSub,
      });
      return {
        comp,
        effective,
        useSub,
        result,
      };
    });
  }, [components, shocks, isRegionalized, substitutedIds]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = enrichedRows.filter(({ comp, effective }) => {
      const catMatch = selectedCategory === 'All' || comp.category === selectedCategory;
      if (!catMatch) return false;
      if (!q) return true;
      return (
        effective.name.toLowerCase().includes(q) ||
        comp.supplier.toLowerCase().includes(q) ||
        effective.materials.primary.name.toLowerCase().includes(q) ||
        effective.materials.primary.index.toLowerCase().includes(q)
      );
    });

    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') {
        cmp = a.effective.name.localeCompare(b.effective.name);
      } else if (sortKey === 'baselineCostUsd') {
        cmp = a.result.baselineCostUsd - b.result.baselineCostUsd;
      } else if (sortKey === 'shockedCostUsd') {
        cmp = a.result.shockedCostUsd - b.result.shockedCostUsd;
      } else {
        cmp = a.result.totalShockPct - b.result.totalShockPct;
      }
      return sortAsc ? cmp : -cmp;
    });

    return filtered;
  }, [enrichedRows, searchQuery, selectedCategory, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
  };

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="rounded-xl border border-slate-800 bg-[#11192c] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            {deviceType === 'smartphone' ? 'Smartphone' : 'Laptop'} Bill of Materials Matrix
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Live feedstock mapping and unit-cost sensitivity across {components.length} Tier-1 assemblies. Click any row to inspect in 3D.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assembly, supplier, index..."
              aria-label="Search BOM assemblies"
              className="w-full sm:w-64 bg-[#0b1120] border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <button
            type="button"
            onClick={onExportCsv}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg text-xs font-mono flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Download size={13} />
            Download CSV
          </button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by category">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-cyan-500/15 border-cyan-500/70 text-cyan-300'
                : 'bg-[#11192c] border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {filteredRows.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-[#11192c] p-10 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-200">
            No matching hardware assemblies found
          </p>
          <p className="text-xs text-slate-400">
            No BOM entries match &ldquo;{searchQuery}&rdquo; in category {selectedCategory}.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-xs rounded-lg cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          {/* Desktop High-Density Data Table */}
          <div className="hidden md:block rounded-xl border border-slate-800 bg-[#11192c] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0b1120] border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                    <th className="py-3 px-4 font-medium">Category</th>
                    <th className="py-3 px-4 font-medium">
                      <button
                        type="button"
                        onClick={() => handleSort('name')}
                        className="inline-flex items-center gap-1 hover:text-white cursor-pointer"
                      >
                        Assembly <ArrowUpDown size={11} />
                      </button>
                    </th>
                    <th className="py-3 px-4 font-medium">Primary Feedstock & Index</th>
                    <th className="py-3 px-4 font-medium">Tier-1 Supplier</th>
                    <th className="py-3 px-4 font-medium text-right">
                      <button
                        type="button"
                        onClick={() => handleSort('baselineCostUsd')}
                        className="inline-flex items-center gap-1 hover:text-white cursor-pointer"
                      >
                        Base USD <ArrowUpDown size={11} />
                      </button>
                    </th>
                    <th className="py-3 px-4 font-medium text-right">
                      <button
                        type="button"
                        onClick={() => handleSort('shockedCostUsd')}
                        className="inline-flex items-center gap-1 hover:text-white cursor-pointer"
                      >
                        Shocked USD <ArrowUpDown size={11} />
                      </button>
                    </th>
                    <th className="py-3 px-4 font-medium text-right">
                      <button
                        type="button"
                        onClick={() => handleSort('totalShockPct')}
                        className="inline-flex items-center gap-1 hover:text-white cursor-pointer"
                      >
                        Variance <ArrowUpDown size={11} />
                      </button>
                    </th>
                    <th className="py-3 px-4 font-medium text-right">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredRows.map(({ comp, effective, useSub, result }) => (
                    <tr
                      key={comp.id}
                      onClick={() => onInspectComponent(comp.id)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {comp.category}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-100">
                        {effective.name}
                        {useSub && (
                          <span className="ml-2 text-[11px] font-mono font-normal text-cyan-400">
                            · Alt BOM
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {effective.materials.primary.name}
                        <span className="text-slate-500 font-mono text-[11px]">
                          {' '}
                          · {effective.materials.primary.index} (
                          {Math.round(effective.materials.primary.weight * 100)}%)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{comp.supplier}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-300 tabular-nums">
                        ${result.baselineCostUsd.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-white tabular-nums">
                        ${result.shockedCostUsd.toFixed(2)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono font-semibold tabular-nums ${
                          result.totalShockPct > 0
                            ? 'text-rose-400'
                            : result.totalShockPct < 0
                              ? 'text-emerald-400'
                              : 'text-slate-400'
                        }`}
                      >
                        {result.totalShockPct >= 0 ? '+' : ''}
                        {result.totalShockPct.toFixed(2)}%
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono font-semibold ${
                          result.riskLevel === 'Extreme'
                            ? 'text-rose-400'
                            : result.riskLevel === 'Elevated'
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                        }`}
                      >
                        {result.riskLevel}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card Stack (< md) */}
          <div className="md:hidden space-y-3">
            {filteredRows.map(({ comp, effective, result }) => (
              <button
                key={comp.id}
                type="button"
                onClick={() => onInspectComponent(comp.id)}
                className="w-full text-left rounded-xl border border-slate-800 bg-[#11192c] p-4 space-y-2.5 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-mono text-slate-400">
                      {comp.category} · {comp.supplier}
                    </div>
                    <div className="text-sm font-semibold text-white mt-0.5">{effective.name}</div>
                  </div>
                  <span
                    className={`font-mono text-xs font-bold tabular-nums shrink-0 ${
                      result.totalShockPct > 0
                        ? 'text-rose-400'
                        : result.totalShockPct < 0
                          ? 'text-emerald-400'
                          : 'text-slate-400'
                    }`}
                  >
                    {result.totalShockPct >= 0 ? '+' : ''}
                    {result.totalShockPct.toFixed(2)}%
                  </span>
                </div>
                <div className="text-xs text-slate-300">
                  {effective.materials.primary.name} · {effective.materials.primary.index}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs font-mono tabular-nums">
                  <span className="text-slate-400">Base ${result.baselineCostUsd.toFixed(2)}</span>
                  <span className="text-white font-semibold">
                    Shocked ${result.shockedCostUsd.toFixed(2)}
                  </span>
                  <span
                    className={
                      result.riskLevel === 'Extreme'
                        ? 'text-rose-400'
                        : result.riskLevel === 'Elevated'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                    }
                  >
                    {result.riskLevel}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
