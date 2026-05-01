import { describe, expect, it } from "vitest";

import {
  createOnlineLeague,
  createFantasyDraftPlayerPool,
  getFantasyDraftPositionTargetCounts,
  makeOnlineFantasyDraftPick,
  ONLINE_FANTASY_DRAFT_POSITIONS,
  ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS,
  ONLINE_FANTASY_DRAFT_ROSTER_TARGET_SIZE,
  simulateOnlineLeagueWeek,
  startOnlineFantasyDraft,
  type OnlineLeague,
} from "./online-league-service";
import { joinOnlineLeague } from "./online-league-service";
import type { TeamIdentitySelection } from "./team-identity-options";

const BERLIN_WOLVES: TeamIdentitySelection = {
  cityId: "berlin",
  category: "aggressive_competitive",
  teamNameId: "wolves",
};

const ZURICH_FORGE: TeamIdentitySelection = {
  cityId: "zurich",
  category: "identity_city",
  teamNameId: "forge",
};

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

function createTwoTeamDraftLeague(storage: MemoryStorage) {
  const league = createOnlineLeague({ name: "Fantasy Draft Test", maxUsers: 2 }, storage);
  joinOnlineLeague(
    league.id,
    { userId: "user-1", username: "Coach One" },
    BERLIN_WOLVES,
    storage,
  );
  const joined = joinOnlineLeague(
    league.id,
    { userId: "user-2", username: "Coach Two" },
    ZURICH_FORGE,
    storage,
  );

  if (joined.status !== "joined") {
    throw new Error("Expected second test user to join draft league.");
  }

  return joined.league;
}

function completeDraft(league: OnlineLeague, storage: MemoryStorage) {
  let currentLeague = startOnlineFantasyDraft(league.id, storage);

  if (!currentLeague?.fantasyDraft) {
    throw new Error("Expected active draft.");
  }

  while (currentLeague?.fantasyDraft?.status !== "completed") {
    const state = currentLeague.fantasyDraft;

    if (!state) {
      throw new Error("Expected draft state.");
    }

    const currentUser = currentLeague.users.find((user) => user.teamId === state.currentTeamId);
    const playerPool = currentLeague.fantasyDraftPlayerPool ?? [];
    const playersById = new Map(playerPool.map((player) => [player.playerId, player]));
    const currentTeamPicks = state.picks.filter((pick) => pick.teamId === state.currentTeamId);
    const neededPosition = ONLINE_FANTASY_DRAFT_POSITIONS.find((position) => {
      const count = currentTeamPicks.filter(
        (pick) => playersById.get(pick.playerId)?.position === position,
      ).length;

      return count < ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS[position];
    });
    const playerId =
      state.availablePlayerIds.find(
        (candidate) => playersById.get(candidate)?.position === neededPosition,
      ) ?? state.availablePlayerIds[0];

    if (!currentUser || !playerId) {
      throw new Error("Expected current user and available player.");
    }

    const result = makeOnlineFantasyDraftPick(
      currentLeague.id,
      currentUser.teamId,
      playerId,
      currentUser.userId,
      storage,
    );

    if (result.status !== "success" && result.status !== "completed") {
      throw new Error(`Expected draft pick to succeed, got ${result.status}.`);
    }

    currentLeague = result.league;
  }

  return currentLeague;
}

