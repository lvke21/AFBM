import { describe, expect, it } from "vitest";

import {
  createOnlineLeague,
  evaluateOnlinePlayerXFactors,
  evaluateOnlineTeamXFactors,
  joinOnlineLeague,
  type OnlineContractPlayer,
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
  const league = createOnlineLeague({ name: "X-Factor League" }, storage);

  return joinOnlineLeague(
    league.id,
    { userId: "user-1", username: "Coach_1234" },
    BERLIN_WOLVES,
    storage,
  ).league;
}

function player(
  overrides: Partial<OnlineContractPlayer> = {},
): OnlineContractPlayer {
  return {
    playerId: "xfactor-player",
    playerName: "X Factor Player",
    position: "QB",
    age: 26,
    overall: 88,
    potential: 94,
    developmentPath: "star",
    developmentProgress: 0,
    xFactors: [
      {
        abilityId: "clutch",
        abilityName: "Clutch",
        description: "Late game pressure bonus.",
        rarity: "rare",
      },
    ],
    contract: {
      salaryPerYear: 10_000_000,
      yearsRemaining: 3,
      totalValue: 32_000_000,
      guaranteedMoney: 12_000_000,
      signingBonus: 2_000_000,
      contractType: "star",
      capHitPerYear: 10_666_667,
      deadCapPerYear: 4_666_667,
    },
    status: "active",
    ...overrides,
  };
}

describe("online x-factor system", () => {
  it("assigns x-factors rarely on default online rosters", () => {
    const storage = new MemoryStorage();
    const league = createJoinedLeague(storage);
    const roster = league.users[0]?.contractRoster ?? [];
    const playersWithXFactors = roster.filter((entry) => entry.xFactors.length > 0);

    expect(playersWithXFactors.length).toBeGreaterThan(0);
    expect(playersWithXFactors.length).toBeLessThan(roster.length);
  });

  it("triggers Clutch only in late close-game contexts", () => {
    const clutchPlayer = player();
    const earlyResult = evaluateOnlinePlayerXFactors(clutchPlayer, {
      quarter: 2,
      scoreDifferential: 3,
      down: 2,
      yardsToGo: 6,
      playType: "pass",
      fieldZone: "midfield",
    })[0];
    const lateResult = evaluateOnlinePlayerXFactors(clutchPlayer, {
      quarter: 4,
      scoreDifferential: -7,
      down: 3,
      yardsToGo: 6,
      playType: "pass",
      fieldZone: "midfield",
    })[0];

    expect(earlyResult?.active).toBe(false);
    expect(lateResult?.active).toBe(true);
    expect(lateResult?.impactModifier).toBeGreaterThan(0);
  });

  it("triggers Speed Burst with space but not in compressed red-zone contexts", () => {
    const speedPlayer = player({
      position: "WR",
      xFactors: [
        {
          abilityId: "speed_burst",
          abilityName: "Speed Burst",
          description: "Explosive-space bonus.",
          rarity: "rare",
        },
      ],
    });
    const redZoneResult = evaluateOnlinePlayerXFactors(speedPlayer, {
      quarter: 1,
      scoreDifferential: 0,
      down: 1,
      yardsToGo: 10,
      playType: "pass",
      fieldZone: "red_zone",
    })[0];
    const spaceResult = evaluateOnlinePlayerXFactors(speedPlayer, {
      quarter: 1,
      scoreDifferential: 0,
      down: 1,
      yardsToGo: 10,
      playType: "pass",
      fieldZone: "own",
    })[0];

    expect(redZoneResult?.active).toBe(false);
    expect(spaceResult?.active).toBe(true);
  });

  it("triggers Playmaker in high-leverage passing situations", () => {
    const playmaker = player({
      xFactors: [
        {
          abilityId: "playmaker",
          abilityName: "Playmaker",
          description: "High-leverage passing bonus.",
          rarity: "rare",
        },
      ],
    });
    const runResult = evaluateOnlinePlayerXFactors(playmaker, {
      quarter: 3,
      scoreDifferential: 14,
      down: 3,
      yardsToGo: 9,
      playType: "run",
      fieldZone: "midfield",
    })[0];
    const passResult = evaluateOnlinePlayerXFactors(playmaker, {
      quarter: 3,
      scoreDifferential: 14,
      down: 3,
      yardsToGo: 9,
      playType: "pass",
      fieldZone: "midfield",
    })[0];

    expect(runResult?.active).toBe(false);
    expect(passResult?.active).toBe(true);
  });

  it("evaluates team x-factors from stored league rosters", () => {
    const storage = new MemoryStorage();
    const league = createJoinedLeague(storage);
    const results = evaluateOnlineTeamXFactors(
      league.id,
      "user-1",
      {
        quarter: 4,
        scoreDifferential: 3,
        down: 3,
        yardsToGo: 8,
        playType: "pass",
        fieldZone: "midfield",
      },
      storage,
    );

    expect(results.some((result) => result.active)).toBe(true);
  });
});
