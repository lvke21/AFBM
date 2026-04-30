import { describe, expect, it } from "vitest";

import {
  createOnlineLeague,
  generateOnlineTrainingOutcome,
  joinOnlineLeague,
  saveOnlineLeague,
  submitWeeklyTrainingPlan,
  type OnlineContractPlayer,
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

function createJoinedLeague(storage: MemoryStorage) {
  const league = createOnlineLeague({ name: "Player Development League" }, storage);

  return joinOnlineLeague(
    league.id,
    { userId: "user-1", username: "Coach_1234" },
    BERLIN_WOLVES,
    storage,
  ).league;
}

function player(
  playerId: string,
  developmentPath: OnlineContractPlayer["developmentPath"],
  overrides: Partial<OnlineContractPlayer> = {},
): OnlineContractPlayer {
  return {
    playerId,
    playerName: playerId,
    position: "WR",
    age: 22,
    overall: 70,
    potential: 90,
    developmentPath,
    developmentProgress: 0,
    xFactors: [],
    contract: {
      salaryPerYear: 1_000_000,
      yearsRemaining: 3,
      totalValue: 3_250_000,
      guaranteedMoney: 500_000,
      signingBonus: 250_000,
      contractType: "rookie",
      capHitPerYear: 1_083_333,
      deadCapPerYear: 250_000,
    },
    status: "active",
    ...overrides,
  };
}

function withRoster(
  league: OnlineLeague,
  storage: MemoryStorage,
  contractRoster: OnlineContractPlayer[],
) {
  const user = league.users[0];

  if (!user) {
    throw new Error("Expected league user");
  }

  return saveOnlineLeague(
    {
      ...league,
      users: [
        {
          ...user,
          contractRoster,
        },
      ],
    },
    storage,
  );
}

function generateDevelopmentOutcome(league: OnlineLeague, storage: MemoryStorage) {
  const plan = submitWeeklyTrainingPlan(
    league.id,
    "user-1",
    {
      intensity: "hard",
      primaryFocus: "player_development",
      riskTolerance: "medium",
      youngPlayerPriority: 85,
      veteranMaintenance: 35,
    },
    storage,
  );

  if (plan.status !== "submitted") {
    throw new Error("Expected submitted plan");
  }

  const updatedLeague = generateOnlineTrainingOutcome(league.id, "user-1", storage);
  const outcome = updatedLeague?.users[0]?.trainingOutcomes?.[0];

  if (!updatedLeague || !outcome) {
    throw new Error("Expected training outcome");
  }

  return { updatedLeague, outcome };
}

describe("online player development paths", () => {
  it("creates visible development differences between star, solid and bust paths", () => {
    const storage = new MemoryStorage();
    const league = withRoster(createJoinedLeague(storage), storage, [
      player("star-player", "star"),
      player("solid-player", "solid"),
      player("bust-player", "bust"),
    ]);

    const { outcome } = generateDevelopmentOutcome(league, storage);
    const star = outcome.affectedPlayers.find((entry) => entry.playerId === "star-player");
    const solid = outcome.affectedPlayers.find((entry) => entry.playerId === "solid-player");
    const bust = outcome.affectedPlayers.find((entry) => entry.playerId === "bust-player");

    expect(star?.developmentDelta).toBeGreaterThan(solid?.developmentDelta ?? 0);
    expect(solid?.developmentDelta).toBeGreaterThan(bust?.developmentDelta ?? 0);
  });

  it("lets age and potential shape development speed", () => {
    const storage = new MemoryStorage();
    const league = withRoster(createJoinedLeague(storage), storage, [
      player("young-upside", "solid", { age: 21, overall: 68, potential: 88 }),
      player("older-capped", "solid", { age: 31, overall: 78, potential: 80 }),
    ]);

    const { outcome } = generateDevelopmentOutcome(league, storage);
    const young = outcome.affectedPlayers.find((entry) => entry.playerId === "young-upside");
    const older = outcome.affectedPlayers.find((entry) => entry.playerId === "older-capped");

    expect(young?.developmentDelta).toBeGreaterThan(older?.developmentDelta ?? 0);
  });

  it("persists development progress and rating gains on the roster", () => {
    const storage = new MemoryStorage();
    const league = withRoster(createJoinedLeague(storage), storage, [
      player("future-star", "star", { age: 21, overall: 70, potential: 92 }),
    ]);

    const { updatedLeague } = generateDevelopmentOutcome(league, storage);
    const updatedPlayer = updatedLeague.users[0]?.contractRoster?.find(
      (entry) => entry.playerId === "future-star",
    );

    expect(updatedPlayer?.overall).toBeGreaterThan(70);
    expect(updatedPlayer?.developmentPath).toBe("star");
    expect(updatedLeague.events?.some((event) => event.eventType === "player_development_updated")).toBe(
      true,
    );
  });
});
