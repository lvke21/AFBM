import { describe, expect, it } from "vitest";

import {
  createOnlineLeague,
  generateOnlineTrainingOutcome,
  joinOnlineLeague,
  recordOnlineGmSeasonResult,
  recordOnlineMatchdayAttendance,
  saveOnlineLeague,
  setOnlineFranchiseStrategy,
  signOnlineFreeAgent,
  type FranchiseStrategyType,
  type OnlineLeague,
  type OnlineMatchdayInput,
  type PlayerContract,
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

const BASE_MATCHDAY: OnlineMatchdayInput = {
  matchId: "strategy-match",
  teamId: "berlin-wolves",
  season: 1,
  week: 1,
  wins: 6,
  losses: 5,
  playoffChances: 45,
  homeGameAttractiveness: 55,
  won: true,
};

function createJoinedLeague(storage: MemoryStorage) {
  const league = createOnlineLeague({ name: "Strategy League" }, storage);

  return joinOnlineLeague(
    league.id,
    { userId: "user-1", username: "Coach_1234" },
    BERLIN_WOLVES,
    storage,
  ).league;
}

function setStrategy(
  storage: MemoryStorage,
  strategy: FranchiseStrategyType,
) {
  const league = createJoinedLeague(storage);
  const updatedLeague = setOnlineFranchiseStrategy(league.id, "user-1", strategy, storage);

  if (!updatedLeague) {
    throw new Error("Expected league after strategy update");
  }

  return updatedLeague;
}

function getUser(league: OnlineLeague | null) {
  const user = league?.users[0];

  if (!user) {
    throw new Error("Expected league user");
  }

  return user;
}

describe("online franchise strategy", () => {
  it("stores selected strategy and writes an audit event", () => {
    const storage = new MemoryStorage();
    const league = setStrategy(storage, "win_now");

    expect(league.users[0]?.franchiseStrategy).toMatchObject({
      strategy: "win_now",
      strategyType: "win_now",
      fanPressureModifier: 10,
      expectedPlayoff: true,
    });
    expect(league.events?.some((event) => event.eventType === "franchise_strategy_set")).toBe(
      true,
    );
  });

  it("allows strategy changes only in the offseason", () => {
    const storage = new MemoryStorage();
    const league = createOnlineLeague(
      { name: "Regular Season Strategy League", startWeek: 5 },
      storage,
    );
    const joinedLeague = joinOnlineLeague(
      league.id,
      { userId: "user-1", username: "Coach_1234" },
      BERLIN_WOLVES,
      storage,
    ).league;

    const updatedLeague = setOnlineFranchiseStrategy(
      joinedLeague.id,
      "user-1",
      "win_now",
      storage,
    );

    const user = getUser(updatedLeague);

    expect(user.franchiseStrategy?.strategyType).toBe("balanced");
    expect(
      updatedLeague?.events?.some((event) => event.eventType === "franchise_strategy_set") ??
        false,
    ).toBe(false);
  });

  it("changes owner and fan pressure after a poor season", () => {
    const rebuildStorage = new MemoryStorage();
    const winNowStorage = new MemoryStorage();
    const rebuildLeague = setStrategy(rebuildStorage, "rebuild");
    const winNowLeague = setStrategy(winNowStorage, "win_now");

    const rebuildResult = recordOnlineGmSeasonResult(
      rebuildLeague.id,
      "user-1",
      { season: 1, wins: 4, losses: 13, playoffAppearance: false },
      rebuildStorage,
    );
    const winNowResult = recordOnlineGmSeasonResult(
      winNowLeague.id,
      "user-1",
      { season: 1, wins: 4, losses: 13, playoffAppearance: false },
      winNowStorage,
    );

    const rebuildUser = getUser(rebuildResult);
    const winNowUser = getUser(winNowResult);

    expect(rebuildUser.fanPressure?.fanPressureScore).toBeLessThan(
      winNowUser.fanPressure?.fanPressureScore ?? 0,
    );
    expect(rebuildUser.jobSecurity?.score).toBeGreaterThan(
      winNowUser.jobSecurity?.score ?? 0,
    );
  });

  it("changes finance risk through matchday operations cost", () => {
    const rebuildStorage = new MemoryStorage();
    const winNowStorage = new MemoryStorage();
    const rebuildLeague = setStrategy(rebuildStorage, "rebuild");
    const winNowLeague = setStrategy(winNowStorage, "win_now");

    const rebuildResult = recordOnlineMatchdayAttendance(
      rebuildLeague.id,
      BASE_MATCHDAY,
      rebuildStorage,
    );
    const winNowResult = recordOnlineMatchdayAttendance(
      winNowLeague.id,
      BASE_MATCHDAY,
      winNowStorage,
    );

    const rebuildFinance = getUser(rebuildResult).financeProfile;
    const winNowFinance = getUser(winNowResult).financeProfile;

    expect(rebuildFinance?.gameDayOperations).toBeLessThan(
      winNowFinance?.gameDayOperations ?? 0,
    );
    expect(rebuildFinance?.weeklyProfitLoss).toBeGreaterThan(
      winNowFinance?.weeklyProfitLoss ?? 0,
    );
  });

  it("changes auto training focus and training outcome", () => {
    const rebuildStorage = new MemoryStorage();
    const winNowStorage = new MemoryStorage();
    const rebuildLeague = setStrategy(rebuildStorage, "rebuild");
    const winNowLeague = setStrategy(winNowStorage, "win_now");

    const rebuildTraining = generateOnlineTrainingOutcome(
      rebuildLeague.id,
      "user-1",
      rebuildStorage,
    );
    const winNowTraining = generateOnlineTrainingOutcome(
      winNowLeague.id,
      "user-1",
      winNowStorage,
    );

    const rebuildUser = getUser(rebuildTraining);
    const winNowUser = getUser(winNowTraining);

    expect(rebuildUser.weeklyTrainingPlans?.[0]).toMatchObject({
      primaryFocus: "player_development",
      youngPlayerPriority: 80,
    });
    expect(winNowUser.weeklyTrainingPlans?.[0]).toMatchObject({
      intensity: "hard",
      primaryFocus: "balanced",
    });
    expect(rebuildUser.trainingOutcomes?.[0]?.developmentDeltaSummary).toBeGreaterThan(
      winNowUser.trainingOutcomes?.[0]?.developmentDeltaSummary ?? 0,
    );
    expect(winNowUser.trainingOutcomes?.[0]?.preparationBonus).toBeGreaterThan(
      rebuildUser.trainingOutcomes?.[0]?.preparationBonus ?? 0,
    );
  });

  it("supports youth focus as a development-heavy strategy", () => {
    const storage = new MemoryStorage();
    const league = setStrategy(storage, "youth_focus");
    const trainingLeague = generateOnlineTrainingOutcome(league.id, "user-1", storage);
    const user = getUser(trainingLeague);

    expect(user.franchiseStrategy).toMatchObject({
      strategyType: "youth_focus",
      developmentFocus: 96,
    });
    expect(user.weeklyTrainingPlans?.[0]).toMatchObject({
      primaryFocus: "player_development",
      youngPlayerPriority: 95,
    });
  });

  it("blocks veteran star signings for rebuild strategy", () => {
    const storage = new MemoryStorage();
    const league = setStrategy(storage, "rebuild");
    const starContract: PlayerContract = {
      salaryPerYear: 38_000_000,
      yearsRemaining: 3,
      totalValue: 114_000_000,
      guaranteedMoney: 72_000_000,
      signingBonus: 18_000_000,
      contractType: "star",
      capHitPerYear: 44_000_000,
      deadCapPerYear: 30_000_000,
    };
    saveOnlineLeague(
      {
        ...league,
        freeAgents: [
          {
            playerId: "veteran-star",
            playerName: "Veteran Star",
            position: "QB",
            age: 32,
            overall: 91,
            potential: 87,
            developmentPath: "solid",
            developmentProgress: 0,
            xFactors: [],
            contract: starContract,
            status: "free_agent",
          },
        ],
      },
      storage,
    );

    const result = signOnlineFreeAgent(
      league.id,
      "user-1",
      "veteran-star",
      undefined,
      storage,
    );

    expect(result.status).toBe("blocked");
    expect(result.message).toContain("Rebuild-Strategie");
  });

  it("lets win now use the soft cap buffer for a short-term signing", () => {
    const storage = new MemoryStorage();
    const league = setStrategy(storage, "win_now");
    const user = getUser(league);
    const currentCap = user.salaryCap;
    const currentUsage = currentCap?.currentCapUsage ?? 0;
    const capLimit = currentUsage + 1_000_000;
    const shortTermContract: PlayerContract = {
      salaryPerYear: 2_000_000,
      yearsRemaining: 1,
      totalValue: 2_000_000,
      guaranteedMoney: 500_000,
      signingBonus: 0,
      contractType: "regular",
      capHitPerYear: 2_000_000,
      deadCapPerYear: 500_000,
    };
    saveOnlineLeague(
      {
        ...league,
        users: league.users.map((candidate) =>
          candidate.userId === "user-1"
            ? {
                ...candidate,
                salaryCap: {
                  capLimit,
                  activeSalary: currentCap?.activeSalary ?? currentUsage,
                  currentCapUsage: currentUsage,
                  deadCap: currentCap?.deadCap ?? 0,
                  availableCap: capLimit - currentUsage,
                  softBufferLimit: Math.round(capLimit * 1.05),
                  capRiskLevel: "tight",
                },
              }
            : candidate,
        ),
        freeAgents: [
          {
            playerId: "short-window-starter",
            playerName: "Short Window Starter",
            position: "WR",
            age: 28,
            overall: 78,
            potential: 80,
            developmentPath: "solid",
            developmentProgress: 0,
            xFactors: [],
            contract: shortTermContract,
            status: "free_agent",
          },
        ],
      },
      storage,
    );

    const result = signOnlineFreeAgent(
      league.id,
      "user-1",
      "short-window-starter",
      undefined,
      storage,
    );

    expect(result.status).toBe("success");
  });
});
