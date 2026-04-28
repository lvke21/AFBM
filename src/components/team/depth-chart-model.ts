import type { DashboardAction } from "@/components/dashboard/dashboard-model";
import type { TeamPlayerSummary } from "@/modules/teams/domain/team.types";

export type DepthChartPositionDefinition = {
  code: string;
  label: string;
  minSlots: number;
};

export type DepthChartConflict = {
  positionCode: string;
  slot: number;
  players: TeamPlayerSummary[];
};

export type DepthChartPositionGroup = {
  positionCode: string;
  positionName: string;
  slots: Array<{
    slot: number;
    players: TeamPlayerSummary[];
  }>;
  players: TeamPlayerSummary[];
  unassignedPlayers: TeamPlayerSummary[];
};

export type DepthChartLineupGroupDefinition = {
  code: string;
  label: string;
  description: string;
  positionCodes: string[];
};

export type DepthChartLineupGroup = {
  code: string;
  label: string;
  description: string;
  positions: DepthChartPositionGroup[];
  players: TeamPlayerSummary[];
  starterCount: number;
  backupCount: number;
  unassignedCount: number;
  openStarterCount: number;
  conflictCount: number;
};

export type DepthChartMoveTarget = {
  currentSlot: number;
  targetSlot: number;
  targetPlayer: TeamPlayerSummary | null;
};

export type DepthChartDecisionSignal = {
  label: "besser jetzt" | "besser langfristig" | "Risiko" | "stabil";
  tone: "positive" | "warning" | "active" | "default";
  description: string;
};

export type LineupReadinessState = {
  title: string;
  status: "ready" | "check" | "blocked" | "readonly";
  statusLabel: "Bereit" | "Pruefen" | "Blockiert" | "Nur Lesen";
  summary: string;
  conflicts: DepthChartConflict[];
  emptyStarterPositions: DepthChartPositionGroup[];
  coreEmptyStarterPositions: DepthChartPositionGroup[];
  secondaryEmptyStarterPositions: DepthChartPositionGroup[];
  autoFillPlayers: LineupAutoFillPlayer[];
  metrics: Array<{
    label: string;
    value: string;
    description: string;
  }>;
};

export type LineupAutoFillPlayer = {
  id: string;
  name: string;
  positionCode: string;
  positionName: string;
  overall: number;
  internalTag: "DEV_AUTO_FILL";
};

export const LINEUP_CORE_POSITION_CODES = ["QB", "RB", "WR"] as const;

export const LINEUP_CORE_POSITIONS = new Set<string>(LINEUP_CORE_POSITION_CODES);

export const DEPTH_CHART_POSITIONS: DepthChartPositionDefinition[] = [
  { code: "QB", label: "Quarterback", minSlots: 3 },
  { code: "RB", label: "Running Back", minSlots: 3 },
  { code: "FB", label: "Fullback", minSlots: 1 },
  { code: "WR", label: "Wide Receiver", minSlots: 5 },
  { code: "TE", label: "Tight End", minSlots: 3 },
  { code: "LT", label: "Left Tackle", minSlots: 2 },
  { code: "LG", label: "Left Guard", minSlots: 2 },
  { code: "C", label: "Center", minSlots: 2 },
  { code: "RG", label: "Right Guard", minSlots: 2 },
  { code: "RT", label: "Right Tackle", minSlots: 2 },
  { code: "LE", label: "Left End", minSlots: 2 },
  { code: "RE", label: "Right End", minSlots: 2 },
  { code: "DT", label: "Defensive Tackle", minSlots: 3 },
  { code: "LOLB", label: "Left Outside Linebacker", minSlots: 2 },
  { code: "MLB", label: "Middle Linebacker", minSlots: 2 },
  { code: "ROLB", label: "Right Outside Linebacker", minSlots: 2 },
  { code: "CB", label: "Cornerback", minSlots: 5 },
  { code: "FS", label: "Free Safety", minSlots: 2 },
  { code: "SS", label: "Strong Safety", minSlots: 2 },
  { code: "K", label: "Kicker", minSlots: 1 },
  { code: "P", label: "Punter", minSlots: 1 },
  { code: "LS", label: "Long Snapper", minSlots: 1 },
];

