import { SectionCard } from "@/components/ui/section-card";

import { buildUnderdogObjectiveState, type MatchReport } from "./match-report-model";

type UnderdogObjectivesPanelProps = {
  match: Pick<MatchReport, "homeTeam" | "awayTeam" | "status">;
};

function statusLabel(status: string) {
  if (status === "fulfilled") {
    return "Erfuellt";
  }

  if (status === "partial") {
    return "Teilweise";
  }

  return "Verfehlt";
}

export function UnderdogObjectivesPanel({ match }: UnderdogObjectivesPanelProps) {
  const state = buildUnderdogObjectiveState(match);
  const assessment = state.assessment;

  if (!assessment || assessment.objectives.length === 0) {
    return null;
  }

  return (
    <SectionCard
      title={state.title}
      description="Konkrete Pre-Game-Ziele fuer Underdogs, ausgewertet ohne Simulation-Buff."
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1.25fr]">
        <article
          className={[
            "rounded-lg border p-4",
            assessment.rebuildSignal
              ? "border-emerald-300/25 bg-emerald-300/10"
              : "border-white/10 bg-white/5",
          ].join(" ")}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
            Objective Summary
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            {assessment.rebuildSignal ? "Rebuild-Signal" : "Kein Rebuild-Signal"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-200">{assessment.summary}</p>
          <div className="mt-4 grid gap-2 text-sm text-slate-200 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-black/15 px-3 py-2">
              <p className="text-xs text-slate-500">Morale-Signal</p>
              <p className="mt-1 font-semibold text-white">+{assessment.moraleSignal}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/15 px-3 py-2">
              <p className="text-xs text-slate-500">Development-Signal</p>
              <p className="mt-1 font-semibold text-white">+{assessment.progressionSignal} XP</p>
            </div>
          </div>
        </article>

        <div className="grid gap-3 md:grid-cols-2">
          {assessment.objectives.map((objective) => (
            <article key={objective.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{objective.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{objective.target}</p>
                </div>
                <span
                  className={[
                    "rounded-full border px-2 py-1 text-xs font-semibold",
                    objective.status === "fulfilled"
                      ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                      : objective.status === "partial"
                        ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                        : "border-white/10 bg-black/15 text-slate-300",
                  ].join(" ")}
                >
                  {statusLabel(objective.status)}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {objective.explanation}
              </p>
            </article>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
