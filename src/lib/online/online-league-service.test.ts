import { describe, expect, it } from "vitest";

import {
  addFakeUserToOnlineLeague,
  createOnlineLeague,
  deleteOnlineLeague,
  fillOnlineLeagueWithFakeUsers,
  getAvailableOnlineLeagues,
  getFantasyDraftPositionTargetCounts,
  getOnlineLeagues,
  getOnlineLeagueById,
  getOnlineLeagueWeekReadyState,
  getOrCreateGlobalTestLeague,
  joinOnlineLeague,
  makeOnlineFantasyDraftPick,
  ONLINE_FANTASY_DRAFT_POSITIONS,
  ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS,
  ONLINE_LAST_LEAGUE_ID_STORAGE_KEY,
  ONLINE_LEAGUES_STORAGE_KEY,
  ONLINE_MVP_TEAM_POOL,
  resetOnlineLeagues,
  resetOnlineLeague,
  saveOnlineLeague,
  removeOnlineLeagueUser,
  setAllOnlineLeaguesUsersReady,
  setAllOnlineLeagueUsersReady,
  setOnlineLeagueUserReady,
  setOnlineLeagueUserReadyState,
  simulateOnlineLeagueWeek,
  startOnlineFantasyDraft,
  startOnlineLeague,
  updateOnlineLeagueUserDepthChart,
  validateOnlineLeagueState,
  repairOnlineLeagueState,
  type OnlineLeague,
} from "./online-league-service";
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

const PARIS_GUARDIANS: TeamIdentitySelection = {
  cityId: "paris",
  category: "identity_city",
  teamNameId: "guardians",
};

