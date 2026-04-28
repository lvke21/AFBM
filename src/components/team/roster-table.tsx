"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { formatCurrency } from "@/lib/utils/format";
import { PlayerRoleBadge } from "@/components/player/player-role-badge";
import {
  buildPlayerRole,
  PLAYER_ROLE_FILTERS,
  type PlayerRoleCategory,
} from "@/components/player/player-role-model";
import { PlayerValueBadge } from "@/components/player/player-value-badge";
import { buildPlayerValue } from "@/components/player/player-value-model";
import type { TeamPlayerSummary } from "@/modules/teams/domain/team.types";
import { PlayerCard } from "./player-card";
import { PlayerStatusBadge } from "./player-status-badge";
import { RatingBadge } from "./rating-badge";
import { RosterActionMenu } from "./roster-action-menu";
import {
  ALL_FILTER_VALUE,
  getRosterContractRisk,
  getRosterFilterOptions,
  getRosterStatusLabel,
  getVisibleRosterPlayers,
  RATING_FILTER_OPTIONS,
  selectRosterQuickInfoPlayer,
  type RosterContractRisk,
  type RosterContractRiskTone,
  type RosterRatingFilter,
  type RosterSortKey,
} from "./roster-model";

type RosterTableProps = {
  capLimit: number;
  managerControlled: boolean;
  players: TeamPlayerSummary[];
  releasePlayerAction?: (formData: FormData) => Promise<void>;
  saveGameId: string;
  teamId: string;
};

const SORT_OPTIONS: Array<{ label: string; value: RosterSortKey }> = [
  { label: "Position", value: "position" },
  { label: "OVR", value: "overall" },
  { label: "Status", value: "status" },
  { label: "Cap Hit", value: "capHit" },
];

function playerContractLine(player: TeamPlayerSummary) {
  if (!player.currentContract) {
    return "Kein Vertrag";
  }

  return `${formatCurrency(player.currentContract.capHit)} Cap · ${player.currentContract.years} Jahre`;
}

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

function ContractRiskBadge({ risk }: { risk: RosterContractRisk }) {
  return (
    <span
      className={`inline-flex min-h-6 w-fit items-center rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${contractRiskClass(risk.tone)}`}
    >
      {risk.label}
    </span>
  );
}

function playerProductionLine(player: TeamPlayerSummary) {
  const touchdowns =
    player.seasonLine.passingTouchdowns +
    player.seasonLine.rushingTouchdowns +
    player.seasonLine.receivingTouchdowns;

  if (player.positionGroupName === "Defense") {
    return `Tack ${player.seasonLine.tackles} · Sacks ${player.seasonLine.sacks} · INT ${player.seasonLine.interceptions}`;
  }

  if (player.positionCode === "QB") {
    return `Pass ${player.seasonLine.passingYards} · TD ${touchdowns} · INT ${player.seasonLine.passingInterceptions}`;
  }

  return `Rush ${player.seasonLine.rushingYards} · Rec ${player.seasonLine.receivingYards} · TD ${touchdowns}`;
}

function PreparedRosterActions({
  managerControlled,
  player,
  saveGameId,
}: {
  managerControlled: boolean;
  player: TeamPlayerSummary;
  saveGameId: string;
}) {
  const baseHref = `/app/savegames/${saveGameId}/team`;

  return (
    <div className="grid gap-2">
      <Link
        href={`/app/savegames/${saveGameId}/players/${player.id}`}
        className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
      >
        Profil oeffnen
      </Link>
      <Link
        href={`${baseHref}/depth-chart`}
        className="inline-flex min-h-10 items-center justify-center rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/15"
      >
        Depth Chart pruefen
      </Link>
      <Link
        href={`${baseHref}/contracts`}
        className="inline-flex min-h-10 items-center justify-center rounded-lg border border-sky-300/25 bg-sky-300/10 px-3 py-2 text-xs font-semibold text-sky-100 transition hover:bg-sky-300/15"
      >
        Vertrag ansehen
      </Link>
      {managerControlled ? (
        <Link
          href={`${baseHref}/trades`}
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
        >
          Trade Board oeffnen
        </Link>
      ) : (
        <span className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-xs font-semibold text-slate-400">
          Aktionen nur Managerteam
        </span>
      )}
    </div>
  );
}

