import { describe, expect, it } from "vitest";

import type { OnlineLeague } from "./online-league-types";
import {
  buildOnlineLeagueTeamRecords,
  canSimulateWeek,
  getCurrentWeekGames,
  hasValidScheduleForWeek,
  normalizeOnlineLeagueWeekSimulationState,
  sortOnlineLeagueTeamRecords,
} from "./online-league-week-simulation";

function user(teamId: string, readyForWeek = true) {
  return {
    joinedAt: "2026-01-01T00:00:00.000Z",
    readyForWeek,
    teamDisplayName: teamId === "zurich" ? "Zurich Guardians" : "Basel Rhinos",
    teamId,
    teamName: teamId,
    userId: `${teamId}-gm`,
    username: `${teamId} GM`,
  };
}

function league(overrides: Partial<OnlineLeague> = {}): OnlineLeague {
  return {
    currentSeason: 1,
    currentWeek: 1,
    id: "league-1",
    maxUsers: 2,
    name: "Week Simulation Fixture",
    status: "active",
    teams: [
      { abbreviation: "ZUR", id: "zurich", name: "Zurich Guardians" },
      { abbreviation: "BAS", id: "basel", name: "Basel Rhinos" },
    ],
    users: [user("zurich"), user("basel")],
    weekStatus: "pre_week",
    ...overrides,
  };
}

describe("online league week simulation model", () => {
  it("falls back to week 1 for older leagues without currentWeek", () => {
    const oldLeague = {
      ...league({
        schedule: [
          {
            awayTeamName: "basel",
            homeTeamName: "zurich",
            id: "game-1",
            week: 1,
          },
        ],
      }),
      currentWeek: undefined,
    } as unknown as OnlineLeague;

    const state = normalizeOnlineLeagueWeekSimulationState(oldLeague);

    expect(state.currentWeek).toBe(1);
    expect(state.weekKey).toBe("s1-w1");
    expect(state.games).toHaveLength(1);
  });

  it("recognizes a league without schedule as not simulatable", () => {
    const state = normalizeOnlineLeagueWeekSimulationState(league());

    expect(getCurrentWeekGames(league())).toEqual([]);
    expect(hasValidScheduleForWeek(league(), 1)).toBe(false);
    expect(canSimulateWeek(league())).toBe(false);
    expect(state.reasons).toContain("Für die aktuelle Woche ist kein gültiger Schedule vorhanden.");
  });

  it("recognizes valid current-week schedule games", () => {
    const scheduledLeague = league({
      schedule: [
        {
          awayTeamName: "basel",
          homeTeamName: "zurich",
          id: "game-1",
          week: 1,
        },
      ],
    });

    expect(hasValidScheduleForWeek(scheduledLeague, 1)).toBe(true);
    expect(getCurrentWeekGames(scheduledLeague)).toEqual([
      expect.objectContaining({
        awayTeamId: "basel",
        homeTeamId: "zurich",
        id: "game-1",
        status: "scheduled",
      }),
    ]);
    expect(canSimulateWeek(scheduledLeague)).toBe(true);
  });

  it("filters invalid games from the current week", () => {
    const scheduledLeague = league({
      schedule: [
        {
          awayTeamName: "missing-team",
          homeTeamName: "zurich",
          id: "broken-game",
          week: 1,
        },
        {
          awayTeamName: "basel",
          homeTeamName: "zurich",
          id: "valid-game",
          week: 1,
        },
      ],
    });

    expect(getCurrentWeekGames(scheduledLeague).map((game) => game.id)).toEqual([
      "valid-game",
    ]);
  });

  it("builds records from stored match results", () => {
    const records = buildOnlineLeagueTeamRecords(
      league({
        matchResults: [
          {
            awayScore: 17,
            awayStats: {
              firstDowns: 12,
              passingYards: 180,
              rushingYards: 90,
              totalYards: 270,
              turnovers: 1,
            },
            awayTeamId: "basel",
            awayTeamName: "Basel Rhinos",
            createdAt: "2026-01-01T00:00:00.000Z",
            homeScore: 24,
            homeStats: {
              firstDowns: 18,
              passingYards: 220,
              rushingYards: 110,
              totalYards: 330,
              turnovers: 0,
            },
            homeTeamId: "zurich",
            homeTeamName: "Zurich Guardians",
            matchId: "game-1",
            season: 1,
            simulatedAt: "2026-01-01T00:00:00.000Z",
            simulatedByUserId: "admin",
            status: "completed",
            tiebreakerApplied: false,
            week: 1,
            winnerTeamId: "zurich",
            winnerTeamName: "Zurich Guardians",
          },
        ],
      }),
    );

    expect(records.find((record) => record.teamId === "zurich")).toMatchObject({
      gamesPlayed: 1,
      losses: 0,
      pointDifferential: 7,
      pointsAgainst: 17,
      pointsFor: 24,
      streak: "W1",
      wins: 1,
    });
    expect(records.find((record) => record.teamId === "basel")).toMatchObject({
      gamesPlayed: 1,
      losses: 1,
      pointDifferential: -7,
      pointsAgainst: 24,
      pointsFor: 17,
      streak: "L1",
      wins: 0,
    });
  });

  it("sorts records by wins, losses, point differential and points for", () => {
    const records = sortOnlineLeagueTeamRecords([
      {
        gamesPlayed: 2,
        losses: 1,
        pointDifferential: 10,
        pointsAgainst: 30,
        pointsFor: 40,
        teamId: "team-c",
        ties: 0,
        wins: 1,
      },
      {
        gamesPlayed: 2,
        losses: 0,
        pointDifferential: 4,
        pointsAgainst: 36,
        pointsFor: 40,
        teamId: "team-b",
        ties: 0,
        wins: 2,
      },
      {
        gamesPlayed: 2,
        losses: 0,
        pointDifferential: 4,
        pointsAgainst: 38,
        pointsFor: 42,
        teamId: "team-a",
        ties: 0,
        wins: 2,
      },
      {
        gamesPlayed: 2,
        losses: 1,
        pointDifferential: 12,
        pointsAgainst: 28,
        pointsFor: 40,
        teamId: "team-d",
        ties: 0,
        wins: 1,
      },
    ]);

    expect(records.map((record) => record.teamId)).toEqual([
      "team-a",
      "team-b",
      "team-d",
      "team-c",
    ]);
  });
});
