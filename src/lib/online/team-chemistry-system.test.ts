import { describe, expect, it } from "vitest";

import {
  calculateTeamChemistryGameplayModifier,
  createOnlineLeague,
  generateOnlineTrainingOutcome,
  joinOnlineLeague,
  recordOnlineMatchdayAttendance,
  saveOnlineLeague,
  submitWeeklyTrainingPlan,
  type FanbaseProfile,
  type OnlineLeague,
  type OnlineMatchdayInput,
  type TeamChemistryProfile,
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
  matchId: "chemistry-match-1",
  teamId: "berlin-wolves",
  season: 1,
  week: 1,
  wins: 5,
  losses: 4,
  won: true,
};

function createJoinedLeague(storage: MemoryStorage) {
  const league = createOnlineLeague({ name: "Chemistry League" }, storage);

  return joinOnlineLeague(
    league.id,
    { userId: "user-1", username: "Coach_1234" },
    BERLIN_WOLVES,
    storage,
  ).league;
}

type ChemistryTestUser = OnlineLeague["users"][number] & {
  fanbaseProfile: FanbaseProfile;
  teamChemistryProfile: TeamChemistryProfile;
};

function getUser(league: OnlineLeague): ChemistryTestUser {
  const user = league.users[0];

  if (!user?.teamChemistryProfile || !user.fanbaseProfile) {
    throw new Error("Expected complete chemistry user");
  }

  return user as ChemistryTestUser;
}

function withChemistry(
  league: OnlineLeague,
  storage: MemoryStorage,
  chemistryPatch: Partial<TeamChemistryProfile>,
) {
  const user = getUser(league);
  const profile = user.teamChemistryProfile;

  return saveOnlineLeague(
    {
      ...league,
      users: [
        {
          ...user,
          fanbaseProfile: {
            ...user.fanbaseProfile,
            fanMood: 50,
            fanLoyalty: 50,
            bandwagonFactor: 50,
          },
          teamChemistryProfile: {
            ...profile,
            ...chemistryPatch,
            gameplayModifier: calculateTeamChemistryGameplayModifier(
              chemistryPatch.score ?? profile.score,
            ),
          },
        },
      ],
    },
    storage,
  );
}

describe("online team chemistry system", () => {
  it("raises chemistry after team-chemistry focused training", () => {
    const storage = new MemoryStorage();
    const league = createJoinedLeague(storage);
    const initialScore = getUser(league).teamChemistryProfile.score;
    const plan = submitWeeklyTrainingPlan(
      league.id,
      "user-1",
      {
        intensity: "normal",
        primaryFocus: "team_chemistry",
        riskTolerance: "medium",
        youngPlayerPriority: 50,
        veteranMaintenance: 50,
      },
      storage,
    );

    expect(plan.status).toBe("submitted");

    const updatedLeague = generateOnlineTrainingOutcome(
      league.id,
      "user-1",
      storage,
    );
    const updatedUser = getUser(updatedLeague as OnlineLeague);

    expect(updatedUser.teamChemistryProfile.score).toBeGreaterThan(initialScore);
    expect(updatedUser.chemistryHistory?.[0]).toMatchObject({
      source: "training",
    });
  });

  it("moves chemistry logically after wins and losses", () => {
    const winStorage = new MemoryStorage();
    const lossStorage = new MemoryStorage();
    const winLeague = withChemistry(createJoinedLeague(winStorage), winStorage, {
      score: 55,
      playerSatisfaction: 55,
      recentTrend: 0,
    });
    const lossLeague = withChemistry(createJoinedLeague(lossStorage), lossStorage, {
      score: 55,
      playerSatisfaction: 55,
      recentTrend: 0,
    });

    const winner = recordOnlineMatchdayAttendance(
      winLeague.id,
      { ...BASE_MATCHDAY, won: true },
      winStorage,
    );
    const loser = recordOnlineMatchdayAttendance(
      lossLeague.id,
      { ...BASE_MATCHDAY, won: false, losses: 5 },
      lossStorage,
    );

    expect(getUser(winner as OnlineLeague).teamChemistryProfile.score).toBeGreaterThan(55);
    expect(getUser(loser as OnlineLeague).teamChemistryProfile.score).toBeLessThan(55);
  });

  it("keeps gameplay modifiers small but meaningful at extreme values", () => {
    expect(calculateTeamChemistryGameplayModifier(100)).toBe(0.08);
    expect(calculateTeamChemistryGameplayModifier(0)).toBe(-0.08);
    expect(calculateTeamChemistryGameplayModifier(50)).toBe(0);
  });

  it("lets extreme chemistry influence fan mood", () => {
    const highStorage = new MemoryStorage();
    const lowStorage = new MemoryStorage();
    const highLeague = withChemistry(createJoinedLeague(highStorage), highStorage, {
      score: 90,
      playerSatisfaction: 90,
    });
    const lowLeague = withChemistry(createJoinedLeague(lowStorage), lowStorage, {
      score: 15,
      playerSatisfaction: 15,
    });

    const highResult = recordOnlineMatchdayAttendance(
      highLeague.id,
      { ...BASE_MATCHDAY, won: true },
      highStorage,
    );
    const lowResult = recordOnlineMatchdayAttendance(
      lowLeague.id,
      { ...BASE_MATCHDAY, won: true },
      lowStorage,
    );

    expect(getUser(highResult as OnlineLeague).fanbaseProfile.fanMood).toBeGreaterThan(
      getUser(lowResult as OnlineLeague).fanbaseProfile.fanMood,
    );
  });
});
