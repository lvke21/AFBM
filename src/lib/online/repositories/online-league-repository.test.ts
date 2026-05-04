import { describe, expect, it } from "vitest";

import {
  ONLINE_USERNAME_STORAGE_KEY,
  ONLINE_USER_ID_STORAGE_KEY,
} from "../online-user-service";
import { getOnlineLeagueById, saveOnlineLeague } from "../online-league-service";
import type { OnlineContractPlayer, OnlineLeague } from "../online-league-types";
import type { TeamIdentitySelection } from "../team-identity-options";
import {
  validateMultiplayerDraftSourceConsistency,
  validateMultiplayerDraftStateIntegrity,
} from "../multiplayer-draft-logic";
import { assertActiveMembership, assertLeagueAdmin, assertTeamOwner } from "../security/roles";
import {
  mapFirestoreSnapshotToOnlineLeague,
  type FirestoreLeagueMemberMirrorDoc,
  type FirestoreOnlineLeagueDoc,
  type FirestoreOnlineLeagueSnapshot,
  type FirestoreOnlineMembershipDoc,
  type FirestoreOnlineTeamDoc,
} from "../types";
import {
  canLoadOnlineLeagueFromMembership,
  chooseAvailableFirestoreTeamForIdentity,
  chooseFirstAvailableFirestoreTeam,
  createLeagueMemberMirrorFromMembership,
  getMembershipProjectionProblem,
  getTeamProjectionWithoutMembershipProblem,
  isFirestoreWeekSimulationLockActive,
  isLeagueMemberMirrorAligned,
  resolveLeagueDiscoveryCandidateIds,
  resolveFirestoreMembershipForUser,
} from "./firebase-online-league-repository";
import {
  isMembershipMirrorProjectionProblem,
  isMembershipTeamProjectionProblem,
  readFirestoreFantasyDraftState,
} from "./firebase-online-league-mappers";
import { LocalOnlineLeagueRepository } from "./local-online-league-repository";

class MemoryStorage implements Storage {
  private readonly items = new Map<string, string>();

  get length() {
    return this.items.size;
  }

  clear() {
    this.items.clear();
  }

  getItem(key: string) {
    return this.items.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.items.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.items.delete(key);
  }

  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
}

const BERLIN_WOLVES: TeamIdentitySelection = {
  cityId: "berlin",
  category: "aggressive_competitive",
  teamNameId: "wolves",
};

const PARIS_GUARDIANS: TeamIdentitySelection = {
  cityId: "paris",
  category: "identity_city",
  teamNameId: "guardians",
};

const DRAFT_PLAYER: OnlineContractPlayer = {
  playerId: "player-qb-1",
  playerName: "Test Quarterback",
  position: "QB",
  age: 24,
  overall: 82,
  potential: 88,
  developmentPath: "solid",
  developmentProgress: 0,
  xFactors: [],
  contract: {
    salaryPerYear: 1_000_000,
    yearsRemaining: 2,
    totalValue: 2_000_000,
    guaranteedMoney: 500_000,
    signingBonus: 250_000,
    contractType: "regular",
    capHitPerYear: 1_000_000,
    deadCapPerYear: 250_000,
  },
  status: "active",
};

function draftPlayer(overrides: Partial<OnlineContractPlayer> = {}): OnlineContractPlayer {
  return {
    ...DRAFT_PLAYER,
    ...overrides,
  };
}

function firestoreTeam(
  id: string,
  overrides: Partial<FirestoreOnlineTeamDoc> = {},
): FirestoreOnlineTeamDoc {
  return {
    id,
    teamName: id,
    displayName: id,
    assignedUserId: null,
    status: "available",
    createdAt: `2026-05-01T09:00:0${id.length % 9}.000Z`,
    updatedAt: `2026-05-01T09:00:0${id.length % 9}.000Z`,
    ...overrides,
  };
}

function firestoreMembership(
  overrides: Partial<FirestoreOnlineMembershipDoc> = {},
): FirestoreOnlineMembershipDoc {
  return {
    userId: "firebase-user",
    username: "Firebase User",
    displayName: "Firebase User",
    role: "gm",
    teamId: "team-a",
    joinedAt: "2026-05-01T09:00:00.000Z",
    lastSeenAt: "2026-05-01T09:00:00.000Z",
    ready: false,
    status: "active",
    ...overrides,
  };
}

function firestoreLeagueMemberMirror(
  overrides: Partial<FirestoreLeagueMemberMirrorDoc> = {},
): FirestoreLeagueMemberMirrorDoc {
  return {
    id: "league-alpha_firebase-user",
    leagueId: "league-alpha",
    leagueSlug: "league-alpha",
    userId: "firebase-user",
    role: "GM",
    status: "ACTIVE",
    teamId: "team-a",
    createdAt: "2026-05-01T09:00:00.000Z",
    updatedAt: "2026-05-01T09:00:00.000Z",
    ...overrides,
  };
}

function firestoreLeagueDoc(
  overrides: Partial<FirestoreOnlineLeagueDoc> = {},
): FirestoreOnlineLeagueDoc {
  return {
    id: "league-alpha",
    name: "League Alpha",
    status: "lobby",
    createdByUserId: "admin-user",
    createdAt: "2026-05-01T09:00:00.000Z",
    updatedAt: "2026-05-01T09:00:00.000Z",
    maxTeams: 8,
    memberCount: 1,
    currentWeek: 1,
    currentSeason: 1,
    settings: { leagueSlug: "league-alpha" },
    version: 1,
    ...overrides,
  };
}

function setUser(storage: Storage, userId: string, username: string) {
  storage.setItem(ONLINE_USER_ID_STORAGE_KEY, userId);
  storage.setItem(ONLINE_USERNAME_STORAGE_KEY, username);
}

async function markLocalLeagueWeekReady(
  storage: Storage,
  league: OnlineLeague,
  patch: Record<string, unknown> = {},
) {
  saveOnlineLeague(
    {
      ...league,
      fantasyDraft: {
        availablePlayerIds: [],
        completedAt: "2026-05-01T10:00:00.000Z",
        currentTeamId: "",
        draftOrder: [],
        leagueId: league.id,
        pickNumber: 1,
        picks: [],
        round: 1,
        startedAt: "2026-05-01T09:00:00.000Z",
        status: "completed",
      },
      status: "active",
      ...patch,
    },
    storage,
  );
}

