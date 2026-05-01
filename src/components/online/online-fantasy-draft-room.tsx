"use client";

import React, { useEffect, useMemo, useState } from "react";

import {
  ONLINE_FANTASY_DRAFT_POSITIONS,
  ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS,
  type OnlineContractPlayer,
  type OnlineFantasyDraftPosition,
  type OnlineLeague,
} from "@/lib/online/online-league-service";
import type { OnlineUser } from "@/lib/online/online-user-service";

type DraftRoomFeedback = {
  tone: "success" | "warning";
  message: string;
} | null;

type OnlineFantasyDraftRoomProps = {
  league: OnlineLeague;
  currentUser: OnlineUser;
  pendingPickPlayerId: string | null;
  feedback: DraftRoomFeedback;
  onPickPlayer: (playerId: string) => void;
};

const POSITION_FILTERS: Array<OnlineFantasyDraftPosition | "ALL"> = [
  "ALL",
  ...ONLINE_FANTASY_DRAFT_POSITIONS,
];

function getPlayerByIdMap(players: OnlineContractPlayer[]) {
  return new Map(players.map((player) => [player.playerId, player]));
}

function getTeamName(league: OnlineLeague, teamId: string) {
  return (
    league.users.find((user) => user.teamId === teamId)?.teamDisplayName ??
    league.users.find((user) => user.teamId === teamId)?.teamName ??
    league.teams.find((team) => team.id === teamId)?.name ??
    teamId
  );
}

function getRosterCounts(players: OnlineContractPlayer[]) {
  return ONLINE_FANTASY_DRAFT_POSITIONS.map((position) => ({
    position,
    count: players.filter((player) => player.position === position).length,
    target: ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS[position],
  }));
}

