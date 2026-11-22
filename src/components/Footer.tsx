interface FooterProps {
  deviceLabel: string;
  modelName: string;
}

export default function Footer({ deviceLabel, modelName }: FooterProps) {
  return (
    <footer className="mt-auto border-t border-slate-800 bg-[#0b1120] px-4 sm:px-6 py-5">
      <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-300">CircuitTwin</span>
          <span aria-hidden="true">·</span>
          <span>Active Twin: {deviceLabel} ({modelName})</span>
        </div>
        <p className="text-slate-500 max-w-xl">
          Deterministic supply chain simulation for educational and procurement scenario modeling. Figures reflect modeled BOM weights and commodity elasticity.
        </p>
      </div>
    </footer>
  );
}
