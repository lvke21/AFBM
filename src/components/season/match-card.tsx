import Link from "next/link";

import { formatDate } from "@/lib/utils/format";
import type { SeasonMatchSummary } from "@/modules/seasons/domain/season.types";
import {
  formatMatchResult,
  getMatchFlowHref,
  getMatchWinnerName,
} from "./season-view-model";

type MatchCardProps = {
  currentWeek: number;
  match: SeasonMatchSummary;
  saveGameId: string;
};

export function MatchCard({ currentWeek, match, saveGameId }: MatchCardProps) {
  const winnerName = getMatchWinnerName(match);
  const isCurrentWeek = match.week === currentWeek;

  return (
    <Link
      href={getMatchFlowHref(saveGameId, match)}
      className={`rounded-lg border p-5 transition hover:bg-white/8 ${
        isCurrentWeek ? "border-emerald-300/25 bg-emerald-300/8" : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Woche {match.week} · {match.kind === "PLAYOFF" ? "Playoff" : "Regular Season"} ·{" "}
            {formatDate(match.scheduledAt)}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            {match.homeTeamName} vs. {match.awayTeamName}
          </h3>
          {winnerName ? (
            <p className="mt-2 text-sm text-emerald-100">Winner: {winnerName}</p>
          ) : (
          <p className="mt-2 text-sm text-slate-400">{match.status.replaceAll("_", " ")}</p>
          )}
        </div>
        <div className="rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-sm font-semibold text-white">
          {formatMatchResult(match)}
        </div>
      </div>
    </Link>
  );
}
