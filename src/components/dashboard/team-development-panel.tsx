import { SectionPanel } from "@/components/layout/section-panel";

import type { TeamDevelopmentState } from "./dashboard-model";

type TeamDevelopmentPanelProps = {
  state: TeamDevelopmentState;
};

function directionSymbol(direction: TeamDevelopmentState["indicators"][number]["direction"]) {
  if (direction === "up") {
    return "↑";
  }

  if (direction === "down") {
    return "↓";
  }

  return "=";
}

function directionClass(direction: TeamDevelopmentState["indicators"][number]["direction"]) {
  if (direction === "up") {
    return "border-emerald-300/25 bg-emerald-300/10 text-emerald-50";
  }

  if (direction === "down") {
    return "border-rose-300/25 bg-rose-300/10 text-rose-50";
  }

  return "border-white/10 bg-white/5 text-slate-100";
}

export function TeamDevelopmentPanel({ state }: TeamDevelopmentPanelProps) {
  return (
    <SectionPanel
      title={state.title}
      description="Qualitative Entwicklung aus Form, Needs und aktuellem Kader-Value."
    >
      {state.indicators.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-300">{state.summary}</p>
          <div className="grid gap-3 2xl:grid-cols-3">
            {state.indicators.map((indicator) => (
              <article
                key={indicator.label}
                className={`rounded-lg border p-4 ${directionClass(indicator.direction)}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-75">
                  {directionSymbol(indicator.direction)} Entwicklung
                </p>
                <h3 className="mt-2 text-base font-semibold text-white">{indicator.label}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{indicator.description}</p>
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
