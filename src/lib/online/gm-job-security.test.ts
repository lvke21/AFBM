import { describe, expect, it } from "vitest";

import {
  authorizeOnlineGmRemoval,
  claimVacantOnlineTeam,
  createOnlineLeague,
  getOnlineLeagueById,
  joinOnlineLeague,
  markOnlineTeamVacant,
  recordOnlineGmMissedWeek,
  recordOnlineGmSeasonResult,
  removeOnlineGmByAdmin,
  saveOnlineLeague,
  warnOnlineGm,
  type OnlineLeague,
  type OwnershipProfile,
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

const PATIENT_OWNER: OwnershipProfile = {
  ownerId: "owner-patient",
  ownerName: "Patient Ownership Group",
  patience: 92,
  ambition: 42,
  financialPressure: 35,
  loyalty: 85,
  mediaSensitivity: 25,
  rebuildTolerance: 92,
};

const WIN_NOW_OWNER: OwnershipProfile = {
  ownerId: "owner-win-now",
  ownerName: "Win Now Ownership Group",
  patience: 20,
  ambition: 94,
  financialPressure: 78,
  loyalty: 35,
  mediaSensitivity: 82,
  rebuildTolerance: 18,
};

function createJoinedLeague(storage: MemoryStorage, ownerProfile = PATIENT_OWNER) {
  const league = createOnlineLeague({ name: "Job Security League" }, storage);
  const joined = joinOnlineLeague(
    league.id,
    { userId: "user-1", username: "Coach_1234" },
    BERLIN_WOLVES,
    storage,
  );
  const user = joined.league.users[0];

  if (!user) {
    throw new Error("Expected joined user");
  }

  return saveOnlineLeague(
    {
      ...joined.league,
      users: [
        {
          ...user,
          ownershipProfile: ownerProfile,
        },
      ],
    },
    storage,
  );
}

describe("gm job security and admin removal", () => {
  it("raises job security after a strong season", () => {
    const storage = new MemoryStorage();
    const league = createJoinedLeague(storage);

    const updatedLeague = recordOnlineGmSeasonResult(
      league.id,
      "user-1",
      {
        season: 1,
        wins: 13,
        losses: 4,
        expectation: "playoffs",
        playoffAppearance: true,
        playoffWins: 2,
      },
      storage,
    );

    expect(updatedLeague?.users[0]?.jobSecurity?.score).toBeGreaterThan(72);
    expect(updatedLeague?.users[0]?.jobSecurity?.gmPerformanceHistory[0]).toMatchObject({
      expectationResult: "exceeded",
    });
  });

  it("lowers job security after a poor season", () => {
    const storage = new MemoryStorage();
    const league = createJoinedLeague(storage);

    const updatedLeague = recordOnlineGmSeasonResult(
      league.id,
      "user-1",
      {
        season: 1,
        wins: 3,
        losses: 14,
        expectation: "competitive",
        losingStreak: 7,
      },
      storage,
    );

    const user = updatedLeague?.users[0];

    expect(user?.jobSecurity?.score).toBeLessThan(72);
    expect(user?.jobSecurity?.gmPerformanceHistory[0]).toMatchObject({
      expectationResult: "failed",
      finalJobSecurityScore: user?.jobSecurity?.score,
    });
    expect(updatedLeague?.events?.map((event) => event.eventType)).toEqual(
      expect.arrayContaining(["owner_confidence_changed"]),
    );
  });

  it("lets fans influence owner confidence", () => {
    const calmStorage = new MemoryStorage();
    const hostileStorage = new MemoryStorage();
    const calmLeague = createJoinedLeague(calmStorage);
    const hostileLeague = createJoinedLeague(hostileStorage);
    const hostileUser = hostileLeague.users[0];

    if (!hostileUser?.fanbaseProfile) {
      throw new Error("Expected fanbase profile");
    }

    const hostileSavedLeague = saveOnlineLeague(
      {
        ...hostileLeague,
        users: [
          {
            ...hostileUser,
            fanbaseProfile: {
              ...hostileUser.fanbaseProfile,
              fanMood: 12,
              mediaPressure: 96,
              expectations: 90,
            },
          },
        ],
      },
      hostileStorage,
    );

    const calmResult = recordOnlineGmSeasonResult(
      calmLeague.id,
      "user-1",
      { season: 1, wins: 7, losses: 10, expectation: "competitive" },
      calmStorage,
    );
    const hostileResult = recordOnlineGmSeasonResult(
      hostileSavedLeague.id,
      "user-1",
      { season: 1, wins: 7, losses: 10, expectation: "competitive" },
      hostileStorage,
    );

    expect(hostileResult?.users[0]?.fanPressure?.fanPressureScore).toBeGreaterThan(
      calmResult?.users[0]?.fanPressure?.fanPressureScore ?? 0,
    );
    expect(hostileResult?.users[0]?.jobSecurity?.score).toBeLessThan(
      calmResult?.users[0]?.jobSecurity?.score ?? 0,
    );
  });

  it("patient owners fire later than win-now owners", () => {
    const patientStorage = new MemoryStorage();
    const winNowStorage = new MemoryStorage();
    const patientLeague = createJoinedLeague(patientStorage, PATIENT_OWNER);
    const winNowLeague = createJoinedLeague(winNowStorage, WIN_NOW_OWNER);

    recordOnlineGmSeasonResult(
      patientLeague.id,
      "user-1",
      { season: 1, wins: 2, losses: 15, expectation: "rebuild", losingStreak: 8 },
      patientStorage,
    );
    const patientAfterSecond = recordOnlineGmSeasonResult(
      patientLeague.id,
      "user-1",
      { season: 2, wins: 3, losses: 14, expectation: "rebuild", losingStreak: 7 },
      patientStorage,
    );

    recordOnlineGmSeasonResult(
      winNowLeague.id,
      "user-1",
      { season: 1, wins: 3, losses: 14, expectation: "playoffs", losingStreak: 7 },
      winNowStorage,
    );
    const winNowAfterSecond = recordOnlineGmSeasonResult(
      winNowLeague.id,
      "user-1",
      { season: 2, wins: 3, losses: 14, expectation: "playoffs", losingStreak: 8 },
      winNowStorage,
    );

    expect(patientAfterSecond?.users[0]?.jobSecurity?.status).not.toBe("fired");
    expect(winNowAfterSecond?.users[0]?.jobSecurity?.status).toBe("fired");
    expect(winNowAfterSecond?.users[0]?.teamStatus).toBe("vacant");
  });

  it("does not fire immediately without bad-season history", () => {
    const storage = new MemoryStorage();
    const league = createJoinedLeague(storage, WIN_NOW_OWNER);

    const updatedLeague = recordOnlineGmSeasonResult(
      league.id,
      "user-1",
      { season: 1, wins: 0, losses: 17, expectation: "championship", losingStreak: 12 },
      storage,
    );

    expect(updatedLeague?.users[0]?.jobSecurity?.status).not.toBe("fired");
    expect(updatedLeague?.users[0]?.teamStatus).toBe("occupied");
  });

  it("marks an inactive GM as removal eligible after configured missed weeks", () => {
    const storage = new MemoryStorage();
    const league = createJoinedLeague(storage);

    recordOnlineGmMissedWeek(league.id, "user-1", storage);
    recordOnlineGmMissedWeek(league.id, "user-1", storage);
    const updatedLeague = recordOnlineGmMissedWeek(league.id, "user-1", storage);

    expect(updatedLeague?.users[0]?.activity).toMatchObject({
      missedWeeklyActions: 3,
      inactiveStatus: "removal_eligible",
    });
  });

  it("applies inactivity penalty to job security", () => {
    const activeStorage = new MemoryStorage();
    const inactiveStorage = new MemoryStorage();
    const activeLeague = createJoinedLeague(activeStorage);
    const inactiveLeague = createJoinedLeague(inactiveStorage);

    recordOnlineGmMissedWeek(inactiveLeague.id, "user-1", inactiveStorage);
    recordOnlineGmMissedWeek(inactiveLeague.id, "user-1", inactiveStorage);
    recordOnlineGmMissedWeek(inactiveLeague.id, "user-1", inactiveStorage);

    const activeResult = recordOnlineGmSeasonResult(
      activeLeague.id,
      "user-1",
      { season: 1, wins: 8, losses: 9, expectation: "competitive" },
      activeStorage,
    );
    const inactiveResult = recordOnlineGmSeasonResult(
      inactiveLeague.id,
      "user-1",
      { season: 1, wins: 8, losses: 9, expectation: "competitive" },
      inactiveStorage,
    );

    expect(inactiveResult?.users[0]?.jobSecurity?.score).toBeLessThan(
      activeResult?.users[0]?.jobSecurity?.score ?? 0,
    );
    expect(inactiveResult?.users[0]?.jobSecurity?.gmPerformanceHistory[0]).toMatchObject({
      inactivityPenalty: -30,
    });
  });

  it("admin can warn, authorize removal and writes audit events", () => {
    const storage = new MemoryStorage();
    const league = createJoinedLeague(storage);

    warnOnlineGm(
      league.id,
      "user-1",
      "Bitte Week Action nachholen.",
      "2026-05-06T12:00:00.000Z",
      storage,
    );
    const updatedLeague = authorizeOnlineGmRemoval(
      league.id,
      "user-1",
      "Drei Wochen inaktiv.",
      storage,
    );

    expect(updatedLeague?.users[0]?.adminRemoval).toMatchObject({
      status: "admin_authorized_removal",
      reason: "Drei Wochen inaktiv.",
    });
    expect(updatedLeague?.events?.map((event) => event.eventType)).toEqual(
      expect.arrayContaining(["gm_warning", "gm_removal_authorized"]),
    );
  });

  it("admin removal creates audit log and keeps the team as vacant", () => {
    const storage = new MemoryStorage();
    const league = createJoinedLeague(storage);

    const updatedLeague = removeOnlineGmByAdmin(
      league.id,
      "user-1",
      "Inaktivität und keine Rückmeldung.",
      storage,
    );

    expect(updatedLeague?.users[0]).toMatchObject({
      teamStatus: "vacant",
      controlledBy: "ai_or_commissioner",
      allowNewUserJoin: true,
      previousUserId: "user-1",
    });
    expect(updatedLeague?.events?.map((event) => event.eventType)).toEqual(
      expect.arrayContaining(["gm_removed_by_admin", "team_marked_vacant"]),
    );
    expect(updatedLeague?.logs?.[0]?.message).toContain("Team marked vacant");
  });

  it("can mark a team vacant and let a new GM inherit it", () => {
    const storage = new MemoryStorage();
    const league = createJoinedLeague(storage);

    markOnlineTeamVacant(league.id, "user-1", "Owner sucht neuen GM.", storage);
    const vacantLeague = getOnlineLeagueById(league.id, storage) as OnlineLeague;
    const teamId = vacantLeague.users[0]?.teamId ?? "";
    const claim = claimVacantOnlineTeam(
      league.id,
      teamId,
      { userId: "user-2", username: "Coach_5678" },
      storage,
    );

    expect(claim.status).toBe("joined");
    expect(claim.league.users[0]).toMatchObject({
      userId: "user-2",
      username: "Coach_5678",
      teamId,
      teamDisplayName: "Berlin Wolves",
      teamStatus: "occupied",
      controlledBy: "user",
      allowNewUserJoin: false,
      previousUserId: "user-1",
    });
  });
});
