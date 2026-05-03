import {
  createFantasyDraftPlayerPool,
  createInitialFantasyDraftState,
} from "@/lib/online/online-league-service";
import {
  ONLINE_FANTASY_DRAFT_POSITIONS,
  ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS,
} from "@/lib/online/online-league-draft-service";
import { normalizeOnlineLeagueCoreLifecycle } from "@/lib/online/online-league-lifecycle";
import type {
  OnlineContractPlayer,
  OnlineFantasyDraftPick,
  OnlineFantasyDraftState,
  OnlineLeague,
} from "@/lib/online/online-league-types";
import type { FirestoreOnlineLeagueDoc } from "@/lib/online/types";

export function getFirestoreFantasyDraftStatus(
  league: FirestoreOnlineLeagueDoc,
): "not_started" | "active" | "completed" | null {
  const fantasyDraft = league.settings.fantasyDraft;

  if (typeof fantasyDraft !== "object" || fantasyDraft === null || !("status" in fantasyDraft)) {
    return null;
  }

  const status = fantasyDraft.status;

  return status === "not_started" || status === "active" || status === "completed"
    ? status
    : null;
}

export function getFirestoreFantasyDraftState(
  league: FirestoreOnlineLeagueDoc,
): OnlineFantasyDraftState | null {
  const value = league.settings.fantasyDraft as Partial<OnlineFantasyDraftState> | undefined;

  if (
    !value ||
    typeof value.leagueId !== "string" ||
    (value.status !== "not_started" && value.status !== "active" && value.status !== "completed") ||
    typeof value.round !== "number" ||
    typeof value.pickNumber !== "number" ||
    typeof value.currentTeamId !== "string" ||
    !Array.isArray(value.draftOrder) ||
    !Array.isArray(value.picks) ||
    !Array.isArray(value.availablePlayerIds)
  ) {
    return null;
  }

  return value as OnlineFantasyDraftState;
}

export function getFirestoreFantasyDraftPlayerPool(
  league: FirestoreOnlineLeagueDoc,
): OnlineContractPlayer[] {
  return Array.isArray(league.settings.fantasyDraftPlayerPool)
    ? (league.settings.fantasyDraftPlayerPool as OnlineContractPlayer[])
    : [];
}

function getFantasyDraftPlayersById(league: OnlineLeague) {
  return new Map((league.fantasyDraftPlayerPool ?? []).map((player) => [player.playerId, player]));
}

function getFantasyDraftNeededPosition(league: OnlineLeague, teamId: string) {
  const draft = league.fantasyDraft;

  if (!draft) {
    return null;
  }

  const playersById = getFantasyDraftPlayersById(league);
  const teamPicks = draft.picks.filter((pick) => pick.teamId === teamId);

  return (
    ONLINE_FANTASY_DRAFT_POSITIONS.find((position) => {
      const count = teamPicks.filter(
        (pick) => playersById.get(pick.playerId)?.position === position,
      ).length;

      return count < ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS[position];
    }) ?? null
  );
}

export function getBestAdminAutoDraftPlayer(league: OnlineLeague): OnlineContractPlayer | null {
  const draft = league.fantasyDraft;
  const lifecycle = normalizeOnlineLeagueCoreLifecycle({
    league,
    requiresDraft: Boolean(draft),
  });

  if (!draft || lifecycle.draftStatus !== "active" || !draft.currentTeamId) {
    return null;
  }

  const neededPosition = getFantasyDraftNeededPosition(league, draft.currentTeamId);
  const availableIds = new Set(draft.availablePlayerIds);
  const candidates = (league.fantasyDraftPlayerPool ?? [])
    .filter((player) => availableIds.has(player.playerId))
    .filter((player) => !neededPosition || player.position === neededPosition)
    .sort((left, right) => right.overall - left.overall || left.age - right.age);

  if (candidates[0]) {
    return candidates[0];
  }

  return (league.fantasyDraftPlayerPool ?? [])
    .filter((player) => availableIds.has(player.playerId))
    .sort((left, right) => right.overall - left.overall || left.age - right.age)[0] ?? null;
}

export function getCurrentDraftUser(league: OnlineLeague) {
  return league.users.find((user) => user.teamId === league.fantasyDraft?.currentTeamId) ?? null;
}

export function resetFantasyDraftState(league: OnlineLeague): OnlineLeague {
  return {
    ...league,
    fantasyDraft: createInitialFantasyDraftState(league.id, league.maxUsers),
    fantasyDraftPlayerPool: createFantasyDraftPlayerPool(league.id, league.maxUsers),
    status: "waiting",
    weekStatus: "pre_week",
    currentWeek: 1,
    currentSeason: 1,
    lastSimulatedWeekKey: undefined,
    matchResults: [],
    completedWeeks: [],
    users: league.users.map((user) => ({
      ...user,
      contractRoster: [],
      depthChart: [],
      readyForWeek: false,
    })),
  };
}

function getDraftPositionCounts(
  teamId: string,
  picks: OnlineFantasyDraftPick[],
  playersById: Map<string, OnlineContractPlayer>,
) {
  return ONLINE_FANTASY_DRAFT_POSITIONS.map((position) => ({
    position,
    count: picks.filter(
      (pick) => pick.teamId === teamId && playersById.get(pick.playerId)?.position === position,
    ).length,
  }));
}

function hasCompletedDraftRoster(
  teamId: string,
  picks: OnlineFantasyDraftPick[],
  playersById: Map<string, OnlineContractPlayer>,
) {
  return getDraftPositionCounts(teamId, picks, playersById).every(
    (entry) => entry.count >= ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS[entry.position],
  );
}

function getSnakeDraftTeamId(draftOrder: string[], pickIndex: number) {
  if (draftOrder.length === 0) {
    return "";
  }

  const roundIndex = Math.floor(pickIndex / draftOrder.length);
  const indexInRound = pickIndex % draftOrder.length;
  const order = roundIndex % 2 === 0 ? draftOrder : [...draftOrder].reverse();

  return order[indexInRound] ?? "";
}

export function getNextAdminDraftState(
  state: OnlineFantasyDraftState,
  playerPool: OnlineContractPlayer[],
  now: string,
): OnlineFantasyDraftState {
  const playersById = new Map(playerPool.map((player) => [player.playerId, player]));
  const completed =
    state.draftOrder.length > 0 &&
    state.draftOrder.every((teamId) => hasCompletedDraftRoster(teamId, state.picks, playersById));

  if (completed) {
    return {
      ...state,
      status: "completed",
      currentTeamId: "",
      completedAt: state.completedAt ?? now,
    };
  }

  const nextPickIndex = state.picks.length;

  return {
    ...state,
    status: "active",
    round: Math.floor(nextPickIndex / Math.max(1, state.draftOrder.length)) + 1,
    pickNumber: nextPickIndex + 1,
    currentTeamId: getSnakeDraftTeamId(state.draftOrder, nextPickIndex),
  };
}

export function createAdminDraftDepthChart(roster: OnlineContractPlayer[], now: string) {
  const positions = Array.from(new Set(roster.map((player) => player.position)));

  return positions.map((position) => {
    const players = roster
      .filter((player) => player.position === position)
      .sort((left, right) => right.overall - left.overall);

    return {
      position,
      starterPlayerId: players[0]?.playerId ?? "",
      backupPlayerIds: players.slice(1).map((player) => player.playerId),
      updatedAt: now,
    };
  });
}
