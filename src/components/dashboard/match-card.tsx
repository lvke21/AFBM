import Link from "next/link";

import { formatDate } from "@/lib/utils/format";
import type { SeasonMatchSummary } from "@/modules/seasons/domain/season.types";

type MatchCardProps = {
  match: SeasonMatchSummary | null;
  matchHref: string | null;
  seasonHref: string | null;
  managerTeamId: string | null | undefined;
};

export function MatchCard({ match, matchHref, seasonHref, managerTeamId }: MatchCardProps) {
  if (!match) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Naechstes Spiel
        </p>
        <h3 className="mt-2 text-xl font-semibold text-white">Kein offenes Match</h3>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Fuer die aktuelle Saison ist kein geplantes Spiel als naechster Termin sichtbar.
          Oeffne den Saisonplan, um Woche, Phase und Schedule zu pruefen.
        </p>
        {seasonHref ? (
          <Link
            href={seasonHref}
            className="mt-5 inline-flex min-h-9 items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            Saisonplan
          </Link>
        ) : null}
      </div>
    );
  }

  const isManagerHome = match.homeTeamId === managerTeamId;
  const isManagerAway = match.awayTeamId === managerTeamId;
  const score =
    match.homeScore != null && match.awayScore != null
      ? `${match.homeScore}:${match.awayScore}`
      : match.status;

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Naechstes Spiel
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            {match.homeTeamName} vs. {match.awayTeamName}
          </h3>
          <p className="mt-2 text-sm text-slate-300">
            Woche {match.week} · {match.kind} · {formatDate(match.scheduledAt)}
          </p>
        </div>
        <span className="rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-sm font-semibold text-white">
          {score}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div
          className={`rounded-lg border p-4 ${
            isManagerHome ? "border-emerald-300/25 bg-emerald-300/10" : "border-white/8 bg-black/10"
          }`}
        >
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Heim</p>
          <p className="mt-2 text-sm font-semibold text-white">{match.homeTeamName}</p>
        </div>
        <div
          className={`rounded-lg border p-4 ${
            isManagerAway ? "border-emerald-300/25 bg-emerald-300/10" : "border-white/8 bg-black/10"
          }`}
        >
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Auswaerts</p>
          <p className="mt-2 text-sm font-semibold text-white">{match.awayTeamName}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {matchHref ? (
          <Link
            href={matchHref}
            className="inline-flex min-h-9 items-center rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/15"
          >
            Spielablauf
          </Link>
        ) : null}
        {seasonHref ? (
          <Link
            href={seasonHref}
            className="inline-flex min-h-9 items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            Saisonplan
          </Link>
        ) : null}
      </div>
    </div>
  );
}
