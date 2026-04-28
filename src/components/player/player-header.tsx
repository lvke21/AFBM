import Link from "next/link";

import { formatDate } from "@/lib/utils/format";
import type { PlayerDetail } from "@/modules/players/domain/player.types";
import { PlayerRoleBadge } from "./player-role-badge";
import { buildPlayerRole } from "./player-role-model";
import {
  getPlayerPositionLabel,
  getPlayerStatusLabel,
  getPlayerTeamLabel,
} from "./player-detail-model";

type PlayerHeaderProps = {
  player: PlayerDetail;
  saveGameId: string;
};

export function PlayerHeader({ player, saveGameId }: PlayerHeaderProps) {
  const positionLabel = getPlayerPositionLabel(player);
  const statusLabel = getPlayerStatusLabel(player);
  const role = buildPlayerRole({
    age: player.age,
    archetypeName: player.roster?.archetypeName,
    depthChartSlot: player.roster?.depthChartSlot,
    developmentFocus: player.roster?.developmentFocus,
    positionCode: player.roster?.primaryPositionCode,
    positionOverall: player.evaluation?.positionOverall,
    potentialRating: player.evaluation?.potentialRating,
    rosterStatus: player.roster?.rosterStatus,
    schemeFitName: player.roster?.schemeFitName,
    schemeFitScore: player.schemeFitScore,
    secondaryPositionCode: player.roster?.secondaryPositionCode,
  });

  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-2 py-1 text-xs font-semibold text-emerald-100">
              {positionLabel}
            </span>
            <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold text-slate-200">
              {statusLabel}
            </span>
            <PlayerRoleBadge role={role} />
          </div>
          <h1 className="mt-3 text-3xl font-semibold text-white">{player.fullName}</h1>
          <p className="mt-2 text-sm text-slate-300">
            {player.age} Jahre · {player.yearsPro} Years Pro · {player.heightCm} cm /{" "}
            {player.weightKg} kg
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {player.college ?? "Kein College"} · {player.nationality ?? "USA"} · Trait{" "}
            {player.developmentTrait}
          </p>
          <p className="mt-3 text-sm font-semibold text-slate-200">{role.summary}</p>
          <p className="mt-1 text-sm text-slate-400">{role.description}</p>
        </div>

        <div className="rounded-lg border border-white/8 bg-black/10 p-4 text-sm text-slate-300 lg:min-w-64">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Team
          </p>
          {player.team ? (
            <Link
              href={`/app/savegames/${saveGameId}/team`}
              className="mt-2 block text-lg font-semibold text-white underline-offset-4 hover:underline"
            >
              {player.team.name}
            </Link>
          ) : (
            <p className="mt-2 text-lg font-semibold text-white">{getPlayerTeamLabel(player)}</p>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Morale {player.morale} · Fatigue {player.fatigue}
          </p>
          {player.injuryName ? (
            <p className="mt-2 text-xs text-amber-100">
              {player.injuryName}
              {player.injuryEndsOn ? ` bis ${formatDate(player.injuryEndsOn)}` : ""}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
