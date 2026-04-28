import Link from "next/link";

import { ActionRequiredBanner } from "@/components/dashboard/action-required-banner";
import { PlayerRoleBadge } from "@/components/player/player-role-badge";
import { buildPlayerRole } from "@/components/player/player-role-model";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import type { TeamPlayerSummary } from "@/modules/teams/domain/team.types";
import { PlayerStatusBadge } from "./player-status-badge";
import {
  buildDepthChartAction,
  buildDepthChartDecisionSignals,
  buildDepthChartGroups,
  buildDepthChartLineupGroups,
  buildLineupReadinessState,
  detectDepthChartConflicts,
  getAssignablePlayersForSlot,
  getDepthChartMoveTarget,
  getEmptyStarterPositions,
  getRosterStatusOptions,
  isGameDayEligibleStatus,
  isDepthSlotUnavailableForPlayer,
  type DepthChartMoveTarget,
  type DepthChartPositionGroup,
} from "./depth-chart-model";
import { getRosterStatusLabel } from "./roster-model";

type DepthChartViewProps = {
  managerControlled: boolean;
  players: TeamPlayerSummary[];
  saveGameId: string;
  teamId: string;
  moveDepthChartPlayerAction: (formData: FormData) => Promise<void>;
  updateRosterAssignmentAction: (formData: FormData) => Promise<void>;
};

type DepthChartSlot = DepthChartPositionGroup["slots"][number];

function specialRoleForPlayer(player: TeamPlayerSummary) {
  return player.secondaryPositionCode === "KR" || player.secondaryPositionCode === "PR"
    ? player.secondaryPositionCode
    : "";
}

