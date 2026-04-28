import { StatusBadge } from "@/components/ui/status-badge";

import type { LiveMomentumIndicator, LiveSimulationState } from "./live-simulation-model";

type MomentumFlowPanelProps = {
  state: LiveSimulationState;
};

function sourceTone(source: LiveMomentumIndicator["sourceLabel"]) {
  return source === "Gespeichert" ? "success" as const : "active" as const;
}

function toneLabel(tone: LiveMomentumIndicator["tone"]) {
  if (tone === "success") {
    return "Positive";
  }

  if (tone === "warning") {
    return "Watch";
  }

  if (tone === "danger") {
    return "Critical";
  }

  if (tone === "active") {
    return "Live";
  }

  return "Neutral";
}

export function MomentumFlowPanel({ state }: MomentumFlowPanelProps) {
  return (
    <section className="h-fit rounded-lg border border-white/10 bg-white/5 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        Momentum / Flow
      </p>
      <h2 className="mt-2 text-xl font-semibold text-white">Game Signals</h2>

      <div className="mt-5 space-y-3">
        {state.momentumIndicators.map((indicator) => (
          <article key={indicator.label} className="rounded-lg border border-white/10 bg-black/15 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {indicator.label}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white">{indicator.value}</h3>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <StatusBadge label={indicator.sourceLabel} tone={sourceTone(indicator.sourceLabel)} />
                <StatusBadge label={toneLabel(indicator.tone)} tone={indicator.tone} />
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">{indicator.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
