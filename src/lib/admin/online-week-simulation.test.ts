import { describe, expect, it } from "vitest";

import type {
  FirestoreOnlineLeagueDoc,
  FirestoreOnlineMembershipDoc,
  FirestoreOnlineTeamDoc,
} from "@/lib/online/types";
import type {
  OnlineMatchResult,
  OnlineContractPlayer,
  OnlineDepthChartEntry,
} from "@/lib/online/online-league-types";
import {
  assertCanCompleteOnlineLeagueWeekSimulation,
  assertCanStartOnlineLeagueWeekSimulation,
  getOnlineLeagueSimulationLockStatus,
  isOnlineLeagueWeekSimulationLockStale,
  ONLINE_LEAGUE_WEEK_SIMULATION_LOCK_TTL_MS,
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

function player(id: string): OnlineContractPlayer {
  return {
    age: 24,
    contract: {} as OnlineContractPlayer["contract"],
    developmentPath: "solid",
    developmentProgress: 0,
    overall: 75,
    playerId: `${id}-player`,
    playerName: `${id} Player`,
    position: "QB",
    potential: 78,
    status: "active",
    xFactors: [],
  };
}

function depthChart(id: string): OnlineDepthChartEntry {
  return {
    backupPlayerIds: [],
    position: "QB",
    starterPlayerId: `${id}-player`,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function team(
  id: string,
  displayName: string,
  overrides: Partial<FirestoreOnlineTeamDoc> = {},
): FirestoreOnlineTeamDoc {
  return {
    assignedUserId: `${id}-gm`,
    contractRoster: [player(id)],
    createdAt: "2026-01-01T00:00:00.000Z",
    depthChart: [depthChart(id)],
    displayName,
    id,
    status: "assigned",
    teamName: displayName,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
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

function matchResult(overrides: Partial<OnlineMatchResult> = {}): OnlineMatchResult {
  return {
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
    ...overrides,
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
      assertCanStartOnlineLeagueWeekSimulation(
        {
          status: "simulating",
          startedAt: "2026-01-01T11:59:30.000Z",
          updatedAt: "2026-01-01T11:59:30.000Z",
        },
        NOW,
      ),
    ).toThrow(/bereits simuliert/);
    expect(() =>
      assertCanStartOnlineLeagueWeekSimulation({ status: "simulated" }),
    ).toThrow(/bereits weitergeschaltet/);
    expect(() =>
      assertCanStartOnlineLeagueWeekSimulation({ status: "failed" }),
    ).not.toThrow();
  });

  it("recognizes stale simulating locks only when their timestamp exceeds the TTL", () => {
    const freshLock = {
      status: "simulating",
      simulationAttemptId: "fresh-attempt",
      startedAt: "2026-01-01T11:50:01.000Z",
      updatedAt: "2026-01-01T11:50:01.000Z",
    };
    const staleLock = {
      status: "simulating",
      simulationAttemptId: "stale-attempt",
      startedAt: "2026-01-01T11:44:59.000Z",
      updatedAt: "2026-01-01T11:44:59.000Z",
    };

    expect(isOnlineLeagueWeekSimulationLockStale(freshLock, NOW)).toBe(false);
    expect(isOnlineLeagueWeekSimulationLockStale(staleLock, NOW)).toBe(true);
    expect(
      isOnlineLeagueWeekSimulationLockStale(
        { status: "simulating", simulationAttemptId: "unknown-age" },
        NOW,
      ),
    ).toBe(false);
    expect(ONLINE_LEAGUE_WEEK_SIMULATION_LOCK_TTL_MS).toBe(15 * 60 * 1000);
  });

  it("allows a clearly stale simulating lock to be replaced but keeps completed locks closed", () => {
    expect(() =>
      assertCanStartOnlineLeagueWeekSimulation(
        {
          status: "simulating",
          simulationAttemptId: "stale-attempt",
          startedAt: "2026-01-01T11:00:00.000Z",
        },
        NOW,
      ),
    ).not.toThrow();
    expect(() =>
      assertCanStartOnlineLeagueWeekSimulation(
        {
          status: "simulated",
          simulationAttemptId: "finished-attempt",
          completedAt: "2026-01-01T11:59:00.000Z",
        },
        NOW,
      ),
    ).toThrow(/bereits weitergeschaltet/);
  });

  it("requires the same simulation attempt to complete a simulating lock", () => {
    expect(() =>
      assertCanCompleteOnlineLeagueWeekSimulation(
        { simulationAttemptId: "attempt-1", status: "simulating" },
        "attempt-1",
      ),
    ).not.toThrow();
    expect(() =>
      assertCanCompleteOnlineLeagueWeekSimulation(
        { simulationAttemptId: "attempt-2", status: "simulating" },
        "attempt-1",
      ),
    ).toThrow(/andere Week-Simulation/);
    expect(() =>
      assertCanCompleteOnlineLeagueWeekSimulation({ status: "simulated" }, "attempt-1"),
    ).toThrow(/bereits weitergeschaltet/);
    expect(() =>
      assertCanCompleteOnlineLeagueWeekSimulation({ status: "failed" }, "attempt-1"),
    ).toThrow(/andere Week-Simulation/);
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
      lastScheduledWeek: 1,
      leagueId: "league-1",
      nextSeason: 1,
      nextWeek: 2,
      seasonComplete: true,
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

  it("keeps the next week playable when later scheduled games exist", () => {
    const prepared = prepareOnlineLeagueWeekSimulation({
      actorUserId: "admin-user",
      draftState: { completedAt: NOW, currentTeamId: "", draftOrder: [], leagueId: "league-1", pickNumber: 1, round: 1, startedAt: NOW, status: "completed" },
      expectedSeason: 1,
      expectedWeek: 1,
      league: league({
        schedule: [
          {
            awayTeamName: "basel",
            homeTeamName: "zurich",
            id: "game-1",
            week: 1,
          },
          {
            awayTeamName: "basel",
            homeTeamName: "zurich",
            id: "game-2",
            week: 2,
          },
        ],
      }),
      memberships,
      now: NOW,
      teams,
    });

    expect(prepared).toMatchObject({
      lastScheduledWeek: 2,
      nextWeek: 2,
      seasonComplete: false,
      simulatedWeek: 1,
    });
  });

  it("blocks simulation after the last scheduled week with season_complete", () => {
    expect(() =>
      prepareOnlineLeagueWeekSimulation({
        actorUserId: "admin-user",
        draftState: { completedAt: NOW, currentTeamId: "", draftOrder: [], leagueId: "league-1", pickNumber: 1, round: 1, startedAt: NOW, status: "completed" },
        expectedSeason: 1,
        expectedWeek: 2,
        league: league({
          completedWeeks: [
            {
              completedAt: NOW,
              nextSeason: 1,
              nextWeek: 2,
              resultMatchIds: ["game-1"],
              season: 1,
              simulatedByUserId: "admin-user",
              status: "completed",
              week: 1,
              weekKey: "s1-w1",
            },
          ],
          currentWeek: 2,
          lastSimulatedWeekKey: "s1-w1",
          matchResults: [matchResult({ matchId: "game-1" })],
          weekStatus: "season_complete",
        }),
        memberships,
        now: NOW,
        teams,
      }),
    ).toThrow(OnlineLeagueWeekSimulationError);
    expect(() =>
      prepareOnlineLeagueWeekSimulation({
        actorUserId: "admin-user",
        draftState: { completedAt: NOW, currentTeamId: "", draftOrder: [], leagueId: "league-1", pickNumber: 1, round: 1, startedAt: NOW, status: "completed" },
        expectedSeason: 1,
        expectedWeek: 2,
        league: league({
          completedWeeks: [
            {
              completedAt: NOW,
              nextSeason: 1,
              nextWeek: 2,
              resultMatchIds: ["game-1"],
              season: 1,
              simulatedByUserId: "admin-user",
              status: "completed",
              week: 1,
              weekKey: "s1-w1",
            },
          ],
          currentWeek: 2,
          lastSimulatedWeekKey: "s1-w1",
          matchResults: [matchResult({ matchId: "game-1" })],
          weekStatus: "season_complete",
        }),
        memberships,
        now: NOW,
        teams,
      }),
    ).toThrow(/Saison ist abgeschlossen/);
  });

  it("allows the next week after prior completed results advanced the cursor", () => {
    const prepared = prepareOnlineLeagueWeekSimulation({
      actorUserId: "admin-user",
      draftState: { completedAt: NOW, currentTeamId: "", draftOrder: [], leagueId: "league-1", pickNumber: 1, round: 1, startedAt: NOW, status: "completed" },
      expectedSeason: 1,
      expectedWeek: 2,
      league: league({
        completedWeeks: [
          {
            completedAt: NOW,
            nextSeason: 1,
            nextWeek: 2,
            resultMatchIds: ["game-1"],
            season: 1,
            simulatedByUserId: "admin-user",
            status: "completed",
            week: 1,
            weekKey: "s1-w1",
          },
        ],
        currentWeek: 2,
        matchResults: [matchResult()],
        schedule: [
          {
            awayTeamName: "basel",
            homeTeamName: "zurich",
            id: "game-1",
            week: 1,
          },
          {
            awayTeamName: "basel",
            homeTeamName: "zurich",
            id: "game-2",
            week: 2,
          },
        ],
      }),
      memberships,
      now: NOW,
      teams,
    });

    expect(prepared).toMatchObject({
      gamesSimulated: 1,
      lastScheduledWeek: 2,
      nextWeek: 3,
      seasonComplete: true,
      simulatedWeek: 2,
      weekKey: "s1-w2",
    });
  });

  it("uses active memberships only so inactive stale memberships do not block simulation", () => {
    const staleVacantTeam: FirestoreOnlineTeamDoc = {
      ...team("stale", "Stale Placeholder"),
      assignedUserId: null,
      status: "vacant",
    };
    const staleMembership: FirestoreOnlineMembershipDoc = {
      ...membership("stale"),
      ready: false,
      status: "inactive",
      teamId: "stale",
    };

    const prepared = prepareOnlineLeagueWeekSimulation({
      actorUserId: "admin-user",
      league: league(),
      memberships: [...memberships, staleMembership],
      now: NOW,
      teams: [...teams, staleVacantTeam],
    });

    expect(prepared.gamesSimulated).toBe(1);
  });

  it("hard-fails active membership projection conflicts before simulation", () => {
    expect(() =>
      prepareOnlineLeagueWeekSimulation({
        actorUserId: "admin-user",
        league: league(),
        memberships: [...memberships, membership("stale")],
        now: NOW,
        teams: [
          ...teams,
          team("stale", "Stale Placeholder", {
            assignedUserId: "other-user",
            status: "assigned",
          }),
        ],
      }),
    ).toThrow(/Membership-Projektion inkonsistent/);
  });

  it("blocks simulation when an assigned active participant is not ready", () => {
    expect(() =>
      prepareOnlineLeagueWeekSimulation({
        actorUserId: "admin-user",
        league: league(),
        memberships: [membership("zurich"), { ...membership("basel"), ready: false }],
        now: NOW,
        teams,
      }),
    ).toThrow(/alle aktiven Teams ready/);
  });

  it("blocks online backbone simulation when the canonical draft doc is missing", () => {
    expect(() =>
      prepareOnlineLeagueWeekSimulation({
        actorUserId: "admin-user",
        league: league({ settings: { onlineBackbone: true } }),
        memberships,
        now: NOW,
        teams,
      }),
    ).toThrow(/Fantasy Draft muss vor dem Ready-State abgeschlossen sein/);
  });

  it("blocks duplicate week simulation", () => {
    expect(() =>
      prepareOnlineLeagueWeekSimulation({
        actorUserId: "admin-user",
        expectedSeason: 1,
        expectedWeek: 1,
        league: league({
          completedWeeks: [
            {
              completedAt: NOW,
              nextSeason: 1,
              nextWeek: 2,
              resultMatchIds: [],
              season: 1,
              simulatedByUserId: "admin-user",
              status: "completed",
              week: 1,
              weekKey: "s1-w1",
            },
          ],
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

  it("blocks simulation when the week cursor is beyond the last scheduled game", () => {
    expect(() =>
      prepareOnlineLeagueWeekSimulation({
        actorUserId: "admin-user",
        expectedSeason: 1,
        expectedWeek: 2,
        league: league({
          completedWeeks: [
            {
              completedAt: NOW,
              nextSeason: 1,
              nextWeek: 2,
              resultMatchIds: [],
              season: 1,
              simulatedByUserId: "admin-user",
              status: "completed",
              week: 1,
              weekKey: "s1-w1",
            },
          ],
          currentWeek: 2,
        }),
        memberships,
        now: NOW,
        teams,
      }),
    ).toThrow(/Saison ist abgeschlossen/);
  });

  it("blocks contradictory legacy completion state without treating it as canonical", () => {
    expect(() =>
      prepareOnlineLeagueWeekSimulation({
        actorUserId: "admin-user",
        expectedSeason: 1,
        expectedWeek: 1,
        league: league({
          lastSimulatedWeekKey: "s1-w1",
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
    ).toThrow(/Week-State ist widersprüchlich/);
  });

  it("blocks weeks collection completion without canonical completedWeeks", () => {
    expect(() =>
      prepareOnlineLeagueWeekSimulation({
        actorUserId: "admin-user",
        expectedSeason: 1,
        expectedWeek: 1,
        league: league(),
        memberships,
        now: NOW,
        teams,
        weeks: [
          {
            completedAt: NOW,
            season: 1,
            simulatedByUserId: "admin-user",
            status: "completed",
            week: 1,
          },
        ],
      }),
    ).toThrow(/weeks\/s1-w1 markiert die Woche als abgeschlossen/);
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

  it("blocks simulation when currentWeek is invalid", () => {
    expect(() =>
      prepareOnlineLeagueWeekSimulation({
        actorUserId: "admin-user",
        league: league({ currentWeek: 0 }),
        memberships,
        now: NOW,
        teams,
      }),
    ).toThrow(/Aktuelle Woche ist ungültig/);
  });

  it("blocks simulation when an active team has an empty roster", () => {
    expect(() =>
      prepareOnlineLeagueWeekSimulation({
        actorUserId: "admin-user",
        league: league(),
        memberships,
        now: NOW,
        teams: [team("zurich", "Zurich Guardians", { contractRoster: [] }), teams[1]],
      }),
    ).toThrow(/kein spielbares Roster/);
  });

  it("blocks simulation when an active team has no depth chart", () => {
    expect(() =>
      prepareOnlineLeagueWeekSimulation({
        actorUserId: "admin-user",
        league: league(),
        memberships,
        now: NOW,
        teams: [team("zurich", "Zurich Guardians", { depthChart: [] }), teams[1]],
      }),
    ).toThrow(/keine Depth Chart/);
  });

  it("blocks simulation when an active team has an invalid depth chart", () => {
    expect(() =>
      prepareOnlineLeagueWeekSimulation({
        actorUserId: "admin-user",
        league: league(),
        memberships,
        now: NOW,
        teams: [
          team("zurich", "Zurich Guardians", {
            depthChart: [
              {
                ...depthChart("zurich"),
                starterPlayerId: "missing-player",
              },
            ],
          }),
          teams[1],
        ],
      }),
    ).toThrow(/ungültige Depth Chart/);
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

  it("blocks simulation when a schedule contains a self-matchup", () => {
    expect(() =>
      prepareOnlineLeagueWeekSimulation({
        actorUserId: "admin-user",
        league: league({
          schedule: [
            {
              awayTeamName: "zurich",
              homeTeamName: "zurich",
              id: "self-game",
              week: 1,
            },
          ],
        }),
        memberships,
        now: NOW,
        teams,
      }),
    ).toThrow(/Self-Matchup/);
  });

  it("blocks simulation when a team is scheduled twice in the same week", () => {
    expect(() =>
      prepareOnlineLeagueWeekSimulation({
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
              homeTeamName: "zurich",
              id: "game-2",
              week: 1,
            },
          ],
        }),
        memberships: fourMemberships,
        now: NOW,
        teams: fourTeams,
      }),
    ).toThrow(/mehrfach eingeplant/);
  });

  it("blocks simulation when an active team has no scheduled matchup", () => {
    expect(() =>
      prepareOnlineLeagueWeekSimulation({
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
          ],
        }),
        memberships: fourMemberships,
        now: NOW,
        teams: fourTeams,
      }),
    ).toThrow(/kein Matchup/);
  });

  it("blocks simulation when the schedule includes a non-active team", () => {
    expect(() =>
      prepareOnlineLeagueWeekSimulation({
        actorUserId: "admin-user",
        league: league({
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
        memberships,
        now: NOW,
        teams: [...teams, team("bern", "Bern Wolves"), team("geneva", "Geneva Falcons")],
      }),
    ).toThrow(/nicht als aktives Team/);
  });

  it("blocks simulation when the schedule contains duplicate match ids", () => {
    expect(() =>
      prepareOnlineLeagueWeekSimulation({
        actorUserId: "admin-user",
        league: league({
          maxTeams: 4,
          memberCount: 4,
          schedule: [
            {
              awayTeamName: "basel",
              homeTeamName: "zurich",
              id: "duplicate-game",
              week: 1,
            },
            {
              awayTeamName: "geneva",
              homeTeamName: "bern",
              id: "duplicate-game",
              week: 1,
            },
          ],
        }),
        memberships: fourMemberships,
        now: NOW,
        teams: fourTeams,
      }),
    ).toThrow(/mehrfach vorhanden/);
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
