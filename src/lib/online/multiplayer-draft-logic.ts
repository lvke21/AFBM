import { ONLINE_FANTASY_DRAFT_ROSTER_TARGET_SIZE } from "./online-league-draft-service";
import type {
  OnlineContractPlayer,
  OnlineFantasyDraftPick,
  OnlineFantasyDraftState,
} from "./online-league-types";

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
        | "draft-inconsistent"
        | "draft-not-active"
        | "missing-team"
        | "wrong-team"
        | "missing-player"
        | "player-unavailable"
        | "roster-limit";
      message: string;
    };

export type MultiplayerDraftStateIntegrityIssueCode =
  | "active-current-team-mismatch"
  | "active-pick-cursor-mismatch"
  | "active-round-mismatch"
  | "available-player-duplicated"
  | "completed-current-team-not-empty"
  | "completed-pick-cursor-mismatch"
  | "completed-round-mismatch"
  | "completed-picks-missing"
  | "duplicate-draft-order-team"
  | "duplicate-pick-number"
  | "duplicate-picked-player"
  | "non-contiguous-picks"
  | "not-started-with-picks"
  | "pick-team-not-in-order"
  | "picked-player-still-available";

export type MultiplayerDraftStateIntegrityIssue = {
  code: MultiplayerDraftStateIntegrityIssueCode;
  message: string;
};

export type MultiplayerDraftStateIntegrityResult = {
  issues: MultiplayerDraftStateIntegrityIssue[];
  ok: boolean;
};

export type MultiplayerDraftSourceConsistencyIssueCode =
  | "available-player-missing-from-pool"
  | "legacy-draft-state-conflict"
  | "picked-player-missing-from-pool"
  | "pool-player-missing-from-availability";

export type MultiplayerDraftSourceConsistencyIssue = {
  code: MultiplayerDraftSourceConsistencyIssueCode;
  message: string;
};

export type MultiplayerDraftSourceConsistencyResult = {
  issues: MultiplayerDraftSourceConsistencyIssue[];
  ok: boolean;
};

export type MultiplayerDraftStoredPick = OnlineFantasyDraftPick & {
  draftRunId?: string;
};

export type MultiplayerDraftRunDocument = {
  draftRunId?: string;
};

export function getMultiplayerDraftPickDocumentId(pickNumber: number) {
  return String(pickNumber).padStart(4, "0");
}

export function belongsToCurrentMultiplayerDraftRun(
  document: MultiplayerDraftRunDocument | null | undefined,
  draftRunId?: string,
) {
  if (!document) {
    return false;
  }

  if (!draftRunId || !document.draftRunId) {
    return true;
  }

  return document.draftRunId === draftRunId;
}

export function isCurrentMultiplayerDraftPickDocumentOccupied(
  pick: MultiplayerDraftStoredPick | null | undefined,
  draftRunId?: string,
) {
  if (!pick) {
    return false;
  }

  if (!draftRunId) {
    return true;
  }

  return !pick.draftRunId || pick.draftRunId === draftRunId;
}

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

function getDuplicateValues(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }

    seen.add(value);
  }

  return [...duplicates];
}

function getDuplicateNumbers(values: number[]) {
  const seen = new Set<number>();
  const duplicates = new Set<number>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }

    seen.add(value);
  }

  return [...duplicates];
}

