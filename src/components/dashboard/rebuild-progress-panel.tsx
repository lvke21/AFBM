import { SectionPanel } from "@/components/layout/section-panel";

import type { RebuildProgressState } from "./dashboard-model";

type RebuildProgressPanelProps = {
  state: RebuildProgressState;
};

function statusLabel(status: RebuildProgressState["milestones"][number]["status"]) {
  if (status === "achieved") {
    return "Erreicht";
  }

  if (status === "in-progress") {
    return "Im Aufbau";
  }

  return "Noch offen";
}

export function RebuildProgressPanel({ state }: RebuildProgressPanelProps) {
  return (
    <SectionPanel
      title={state.title}
      description="Sichtbarer Fortschritt ueber Teamstaerke, Punkte-Trend, knappe Spiele, Blowout-Vermeidung und jungen Kern."
    >
      {state.metrics.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-300">{state.summary}</p>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {state.metrics.map((metric) => (
              <article
                key={metric.label}
                className="rounded-lg border border-white/10 bg-white/5 p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {metric.label}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white">{metric.value}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-400">{metric.description}</p>
              </article>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {state.milestones.map((milestone) => (
              <article
                key={milestone.title}
                className={[
                  "rounded-lg border p-4",
                  milestone.status === "achieved"
                    ? "border-emerald-300/25 bg-emerald-300/10"
                    : milestone.status === "in-progress"
                      ? "border-amber-300/25 bg-amber-300/10"
                      : "border-white/10 bg-white/5",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {statusLabel(milestone.status)}
                    </p>
                    <h3 className="mt-2 text-base font-semibold text-white">
                      {milestone.title}
                    </h3>
                  </div>
                  <span className="rounded-lg border border-white/10 bg-black/15 px-2 py-1 text-xs font-semibold text-slate-200">
                    {milestone.value}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {milestone.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400">{state.emptyMessage}</p>
      )}
    </SectionPanel>
  );
}
