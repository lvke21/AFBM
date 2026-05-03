import { SectionCard } from "@/components/ui/section-card";

import { buildWhyGameOutcomeState, type MatchReport } from "./match-report-model";

type WhyGameOutcomeProps = {
  match: Pick<MatchReport, "homeTeam" | "awayTeam" | "status" | "drives">;
};

function insightClass(tone: ReturnType<typeof buildWhyGameOutcomeState>["insights"][number]["tone"]) {
  if (tone === "positive") {
    return "border-emerald-300/25 bg-emerald-300/10";
  }

  if (tone === "warning") {
    return "border-amber-300/25 bg-amber-300/10";
  }

  return "border-white/10 bg-white/5";
}

export function WhyGameOutcome({ match }: WhyGameOutcomeProps) {
  const state = buildWhyGameOutcomeState(match);

  return (
    <SectionCard
      title={state.title}
      description="Die wichtigsten Gruende fuer den Spielausgang in klarer Managersprache."
    >
      {state.insights.length > 0 ? (
        <div className="space-y-4">
          <div
            className={[
              "rounded-lg border p-4",
              state.perspective === "won"
                ? "border-emerald-300/25 bg-emerald-300/10"
                : state.perspective === "lost"
                  ? "border-amber-300/25 bg-amber-300/10"
                  : "border-white/10 bg-white/5",
            ].join(" ")}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
              Spielausgang
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">{state.verdict}</h3>
            {state.winnerName && state.loserName ? (
              <p className="mt-2 text-sm text-slate-200">
                {state.winnerName} hatte in den entscheidenden Bereichen mehr verwertbare
                Vorteile als {state.loserName}.
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {state.insights.map((insight) => (
              <article
                key={insight.label}
                className={`rounded-lg border p-4 ${insightClass(insight.tone)}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Insight
                </p>
                <h4 className="mt-2 text-base font-semibold text-white">{insight.label}</h4>
                <p className="mt-3 text-sm leading-6 text-slate-300">{insight.explanation}</p>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400">{state.emptyMessage}</p>
      )}
    </SectionCard>
  );
}