function sameStringArray(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function hasLegacyDraftStateConflict(
  state: OnlineFantasyDraftState,
  legacyState: OnlineFantasyDraftState,
) {
  return (
    state.status !== legacyState.status ||
    state.pickNumber !== legacyState.pickNumber ||
    state.round !== legacyState.round ||
    state.currentTeamId !== legacyState.currentTeamId ||
    !sameStringArray(state.draftOrder, legacyState.draftOrder) ||
    state.picks.length !== legacyState.picks.length ||
    state.availablePlayerIds.length !== legacyState.availablePlayerIds.length
  );
}

export function validateMultiplayerDraftSourceConsistency(input: {
  state: OnlineFantasyDraftState;
  playerPool?: OnlineContractPlayer[];
  legacyState?: OnlineFantasyDraftState | null;
}): MultiplayerDraftSourceConsistencyResult {
  const issues: MultiplayerDraftSourceConsistencyIssue[] = [];
  const playerPool = input.playerPool ?? [];
  const playerPoolIds = new Set(playerPool.map((player) => player.playerId));
  const pickedPlayerIds = new Set(input.state.picks.map((pick) => pick.playerId));
  const availablePlayerIds = new Set(input.state.availablePlayerIds);

  if (input.legacyState && hasLegacyDraftStateConflict(input.state, input.legacyState)) {
    issues.push({
      code: "legacy-draft-state-conflict",
      message:
        "Legacy-Draft-Blob widerspricht dem kanonischen Draft-State aus Draft-Doc und Subcollections.",
    });
  }

  if (playerPool.length > 0) {
    for (const pick of input.state.picks) {
      if (!playerPoolIds.has(pick.playerId)) {
        issues.push({
          code: "picked-player-missing-from-pool",
          message: `Gepickter Spieler ${pick.playerId} fehlt im Draft-Pool.`,
        });
      }
    }

    for (const playerId of input.state.availablePlayerIds) {
      if (!playerPoolIds.has(playerId)) {
        issues.push({
          code: "available-player-missing-from-pool",
          message: `Verfuegbarer Spieler ${playerId} fehlt im Draft-Pool.`,
        });
      }
    }

    if (input.state.status !== "completed") {
      for (const playerId of playerPoolIds) {
        if (!pickedPlayerIds.has(playerId) && !availablePlayerIds.has(playerId)) {
          issues.push({
            code: "pool-player-missing-from-availability",
            message: `Ungedrafteter Spieler ${playerId} fehlt in availablePlayers.`,
          });
        }
      }
    }
  }

  return {
    issues,
    ok: issues.length === 0,
  };
}

export function validateMultiplayerDraftStateIntegrity(
  state: OnlineFantasyDraftState,
  options: { expectedPickCount?: number } = {},
): MultiplayerDraftStateIntegrityResult {
  const issues: MultiplayerDraftStateIntegrityIssue[] = [];
  const sortedPicks = [...state.picks].sort((left, right) => left.pickNumber - right.pickNumber);
  const draftOrderTeamIds = new Set(state.draftOrder);

  for (const teamId of getDuplicateValues(state.draftOrder)) {
    issues.push({
      code: "duplicate-draft-order-team",
      message: `Draft-Order enthaelt Team ${teamId} mehrfach.`,
    });
  }

  for (const playerId of getDuplicateValues(state.availablePlayerIds)) {
    issues.push({
      code: "available-player-duplicated",
      message: `Spieler ${playerId} ist mehrfach als verfuegbar markiert.`,
    });
  }

  for (const pickNumber of getDuplicateNumbers(state.picks.map((pick) => pick.pickNumber))) {
    issues.push({
      code: "duplicate-pick-number",
      message: `Pick-Slot ${pickNumber} ist mehrfach belegt.`,
    });
  }

  for (const playerId of getDuplicateValues(state.picks.map((pick) => pick.playerId))) {
    issues.push({
      code: "duplicate-picked-player",
      message: `Spieler ${playerId} wurde mehrfach gepickt.`,
    });
  }

  for (const pick of sortedPicks) {
    if (!draftOrderTeamIds.has(pick.teamId)) {
      issues.push({
        code: "pick-team-not-in-order",
        message: `Pick ${pick.pickNumber} referenziert Team ${pick.teamId} ausserhalb der Draft-Order.`,
      });
    }
  }

  const availablePlayerIds = new Set(state.availablePlayerIds);

  for (const pick of sortedPicks) {
    if (availablePlayerIds.has(pick.playerId)) {
      issues.push({
        code: "picked-player-still-available",
        message: `Gepickter Spieler ${pick.playerId} ist weiterhin als verfuegbar markiert.`,
      });
    }
  }

  sortedPicks.forEach((pick, index) => {
    const expectedPickNumber = index + 1;

    if (pick.pickNumber !== expectedPickNumber) {
      issues.push({
        code: "non-contiguous-picks",
        message: `Pick-Historie springt bei Slot ${expectedPickNumber}.`,
      });
    }
  });

  if (state.status === "not_started" && sortedPicks.length > 0) {
    issues.push({
      code: "not-started-with-picks",
      message: "Draft ist nicht gestartet, enthaelt aber bereits Picks.",
    });
  }

  if (state.status === "active") {
    const expectedPickNumber = sortedPicks.length + 1;
    const expectedRound =
      Math.floor(sortedPicks.length / Math.max(1, state.draftOrder.length)) + 1;
    const expectedCurrentTeamId = getSnakeDraftTeamId(state.draftOrder, sortedPicks.length);

    if (state.pickNumber !== expectedPickNumber) {
      issues.push({
        code: "active-pick-cursor-mismatch",
        message: `Aktiver Draft erwartet Pick ${expectedPickNumber}, gespeichert ist Pick ${state.pickNumber}.`,
      });
    }

    if (state.round !== expectedRound) {
      issues.push({
        code: "active-round-mismatch",
        message: `Aktiver Draft erwartet Runde ${expectedRound}, gespeichert ist Runde ${state.round}.`,
      });
    }

    if (state.currentTeamId !== expectedCurrentTeamId) {
      issues.push({
        code: "active-current-team-mismatch",
        message: `Aktiver Draft erwartet Team ${expectedCurrentTeamId || "n/a"}, gespeichert ist Team ${state.currentTeamId || "n/a"}.`,
      });
    }
  }

  if (state.status === "completed" && state.currentTeamId !== "") {
    issues.push({
      code: "completed-current-team-not-empty",
      message: "Abgeschlossener Draft darf kein aktuelles Team am Zug haben.",
    });
  }

  if (state.status === "completed") {
    const expectedPickNumber = sortedPicks.length;
    const expectedRound = sortedPicks.length === 0
      ? 1
      : Math.floor((sortedPicks.length - 1) / Math.max(1, state.draftOrder.length)) + 1;

    if (state.pickNumber !== expectedPickNumber) {
      issues.push({
        code: "completed-pick-cursor-mismatch",
        message: `Abgeschlossener Draft erwartet finalen Pick ${expectedPickNumber}, gespeichert ist Pick ${state.pickNumber}.`,
      });
    }

    if (state.round !== expectedRound) {
      issues.push({
        code: "completed-round-mismatch",
        message: `Abgeschlossener Draft erwartet finale Runde ${expectedRound}, gespeichert ist Runde ${state.round}.`,
      });
    }
  }

  if (
    state.status === "completed" &&
    typeof options.expectedPickCount === "number" &&
    sortedPicks.length !== options.expectedPickCount
  ) {
    issues.push({
      code: "completed-picks-missing",
      message: `Abgeschlossener Draft erwartet ${options.expectedPickCount} Picks, gespeichert sind ${sortedPicks.length}.`,
    });
  }

  return {
    issues,
    ok: issues.length === 0,
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

  const integrity = validateMultiplayerDraftStateIntegrity(input.state);

  if (!integrity.ok) {
    return {
      ok: false,
      status: "draft-inconsistent",
      message: `Draft-State ist inkonsistent: ${integrity.issues[0]?.message ?? "Bitte Draft neu laden."}`,
    };
  }

  const sourceConsistency = validateMultiplayerDraftSourceConsistency({
    state: input.state,
    playerPool: input.availablePlayers,
  });

  if (!sourceConsistency.ok) {
    return {
      ok: false,
      status: "draft-inconsistent",
      message: `Draft-Quellen sind inkonsistent: ${sourceConsistency.issues[0]?.message ?? "Bitte Draft neu laden."}`,
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
