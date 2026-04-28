import { SectionCard } from "@/components/ui/section-card";

import { buildMatchupExplanationState, type MatchReport } from "./match-report-model";

type MatchupExplanationPanelProps = {
  match: Pick<MatchReport, "homeTeam" | "awayTeam" | "status">;
};

export function MatchupExplanationPanel({ match }: MatchupExplanationPanelProps) {
  const state = buildMatchupExplanationState(match);

  return (
    <SectionCard
      title={state.title}
      description="Einordnung von Teamstaerke, Erwartung, Ergebnis und den wichtigsten Spieltreibern."
    >
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.4fr]">
        <article className="rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Erwartung
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            {state.expectationLabel}
          </h3>
          <dl className="mt-4 grid gap-2 text-sm text-slate-300">
            <div className="flex items-center justify-between gap-3">
              <dt>Schwierigkeit</dt>
              <dd className="font-semibold text-white">{state.difficulty}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt>Staerkevergleich</dt>
              <dd className="text-right font-semibold text-white">
                {state.ratingComparison}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt>Ergebnis</dt>
              <dd className="text-right font-semibold text-white">{state.resultLabel}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm leading-6 text-slate-300">{state.summary}</p>
        </article>

        {state.reasons.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {state.reasons.map((reason) => (
              <article
                key={reason.label}
                className={[
                  "rounded-lg border p-4",
                  reason.tone === "positive"
                    ? "border-emerald-300/25 bg-emerald-300/10"
                    : reason.tone === "warning"
                      ? "border-amber-300/25 bg-amber-300/10"
                      : "border-white/10 bg-white/5",
                ].join(" ")}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {reason.label}
                </p>
                <h4 className="mt-2 text-base font-semibold text-white">{reason.value}</h4>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {reason.explanation}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
            {state.emptyMessage}
          </p>
        )}
      </div>
    </SectionCard>
  );
}
