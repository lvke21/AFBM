import Link from "next/link";

import type { TeamNeedSummary } from "@/modules/teams/domain/team.types";
import { sortTeamNeeds } from "./team-overview-model";

type TeamNeedsPanelProps = {
  compact?: boolean;
  freeAgencyHref: string | null;
  needs: TeamNeedSummary[];
  teamHref?: string | null;
};

export function TeamNeedsPanel({
  compact = false,
  freeAgencyHref,
  needs,
  teamHref = null,
}: TeamNeedsPanelProps) {
  const sortedNeeds = compact ? sortTeamNeeds(needs).slice(0, 5) : sortTeamNeeds(needs);

  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Schwachstellen
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">Priorisierte Team Needs</h2>
          <p className="mt-2 text-sm text-slate-300">
            Sortiert nach Bedarf, Starter-Qualitaet und Positionsdichte.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {freeAgencyHref ? (
            <Link
              href={freeAgencyHref}
              className="inline-flex min-h-9 items-center rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/15"
            >
              Markt pruefen
            </Link>
          ) : null}
          {teamHref ? (
            <Link
              href={teamHref}
              className="inline-flex min-h-9 items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              Team oeffnen
            </Link>
          ) : null}
        </div>
      </div>

      {sortedNeeds.length > 0 ? (
        <div className="mt-5 space-y-3">
          {sortedNeeds.map((need, index) => (
            <div key={need.positionCode} className="rounded-lg border border-white/8 bg-black/10 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {index + 1}. {need.positionCode} · {need.positionName}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Starter {need.starterAverage} · Scheme Fit {need.starterSchemeFit ?? "-"}
                  </p>
                  {need.needScore >= 7 || (need.starterSchemeFit ?? 100) < 55 ? (
                    <p className="mt-2 text-xs font-semibold text-emerald-100">
                      Value Opportunity: Markt nach gutem Fit pruefen
                    </p>
                  ) : null}
                </div>
                <span className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-xs font-semibold text-amber-100">
                  Bedarf {need.needScore}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-amber-300"
                    style={{ width: `${Math.min(100, Math.max(8, need.needScore * 10))}%` }}
                  />
                </div>
                <p className="w-20 text-right text-xs text-slate-400">
                  {need.playerCount}/{need.targetCount}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-emerald-300/20 bg-emerald-300/8 p-4 text-sm text-emerald-50">
          Keine akuten Team Needs. Das Roster hat aktuell keine priorisierten Luecken.
        </div>
      )}
    </section>
  );
}
