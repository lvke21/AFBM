import { describe, expect, it } from "vitest";

import {
  createOnlineLeague,
  joinOnlineLeague,
  recordOnlineGmSeasonResult,
  setOnlineMediaExpectation,
  type FanPressureSnapshot,
  type GmJobSecurityScore,
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
  const league = createOnlineLeague({ name: "Media League" }, storage);

  return joinOnlineLeague(
    league.id,
    { userId: "user-1", username: "Coach_1234" },
    BERLIN_WOLVES,
    storage,
  ).league;
}

type MediaExpectationTestUser = OnlineLeague["users"][number] & {
  fanPressure: FanPressureSnapshot;
  jobSecurity: GmJobSecurityScore;
};

function getUser(league: OnlineLeague | null): MediaExpectationTestUser {
  const user = league?.users[0];

  if (!user?.jobSecurity || !user.fanPressure) {
    throw new Error("Expected evaluated media expectation user");
  }

  return user as MediaExpectationTestUser;
}

describe("online media expectations", () => {
  it("increases pressure when a GM sets a false championship expectation", () => {
    const rebuildStorage = new MemoryStorage();
    const championshipStorage = new MemoryStorage();
    const rebuildLeague = createJoinedLeague(rebuildStorage);
    const championshipLeague = createJoinedLeague(championshipStorage);

    setOnlineMediaExpectation(rebuildLeague.id, "user-1", "rebuild", 1, rebuildStorage);
    setOnlineMediaExpectation(
      championshipLeague.id,
      "user-1",
      "championship",
      1,
      championshipStorage,
    );

    const rebuildResult = recordOnlineGmSeasonResult(
      rebuildLeague.id,
      "user-1",
      { season: 1, wins: 5, losses: 12, playoffAppearance: false },
      rebuildStorage,
    );
    const championshipResult = recordOnlineGmSeasonResult(
      championshipLeague.id,
      "user-1",
      { season: 1, wins: 5, losses: 12, playoffAppearance: false },
      championshipStorage,
    );

    const rebuildUser = getUser(rebuildResult);
    const championshipUser = getUser(championshipResult);

    expect(championshipUser.fanPressure.fanPressureScore).toBeGreaterThan(
      rebuildUser.fanPressure.fanPressureScore,
    );
    expect(championshipUser.jobSecurity.score).toBeLessThan(
      rebuildUser.jobSecurity.score,
    );
    expect(championshipUser.jobSecurity.gmPerformanceHistory[0]?.seasonResults.expectation).toBe(
      "championship",
    );
  });

  it("stabilizes pressure when the selected expectation is met", () => {
    const storage = new MemoryStorage();
    const league = createJoinedLeague(storage);

    const withExpectation = setOnlineMediaExpectation(
      league.id,
      "user-1",
      "playoffs",
      1,
      storage,
    );

    expect(withExpectation?.users[0]?.mediaExpectationProfile).toMatchObject({
      goal: "playoffs",
      ownerExpectation: "playoffs",
    });

    const result = recordOnlineGmSeasonResult(
      league.id,
      "user-1",
      {
        season: 1,
        wins: 10,
        losses: 7,
        playoffAppearance: true,
        playoffWins: 1,
      },
      storage,
    );
    const user = getUser(result);

    expect(user.fanPressure.fanPressureScore).toBeLessThan(45);
    expect(user.jobSecurity.score).toBeGreaterThanOrEqual(72);
    expect(user.jobSecurity.gmPerformanceHistory[0]).toMatchObject({
      expectationResult: "met",
    });
  });
});
