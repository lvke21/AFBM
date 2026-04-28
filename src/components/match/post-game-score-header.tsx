import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils/format";

import type { PostGameReportMatch, PostGameReportState, ReportTeamSummary } from "./post-game-report-model";

type PostGameScoreHeaderProps = {
  match: PostGameReportMatch;
  state: PostGameReportState;
};

function statusTone(hasFinalScore: boolean) {
  return hasFinalScore ? "success" as const : "warning" as const;
}

function sourceLabel(source: "Data" | "Fallback") {
  return source === "Data" ? "Spielstatistik" : "Begrenzte Daten";
}

function TeamBlock({ team }: { team: ReportTeamSummary }) {
  return (
    <div className={team.side === "Away" ? "xl:text-right" : ""}>
      <div className={`flex flex-wrap items-center gap-2 ${team.side === "Away" ? "xl:justify-end" : ""}`}>
        <StatusBadge label={team.side === "Home" ? "Heim" : "Auswaerts"} tone="neutral" />
        {team.winner ? <StatusBadge label="Sieger" tone="success" /> : null}
        {team.isManagerTeam ? <StatusBadge label="Dein Team" tone="active" /> : null}
      </div>
      <h2
        className="mt-4 text-3xl font-semibold text-white md:text-5xl"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {team.name}
      </h2>
      <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
        {team.abbreviation}
      </p>
    </div>
  );
}

export function PostGameScoreHeader({ match, state }: PostGameScoreHeaderProps) {
  const score = state.scoreHeader;

  return (
    <section className="rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(39,198,149,0.14),rgba(7,17,29,0.94)_45%,rgba(47,140,255,0.12))] p-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_auto_1fr] xl:items-center">
        <TeamBlock team={score.homeTeam} />

        <div className="rounded-lg border border-white/10 bg-black/25 px-6 py-5 text-center">
          <div className="flex flex-wrap justify-center gap-2">
            <StatusBadge label={score.statusLabel} tone={statusTone(state.hasFinalScore)} />
            <StatusBadge label={score.resultLabel} tone={state.hasFinalScore ? "success" : "warning"} />
          </div>
          <p
            className="mt-4 text-5xl font-semibold text-white md:text-6xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {score.homeTeam.score} : {score.awayTeam.score}
          </p>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Woche {match.week} · {formatDate(match.scheduledAt)}
            {match.stadiumName ? ` · ${match.stadiumName}` : ""}
          </p>
        </div>

        <TeamBlock team={score.awayTeam} />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {score.contextMetrics.map((metric) => (
          <div key={metric.label} className="rounded-lg border border-white/10 bg-black/15 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                {metric.label}
              </p>
              <StatusBadge label={sourceLabel(metric.sourceLabel)} tone={metric.sourceLabel === "Data" ? "success" : "warning"} />
            </div>
            <p className="mt-3 text-xl font-semibold text-white">{metric.value}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 rounded-lg border border-white/10 bg-black/15 p-4 text-sm leading-6 text-slate-300">
        {score.summary}
      </p>
    </section>
  );
}
