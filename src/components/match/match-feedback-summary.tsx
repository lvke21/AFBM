import { SectionCard } from "@/components/ui/section-card";

import { buildMatchFeedbackState, type MatchReport } from "./match-report-model";

type MatchFeedbackSummaryProps = {
  match: Pick<MatchReport, "homeTeam" | "awayTeam" | "status" | "drives">;
};

export function MatchFeedbackSummary({ match }: MatchFeedbackSummaryProps) {
  const state = buildMatchFeedbackState(match);

  return (
    <SectionCard
      title={state.title}
      description="Kompakte Einordnung zu Gameplan, AI, Ergebnis, Fatigue/Injury-Wirkung und Drive-Erklaerungen."
    >
      {state.items.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {state.items.map((item) => (
            <article
              key={`${item.label}-${item.value}`}
              className={[
                "rounded-lg border p-4",
                item.tone === "positive"
                  ? "border-emerald-300/25 bg-emerald-300/10"
                  : item.tone === "warning"
                    ? "border-amber-300/25 bg-amber-300/10"
                    : "border-white/10 bg-white/5",
              ].join(" ")}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                {item.label}
              </p>
              <h3 className="mt-2 text-base font-semibold text-white">{item.value}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{item.explanation}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">{state.emptyMessage}</p>
      )}
    </SectionCard>
  );
}
