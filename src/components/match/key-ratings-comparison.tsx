import { StatusBadge } from "@/components/ui/status-badge";

import type { GamePreviewRatingComparison } from "./game-preview-model";

type KeyRatingsComparisonProps = {
  comparisons: GamePreviewRatingComparison[];
};

function edgeLabel(edge: GamePreviewRatingComparison["edge"]) {
  if (edge === "home") {
    return "Home Edge";
  }

  if (edge === "away") {
    return "Away Edge";
  }

  return "Even";
}

function edgeTone(edge: GamePreviewRatingComparison["edge"]) {
  if (edge === "even") {
    return "neutral" as const;
  }

  return "success" as const;
}

export function KeyRatingsComparison({ comparisons }: KeyRatingsComparisonProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        Key Ratings
      </p>
      <h2 className="mt-2 text-xl font-semibold text-white">What Separates The Teams</h2>

      <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
        {comparisons.map((comparison) => (
          <article key={comparison.label} className="rounded-lg border border-white/10 bg-black/15 p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
                {comparison.label}
              </h3>
              <StatusBadge label={edgeLabel(comparison.edge)} tone={edgeTone(comparison.edge)} />
            </div>
            <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
              <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-base font-semibold text-white">
                {comparison.home}
              </p>
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                vs
              </span>
              <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-base font-semibold text-white">
                {comparison.away}
              </p>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">{comparison.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
