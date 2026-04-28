import { StatusBadge } from "@/components/ui/status-badge";

import type { GamePreviewReadinessItem, GamePreviewSignal, GamePreviewState } from "./game-preview-model";

type ReadinessRiskPanelProps = {
  state: GamePreviewState;
};

function toneToBadge(tone: GamePreviewReadinessItem["tone"] | GamePreviewSignal["tone"]) {
  if (tone === "positive") {
    return "success" as const;
  }

  if (tone === "warning") {
    return "warning" as const;
  }

  if (tone === "danger") {
    return "danger" as const;
  }

  return "neutral" as const;
}

function signalSourceLabel(source: GamePreviewSignal["source"]) {
  return source === "UI-Fixture" ? "Keine Auffaelligkeit" : "Aus Teamdaten";
}

function SignalList({ items, title }: { items: GamePreviewSignal[]; title: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/15 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {title}
      </p>
      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <article key={`${title}-${item.label}`} className="rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">{item.label}</h3>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {item.value}
                </p>
              </div>
              <StatusBadge
                label={signalSourceLabel(item.source)}
                tone={item.source === "UI-Fixture" ? "warning" : toneToBadge(item.tone)}
              />
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-300">{item.description}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export function ReadinessRiskPanel({ state }: ReadinessRiskPanelProps) {
  return (
    <section className="h-fit rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Bereit fuer Kickoff
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">Kann dein Team starten?</h2>
        </div>
        <StatusBadge label={state.canStartMatch ? "Bereit" : "Noch offen"} tone={state.canStartMatch ? "success" : "warning"} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {state.readinessItems.map((item) => (
          <article key={item.label} className="rounded-lg border border-white/10 bg-black/15 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                {item.label}
              </p>
              <StatusBadge label={item.value} tone={toneToBadge(item.tone)} />
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">{item.description}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <SignalList title="Staerken" items={state.strengthSignals} />
        <SignalList title="Risiken" items={state.riskSignals} />
      </div>
    </section>
  );
}
