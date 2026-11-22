import { useCallback, useState } from 'react';
import Footer from './components/Footer';
import Header from './components/Header';
import MaterialDependencyMatrix from './components/MaterialDependencyMatrix';
import RiskTaxonomy from './components/RiskTaxonomy';
import ShockSimulator from './components/ShockSimulator';
import SupplyChainNetwork from './components/SupplyChainNetwork';
import { useSimulationEngine } from './hooks/useSimulationEngine';
import { WorkspaceTab } from './types/scm';
import { buildBomCsv } from './utils/shockMath';

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('simulator');
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const sim = useSimulationEngine();

  const handleExportCsv = useCallback(() => {
    const csv = buildBomCsv(sim.components, sim.shocks, {
      isRegionalized: sim.isRegionalized,
      substitutedComponentIds: sim.substitutedIds,
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `circuittwin-${sim.deviceType}-bom-${sim.activePresetId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportNotice(
      `Exported ${sim.components.length} ${sim.deviceType} BOM assemblies (${sim.activePresetId})`
    );
    window.setTimeout(() => setExportNotice(null), 3200);
  }, [sim.components, sim.shocks, sim.isRegionalized, sim.substitutedIds, sim.deviceType, sim.activePresetId]);

  const handleInspectFromOtherView = useCallback(
    (componentId: string) => {
      sim.selectComponent(componentId);
      setActiveTab('simulator');
    },
    [sim]
  );

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#0b1120] text-slate-200 selection:bg-cyan-400 selection:text-slate-950">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onExportCsv={handleExportCsv}
      />

      {exportNotice && (
        <div
          role="status"
          className="bg-emerald-500/15 border-b border-emerald-500/40 text-emerald-300 text-xs font-mono px-4 py-2 text-center"
        >
          {exportNotice}
        </div>
      )}

      <main className="flex-grow max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'simulator' && (
          <ShockSimulator
            deviceType={sim.deviceType}
            deviceModelName={sim.deviceMeta.modelName}
            targetMsrpUsd={sim.deviceMeta.targetMsrpUsd}
            components={sim.components}
            indices={sim.indices}
            presets={sim.presets}
            historical={sim.historical}
            selectedBaseComponent={sim.selectedBaseComponent}
            activeComponent={sim.activeComponent}
            selectedComponentId={sim.selectedComponentId}
            shocks={sim.shocks}
            activePresetId={sim.activePresetId}
            isRegionalized={sim.isRegionalized}
            useSubstitution={sim.useSubstitution}
            isTransitioningDevice={sim.isTransitioningDevice}
            componentShock={sim.componentShock}
            deviceSummary={sim.deviceSummary}
            forecastData={sim.forecastData}
            onDeviceChange={sim.setDeviceType}
            onSelectComponent={sim.selectComponent}
            onUpdateShock={sim.updateShock}
            onApplyPreset={sim.applyPreset}
            onToggleRegionalized={sim.toggleRegionalized}
            onToggleSubstitution={sim.toggleSubstitution}
          />
        )}

        {activeTab === 'matrix' && (
          <MaterialDependencyMatrix
            deviceType={sim.deviceType}
            components={sim.components}
            shocks={sim.shocks}
            isRegionalized={sim.isRegionalized}
            substitutedIds={sim.substitutedIds}
            onInspectComponent={handleInspectFromOtherView}
            onExportCsv={handleExportCsv}
          />
        )}

        {activeTab === 'network' && (
          <SupplyChainNetwork
            deviceType={sim.deviceType}
            components={sim.components}
            shocks={sim.shocks}
            isRegionalized={sim.isRegionalized}
            substitutedIds={sim.substitutedIds}
            onInspectComponent={handleInspectFromOtherView}
          />
        )}

        {activeTab === 'taxonomy' && <RiskTaxonomy />}
      </main>

      <Footer
        deviceLabel={sim.deviceMeta.label}
        modelName={sim.deviceMeta.modelName}
      />
    </div>
  );
}
