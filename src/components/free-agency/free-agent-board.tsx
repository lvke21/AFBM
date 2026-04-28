"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PlayerRoleBadge } from "@/components/player/player-role-badge";
import { buildPlayerRole } from "@/components/player/player-role-model";
import { PlayerValueBadge } from "@/components/player/player-value-badge";
import { buildPlayerValue } from "@/components/player/player-value-model";
import type { FreeAgentMarket } from "@/modules/teams/application/team-management.shared";
import { sortFreeAgents, type FreeAgentSortKey } from "./free-agency-model";
import { OfferBuilder } from "./offer-builder";

type FreeAgentBoardProps = {
  market: FreeAgentMarket;
  saveGameId: string;
  signAction: (formData: FormData) => Promise<void>;
};

const SORT_OPTIONS: Array<{ label: string; value: FreeAgentSortKey }> = [
  { label: "Need", value: "need" },
  { label: "Value", value: "value" },
  { label: "Fit", value: "fit" },
  { label: "OVR", value: "overall" },
];

export function FreeAgentBoard({ market, saveGameId, signAction }: FreeAgentBoardProps) {
  const [sortKey, setSortKey] = useState<FreeAgentSortKey>("need");
  const players = useMemo(() => sortFreeAgents(market.players, sortKey), [market.players, sortKey]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Free Agent Board
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            {players.length} verfuegbare Spieler
          </h2>
        </div>
        <label className="grid gap-2 text-sm text-slate-300 md:min-w-48">
          Sortierung
          <select
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as FreeAgentSortKey)}
            className="min-h-10 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {players.length > 0 ? (
        <div className="grid gap-4">
          {players.map((player) => {
            const role = buildPlayerRole({ ...player, rosterStatus: "FREE_AGENT" });
            const value = buildPlayerValue({ ...player, capHit: player.projectedCapHit });

            return (
            <article key={player.id} className="rounded-lg border border-white/10 bg-white/5 p-5">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {player.positionCode} · OVR {player.positionOverall} / POT{" "}
                    {player.potentialRating}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold text-white">{player.fullName}</h3>
                    <PlayerRoleBadge role={role} />
                    <PlayerValueBadge value={value} />
                  </div>
                  <p className="mt-2 text-sm text-slate-300">
                    {player.age} Jahre · {player.yearsPro} Years Pro · {player.positionName}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {player.archetypeName ?? "Kein Archetyp"} ·{" "}
                    {player.schemeFitName ?? "Kein Scheme Fit"}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-300">{role.summary}</p>
                  <p className="mt-1 text-xs text-slate-400">{value.reason}</p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-amber-300/20 bg-amber-300/8 p-3">
                      <p className="text-xs text-amber-100">Team Need</p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {player.teamNeedScore}
                      </p>
                    </div>
                    <div className="rounded-lg border border-sky-300/20 bg-sky-300/8 p-3">
                      <p className="text-xs text-sky-100">Team Fit</p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {player.schemeFitScore ?? "-"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/10 p-3">
                      <p className="text-xs text-slate-400">Physical / Mental</p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {player.physicalOverall} / {player.mentalOverall}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-slate-500">
                    {player.spotlightRatings
                      .map((rating) => `${rating.label} ${rating.value}`)
                      .join(" · ") || "Keine Spotlight Ratings"}
                  </p>
                </div>

                <OfferBuilder
                  capSpace={market.managerTeam.salaryCapSpace}
                  cashBalance={market.managerTeam.cashBalance}
                  player={player}
                  saveGameId={saveGameId}
                  signAction={signAction}
                  teamId={market.managerTeam.id}
                />
              </div>
            </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
          <p className="font-semibold text-white">Keine Free Agents verfuegbar</p>
          <p className="mt-2">
            Der Markt enthaelt aktuell keine verpflichtbaren Spieler. Pruefe dein Roster und die
            aktuelle Inbox fuer den naechsten sinnvollen Schritt.
          </p>
          <Link
            href={`/app/savegames/${saveGameId}/team/roster`}
            className="mt-4 inline-flex min-h-9 items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            Roster oeffnen
          </Link>
        </div>
      )}
    </div>
  );
}
