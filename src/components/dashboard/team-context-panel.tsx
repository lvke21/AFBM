import { SectionPanel } from "@/components/layout/section-panel";

import type { TeamContextState } from "./dashboard-model";

type TeamContextPanelProps = {
  state: TeamContextState;
};

function toneClass(tone: TeamContextState["streaks"][number]["tone"]) {
  if (tone === "positive") {
    return "border-emerald-300/25 bg-emerald-300/10";
  }

  if (tone === "warning") {
    return "border-amber-300/25 bg-amber-300/10";
  }

  return "border-white/10 bg-white/5";
}

function stretchTone(label: TeamContextState["stretch"]["label"]) {
  if (label === "Winnable Stretch") {
    return "border-emerald-300/25 bg-emerald-300/10";
  }

  if (label === "Tough Stretch") {
    return "border-amber-300/25 bg-amber-300/10";
  }

  return "border-white/10 bg-white/5";
}

export function TeamContextPanel({ state }: TeamContextPanelProps) {
  return (
    <SectionPanel
      title={state.title}
      description="Streaks, Form und naechster Schedule-Abschnitt aus vorhandenen Saison- und Teamdaten."
    >
      {state.streaks.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-300">{state.summary}</p>

          <div className="grid gap-3 lg:grid-cols-4">
            {state.streaks.map((streak) => (
              <article key={streak.label} className={`rounded-lg border p-4 ${toneClass(streak.tone)}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {streak.label}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white">{streak.value}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-300">{streak.description}</p>
              </article>
            ))}

            <article className={`rounded-lg border p-4 ${stretchTone(state.stretch.label)}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Next Stretch
              </p>
              <h3 className="mt-2 text-xl font-semibold text-white">{state.stretch.label}</h3>
              <p className="mt-1 text-sm font-semibold text-white">{state.stretch.value}</p>
              <p className="mt-2 text-xs leading-5 text-slate-300">{state.stretch.description}</p>
            </article>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {state.metrics.map((metric) => (
              <article key={metric.label} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {metric.label}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white">{metric.value}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-400">{metric.description}</p>
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
