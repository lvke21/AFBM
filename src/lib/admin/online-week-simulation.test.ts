import { describe, expect, it } from "vitest";

import type {
  FirestoreOnlineLeagueDoc,
  FirestoreOnlineMembershipDoc,
  FirestoreOnlineTeamDoc,
} from "@/lib/online/types";
import {
  assertCanStartOnlineLeagueWeekSimulation,
  getOnlineLeagueSimulationLockStatus,
  OnlineLeagueWeekSimulationError,
  prepareOnlineLeagueWeekSimulation,
} from "./online-week-simulation";

const NOW = "2026-01-01T12:00:00.000Z";

function league(overrides: Partial<FirestoreOnlineLeagueDoc> = {}): FirestoreOnlineLeagueDoc {
  return {
    completedWeeks: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    createdByUserId: "admin",
    currentSeason: 1,
    currentWeek: 1,
    id: "league-1",
    matchResults: [],
    maxTeams: 2,
    memberCount: 2,
    name: "Simulation League",
    schedule: [
      {
        awayTeamName: "basel",
        homeTeamName: "zurich",
        id: "game-1",
        week: 1,
      },
    ],
    settings: {},
    status: "active",
    updatedAt: "2026-01-01T00:00:00.000Z",
    version: 1,
    weekStatus: "ready",
    ...overrides,
  };
}

