"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PlayerValueBadge } from "@/components/player/player-value-badge";
import { buildPlayerValue } from "@/components/player/player-value-model";
import { formatCurrency } from "@/lib/utils/format";

import {
  buildTradeBoardState,
  estimateTradeBoardBalance,
  getTradeBoardTargetsForTeam,
  type TradeBoardDecisionTone,
  type TradeBoardPlayer,
} from "./trade-board-model";
import type { TradeMarket } from "./trade-model";

type TradeBoardProps = {
  market: TradeMarket;
  saveGameId: string;
};

function PlayerPickCard({
  included,
  onToggle,
  player,
}: {
  included: boolean;
  onToggle: (playerId: string) => void;
  player: TradeBoardPlayer;
}) {
  const value = buildPlayerValue({
    age: player.age,
    capHit: player.capHit,
    depthChartSlot: player.depthChartSlot,
    positionOverall: player.positionOverall,
    potentialRating: player.potentialRating,
    rosterStatus: player.rosterStatus,
    schemeFitScore: player.schemeFitScore,
    teamNeedScore: player.managerNeedScore,
  });

  return (
    <button
      type="button"
      aria-pressed={included}
      onClick={() => onToggle(player.id)}
      className={[
        "w-full rounded-lg border p-4 text-left transition",
        included
          ? "border-emerald-300/40 bg-emerald-300/10"
          : "border-white/10 bg-black/15 hover:border-white/20 hover:bg-white/8",
      ].join(" ")}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-white">{player.fullName}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            {player.teamAbbreviation} · {player.positionCode}
            {player.depthChartSlot ? ` #${player.depthChartSlot}` : ""} ·{" "}
            {player.rosterStatus.replaceAll("_", " ")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PlayerValueBadge compact value={value} />
          <span
            className={[
              "rounded-lg border px-2 py-1 text-xs font-semibold",
              included
                ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                : "border-white/10 bg-white/5 text-slate-300",
            ].join(" ")}
          >
            {included ? "Entfernen" : "Hinzufuegen"}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-white/8 bg-black/15 p-3">
          <p className="text-xs text-slate-500">OVR / POT</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {player.positionOverall}/{player.potentialRating}
          </p>
        </div>
        <div className="rounded-lg border border-white/8 bg-black/15 p-3">
          <p className="text-xs text-slate-500">Cap Hit</p>
          <p className="mt-1 text-sm font-semibold text-white">{formatCurrency(player.capHit)}</p>
        </div>
        <div className="rounded-lg border border-white/8 bg-black/15 p-3">
          <p className="text-xs text-slate-500">Team Need</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {player.managerNeedScore ?? "n/a"}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-white/8 bg-black/15 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Decision Summary
        </p>
        <p className="mt-1 text-sm font-semibold text-white">{player.decisionSummary.label}</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          {player.decisionSummary.description}
        </p>
      </div>
    </button>
  );
}

function balanceToneClass(tone: TradeBoardDecisionTone) {
  if (tone === "positive") {
    return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  }

  if (tone === "warning") {
    return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  }

  if (tone === "danger") {
    return "border-rose-300/25 bg-rose-300/10 text-rose-100";
  }

  return "border-white/10 bg-white/5 text-slate-300";
}

function SelectedPlayerList({
  label,
  onRemove,
  players,
  saveGameId,
}: {
  label: string;
  onRemove: (playerId: string) => void;
  players: TradeBoardPlayer[];
  saveGameId: string;
}) {
  if (players.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-black/15 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </p>
        <p className="mt-2 text-sm text-slate-400">Keine Auswahl.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-black/15 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <div className="mt-3 space-y-3">
        {players.map((player) => (
          <div key={player.id} className="rounded-lg border border-white/8 bg-white/5 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white">{player.fullName}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {player.teamAbbreviation} · {player.positionCode} · OVR {player.positionOverall} ·{" "}
                  {formatCurrency(player.capHit)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(player.id)}
                className="shrink-0 rounded-lg border border-white/10 bg-black/15 px-2 py-1 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Entfernen
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/app/savegames/${saveGameId}/players/${player.id}`}
                className="rounded-lg border border-white/10 bg-black/15 px-2 py-1 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Profil
              </Link>
              <span className={`rounded-lg border px-2 py-1 text-xs font-semibold ${balanceToneClass(player.decisionSummary.tone)}`}>
                {player.decisionSummary.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TradeBoard({ market, saveGameId }: TradeBoardProps) {
  const board = useMemo(() => buildTradeBoardState(market), [market]);
  const [ownPlayerIds, setOwnPlayerIds] = useState<string[]>(
    board.defaultOwnPlayerId ? [board.defaultOwnPlayerId] : [],
  );
  const [partnerTeamId, setPartnerTeamId] = useState<string>("ALL");
  const [targetPlayerIds, setTargetPlayerIds] = useState<string[]>(
    board.defaultTargetPlayerId ? [board.defaultTargetPlayerId] : [],
  );
  const visibleTargets = useMemo(
    () => getTradeBoardTargetsForTeam(board, partnerTeamId),
    [board, partnerTeamId],
  );
  const selectedOwnPlayers = board.ownPlayers.filter((player) => ownPlayerIds.includes(player.id));
  const selectedTargetPlayers = board.targetPlayers.filter((player) =>
    targetPlayerIds.includes(player.id),
  );
  const selectedPartnerTeam =
    selectedTargetPlayers.length === 1
      ? board.partnerTeams.find((team) => team.id === selectedTargetPlayers[0]?.teamId) ?? null
      : partnerTeamId === "ALL"
        ? null
        : board.partnerTeams.find((team) => team.id === partnerTeamId) ?? null;
  const balance = estimateTradeBoardBalance({
    managerTeam: board.managerTeam,
    ownPlayers: selectedOwnPlayers,
    targetPlayers: selectedTargetPlayers,
  });

  function toggleOwnPlayer(playerId: string) {
    setOwnPlayerIds((current) =>
      current.includes(playerId)
        ? current.filter((currentId) => currentId !== playerId)
        : [...current, playerId],
    );
  }

  function toggleTargetPlayer(playerId: string) {
    setTargetPlayerIds((current) =>
      current.includes(playerId)
        ? current.filter((currentId) => currentId !== playerId)
        : [...current, playerId],
    );
  }

  function handlePartnerTeamChange(nextTeamId: string) {
    const nextTargets = getTradeBoardTargetsForTeam(board, nextTeamId);

    setPartnerTeamId(nextTeamId);
    setTargetPlayerIds(nextTargets[0] ? [nextTargets[0].id] : []);
  }

  if (!board.hasTradePool) {
    return (
      <section className="rounded-lg border border-white/10 bg-white/5 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Trade Board
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">Keine Trade-Auswahl moeglich</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
          {board.emptyMessage}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={`/app/savegames/${saveGameId}/team/roster`}
            className="inline-flex min-h-10 items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            Roster pruefen
          </Link>
          <Link
            href={`/app/savegames/${saveGameId}/team/contracts`}
            className="inline-flex min-h-10 items-center rounded-lg border border-sky-300/25 bg-sky-300/10 px-3 py-2 text-xs font-semibold text-sky-100 transition hover:bg-sky-300/15"
          >
            Contracts ansehen
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Trade Board
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">Trade Vorbereitung</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Lokale Auswahl fuer moegliche Trade-Ideen. Dieser Screen fuehrt keine Trades aus.
          </p>
        </div>
        <span className="w-fit rounded-lg border border-sky-300/25 bg-sky-300/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-sky-100">
          UI Draft · keine Action
        </span>
      </div>

      <div className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_24rem]">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
              Eigene Spieler
            </h3>
            <span className="text-xs text-slate-500">{board.ownPlayers.length} Kandidaten</span>
          </div>
          <div className="space-y-3">
              {board.ownPlayers.slice(0, 10).map((player) => (
                <PlayerPickCard
                  included={ownPlayerIds.includes(player.id)}
                  key={player.id}
                  onToggle={toggleOwnPlayer}
                  player={player}
                />
              ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
                Potenzielle Targets
              </h3>
              <p className="mt-1 text-xs text-slate-500">{visibleTargets.length} sichtbar</p>
            </div>
            <label className="grid gap-2 text-sm text-slate-300">
              Team
              <select
                value={partnerTeamId}
                onChange={(event) => handlePartnerTeamChange(event.target.value)}
                className="min-h-10 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
              >
                <option value="ALL">Alle Teams</option>
                {board.partnerTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.abbreviation} · Cap {Math.round(team.salaryCapSpace / 1_000_000)}M
                  </option>
                ))}
              </select>
            </label>
          </div>
          {visibleTargets.length > 0 ? (
            <div className="space-y-3">
              {visibleTargets.slice(0, 10).map((player) => (
                <PlayerPickCard
                  included={targetPlayerIds.includes(player.id)}
                  key={player.id}
                  onToggle={toggleTargetPlayer}
                  player={player}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-white/10 bg-black/15 p-4 text-sm text-slate-400">
              Dieses Team hat aktuell keine sichtbaren Trade Targets.
            </p>
          )}
        </div>

        <aside className="h-fit rounded-lg border border-white/10 bg-black/15 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Trade Sketch
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">Auswahlstruktur</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Nur Vorbereitung: keine Akzeptanzpruefung, keine Persistenz, keine Ausfuehrung.
          </p>

          <div className="mt-5 space-y-3">
            <SelectedPlayerList
              label="Abgeben"
              onRemove={toggleOwnPlayer}
              players={selectedOwnPlayers}
              saveGameId={saveGameId}
            />
            <SelectedPlayerList
              label="Anfragen"
              onRemove={toggleTargetPlayer}
              players={selectedTargetPlayers}
              saveGameId={saveGameId}
            />
          </div>

          <div className={`mt-5 rounded-lg border p-4 ${balanceToneClass(balance.tone)}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em]">
              Trade Balance Hinweis
            </p>
            <p className="mt-2 text-lg font-semibold text-white">{balance.label}</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">{balance.description}</p>
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <span>Outgoing Value {balance.outgoingValue}</span>
              <span>Incoming Value {balance.incomingValue}</span>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Kontext
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Partner: {selectedPartnerTeam?.abbreviation ?? "mehrere Teams"}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              Cap Vergleich:{" "}
              {balance.capDelta > 0
                ? `+${formatCurrency(balance.capDelta)} incoming`
                : `${formatCurrency(balance.capDelta)} incoming`}
            </p>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Fuer echte Angebote bleibt eine spaetere Action-Schicht noetig.
            </p>
          </div>

          <div className="mt-5 grid gap-2">
            <Link
              href={`/app/savegames/${saveGameId}/team/roster`}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              Roster oeffnen
            </Link>
            <Link
              href={`/app/savegames/${saveGameId}/team/contracts`}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-sky-300/25 bg-sky-300/10 px-3 py-2 text-xs font-semibold text-sky-100 transition hover:bg-sky-300/15"
            >
              Cap Hits pruefen
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