function AssignmentForm({
  managerControlled,
  player,
  players,
  saveGameId,
  slotCount,
  teamId,
  updateRosterAssignmentAction,
}: {
  managerControlled: boolean;
  player: TeamPlayerSummary;
  players: TeamPlayerSummary[];
  saveGameId: string;
  slotCount: number;
  teamId: string;
  updateRosterAssignmentAction: (formData: FormData) => Promise<void>;
}) {
  if (!managerControlled) {
    return (
      <div className="rounded-lg border border-white/8 bg-black/10 p-3 text-xs text-slate-300">
        Readonly · {getRosterStatusLabel(player.rosterStatus)}
        {player.depthChartSlot ? ` · Slot #${player.depthChartSlot}` : ""}
      </div>
    );
  }

  return (
    <form action={updateRosterAssignmentAction} className="grid gap-2 md:grid-cols-6">
      <input type="hidden" name="saveGameId" value={saveGameId} />
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="playerId" value={player.id} />

      <label className="grid gap-1 text-xs text-slate-300">
        Slot
        <select
          name="depthChartSlot"
          defaultValue={player.depthChartSlot ?? ""}
          className="min-h-9 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-sm text-white"
        >
          <option value="">Kein Slot</option>
          {Array.from({ length: slotCount }, (_, index) => {
            const slot = index + 1;
            const unavailable = isDepthSlotUnavailableForPlayer(players, player, slot);

            return (
              <option key={slot} value={slot} disabled={unavailable}>
                #{slot}
                {unavailable ? " belegt" : ""}
              </option>
            );
          })}
        </select>
      </label>

      <label className="grid gap-1 text-xs text-slate-300">
        Status
        <select
          name="rosterStatus"
          defaultValue={player.rosterStatus}
          className="min-h-9 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-sm text-white"
        >
          {getRosterStatusOptions(player).map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
              {option.reason ? " (gesperrt)" : ""}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1 text-xs text-slate-300">
        Spezialrolle
        <select
          name="specialRole"
          defaultValue={specialRoleForPlayer(player)}
          className="min-h-9 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-sm text-white"
        >
          <option value="">Keine</option>
          <option value="KR">KR</option>
          <option value="PR">PR</option>
        </select>
      </label>

      <label className="flex min-h-9 items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs text-slate-300">
        <input type="checkbox" name="captainFlag" defaultChecked={player.captainFlag} />
        Captain
      </label>

      <label className="flex min-h-9 items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs text-slate-300">
        <input
          type="checkbox"
          name="developmentFocus"
          defaultChecked={player.developmentFocus}
        />
        Dev Focus
      </label>

      <FormSubmitButton pendingLabel="Speichert...">Speichern</FormSubmitButton>
    </form>
  );
}

function QuickAssignmentForm({
  actionLabel,
  captainFlag,
  depthChartSlot,
  developmentFocus,
  disabled = false,
  player,
  rosterStatus,
  saveGameId,
  specialRole,
  teamId,
  updateRosterAssignmentAction,
}: {
  actionLabel: string;
  captainFlag: boolean;
  depthChartSlot: number | null;
  developmentFocus: boolean;
  disabled?: boolean;
  player: TeamPlayerSummary;
  rosterStatus: string;
  saveGameId: string;
  specialRole: string | null;
  teamId: string;
  updateRosterAssignmentAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={updateRosterAssignmentAction}>
      <input type="hidden" name="saveGameId" value={saveGameId} />
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="playerId" value={player.id} />
      <input type="hidden" name="depthChartSlot" value={depthChartSlot ?? ""} />
      <input type="hidden" name="rosterStatus" value={rosterStatus} />
      <input type="hidden" name="specialRole" value={specialRole ?? ""} />
      {captainFlag ? <input type="hidden" name="captainFlag" value="on" /> : null}
      {developmentFocus ? <input type="hidden" name="developmentFocus" value="on" /> : null}
      <button
        type="submit"
        disabled={disabled}
        className="inline-flex min-h-8 items-center rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {actionLabel}
      </button>
    </form>
  );
}

function MoveDepthSlotForm({
  actionLabel,
  moveDepthChartPlayerAction,
  moveTarget,
  player,
  saveGameId,
  teamId,
}: {
  actionLabel: string;
  moveDepthChartPlayerAction: (formData: FormData) => Promise<void>;
  moveTarget: DepthChartMoveTarget | null;
  player: TeamPlayerSummary;
  saveGameId: string;
  teamId: string;
}) {
  if (!moveTarget) {
    return null;
  }

  return (
    <form action={moveDepthChartPlayerAction}>
      <input type="hidden" name="saveGameId" value={saveGameId} />
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="playerId" value={player.id} />
      <input type="hidden" name="currentSlot" value={moveTarget.currentSlot} />
      <input type="hidden" name="targetSlot" value={moveTarget.targetSlot} />
      <input type="hidden" name="targetPlayerId" value={moveTarget.targetPlayer?.id ?? ""} />
      <button
        type="submit"
        className="inline-flex min-h-8 items-center rounded-lg border border-sky-300/25 bg-sky-300/10 px-2 py-1 text-xs font-semibold text-sky-100 transition hover:bg-sky-300/16"
      >
        {actionLabel}
      </button>
    </form>
  );
}

function signalClasses(tone: ReturnType<typeof buildDepthChartDecisionSignals>[number]["tone"]) {
  if (tone === "positive") {
    return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  }

  if (tone === "warning") {
    return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  }

  if (tone === "active") {
    return "border-sky-300/25 bg-sky-300/10 text-sky-100";
  }

  return "border-white/10 bg-white/5 text-slate-200";
}

function DecisionSignalBadges({
  player,
  positionPlayers,
}: {
  player: TeamPlayerSummary;
  positionPlayers: TeamPlayerSummary[];
}) {
  const signals = buildDepthChartDecisionSignals(player, positionPlayers);

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {signals.map((signal) => (
        <span
          key={signal.label}
          title={signal.description}
          className={`rounded-lg border px-2 py-1 text-xs font-semibold ${signalClasses(signal.tone)}`}
        >
          {signal.label}
        </span>
      ))}
    </div>
  );
}