function team(id: string, displayName: string): FirestoreOnlineTeamDoc {
  return {
    assignedUserId: `${id}-gm`,
    createdAt: "2026-01-01T00:00:00.000Z",
    displayName,
    id,
    status: "assigned",
    teamName: displayName,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function membership(teamId: string): FirestoreOnlineMembershipDoc {
  return {
    displayName: `${teamId} GM`,
    joinedAt: "2026-01-01T00:00:00.000Z",
    lastSeenAt: "2026-01-01T00:00:00.000Z",
    ready: true,
    role: "gm",
    status: "active",
    teamId,
    userId: `${teamId}-gm`,
    username: `${teamId} GM`,
  };
}

const teams = [
  team("zurich", "Zurich Guardians"),
  team("basel", "Basel Rhinos"),
];
const memberships = [membership("zurich"), membership("basel")];
const fourTeams = [
  ...teams,
  team("bern", "Bern Wolves"),
  team("geneva", "Geneva Falcons"),
];
const fourMemberships = [
  ...memberships,
  membership("bern"),
  membership("geneva"),
];

describe("online week simulation preparation", () => {
  it("normalizes simulation lock states for idempotency guards", () => {
    expect(getOnlineLeagueSimulationLockStatus(null)).toBe("idle");
    expect(getOnlineLeagueSimulationLockStatus({ status: "completed" })).toBe("simulated");
    expect(getOnlineLeagueSimulationLockStatus({ status: "simulated" })).toBe("simulated");
    expect(getOnlineLeagueSimulationLockStatus({ status: "simulating" })).toBe("simulating");
    expect(getOnlineLeagueSimulationLockStatus({ status: "failed" })).toBe("failed");
  });

  it("blocks a second parallel simulation lock but allows retry after failed locks", () => {
    expect(() =>
      assertCanStartOnlineLeagueWeekSimulation({ status: "simulating" }),
    ).toThrow(/bereits simuliert/);
    expect(() =>
      assertCanStartOnlineLeagueWeekSimulation({ status: "simulated" }),
    ).toThrow(/bereits weitergeschaltet/);
    expect(() =>
      assertCanStartOnlineLeagueWeekSimulation({ status: "failed" }),
    ).not.toThrow();
  });

  it("prepares a successful server-side week simulation", () => {
    const prepared = prepareOnlineLeagueWeekSimulation({
      actorUserId: "admin-user",
      draftState: { completedAt: NOW, currentTeamId: "", draftOrder: [], leagueId: "league-1", pickNumber: 1, round: 1, startedAt: NOW, status: "completed" },
      expectedSeason: 1,
      expectedWeek: 1,
      league: league(),
      memberships,
      now: NOW,
      teams,
    });

    expect(prepared).toMatchObject({
      gamesSimulated: 1,
      leagueId: "league-1",
      nextSeason: 1,
      nextWeek: 2,
      simulatedSeason: 1,
      simulatedWeek: 1,
      updatedAt: NOW,
      weekKey: "s1-w1",
    });
    expect(prepared.results).toHaveLength(1);
    expect(prepared.results[0]).toMatchObject({
      gameId: "game-1",
      matchId: "game-1",
      simulatedAt: NOW,
      simulatedByUserId: "admin-user",
      status: "completed",
    });
  });

  it("blocks duplicate week simulation", () => {
    expect(() =>
      prepareOnlineLeagueWeekSimulation({
        actorUserId: "admin-user",
        expectedSeason: 1,
        expectedWeek: 1,
        league: league({
          matchResults: [
            {
              awayScore: 14,
              awayStats: { firstDowns: 10, passingYards: 120, rushingYards: 80, totalYards: 200, turnovers: 1 },
              awayTeamId: "basel",
              awayTeamName: "Basel Rhinos",
              createdAt: NOW,
              homeScore: 21,
              homeStats: { firstDowns: 12, passingYards: 140, rushingYards: 100, totalYards: 240, turnovers: 0 },
              homeTeamId: "zurich",
              homeTeamName: "Zurich Guardians",
              matchId: "game-1",
              season: 1,
              simulatedAt: NOW,
              simulatedByUserId: "admin-user",
              status: "completed",
              tiebreakerApplied: false,
              week: 1,
              winnerTeamId: "zurich",
              winnerTeamName: "Zurich Guardians",
            },
          ],
        }),
        memberships,
        now: NOW,
        teams,
      }),
    ).toThrow(OnlineLeagueWeekSimulationError);
  });

  it("blocks simulation while the league is marked as simulating", () => {
    expect(() =>
      prepareOnlineLeagueWeekSimulation({
        actorUserId: "admin-user",
        expectedSeason: 1,
        expectedWeek: 1,
        league: league({ weekStatus: "simulating" }),
        memberships,
        now: NOW,
        teams,
      }),
    ).toThrow(/bereits simuliert/);
  });

  it("blocks simulation when the current week has no schedule", () => {
    expect(() =>
      prepareOnlineLeagueWeekSimulation({
        actorUserId: "admin-user",
        league: league({ schedule: [] }),
        memberships,
        now: NOW,
        teams,
      }),
    ).toThrow(/kein gültiger Schedule/);
  });

  it("blocks simulation when a scheduled team is missing", () => {
    const before = league({
      schedule: [
        {
          awayTeamName: "missing",
          homeTeamName: "zurich",
          id: "broken-game",
          week: 1,
        },
      ],
    });

    expect(() =>
      prepareOnlineLeagueWeekSimulation({
        actorUserId: "admin-user",
        league: before,
        memberships,
        now: NOW,
        teams,
      }),
    ).toThrow(/fehlendes Team/);
    expect(before.currentWeek).toBe(1);
    expect(before.matchResults).toEqual([]);
  });

  it("updates standings from simulated results", () => {
    const prepared = prepareOnlineLeagueWeekSimulation({
      actorUserId: "admin-user",
      league: league(),
      memberships,
      now: NOW,
      teams,
    });
    const totalWins = prepared.standingsSummary.reduce((sum, record) => sum + record.wins, 0);
    const totalLosses = prepared.standingsSummary.reduce((sum, record) => sum + record.losses, 0);

    expect(prepared.standingsSummary).toHaveLength(2);
    expect(totalWins).toBe(1);
    expect(totalLosses).toBe(1);
    expect(prepared.standingsSummary[0]).toMatchObject({
      gamesPlayed: 1,
      updatedAt: NOW,
    });
    expect(
      prepared.standingsSummary.every(
        (record) => record.pointDifferential === record.pointsFor - record.pointsAgainst,
      ),
    ).toBe(true);
  });

  it("updates records for multiple games in the same week", () => {
    const prepared = prepareOnlineLeagueWeekSimulation({
      actorUserId: "admin-user",
      league: league({
        maxTeams: 4,
        memberCount: 4,
        schedule: [
          {
            awayTeamName: "basel",
            homeTeamName: "zurich",
            id: "game-1",
            week: 1,
          },
          {
            awayTeamName: "geneva",
            homeTeamName: "bern",
            id: "game-2",
            week: 1,
          },
        ],
      }),
      memberships: fourMemberships,
      now: NOW,
      teams: fourTeams,
    });

    expect(prepared.gamesSimulated).toBe(2);
    expect(prepared.standingsSummary).toHaveLength(4);
    expect(
      prepared.standingsSummary.reduce((sum, record) => sum + record.gamesPlayed, 0),
    ).toBe(4);
    expect(
      prepared.standingsSummary.reduce((sum, record) => sum + record.wins, 0),
    ).toBe(2);
    expect(
      prepared.standingsSummary.reduce((sum, record) => sum + record.losses, 0),
    ).toBe(2);
  });
});