function PlayerQuickInfoPanel({
  capLimit,
  managerControlled,
  player,
  saveGameId,
}: {
  capLimit: number;
  managerControlled: boolean;
  player: TeamPlayerSummary | null;
  saveGameId: string;
}) {
  if (!player) {
    return (
      <aside className="rounded-lg border border-white/10 bg-white/5 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Player Quick Info
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">Kein Spieler ausgewaehlt</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Passe Filter an, um wieder Spieler im Roster-Kontext zu sehen.
        </p>
      </aside>
    );
  }

  const role = buildPlayerRole(player);
  const value = buildPlayerValue({
    ...player,
    capHit: player.currentContract?.capHit,
  });
  const contractRisk = getRosterContractRisk(player, capLimit);
  const detailRatings = player.detailRatings.slice(0, 3);

  return (
    <aside className="h-fit rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between xl:flex-col">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Player Quick Info
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{player.fullName}</h2>
          <p className="mt-1 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
            {player.positionCode}
            {player.depthChartSlot ? ` #${player.depthChartSlot}` : ""} ·{" "}
            {getRosterStatusLabel(player.rosterStatus)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PlayerStatusBadge player={player} />
          <PlayerRoleBadge compact role={role} />
          <PlayerValueBadge compact value={value} />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <div className="rounded-lg border border-white/10 bg-black/15 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Rating
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <RatingBadge label="OVR" value={player.positionOverall} />
            <RatingBadge label="POT" value={player.potentialRating} />
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            PHYS {player.physicalOverall} · MENT {player.mentalOverall}
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/15 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Salary / Cap
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold text-white">{playerContractLine(player)}</p>
            <ContractRiskBadge risk={contractRisk} />
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            {player.currentContract
              ? `${formatCurrency(player.currentContract.yearlySalary)} Gehalt · ${formatCurrency(player.currentContract.signingBonus)} Bonus · ${contractRisk.capSharePercent}% Cap`
              : "Noch kein Vertrag fuer diesen Spieler gespeichert."}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-300">{contractRisk.description}</p>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/15 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Decision Signal
          </p>
          <p className="mt-3 text-sm font-semibold text-white">{role.summary}</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">{value.reason}</p>
          <p className="mt-2 text-xs text-slate-500">
            Fit {player.schemeFitScore ?? "-"} · Morale {player.morale} · Fatigue{" "}
            {player.fatigue}
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/15 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Saison
          </p>
          <p className="mt-3 text-sm font-semibold text-white">{playerProductionLine(player)}</p>
          <p className="mt-2 text-xs text-slate-400">
            GP {player.seasonLine.gamesPlayed}
            {detailRatings.length > 0
              ? ` · ${detailRatings.map((rating) => `${rating.label} ${rating.value}`).join(" · ")}`
              : ""}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <PreparedRosterActions
          managerControlled={managerControlled}
          player={player}
          saveGameId={saveGameId}
        />
      </div>
    </aside>
  );
}

export function RosterTable({
  capLimit,
  managerControlled,
  players,
  releasePlayerAction,
  saveGameId,
  teamId,
}: RosterTableProps) {
  const [positionCode, setPositionCode] = useState(ALL_FILTER_VALUE);
  const [playerRole, setPlayerRole] = useState<PlayerRoleCategory | typeof ALL_FILTER_VALUE>(
    ALL_FILTER_VALUE,
  );
  const [ratingTier, setRatingTier] = useState<RosterRatingFilter>(ALL_FILTER_VALUE);
  const [rosterStatus, setRosterStatus] = useState(ALL_FILTER_VALUE);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<RosterSortKey>("position");

  const filterOptions = useMemo(() => getRosterFilterOptions(players), [players]);
  const visiblePlayers = useMemo(
    () =>
      getVisibleRosterPlayers(
        players,
        {
          positionCode,
          playerRole,
          ratingTier,
          rosterStatus,
        },
        sortKey,
      ),
    [players, playerRole, positionCode, ratingTier, rosterStatus, sortKey],
  );
  const selectedPlayer = useMemo(
    () =>
      visiblePlayers.find((player) => player.id === selectedPlayerId) ??
      selectRosterQuickInfoPlayer(visiblePlayers),
    [selectedPlayerId, visiblePlayers],
  );

  if (players.length === 0) {
    return (
      <div className="rounded-lg border border-white/8 bg-black/10 p-4 text-sm text-slate-300">
        <p className="font-semibold text-white">Kein Roster geladen</p>
        <p className="mt-2">
          Fuer dieses Team sind aktuell keine Spieler vorhanden. Verpflichtungen oder alte
          Savegame-Daten sollten zuerst im Markt geprueft werden.
        </p>
        <Link
          href={`/app/savegames/${saveGameId}/free-agents`}
          className="mt-4 inline-flex min-h-9 items-center rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/15"
        >
          Free Agency oeffnen
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] xl:items-end">
        <label className="grid gap-2 text-sm text-slate-300">
          Position
          <select
            value={positionCode}
            onChange={(event) => setPositionCode(event.target.value)}
            className="min-h-10 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          >
            <option value={ALL_FILTER_VALUE}>Alle Positionen</option>
            {filterOptions.positions.map((position) => (
              <option key={position} value={position}>
                {position}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm text-slate-300">
          Rating
          <select
            value={ratingTier}
            onChange={(event) => setRatingTier(event.target.value as RosterRatingFilter)}
            className="min-h-10 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          >
            {RATING_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm text-slate-300">
          Rolle
          <select
            value={playerRole}
            onChange={(event) =>
              setPlayerRole(event.target.value as PlayerRoleCategory | typeof ALL_FILTER_VALUE)
            }
            className="min-h-10 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          >
            <option value={ALL_FILTER_VALUE}>Alle Rollen</option>
            {PLAYER_ROLE_FILTERS.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm text-slate-300">
          Status
          <select
            value={rosterStatus}
            onChange={(event) => setRosterStatus(event.target.value)}
            className="min-h-10 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          >
            <option value={ALL_FILTER_VALUE}>Alle Status</option>
            {filterOptions.statuses.map((status) => (
              <option key={status} value={status}>
                {getRosterStatusLabel(status)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm text-slate-300">
          Sortierung
          <select
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as RosterSortKey)}
            className="min-h-10 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 md:col-span-2 xl:col-span-1">
          {visiblePlayers.length}/{players.length} Spieler
        </div>
      </div>

      {visiblePlayers.length === 0 ? (
        <div className="rounded-lg border border-white/8 bg-black/10 p-4 text-sm text-slate-300">
          Keine Spieler passen zu den aktuellen Filtern.
        </div>
      ) : (
        <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0">
            <div className="grid gap-3 xl:hidden">
              {visiblePlayers.map((player) => (
                <PlayerCard
                  key={player.id}
                  capLimit={capLimit}
                  managerControlled={managerControlled}
                  player={player}
                  releasePlayerAction={releasePlayerAction}
                  saveGameId={saveGameId}
                  teamId={teamId}
                />
              ))}
            </div>

            <div className="hidden overflow-x-auto xl:block">
              <table className="min-w-full text-left text-sm text-slate-200">
                <thead className="text-slate-400">
                  <tr>
                    <th className="px-3 py-3">Spieler</th>
                    <th className="px-3 py-3">Rolle</th>
                    <th className="px-3 py-3">Rating</th>
                    <th className="px-3 py-3">Evaluation</th>
                    <th className="px-3 py-3">Vertrag</th>
                    <th className="px-3 py-3">Saison</th>
                    <th className="px-3 py-3">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePlayers.map((player) => {
                    const role = buildPlayerRole(player);
                    const value = buildPlayerValue({
                      ...player,
                      capHit: player.currentContract?.capHit,
                    });
                    const contractRisk = getRosterContractRisk(player, capLimit);
                    const selected = selectedPlayer?.id === player.id;

                    return (
                    <tr
                      key={player.id}
                      className={`border-t border-white/8 ${
                        selected
                          ? "bg-emerald-300/8"
                          : contractRisk.isExpiring
                            ? "bg-amber-300/5 hover:bg-amber-300/8"
                            : "hover:bg-white/4"
                      }`}
                    >
                      <td className="px-3 py-3 align-top">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-white">{player.fullName}</span>
                          {player.captainFlag ? (
                            <span className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-2 py-0.5 text-[10px] font-semibold text-amber-100">
                              C
                            </span>
                          ) : null}
                          <PlayerStatusBadge player={player} />
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          {player.age} Jahre · {player.yearsPro} Years Pro ·{" "}
                          {getRosterStatusLabel(player.rosterStatus)}
                        </p>
                        {player.injuryName ? (
                          <p className="mt-1 text-xs text-rose-300">{player.injuryName}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <PlayerRoleBadge role={role} />
                        <span className="ml-2 inline-flex">
                          <PlayerValueBadge compact value={value} />
                        </span>
                        <p className="mt-2 text-xs font-semibold text-slate-300">{role.summary}</p>
                        <p className="mt-1 text-xs text-slate-400">{value.reason}</p>
                        <p className="font-semibold text-white">
                          {player.positionCode}
                          {player.depthChartSlot ? ` #${player.depthChartSlot}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {getRosterStatusLabel(player.rosterStatus)} · {player.positionGroupName}
                        </p>
                        {player.secondaryPositionCode ? (
                          <p className="mt-1 text-xs text-slate-500">
                            2nd {player.secondaryPositionCode}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="flex flex-wrap gap-2">
                          <RatingBadge label="OVR" value={player.positionOverall} />
                          <RatingBadge label="POT" value={player.potentialRating} />
                        </div>
                        <p className="mt-2 text-xs text-slate-400">
                          PHYS {player.physicalOverall} · MENT {player.mentalOverall}
                        </p>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <p>{player.schemeFitName ?? "Kein Scheme Fit"}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          Fit {player.schemeFitScore ?? "-"} · Morale {player.morale} · Fatigue{" "}
                          {player.fatigue}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {player.detailRatings
                            .slice(0, 3)
                            .map((rating) => `${rating.label} ${rating.value}`)
                            .join(" · ") || "Keine Detailwerte"}
                        </p>
                      </td>
                      <td className="px-3 py-3 align-top">
                        {player.currentContract ? (
                          <>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-white">
                                {formatCurrency(player.currentContract.capHit)}
                              </p>
                              <ContractRiskBadge risk={contractRisk} />
                            </div>
                            <p className="mt-1 text-xs text-slate-400">
                              {player.currentContract.years} Jahre ·{" "}
                              {formatCurrency(player.currentContract.yearlySalary)} Gehalt
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {contractRisk.capSharePercent}% Cap · {contractRisk.description}
                            </p>
                          </>
                        ) : (
                          <div className="space-y-2">
                            <ContractRiskBadge risk={contractRisk} />
                            <p className="text-xs text-slate-400">{contractRisk.description}</p>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 align-top text-xs text-slate-300">
                        <p>
                          GP {player.seasonLine.gamesPlayed} · Rush{" "}
                          {player.seasonLine.rushingYards} · Rec{" "}
                          {player.seasonLine.receivingYards}
                        </p>
                        <p className="mt-1">
                          Pass {player.seasonLine.passingYards} · TD{" "}
                          {player.seasonLine.passingTouchdowns +
                            player.seasonLine.rushingTouchdowns +
                            player.seasonLine.receivingTouchdowns}
                        </p>
                        <p className="mt-1">
                          Tack {player.seasonLine.tackles} · Sacks {player.seasonLine.sacks} ·
                          INT {player.seasonLine.interceptions}
                        </p>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => setSelectedPlayerId(player.id)}
                            className="inline-flex min-h-9 items-center rounded-lg border border-sky-300/25 bg-sky-300/10 px-3 py-2 text-xs font-semibold text-sky-100 transition hover:bg-sky-300/15"
                          >
                            Quick Info
                          </button>
                          <RosterActionMenu
                            managerControlled={managerControlled}
                            player={player}
                            releasePlayerAction={releasePlayerAction}
                            saveGameId={saveGameId}
                            teamId={teamId}
                          />
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <PlayerQuickInfoPanel
            capLimit={capLimit}
            managerControlled={managerControlled}
            player={selectedPlayer}
            saveGameId={saveGameId}
          />
        </div>
      )}
    </div>
  );
}
