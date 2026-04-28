"use client";

import { formatCurrency } from "@/lib/utils/format";
import { PlayerRoleBadge } from "@/components/player/player-role-badge";
import { buildPlayerRole } from "@/components/player/player-role-model";
import { PlayerValueBadge } from "@/components/player/player-value-badge";
import { buildPlayerValue } from "@/components/player/player-value-model";
import type { TeamPlayerSummary } from "@/modules/teams/domain/team.types";
import { PlayerStatusBadge } from "./player-status-badge";
import { RatingBadge } from "./rating-badge";
import { RosterActionMenu } from "./roster-action-menu";
import {
  getRosterContractRisk,
  getRosterStatusLabel,
  type RosterContractRiskTone,
} from "./roster-model";

type PlayerCardProps = {
  capLimit: number;
  managerControlled: boolean;
  player: TeamPlayerSummary;
  releasePlayerAction?: (formData: FormData) => Promise<void>;
  saveGameId: string;
  teamId: string;
};

function contractRiskClass(tone: RosterContractRiskTone) {
  if (tone === "danger") {
    return "border-rose-300/30 bg-rose-300/10 text-rose-100";
  }

  if (tone === "warning") {
    return "border-amber-300/30 bg-amber-300/10 text-amber-100";
  }

  if (tone === "positive") {
    return "border-emerald-300/30 bg-emerald-300/10 text-emerald-100";
  }

  return "border-white/10 bg-white/5 text-slate-200";
}

export function PlayerCard({
  capLimit,
  managerControlled,
  player,
  releasePlayerAction,
  saveGameId,
  teamId,
}: PlayerCardProps) {
  const role = buildPlayerRole(player);
  const value = buildPlayerValue({
    ...player,
    capHit: player.currentContract?.capHit,
  });
  const contractRisk = getRosterContractRisk(player, capLimit);

  return (
    <article
      className={`rounded-lg border p-4 ${
        contractRisk.isExpiring
          ? "border-amber-300/25 bg-amber-300/8"
          : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-white">{player.fullName}</h3>
            {player.captainFlag ? (
              <span className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-2 py-0.5 text-[10px] font-semibold text-amber-100">
                C
              </span>
            ) : null}
            <PlayerStatusBadge player={player} />
            <PlayerRoleBadge compact role={role} />
            <PlayerValueBadge compact value={value} />
          </div>
          <p className="mt-1 text-sm text-slate-300">
            {player.positionCode}
            {player.depthChartSlot ? ` #${player.depthChartSlot}` : ""} · {player.positionName}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {player.age} Jahre · {player.yearsPro} Years Pro · {getRosterStatusLabel(player.rosterStatus)}
          </p>
          <p className="mt-2 text-xs font-semibold text-slate-300">{role.summary}</p>
          <p className="mt-1 text-xs text-slate-400">{value.reason}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RatingBadge label="OVR" value={player.positionOverall} />
          <RatingBadge label="POT" value={player.potentialRating} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-white/8 bg-black/10 p-3">
          <p className="text-xs text-slate-400">Evaluation</p>
          <p className="mt-1 text-sm text-slate-200">
            PHYS {player.physicalOverall} · MENT {player.mentalOverall}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Fit {player.schemeFitScore ?? "-"} · {player.schemeFitName ?? "Kein Scheme Fit"}
          </p>
        </div>
        <div className="rounded-lg border border-white/8 bg-black/10 p-3">
          <p className="text-xs text-slate-400">Vertrag</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex min-h-6 items-center rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${contractRiskClass(contractRisk.tone)}`}
            >
              {contractRisk.label}
            </span>
            {contractRisk.isExpiring ? (
              <span className="text-xs font-semibold text-amber-100">Auslaufend</span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-slate-200">
            {player.currentContract ? `${player.currentContract.years} Jahre` : "Kein Vertrag"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {player.currentContract
              ? `${formatCurrency(player.currentContract.capHit)} Cap Hit · ${contractRisk.capSharePercent}% Cap`
              : contractRisk.description}
          </p>
        </div>
        <div className="rounded-lg border border-white/8 bg-black/10 p-3">
          <p className="text-xs text-slate-400">Saison</p>
          <p className="mt-1 text-sm text-slate-200">
            GP {player.seasonLine.gamesPlayed} · TD{" "}
            {player.seasonLine.passingTouchdowns +
              player.seasonLine.rushingTouchdowns +
              player.seasonLine.receivingTouchdowns}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Tack {player.seasonLine.tackles} · Sacks {player.seasonLine.sacks}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <RosterActionMenu
          managerControlled={managerControlled}
          player={player}
          releasePlayerAction={releasePlayerAction}
          saveGameId={saveGameId}
          teamId={teamId}
        />
      </div>
    </article>
  );
}
