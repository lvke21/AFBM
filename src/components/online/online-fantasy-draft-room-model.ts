import {
  ONLINE_FANTASY_DRAFT_POSITIONS,
  ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS,
  type OnlineFantasyDraftPosition,
} from "@/lib/online/online-league-draft-service";
import type {
  OnlineContractPlayer,
  OnlineFantasyDraftPick,
} from "@/lib/online/online-league-types";

export type DraftPlayerSortDirection = "desc" | "asc";
export type DraftPositionFilter = OnlineFantasyDraftPosition | "ALL";

export type PickedDraftPlayer = {
  pick: OnlineFantasyDraftPick;
  player: OnlineContractPlayer;
};

export function createDraftPlayerMap(players: OnlineContractPlayer[]) {
  return new Map(players.map((player) => [player.playerId, player]));
}

export function deriveAvailableDraftPlayers(input: {
  availablePlayerIds: string[];
  playerPool: OnlineContractPlayer[];
  positionFilter: DraftPositionFilter;
  sortDirection: DraftPlayerSortDirection;
}) {
  const availablePlayerIds = new Set(input.availablePlayerIds);

  return input.playerPool
    .filter((player) => availablePlayerIds.has(player.playerId))
    .filter(
      (player) => input.positionFilter === "ALL" || player.position === input.positionFilter,
    )
    .sort((left, right) =>
      input.sortDirection === "desc"
        ? right.overall - left.overall || left.playerName.localeCompare(right.playerName)
        : left.overall - right.overall || left.playerName.localeCompare(right.playerName),
    );
}

export function derivePickedDraftPlayers(
  picks: OnlineFantasyDraftPick[],
  playersById: Map<string, OnlineContractPlayer>,
  limit = 20,
) {
  return picks
    .map((pick) => {
      const player = playersById.get(pick.playerId);

      return player ? { pick, player } : null;
    })
    .filter((entry): entry is PickedDraftPlayer => Boolean(entry))
    .slice()
    .reverse()
    .slice(0, limit);
}

export function deriveTeamDraftRoster(
  picks: OnlineFantasyDraftPick[],
  teamId: string,
  playersById: Map<string, OnlineContractPlayer>,
) {
  return picks
    .filter((pick) => pick.teamId === teamId)
    .map((pick) => playersById.get(pick.playerId))
    .filter((player): player is OnlineContractPlayer => Boolean(player));
}

export function deriveDraftRosterCounts(players: OnlineContractPlayer[]) {
  const countByPosition = new Map<string, number>();

  for (const player of players) {
    countByPosition.set(player.position, (countByPosition.get(player.position) ?? 0) + 1);
  }

  return ONLINE_FANTASY_DRAFT_POSITIONS.map((position) => ({
    position,
    count: countByPosition.get(position) ?? 0,
    target: ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS[position],
  }));
}
