import { StatusBadge } from "@/components/ui/status-badge";

import type { PostGameReportMatch, PostGameReportState, ReportStatComparison } from "./post-game-report-model";

type TeamStatsComparisonPanelProps = {
  match: PostGameReportMatch;
  state: PostGameReportState;
};

function edgeLabel(edge: ReportStatComparison["edge"], match: PostGameReportMatch) {
  if (edge === "home") {
    return match.homeTeam.abbreviation;
  }

  if (edge === "away") {
    return match.awayTeam.abbreviation;
  }

  return "Even";
}

function edgeTone(edge: ReportStatComparison["edge"]) {
  return edge === "even" ? "neutral" : "success";
}

function sourceLabel(source: ReportStatComparison["sourceLabel"]) {
  return source === "Data" ? "Spielstatistik" : "Begrenzte Daten";
}

export function TeamStatsComparisonPanel({ match, state }: TeamStatsComparisonPanelProps) {
  const hasStatData = state.stats.some((row) => row.sourceLabel === "Data");

  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        Team Stats
      </p>
      <h2 className="mt-2 text-xl font-semibold text-white">What Decided The Box Score</h2>

      {hasStatData ? (
        <div className="mt-5 space-y-3">
          {state.stats.map((row) => (
            <article key={row.label} className="rounded-lg border border-white/10 bg-black/15 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
                    {row.label}
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-slate-400">{row.description}</p>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <StatusBadge label={sourceLabel(row.sourceLabel)} tone={row.sourceLabel === "Data" ? "success" : "warning"} />
                  <StatusBadge label={edgeLabel(row.edge, match)} tone={edgeTone(row.edge)} />
                </div>
              </div>

              {row.sourceLabel === "Data" ? (
                <div className="mt-4 grid grid-cols-[auto_1fr_auto] items-center gap-3">
                  <p className="w-14 text-right text-base font-semibold text-white">{row.home}</p>
                  <div className="grid h-3 grid-cols-2 overflow-hidden rounded-full bg-white/10">
                    <div className="flex justify-end bg-transparent">
                      <span
                        className="h-3 rounded-l-full bg-emerald-300/70"
                        style={{ width: `${Math.max(row.homeShare, 8)}%` }}
                      />
                    </div>
                    <div className="bg-transparent">
                      <span
                        className="block h-3 rounded-r-full bg-sky-300/70"
                        style={{ width: `${Math.max(row.awayShare, 8)}%` }}
                      />
                    </div>
                  </div>
                  <p className="w-14 text-base font-semibold text-white">{row.away}</p>
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/10 px-3 py-3 text-sm font-semibold text-amber-50">
                  Diese Teamstatistik ist in den aktuellen Spielberichtsdaten nicht vorhanden.
                </div>
              )}

              <div className="mt-2 flex justify-between text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                <span>{match.homeTeam.abbreviation}</span>
                <span>{match.awayTeam.abbreviation}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-amber-300/25 bg-amber-300/10 p-5">
          <StatusBadge label="Noch keine Detaildaten" tone="warning" />
          <p className="mt-3 text-sm leading-6 text-amber-50">
            Team-Stats sind fuer dieses Match noch nicht in den Spielberichtsdaten vorhanden.
            Der Report zeigt deshalb den finalen Score, vorhandene Impact-Signale und den naechsten Schritt.
          </p>
        </div>
      )}
    </section>
  );
}
