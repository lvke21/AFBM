import { describe, expect, it } from "vitest";

import {
  createOnlineLeague,
  generateOnlineTrainingOutcome,
  joinOnlineLeague,
  makeOnlineFantasyDraftPick,
  ONLINE_FANTASY_DRAFT_POSITIONS,
  ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS,
  saveOnlineLeague,
  setAllOnlineLeagueUsersReady,
  simulateOnlineLeagueWeek,
  startOnlineFantasyDraft,
  submitWeeklyTrainingPlan,
  type CoachingStaffProfile,
  type OnlineLeague,
} from "./online-league-service";
import type { TeamIdentitySelection } from "./team-identity-options";

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

function createJoinedLeague(storage: MemoryStorage) {
  const league = createOnlineLeague({ name: "Training League" }, storage);

  return joinOnlineLeague(
    league.id,
    { userId: "user-1", username: "Coach_1234" },
    BERLIN_WOLVES,
    storage,
  ).league;
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
      throw new Error("Expected fantasy draft pick context");
    }

    const result = makeOnlineFantasyDraftPick(
      league.id,
      user.teamId,
      playerId,
      user.userId,
      storage,
    );

    if (result.status !== "success" && result.status !== "completed") {
      throw new Error(`Expected fantasy draft pick success, got ${result.status}`);
    }

    league = result.league;
  }

  return league;
}

function createLeagueWithPlan(
  storage: MemoryStorage,
  input: Parameters<typeof submitWeeklyTrainingPlan>[2],
) {
  const league = createJoinedLeague(storage);
  const result = submitWeeklyTrainingPlan(league.id, "user-1", input, storage);

  if (result.status !== "submitted") {
    throw new Error("Expected submitted training plan");
  }

  return result.league;
}

function getUser(league: OnlineLeague) {
  const user = league.users[0];

  if (!user) {
    throw new Error("Expected league user");
  }

  return user;
}

function getOutcome(league: OnlineLeague | null) {
  const outcome = league?.users[0]?.trainingOutcomes?.[0];

  if (!outcome) {
    throw new Error("Expected training outcome");
  }

  return outcome;
}

function withStaff(
  league: OnlineLeague,
  storage: MemoryStorage,
  staffPatch: Partial<CoachingStaffProfile>,
) {
  const user = getUser(league);

  if (!user.coachingStaffProfile) {
    throw new Error("Expected coaching staff");
  }

  return saveOnlineLeague(
    {
      ...league,
      users: [
        {
          ...user,
          coachingStaffProfile: {
            ...user.coachingStaffProfile,
            ...staffPatch,
          },
        },
      ],
    },
    storage,
  );
}

const NORMAL_BALANCED_PLAN = {
  intensity: "normal" as const,
  primaryFocus: "balanced" as const,
  riskTolerance: "medium" as const,
  youngPlayerPriority: 50,
  veteranMaintenance: 50,
};