export const DEPTH_CHART_LINEUP_GROUPS: DepthChartLineupGroupDefinition[] = [
  {
    code: "QB",
    label: "Quarterbacks",
    description: "Starter-QB und direkte Backups.",
    positionCodes: ["QB"],
  },
  {
    code: "RB",
    label: "Backfield",
    description: "Running Backs und Fullback-Rollen.",
    positionCodes: ["RB", "FB"],
  },
  {
    code: "WR",
    label: "Receivers",
    description: "Wide Receiver und Tight Ends als Receiving-Personal.",
    positionCodes: ["WR", "TE"],
  },
  {
    code: "OL",
    label: "Offensive Line",
    description: "Tackle, Guard und Center-Reihenfolge.",
    positionCodes: ["LT", "LG", "C", "RG", "RT"],
  },
  {
    code: "DL",
    label: "Defensive Line",
    description: "Edge und Interior Defensive Line.",
    positionCodes: ["LE", "RE", "DT"],
  },
  {
    code: "LB",
    label: "Linebackers",
    description: "Outside und Middle Linebacker.",
    positionCodes: ["LOLB", "MLB", "ROLB"],
  },
  {
    code: "DB",
    label: "Defensive Backs",
    description: "Cornerbacks und Safeties.",
    positionCodes: ["CB", "FS", "SS"],
  },
  {
    code: "ST",
    label: "Special Teams",
    description: "Kicker, Punter und Long Snapper.",
    positionCodes: ["K", "P", "LS"],
  },
];

export const ROSTER_STATUS_OPTIONS = [
  { value: "STARTER", label: "Starter" },
  { value: "ROTATION", label: "Rotation" },
  { value: "BACKUP", label: "Backup" },
  { value: "PRACTICE_SQUAD", label: "Practice Squad" },
  { value: "INACTIVE", label: "Inaktiv" },
  { value: "INJURED_RESERVE", label: "Injured Reserve" },
];

const GAME_DAY_ELIGIBLE_STATUSES = new Set(["STARTER", "ROTATION", "BACKUP"]);

export function isGameDayEligibleStatus(status: string) {
  return GAME_DAY_ELIGIBLE_STATUSES.has(status);
}

function hasValidDepthChartSlot(
  player: Pick<TeamPlayerSummary, "depthChartSlot">,
): player is Pick<TeamPlayerSummary, "depthChartSlot"> & { depthChartSlot: number } {
  return (
    player.depthChartSlot != null &&
    Number.isInteger(player.depthChartSlot) &&
    player.depthChartSlot > 0
  );
}

export function canAssignDepthSlot(player: Pick<TeamPlayerSummary, "rosterStatus">) {
  return isGameDayEligibleStatus(player.rosterStatus);
}

export function canSelectRosterStatus(
  player: Pick<TeamPlayerSummary, "injuryStatus" | "rosterStatus">,
  status: string,
) {
  if (status !== "INJURED_RESERVE") {
    return true;
  }

  return player.injuryStatus !== "HEALTHY" || player.rosterStatus === "INJURED_RESERVE";
}

export function getRosterStatusOptions(player: TeamPlayerSummary) {
  return ROSTER_STATUS_OPTIONS.map((option) => ({
    ...option,
    disabled: !canSelectRosterStatus(player, option.value),
    reason:
      option.value === "INJURED_RESERVE" && !canSelectRosterStatus(player, option.value)
        ? "Nur verletzte Spieler koennen auf IR."
        : null,
  }));
}

function positionIndex(positionCode: string) {
  const index = DEPTH_CHART_POSITIONS.findIndex((position) => position.code === positionCode);
  return index === -1 ? DEPTH_CHART_POSITIONS.length : index;
}

export function sortDepthChartPlayers(players: TeamPlayerSummary[]) {
  return [...players].sort((left, right) => {
    const positionDiff = positionIndex(left.positionCode) - positionIndex(right.positionCode);
    if (positionDiff !== 0) {
      return positionDiff;
    }

    const slotDiff = (left.depthChartSlot ?? 99) - (right.depthChartSlot ?? 99);
    if (slotDiff !== 0) {
      return slotDiff;
    }

    return right.positionOverall - left.positionOverall;
  });
}