describe("online league repository backbone", () => {
  it("keeps the local repository functional as legacy fallback", async () => {
    const storage = new MemoryStorage();
    const repository = new LocalOnlineLeagueRepository(storage);

    setUser(storage, "user-a", "Coach_A");
    const league = await repository.createLeague({ name: "Fallback League", maxUsers: 2 });
    const result = await repository.joinLeague(league.id, BERLIN_WOLVES);

    expect(result.status).toBe("joined");
    expect(result.league.users[0]).toMatchObject({
      userId: "user-a",
      teamDisplayName: "Berlin Wolves",
    });
    expect(repository.getLastLeagueId()).toBe(league.id);
  });

  it("prevents duplicate membership and assigns different teams to different users", async () => {
    const storage = new MemoryStorage();
    const repository = new LocalOnlineLeagueRepository(storage);

    setUser(storage, "user-a", "Coach_A");
    const league = await repository.createLeague({ name: "Join League", maxUsers: 2 });
    const firstJoin = await repository.joinLeague(league.id, BERLIN_WOLVES);
    const duplicateJoin = await repository.joinLeague(league.id, BERLIN_WOLVES);

    setUser(storage, "user-b", "Coach_B");
    const secondJoin = await repository.joinLeague(league.id, PARIS_GUARDIANS);

    expect(firstJoin.status).toBe("joined");
    expect(duplicateJoin.status).toBe("already-member");
    expect(secondJoin.status).toBe("joined");
    expect(new Set(secondJoin.league.users.map((user) => user.teamId)).size).toBe(2);
  });

  it("assigns a deterministic free team when a new user joins without team identity", async () => {
    const storage = new MemoryStorage();
    const repository = new LocalOnlineLeagueRepository(storage);

    setUser(storage, "user-a", "Coach_A");
    const league = await repository.createLeague({ name: "Invite League", maxUsers: 2 });
    const joined = await repository.joinLeague(league.id);

    expect(joined.status).toBe("joined");
    expect(joined.league.users[0]).toMatchObject({
      userId: "user-a",
      teamId: league.teams[0]?.id,
      teamDisplayName: league.teams[0]?.name,
    });
    expect(joined.league.teams[0]).toMatchObject({
      assignedUserId: "user-a",
      assignmentStatus: "assigned",
    });
  });

  it("returns a clear full response when no team can be assigned", async () => {
    const storage = new MemoryStorage();
    const repository = new LocalOnlineLeagueRepository(storage);

    setUser(storage, "user-a", "Coach_A");
    const league = await repository.createLeague({ name: "Full Invite League", maxUsers: 1 });
    await repository.joinLeague(league.id);

    setUser(storage, "user-b", "Coach_B");
    const fullJoin = await repository.joinLeague(league.id);

    expect(fullJoin).toMatchObject({
      status: "full",
      message: "Diese Liga ist bereits voll.",
    });
  });

  it("does not silently repair team-only projections when membership is missing", async () => {
    const storage = new MemoryStorage();
    const repository = new LocalOnlineLeagueRepository(storage);

    setUser(storage, "user-a", "Coach_A");
    const league = await repository.createLeague({ name: "Team Only League", maxUsers: 2 });
    saveOnlineLeague(
      {
        ...league,
        teams: league.teams.map((team, index) =>
          index === 0
            ? {
                ...team,
                assignedUserId: "user-a",
                assignmentStatus: "assigned" as const,
              }
            : team,
        ),
      },
      storage,
    );

    const joinResult = await repository.joinLeague(league.id);

    expect(joinResult).toMatchObject({
      status: "missing-league",
      message: `Membership-Projektion inkonsistent in ${league.id} für user-a: missing-membership-for-team:${league.teams[0]?.id}`,
    });
  });

  it("exposes stable local subscriptions with safe unsubscribe", async () => {
    const storage = new MemoryStorage();
    const repository = new LocalOnlineLeagueRepository(storage);
    const league = await repository.createLeague({ name: "Realtime Fallback" });
    const seenLeagueIds: string[] = [];
    const unsubscribe = repository.subscribeToLeague(league.id, (nextLeague) => {
      if (nextLeague) {
        seenLeagueIds.push(nextLeague.id);
      }
    });

    expect(seenLeagueIds).toEqual([league.id]);
    expect(() => unsubscribe()).not.toThrow();
  });

  it("updates a local GM depth chart through the repository interface", async () => {
    const storage = new MemoryStorage();
    const repository = new LocalOnlineLeagueRepository(storage);

    setUser(storage, "user-a", "Coach_A");
    const league = await repository.createLeague({ name: "Depth Repo League" });
    const joined = await repository.joinLeague(league.id, BERLIN_WOLVES);
    const entry = joined.league.users[0]?.depthChart?.[0];

    const updated = await repository.updateDepthChart(
      league.id,
      entry ? [{ ...entry, updatedAt: "old" }] : [],
    );

    expect(updated?.users[0]?.depthChart?.[0]?.starterPlayerId).toBe(entry?.starterPlayerId);
    expect(updated?.users[0]?.depthChart?.[0]?.updatedAt).not.toBe("old");
  });

  it("blocks stale ready writes when the local league has advanced", async () => {
    const storage = new MemoryStorage();
    const repository = new LocalOnlineLeagueRepository(storage);

    setUser(storage, "user-a", "Coach_A");
    const league = await repository.createLeague({ name: "Ready Guard League" });
    await repository.joinLeague(league.id, BERLIN_WOLVES);

    await expect(repository.setUserReady(league.id, true, { season: 1, week: 2 })).rejects.toThrow(
      /weitergeschaltet/,
    );
  });

  it("sets and unsets ready through the local repository", async () => {
    const storage = new MemoryStorage();
    const repository = new LocalOnlineLeagueRepository(storage);

    setUser(storage, "user-a", "Coach_A");
    const league = await repository.createLeague({ name: "Ready Toggle League" });
    const joined = await repository.joinLeague(league.id, BERLIN_WOLVES);
    await markLocalLeagueWeekReady(storage, joined.league);

    const readyLeague = await repository.setUserReady(league.id, true, { season: 1, week: 1 });

    expect(readyLeague?.users[0]).toMatchObject({
      readyForWeek: true,
      readyAt: expect.any(String),
    });

    const unreadyLeague = await repository.setUserReady(league.id, false, { season: 1, week: 1 });

    expect(unreadyLeague?.users[0]?.readyForWeek).toBe(false);
    expect(unreadyLeague?.users[0]).not.toHaveProperty("readyAt");
  });

  it("keeps local player ready state after a reload", async () => {
    const storage = new MemoryStorage();
    const repository = new LocalOnlineLeagueRepository(storage);

    setUser(storage, "user-a", "Coach_A");
    const league = await repository.createLeague({ name: "Ready Reload League" });
    const joined = await repository.joinLeague(league.id, BERLIN_WOLVES);
    await markLocalLeagueWeekReady(storage, joined.league);

    await repository.setUserReady(league.id, true, { season: 1, week: 1 });

    const reloadedLeague = await repository.getLeagueById(league.id);

    expect(reloadedLeague?.users.find((user) => user.userId === "user-a")).toMatchObject({
      readyForWeek: true,
      readyAt: expect.any(String),
    });
  });

  it("blocks a different local user from setting another team ready", async () => {
    const storage = new MemoryStorage();
    const repository = new LocalOnlineLeagueRepository(storage);

    setUser(storage, "user-a", "Coach_A");
    const league = await repository.createLeague({ name: "Ready Ownership League" });
    const joined = await repository.joinLeague(league.id, BERLIN_WOLVES);
    await markLocalLeagueWeekReady(storage, joined.league);
    setUser(storage, "user-b", "Coach_B");

    await expect(repository.setUserReady(league.id, true, { season: 1, week: 1 })).rejects.toThrow(
      /Kein Manager-Team verbunden/,
    );
    expect(getOnlineLeagueById(league.id, storage)?.users[0]?.readyForWeek).toBe(false);
  });

  it("blocks local ready writes when the current user has no team", async () => {
    const storage = new MemoryStorage();
    const repository = new LocalOnlineLeagueRepository(storage);

    setUser(storage, "user-a", "Coach_A");
    const league = await repository.createLeague({ name: "Ready No Team League" });
    const joined = await repository.joinLeague(league.id, BERLIN_WOLVES);
    await markLocalLeagueWeekReady(storage, joined.league, {
      users: joined.league.users.map((user) =>
        user.userId === "user-a" ? { ...user, teamId: "", teamName: "" } : user,
      ),
    });

    await expect(repository.setUserReady(league.id, true, { season: 1, week: 1 })).rejects.toThrow(
      /Kein Manager-Team verbunden/,
    );
  });

  it("blocks local ready writes when a schedule exists but the current week has no games", async () => {
    const storage = new MemoryStorage();
    const repository = new LocalOnlineLeagueRepository(storage);

    setUser(storage, "user-a", "Coach_A");
    const league = await repository.createLeague({ name: "Ready Empty Week League" });
    const joined = await repository.joinLeague(league.id, BERLIN_WOLVES);
    await markLocalLeagueWeekReady(storage, joined.league, {
      schedule: [
        {
          awayTeamName: "Berlin Wolves",
          homeTeamName: "Berlin Wolves",
          id: "ready-empty-week-league-week-2",
          week: 2,
        },
      ],
    });

    await expect(repository.setUserReady(league.id, true, { season: 1, week: 1 })).rejects.toThrow(
      /kein gültiger Schedule/,
    );
  });

  it("blocks ready writes during local simulation", async () => {
    const storage = new MemoryStorage();
    const repository = new LocalOnlineLeagueRepository(storage);

    setUser(storage, "user-a", "Coach_A");
    const league = await repository.createLeague({ name: "Ready Simulation Lock League" });
    const joined = await repository.joinLeague(league.id, BERLIN_WOLVES);
    await markLocalLeagueWeekReady(storage, joined.league, { weekStatus: "simulating" });

    await expect(repository.setUserReady(league.id, true, { season: 1, week: 1 })).rejects.toThrow(
      /während der Simulation/,
    );
  });

  it("blocks ready writes for a completed current week", async () => {
    const storage = new MemoryStorage();
    const repository = new LocalOnlineLeagueRepository(storage);

    setUser(storage, "user-a", "Coach_A");
    const league = await repository.createLeague({ name: "Ready Completed League" });
    const joined = await repository.joinLeague(league.id, BERLIN_WOLVES);
    await markLocalLeagueWeekReady(storage, joined.league, {
      completedWeeks: [
        {
          completedAt: "2026-05-01T10:00:00.000Z",
          nextSeason: 1,
          nextWeek: 2,
          resultMatchIds: [],
          season: 1,
          simulatedByUserId: "admin",
          status: "completed",
          week: 1,
          weekKey: "s1-w1",
        },
      ],
      weekStatus: "completed",
    });

    await expect(repository.setUserReady(league.id, true, { season: 1, week: 1 })).rejects.toThrow(
      /bereits abgeschlossen/,
    );
  });

  it("recognizes active Firestore week simulation locks for ready guards", () => {
    expect(isFirestoreWeekSimulationLockActive({ status: "simulating" })).toBe(true);
    expect(isFirestoreWeekSimulationLockActive({ status: "simulated" })).toBe(false);
    expect(isFirestoreWeekSimulationLockActive({ status: "failed" })).toBe(false);
    expect(isFirestoreWeekSimulationLockActive(null)).toBe(false);
  });

  it("maps Firestore backbone documents to the existing OnlineLeague UI model", () => {
    const snapshot: FirestoreOnlineLeagueSnapshot = {
      league: {
        id: "league-alpha",
        name: "Alpha Online",
        status: "lobby",
        createdByUserId: "admin",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        maxTeams: 16,
        memberCount: 1,
        currentWeek: 1,
        currentSeason: 1,
        settings: {
          onlineBackbone: true,
        },
        version: 1,
      },
      memberships: [
        {
          userId: "admin",
          username: "Admin",
          displayName: "Admin",
          role: "admin",
          teamId: "",
          joinedAt: "2026-01-01T00:00:00.000Z",
          lastSeenAt: "2026-01-01T00:00:00.000Z",
          ready: false,
          status: "active",
        },
        {
          userId: "gm-a",
          username: "Coach_A",
          displayName: "Coach_A",
          role: "gm",
          teamId: "berlin-wolves",
          joinedAt: "2026-01-01T00:01:00.000Z",
          lastSeenAt: "2026-01-01T00:01:00.000Z",
          ready: true,
          status: "active",
        },
      ],
      teams: [
        {
          id: "berlin-wolves",
          cityId: "berlin",
          cityName: "Berlin",
          teamNameId: "wolves",
          teamName: "Wolves",
          displayName: "Berlin Wolves",
          assignedUserId: "gm-a",
          status: "assigned",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:01:00.000Z",
        },
      ],
    };

    const league = mapFirestoreSnapshotToOnlineLeague(snapshot);

    expect(league.status).toBe("waiting");
    expect(league.users).toHaveLength(1);
    expect(league.users[0]).toMatchObject({
      userId: "gm-a",
      teamDisplayName: "Berlin Wolves",
      readyForWeek: true,
    });
    expect(league.teams[0]).toMatchObject({
      id: "berlin-wolves",
      assignedUserId: "gm-a",
      assignmentStatus: "assigned",
    });
  });

  it("keeps canonical team, week, results and standings stable across a fresh Firestore reload", () => {
    const simulatedAt = "2026-05-01T12:00:00.000Z";
    const snapshot: FirestoreOnlineLeagueSnapshot = {
      league: firestoreLeagueDoc({
        id: "league-reload",
        name: "Reload Stability",
        status: "active",
        currentSeason: 1,
        currentWeek: 2,
        weekStatus: "pre_week",
        schedule: [
          {
            id: "league-reload-s1-w2-team-a-team-b",
            week: 2,
            homeTeamName: "Team A",
            awayTeamName: "Team B",
          },
        ],
        matchResults: [
          {
            matchId: "league-reload-s1-w1-team-a-team-b",
            season: 1,
            week: 1,
            homeTeamId: "team-a",
            awayTeamId: "team-b",
            homeTeamName: "Team A",
            awayTeamName: "Team B",
            homeScore: 24,
            awayScore: 17,
            homeStats: {
              firstDowns: 22,
              passingYards: 240,
              rushingYards: 120,
              totalYards: 360,
              turnovers: 1,
            },
            awayStats: {
              firstDowns: 18,
              passingYards: 210,
              rushingYards: 95,
              totalYards: 305,
              turnovers: 2,
            },
            winnerTeamId: "team-a",
            winnerTeamName: "Team A",
            loserTeamId: "team-b",
            loserTeamName: "Team B",
            tiebreakerApplied: false,
            simulatedAt,
            simulatedByUserId: "admin-user",
            status: "completed",
            createdAt: simulatedAt,
          },
        ],
        completedWeeks: [
          {
            weekKey: "s1-w1",
            season: 1,
            week: 1,
            status: "completed",
            resultMatchIds: ["league-reload-s1-w1-team-a-team-b"],
            completedAt: simulatedAt,
            simulatedByUserId: "admin-user",
            nextSeason: 1,
            nextWeek: 2,
          },
        ],
        standings: [
          {
            teamId: "team-a",
            gamesPlayed: 1,
            wins: 1,
            losses: 0,
            ties: 0,
            pointsFor: 24,
            pointsAgainst: 17,
            pointDifferential: 7,
            streak: "W1",
            updatedAt: simulatedAt,
          },
          {
            teamId: "team-b",
            gamesPlayed: 1,
            wins: 0,
            losses: 1,
            ties: 0,
            pointsFor: 17,
            pointsAgainst: 24,
            pointDifferential: -7,
            streak: "L1",
            updatedAt: simulatedAt,
          },
        ],
        lastSimulatedWeekKey: "s1-w1",
      }),
      memberships: [
        firestoreMembership({
          userId: "gm-a",
          username: "Coach A",
          displayName: "Coach A",
          teamId: "team-a",
          ready: false,
        }),
        firestoreMembership({
          userId: "gm-b",
          username: "Coach B",
          displayName: "Coach B",
          teamId: "team-b",
          ready: false,
        }),
      ],
      teams: [
        firestoreTeam("team-a", {
          teamName: "Team A",
          displayName: "Team A",
          assignedUserId: "gm-a",
          status: "assigned",
        }),
        firestoreTeam("team-b", {
          teamName: "Team B",
          displayName: "Team B",
          assignedUserId: "gm-b",
          status: "assigned",
        }),
      ],
    };

    const firstLoad = mapFirestoreSnapshotToOnlineLeague(snapshot);
    const reloadedSnapshot = JSON.parse(JSON.stringify(snapshot)) as FirestoreOnlineLeagueSnapshot;
    const reloaded = mapFirestoreSnapshotToOnlineLeague(reloadedSnapshot);

    expect(firstLoad.users.find((user) => user.userId === "gm-a")?.teamId).toBe("team-a");
    expect(reloaded.users.find((user) => user.userId === "gm-a")).toMatchObject({
      teamId: "team-a",
      teamDisplayName: "Team A",
      readyForWeek: false,
    });
    expect(reloaded.currentSeason).toBe(1);
    expect(reloaded.currentWeek).toBe(2);
    expect(reloaded.weekStatus).toBe("pre_week");
    expect(reloaded.lastSimulatedWeekKey).toBe("s1-w1");
    expect(reloaded.matchResults).toEqual(firstLoad.matchResults);
    expect(reloaded.matchResults).toHaveLength(1);
    expect(reloaded.standings).toEqual(firstLoad.standings);
    expect(reloaded.standings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          teamId: "team-a",
          gamesPlayed: 1,
          wins: 1,
          pointDifferential: 7,
        }),
      ]),
    );
  });

  it("maps split Firestore draft subcollections without reading the legacy league blob", () => {
    const snapshot: FirestoreOnlineLeagueSnapshot = {
      league: {
        id: "league-draft",
        name: "Split Draft",
        status: "lobby",
        createdByUserId: "admin",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        maxTeams: 16,
        memberCount: 1,
        currentWeek: 1,
        currentSeason: 1,
        settings: {
          onlineBackbone: true,
          fantasyDraft: {
            leagueId: "legacy",
            status: "completed",
            round: 99,
            pickNumber: 99,
            currentTeamId: "",
            draftOrder: [],
            picks: [],
            availablePlayerIds: [],
            startedAt: null,
            completedAt: "legacy",
          },
        },
        version: 1,
      },
      memberships: [],
      teams: [],
      draftState: {
        leagueId: "league-draft",
        status: "active",
        round: 1,
        pickNumber: 2,
        currentTeamId: "team-b",
        draftOrder: ["team-a", "team-b"],
        startedAt: "2026-01-01T00:05:00.000Z",
        completedAt: null,
        draftRunId: "run-1",
      },
      draftPicks: [
        {
          pickNumber: 1,
          round: 1,
          teamId: "team-a",
          playerId: DRAFT_PLAYER.playerId,
          pickedByUserId: "gm-a",
          timestamp: "2026-01-01T00:06:00.000Z",
          draftRunId: "run-1",
          playerSnapshot: DRAFT_PLAYER,
        },
        {
          pickNumber: 1,
          round: 1,
          teamId: "old-team",
          playerId: "stale-player",
          pickedByUserId: "gm-old",
          timestamp: "2026-01-01T00:01:00.000Z",
          draftRunId: "old-run",
        },
      ],
      draftAvailablePlayers: [
        {
          ...DRAFT_PLAYER,
          playerId: "player-wr-1",
          playerName: "Available Receiver",
          position: "WR",
          displayName: "Available Receiver",
          draftRunId: "run-1",
        },
      ],
    };

    const league = mapFirestoreSnapshotToOnlineLeague(snapshot);

    expect(league.fantasyDraft).toMatchObject({
      leagueId: "league-draft",
      status: "active",
      round: 1,
      pickNumber: 2,
      currentTeamId: "team-b",
      availablePlayerIds: ["player-wr-1"],
    });
    expect(league.fantasyDraft?.picks).toHaveLength(1);
    expect(league.fantasyDraft?.picks[0]?.playerId).toBe(DRAFT_PLAYER.playerId);
    expect(league.fantasyDraftPlayerPool?.map((player) => player.playerId).sort()).toEqual([
      "player-qb-1",
      "player-wr-1",
    ]);
  });

  it("hard-fails when pick docs contradict the draft doc cursor", () => {
    const snapshot: FirestoreOnlineLeagueSnapshot = {
      league: firestoreLeagueDoc({ id: "league-draft-cursor" }),
      memberships: [],
      teams: [],
      draftState: {
        leagueId: "league-draft-cursor",
        status: "active",
        round: 1,
        pickNumber: 1,
        currentTeamId: "team-a",
        draftOrder: ["team-a", "team-b"],
        startedAt: "2026-01-01T00:05:00.000Z",
        completedAt: null,
        draftRunId: "run-1",
      },
      draftPicks: [
        {
          pickNumber: 1,
          round: 1,
          teamId: "team-a",
          playerId: DRAFT_PLAYER.playerId,
          pickedByUserId: "gm-a",
          timestamp: "2026-01-01T00:06:00.000Z",
          draftRunId: "run-1",
          playerSnapshot: DRAFT_PLAYER,
        },
      ],
      draftAvailablePlayers: [
        {
          ...draftPlayer({ playerId: "player-wr-1", playerName: "Available Receiver" }),
          displayName: "Available Receiver",
          draftRunId: "run-1",
        },
      ],
    };
    const league = mapFirestoreSnapshotToOnlineLeague(snapshot);
    const integrity = validateMultiplayerDraftStateIntegrity(league.fantasyDraft!);

    expect(integrity.ok).toBe(false);
    expect(integrity.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "active-pick-cursor-mismatch",
        "active-current-team-mismatch",
      ]),
    );
  });

  it("hard-fails when an available-player doc still contains an already picked player", () => {
    const snapshot: FirestoreOnlineLeagueSnapshot = {
      league: firestoreLeagueDoc({ id: "league-draft-duplicate-availability" }),
      memberships: [],
      teams: [],
      draftState: {
        leagueId: "league-draft-duplicate-availability",
        status: "active",
        round: 1,
        pickNumber: 2,
        currentTeamId: "team-b",
        draftOrder: ["team-a", "team-b"],
        startedAt: "2026-01-01T00:05:00.000Z",
        completedAt: null,
        draftRunId: "run-1",
      },
      draftPicks: [
        {
          pickNumber: 1,
          round: 1,
          teamId: "team-a",
          playerId: DRAFT_PLAYER.playerId,
          pickedByUserId: "gm-a",
          timestamp: "2026-01-01T00:06:00.000Z",
          draftRunId: "run-1",
          playerSnapshot: DRAFT_PLAYER,
        },
      ],
      draftAvailablePlayers: [
        {
          ...DRAFT_PLAYER,
          displayName: DRAFT_PLAYER.playerName,
          draftRunId: "run-1",
        },
      ],
    };
    const league = mapFirestoreSnapshotToOnlineLeague(snapshot);
    const integrity = validateMultiplayerDraftStateIntegrity(league.fantasyDraft!);

    expect(integrity.ok).toBe(false);
    expect(integrity.issues.map((issue) => issue.code)).toContain(
      "picked-player-still-available",
    );
  });

  it("hard-fails when a player is missing from availability without a pick doc", () => {
    const snapshot: FirestoreOnlineLeagueSnapshot = {
      league: firestoreLeagueDoc({ id: "league-draft-missing-available" }),
      memberships: [],
      teams: [],
      draftState: {
        leagueId: "league-draft-missing-available",
        status: "active",
        round: 1,
        pickNumber: 1,
        currentTeamId: "team-a",
        draftOrder: ["team-a", "team-b"],
        startedAt: "2026-01-01T00:05:00.000Z",
        completedAt: null,
        draftRunId: "run-1",
      },
      draftPicks: [],
      draftAvailablePlayers: [
        {
          ...DRAFT_PLAYER,
          displayName: DRAFT_PLAYER.playerName,
          draftRunId: "run-1",
        },
      ],
    };
    const league = mapFirestoreSnapshotToOnlineLeague(snapshot);
    const fullSeedPool = [
      DRAFT_PLAYER,
      draftPlayer({ playerId: "player-wr-1", playerName: "Missing Receiver" }),
    ];
    const sourceConsistency = validateMultiplayerDraftSourceConsistency({
      state: league.fantasyDraft!,
      playerPool: fullSeedPool,
    });

    expect(sourceConsistency.ok).toBe(false);
    expect(sourceConsistency.issues.map((issue) => issue.code)).toContain(
      "pool-player-missing-from-availability",
    );
  });

  it("hard-fails completed draft docs when canonical pick docs are missing", () => {
    const snapshot: FirestoreOnlineLeagueSnapshot = {
      league: firestoreLeagueDoc({ id: "league-draft-completed-missing-picks" }),
      memberships: [],
      teams: [],
      draftState: {
        leagueId: "league-draft-completed-missing-picks",
        status: "completed",
        round: 1,
        pickNumber: 2,
        currentTeamId: "",
        draftOrder: ["team-a", "team-b"],
        startedAt: "2026-01-01T00:05:00.000Z",
        completedAt: "2026-01-01T00:30:00.000Z",
        draftRunId: "run-1",
      },
      draftPicks: [],
      draftAvailablePlayers: [],
    };
    const league = mapFirestoreSnapshotToOnlineLeague(snapshot);
    const integrity = validateMultiplayerDraftStateIntegrity(league.fantasyDraft!, {
      expectedPickCount: 2,
    });

    expect(integrity.ok).toBe(false);
    expect(integrity.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["completed-picks-missing", "completed-pick-cursor-mismatch"]),
    );
  });

  it("hard-fails finalized draft docs that still expose an open current pick", () => {
    const snapshot: FirestoreOnlineLeagueSnapshot = {
      league: firestoreLeagueDoc({ id: "league-draft-finalized-open-cursor" }),
      memberships: [],
      teams: [],
      draftState: {
        leagueId: "league-draft-finalized-open-cursor",
        status: "completed",
        round: 2,
        pickNumber: 3,
        currentTeamId: "",
        draftOrder: ["team-a", "team-b"],
        startedAt: "2026-01-01T00:05:00.000Z",
        completedAt: "2026-01-01T00:30:00.000Z",
        draftRunId: "run-1",
      },
      draftPicks: [
        {
          pickNumber: 1,
          round: 1,
          teamId: "team-a",
          playerId: DRAFT_PLAYER.playerId,
          pickedByUserId: "gm-a",
          timestamp: "2026-01-01T00:06:00.000Z",
          draftRunId: "run-1",
          playerSnapshot: DRAFT_PLAYER,
        },
        {
          pickNumber: 2,
          round: 1,
          teamId: "team-b",
          playerId: "player-wr-1",
          pickedByUserId: "gm-b",
          timestamp: "2026-01-01T00:07:00.000Z",
          draftRunId: "run-1",
          playerSnapshot: draftPlayer({
            playerId: "player-wr-1",
            playerName: "Picked Receiver",
          }),
        },
      ],
      draftAvailablePlayers: [],
    };
    const league = mapFirestoreSnapshotToOnlineLeague(snapshot);
    const integrity = validateMultiplayerDraftStateIntegrity(league.fantasyDraft!, {
      expectedPickCount: 2,
    });

    expect(integrity.ok).toBe(false);
    expect(integrity.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "completed-pick-cursor-mismatch",
        "completed-round-mismatch",
      ]),
    );
  });

  it("hard-fails when the legacy draft blob contradicts canonical pick docs", () => {
    const snapshot: FirestoreOnlineLeagueSnapshot = {
      league: firestoreLeagueDoc({
        id: "league-draft-legacy-conflict",
        settings: {
          fantasyDraft: {
            leagueId: "league-draft-legacy-conflict",
            status: "active",
            round: 1,
            pickNumber: 1,
            currentTeamId: "team-a",
            draftOrder: ["team-a", "team-b"],
            picks: [],
            availablePlayerIds: [DRAFT_PLAYER.playerId, "player-wr-1"],
            startedAt: "2026-01-01T00:05:00.000Z",
            completedAt: null,
          },
        },
      }),
      memberships: [],
      teams: [],
      draftState: {
        leagueId: "league-draft-legacy-conflict",
        status: "active",
        round: 1,
        pickNumber: 2,
        currentTeamId: "team-b",
        draftOrder: ["team-a", "team-b"],
        startedAt: "2026-01-01T00:05:00.000Z",
        completedAt: null,
        draftRunId: "run-1",
      },
      draftPicks: [
        {
          pickNumber: 1,
          round: 1,
          teamId: "team-a",
          playerId: DRAFT_PLAYER.playerId,
          pickedByUserId: "gm-a",
          timestamp: "2026-01-01T00:06:00.000Z",
          draftRunId: "run-1",
          playerSnapshot: DRAFT_PLAYER,
        },
      ],
      draftAvailablePlayers: [
        {
          ...draftPlayer({ playerId: "player-wr-1", playerName: "Available Receiver" }),
          displayName: "Available Receiver",
          draftRunId: "run-1",
        },
      ],
    };
    const league = mapFirestoreSnapshotToOnlineLeague(snapshot);
    const sourceConsistency = validateMultiplayerDraftSourceConsistency({
      state: league.fantasyDraft!,
      playerPool: league.fantasyDraftPlayerPool,
      legacyState: readFirestoreFantasyDraftState(snapshot.league),
    });

    expect(sourceConsistency.ok).toBe(false);
    expect(sourceConsistency.issues.map((issue) => issue.code)).toContain(
      "legacy-draft-state-conflict",
    );
  });

  it("does not read legacy draft blobs by default", () => {
    const snapshot: FirestoreOnlineLeagueSnapshot = {
      league: {
        id: "league-legacy-draft",
        name: "Legacy Draft",
        status: "lobby",
        createdByUserId: "admin",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        maxTeams: 16,
        memberCount: 1,
        currentWeek: 1,
        currentSeason: 1,
        settings: {
          onlineBackbone: true,
          fantasyDraft: {
            leagueId: "league-legacy-draft",
            status: "not_started",
            round: 1,
            pickNumber: 1,
            currentTeamId: "",
            draftOrder: [],
            picks: [],
            availablePlayerIds: [DRAFT_PLAYER.playerId],
            startedAt: null,
            completedAt: null,
          },
          fantasyDraftPlayerPool: [DRAFT_PLAYER],
        },
        version: 1,
      },
      memberships: [],
      teams: [],
    };

    const league = mapFirestoreSnapshotToOnlineLeague(snapshot);

    expect(league.fantasyDraft).toBeUndefined();
    expect(league.fantasyDraftPlayerPool).toBeUndefined();
  });

  it("keeps legacy draft blobs readable only in explicit migration compatibility mode", () => {
    const snapshot: FirestoreOnlineLeagueSnapshot = {
      league: {
        id: "league-legacy-draft",
        name: "Legacy Draft",
        status: "lobby",
        createdByUserId: "admin",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        maxTeams: 16,
        memberCount: 1,
        currentWeek: 1,
        currentSeason: 1,
        settings: {
          onlineBackbone: true,
          fantasyDraft: {
            leagueId: "league-legacy-draft",
            status: "not_started",
            round: 1,
            pickNumber: 1,
            currentTeamId: "",
            draftOrder: [],
            picks: [],
            availablePlayerIds: [DRAFT_PLAYER.playerId],
            startedAt: null,
            completedAt: null,
          },
          fantasyDraftPlayerPool: [DRAFT_PLAYER],
        },
        version: 1,
      },
      memberships: [],
      teams: [],
    };

    const league = mapFirestoreSnapshotToOnlineLeague(snapshot, {
      allowLegacyDraftFallback: true,
    });

    expect(league.fantasyDraft?.availablePlayerIds).toEqual([DRAFT_PLAYER.playerId]);
    expect(league.fantasyDraftPlayerPool).toEqual([DRAFT_PLAYER]);
  });

  it("enforces role guards for member and admin operations", () => {
    const memberships = [
      {
        userId: "admin",
        username: "Admin",
        displayName: "Admin",
        role: "admin" as const,
        teamId: "",
        joinedAt: "2026-01-01T00:00:00.000Z",
        lastSeenAt: "2026-01-01T00:00:00.000Z",
        ready: false,
        status: "active" as const,
      },
      {
        userId: "gm",
        username: "GM",
        displayName: "GM",
        role: "gm" as const,
        teamId: "team-a",
        joinedAt: "2026-01-01T00:00:00.000Z",
        lastSeenAt: "2026-01-01T00:00:00.000Z",
        ready: false,
        status: "active" as const,
      },
    ];

    expect(assertActiveMembership("gm", "league-alpha", memberships).teamId).toBe("team-a");
    expect(assertLeagueAdmin("admin", "league-alpha", memberships)?.role).toBe("admin");
    expect(() => assertLeagueAdmin("gm", "league-alpha", memberships)).toThrow(
      "not an admin",
    );
  });

  it("allows Firebase league loading from active membership while reporting projection conflicts", () => {
    const teams = [
      firestoreTeam("team-a", {
        assignedUserId: "firebase-user",
        status: "assigned",
      }),
    ];

    expect(canLoadOnlineLeagueFromMembership(firestoreMembership(), teams)).toBe(true);
    expect(canLoadOnlineLeagueFromMembership(firestoreMembership({ status: "inactive" }), teams)).toBe(false);
    expect(
      canLoadOnlineLeagueFromMembership(
        firestoreMembership({ teamId: "team-a" }),
        [firestoreTeam("team-a", { assignedUserId: "firebase-user", status: "available" })],
      ),
    ).toBe(true);
    expect(
      getMembershipProjectionProblem(
        firestoreMembership({ teamId: "team-a" }),
        [firestoreTeam("team-a", { assignedUserId: "firebase-user", status: "available" })],
      ),
    ).toBe("team-not-assigned:available");
    expect(
      canLoadOnlineLeagueFromMembership(
        firestoreMembership({ teamId: "team-a" }),
        [firestoreTeam("team-a", { assignedUserId: "firebase-user", status: "ai" })],
      ),
    ).toBe(true);
    expect(
      canLoadOnlineLeagueFromMembership(
        firestoreMembership({ userId: "outsider", teamId: "team-a" }),
        teams,
      ),
    ).toBe(true);
    expect(
      getMembershipProjectionProblem(
        firestoreMembership({ userId: "outsider", teamId: "team-a" }),
        teams,
      ),
    ).toBe("team-user-mismatch:team-a");
    expect(canLoadOnlineLeagueFromMembership(firestoreMembership({ role: "admin", teamId: "" }), [])).toBe(true);
    expect(canLoadOnlineLeagueFromMembership(null, teams)).toBe(false);
  });

  it("treats membership as canonical and refuses to reconstruct it from the mirror", () => {
    const user = {
      userId: "firebase-user",
      username: "Solothurn GM",
      displayName: "Solothurn GM",
    };
    const teams = [
      firestoreTeam("solothurn-guardians", {
        assignedUserId: "firebase-user",
        status: "assigned",
      }),
    ];
    const membership = resolveFirestoreMembershipForUser(
      null,
      firestoreLeagueMemberMirror({
        id: "afbm-multiplayer-test-league_firebase-user",
        leagueId: "afbm-multiplayer-test-league",
        teamId: "solothurn-guardians",
      }),
      teams,
      user,
      "afbm-multiplayer-test-league",
    );

    expect(membership).toBeNull();
  });

  it("uses canonical memberships as discovery candidates when the global mirror is missing", () => {
    expect(
      resolveLeagueDiscoveryCandidateIds({
        canonicalMembershipLeagueIds: ["league-alpha"],
        mirroredLeagueIds: [],
      }),
    ).toEqual(["league-alpha"]);
  });

  it("keeps mirror-only discovery candidates provisional until membership validation removes them", () => {
    expect(
      resolveLeagueDiscoveryCandidateIds({
        canonicalMembershipLeagueIds: [],
        mirroredLeagueIds: ["league-alpha"],
      }),
    ).toEqual(["league-alpha"]);
    expect(resolveFirestoreMembershipForUser(null, firestoreLeagueMemberMirror(), [], {
      userId: "firebase-user",
      username: "Firebase User",
      displayName: "Firebase User",
    }, "league-alpha")).toBeNull();
  });

  it("dedupes contradictory membership and mirror discovery candidates without trusting the mirror team", () => {
    const user = {
      userId: "firebase-user",
      username: "Firebase User",
      displayName: "Firebase User",
    };
    const membership = firestoreMembership({ teamId: "team-a" });
    const staleMirror = firestoreLeagueMemberMirror({ teamId: "team-b" });

    expect(
      resolveLeagueDiscoveryCandidateIds({
        canonicalMembershipLeagueIds: ["league-alpha"],
        mirroredLeagueIds: ["league-alpha", "league-beta"],
      }),
    ).toEqual(["league-alpha", "league-beta"]);
    expect(resolveFirestoreMembershipForUser(membership, staleMirror, [], user, "league-alpha")).toBe(
      membership,
    );
    expect(
      getMembershipProjectionProblem(
        membership,
        [firestoreTeam("team-a", { assignedUserId: "firebase-user", status: "assigned" })],
        staleMirror,
        "league-alpha",
      ),
    ).toBe(
      "membership-mirror-team-mismatch:team-b",
    );
  });

  it("keeps active membership canonical when the assigned team projection belongs to another user", () => {
    const user = {
      userId: "firebase-user",
      username: "Firebase User",
      displayName: "Firebase User",
    };
    const teams = [
      firestoreTeam("team-a", {
        assignedUserId: "other-user",
        status: "assigned",
      }),
    ];

    const membership = firestoreMembership({ teamId: "team-a" });

    expect(
      resolveFirestoreMembershipForUser(membership, null, teams, user, "league-alpha"),
    ).toBe(membership);
    expect(getMembershipProjectionProblem(membership, teams, null, "league-alpha")).toBe(
      "team-user-mismatch:team-a",
    );
  });

  it("hard-fails membership reads when mirror or team projections conflict", () => {
    const teams = [
      firestoreTeam("team-a", {
        assignedUserId: "firebase-user",
        status: "assigned",
      }),
      firestoreTeam("team-b", {
        assignedUserId: "other-user",
        status: "assigned",
      }),
    ];
    const membership = firestoreMembership({ teamId: "team-a" });

    expect(getMembershipProjectionProblem(membership, teams, null, "league-alpha")).toBeNull();
    expect(
      getMembershipProjectionProblem(
        membership,
        teams,
        firestoreLeagueMemberMirror({ teamId: "team-b" }),
        "league-alpha",
      ),
    ).toBe("membership-mirror-team-mismatch:team-b");
    expect(
      getMembershipProjectionProblem(
        firestoreMembership({ teamId: "team-b" }),
        teams,
        null,
        "league-alpha",
      ),
    ).toBe("team-user-mismatch:team-b");
  });

  it("keeps active memberships in the online league read model even when team projection is stale", () => {
    const league = mapFirestoreSnapshotToOnlineLeague({
      league: firestoreLeagueDoc(),
      memberships: [
        firestoreMembership({ userId: "canonical-user", teamId: "team-a" }),
        firestoreMembership({ userId: "stale-user", teamId: "team-b" }),
      ],
      teams: [
        firestoreTeam("team-a", {
          assignedUserId: "canonical-user",
          status: "assigned",
        }),
        firestoreTeam("team-b", {
          assignedUserId: "other-user",
          status: "assigned",
        }),
      ],
    });

    expect(league.users.map((user) => user.userId)).toEqual(["canonical-user", "stale-user"]);
    expect(league.users.find((user) => user.userId === "stale-user")).toMatchObject({
      teamId: "team-b",
      teamName: "team-b",
    });
    expect(
      getMembershipProjectionProblem(
        firestoreMembership({ userId: "stale-user", teamId: "team-b" }),
        [
          firestoreTeam("team-b", {
            assignedUserId: "other-user",
            status: "assigned",
          }),
        ],
      ),
    ).toBe("team-user-mismatch:team-b");
  });

  it("uses active membership for team-control and fails clearly on projection conflicts", () => {
    const membership = firestoreMembership({ teamId: "team-a" });

    expect(
      assertTeamOwner(
        "firebase-user",
        "league-alpha",
        "team-a",
        [firestoreTeam("team-a", { assignedUserId: "firebase-user", status: "assigned" })],
        [membership],
      ).id,
    ).toBe("team-a");
    expect(() =>
      assertTeamOwner(
        "firebase-user",
        "league-alpha",
        "team-b",
        [firestoreTeam("team-b", { assignedUserId: "firebase-user", status: "assigned" })],
        [membership],
      ),
    ).toThrow("not assigned to team team-b by active membership");
    expect(() =>
      assertTeamOwner(
        "firebase-user",
        "league-alpha",
        "team-a",
        [firestoreTeam("team-a", { assignedUserId: "other-user", status: "assigned" })],
        [membership],
      ),
    ).toThrow("Membership projection conflict");
  });

  it("builds a canonical global member mirror from an active membership", () => {
    const membership = firestoreMembership({
      joinedAt: "2026-05-01T09:00:00.000Z",
      lastSeenAt: "2026-05-01T09:10:00.000Z",
    });
    const mirror = createLeagueMemberMirrorFromMembership(
      "league-alpha",
      firestoreLeagueDoc(),
      membership,
      "2026-05-01T09:11:00.000Z",
    );

    expect(mirror).toMatchObject({
      id: "league-alpha_firebase-user",
      leagueId: "league-alpha",
      leagueSlug: "league-alpha",
      userId: "firebase-user",
      role: "GM",
      status: "ACTIVE",
      teamId: "team-a",
      createdAt: "2026-05-01T09:00:00.000Z",
      updatedAt: "2026-05-01T09:11:00.000Z",
    });
    expect(isLeagueMemberMirrorAligned(mirror, "league-alpha", membership)).toBe(true);
  });

  it("detects stale global member mirrors before a safe repair", () => {
    const membership = firestoreMembership({ teamId: "team-a" });

    expect(
      isLeagueMemberMirrorAligned(
        firestoreLeagueMemberMirror({ teamId: "team-b" }),
        "league-alpha",
        membership,
      ),
    ).toBe(false);
    expect(
      isLeagueMemberMirrorAligned(
        firestoreLeagueMemberMirror({ userId: "other-user" }),
        "league-alpha",
        membership,
      ),
    ).toBe(false);
  });

  it("documents canonical membership consistency outcomes for team and mirror projections", () => {
    const membership = firestoreMembership({ teamId: "team-a" });
    const canonicalTeam = firestoreTeam("team-a", {
      assignedUserId: "firebase-user",
      status: "assigned",
    });
    const staleOwnerTeam = firestoreTeam("team-a", {
      assignedUserId: "old-user",
      status: "assigned",
    });
    const missingOwnerTeam = firestoreTeam("team-a", {
      assignedUserId: null,
      status: "assigned",
    });
    const staleMirror = firestoreLeagueMemberMirror({ teamId: "team-b" });
    const canonicalMirror = createLeagueMemberMirrorFromMembership(
      "league-alpha",
      firestoreLeagueDoc(),
      membership,
      "2026-05-01T09:15:00.000Z",
    );

    const cases = [
      {
        name: "Membership Team A, Team.assignedUserId old-user",
        mirror: null,
        problem: "team-user-mismatch:team-a",
        repair: "hard-fail",
        team: staleOwnerTeam,
      },
      {
        name: "Membership Team A, Mirror Team B",
        mirror: staleMirror,
        problem: "membership-mirror-team-mismatch:team-b",
        repair: "safe-repair-on-rejoin",
        team: canonicalTeam,
      },
      {
        name: "Mirror fehlt, Membership korrekt",
        mirror: null,
        problem: null,
        repair: "read-ok-mirror-created-on-rejoin",
        team: canonicalTeam,
      },
      {
        name: "Team.assignedUserId fehlt, Membership korrekt",
        mirror: null,
        problem: "team-user-mismatch:team-a",
        repair: "hard-fail",
        team: missingOwnerTeam,
      },
    ] as const;

    expect(
      cases.map((entry) => ({
        name: entry.name,
        problem: getMembershipProjectionProblem(
          membership,
          [entry.team],
          entry.mirror,
          "league-alpha",
        ),
        repair: entry.repair,
      })),
    ).toEqual([
      {
        name: "Membership Team A, Team.assignedUserId old-user",
        problem: "team-user-mismatch:team-a",
        repair: "hard-fail",
      },
      {
        name: "Membership Team A, Mirror Team B",
        problem: "membership-mirror-team-mismatch:team-b",
        repair: "safe-repair-on-rejoin",
      },
      {
        name: "Mirror fehlt, Membership korrekt",
        problem: null,
        repair: "read-ok-mirror-created-on-rejoin",
      },
      {
        name: "Team.assignedUserId fehlt, Membership korrekt",
        problem: "team-user-mismatch:team-a",
        repair: "hard-fail",
      },
    ]);
    expect(isMembershipTeamProjectionProblem("team-user-mismatch:team-a")).toBe(true);
    expect(isMembershipMirrorProjectionProblem("membership-mirror-team-mismatch:team-b")).toBe(true);
    expect(isLeagueMemberMirrorAligned(null, "league-alpha", membership)).toBe(false);
    expect(isLeagueMemberMirrorAligned(staleMirror, "league-alpha", membership)).toBe(false);
    expect(isLeagueMemberMirrorAligned(canonicalMirror, "league-alpha", membership)).toBe(true);
  });

  it("hard-fails stale team-control when assignedUserId still points to a previous manager", () => {
    const membership = firestoreMembership({ teamId: "team-a" });

    expect(() =>
      assertTeamOwner(
        "firebase-user",
        "league-alpha",
        "team-a",
        [firestoreTeam("team-a", { assignedUserId: "previous-manager", status: "assigned" })],
        [membership],
      ),
    ).toThrow("Membership projection conflict");
  });

  it("detects team projection without canonical membership as a hard recovery conflict", () => {
    expect(
      getTeamProjectionWithoutMembershipProblem(null, [
        firestoreTeam("team-a", {
          assignedUserId: "firebase-user",
          status: "assigned",
        }),
      ], "firebase-user"),
    ).toBe("missing-membership-for-team:team-a");
    expect(
      getTeamProjectionWithoutMembershipProblem(
        firestoreMembership(),
        [
          firestoreTeam("team-a", {
            assignedUserId: "firebase-user",
            status: "assigned",
          }),
        ],
        "firebase-user",
      ),
    ).toBeNull();
  });

  it("chooses the first free Firestore team and skips assigned teams", () => {
    const teams = [
      firestoreTeam("team-b", {
        assignedUserId: "user-b",
        status: "assigned",
        createdAt: "2026-05-01T09:00:00.000Z",
      }),
      firestoreTeam("team-c", {
        status: "available",
        createdAt: "2026-05-01T09:00:02.000Z",
      }),
      firestoreTeam("team-a", {
        status: "available",
        createdAt: "2026-05-01T09:00:01.000Z",
      }),
    ];

    expect(chooseFirstAvailableFirestoreTeam(teams)?.id).toBe("team-a");
    expect(
      chooseFirstAvailableFirestoreTeam(
        teams.map((team) => ({ ...team, status: "assigned" as const })),
      ),
    ).toBeNull();
  });

  it("selects the next free Firestore team after a transactional retry", () => {
    const teams = [
      firestoreTeam("team-b", {
        status: "available",
        createdAt: "2026-05-01T09:00:02.000Z",
      }),
      firestoreTeam("team-a", {
        status: "available",
        createdAt: "2026-05-01T09:00:01.000Z",
      }),
    ];
    const firstAssignment = chooseFirstAvailableFirestoreTeam(teams);
    const retriedTeams = teams.map((team) =>
      team.id === firstAssignment?.id
        ? { ...team, assignedUserId: "user-a", status: "assigned" as const }
        : team,
    );

    expect(firstAssignment?.id).toBe("team-a");
    expect(chooseFirstAvailableFirestoreTeam(retriedTeams)?.id).toBe("team-b");
  });

  it("prefers a free team whose identity already matches the requested join identity", () => {
    const teams = [
      firestoreTeam("team-a", {
        cityId: "aachen",
        createdAt: "2026-05-01T09:00:01.000Z",
        teamNameId: "skyline",
      }),
      firestoreTeam("team-b", {
        cityId: "aachen",
        createdAt: "2026-05-01T09:00:02.000Z",
        teamNameId: "harbor",
      }),
    ];

    expect(
      chooseAvailableFirestoreTeamForIdentity(teams, {
        cityId: "aachen",
        teamNameId: "harbor",
      })?.id,
    ).toBe("team-b");
    expect(
      chooseAvailableFirestoreTeamForIdentity(teams, {
        cityId: "bern",
        teamNameId: "skyline",
      })?.id,
    ).toBe("team-a");
  });
});
