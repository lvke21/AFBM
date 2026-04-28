import { SectionCard } from "@/components/ui/section-card";

import { buildScoreboardState, type MatchReport } from "./match-report-model";

type ScoreboardProps = {
  match: Pick<
    MatchReport,
    "homeTeam" | "awayTeam" | "status" | "summary" | "stadiumName"
  >;
};

export function Scoreboard({ match }: ScoreboardProps) {
  const state = buildScoreboardState(match);

  return (
    <SectionCard
      title={`${match.homeTeam.name} vs. ${match.awayTeam.name}`}
      description={match.stadiumName ?? "Spielbericht mit Score, BoxScore, Top-Performern und Drive-Verlauf."}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-white/5 p-5 text-center">
          <p className="text-sm text-slate-400">{match.homeTeam.abbreviation}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{state.homeScore}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-5 text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            {state.statusLabel}
          </p>
          <p className="mt-3 text-sm text-slate-200">{state.summary}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-5 text-center">
          <p className="text-sm text-slate-400">{match.awayTeam.abbreviation}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{state.awayScore}</p>
        </div>
      </div>
    </SectionCard>
  );
}