export function detectDepthChartConflicts(players: TeamPlayerSummary[]) {
  const grouped = new Map<string, TeamPlayerSummary[]>();

  for (const player of players) {
    if (!hasValidDepthChartSlot(player) || !isGameDayEligibleStatus(player.rosterStatus)) {
      continue;
    }

    const key = `${player.positionCode}:${player.depthChartSlot}`;
    grouped.set(key, [...(grouped.get(key) ?? []), player]);
  }

  return [...grouped.entries()]
    .filter(([, slotPlayers]) => slotPlayers.length > 1)
    .map(([key, slotPlayers]) => {
      const [positionCode, slot] = key.split(":");

      return {
        positionCode,
        slot: Number(slot),
        players: sortDepthChartPlayers(slotPlayers),
      };
    });
}

export function isDepthSlotUnavailableForPlayer(
  players: TeamPlayerSummary[],
  player: TeamPlayerSummary,
  slot: number,
) {
  if (!Number.isInteger(slot) || slot < 1) {
    return true;
  }

  return players.some(
    (candidate) =>
      candidate.id !== player.id &&
      candidate.positionCode === player.positionCode &&
      hasValidDepthChartSlot(candidate) &&
      candidate.depthChartSlot === slot &&
      isGameDayEligibleStatus(candidate.rosterStatus),
  );
}

export function buildDepthChartGroups(players: TeamPlayerSummary[]): DepthChartPositionGroup[] {
  return DEPTH_CHART_POSITIONS.map((position) => {
    const positionPlayers = sortDepthChartPlayers(
      players.filter((player) => player.positionCode === position.code),
    );
    const maxAssignedSlot = Math.max(
      0,
      ...positionPlayers.map((player) =>
        hasValidDepthChartSlot(player) ? player.depthChartSlot : 0,
      ),
    );
    const slotCount = Math.max(position.minSlots, positionPlayers.length, maxAssignedSlot);

    return {
      positionCode: position.code,
      positionName: positionPlayers[0]?.positionName ?? position.label,
      slots: Array.from({ length: slotCount }, (_, index) => {
        const slot = index + 1;

        return {
          slot,
          players: positionPlayers.filter(
            (player) =>
              hasValidDepthChartSlot(player) &&
              player.depthChartSlot === slot && isGameDayEligibleStatus(player.rosterStatus),
          ),
        };
      }),
      players: positionPlayers,
      unassignedPlayers: positionPlayers.filter(
        (player) => !hasValidDepthChartSlot(player) || !isGameDayEligibleStatus(player.rosterStatus),
      ),
    };
  });
}

export function buildDepthChartLineupGroups(players: TeamPlayerSummary[]): DepthChartLineupGroup[] {
  const positionGroups = buildDepthChartGroups(players);
  const positionGroupsByCode = new Map(
    positionGroups.map((group) => [group.positionCode, group]),
  );
  const conflictsByPosition = new Map<string, number>();

  for (const conflict of detectDepthChartConflicts(players)) {
    conflictsByPosition.set(
      conflict.positionCode,
      (conflictsByPosition.get(conflict.positionCode) ?? 0) + 1,
    );
  }

  return DEPTH_CHART_LINEUP_GROUPS.map((lineupGroup) => {
    const positions = lineupGroup.positionCodes
      .map((positionCode) => positionGroupsByCode.get(positionCode))
      .filter((group): group is DepthChartPositionGroup => Boolean(group));
    const groupPlayers = sortDepthChartPlayers(
      positions.flatMap((position) => position.players),
    );
    const starterCount = positions.reduce(
      (sum, position) => sum + (position.slots[0]?.players.length ?? 0),
      0,
    );
    const activeSlotPlayerIds = new Set(
      positions.flatMap((position) =>
        position.slots.flatMap((slot) => slot.players.map((player) => player.id)),
      ),
    );
    const backupCount = groupPlayers.filter((player) => activeSlotPlayerIds.has(player.id)).length - starterCount;
    const unassignedCount = positions.reduce(
      (sum, position) => sum + position.unassignedPlayers.length,
      0,
    );
    const openStarterCount = positions.filter(
      (position) => position.slots[0]?.players.length === 0,
    ).length;
    const conflictCount = positions.reduce(
      (sum, position) => sum + (conflictsByPosition.get(position.positionCode) ?? 0),
      0,
    );

    return {
      code: lineupGroup.code,
      label: lineupGroup.label,
      description: lineupGroup.description,
      positions,
      players: groupPlayers,
      starterCount,
      backupCount: Math.max(0, backupCount),
      unassignedCount,
      openStarterCount,
      conflictCount,
    };
  });
}

export function getEmptyStarterPositions(groups: DepthChartPositionGroup[]) {
  return groups.filter((group) => group.slots[0]?.players.length === 0);
}