describe("online training system", () => {
  it("creates an auto-default training plan when none was submitted", () => {
    const storage = new MemoryStorage();
    const league = createJoinedLeague(storage);

    const updatedLeague = generateOnlineTrainingOutcome(league.id, "user-1", storage);
    const user = getUser(updatedLeague as OnlineLeague);

    expect(user.weeklyTrainingPlans?.[0]).toMatchObject({
      intensity: "normal",
      primaryFocus: "balanced",
      source: "auto_default",
    });
    expect(user.trainingOutcomes).toHaveLength(1);
  });

  it("lets the GM save a weekly training plan", () => {
    const storage = new MemoryStorage();
    const league = createJoinedLeague(storage);

    const result = submitWeeklyTrainingPlan(
      league.id,
      "user-1",
      {
        intensity: "hard",
        primaryFocus: "player_development",
        secondaryFocus: "passing_game",
        riskTolerance: "high",
        youngPlayerPriority: 80,
        veteranMaintenance: 25,
        notes: "Push young skill players.",
      },
      storage,
    );

    expect(result.status).toBe("submitted");
    expect(result.league?.users[0]?.weeklyTrainingPlans?.[0]).toMatchObject({
      intensity: "hard",
      primaryFocus: "player_development",
      source: "gm_submitted",
    });
  });

  it("rejects invalid intensity values", () => {
    const storage = new MemoryStorage();
    const league = createJoinedLeague(storage);

    const result = submitWeeklyTrainingPlan(
      league.id,
      "user-1",
      {
        ...NORMAL_BALANCED_PLAN,
        intensity: "reckless",
      } as never,
      storage,
    );

    expect(result.status).toBe("invalid");
    expect(result.league?.users[0]?.weeklyTrainingPlans).toHaveLength(0);
  });

  it("creates more fatigue for hard training than normal training", () => {
    const normalStorage = new MemoryStorage();
    const hardStorage = new MemoryStorage();
    const normalLeague = createLeagueWithPlan(normalStorage, NORMAL_BALANCED_PLAN);
    const hardLeague = createLeagueWithPlan(hardStorage, {
      ...NORMAL_BALANCED_PLAN,
      intensity: "hard",
    });

    const normalOutcome = getOutcome(
      generateOnlineTrainingOutcome(normalLeague.id, "user-1", normalStorage),
    );
    const hardOutcome = getOutcome(
      generateOnlineTrainingOutcome(hardLeague.id, "user-1", hardStorage),
    );

    expect(hardOutcome.fatigueDelta).toBeGreaterThan(normalOutcome.fatigueDelta);
  });

  it("reduces fatigue with recovery focus", () => {
    const balancedStorage = new MemoryStorage();
    const recoveryStorage = new MemoryStorage();
    const balancedLeague = createLeagueWithPlan(balancedStorage, NORMAL_BALANCED_PLAN);
    const recoveryLeague = createLeagueWithPlan(recoveryStorage, {
      ...NORMAL_BALANCED_PLAN,
      primaryFocus: "recovery",
      veteranMaintenance: 85,
    });

    const balancedOutcome = getOutcome(
      generateOnlineTrainingOutcome(balancedLeague.id, "user-1", balancedStorage),
    );
    const recoveryOutcome = getOutcome(
      generateOnlineTrainingOutcome(recoveryLeague.id, "user-1", recoveryStorage),
    );

    expect(recoveryOutcome.fatigueDelta).toBeLessThan(balancedOutcome.fatigueDelta);
  });

  it("improves young players more with player development focus", () => {
    const storage = new MemoryStorage();
    const league = createLeagueWithPlan(storage, {
      ...NORMAL_BALANCED_PLAN,
      primaryFocus: "player_development",
      youngPlayerPriority: 90,
    });

    const outcome = getOutcome(generateOnlineTrainingOutcome(league.id, "user-1", storage));
    const youngCore = outcome.affectedPlayers.find(
      (player) => player.playerId === "berlin-wolves-qb1",
    );
    const veteranCore = outcome.affectedPlayers.find(
      (player) => player.playerId === "berlin-wolves-ot1",
    );

    expect(youngCore?.developmentDelta).toBeGreaterThan(
      veteranCore?.developmentDelta ?? 0,
    );
  });

  it("improves outcomes with a good coach staff", () => {
    const weakStorage = new MemoryStorage();
    const strongStorage = new MemoryStorage();
    const weakLeague = withStaff(createLeagueWithPlan(weakStorage, NORMAL_BALANCED_PLAN), weakStorage, {
      playerDevelopment: 30,
      gamePreparation: 30,
      discipline: 30,
      motivation: 30,
      adaptability: 30,
    });
    const strongLeague = withStaff(
      createLeagueWithPlan(strongStorage, NORMAL_BALANCED_PLAN),
      strongStorage,
      {
        playerDevelopment: 95,
        gamePreparation: 95,
        discipline: 95,
        motivation: 95,
        adaptability: 95,
      },
    );

    const weakOutcome = getOutcome(
      generateOnlineTrainingOutcome(weakLeague.id, "user-1", weakStorage),
    );
    const strongOutcome = getOutcome(
      generateOnlineTrainingOutcome(strongLeague.id, "user-1", strongStorage),
    );

    expect(strongOutcome.coachExecutionRating).toBeGreaterThan(
      weakOutcome.coachExecutionRating,
    );
    expect(strongOutcome.preparationBonus).toBeGreaterThan(weakOutcome.preparationBonus);
  });

  it("raises injury risk with extreme training", () => {
    const normalStorage = new MemoryStorage();
    const extremeStorage = new MemoryStorage();
    const normalLeague = createLeagueWithPlan(normalStorage, NORMAL_BALANCED_PLAN);
    const extremeLeague = createLeagueWithPlan(extremeStorage, {
      ...NORMAL_BALANCED_PLAN,
      intensity: "extreme",
      riskTolerance: "high",
    });

    const normalOutcome = getOutcome(
      generateOnlineTrainingOutcome(normalLeague.id, "user-1", normalStorage),
    );
    const extremeOutcome = getOutcome(
      generateOnlineTrainingOutcome(extremeLeague.id, "user-1", extremeStorage),
    );

    expect(extremeOutcome.injuryRiskDelta).toBeGreaterThan(
      normalOutcome.injuryRiskDelta,
    );
  });

  it("does not block week flow when no training plan exists", () => {
    const storage = new MemoryStorage();
    const league = createJoinedLeague(storage);
    joinOnlineLeague(
      league.id,
      { userId: "user-2", username: "Coach_5678" },
      ZURICH_FORGE,
      storage,
    );
    completeFantasyDraftForTest(league.id, storage);
    setAllOnlineLeagueUsersReady(league.id, storage);

    const updatedLeague = simulateOnlineLeagueWeek(league.id, storage);

    expect(updatedLeague?.currentWeek).toBe(2);
    expect(updatedLeague?.users[0]?.weeklyTrainingPlans?.[0]?.source).toBe("auto_default");
    expect(updatedLeague?.users[0]?.trainingOutcomes).toHaveLength(1);
  });

  it("generates a training outcome only once per team and week", () => {
    const storage = new MemoryStorage();
    const league = createJoinedLeague(storage);

    generateOnlineTrainingOutcome(league.id, "user-1", storage);
    const updatedLeague = generateOnlineTrainingOutcome(league.id, "user-1", storage);

    expect(updatedLeague?.users[0]?.trainingOutcomes).toHaveLength(1);
  });
});