describe("online fantasy draft", () => {
  it("generates a deterministic full 16-team fantasy draft player pool with reserve", () => {
    const pool = createFantasyDraftPlayerPool("league-full-pool", 16);
    const repeatedPool = createFantasyDraftPlayerPool("league-full-pool", 16);
    const counts = getFantasyDraftPositionTargetCounts(16);
    const expectedPoolSize = Object.values(counts).reduce((sum, count) => sum + count, 0);
    const ids = new Set(pool.map((player) => player.playerId));

    expect(pool).toEqual(repeatedPool);
    expect(pool).toHaveLength(expectedPoolSize);
    expect(ids.size).toBe(pool.length);
    expect(expectedPoolSize).toBeGreaterThan(16 * ONLINE_FANTASY_DRAFT_ROSTER_TARGET_SIZE);

    ONLINE_FANTASY_DRAFT_POSITIONS.forEach((position) => {
      const requiredCount = ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS[position] * 16;
      const positionPlayers = pool.filter((player) => player.position === position);

      expect(positionPlayers).toHaveLength(counts[position]);
      expect(positionPlayers.length).toBeGreaterThanOrEqual(Math.ceil(requiredCount * 1.2));
    });
  });

  it("creates fantasy draft players with valid required fields, ages and ratings", () => {
    const pool = createFantasyDraftPlayerPool("league-player-fields", 16);

    pool.forEach((player) => {
      expect(player.playerId).toMatch(/^pool-/);
      expect(player.playerName.trim().length).toBeGreaterThan(0);
      expect(ONLINE_FANTASY_DRAFT_POSITIONS).toContain(player.position);
      expect(player.age).toBeGreaterThanOrEqual(21);
      expect(player.age).toBeLessThanOrEqual(36);
      expect(player.overall).toBeGreaterThanOrEqual(58);
      expect(player.overall).toBeLessThanOrEqual(94);
      expect(player.potential).toBeGreaterThanOrEqual(player.overall);
      expect(player.potential).toBeLessThanOrEqual(99);
      expect(player.developmentProgress).toBe(0);
      expect(player.status).toBe("active");
      expect(player.contract.salaryPerYear).toBeGreaterThan(0);
      expect(player.contract.yearsRemaining).toBeGreaterThanOrEqual(1);
      expect(player.contract.totalValue).toBeGreaterThan(0);
      expect(Array.isArray(player.xFactors)).toBe(true);
    });
  });

  it("creates a fantasy draft state and central player pool for a new league", () => {
    const storage = new MemoryStorage();
    const league = createOnlineLeague({ name: "Draft Creation", maxUsers: 2 }, storage);
    const expectedPoolSize = Object.values(getFantasyDraftPositionTargetCounts(2)).reduce(
      (sum, count) => sum + count,
      0,
    );

    expect(league.fantasyDraft).toMatchObject({
      leagueId: league.id,
      status: "not_started",
      round: 1,
      pickNumber: 1,
      currentTeamId: "",
      draftOrder: [],
      picks: [],
      startedAt: null,
      completedAt: null,
    });
    expect(league.fantasyDraftPlayerPool).toHaveLength(expectedPoolSize);
    expect(league.fantasyDraft?.availablePlayerIds).toHaveLength(expectedPoolSize);
  });

  it("starts with snake-draft order and advances current team after each pick", () => {
    const storage = new MemoryStorage();
    const league = createTwoTeamDraftLeague(storage);
    const started = startOnlineFantasyDraft(league.id, storage);
    const firstPlayerId = started?.fantasyDraft?.availablePlayerIds[0];

    expect(started?.fantasyDraft).toMatchObject({
      status: "active",
      draftOrder: ["berlin-wolves", "zurich-forge"],
      currentTeamId: "berlin-wolves",
      round: 1,
      pickNumber: 1,
    });

    const firstPick = makeOnlineFantasyDraftPick(
      league.id,
      "berlin-wolves",
      firstPlayerId ?? "",
      "user-1",
      storage,
    );

    expect(firstPick.status).toBe("success");
    expect(firstPick.league?.fantasyDraft).toMatchObject({
      currentTeamId: "zurich-forge",
      round: 1,
      pickNumber: 2,
    });

    const secondPlayerId = firstPick.league?.fantasyDraft?.availablePlayerIds[0];
    const secondPick = makeOnlineFantasyDraftPick(
      league.id,
      "zurich-forge",
      secondPlayerId ?? "",
      "user-2",
      storage,
    );

    expect(secondPick.status).toBe("success");
    expect(secondPick.league?.fantasyDraft).toMatchObject({
      currentTeamId: "zurich-forge",
      round: 2,
      pickNumber: 3,
    });
  });

  it("accepts a valid pick and stores it on the draft state", () => {
    const storage = new MemoryStorage();
    const league = createTwoTeamDraftLeague(storage);
    const started = startOnlineFantasyDraft(league.id, storage);
    const playerId = started?.fantasyDraft?.availablePlayerIds[0] ?? "";
    const result = makeOnlineFantasyDraftPick(
      league.id,
      "berlin-wolves",
      playerId,
      "user-1",
      storage,
    );

    if (result.status !== "success") {
      throw new Error(`Expected successful pick, got ${result.status}.`);
    }

    expect(result.pick).toMatchObject({
      pickNumber: 1,
      round: 1,
      teamId: "berlin-wolves",
      playerId,
      pickedByUserId: "user-1",
    });
    expect(result.league?.fantasyDraft?.picks).toHaveLength(1);
    expect(result.league?.fantasyDraft?.availablePlayerIds).not.toContain(playerId);
  });

  it("blocks a team that is not on the clock", () => {
    const storage = new MemoryStorage();
    const league = createTwoTeamDraftLeague(storage);
    const started = startOnlineFantasyDraft(league.id, storage);
    const playerId = started?.fantasyDraft?.availablePlayerIds[0] ?? "";
    const result = makeOnlineFantasyDraftPick(
      league.id,
      "zurich-forge",
      playerId,
      "user-2",
      storage,
    );

    expect(result.status).toBe("wrong-team");
    expect(result.league?.fantasyDraft?.picks).toHaveLength(0);
  });

  it("blocks a player from being picked twice", () => {
    const storage = new MemoryStorage();
    const league = createTwoTeamDraftLeague(storage);
    const started = startOnlineFantasyDraft(league.id, storage);
    const playerId = started?.fantasyDraft?.availablePlayerIds[0] ?? "";

    makeOnlineFantasyDraftPick(league.id, "berlin-wolves", playerId, "user-1", storage);
    const duplicate = makeOnlineFantasyDraftPick(
      league.id,
      "zurich-forge",
      playerId,
      "user-2",
      storage,
    );

    expect(duplicate.status).toBe("player-unavailable");
  });

  it("blocks week simulation until the fantasy draft is completed", () => {
    const storage = new MemoryStorage();
    const league = createTwoTeamDraftLeague(storage);
    startOnlineFantasyDraft(league.id, storage);
    const simulated = simulateOnlineLeagueWeek(league.id, storage);

    expect(simulated?.currentWeek).toBe(1);
    expect(simulated?.fantasyDraft?.status).toBe("active");
    expect(simulated?.matchResults ?? []).toHaveLength(0);
  });

  it("completes the draft, creates full rosters and moves the league to week 1 ready", () => {
    const storage = new MemoryStorage();
    const league = createTwoTeamDraftLeague(storage);
    const completed = completeDraft(league, storage);

    expect(completed.fantasyDraft?.status).toBe("completed");
    expect(completed.fantasyDraft?.currentTeamId).toBe("");
    expect(completed.fantasyDraft?.completedAt).toEqual(expect.any(String));
    expect(completed.status).toBe("active");
    expect(completed.currentWeek).toBe(1);
    expect(completed.weekStatus).toBe("ready");
    expect(completed.users).toHaveLength(2);
    expect(
      completed.users.every(
        (user) => user.contractRoster?.length === ONLINE_FANTASY_DRAFT_ROSTER_TARGET_SIZE,
      ),
    ).toBe(true);
    expect(
      new Set(
        completed.users.flatMap((user) =>
          user.contractRoster?.map((player) => player.playerId) ?? [],
        ),
      ).size,
    ).toBe(
      2 * ONLINE_FANTASY_DRAFT_ROSTER_TARGET_SIZE,
    );
    expect(completed.users.every((user) => (user.depthChart?.length ?? 0) > 0)).toBe(true);
  });
});
