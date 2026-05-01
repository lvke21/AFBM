import type {
  OnlineContractPlayer,
  OnlineFantasyDraftPick,
  OnlineFantasyDraftState,
} from "./online-league-types";

export const ONLINE_FANTASY_DRAFT_SEED = "afbm-online-fantasy-draft-v1";
export const ONLINE_FANTASY_DRAFT_RESERVE_RATE = 0.2;
export const ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS = {
  QB: 2,
  RB: 3,
  WR: 5,
  TE: 2,
  OL: 8,
  DL: 6,
  LB: 5,
  CB: 5,
  S: 3,
  K: 1,
  P: 1,
} as const;
export const ONLINE_FANTASY_DRAFT_ROSTER_TARGET_SIZE = Object.values(
  ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS,
).reduce((sum, count) => sum + count, 0);
export type OnlineFantasyDraftPosition =
  keyof typeof ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS;
export const ONLINE_FANTASY_DRAFT_POSITIONS = Object.keys(
  ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS,
) as OnlineFantasyDraftPosition[];

export function getSnakeDraftTeamId(draftOrder: string[], pickIndex: number) {
  if (draftOrder.length === 0) {
    return "";
  }

  const roundIndex = Math.floor(pickIndex / draftOrder.length);
  const indexInRound = pickIndex % draftOrder.length;
  const order = roundIndex % 2 === 0 ? draftOrder : [...draftOrder].reverse();

  return order[indexInRound] ?? "";
}

export function getOnlineFantasyDraftPickPositionCounts(
  picks: OnlineFantasyDraftPick[],
  playerPool: OnlineContractPlayer[],
  teamId: string,
) {
  const playersById = new Map(playerPool.map((player) => [player.playerId, player]));

  return picks
    .filter((pick) => pick.teamId === teamId)
    .reduce((counts, pick) => {
      const position = playersById.get(pick.playerId)?.position as
        | OnlineFantasyDraftPosition
        | undefined;

      if (position && position in ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS) {
        counts.set(position, (counts.get(position) ?? 0) + 1);
      }

      return counts;
    }, new Map<OnlineFantasyDraftPosition, number>());
}

export function hasOnlineFantasyDraftTeamRosterCompleted(
  picks: OnlineFantasyDraftPick[],
  playerPool: OnlineContractPlayer[],
  teamId: string,
) {
  const totalPicks = picks.filter((pick) => pick.teamId === teamId).length;

  if (totalPicks < ONLINE_FANTASY_DRAFT_ROSTER_TARGET_SIZE) {
    return false;
  }

  const positionCounts = getOnlineFantasyDraftPickPositionCounts(picks, playerPool, teamId);

  return ONLINE_FANTASY_DRAFT_POSITIONS.every(
    (position) =>
      (positionCounts.get(position) ?? 0) >=
      ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS[position],
  );
}

export function isOnlineFantasyDraftComplete(
  state: OnlineFantasyDraftState,
  playerPool: OnlineContractPlayer[],
) {
  if (state.draftOrder.length === 0) {
    return false;
  }

  return state.draftOrder.every((teamId) =>
    hasOnlineFantasyDraftTeamRosterCompleted(state.picks, playerPool, teamId),
  );
}

export function getNextFantasyDraftStateAfterPick(
  state: OnlineFantasyDraftState,
  playerPool: OnlineContractPlayer[],
  now: string,
): OnlineFantasyDraftState {
  if (isOnlineFantasyDraftComplete(state, playerPool)) {
    return {
      ...state,
      status: "completed",
      completedAt: state.completedAt ?? now,
      currentTeamId: "",
    };
  }

  const nextPickIndex = state.picks.length;
  const nextRound = Math.floor(nextPickIndex / Math.max(1, state.draftOrder.length)) + 1;

  return {
    ...state,
    status: "active",
    round: nextRound,
    pickNumber: nextPickIndex + 1,
    currentTeamId: getSnakeDraftTeamId(state.draftOrder, nextPickIndex),
  };
}