export function OnlineFantasyDraftRoom({
  league,
  currentUser,
  pendingPickPlayerId,
  feedback,
  onPickPlayer,
}: OnlineFantasyDraftRoomProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [positionFilter, setPositionFilter] =
    useState<OnlineFantasyDraftPosition | "ALL">("ALL");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
  const draft = league.fantasyDraft;
  const playerPool = useMemo(
    () => league.fantasyDraftPlayerPool ?? [],
    [league.fantasyDraftPlayerPool],
  );
  const playersById = useMemo(() => getPlayerByIdMap(playerPool), [playerPool]);
  const currentLeagueUser = league.users.find((user) => user.userId === currentUser.userId);
  const ownTeamId = currentLeagueUser?.teamId ?? "";
  const isOwnTurn = Boolean(draft?.status === "active" && ownTeamId && draft.currentTeamId === ownTeamId);
  const pickedPlayerIds = useMemo(
    () => new Set(draft?.picks.map((pick) => pick.playerId) ?? []),
    [draft?.picks],
  );
  const availablePlayerIds = useMemo(
    () => new Set(draft?.availablePlayerIds ?? []),
    [draft?.availablePlayerIds],
  );
  const availablePlayers = playerPool
    .filter((player) => availablePlayerIds.has(player.playerId))
    .filter((player) => positionFilter === "ALL" || player.position === positionFilter)
    .sort((left, right) =>
      sortDirection === "desc"
        ? right.overall - left.overall || left.playerName.localeCompare(right.playerName)
        : left.overall - right.overall || left.playerName.localeCompare(right.playerName),
    );
  const selectedPlayer = selectedPlayerId ? playersById.get(selectedPlayerId) : null;
  const pickedPlayers = (draft?.picks ?? [])
    .map((pick) => ({
      pick,
      player: playersById.get(pick.playerId),
    }))
    .filter((entry) => entry.player)
    .slice()
    .reverse()
    .slice(0, 20);
  const ownRoster = (draft?.picks ?? [])
    .filter((pick) => pick.teamId === ownTeamId)
    .map((pick) => playersById.get(pick.playerId))
    .filter((player): player is OnlineContractPlayer => Boolean(player));
  const rosterCounts = getRosterCounts(ownRoster);

  useEffect(() => {
    if (selectedPlayerId && !availablePlayerIds.has(selectedPlayerId)) {
      setSelectedPlayerId(null);
    }
  }, [availablePlayerIds, selectedPlayerId]);

  if (!draft) {
    return null;
  }

  return (
    <section className="w-full rounded-lg border border-white/10 bg-[#07111d] p-5 shadow-2xl shadow-black/30 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
            Draft Room
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{league.name}</h1>
          <div className="mt-4 grid gap-2 text-sm text-slate-200 sm:grid-cols-2 lg:grid-cols-4">
            <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              Status: {draft.status}
            </span>
            <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              Runde: {draft.round}
            </span>
            <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              Pick: {draft.pickNumber}
            </span>
            <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              Am Zug: {draft.currentTeamId ? getTeamName(league, draft.currentTeamId) : "Noch offen"}
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-cyan-200/25 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-50">
          <p className="font-semibold">Eigenes Team</p>
          <p className="mt-1">{ownTeamId ? getTeamName(league, ownTeamId) : "Kein Team"}</p>
          <p className="mt-3 rounded-lg border border-white/10 bg-white/10 px-3 py-2 font-semibold">
            {isOwnTurn ? "Du bist am Zug" : "Warte auf anderes Team"}
          </p>
        </div>
      </div>

      {feedback ? (
        <p
          className={`mt-5 rounded-lg border px-3 py-2 text-sm font-semibold ${
            feedback.tone === "success"
              ? "border-emerald-200/25 bg-emerald-300/10 text-emerald-100"
              : "border-amber-200/25 bg-amber-300/10 text-amber-100"
          }`}
        >
          {feedback.message}
        </p>
      ) : null}

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
        <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Verfuegbare Spieler</h2>
              <p className="mt-1 text-sm text-slate-400">
                {availablePlayers.length} Spieler sichtbar, {draft.availablePlayerIds.length} im Pool.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Position
                <select
                  value={positionFilter}
                  onChange={(event) =>
                    setPositionFilter(event.target.value as OnlineFantasyDraftPosition | "ALL")
                  }
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#07111d] px-3 py-2 text-sm text-white"
                >
                  {POSITION_FILTERS.map((position) => (
                    <option key={position} value={position}>
                      {position === "ALL" ? "Alle" : position}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Overall
                <select
                  value={sortDirection}
                  onChange={(event) => setSortDirection(event.target.value as "desc" | "asc")}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#07111d] px-3 py-2 text-sm text-white"
                >
                  <option value="desc">Hoechste zuerst</option>
                  <option value="asc">Niedrigste zuerst</option>
                </select>
              </label>
            </div>
          </div>

          <div className="mt-4 max-h-[560px] overflow-auto rounded-lg border border-white/10">
            <table className="w-full min-w-[620px] border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-[#07111d] text-xs uppercase tracking-[0.14em] text-slate-400">
                <tr>
                  <th className="px-3 py-3">Spieler</th>
                  <th className="px-3 py-3">Pos</th>
                  <th className="px-3 py-3">OVR</th>
                  <th className="px-3 py-3">Alter</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {availablePlayers.slice(0, 120).map((player) => {
                  const selected = selectedPlayerId === player.playerId;

                  return (
                    <tr
                      key={player.playerId}
                      className={`cursor-pointer border-t border-white/10 transition ${
                        selected ? "bg-cyan-300/15" : "hover:bg-white/5"
                      }`}
                      onClick={() => setSelectedPlayerId(player.playerId)}
                    >
                      <td className="px-3 py-3 font-semibold text-white">{player.playerName}</td>
                      <td className="px-3 py-3 text-slate-200">{player.position}</td>
                      <td className="px-3 py-3 text-slate-200">{player.overall}</td>
                      <td className="px-3 py-3 text-slate-200">{player.age}</td>
                      <td className="px-3 py-3 text-slate-400">
                        {pickedPlayerIds.has(player.playerId) ? "Gepickt" : "Verfuegbar"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">
                {selectedPlayer ? selectedPlayer.playerName : "Kein Spieler ausgewaehlt"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {selectedPlayer
                  ? `${selectedPlayer.position} · OVR ${selectedPlayer.overall} · Alter ${selectedPlayer.age}`
                  : "Waehle einen verfuegbaren Spieler aus der Liste."}
              </p>
            </div>
            <button
              type="button"
              disabled={!isOwnTurn || !selectedPlayer || Boolean(pendingPickPlayerId)}
              onClick={() => selectedPlayer && onPickPlayer(selectedPlayer.playerId)}
              className="rounded-lg border border-emerald-200/25 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-300/16 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {pendingPickPlayerId ? "Pick wird gespeichert..." : "Pick bestaetigen"}
            </button>
          </div>
        </section>

        <aside className="grid gap-5">
          <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <h2 className="text-lg font-semibold text-white">Eigener Kaderstand</h2>
            <p className="mt-1 text-sm text-slate-400">
              {ownRoster.length} Picks fuer {ownTeamId ? getTeamName(league, ownTeamId) : "dein Team"}.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {rosterCounts.map((item) => (
                <div
                  key={item.position}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200"
                >
                  <span className="font-semibold text-white">{item.position}</span>{" "}
                  {item.count}/{item.target}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <h2 className="text-lg font-semibold text-white">Bereits gepickt</h2>
            <div className="mt-3 grid gap-2">
              {pickedPlayers.length > 0 ? (
                pickedPlayers.map(({ pick, player }) => (
                  <div
                    key={`${pick.pickNumber}-${pick.playerId}`}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  >
                    <p className="font-semibold text-white">
                      #{pick.pickNumber} {player?.playerName}
                    </p>
                    <p className="text-xs text-slate-400">
                      Runde {pick.round} · {getTeamName(league, pick.teamId)} · {player?.position}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-white/15 p-3 text-sm text-slate-400">
                  Noch keine Picks.
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
