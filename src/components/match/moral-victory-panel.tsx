import { SectionCard } from "@/components/ui/section-card";

import { buildMoralVictoryState, type MatchReport } from "./match-report-model";

type MoralVictoryPanelProps = {
  match: Pick<MatchReport, "homeTeam" | "awayTeam" | "status">;
};

export function MoralVictoryPanel({ match }: MoralVictoryPanelProps) {
  const state = buildMoralVictoryState(match);
  const assessment = state.assessment;

  return (
    <SectionCard
      title={state.title}
      description="Erwartung, Ergebnis und erreichbare Teilziele fuer schwache Teams ohne Simulation-Buff."
    >
      {assessment ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <article
            className={[
              "rounded-lg border p-4",
              assessment.status === "moral victory" || assessment.status === "upset"
                ? "border-emerald-300/25 bg-emerald-300/10"
                : assessment.status === "missed opportunity"
                  ? "border-amber-300/25 bg-amber-300/10"
                  : "border-white/10 bg-white/5",
            ].join(" ")}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
              Erwartung vs Ergebnis
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              {assessment.status}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              {assessment.expectation.summary}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-300">{assessment.summary}</p>
            <div className="mt-4 grid gap-2 text-sm text-slate-200 sm:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-black/15 px-3 py-2">
                <p className="text-xs text-slate-500">Matchup</p>
                <p className="mt-1 font-semibold text-white">
                  {assessment.expectation.category}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/15 px-3 py-2">
                <p className="text-xs text-slate-500">Reward-Hinweis</p>
                <p className="mt-1 font-semibold text-white">
                  +{assessment.moraleDelta} Morale / +{assessment.progressionXpBonus} XP
                </p>
              </div>
            </div>
          </article>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
            <article className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Erfolgsmomente
              </p>
              {assessment.reasons.length > 0 ? (
                <ul className="mt-3 space-y-3">
                  {assessment.reasons.map((reason) => (
                    <li key={reason.code}>
                      <p className="text-sm font-semibold text-white">{reason.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-300">
                        {reason.description}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Keine zusaetzlichen Erfolgsmomente fuer dieses Match.
                </p>
              )}
            </article>

            <article className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Season Goals
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                {assessment.seasonGoals.map((goal) => (
                  <li key={goal}>{goal}</li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400">{state.emptyMessage}</p>
      )}
    </SectionCard>
  );
}
