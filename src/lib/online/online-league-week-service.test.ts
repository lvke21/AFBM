import { describe, expect, it } from "vitest";

import {
  getOnlineLeagueReadyChangeState,
  getOnlineLeagueTeamReadinessState,
  getOnlineLeagueWeekReadyState,
} from "./online-league-week-service";
import type {
  OnlineContractPlayer,
  OnlineDepthChartEntry,
  OnlineLeague,
  OnlineLeagueUser,
} from "./online-league-types";

function player(overrides: Partial<OnlineContractPlayer> = {}): OnlineContractPlayer {
  return {
    age: 25,
    contract: {
      capHitPerYear: 1_000_000,
      contractType: "regular",
      deadCapPerYear: 250_000,
      guaranteedMoney: 250_000,
      salaryPerYear: 1_000_000,
      signingBonus: 100_000,
      totalValue: 2_000_000,
      yearsRemaining: 2,
    },
    developmentPath: "solid",
    developmentProgress: 0,
    overall: 72,
    playerId: "player-qb-1",
    playerName: "Test Starter",
    position: "QB",
    potential: 78,
    status: "active",
    xFactors: [],
    ...overrides,
  };
}

function depthChart(overrides: Partial<OnlineDepthChartEntry> = {}): OnlineDepthChartEntry {
  return {
    backupPlayerIds: [],
    position: "QB",
    starterPlayerId: "player-qb-1",
    updatedAt: "2026-05-02T10:00:00.000Z",
    ...overrides,
  };
}

function user(overrides: Partial<OnlineLeagueUser> = {}): OnlineLeagueUser {
  return {
    joinedAt: "2026-05-02T10:00:00.000Z",
    readyForWeek: false,
    teamId: "zurich-guardians",
    teamName: "Zurich Guardians",
    userId: "user-1",
    username: "Coach_1234",
    contractRoster: [player()],
    depthChart: [depthChart()],
    ...overrides,
  };
}

function league(overrides: Partial<OnlineLeague> = {}): OnlineLeague {
  return {
    currentSeason: 1,
    currentWeek: 1,
    id: "ready-validation-league",
    maxUsers: 8,
    name: "Ready Validation League",
    status: "active",
    teams: [
      {
        abbreviation: "ZUR",
        assignmentStatus: "assigned",
        assignedUserId: "user-1",
        id: "zurich-guardians",
        name: "Zurich Guardians",
      },
    ],
    users: [user()],
    weekStatus: "pre_week",
    ...overrides,
  };
}

describe("online league ready validation", () => {
  it("allows ready when the roster is playable and the depth chart is valid", () => {
    const testLeague = league();

    expect(getOnlineLeagueTeamReadinessState(testLeague, testLeague.users[0])).toEqual({
      ready: true,
    });
    expect(getOnlineLeagueReadyChangeState(testLeague, testLeague.users[0])).toMatchObject({
      allowed: true,
    });
  });

  it("allows a missing depth chart when a roster fallback is possible", () => {
    const testLeague = league({
      users: [user({ depthChart: [] })],
    });

    expect(getOnlineLeagueTeamReadinessState(testLeague, testLeague.users[0])).toEqual({
      ready: true,
    });
  });

  it("blocks ready and stale ready counts when the team has no roster", () => {
    const testLeague = league({
      users: [user({ contractRoster: [], depthChart: [], readyForWeek: true })],
    });

    expect(getOnlineLeagueReadyChangeState(testLeague, testLeague.users[0])).toMatchObject({
      allowed: false,
      reason: "Bereit gesperrt: Dein Team hat kein Roster.",
    });
    expect(getOnlineLeagueWeekReadyState(testLeague)).toMatchObject({
      allReady: false,
      readyCount: 0,
      requiredCount: 1,
    });
  });

  it("blocks ready when the roster has no playable active player", () => {
    const testLeague = league({
      users: [
        user({
          contractRoster: [player({ overall: 0 })],
          depthChart: [],
        }),
      ],
    });

    expect(getOnlineLeagueReadyChangeState(testLeague, testLeague.users[0])).toMatchObject({
      allowed: false,
      reason: "Bereit gesperrt: Dein Roster ist nicht simulationsfähig.",
    });
  });

  it("blocks ready when the stored depth chart references an invalid starter", () => {
    const testLeague = league({
      users: [
        user({
          depthChart: [depthChart({ starterPlayerId: "missing-player" })],
        }),
      ],
    });

    expect(getOnlineLeagueReadyChangeState(testLeague, testLeague.users[0])).toMatchObject({
      allowed: false,
      reason: "Bereit gesperrt: Depth Chart ist ungültig. Bitte prüfe Starter und Backups.",
    });
  });

  it("blocks ready when the manager has no assigned team id", () => {
    const testLeague = league({
      users: [user({ teamId: "" })],
    });

    expect(getOnlineLeagueReadyChangeState(testLeague, testLeague.users[0])).toMatchObject({
      allowed: false,
      reason: "Kein Manager-Team verbunden.",
    });
  });

  it("blocks ready while the draft is active", () => {
    const testLeague = league({
      fantasyDraft: {
        availablePlayerIds: ["player-qb-2"],
        currentTeamId: "zurich-guardians",
        draftOrder: ["zurich-guardians"],
        leagueId: "ready-validation-league",
        pickNumber: 1,
        picks: [],
        round: 1,
        status: "active",
        startedAt: "2026-05-02T10:00:00.000Z",
        completedAt: null,
      },
    });

    expect(getOnlineLeagueReadyChangeState(testLeague, testLeague.users[0])).toMatchObject({
      allowed: false,
      reason: "Bereit-Status ist während des Drafts gesperrt.",
    });
  });

  it("blocks ready while the current week is simulating", () => {
    const testLeague = league({ weekStatus: "simulating" });

    expect(getOnlineLeagueReadyChangeState(testLeague, testLeague.users[0])).toMatchObject({
      allowed: false,
      reason: "Bereit-Status ist während der Simulation gesperrt.",
    });
  });

  it("blocks ready when the current week is canonically completed", () => {
    const testLeague = league({
      completedWeeks: [
        {
          completedAt: "2026-05-02T11:00:00.000Z",
          nextSeason: 1,
          nextWeek: 2,
          resultMatchIds: [],
          season: 1,
          simulatedByUserId: "admin-1",
          status: "completed",
          week: 1,
          weekKey: "s1-w1",
        },
      ],
    });

    expect(getOnlineLeagueReadyChangeState(testLeague, testLeague.users[0])).toMatchObject({
      allowed: false,
      reason: "Diese Woche ist bereits abgeschlossen.",
    });
  });
});
