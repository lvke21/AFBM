"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PlayerValueBadge } from "@/components/player/player-value-badge";
import { buildPlayerValue } from "@/components/player/player-value-model";
import {
  reviewTradeOffer,
  type TradeMarket,
  type TradeOfferKind,
} from "./trade-model";

type TradeOfferCenterProps = {
  executeTradeOfferAction: (formData: FormData) => Promise<void>;
  market: TradeMarket;
  saveGameId: string;
  teamId: string;
};

const OFFER_TYPES: Array<{ value: TradeOfferKind; label: string }> = [
  { value: "player-player", label: "Spieler fuer Spieler" },
  { value: "send-for-future", label: "Spieler fuer Future Value" },
  { value: "receive-for-future", label: "Future Value fuer Spieler" },
];

export function TradeOfferCenter({
  executeTradeOfferAction,
  market,
  saveGameId,
  teamId,
}: TradeOfferCenterProps) {
  const ownPlayers = market.players.filter((player) => player.teamId === market.managerTeamId);
  const targetPlayers = market.players.filter((player) => player.teamId !== market.managerTeamId);
  const partnerTeams = market.teams.filter((team) => team.id !== market.managerTeamId);
  const [kind, setKind] = useState<TradeOfferKind>("player-player");
  const [managerPlayerId, setManagerPlayerId] = useState(ownPlayers[0]?.id ?? "");
  const [targetPlayerId, setTargetPlayerId] = useState(targetPlayers[0]?.id ?? "");
  const [partnerTeamId, setPartnerTeamId] = useState(partnerTeams[0]?.id ?? "");
  const review = useMemo(
    () =>
      reviewTradeOffer(market, {
        kind,
        managerPlayerId: kind === "receive-for-future" ? null : managerPlayerId || null,
        partnerTeamId: kind === "send-for-future" ? partnerTeamId || null : null,
        targetPlayerId: kind === "send-for-future" ? null : targetPlayerId || null,
      }),
    [kind, managerPlayerId, market, partnerTeamId, targetPlayerId],
  );
  const selectedTarget = targetPlayers.find((player) => player.id === targetPlayerId) ?? null;
  const selectedOwn = ownPlayers.find((player) => player.id === managerPlayerId) ?? null;
  const selectedPlayers = [selectedOwn, selectedTarget].filter(
    (player): player is NonNullable<typeof selectedOwn> => player !== null,
  );
  const canExecute = review.status === "Accepted";
  const hasTradePool =
    ownPlayers.length > 0 && partnerTeams.length > 0 && targetPlayers.length > 0;

  if (!hasTradePool) {
    return (
      <section className="rounded-lg border border-white/10 bg-white/5 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Trade Offers
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">Keine Trade-Kandidaten</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
          Fuer ein Angebot braucht dein Team mindestens einen abgebbaren Spieler und die Liga
          mindestens ein passendes Zielteam mit Spielerpool. Es wurde kein Trade erzeugt.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/app/savegames/${saveGameId}/team/roster`}
            className="inline-flex min-h-9 items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            Roster pruefen
          </Link>
          <Link
            href={`/app/savegames/${saveGameId}/inbox`}
            className="inline-flex min-h-9 items-center rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/15"
          >
            Inbox oeffnen
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Trade Offers
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">Simple Trade Desk</h2>
          <p className="mt-2 text-sm text-slate-300">
            V1 prueft Value, Need, Cap und Roster-Limits ohne Verhandlungen.
          </p>
        </div>
        <span
          className={[
            "rounded-lg border px-3 py-2 text-sm font-semibold",
            review.status === "Accepted"
              ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
              : review.status === "Close"
                ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                : "border-rose-300/25 bg-rose-300/10 text-rose-100",
          ].join(" ")}
        >
          {review.status}
        </span>
      </div>

      <form action={executeTradeOfferAction} className="mt-5 grid gap-4">
        <input type="hidden" name="saveGameId" value={saveGameId} />
        <input type="hidden" name="teamId" value={teamId} />
        <input type="hidden" name="kind" value={kind} />
        <input
          type="hidden"
          name="managerPlayerId"
          value={kind === "receive-for-future" ? "" : managerPlayerId}
        />
        <input
          type="hidden"
          name="targetPlayerId"
          value={kind === "send-for-future" ? "" : targetPlayerId}
        />
        <input
          type="hidden"
          name="partnerTeamId"
          value={kind === "send-for-future" ? partnerTeamId : selectedTarget?.teamId ?? ""}
        />

        <div className="grid gap-3 lg:grid-cols-3">
          <label className="grid gap-2 text-sm text-slate-300">
            Offer Type
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as TradeOfferKind)}
              className="min-h-10 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
            >
              {OFFER_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          {kind !== "receive-for-future" ? (
            <label className="grid gap-2 text-sm text-slate-300">
              Abgeben
              <select
                value={managerPlayerId}
                onChange={(event) => setManagerPlayerId(event.target.value)}
                className="min-h-10 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
              >
                {ownPlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.positionCode} {player.fullName} · OVR {player.positionOverall}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {kind === "send-for-future" ? (
            <label className="grid gap-2 text-sm text-slate-300">
              CPU-Team
              <select
                value={partnerTeamId}
                onChange={(event) => setPartnerTeamId(event.target.value)}
                className="min-h-10 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
              >
                {partnerTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.abbreviation} · Cap {Math.round(team.salaryCapSpace / 1_000_000)}M
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="grid gap-2 text-sm text-slate-300">
              Erhalten
              <select
                value={targetPlayerId}
                onChange={(event) => setTargetPlayerId(event.target.value)}
                className="min-h-10 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
              >
                {targetPlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.teamAbbreviation} · {player.positionCode} {player.fullName} · OVR{" "}
                    {player.positionOverall}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {selectedPlayers.map((player) => {
            const value = buildPlayerValue({
              ...player,
              capHit: player.capHit,
            });

            return (
              <div key={player.id} className="rounded-lg border border-white/8 bg-black/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-white">{player.fullName}</p>
                  <PlayerValueBadge compact value={value} />
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {player.teamAbbreviation} · {player.positionCode} · OVR{" "}
                  {player.positionOverall} · Cap {Math.round(player.capHit / 1_000_000)}M
                </p>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-white/8 bg-black/10 p-4 text-sm text-slate-300">
          <p className="font-semibold text-white">Review</p>
          <p className="mt-2">
            Manager Value {review.managerValueScore} · CPU Value {review.partnerValueScore}
          </p>
          <ul className="mt-2 list-inside list-disc text-xs text-slate-400">
            {review.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>

        <button
          type="submit"
          disabled={!canExecute}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-500"
        >
          Trade ausfuehren
        </button>
      </form>
    </section>
  );
}
