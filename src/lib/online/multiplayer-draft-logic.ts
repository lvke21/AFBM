import {
  ONLINE_FANTASY_DRAFT_ROSTER_TARGET_SIZE,
  type OnlineContractPlayer,
  type OnlineFantasyDraftPick,
  type OnlineFantasyDraftState,
} from "./online-league-service";

export type MultiplayerDraftPickValidationInput = {
  state: OnlineFantasyDraftState | null;
  teamIds: string[];
  teamId: string;
  playerId: string;
  availablePlayers: OnlineContractPlayer[];
  existingPicks: OnlineFantasyDraftPick[];
  rosterSize: number;
};

export type MultiplayerDraftPickValidationResult =
  | { ok: true; player: OnlineContractPlayer }
  | {
      ok: false;
      status:
        | "missing-draft"
        | "draft-not-active"
        | "missing-team"
        | "wrong-team"
        | "missing-player"
        | "player-unavailable"
        | "roster-limit";
      message: string;
    };

export function createSnakeDraftSequence(teamIds: string[], rounds: number) {
  return Array.from({ length: Math.max(0, rounds) }, (_, roundIndex) => {
    const order = roundIndex % 2 === 0 ? teamIds : [...teamIds].reverse();

    return order.map((teamId, pickIndex) => ({
      round: roundIndex + 1,
      teamId,
      pickInRound: pickIndex + 1,
      overallPick: roundIndex * teamIds.length + pickIndex + 1,
    }));
  }).flat();
}

export function getSnakeDraftTeamId(teamIds: string[], pickIndex: number) {
  if (teamIds.length === 0 || pickIndex < 0) {
    return "";
  }

  const roundIndex = Math.floor(pickIndex / teamIds.length);
  const indexInRound = pickIndex % teamIds.length;
  const order = roundIndex % 2 === 0 ? teamIds : [...teamIds].reverse();

  return order[indexInRound] ?? "";
}

export function createPreparedMultiplayerDraftState(input: {
  leagueId: string;
  teamIds: string[];
  availablePlayerIds: string[];
  startedAt: string | null;
  draftRunId?: string;
}): OnlineFantasyDraftState & { draftRunId?: string } {
  return {
    leagueId: input.leagueId,
    status: "active",
    round: 1,
    pickNumber: 1,
    currentTeamId: input.teamIds[0] ?? "",
    draftOrder: input.teamIds,
    picks: [],
    availablePlayerIds: input.availablePlayerIds,
    startedAt: input.startedAt,
    completedAt: null,
    ...(input.draftRunId ? { draftRunId: input.draftRunId } : {}),
  };
}

export function getNextPreparedMultiplayerDraftState(input: {
  state: OnlineFantasyDraftState;
  nextPicks: OnlineFantasyDraftPick[];
  nextAvailablePlayerIds: string[];
  now: string;
}) {
  const targetPickCount =
    input.state.draftOrder.length * ONLINE_FANTASY_DRAFT_ROSTER_TARGET_SIZE;
  const completed =
    input.state.draftOrder.length > 0 && input.nextPicks.length >= targetPickCount;

  if (completed) {
    return {
      ...input.state,
      status: "completed" as const,
      picks: input.nextPicks,
      availablePlayerIds: input.nextAvailablePlayerIds,
      currentTeamId: "",
      completedAt: input.state.completedAt ?? input.now,
    };
  }

  const nextPickIndex = input.nextPicks.length;

  return {
    ...input.state,
    status: "active" as const,
    picks: input.nextPicks,
    availablePlayerIds: input.nextAvailablePlayerIds,
    round: Math.floor(nextPickIndex / Math.max(1, input.state.draftOrder.length)) + 1,
    pickNumber: nextPickIndex + 1,
    currentTeamId: getSnakeDraftTeamId(input.state.draftOrder, nextPickIndex),
  };
}

export function validatePreparedMultiplayerDraftPick(
  input: MultiplayerDraftPickValidationInput,
): MultiplayerDraftPickValidationResult {
  if (!input.state) {
    return {
      ok: false,
      status: "missing-draft",
      message: "Fantasy Draft ist nicht vorbereitet.",
    };
  }

  if (input.state.status !== "active") {
    return {
      ok: false,
      status: "draft-not-active",
      message: "Fantasy Draft ist nicht aktiv.",
    };
  }

  if (!input.teamIds.includes(input.teamId) || !input.state.draftOrder.includes(input.teamId)) {
    return {
      ok: false,
      status: "missing-team",
      message: "Team gehoert nicht zu dieser Liga.",
    };
  }

  if (input.state.currentTeamId !== input.teamId) {
    return {
      ok: false,
      status: "wrong-team",
      message: "Dieses Team ist aktuell nicht am Zug.",
    };
  }

  if (input.rosterSize >= ONLINE_FANTASY_DRAFT_ROSTER_TARGET_SIZE) {
    return {
      ok: false,
      status: "roster-limit",
      message: "Roster-Limit ist erreicht.",
    };
  }

  const player = input.availablePlayers.find((candidate) => candidate.playerId === input.playerId);

  if (!player) {
    return {
      ok: false,
      status: "missing-player",
      message: "Spieler ist nicht im Draft-Pool.",
    };
  }

  if (
    !input.state.availablePlayerIds.includes(input.playerId) ||
    input.existingPicks.some((pick) => pick.playerId === input.playerId)
  ) {
    return {
      ok: false,
      status: "player-unavailable",
      message: "Spieler ist nicht mehr verfuegbar.",
    };
  }

  return { ok: true, player };
}