const LONDON_TITANS: TeamIdentitySelection = {
  cityId: "london",
  category: "aggressive_competitive",
  teamNameId: "titans",
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

function completeFantasyDraftForTest(leagueId: string, storage: MemoryStorage) {
  let league = startOnlineFantasyDraft(leagueId, storage);

  while (league?.fantasyDraft?.status === "active") {
    const state = league.fantasyDraft;
    const user = league.users.find((candidate) => candidate.teamId === state.currentTeamId);
    const playerPool = league.fantasyDraftPlayerPool ?? [];
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

    if (!user || !playerId) {
      throw new Error("Expected active fantasy draft pick context.");
    }

    const result = makeOnlineFantasyDraftPick(
      league.id,
      user.teamId,
      playerId,
      user.userId,
      storage,
    );

    if (result.status !== "success" && result.status !== "completed") {
      throw new Error(`Expected fantasy draft pick success, got ${result.status}.`);
    }

    league = result.league;
  }

  return league;
}

describe("online-league-service", () => {
  it("creates the global test league when none exists", () => {
    const storage = new MemoryStorage();

    const league = getOrCreateGlobalTestLeague(storage);

    expect(league).toMatchObject({
      id: "global-test-league",
      name: "Global Test League",
      users: [],
      teams: ONLINE_MVP_TEAM_POOL,
      freeAgents: expect.any(Array),
      fantasyDraft: {
        leagueId: "global-test-league",
        status: "not_started",
        availablePlayerIds: expect.any(Array),
      },
      fantasyDraftPlayerPool: expect.any(Array),
      leagueSettings: {
        gmActivityRules: {
          warningAfterMissedWeeks: 1,
          inactiveAfterMissedWeeks: 2,
          removalEligibleAfterMissedWeeks: 3,
          autoVacateAfterMissedWeeks: false,
        },
        financeRules: {
          enableStadiumFinance: true,
          enableFanPressure: true,
          enableMerchRevenue: true,
          equalMediaRevenue: true,
          revenueSharingEnabled: true,
          revenueSharingPercentage: 20,
          ownerBailoutEnabled: true,
          minCashFloor: 0,
          maxTicketPriceLevel: 100,
          allowStadiumUpgrades: false,
        },
      },
      currentWeek: 1,
      currentSeason: 1,
      weekStatus: "pre_week",
      maxUsers: 16,
      status: "waiting",
    });
    expect(league.fantasyDraftPlayerPool).toHaveLength(
      Object.values(getFantasyDraftPositionTargetCounts(ONLINE_MVP_TEAM_POOL.length)).reduce(
        (sum, count) => sum + count,
        0,
      ),
    );
    expect(JSON.parse(storage.getItem(ONLINE_LEAGUES_STORAGE_KEY) ?? "[]")).toEqual([
      league,
    ]);
  });

  it("keeps the league after reload", () => {
    const storage = new MemoryStorage();
    const league: OnlineLeague = {
      id: "global-test-league",
      name: "Global Test League",
      maxUsers: 16,
      status: "waiting",
      teams: ONLINE_MVP_TEAM_POOL,
      currentWeek: 1,
      users: [
        {
          userId: "user-1",
          username: "Coach_1234",
          joinedAt: "2026-04-29T19:00:00.000Z",
          teamId: "bos-guardians",
          teamName: "Boston Guardians",
          readyForWeek: false,
        },
      ],
    };

    saveOnlineLeague(league, storage);

    expect(getOnlineLeagueById("global-test-league", storage)).toMatchObject({
      ...league,
      leagueSettings: expect.any(Object),
      users: [
        expect.objectContaining({
          userId: "user-1",
          ownershipProfile: expect.any(Object),
          jobSecurity: expect.any(Object),
          activity: expect.any(Object),
        }),
      ],
    });
    expect(getOrCreateGlobalTestLeague(storage)).toMatchObject({
      id: league.id,
      users: [
        expect.objectContaining({
          userId: "user-1",
        }),
      ],
    });
  });

  it("returns available leagues as a list", () => {
    const storage = new MemoryStorage();

    const leagues = getAvailableOnlineLeagues(storage);

    expect(Array.isArray(leagues)).toBe(true);
    expect(leagues).toHaveLength(1);
    expect(leagues[0]?.id).toBe("global-test-league");
  });

  it("returns existing leagues without auto-creating the global test league", () => {
    const storage = new MemoryStorage();

    expect(getOnlineLeagues(storage)).toEqual([]);
    expect(storage.getItem(ONLINE_LEAGUES_STORAGE_KEY)).toBeNull();
  });

  it("does not auto-create a league when loading by id", () => {
    const storage = new MemoryStorage();

    expect(getOnlineLeagueById("global-test-league", storage)).toBeNull();
    expect(storage.getItem(ONLINE_LEAGUES_STORAGE_KEY)).toBeNull();
  });

  it("does not create duplicate global test leagues", () => {
    const storage = new MemoryStorage();

    getOrCreateGlobalTestLeague(storage);
    getOrCreateGlobalTestLeague(storage);
    getAvailableOnlineLeagues(storage);

    const leagues = JSON.parse(storage.getItem(ONLINE_LEAGUES_STORAGE_KEY) ?? "[]");

    const globalTestLeagues = leagues.filter(
      (league: OnlineLeague) => league.id === "global-test-league",
    );

    expect(globalTestLeagues).toHaveLength(1);
  });

  it("joins a user with joinedAt and stores the last league id", () => {
    const storage = new MemoryStorage();

    const result = joinOnlineLeague(
      "global-test-league",
      { userId: "user-1", username: "Coach_1234" },
      BERLIN_WOLVES,
      storage,
    );

    expect(result.status).toBe("joined");
    expect(result.league.users).toEqual([
      expect.objectContaining({
        userId: "user-1",
        username: "Coach_1234",
        joinedAt: expect.any(String),
        teamId: "berlin-wolves",
        teamName: "Wolves",
        cityId: "berlin",
        cityName: "Berlin",
        teamNameId: "wolves",
        teamCategory: "aggressive_competitive",
        teamDisplayName: "Berlin Wolves",
        readyForWeek: false,
        ownershipProfile: expect.any(Object),
        jobSecurity: expect.any(Object),
        activity: expect.any(Object),
      }),
    ]);
    expect(storage.getItem(ONLINE_LAST_LEAGUE_ID_STORAGE_KEY)).toBe("global-test-league");
  });

  it("does not add the same user twice and still stores the last league id", () => {
    const storage = new MemoryStorage();
    const user = { userId: "user-1", username: "Coach_1234" };

    joinOnlineLeague("global-test-league", user, BERLIN_WOLVES, storage);
    const secondJoin = joinOnlineLeague("global-test-league", user, storage);

    expect(secondJoin.status).toBe("already-member");
    expect(secondJoin.league.users).toHaveLength(1);
    expect(secondJoin.league.users[0]?.userId).toBe("user-1");
    expect(secondJoin.league.users[0]?.teamDisplayName).toBe("Berlin Wolves");
    expect(storage.getItem(ONLINE_LAST_LEAGUE_ID_STORAGE_KEY)).toBe("global-test-league");
  });

  it("blocks joins for invalid league ids without creating fallback data", () => {
    const storage = new MemoryStorage();

    const result = joinOnlineLeague(
      "missing-league",
      { userId: "user-1", username: "Coach_1234" },
      BERLIN_WOLVES,
      storage,
    );

    expect(result.status).toBe("missing-league");
    expect(result.league.id).toBe("missing-league");
    expect(result.league.users).toEqual([]);
    expect(getOnlineLeagues(storage)).toEqual([]);
    expect(storage.getItem(ONLINE_LAST_LEAGUE_ID_STORAGE_KEY)).toBeNull();
  });

  it("assigns distinct teams to different users", () => {
    const storage = new MemoryStorage();

    const firstJoin = joinOnlineLeague(
      "global-test-league",
      { userId: "user-1", username: "Coach_1234" },
      BERLIN_WOLVES,
      storage,
    );
    const secondJoin = joinOnlineLeague(
      "global-test-league",
      { userId: "user-2", username: "Coach_5678" },
      ZURICH_FORGE,
      storage,
    );

    expect(firstJoin.league.users[0]?.teamDisplayName).toBe("Berlin Wolves");
    expect(secondJoin.league.users.map((user) => user.teamId)).toEqual([
      "berlin-wolves",
      "zurich-forge",
    ]);
  });

  it("blocks joining without a selected team identity", () => {
    const storage = new MemoryStorage();

    const result = joinOnlineLeague(
      "global-test-league",
      { userId: "user-1", username: "Coach_1234" },
      storage,
    );

    expect(result).toMatchObject({
      status: "invalid-team-identity",
      message: "Bitte wähle zuerst Stadt, Kategorie und Teamnamen.",
    });
    expect(result.league.users).toEqual([]);
    expect(storage.getItem(ONLINE_LAST_LEAGUE_ID_STORAGE_KEY)).toBeNull();
  });

  it("blocks duplicate team identity combinations in the same league", () => {
    const storage = new MemoryStorage();

    joinOnlineLeague(
      "global-test-league",
      { userId: "user-1", username: "Coach_1234" },
      BERLIN_WOLVES,
      storage,
    );
    const duplicateJoin = joinOnlineLeague(
      "global-test-league",
      { userId: "user-2", username: "Coach_5678" },
      BERLIN_WOLVES,
      storage,
    );

    expect(duplicateJoin).toMatchObject({
      status: "team-identity-taken",
      message: "Diese Team-Identität ist in der Liga bereits vergeben.",
    });
    expect(duplicateJoin.league.users).toHaveLength(1);
  });

  it("blocks joining when the league has no free teams", () => {
    const storage = new MemoryStorage();
    const fullLeague: OnlineLeague = {
      id: "global-test-league",
      name: "Global Test League",
      maxUsers: 16,
      status: "waiting",
      teams: ONLINE_MVP_TEAM_POOL,
      currentWeek: 1,
      users: ONLINE_MVP_TEAM_POOL.map((team, index) => ({
        userId: `user-${index}`,
        username: `Coach_${1000 + index}`,
        joinedAt: "2026-04-29T19:00:00.000Z",
        teamId: team.id,
        teamName: team.name,
        readyForWeek: false,
      })),
    };

    saveOnlineLeague(fullLeague, storage);
    const result = joinOnlineLeague(
      "global-test-league",
      { userId: "new-user", username: "Coach_5678" },
      PARIS_GUARDIANS,
      storage,
    );

    expect(result).toMatchObject({
      status: "full",
      message: "Diese Liga ist bereits voll.",
    });
    expect(result.league.users).toHaveLength(fullLeague.users.length);
    expect(getOnlineLeagueById("global-test-league", storage)?.users).toHaveLength(
      fullLeague.users.length,
    );
    expect(getOnlineLeagueById("global-test-league", storage)?.users[0]).toMatchObject({
      userId: "user-0",
      teamId: "bos-guardians",
    });
  });

  it("keeps league membership after reload", () => {
    const storage = new MemoryStorage();

    joinOnlineLeague(
      "global-test-league",
      { userId: "user-1", username: "Coach_1234" },
      BERLIN_WOLVES,
      storage,
    );

    const reloadedLeague = getOnlineLeagueById("global-test-league", storage);

    expect(reloadedLeague?.users).toHaveLength(1);
    expect(reloadedLeague?.users[0]?.userId).toBe("user-1");
    expect(reloadedLeague?.users[0]?.teamDisplayName).toBe("Berlin Wolves");
  });

  it("creates an admin league without removing the global test league", () => {
    const storage = new MemoryStorage();
    getOrCreateGlobalTestLeague(storage);

    const createdLeague = createOnlineLeague(
      {
        name: "Saturday Night League",
        maxUsers: 12,
        startWeek: 3,
      },
      storage,
    );
    const leagues = getAvailableOnlineLeagues(storage);

    expect(createdLeague).toMatchObject({
      id: "saturday-night-league",
      name: "Saturday Night League",
      users: [],
      currentWeek: 3,
      maxUsers: 12,
      status: "waiting",
    });
    expect(createdLeague.teams).toHaveLength(12);
    expect(leagues.map((league) => league.id)).toEqual(
      expect.arrayContaining(["saturday-night-league", "global-test-league"]),
    );
  });

  it("persists multiple admin-created leagues with distinct ids", () => {
    const storage = new MemoryStorage();

    const firstLeague = createOnlineLeague({ name: "Custom League" }, storage);
    const secondLeague = createOnlineLeague({ name: "Custom League" }, storage);

    expect(firstLeague.id).toBe("custom-league");
    expect(secondLeague.id).toBe("custom-league-2");
    expect(getOnlineLeagueById(firstLeague.id, storage)).toEqual(firstLeague);
    expect(getOnlineLeagueById(secondLeague.id, storage)).toEqual(secondLeague);
    expect(getAvailableOnlineLeagues(storage)).toHaveLength(3);
  });

  it("deletes a league and clears lastLeagueId when it points to that league", () => {
    const storage = new MemoryStorage();
    const firstLeague = createOnlineLeague({ name: "Delete Me" }, storage);
    const secondLeague = createOnlineLeague({ name: "Keep Me" }, storage);
    storage.setItem(ONLINE_LAST_LEAGUE_ID_STORAGE_KEY, firstLeague.id);

    const remainingLeagues = deleteOnlineLeague(firstLeague.id, storage);

    expect(remainingLeagues.map((league) => league.id)).toEqual([secondLeague.id]);
    expect(getOnlineLeagueById(firstLeague.id, storage)).toBeNull();
    expect(storage.getItem(ONLINE_LAST_LEAGUE_ID_STORAGE_KEY)).toBeNull();
  });

  it("resets a league by clearing users, ready state and week", () => {
    const storage = new MemoryStorage();
    const league = createOnlineLeague(
      {
        name: "Reset Me",
        startWeek: 4,
      },
      storage,
    );
    joinOnlineLeague(
      league.id,
      { userId: "user-1", username: "Coach_1234" },
      BERLIN_WOLVES,
      storage,
    );
    setOnlineLeagueUserReady(league.id, "user-1", storage);
    storage.setItem(ONLINE_LAST_LEAGUE_ID_STORAGE_KEY, league.id);

    const resetLeague = resetOnlineLeague(league.id, storage);

    expect(resetLeague).toMatchObject({
      id: league.id,
      users: [],
      currentWeek: 1,
      currentSeason: 1,
      weekStatus: "pre_week",
      matchResults: [],
      status: "waiting",
    });
    expect(getOnlineLeagueById(league.id, storage)?.users).toEqual([]);
    expect(storage.getItem(ONLINE_LAST_LEAGUE_ID_STORAGE_KEY)).toBeNull();
  });

  it("validates and safely repairs duplicated local league memberships", () => {
    const storage = new MemoryStorage();
    const joined = joinOnlineLeague(
      "global-test-league",
      { userId: "user-1", username: "Coach_1234" },
      BERLIN_WOLVES,
      storage,
    );

    expect(joined.status).toBe("joined");

    if (!joined.league) {
      throw new Error("Expected joined league");
    }

    const duplicatedLeague: OnlineLeague = {
      ...joined.league,
      users: [
        joined.league.users[0]!,
        {
          ...joined.league.users[0]!,
          readyForWeek: true,
        },
      ],
    };
    const validation = validateOnlineLeagueState(duplicatedLeague);

    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toContain("duplicate-user");

    const repaired = repairOnlineLeagueState(duplicatedLeague);

    expect(repaired.repaired).toBe(true);
    expect(repaired.league.users).toHaveLength(1);
    expect(validateOnlineLeagueState(repaired.league).valid).toBe(true);
  });

  it("sets every league member ready for admin control", () => {
    const storage = new MemoryStorage();

    joinOnlineLeague(
      "global-test-league",
      { userId: "user-1", username: "Coach_1234" },
      BERLIN_WOLVES,
      storage,
    );
    joinOnlineLeague(
      "global-test-league",
      { userId: "user-2", username: "Coach_5678" },
      ZURICH_FORGE,
      storage,
    );

    const updatedLeague = setAllOnlineLeagueUsersReady("global-test-league", storage);

    expect(updatedLeague?.users).toHaveLength(2);
    expect(updatedLeague?.users.every((user) => user.readyForWeek)).toBe(true);
    expect(updatedLeague?.users.every((user) => typeof user.readyAt === "string")).toBe(
      true,
    );
    expect(getOnlineLeagueById("global-test-league", storage)?.users).toEqual(
      updatedLeague?.users,
    );
  });

  it("starts a league by opening the fantasy draft phase", () => {
    const storage = new MemoryStorage();
    createOnlineLeague({ name: "Start Me", maxUsers: 2 }, storage);
    joinOnlineLeague(
      "start-me",
      { userId: "user-1", username: "Coach_1234" },
      BERLIN_WOLVES,
      storage,
    );
    joinOnlineLeague(
      "start-me",
      { userId: "user-2", username: "Coach_5678" },
      ZURICH_FORGE,
      storage,
    );

    const updatedLeague = startOnlineLeague("start-me", storage);

    expect(updatedLeague?.status).toBe("waiting");
    expect(updatedLeague?.fantasyDraft).toMatchObject({
      status: "active",
      currentTeamId: "berlin-wolves",
      draftOrder: ["berlin-wolves", "zurich-forge"],
    });
    expect(getOnlineLeagueById("start-me", storage)?.fantasyDraft?.status).toBe("active");
  });

  it("removes a player from a league and keeps the league", () => {
    const storage = new MemoryStorage();

    joinOnlineLeague(
      "global-test-league",
      { userId: "user-1", username: "Coach_1234" },
      BERLIN_WOLVES,
      storage,
    );
    joinOnlineLeague(
      "global-test-league",
      { userId: "user-2", username: "Coach_5678" },
      ZURICH_FORGE,
      storage,
    );

    const updatedLeague = removeOnlineLeagueUser("global-test-league", "user-1", storage);

    expect(updatedLeague?.users.map((user) => user.userId)).toEqual(["user-2"]);
    expect(getOnlineLeagueById("global-test-league", storage)?.users).toHaveLength(1);
  });

  it("simulates a week placeholder by advancing week, resetting ready state and writing a log", () => {
    const storage = new MemoryStorage();
    const league = createOnlineLeague(
      {
        name: "Sim League",
        startWeek: 3,
      },
      storage,
    );
    joinOnlineLeague(
      league.id,
      { userId: "user-1", username: "Coach_1234" },
      BERLIN_WOLVES,
      storage,
    );
    completeFantasyDraftForTest(league.id, storage);
    setOnlineLeagueUserReady(league.id, "user-1", storage);

    const updatedLeague = simulateOnlineLeagueWeek(league.id, storage);

    expect(updatedLeague?.currentWeek).toBe(2);
    expect(updatedLeague?.weekStatus).toBe("pre_week");
    expect(updatedLeague?.completedWeeks?.[0]).toMatchObject({
      weekKey: "s1-w1",
      season: 1,
      week: 1,
      status: "completed",
      resultMatchIds: [],
      completedAt: expect.any(String),
      simulatedByUserId: "admin",
      nextSeason: 1,
      nextWeek: 2,
    });
    expect(updatedLeague?.users[0]).toMatchObject({
      userId: "user-1",
      readyForWeek: false,
    });
    expect(updatedLeague?.users[0]).not.toHaveProperty("readyAt");
    expect(updatedLeague?.logs?.[0]).toMatchObject({
      message: "Simulation placeholder ausgeführt",
      createdAt: expect.any(String),
    });
    expect(getOnlineLeagueById(league.id, storage)?.currentWeek).toBe(2);
  });

  it("persists default depth chart and lets the current GM update only valid roster slots", () => {
    const storage = new MemoryStorage();
    const league = createOnlineLeague({ name: "Depth League" }, storage);
    const joined = joinOnlineLeague(
      league.id,
      { userId: "user-1", username: "Coach_1234" },
      BERLIN_WOLVES,
      storage,
    ).league;
    const user = joined.users[0];
    const firstEntry = user.depthChart?.[0];

    expect(firstEntry).toBeTruthy();

    const updated = updateOnlineLeagueUserDepthChart(
      league.id,
      "user-1",
      [
        {
          position: firstEntry?.position ?? "QB",
          starterPlayerId: firstEntry?.starterPlayerId ?? "",
          backupPlayerIds: firstEntry?.backupPlayerIds ?? [],
          updatedAt: "old",
        },
      ],
      storage,
    );
    const blocked = updateOnlineLeagueUserDepthChart(
      league.id,
      "user-1",
      [
        {
          position: "QB",
          starterPlayerId: "not-on-roster",
          backupPlayerIds: [],
          updatedAt: "old",
        },
      ],
      storage,
    );

    expect(updated?.users[0]?.depthChart?.[0]?.updatedAt).not.toBe("old");
    expect(blocked?.users[0]?.depthChart?.[0]?.starterPlayerId).toBe(
      updated?.users[0]?.depthChart?.[0]?.starterPlayerId,
    );
  });

  it("stores online match results and standings input when simulating with two teams", () => {
    const storage = new MemoryStorage();
    const league = createOnlineLeague({ name: "Results League" }, storage);
    joinOnlineLeague(
      league.id,
      { userId: "user-1", username: "Coach_1234" },
      BERLIN_WOLVES,
      storage,
    );
    joinOnlineLeague(
      league.id,
      { userId: "user-2", username: "Coach_5678" },
      ZURICH_FORGE,
      storage,
    );
    completeFantasyDraftForTest(league.id, storage);
    setAllOnlineLeagueUsersReady(league.id, storage);

    const updatedLeague = simulateOnlineLeagueWeek(league.id, storage, {
      simulatedByUserId: "admin-user-1",
    });
    const reloadedLeague = getOnlineLeagueById(league.id, storage);

    expect(updatedLeague?.matchResults).toHaveLength(1);
    expect(updatedLeague?.matchResults?.[0]).toMatchObject({
      week: 1,
      status: "completed",
      homeScore: expect.any(Number),
      awayScore: expect.any(Number),
      homeStats: {
        totalYards: expect.any(Number),
        passingYards: expect.any(Number),
        rushingYards: expect.any(Number),
        turnovers: expect.any(Number),
        firstDowns: expect.any(Number),
      },
      awayStats: {
        totalYards: expect.any(Number),
        passingYards: expect.any(Number),
        rushingYards: expect.any(Number),
        turnovers: expect.any(Number),
        firstDowns: expect.any(Number),
      },
      winnerTeamId: expect.any(String),
      winnerTeamName: expect.any(String),
      tiebreakerApplied: expect.any(Boolean),
      simulatedAt: expect.any(String),
      simulatedByUserId: "admin-user-1",
      createdAt: expect.any(String),
    });
    expect(updatedLeague?.matchResults?.[0]?.homeScore).not.toBe(
      updatedLeague?.matchResults?.[0]?.awayScore,
    );
    expect(reloadedLeague?.matchResults).toEqual(updatedLeague?.matchResults);
    expect(reloadedLeague?.completedWeeks).toEqual(updatedLeague?.completedWeeks);
    expect(updatedLeague?.completedWeeks?.[0]).toMatchObject({
      weekKey: "s1-w1",
      season: 1,
      week: 1,
      status: "completed",
      resultMatchIds: [updatedLeague?.matchResults?.[0]?.matchId],
      completedAt: updatedLeague?.matchResults?.[0]?.simulatedAt,
      simulatedByUserId: "admin-user-1",
      nextSeason: 1,
      nextWeek: 2,
    });
    expect(updatedLeague?.users.every((user) => !user.readyForWeek)).toBe(true);
    expect(updatedLeague?.lastSimulatedWeekKey).toBe("s1-w1");
  });

  it("runs the full ready to completed week flow without duplicate results after reload", () => {
    const storage = new MemoryStorage();
    const league = createOnlineLeague(
      {
        name: "Week Closeout League",
        maxUsers: 4,
      },
      storage,
    );
    joinOnlineLeague(
      league.id,
      { userId: "user-1", username: "Coach_1234" },
      BERLIN_WOLVES,
      storage,
    );
    joinOnlineLeague(
      league.id,
      { userId: "user-2", username: "Coach_5678" },
      ZURICH_FORGE,
      storage,
    );
    joinOnlineLeague(
      league.id,
      { userId: "user-3", username: "Coach_9012" },
      PARIS_GUARDIANS,
      storage,
    );
    joinOnlineLeague(
      league.id,
      { userId: "user-4", username: "Coach_3456" },
      LONDON_TITANS,
      storage,
    );
    completeFantasyDraftForTest(league.id, storage);

    const blockedBeforeReady = simulateOnlineLeagueWeek(league.id, storage);

    expect(blockedBeforeReady?.currentWeek).toBe(1);
    expect(blockedBeforeReady?.matchResults).toHaveLength(0);
    expect(blockedBeforeReady?.completedWeeks).toHaveLength(0);
    expect(getOnlineLeagueWeekReadyState(blockedBeforeReady!).canSimulate).toBe(false);

    setOnlineLeagueUserReady(league.id, "user-1", storage);

    const blockedUntilEveryoneReady = simulateOnlineLeagueWeek(league.id, storage);

    expect(blockedUntilEveryoneReady?.currentWeek).toBe(1);
    expect(blockedUntilEveryoneReady?.matchResults).toHaveLength(0);
    expect(getOnlineLeagueWeekReadyState(blockedUntilEveryoneReady!).missingParticipants)
      .toHaveLength(3);

    setAllOnlineLeagueUsersReady(league.id, storage);

    const readyLeague = getOnlineLeagueById(league.id, storage);

    expect(getOnlineLeagueWeekReadyState(readyLeague!).canSimulate).toBe(true);

    const simulated = simulateOnlineLeagueWeek(league.id, storage, {
      simulatedByUserId: "admin-flow-qa",
    });

    expect(simulated?.currentWeek).toBe(2);
    expect(simulated?.weekStatus).toBe("pre_week");
    expect(simulated?.matchResults).toHaveLength(2);
    expect(new Set(simulated?.matchResults?.map((result) => result.matchId)).size).toBe(2);
    expect(simulated?.completedWeeks).toHaveLength(1);
    expect(simulated?.completedWeeks?.[0]).toMatchObject({
      weekKey: "s1-w1",
      season: 1,
      week: 1,
      status: "completed",
      resultMatchIds: simulated?.matchResults?.map((result) => result.matchId),
      simulatedByUserId: "admin-flow-qa",
      nextSeason: 1,
      nextWeek: 2,
    });
    expect(simulated?.users.every((user) => !user.readyForWeek && !user.readyAt)).toBe(true);
    expect(simulated?.matchResults?.every((result) => result.season === 1 && result.week === 1))
      .toBe(true);

    const reloadedAfterSimulation = getOnlineLeagueById(league.id, storage);

    expect(reloadedAfterSimulation?.currentWeek).toBe(2);
    expect(reloadedAfterSimulation?.matchResults).toEqual(simulated?.matchResults);
    expect(reloadedAfterSimulation?.completedWeeks).toEqual(simulated?.completedWeeks);

    const duplicateClickAttempt = simulateOnlineLeagueWeek(league.id, storage, {
      simulatedByUserId: "admin-flow-qa",
    });

    expect(duplicateClickAttempt?.currentWeek).toBe(2);
    expect(duplicateClickAttempt?.matchResults).toEqual(simulated?.matchResults);
    expect(duplicateClickAttempt?.completedWeeks).toEqual(simulated?.completedWeeks);
  });

  it("does not simulate the current week until every active team is ready", () => {
    const storage = new MemoryStorage();
    const league = createOnlineLeague({ name: "Blocked Results League" }, storage);
    joinOnlineLeague(
      league.id,
      { userId: "user-1", username: "Coach_1234" },
      BERLIN_WOLVES,
      storage,
    );
    joinOnlineLeague(
      league.id,
      { userId: "user-2", username: "Coach_5678" },
      ZURICH_FORGE,
      storage,
    );
    completeFantasyDraftForTest(league.id, storage);
    setOnlineLeagueUserReady(league.id, "user-1", storage);

    const blockedLeague = simulateOnlineLeagueWeek(league.id, storage);

    expect(blockedLeague?.currentWeek).toBe(1);
    expect(blockedLeague?.matchResults ?? []).toHaveLength(0);
    expect(getOnlineLeagueWeekReadyState(blockedLeague!).allReady).toBe(false);
  });

  it("does not advance a week that is already marked as simulating", () => {
    const storage = new MemoryStorage();
    const league = createOnlineLeague({ name: "Locked Week League" }, storage);
    saveOnlineLeague(
      {
        ...league,
        weekStatus: "simulating",
      },
      storage,
    );

    const updatedLeague = simulateOnlineLeagueWeek(league.id, storage);

    expect(updatedLeague?.currentWeek).toBe(1);
    expect(updatedLeague?.matchResults ?? []).toHaveLength(0);
  });

  it("does not crash when simulating a missing league", () => {
    const storage = new MemoryStorage();

    expect(simulateOnlineLeagueWeek("missing-league", storage)).toBeNull();
  });

  it("adds a fake user to the first league and creates a debug target when empty", () => {
    const storage = new MemoryStorage();

    const league = addFakeUserToOnlineLeague(storage);

    expect(league.id).toBe("global-test-league");
    expect(league.users).toHaveLength(1);
    expect(league.users[0]).toMatchObject({
      userId: "debug-user-1",
      username: "DebugCoach_01",
      teamId: "bos-guardians",
      readyForWeek: false,
    });
    expect(getOnlineLeagueById("global-test-league", storage)?.users).toHaveLength(1);
  });

  it("fills the first league with sixteen fake users and unique teams", () => {
    const storage = new MemoryStorage();

    const league = fillOnlineLeagueWithFakeUsers(storage);

    expect(league.users).toHaveLength(16);
    expect(league.maxUsers).toBe(16);
    expect(new Set(league.users.map((user) => user.teamId)).size).toBe(16);
    expect(getOnlineLeagueById(league.id, storage)?.users).toHaveLength(16);
  });

  it("sets all users in all leagues ready and stays safe with empty state", () => {
    const storage = new MemoryStorage();

    expect(setAllOnlineLeaguesUsersReady(storage)).toEqual([]);

    const firstLeague = createOnlineLeague({ name: "Ready One" }, storage);
    const secondLeague = createOnlineLeague({ name: "Ready Two" }, storage);
    joinOnlineLeague(
      firstLeague.id,
      { userId: "user-1", username: "Coach_1234" },
      BERLIN_WOLVES,
      storage,
    );
    joinOnlineLeague(
      secondLeague.id,
      { userId: "user-2", username: "Coach_5678" },
      ZURICH_FORGE,
      storage,
    );

    const leagues = setAllOnlineLeaguesUsersReady(storage);

    expect(leagues).toHaveLength(2);
    expect(leagues.every((league) => league.users.every((user) => user.readyForWeek))).toBe(
      true,
    );
    expect(
      getOnlineLeagues(storage).every((league) =>
        league.users.every((user) => typeof user.readyAt === "string"),
      ),
    ).toBe(true);
  });

  it("sets the current user ready and keeps other members unchanged", () => {
    const storage = new MemoryStorage();

    joinOnlineLeague(
      "global-test-league",
      { userId: "user-1", username: "Coach_1234" },
      BERLIN_WOLVES,
      storage,
    );
    joinOnlineLeague(
      "global-test-league",
      { userId: "user-2", username: "Coach_5678" },
      ZURICH_FORGE,
      storage,
    );

    const updatedLeague = setOnlineLeagueUserReady("global-test-league", "user-1", storage);

    expect(updatedLeague?.users.find((user) => user.userId === "user-1")).toMatchObject({
      readyForWeek: true,
      readyAt: expect.any(String),
    });
    const unchangedUser = updatedLeague?.users.find((user) => user.userId === "user-2");
    expect(unchangedUser).toMatchObject({
      readyForWeek: false,
    });
    expect(unchangedUser).not.toHaveProperty("readyAt");
  });

  it("lets an active user take ready back and keeps the state after reload", () => {
    const storage = new MemoryStorage();

    joinOnlineLeague(
      "global-test-league",
      { userId: "user-1", username: "Coach_1234" },
      BERLIN_WOLVES,
      storage,
    );
    setOnlineLeagueUserReady("global-test-league", "user-1", storage);

    const updatedLeague = setOnlineLeagueUserReadyState(
      "global-test-league",
      "user-1",
      false,
      storage,
    );

    expect(updatedLeague?.users[0]).toMatchObject({
      userId: "user-1",
      readyForWeek: false,
    });
    expect(updatedLeague?.users[0]).not.toHaveProperty("readyAt");
    expect(getOnlineLeagueById("global-test-league", storage)?.users[0]?.readyForWeek).toBe(
      false,
    );
  });

  it("computes week readiness from active non-vacant participants only", () => {
    const storage = new MemoryStorage();
    const league = createOnlineLeague({ name: "Ready State League" }, storage);
    joinOnlineLeague(
      league.id,
      { userId: "user-1", username: "Coach_1234" },
      BERLIN_WOLVES,
      storage,
    );
    joinOnlineLeague(
      league.id,
      { userId: "user-2", username: "Coach_5678" },
      ZURICH_FORGE,
      storage,
    );
    const withVacantUser = saveOnlineLeague(
      {
        ...getOnlineLeagueById(league.id, storage)!,
        users: [
          ...getOnlineLeagueById(league.id, storage)!.users,
          {
            ...getOnlineLeagueById(league.id, storage)!.users[1]!,
            readyForWeek: true,
            teamId: "vacant-team",
            teamName: "Vacant Team",
            teamStatus: "vacant",
            userId: "vacant-user",
            username: "Vacant",
          },
        ],
      },
      storage,
    );

    setOnlineLeagueUserReady(withVacantUser.id, "user-1", storage);
    const partialReadyState = getOnlineLeagueWeekReadyState(
      getOnlineLeagueById(withVacantUser.id, storage)!,
    );

    expect(partialReadyState).toMatchObject({
      allReady: false,
      readyCount: 1,
      requiredCount: 2,
    });
    expect(partialReadyState.missingParticipants.map((participant) => participant.userId)).toEqual([
      "user-2",
    ]);

    setOnlineLeagueUserReady(withVacantUser.id, "user-2", storage);
    const allReadyState = getOnlineLeagueWeekReadyState(
      getOnlineLeagueById(withVacantUser.id, storage)!,
    );

    expect(allReadyState).toMatchObject({
      allReady: true,
      readyCount: 2,
      requiredCount: 2,
      weekKey: "s1-w1",
    });
  });

  it("keeps ready state after reload", () => {
    const storage = new MemoryStorage();

    joinOnlineLeague(
      "global-test-league",
      { userId: "user-1", username: "Coach_1234" },
      BERLIN_WOLVES,
      storage,
    );
    setOnlineLeagueUserReady("global-test-league", "user-1", storage);

    const reloadedLeague = getOnlineLeagueById("global-test-league", storage);

    expect(reloadedLeague?.users[0]?.readyForWeek).toBe(true);
    expect(reloadedLeague?.users[0]?.readyAt).toEqual(expect.any(String));
  });

  it("defaults missing ready state from older local league data", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      ONLINE_LEAGUES_STORAGE_KEY,
      JSON.stringify([
        {
          id: "global-test-league",
          name: "Global Test League",
          maxUsers: 16,
          status: "waiting",
          teams: ONLINE_MVP_TEAM_POOL,
          users: [
            {
              userId: "user-1",
              username: "Coach_1234",
              joinedAt: "2026-04-29T19:00:00.000Z",
              teamId: "bos-guardians",
              teamName: "Boston Guardians",
            },
          ],
        },
      ]),
    );

    expect(getOnlineLeagueById("global-test-league", storage)?.users[0]).toMatchObject({
      userId: "user-1",
      readyForWeek: false,
    });
    expect(getOnlineLeagueById("global-test-league", storage)?.currentWeek).toBe(1);
  });

  it("resets online league state for tests and debug", () => {
    const storage = new MemoryStorage();

    getOrCreateGlobalTestLeague(storage);
    joinOnlineLeague(
      "global-test-league",
      { userId: "user-1", username: "Coach_1234" },
      BERLIN_WOLVES,
      storage,
    );
    resetOnlineLeagues(storage);

    expect(storage.getItem(ONLINE_LEAGUES_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(ONLINE_LAST_LEAGUE_ID_STORAGE_KEY)).toBeNull();
  });
});
