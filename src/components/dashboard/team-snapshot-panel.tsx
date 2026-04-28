import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/utils/format";
import type { TeamDetail, TeamPlayerSummary } from "@/modules/teams/domain/team.types";

type TeamSnapshotPanelProps = {
  featuredPlayer: TeamPlayerSummary | null;
  playerHref: string | null;
  team: TeamDetail | null;
  teamHref: string | null;
};

export function TeamSnapshotPanel({
  featuredPlayer,
  playerHref,
  team,
  teamHref,
}: TeamSnapshotPanelProps) {
  const topNeed = [...(team?.teamNeeds ?? [])].sort((left, right) => right.needScore - left.needScore)[0] ?? null;

  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Teamueberblick
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            {team?.name ?? "Kein Manager-Team"}
          </h2>
        </div>
        <StatusBadge label={team?.managerControlled ? "Dein Team" : "Kontext"} tone="active" />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-black/15 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">OVR</p>
          <p className="mt-2 text-3xl font-semibold text-white">{team?.overallRating ?? "n/a"}</p>
          <p className="mt-1 text-xs text-slate-400">{team?.currentRecord ?? "Record offen"}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/15 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Cap Space</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {team ? formatCurrency(team.salaryCapSpace) : "n/a"}
          </p>
          <p className="mt-1 text-xs text-slate-400">Roster: {team?.players.length ?? 0}</p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-black/15 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Groesster Need
        </p>
        <p className="mt-2 text-base font-semibold text-white">
          {topNeed ? `${topNeed.positionCode} · ${topNeed.positionName}` : "Kein harter Need"}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          {topNeed
            ? `Need Score ${topNeed.needScore}, Starter-Schnitt ${topNeed.starterAverage}.`
            : "Aktuell ist kein priorisierter Kaderbedarf sichtbar."}
        </p>
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-black/15 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Roster Fokus
        </p>
        {featuredPlayer && playerHref ? (
          <Link
            href={playerHref}
            className="mt-2 block text-base font-semibold text-white underline-offset-4 hover:underline"
          >
            {featuredPlayer.fullName}
          </Link>
        ) : (
          <p className="mt-2 text-base font-semibold text-white">Kein Spieler verfuegbar</p>
        )}
        <p className="mt-2 text-sm text-slate-300">
          {featuredPlayer
            ? `${featuredPlayer.positionCode} · OVR ${featuredPlayer.positionOverall} · POT ${featuredPlayer.potentialRating}`
            : "Spieler-Detail wird angezeigt, sobald Roster-Daten geladen sind."}
        </p>
      </div>

      {teamHref ? (
        <Link
          href={teamHref}
          className="mt-5 inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Team bearbeiten
        </Link>
      ) : (
        <span className="mt-5 inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-white/10 bg-black/15 px-4 py-2 text-sm font-semibold text-slate-400">
          Team nicht verfuegbar
        </span>
      )}
    </section>
  );
}