function DepthSlotCard({
  allPlayers,
  group,
  managerControlled,
  moveDepthChartPlayerAction,
  saveGameId,
  slot,
  teamId,
  updateRosterAssignmentAction,
}: {
  allPlayers: TeamPlayerSummary[];
  group: DepthChartPositionGroup;
  managerControlled: boolean;
  moveDepthChartPlayerAction: (formData: FormData) => Promise<void>;
  saveGameId: string;
  slot: DepthChartSlot;
  teamId: string;
  updateRosterAssignmentAction: (formData: FormData) => Promise<void>;
}) {
  const isStarterSlot = slot.slot === 1;

  return (
    <div
      className={[
        "rounded-lg border p-4",
        slot.players.length === 0
          ? "border-amber-300/20 bg-amber-300/8"
          : slot.players.length > 1
            ? "border-rose-300/25 bg-rose-300/10"
            : isStarterSlot
              ? "border-emerald-300/25 bg-emerald-300/10"
              : "border-white/8 bg-black/10",
      ].join(" ")}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {isStarterSlot ? "Starter · Slot #1" : `Backup · Slot #${slot.slot}`}
      </p>
      {slot.players.length > 0 ? (
        <div className="mt-2 space-y-2">
          {slot.players.map((player) => (
            <div key={player.id}>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/app/savegames/${saveGameId}/players/${player.id}`}
                  className="text-sm font-semibold text-white underline-offset-4 hover:underline"
                >
                  {player.fullName}
                </Link>
                <PlayerRoleBadge compact role={buildPlayerRole(player)} />
              </div>
              <p className="mt-1 text-xs text-slate-400">
                OVR {player.positionOverall} · POT {player.potentialRating} · Fatigue{" "}
                {player.fatigue} · {getRosterStatusLabel(player.rosterStatus)}
              </p>
              <DecisionSignalBadges player={player} positionPlayers={group.players} />
              {managerControlled ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <MoveDepthSlotForm
                    actionLabel="Slot hoch"
                    moveDepthChartPlayerAction={moveDepthChartPlayerAction}
                    moveTarget={getDepthChartMoveTarget(group, player, "up")}
                    player={player}
                    saveGameId={saveGameId}
                    teamId={teamId}
                  />
                  <MoveDepthSlotForm
                    actionLabel="Slot runter"
                    moveDepthChartPlayerAction={moveDepthChartPlayerAction}
                    moveTarget={getDepthChartMoveTarget(group, player, "down")}
                    player={player}
                    saveGameId={saveGameId}
                    teamId={teamId}
                  />
                  <QuickAssignmentForm
                    actionLabel="Slot freimachen"
                    captainFlag={player.captainFlag}
                    depthChartSlot={null}
                    developmentFocus={player.developmentFocus}
                    player={player}
                    rosterStatus={player.rosterStatus}
                    saveGameId={saveGameId}
                    specialRole={specialRoleForPlayer(player)}
                    teamId={teamId}
                    updateRosterAssignmentAction={updateRosterAssignmentAction}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-amber-50">Leer</p>
          {managerControlled ? (
            <div className="flex flex-wrap gap-2">
              {getAssignablePlayersForSlot(group, allPlayers, slot.slot).map((player) => (
                <QuickAssignmentForm
                  key={player.id}
                  actionLabel={`${player.fullName} zuweisen`}
                  captainFlag={player.captainFlag}
                  depthChartSlot={slot.slot}
                  developmentFocus={player.developmentFocus}
                  player={player}
                  rosterStatus={player.rosterStatus}
                  saveGameId={saveGameId}
                  specialRole={specialRoleForPlayer(player)}
                  teamId={teamId}
                  updateRosterAssignmentAction={updateRosterAssignmentAction}
                />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function DepthChartView({
  managerControlled,
  moveDepthChartPlayerAction,
  players,
  saveGameId,
  teamId,
  updateRosterAssignmentAction,
}: DepthChartViewProps) {
  const groups = buildDepthChartGroups(players);
  const conflicts = detectDepthChartConflicts(players);
  const conflictsByPosition = new Map(
    conflicts.map((conflict) => [conflict.positionCode, conflict]),
  );
  const lineupGroups = buildDepthChartLineupGroups(players);
  const emptyStarterPositions = getEmptyStarterPositions(groups);
  const action = buildDepthChartAction(players);
  const readiness = buildLineupReadinessState(players, managerControlled);

  return (
    <div className="space-y-6">
      <ActionRequiredBanner action={action} />

      <section
        className={[
          "rounded-lg border p-4",
          readiness.status === "ready"
            ? "border-emerald-300/25 bg-emerald-300/10"
            : readiness.status === "check"
              ? "border-amber-300/25 bg-amber-300/10"
              : readiness.status === "blocked"
                ? "border-rose-300/25 bg-rose-300/10"
              : "border-white/10 bg-white/5",
        ].join(" ")}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Command Center
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">{readiness.title}</h3>
            <p className="mt-2 text-sm font-semibold text-white">{readiness.statusLabel}</p>
            <p className="mt-1 text-sm leading-6 text-slate-300">{readiness.summary}</p>
            {managerControlled ? (
              <p className="mt-2 text-sm font-semibold text-amber-100">
                Triff vor dem Kickoff mindestens eine bewusste Depth-Chart-Wahl: aktuelle Staerke,
                langfristiges Potenzial oder Risiko.
              </p>
            ) : null}
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            {readiness.metrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-white/10 bg-black/15 px-3 py-2">
                <p className="text-xs text-slate-500">{metric.label}</p>
                <p className="mt-1 text-lg font-semibold text-white">{metric.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {conflicts.length > 0 ? (
        <div className="rounded-lg border border-rose-300/25 bg-rose-300/10 p-4 text-sm text-rose-50">
          <p className="font-semibold">Doppelte Rollen klaeren</p>
          <p className="mt-1 text-rose-100">
            Pro Rolle darf am Spieltag genau ein Spieler eingetragen sein.
          </p>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {conflicts.map((conflict) => (
              <article
                key={`${conflict.positionCode}-${conflict.slot}`}
                className="rounded-lg border border-white/10 bg-black/15 p-3"
              >
                <p className="font-semibold text-white">
                  {conflict.positionCode} Rolle #{conflict.slot}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {conflict.players.map((player) => (
                    <QuickAssignmentForm
                      key={player.id}
                      actionLabel={`${player.fullName} freimachen`}
                      captainFlag={player.captainFlag}
                      depthChartSlot={null}
                      developmentFocus={player.developmentFocus}
                      player={player}
                      rosterStatus={player.rosterStatus}
                      saveGameId={saveGameId}
                      specialRole={specialRoleForPlayer(player)}
                      teamId={teamId}
                      updateRosterAssignmentAction={updateRosterAssignmentAction}
                    />
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {emptyStarterPositions.length > 0 ? (
        <div className="rounded-lg border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-50">
          <p className="font-semibold">Spieltag-Warnung: Starter fehlen</p>
          <p className="mt-1 text-amber-100">
            Diese Positionen haben noch keinen klaren Starter.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {emptyStarterPositions.map((group) => (
              <span
                key={group.positionCode}
                className="rounded-lg border border-amber-300/25 bg-black/15 px-2 py-1 text-xs font-semibold text-amber-50"
              >
                {group.positionCode}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <section className="rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Positionsgruppen
            </p>
            <h3 className="mt-2 text-lg font-semibold text-white">Lineup Board</h3>
          </div>
          <p className="text-sm text-slate-400">
            Starter und Backups bleiben pro echter Position steuerbar.
          </p>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {lineupGroups.map((lineupGroup) => (
            <div
              key={lineupGroup.code}
              className="rounded-lg border border-white/8 bg-black/10 px-3 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{lineupGroup.code}</p>
                  <p className="mt-1 text-xs text-slate-400">{lineupGroup.label}</p>
                </div>
                {lineupGroup.conflictCount > 0 ? (
                  <span className="rounded-lg border border-rose-300/25 bg-rose-300/10 px-2 py-1 text-xs font-semibold text-rose-100">
                    Konflikt
                  </span>
                ) : lineupGroup.openStarterCount > 0 ? (
                  <span className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-xs font-semibold text-amber-100">
                    Offen
                  </span>
                ) : (
                  <span className="rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-2 py-1 text-xs font-semibold text-emerald-100">
                    Bereit
                  </span>
                )}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {lineupGroup.starterCount} Starter · {lineupGroup.backupCount} Backups ·{" "}
                {lineupGroup.unassignedCount} ohne Slot
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-8">
        {lineupGroups.map((lineupGroup) => (
          <section key={lineupGroup.code} className="space-y-4">
            <div className="flex flex-col gap-2 border-t border-white/10 pt-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {lineupGroup.code}
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{lineupGroup.label}</h3>
                <p className="mt-1 text-sm text-slate-400">{lineupGroup.description}</p>
              </div>
              <p className="text-sm text-slate-400">
                {lineupGroup.players.length} Spieler · {lineupGroup.starterCount} Starter ·{" "}
                {lineupGroup.backupCount} Backups
              </p>
            </div>

            <div className="grid gap-5">
              {lineupGroup.positions.map((group) => {
                const starterSlot = group.slots[0];
                const backupSlots = group.slots.slice(1);

                return (
                  <article
                    key={group.positionCode}
                    className="rounded-lg border border-white/10 bg-white/5 p-5"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {group.positionCode}
                        </p>
                        <h4 className="mt-2 text-xl font-semibold text-white">
                          {group.positionName}
                        </h4>
                        {conflictsByPosition.has(group.positionCode) ? (
                          <p className="mt-2 rounded-lg border border-rose-300/25 bg-rose-300/10 px-3 py-2 text-sm font-semibold text-rose-100">
                            Rolle #{conflictsByPosition.get(group.positionCode)?.slot} ist doppelt besetzt
                          </p>
                        ) : group.slots[0]?.players.length === 0 ? (
                          <p className="mt-2 rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-sm font-semibold text-amber-100">
                            Starter fehlt
                          </p>
                        ) : null}
                      </div>
                      <p className="text-sm text-slate-400">
                        {group.players.length} Spieler · {group.unassignedPlayers.length} ohne
                        klare Rolle
                      </p>
                    </div>

                    <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(240px,0.85fr)_minmax(0,1.6fr)]">
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
                          Starter
                        </p>
                        {starterSlot ? (
                          <DepthSlotCard
                            allPlayers={players}
                            group={group}
                            managerControlled={managerControlled}
                            moveDepthChartPlayerAction={moveDepthChartPlayerAction}
                            saveGameId={saveGameId}
                            slot={starterSlot}
                            teamId={teamId}
                            updateRosterAssignmentAction={updateRosterAssignmentAction}
                          />
                        ) : null}
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Backups
                        </p>
                        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                          {backupSlots.map((slot) => (
                            <DepthSlotCard
                              key={slot.slot}
                              allPlayers={players}
                              group={group}
                              managerControlled={managerControlled}
                              moveDepthChartPlayerAction={moveDepthChartPlayerAction}
                              saveGameId={saveGameId}
                              slot={slot}
                              teamId={teamId}
                              updateRosterAssignmentAction={updateRosterAssignmentAction}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {group.players.length > 0 ? (
                      <div className="mt-5 space-y-3">
                        {group.players.map((player) => (
                          <div
                            key={player.id}
                            className="rounded-lg border border-white/8 bg-black/10 p-4"
                          >
                            <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Link
                                    href={`/app/savegames/${saveGameId}/players/${player.id}`}
                                    className="font-semibold text-white underline-offset-4 hover:underline"
                                  >
                                    {player.fullName}
                                  </Link>
                                  <PlayerRoleBadge compact role={buildPlayerRole(player)} />
                                  <PlayerStatusBadge player={player} />
                                  {player.captainFlag ? (
                                    <span className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-xs font-semibold text-amber-100">
                                      Captain
                                    </span>
                                  ) : null}
                                  {player.developmentFocus ? (
                                    <span className="rounded-lg border border-sky-300/25 bg-sky-300/10 px-2 py-1 text-xs font-semibold text-sky-100">
                                      Dev Focus
                                    </span>
                                  ) : null}
                                  {specialRoleForPlayer(player) ? (
                                    <span className="rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-2 py-1 text-xs font-semibold text-emerald-100">
                                      {specialRoleForPlayer(player)}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-1 text-xs text-slate-400">
                                  OVR {player.positionOverall} · POT {player.potentialRating} ·{" "}
                                  Fatigue {player.fatigue} ·{" "}
                                  {player.depthChartSlot
                                    ? `Slot #${player.depthChartSlot}`
                                    : "Kein Slot"}
                                </p>
                                <DecisionSignalBadges player={player} positionPlayers={group.players} />
                              </div>
                            </div>

                            {managerControlled ? (
                              <div className="mb-3 flex flex-wrap gap-2">
                                <MoveDepthSlotForm
                                  actionLabel="Slot hoch"
                                  moveDepthChartPlayerAction={moveDepthChartPlayerAction}
                                  moveTarget={getDepthChartMoveTarget(group, player, "up")}
                                  player={player}
                                  saveGameId={saveGameId}
                                  teamId={teamId}
                                />
                                <MoveDepthSlotForm
                                  actionLabel="Slot runter"
                                  moveDepthChartPlayerAction={moveDepthChartPlayerAction}
                                  moveTarget={getDepthChartMoveTarget(group, player, "down")}
                                  player={player}
                                  saveGameId={saveGameId}
                                  teamId={teamId}
                                />
                                {["STARTER", "ROTATION", "BACKUP", "INACTIVE"].map((status) => (
                                  <QuickAssignmentForm
                                    key={status}
                                    actionLabel={status}
                                    captainFlag={player.captainFlag}
                                    depthChartSlot={
                                      isGameDayEligibleStatus(status)
                                        ? player.depthChartSlot
                                        : null
                                    }
                                    developmentFocus={player.developmentFocus}
                                    disabled={player.rosterStatus === status}
                                    player={player}
                                    rosterStatus={status}
                                    saveGameId={saveGameId}
                                    specialRole={specialRoleForPlayer(player)}
                                    teamId={teamId}
                                    updateRosterAssignmentAction={updateRosterAssignmentAction}
                                  />
                                ))}
                              </div>
                            ) : null}

                            <AssignmentForm
                              managerControlled={managerControlled}
                              player={player}
                              players={players}
                              saveGameId={saveGameId}
                              slotCount={group.slots.length}
                              teamId={teamId}
                              updateRosterAssignmentAction={updateRosterAssignmentAction}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-5 rounded-lg border border-white/8 bg-black/10 p-4 text-sm text-slate-300">
                        Keine Spieler auf dieser Position. Die leeren Slots bleiben sichtbar.
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
