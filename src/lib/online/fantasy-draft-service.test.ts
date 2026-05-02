import { describe, expect, it } from "vitest";

import {
  addFakeUserToOnlineLeague,
  createOnlineLeague,
  getOnlineLeagueById,
  ONLINE_FANTASY_DRAFT_POSITIONS,
  ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS,
  ONLINE_FANTASY_DRAFT_ROSTER_TARGET_SIZE,
  ONLINE_MVP_TEAM_POOL,
  saveOnlineLeague,
  type OnlineLeague,
} from "./online-league-service";
import {
  buildRostersFromDraft,
  completeDraftIfReady,
  getAvailablePlayers,
  getDraftState,
  initializeFantasyDraft,
  makeDraftPick,
} from "./fantasy-draft-service";

class MemoryStorage {
  private readonly items = new Map<string, string>();

  getItem(key: string) {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.items.set(key, value);
  }

  removeItem(key: string) {
    this.items.delete(key);
  }
}

function createFilledDraftLeague(storage: MemoryStorage, maxUsers = 16) {
  const league = createOnlineLeague({ name: `Draft Service ${maxUsers}`, maxUsers }, storage);

  for (let index = 0; index < maxUsers; index += 1) {
    addFakeUserToOnlineLeague(storage);
  }

  return getOnlineLeagueById(league.id, storage) ?? league;
}

function getNextNeededPosition(league: OnlineLeague, teamId: string) {
  const draft = league.fantasyDraft;

  if (!draft) {
    throw new Error("Expected fantasy draft state.");
  }

  const playersById = new Map(
    (league.fantasyDraftPlayerPool ?? []).map((player) => [player.playerId, player]),
  );
  const teamPicks = draft.picks.filter((pick) => pick.teamId === teamId);

  return ONLINE_FANTASY_DRAFT_POSITIONS.find((position) => {
    const count = teamPicks.filter(
      (pick) => playersById.get(pick.playerId)?.position === position,
    ).length;

    return count < ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS[position];
  });
}

function makeNextBalancedPick(leagueId: string, storage: MemoryStorage) {
  const league = getOnlineLeagueById(leagueId, storage);
  const draft = getDraftState(leagueId, storage);

  if (!league || !draft || draft.status !== "active") {
    throw new Error("Expected active fantasy draft.");
  }

  const currentUser = league.users.find((user) => user.teamId === draft.currentTeamId);
  const neededPosition = getNextNeededPosition(league, draft.currentTeamId);
  const player = getAvailablePlayers(
    leagueId,
    neededPosition ? { position: neededPosition, sortBy: "overall" } : {},
    storage,
  )[0];

  if (!currentUser || !player) {
    throw new Error("Expected current draft user and available player.");
  }

  return makeDraftPick(leagueId, draft.currentTeamId, currentUser.userId, player.playerId, storage);
}

function completeBalancedDraft(leagueId: string, storage: MemoryStorage) {
  let state = getDraftState(leagueId, storage);
  let guard = 0;

  while (state?.status === "active") {
    const result = makeNextBalancedPick(leagueId, storage);

    if (result.status !== "success" && result.status !== "completed") {
      throw new Error(`Expected draft pick success, received ${result.status}.`);
    }

    guard += 1;
    if (guard > ONLINE_MVP_TEAM_POOL.length * ONLINE_FANTASY_DRAFT_ROSTER_TARGET_SIZE) {
      throw new Error("Draft did not complete within the expected roster size.");
    }

    state = getDraftState(leagueId, storage);
  }

  return getOnlineLeagueById(leagueId, storage);
}

function expectCompleteRosterShape(league: OnlineLeague) {
  league.users.forEach((user) => {
    const roster = user.contractRoster ?? [];

    expect(roster).toHaveLength(ONLINE_FANTASY_DRAFT_ROSTER_TARGET_SIZE);
    ONLINE_FANTASY_DRAFT_POSITIONS.forEach((position) => {
      expect(roster.filter((player) => player.position === position)).toHaveLength(
        ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS[position],
      );
    });
  });
}

