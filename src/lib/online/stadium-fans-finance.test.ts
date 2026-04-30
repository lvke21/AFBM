import { describe, expect, it } from "vitest";

import {
  applyOnlineRevenueSharing,
  createOnlineLeague,
  getOnlineLeagueById,
  joinOnlineLeague,
  ONLINE_LEAGUES_STORAGE_KEY,
  ONLINE_MVP_TEAM_POOL,
  recordOnlineGmSeasonResult,
  recordOnlineMatchdayAttendance,
  saveOnlineLeague,
  setOnlineStadiumPricing,
  type FanbaseProfile,
  type FranchiseFinanceProfile,
  type OnlineLeague,
  type OnlineMatchdayInput,
  type StadiumProfile,
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

const BASE_INPUT: OnlineMatchdayInput = {
  matchId: "match-1",
  teamId: "berlin-wolves",
  season: 1,
  week: 1,
  wins: 6,
  losses: 3,
  playoffChances: 55,
  homeGameAttractiveness: 60,
  won: true,
};

function createJoinedLeague(storage: MemoryStorage) {
  const league = createOnlineLeague({ name: "Finance League" }, storage);

  return joinOnlineLeague(
    league.id,
    { userId: "user-1", username: "Coach_1234" },
    BERLIN_WOLVES,
    storage,
  ).league;
}

function cloneLeagueUser(league: OnlineLeague) {
  const user = league.users[0];

  if (!user?.stadiumProfile || !user.fanbaseProfile || !user.financeProfile) {
    throw new Error("Expected joined user with franchise profiles");
  }

  return user;
}

function withProfiles(
  league: OnlineLeague,
  storage: MemoryStorage,
  profiles: {
    stadiumProfile?: Partial<StadiumProfile>;
    fanbaseProfile?: Partial<FanbaseProfile>;
    financeProfile?: Partial<FranchiseFinanceProfile>;
  },
) {
  const user = cloneLeagueUser(league);
  const stadiumProfile = user.stadiumProfile;
  const fanbaseProfile = user.fanbaseProfile;
  const financeProfile = user.financeProfile;

  if (!stadiumProfile || !fanbaseProfile || !financeProfile) {
    throw new Error("Expected joined user with franchise profiles");
  }

  return saveOnlineLeague(
    {
      ...league,
      users: [
        {
          ...user,
          stadiumProfile: {
            ...stadiumProfile,
            ...profiles.stadiumProfile,
          },
          fanbaseProfile: {
            ...fanbaseProfile,
            ...profiles.fanbaseProfile,
          },
          financeProfile: {
            ...financeProfile,
            ...profiles.financeProfile,
          },
        },
      ],
    },
    storage,
  );
}

function recordMatch(
  league: OnlineLeague,
  storage: MemoryStorage,
  input: Partial<OnlineMatchdayInput>,
) {
  const user = cloneLeagueUser(league);

  return recordOnlineMatchdayAttendance(
    league.id,
    {
      ...BASE_INPUT,
      teamId: user.teamId,
      ...input,
    },
    storage,
  );
}

describe("stadium, fans and franchise finance", () => {
  it("raises fan mood for a winner more than for a loser", () => {
    const winningStorage = new MemoryStorage();
    const losingStorage = new MemoryStorage();
    const winningLeague = withProfiles(createJoinedLeague(winningStorage), winningStorage, {
      fanbaseProfile: { fanMood: 60, fanLoyalty: 55, bandwagonFactor: 50 },
    });
    const losingLeague = withProfiles(createJoinedLeague(losingStorage), losingStorage, {
      fanbaseProfile: { fanMood: 60, fanLoyalty: 55, bandwagonFactor: 50 },
    });

    const winner = recordMatch(winningLeague, winningStorage, { won: true });
    const loser = recordMatch(losingLeague, losingStorage, {
      matchId: "match-2",
      won: false,
    });

    expect(winner?.users[0]?.fanbaseProfile?.fanMood).toBeGreaterThan(
      loser?.users[0]?.fanbaseProfile?.fanMood ?? 0,
    );
  });

  it("lowers attendance during a bad losing streak", () => {
    const goodStorage = new MemoryStorage();
    const badStorage = new MemoryStorage();
    const goodLeague = withProfiles(createJoinedLeague(goodStorage), goodStorage, {
      fanbaseProfile: { fanMood: 62, fanLoyalty: 50 },
    });
    const badLeague = withProfiles(createJoinedLeague(badStorage), badStorage, {
      fanbaseProfile: { fanMood: 62, fanLoyalty: 50 },
    });

    const good = recordMatch(goodLeague, goodStorage, {
      wins: 7,
      losses: 2,
      winStreak: 4,
      won: true,
    });
    const bad = recordMatch(badLeague, badStorage, {
      matchId: "match-2",
      wins: 2,
      losses: 7,
      losingStreak: 5,
      won: false,
    });

    expect(bad?.users[0]?.attendanceHistory?.[0]?.attendanceRate).toBeLessThan(
      good?.users[0]?.attendanceHistory?.[0]?.attendanceRate ?? 0,
    );
  });

  it("buffers fan mood loss with high fan loyalty", () => {
    const loyalStorage = new MemoryStorage();
    const fragileStorage = new MemoryStorage();
    const loyalLeague = withProfiles(createJoinedLeague(loyalStorage), loyalStorage, {
      fanbaseProfile: { fanMood: 60, fanLoyalty: 95 },
    });
    const fragileLeague = withProfiles(createJoinedLeague(fragileStorage), fragileStorage, {
      fanbaseProfile: { fanMood: 60, fanLoyalty: 10 },
    });

    const loyal = recordMatch(loyalLeague, loyalStorage, {
      won: false,
      losingStreak: 5,
      wins: 2,
      losses: 7,
    });
    const fragile = recordMatch(fragileLeague, fragileStorage, {
      matchId: "match-2",
      won: false,
      losingStreak: 5,
      wins: 2,
      losses: 7,
    });

    expect(loyal?.users[0]?.fanbaseProfile?.fanMood).toBeGreaterThan(
      fragile?.users[0]?.fanbaseProfile?.fanMood ?? 0,
    );
  });

  it("can reduce attendance with high ticket prices", () => {
    const premiumStorage = new MemoryStorage();
    const fairStorage = new MemoryStorage();
    const premiumLeague = withProfiles(createJoinedLeague(premiumStorage), premiumStorage, {
      stadiumProfile: { ticketPriceLevel: 95 },
      fanbaseProfile: { fanMood: 64 },
    });
    const fairLeague = withProfiles(createJoinedLeague(fairStorage), fairStorage, {
      stadiumProfile: { ticketPriceLevel: 35 },
      fanbaseProfile: { fanMood: 64 },
    });

    const premium = recordMatch(premiumLeague, premiumStorage, {});
    const fair = recordMatch(fairLeague, fairStorage, { matchId: "match-2" });

    expect(premium?.users[0]?.attendanceHistory?.[0]?.attendanceRate).toBeLessThan(
      fair?.users[0]?.attendanceHistory?.[0]?.attendanceRate ?? 0,
    );
  });

  it("lets GM pricing changes reduce attendance with premium tickets", () => {
    const premiumStorage = new MemoryStorage();
    const fairStorage = new MemoryStorage();
    const premiumLeague = createJoinedLeague(premiumStorage);
    const fairLeague = createJoinedLeague(fairStorage);

    setOnlineStadiumPricing(
      premiumLeague.id,
      "user-1",
      { ticketPriceLevel: 95, merchPriceLevel: 55 },
      premiumStorage,
    );
    setOnlineStadiumPricing(
      fairLeague.id,
      "user-1",
      { ticketPriceLevel: 35, merchPriceLevel: 55 },
      fairStorage,
    );

    const premium = recordMatch(premiumLeague, premiumStorage, {});
    const fair = recordMatch(fairLeague, fairStorage, { matchId: "match-2" });

    expect(premium?.users[0]?.attendanceHistory?.[0]?.attendanceRate).toBeLessThan(
      fair?.users[0]?.attendanceHistory?.[0]?.attendanceRate ?? 0,
    );
    expect(premium?.events?.map((event) => event.eventType)).toContain(
      "stadium_pricing_updated",
    );
  });

  it("reacts to merchandise price changes in matchday revenue", () => {
    const premiumStorage = new MemoryStorage();
    const valueStorage = new MemoryStorage();
    const premiumLeague = createJoinedLeague(premiumStorage);
    const valueLeague = createJoinedLeague(valueStorage);

    setOnlineStadiumPricing(
      premiumLeague.id,
      "user-1",
      { ticketPriceLevel: 55, merchPriceLevel: 90 },
      premiumStorage,
    );
    setOnlineStadiumPricing(
      valueLeague.id,
      "user-1",
      { ticketPriceLevel: 55, merchPriceLevel: 25 },
      valueStorage,
    );

    const premium = recordMatch(premiumLeague, premiumStorage, {});
    const value = recordMatch(valueLeague, valueStorage, { matchId: "match-2" });

    expect(premium?.users[0]?.attendanceHistory?.[0]?.merchandiseRevenue).toBeGreaterThan(
      value?.users[0]?.attendanceHistory?.[0]?.merchandiseRevenue ?? 0,
    );
  });

  it("can hurt fan mood when both stadium prices are aggressive", () => {
    const premiumStorage = new MemoryStorage();
    const fairStorage = new MemoryStorage();
    const premiumLeague = withProfiles(createJoinedLeague(premiumStorage), premiumStorage, {
      fanbaseProfile: { fanMood: 60, fanLoyalty: 50, bandwagonFactor: 50 },
    });
    const fairLeague = withProfiles(createJoinedLeague(fairStorage), fairStorage, {
      fanbaseProfile: { fanMood: 60, fanLoyalty: 50, bandwagonFactor: 50 },
    });

    setOnlineStadiumPricing(
      premiumLeague.id,
      "user-1",
      { ticketPriceLevel: 100, merchPriceLevel: 100 },
      premiumStorage,
    );
    setOnlineStadiumPricing(
      fairLeague.id,
      "user-1",
      { ticketPriceLevel: 45, merchPriceLevel: 45 },
      fairStorage,
    );

    const premium = recordMatch(premiumLeague, premiumStorage, {});
    const fair = recordMatch(fairLeague, fairStorage, { matchId: "match-2" });

    expect(premium?.users[0]?.fanbaseProfile?.fanMood).toBeLessThan(
      fair?.users[0]?.fanbaseProfile?.fanMood ?? 0,
    );
  });

  it("adds attendance for rivalry games", () => {
    const rivalryStorage = new MemoryStorage();
    const normalStorage = new MemoryStorage();
    const rivalryLeague = withProfiles(createJoinedLeague(rivalryStorage), rivalryStorage, {
      stadiumProfile: { ticketPriceLevel: 80 },
      fanbaseProfile: { fanMood: 48, fanLoyalty: 45 },
    });
    const normalLeague = withProfiles(createJoinedLeague(normalStorage), normalStorage, {
      stadiumProfile: { ticketPriceLevel: 80 },
      fanbaseProfile: { fanMood: 48, fanLoyalty: 45 },
    });

    const rivalry = recordMatch(rivalryLeague, rivalryStorage, { rivalryGame: true });
    const normal = recordMatch(normalLeague, normalStorage, {
      matchId: "match-2",
      rivalryGame: false,
    });

    expect(rivalry?.users[0]?.attendanceHistory?.[0]?.attendanceRate).toBeGreaterThan(
      normal?.users[0]?.attendanceHistory?.[0]?.attendanceRate ?? 0,
    );
  });

  it("generates more merchandise revenue for successful teams", () => {
    const strongStorage = new MemoryStorage();
    const weakStorage = new MemoryStorage();
    const strongLeague = withProfiles(createJoinedLeague(strongStorage), strongStorage, {
      fanbaseProfile: { fanMood: 70, marketSize: 70, merchInterest: 70 },
    });
    const weakLeague = withProfiles(createJoinedLeague(weakStorage), weakStorage, {
      fanbaseProfile: { fanMood: 70, marketSize: 70, merchInterest: 70 },
    });

    const strong = recordMatch(strongLeague, strongStorage, {
      wins: 9,
      losses: 1,
      won: true,
      playoffChances: 80,
    });
    const weak = recordMatch(weakLeague, weakStorage, {
      matchId: "match-2",
      wins: 1,
      losses: 9,
      won: false,
      playoffChances: 5,
    });

    expect(strong?.users[0]?.merchandiseFinancials?.[0]?.totalMerchRevenue).toBeGreaterThan(
      weak?.users[0]?.merchandiseFinancials?.[0]?.totalMerchRevenue ?? 0,
    );
  });

  it("lets fan pressure affect job security", () => {
    const storage = new MemoryStorage();
    const league = withProfiles(createJoinedLeague(storage), storage, {
      fanbaseProfile: {
        fanMood: 10,
        mediaPressure: 95,
        expectations: 90,
        fanLoyalty: 10,
        rivalryIntensity: 90,
      },
    });

    const updatedLeague = recordOnlineGmSeasonResult(
      league.id,
      "user-1",
      {
        season: 1,
        wins: 2,
        losses: 15,
        expectation: "playoffs",
        rivalryLosses: 3,
        losingStreak: 8,
      },
      storage,
    );
    const history = updatedLeague?.users[0]?.jobSecurity?.gmPerformanceHistory[0];

    expect(history?.jobSecurityDeltaFromFans).toBeLessThan(0);
    expect(updatedLeague?.events?.map((event) => event.eventType)).toContain(
      "owner_confidence_changed_by_fans",
    );
  });

  it("distributes revenue sharing across franchises", () => {
    const storage = new MemoryStorage();
    let league = createJoinedLeague(storage);
    league = joinOnlineLeague(
      league.id,
      { userId: "user-2", username: "Coach_5678" },
      ZURICH_FORGE,
      storage,
    ).league;
    const [firstUser, secondUser] = league.users;

    if (!firstUser?.financeProfile || !secondUser?.financeProfile) {
      throw new Error("Expected finance profiles");
    }

    const savedLeague = saveOnlineLeague(
      {
        ...league,
        users: [
          {
            ...firstUser,
            financeProfile: {
            ...firstUser.financeProfile,
              ticketRevenue: 10_000_000,
              totalRevenue: 10_000_000,
              cashBalance: 10_000_000,
            },
          },
          {
            ...secondUser,
            financeProfile: {
              ...secondUser.financeProfile,
              totalRevenue: 0,
              cashBalance: 10_000_000,
            },
          },
        ],
      },
      storage,
    );

    const sharedLeague = applyOnlineRevenueSharing(savedLeague.id, storage);

    expect(sharedLeague?.users[0]?.financeProfile?.cashBalance).toBe(9_000_000);
    expect(sharedLeague?.users[1]?.financeProfile?.cashBalance).toBe(11_000_000);
  });

  it("keeps generated finance values non-negative", () => {
    const storage = new MemoryStorage();
    const league = withProfiles(createJoinedLeague(storage), storage, {
      stadiumProfile: { condition: 1, comfort: 100, ticketPriceLevel: 100 },
      fanbaseProfile: { fanMood: 5 },
    });

    const updatedLeague = recordMatch(league, storage, {
      wins: 0,
      losses: 8,
      losingStreak: 8,
      won: false,
    });
    const finance = updatedLeague?.users[0]?.financeProfile;

    expect(finance?.totalRevenue).toBeGreaterThanOrEqual(0);
    expect(finance?.totalExpenses).toBeGreaterThanOrEqual(0);
    expect(finance?.cashBalance).toBeGreaterThanOrEqual(0);
  });

  it("adds stadium, fanbase and finance defaults to older league saves", () => {
    const storage = new MemoryStorage();

    storage.setItem(
      ONLINE_LEAGUES_STORAGE_KEY,
      JSON.stringify([
        {
          id: "legacy-league",
          name: "Legacy League",
          maxUsers: 16,
          status: "waiting",
          teams: ONLINE_MVP_TEAM_POOL,
          leagueSettings: {
            gmActivityRules: {
              warningAfterMissedWeeks: 1,
              inactiveAfterMissedWeeks: 2,
              removalEligibleAfterMissedWeeks: 3,
              autoVacateAfterMissedWeeks: false,
            },
          },
          users: [
            {
              userId: "legacy-user",
              username: "Coach_Legacy",
              joinedAt: "2026-04-29T19:00:00.000Z",
              teamId: "legacy-team",
              teamName: "Legacy Team",
            },
          ],
        },
      ]),
    );

    const league = getOnlineLeagueById("legacy-league", storage);

    expect(league?.leagueSettings?.financeRules.enableStadiumFinance).toBe(true);
    expect(league?.users[0]).toMatchObject({
      stadiumProfile: expect.any(Object),
      fanbaseProfile: expect.any(Object),
      financeProfile: expect.any(Object),
    });
  });
});
