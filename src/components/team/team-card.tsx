import Link from "next/link";

import { formatCurrency } from "@/lib/utils/format";
import type { TeamDetail } from "@/modules/teams/domain/team.types";
import { getRosterSummary } from "./team-overview-model";

type TeamCardProps = {
  freeAgencyHref: string | null;
  team: TeamDetail;
};

export function TeamCard({ freeAgencyHref, team }: TeamCardProps) {
  const rosterSummary = getRosterSummary(team.players);

  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Teamzustand
            </p>
            {team.managerControlled ? (
              <span className="rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-2 py-1 text-xs font-semibold text-emerald-100">
                Dein Team
              </span>
            ) : null}
          </div>
          <h2 className="mt-3 text-3xl font-semibold text-white">{team.name}</h2>
          <p className="mt-2 text-sm text-slate-300">
            {team.abbreviation} · {team.conferenceName} · {team.divisionName}
          </p>
        </div>

        {freeAgencyHref ? (
          <Link
            href={freeAgencyHref}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/15"
          >
            Free Agency oeffnen
          </Link>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-white/8 bg-black/10 p-4">
          <p className="text-sm text-slate-400">Record</p>
          <p className="mt-2 text-2xl font-semibold text-white">{team.currentRecord}</p>
        </div>
        <div className="rounded-lg border border-white/8 bg-black/10 p-4">
          <p className="text-sm text-slate-400">Overall</p>
          <p className="mt-2 text-2xl font-semibold text-white">{team.overallRating}</p>
        </div>
        <div className="rounded-lg border border-white/8 bg-black/10 p-4">
          <p className="text-sm text-slate-400">Roster</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {rosterSummary.playerCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {rosterSummary.starters} Starter · AVG {rosterSummary.averageOverall}
          </p>
        </div>
        <div className="rounded-lg border border-white/8 bg-black/10 p-4">
          <p className="text-sm text-slate-400">Finanzen</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {formatCurrency(team.salaryCapSpace)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Cash {formatCurrency(team.cashBalance)}
          </p>
        </div>
      </div>

      {rosterSummary.injured > 0 ? (
        <div className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/8 p-4 text-sm text-amber-50">
          {rosterSummary.injured} Spieler sind nicht voll gesund. Pruefe vor dem naechsten Spiel
          Roster-Tiefe und Starterrollen.
        </div>
      ) : null}
    </section>
  );
}