export function isLineupCorePosition(positionCode: string) {
  return LINEUP_CORE_POSITIONS.has(positionCode);
}

export function buildLineupAutoFillPlayers(
  emptyStarterPositions: DepthChartPositionGroup[],
): LineupAutoFillPlayer[] {
  return emptyStarterPositions.map((position, index) => ({
    id: `dev-auto-fill-${position.positionCode.toLowerCase()}-${index + 1}`,
    internalTag: "DEV_AUTO_FILL",
    name: `Dev Auto-Fill ${position.positionCode}`,
    overall: 62,
    positionCode: position.positionCode,
    positionName: position.positionName,
  }));
}

export function getAssignablePlayersForSlot(
  group: DepthChartPositionGroup,
  players: TeamPlayerSummary[],
  slot: number,
) {
  return group.players
    .filter(
      (player) =>
        isGameDayEligibleStatus(player.rosterStatus) &&
        !hasValidDepthChartSlot(player) &&
        !isDepthSlotUnavailableForPlayer(players, player, slot),
    )
    .slice(0, 5);
}

export function getDepthChartMoveTarget(
  group: DepthChartPositionGroup,
  player: TeamPlayerSummary,
  direction: "up" | "down",
): DepthChartMoveTarget | null {
  if (!hasValidDepthChartSlot(player) || !isGameDayEligibleStatus(player.rosterStatus)) {
    return null;
  }

  const targetSlot = direction === "up" ? player.depthChartSlot - 1 : player.depthChartSlot + 1;
  if (targetSlot < 1 || targetSlot > group.slots.length) {
    return null;
  }

  const targetSlotState = group.slots.find((slot) => slot.slot === targetSlot);
  const targetPlayer =
    targetSlotState?.players.find((candidate) => candidate.id !== player.id) ?? null;

  return {
    currentSlot: player.depthChartSlot,
    targetSlot,
    targetPlayer,
  };
}

function upsideValue(player: TeamPlayerSummary) {
  return player.potentialRating - player.positionOverall;
}

export function buildDepthChartDecisionSignals(
  player: TeamPlayerSummary,
  positionPlayers: TeamPlayerSummary[],
): DepthChartDecisionSignal[] {
  const eligiblePlayers = positionPlayers.filter((candidate) =>
    isGameDayEligibleStatus(candidate.rosterStatus),
  );
  const bestCurrentRating = Math.max(
    ...eligiblePlayers.map((candidate) => candidate.positionOverall),
    player.positionOverall,
  );
  const bestPotential = Math.max(
    ...eligiblePlayers.map((candidate) => candidate.potentialRating),
    player.potentialRating,
  );
  const signals: DepthChartDecisionSignal[] = [];
  const playerUpside = upsideValue(player);

  if (player.positionOverall >= bestCurrentRating - 1 && player.positionOverall >= 72) {
    signals.push({
      label: "besser jetzt",
      tone: player.fatigue >= 55 ? "warning" : "positive",
      description:
        player.fatigue >= 55
          ? `Top-OVR ${player.positionOverall}, aber Fatigue ${player.fatigue} macht den Start riskanter.`
          : `Beste aktuelle Option: OVR ${player.positionOverall} mit Fatigue ${player.fatigue}.`,
    });
  }

  if ((player.potentialRating >= bestPotential - 1 && playerUpside >= 7) || (player.age <= 24 && playerUpside >= 6)) {
    signals.push({
      label: "besser langfristig",
      tone: "active",
      description: `POT ${player.potentialRating} bei OVR ${player.positionOverall}; Entwicklungsspielraum +${playerUpside}.`,
    });
  }

  if (player.fatigue >= 60 || player.injuryStatus !== "HEALTHY" || player.injuryName) {
    signals.push({
      label: "Risiko",
      tone: "warning",
      description:
        player.injuryStatus !== "HEALTHY" || player.injuryName
          ? "Verletzungsstatus macht diese Rolle riskant."
          : `Fatigue ${player.fatigue}: kurzfristig stark, aber mit Belastungsrisiko.`,
    });
  }

  if (signals.length === 0) {
    signals.push({
      label: "stabil",
      tone: "default",
      description: `Solide Tiefe: OVR ${player.positionOverall}, Fatigue ${player.fatigue}, POT ${player.potentialRating}.`,
    });
  }

  return signals.slice(0, 3);
}