describe("fantasy-draft-service", () => {
  it("runs a complete 16-team fantasy draft and builds full rosters", () => {
    const storage = new MemoryStorage();
    const league = createFilledDraftLeague(storage, 16);
    const initialized = initializeFantasyDraft(league.id, storage);

    expect(initialized?.fantasyDraft).toMatchObject({
      status: "active",
      draftOrder: ONLINE_MVP_TEAM_POOL.map((team) => team.id),
    });

    const completed = completeBalancedDraft(league.id, storage);

    expect(completed?.fantasyDraft?.status).toBe("completed");
    expect(completed?.status).toBe("active");
    expect(completed?.weekStatus).toBe("ready");
    expect(completed?.users).toHaveLength(16);

    if (!completed) {
      throw new Error("Expected completed league.");
    }

    expectCompleteRosterShape(completed);
    expect(
      new Set(
        completed.users.flatMap((user) =>
          user.contractRoster?.map((player) => player.playerId) ?? [],
        ),
      ).size,
    ).toBe(16 * ONLINE_FANTASY_DRAFT_ROSTER_TARGET_SIZE);
  }, 30_000);

  it("keeps snake order stable across multiple rounds", () => {
    const storage = new MemoryStorage();
    const league = createFilledDraftLeague(storage, 3);

    initializeFantasyDraft(league.id, storage);

    const observedTeams: string[] = [];
    for (let index = 0; index < 5; index += 1) {
      const state = getDraftState(league.id, storage);

      if (!state) {
        throw new Error("Expected draft state.");
      }

      observedTeams.push(state.currentTeamId);
      makeNextBalancedPick(league.id, storage);
    }

    expect(observedTeams).toEqual([
      ONLINE_MVP_TEAM_POOL[0].id,
      ONLINE_MVP_TEAM_POOL[1].id,
      ONLINE_MVP_TEAM_POOL[2].id,
      ONLINE_MVP_TEAM_POOL[2].id,
      ONLINE_MVP_TEAM_POOL[1].id,
    ]);
  });

  it("keeps racing pick attempts atomic by accepting only one stale request", () => {
    const storage = new MemoryStorage();
    const league = createFilledDraftLeague(storage, 2);
    const initialized = initializeFantasyDraft(league.id, storage);
    const state = initialized?.fantasyDraft;
    const currentUser = initialized?.users.find((user) => user.teamId === state?.currentTeamId);
    const player = getAvailablePlayers(league.id, { position: "QB" }, storage)[0];

    if (!state || !currentUser || !player) {
      throw new Error("Expected draft pick setup.");
    }

    const first = makeDraftPick(league.id, state.currentTeamId, currentUser.userId, player.playerId, storage);
    const second = makeDraftPick(league.id, state.currentTeamId, currentUser.userId, player.playerId, storage);
    const storedState = getDraftState(league.id, storage);

    expect([first.status, second.status].filter((status) => status === "success")).toHaveLength(1);
    expect(storedState?.picks.filter((pick) => pick.playerId === player.playerId)).toHaveLength(1);
    expect(storedState?.availablePlayerIds).not.toContain(player.playerId);
  });

  it("blocks invalid users and invalid players", () => {
    const storage = new MemoryStorage();
    const league = createFilledDraftLeague(storage, 2);
    const initialized = initializeFantasyDraft(league.id, storage);
    const state = initialized?.fantasyDraft;
    const player = getAvailablePlayers(league.id, { position: "QB" }, storage)[0];

    if (!state || !player) {
      throw new Error("Expected draft setup.");
    }

    expect(
      makeDraftPick(league.id, state.currentTeamId, "not-this-gm", player.playerId, storage)
        .status,
    ).toBe("missing-user");
    expect(
      makeDraftPick(league.id, state.currentTeamId, initialized.users[0].userId, "missing-player", storage)
        .status,
    ).toBe("player-unavailable");
  });

  it("blocks picks when the current team has already reached the roster target", () => {
    const storage = new MemoryStorage();
    const league = createFilledDraftLeague(storage, 2);
    const initialized = initializeFantasyDraft(league.id, storage);
    const state = initialized?.fantasyDraft;
    const currentUser = initialized?.users.find((user) => user.teamId === state?.currentTeamId);
    const player = getAvailablePlayers(league.id, { position: "QB" }, storage)[0];

    if (!initialized || !state || !currentUser || !player) {
      throw new Error("Expected draft setup.");
    }

    const rosterLimitLeague = {
      ...initialized,
      users: initialized.users.map((user) =>
        user.userId === currentUser.userId
          ? {
              ...user,
              contractRoster: initialized.fantasyDraftPlayerPool?.slice(
                0,
                ONLINE_FANTASY_DRAFT_ROSTER_TARGET_SIZE,
              ),
            }
          : user,
      ),
    };

    saveOnlineLeague(rosterLimitLeague, storage);

    const result = makeDraftPick(
      league.id,
      state.currentTeamId,
      currentUser.userId,
      player.playerId,
      storage,
    );

    expect(result.status).toBe("player-unavailable");
    expect(result.message).toBe("Roster-Limit ist erreicht.");
  });

  it("exposes available player filters and roster build helpers", () => {
    const storage = new MemoryStorage();
    const league = createFilledDraftLeague(storage, 2);

    initializeFantasyDraft(league.id, storage);

    const quarterbacks = getAvailablePlayers(
      league.id,
      { position: "QB", minOverall: 80, limit: 5 },
      storage,
    );

    expect(quarterbacks.length).toBeGreaterThan(0);
    expect(quarterbacks.length).toBeLessThanOrEqual(5);
    expect(quarterbacks.every((player) => player.position === "QB" && player.overall >= 80)).toBe(true);

    expect(completeDraftIfReady(league.id, storage)?.fantasyDraft?.status).toBe("active");
    const completed = completeBalancedDraft(league.id, storage);
    const rebuilt = buildRostersFromDraft(league.id, storage);

    expect(rebuilt?.fantasyDraft?.status).toBe("completed");
    expect(
      rebuilt?.users.map((user) => ({
        teamId: user.teamId,
        rosterIds: user.contractRoster?.map((player) => player.playerId),
      })),
    ).toEqual(
      completed?.users.map((user) => ({
        teamId: user.teamId,
        rosterIds: user.contractRoster?.map((player) => player.playerId),
      })),
    );
  });
});
