import { StatusBadge } from "@/components/ui/status-badge";

import type { LiveSimulationState } from "./live-simulation-model";

type FieldSituationPanelProps = {
  state: LiveSimulationState;
};

function sourceTone(source: LiveSimulationState["situation"]["sourceLabel"]) {
  return source === "Drive Details" ? "success" as const : "active" as const;
}

export function FieldSituationPanel({ state }: FieldSituationPanelProps) {
  const { situation } = state;
  const items = [
    { label: "Quarter / Phase", value: situation.phaseLabel },
    { label: "Clock", value: situation.clockLabel },
    { label: "Possession", value: situation.possessionLabel },
    { label: "Down / Distance", value: situation.downDistanceLabel },
    { label: "Field Position", value: situation.fieldPositionLabel },
  ];

  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Field Context
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">Current Situation</h2>
        </div>
        <StatusBadge label={situation.sourceLabel} tone={sourceTone(situation.sourceLabel)} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg border border-white/10 bg-black/15 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              {item.label}
            </p>
            <p className="mt-3 text-base font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 rounded-lg border border-white/10 bg-black/15 p-4 text-sm leading-6 text-slate-300">
        {situation.summary}
      </p>
    </section>
  );
}