export function buildLineupReadinessState(
  players: TeamPlayerSummary[],
  managerControlled = true,
): LineupReadinessState {
  const groups = buildDepthChartGroups(players);
  const conflicts = detectDepthChartConflicts(players);
  const emptyStarterPositions = getEmptyStarterPositions(groups);
  const coreEmptyStarterPositions = emptyStarterPositions.filter((position) =>
    isLineupCorePosition(position.positionCode),
  );
  const secondaryEmptyStarterPositions = emptyStarterPositions.filter(
    (position) => !isLineupCorePosition(position.positionCode),
  );
  const autoFillPlayers = buildLineupAutoFillPlayers(secondaryEmptyStarterPositions);
  const assignedPlayers = players.filter(
    (player) => hasValidDepthChartSlot(player) && isGameDayEligibleStatus(player.rosterStatus),
  );
  const inactivePlayers = players.filter((player) => !isGameDayEligibleStatus(player.rosterStatus));
  const status =
    !managerControlled
      ? "readonly"
      : conflicts.length > 0
        ? "blocked"
        : coreEmptyStarterPositions.length > 0
          ? "blocked"
        : secondaryEmptyStarterPositions.length > 0
          ? "check"
          : "ready";
  const statusLabel =
    status === "readonly"
      ? "Nur Lesen"
      : status === "blocked"
        ? "Blockiert"
        : status === "check"
          ? "Pruefen"
          : "Bereit";

  return {
    title: "Spieltag-Bereitschaft",
    status,
    statusLabel,
    summary:
      status === "readonly"
        ? "Depth Chart ist fuer dieses Team nur lesbar."
      : conflicts.length > 0
          ? `${conflicts.length} doppelte Besetzung(en) blockieren den Spielstart.`
          : coreEmptyStarterPositions.length > 0
            ? `${coreEmptyStarterPositions.length} wichtige Starter fehlen.`
          : secondaryEmptyStarterPositions.length > 0
            ? `Dein Team ist nicht optimal aufgestellt. ${secondaryEmptyStarterPositions.length} Ersatzspieler muessen einspringen.`
            : "Alle Starterrollen sind besetzt und es gibt keine doppelten Einsaetze.",
    conflicts,
    emptyStarterPositions,
    coreEmptyStarterPositions,
    secondaryEmptyStarterPositions,
    autoFillPlayers,
    metrics: [
      {
        label: "Im Einsatz",
        value: String(assignedPlayers.length),
        description: "Spielberechtigte Spieler mit klarer Rolle.",
      },
      {
        label: "Starter fehlen",
        value: String(coreEmptyStarterPositions.length),
        description: "Wichtige Positionen ohne Starter. Das blockiert den Start.",
      },
      {
        label: "Ersatzspieler",
        value: String(autoFillPlayers.length),
        description: "Schwaechere Spieler springen am Spieltag ein.",
      },
      {
        label: "Doppelt besetzt",
        value: String(conflicts.length),
        description: "Rollen, in denen mehrere Spieler gleichzeitig eingetragen sind.",
      },
      {
        label: "Inaktiv",
        value: String(inactivePlayers.length),
        description: "Spieler ohne aktive Rolle am Spieltag.",
      },
    ],
  };
}

export function buildDepthChartAction(players: TeamPlayerSummary[]): DashboardAction {
  const conflicts = detectDepthChartConflicts(players);
  if (conflicts.length > 0) {
    return {
      title: "Doppelte Rollen klaeren",
      message: `${conflicts.length} Rolle(n) sind doppelt besetzt. Entscheide dich pro Position fuer einen Spieler.`,
      href: null,
      label: "Rollen klaeren",
      tone: "warning",
    };
  }

  const emptyStarterPositions = getEmptyStarterPositions(buildDepthChartGroups(players));
  if (emptyStarterPositions.length > 0) {
    return {
      title: "Starter fehlen",
      message: `${emptyStarterPositions.length} Position(en) haben noch keinen Starter. Fuell die Luecken vor dem Kickoff.`,
      href: null,
      label: "Starter setzen",
      tone: "warning",
    };
  }

  return {
    title: "Aufstellung bereit",
    message:
      "Alle Starterrollen sind besetzt und keine Rolle ist doppelt vergeben.",
    href: null,
    label: "Aufstellung bereit",
    tone: "positive",
  };
}
