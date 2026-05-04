import { describe, expect, it } from "vitest";

import type { OnlineContractPlayer, OnlineLeague } from "./online-league-types";
import {
  buildOnlineLeagueTeamRecords,
  canSimulateWeek,
  getOnlineLeagueWeekProgressState,
  getCurrentWeekGames,
  hasOnlineLeagueWeekCompletionSignal,
  hasValidScheduleForWeek,
  isOnlineLeagueWeekCanonicallyCompleted,
  normalizeOnlineLeagueWeekSimulationState,
  ONLINE_LEAGUE_WEEK_PROGRESS_TRANSITIONS,
  sortOnlineLeagueTeamRecords,
} from "./online-league-week-simulation";

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

function user(teamId: string, readyForWeek = true, roster = [player(teamId)]) {
  return {
    contractRoster: roster,
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

  it("blocks simulation through the lifecycle adapter when raw week fields disagree", () => {
    const state = normalizeOnlineLeagueWeekSimulationState(
      league({
        completedWeeks: [
          {
            completedAt: "2026-05-01T08:00:00.000Z",
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
        schedule: [
          {
            awayTeamName: "basel",
            homeTeamName: "zurich",
            id: "game-1",
            week: 1,
          },
        ],
        weekStatus: "pre_week",
      }),
    );

    expect(state.canSimulate).toBe(false);
    expect(state.completion.phase).toBe("completed");
    expect(state.reasons).toContain("Aktuelle Woche ist bereits abgeschlossen.");
  });

  it("blocks simulation through the lifecycle adapter while weekStatus is simulating", () => {
    const state = normalizeOnlineLeagueWeekSimulationState(
      league({
        schedule: [
          {
            awayTeamName: "basel",
            homeTeamName: "zurich",
            id: "game-1",
            week: 1,
          },
        ],
        weekStatus: "simulating",
      }),
    );

    expect(state.canSimulate).toBe(false);
    expect(state.completion.phase).toBe("simulating");
    expect(state.reasons).toContain("Die Woche wird bereits simuliert.");
  });

  it("keeps week-progress phase draft-agnostic and lets lifecycle block active drafts", () => {
    const draftActiveLeague = league({
      fantasyDraft: {
        availablePlayerIds: ["player-1"],
        completedAt: null,
        currentTeamId: "zurich",
        draftOrder: ["zurich", "basel"],
        leagueId: "league-1",
        pickNumber: 1,
        picks: [],
        round: 1,
        startedAt: "2026-05-01T08:00:00.000Z",
        status: "active",
      },
      schedule: [
        {
          awayTeamName: "basel",
          homeTeamName: "zurich",
          id: "game-1",
          week: 1,
        },
      ],
    });
    const weekProgress = getOnlineLeagueWeekProgressState(draftActiveLeague);
    const state = normalizeOnlineLeagueWeekSimulationState(draftActiveLeague);

    expect(weekProgress.phase).toBe("ready");
    expect(state.canSimulate).toBe(false);
    expect(state.reasons).toContain("Fantasy Draft ist noch nicht abgeschlossen.");
  });

  it("blocks simulation state when the current week is invalid", () => {
    const state = normalizeOnlineLeagueWeekSimulationState(league({ currentWeek: 0 }));

    expect(state.canSimulate).toBe(false);
    expect(state.reasons).toContain("Aktuelle Woche ist ungültig.");
  });

  it("blocks simulation state when an active team has no playable roster", () => {
    const state = normalizeOnlineLeagueWeekSimulationState(
      league({
        schedule: [
          {
            awayTeamName: "basel",
            homeTeamName: "zurich",
            id: "game-1",
            week: 1,
          },
        ],
        users: [user("zurich", true, []), user("basel")],
      }),
    );

    expect(state.canSimulate).toBe(false);
    expect(state.reasons).toContain("Zurich Guardians hat kein spielbares Roster.");
  });

  it("filters invalid games from the current week and blocks simulation state", () => {
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
    expect(hasValidScheduleForWeek(scheduledLeague, 1)).toBe(false);
    expect(normalizeOnlineLeagueWeekSimulationState(scheduledLeague).canSimulate).toBe(false);
  });

  it("blocks simulation state when an active team has no matchup", () => {
    const scheduledLeague = league({
      teams: [
        { abbreviation: "ZUR", id: "zurich", name: "Zurich Guardians" },
        { abbreviation: "BAS", id: "basel", name: "Basel Rhinos" },
        { abbreviation: "BER", id: "bern", name: "Bern Wolves" },
      ],
      users: [user("zurich"), user("basel"), user("bern")],
      schedule: [
        {
          awayTeamName: "basel",
          homeTeamName: "zurich",
          id: "game-1",
          week: 1,
        },
      ],
    });
    const state = normalizeOnlineLeagueWeekSimulationState(scheduledLeague);

    expect(state.canSimulate).toBe(false);
    expect(state.reasons).toContain(
      "Mindestens ein aktives Team hat kein Matchup in der aktuellen Woche.",
    );
  });

  it("uses completedWeeks as the canonical source for week completion", () => {
    const completedLeague = league({
      currentWeek: 2,
      completedWeeks: [
        {
          completedAt: "2026-05-01T08:00:00.000Z",
          nextSeason: 1,
          nextWeek: 2,
          resultMatchIds: ["game-1"],
          season: 1,
          simulatedByUserId: "admin",
          status: "completed",
          week: 1,
          weekKey: "s1-w1",
        },
      ],
      lastSimulatedWeekKey: "s1-w1",
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
          createdAt: "2026-05-01T08:00:00.000Z",
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
          simulatedAt: "2026-05-01T08:00:00.000Z",
          simulatedByUserId: "admin",
          status: "completed",
          tiebreakerApplied: false,
          week: 1,
          winnerTeamId: "zurich",
          winnerTeamName: "Zurich Guardians",
        },
      ],
    });
    const weekProgress = getOnlineLeagueWeekProgressState(completedLeague);

    expect(weekProgress.phase).toBe("advanced");
    expect(weekProgress.latestCompletedWeekKey).toBe("s1-w1");
    expect(weekProgress.hasConflicts).toBe(false);
    expect(isOnlineLeagueWeekCanonicallyCompleted(completedLeague, 1, 1)).toBe(true);
    expect(hasOnlineLeagueWeekCompletionSignal(completedLeague, 1, 1)).toBe(true);
  });

  it("treats the cursor after the last scheduled week as season complete", () => {
    const completedSeasonLeague = league({
      currentWeek: 2,
      completedWeeks: [
        {
          completedAt: "2026-05-01T08:00:00.000Z",
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
      lastSimulatedWeekKey: "s1-w1",
      schedule: [
        {
          awayTeamName: "basel",
          homeTeamName: "zurich",
          id: "game-1",
          week: 1,
        },
      ],
      weekStatus: "season_complete",
    });

    const state = normalizeOnlineLeagueWeekSimulationState(completedSeasonLeague);

    expect(state.canSimulate).toBe(false);
    expect(state.completion).toMatchObject({
      lastScheduledWeek: 1,
      phase: "season_complete",
      seasonComplete: true,
    });
    expect(state.completion.hasConflicts).toBe(false);
    expect(state.reasons).toContain(
      "Die Saison ist abgeschlossen; Woche 2 liegt nach der letzten geplanten Woche 1.",
    );
  });

  it("detects legacy completion signals without canonical completedWeeks", () => {
    const inconsistentLeague = league({
      lastSimulatedWeekKey: "s1-w1",
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
          createdAt: "2026-05-01T08:00:00.000Z",
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
          simulatedAt: "2026-05-01T08:00:00.000Z",
          simulatedByUserId: "admin",
          status: "completed",
          tiebreakerApplied: false,
          week: 1,
          winnerTeamId: "zurich",
          winnerTeamName: "Zurich Guardians",
        },
      ],
      schedule: [
        {
          awayTeamName: "basel",
          homeTeamName: "zurich",
          id: "game-1",
          week: 1,
        },
      ],
    });
    const weekProgress = getOnlineLeagueWeekProgressState(inconsistentLeague);
    const simulationState = normalizeOnlineLeagueWeekSimulationState(inconsistentLeague);

    expect(weekProgress.hasConflicts).toBe(true);
    expect(weekProgress.conflictCodes).toContain("legacy-completion-without-completed-week");
    expect(weekProgress.conflictReasons[0]).toContain("ohne kanonischen completedWeeks-Eintrag");
    expect(hasOnlineLeagueWeekCompletionSignal(inconsistentLeague, 1, 1)).toBe(true);
    expect(isOnlineLeagueWeekCanonicallyCompleted(inconsistentLeague, 1, 1)).toBe(false);
    expect(simulationState.canSimulate).toBe(false);
    expect(simulationState.reasons).toContain(
      "Week-State-Konflikt: s1-w1 hat Completion-Signale ohne kanonischen completedWeeks-Eintrag.",
    );
  });

  it("does not treat legacy weekStatus as canonical week completion", () => {
    const inconsistentLeague = league({
      schedule: [
        {
          awayTeamName: "basel",
          homeTeamName: "zurich",
          id: "game-1",
          week: 1,
        },
      ],
      weekStatus: "completed",
    });
    const weekProgress = getOnlineLeagueWeekProgressState(inconsistentLeague);
    const simulationState = normalizeOnlineLeagueWeekSimulationState(inconsistentLeague);

    expect(isOnlineLeagueWeekCanonicallyCompleted(inconsistentLeague, 1, 1)).toBe(false);
    expect(weekProgress.phase).not.toBe("completed");
    expect(weekProgress.hasConflicts).toBe(true);
    expect(weekProgress.conflictCodes).toContain(
      "week-status-completed-without-completed-week",
    );
    expect(weekProgress.conflictReasons).toContain(
      "weekStatus=completed markiert s1-w1 als abgeschlossen, aber completedWeeks enthält keinen kanonischen Eintrag.",
    );
    expect(simulationState.canSimulate).toBe(false);
    expect(simulationState.reasons).toContain(
      "Week-State-Konflikt: weekStatus=completed markiert s1-w1 als abgeschlossen, aber completedWeeks enthält keinen kanonischen Eintrag.",
    );
  });

  it("does not treat Firestore weeks documents as canonical completion", () => {
    const inconsistentLeague = league({
      schedule: [
        {
          awayTeamName: "basel",
          homeTeamName: "zurich",
          id: "game-1",
          week: 1,
        },
      ],
    });
    const weekProgress = getOnlineLeagueWeekProgressState(inconsistentLeague, {
      projectedWeeks: [{ season: 1, status: "completed", week: 1 }],
    });

    expect(isOnlineLeagueWeekCanonicallyCompleted(inconsistentLeague, 1, 1)).toBe(false);
    expect(weekProgress.phase).not.toBe("completed");
    expect(weekProgress.hasConflicts).toBe(true);
    expect(weekProgress.conflictCodes).toEqual(
      expect.arrayContaining([
        "legacy-completion-without-completed-week",
        "week-doc-completed-without-completed-week",
      ]),
    );
    expect(weekProgress.conflictReasons).toContain(
      "weeks/s1-w1 markiert die Woche als abgeschlossen, aber completedWeeks enthält keinen kanonischen Eintrag.",
    );
  });

  it("reports completedWeeks entries that point to missing matchResults", () => {
    const inconsistentLeague = league({
      completedWeeks: [
        {
          completedAt: "2026-05-01T08:00:00.000Z",
          nextSeason: 1,
          nextWeek: 2,
          resultMatchIds: ["missing-result"],
          season: 1,
          simulatedByUserId: "admin",
          status: "completed",
          week: 1,
          weekKey: "s1-w1",
        },
      ],
      schedule: [
        {
          awayTeamName: "basel",
          homeTeamName: "zurich",
          id: "game-1",
          week: 1,
        },
      ],
    });
    const weekProgress = getOnlineLeagueWeekProgressState(inconsistentLeague);
    const simulationState = normalizeOnlineLeagueWeekSimulationState(inconsistentLeague);

    expect(weekProgress.hasConflicts).toBe(true);
    expect(weekProgress.conflictCodes).toContain("completed-week-result-missing");
    expect(weekProgress.conflictReasons).toContain(
      "s1-w1 verweist auf fehlende Results: missing-result.",
    );
    expect(simulationState.canSimulate).toBe(false);
    expect(simulationState.reasons).toContain(
      "Aktuelle Woche ist bereits abgeschlossen.",
    );
    expect(simulationState.reasons).toContain(
      "Week-State-Konflikt: s1-w1 verweist auf fehlende Results: missing-result.",
    );
  });

  it("reports duplicate completedWeeks and duplicate matchResults", () => {
    const completedWeek = {
      completedAt: "2026-05-01T08:00:00.000Z",
      nextSeason: 1,
      nextWeek: 2,
      resultMatchIds: ["game-1"],
      season: 1,
      simulatedByUserId: "admin",
      status: "completed" as const,
      week: 1,
      weekKey: "s1-w1",
    };
    const result = {
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
      createdAt: "2026-05-01T08:00:00.000Z",
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
      simulatedAt: "2026-05-01T08:00:00.000Z",
      simulatedByUserId: "admin",
      status: "completed" as const,
      tiebreakerApplied: false,
      week: 1,
      winnerTeamId: "zurich",
      winnerTeamName: "Zurich Guardians",
    };
    const weekProgress = getOnlineLeagueWeekProgressState(
      league({
        completedWeeks: [completedWeek, completedWeek],
        matchResults: [result, result],
      }),
    );

    expect(weekProgress.hasConflicts).toBe(true);
    expect(weekProgress.conflictCodes).toEqual(
      expect.arrayContaining(["duplicate-completed-week", "duplicate-match-result"]),
    );
    expect(weekProgress.conflictReasons).toEqual(
      expect.arrayContaining([
        "s1-w1 ist mehrfach in completedWeeks gespeichert.",
        "MatchResult game-1 ist mehrfach gespeichert.",
      ]),
    );
  });

  it("reports stale lastSimulatedWeekKey when completedWeeks advanced further", () => {
    const weekProgress = getOnlineLeagueWeekProgressState(
      league({
        currentWeek: 3,
        lastSimulatedWeekKey: "s1-w1",
        completedWeeks: [
          {
            completedAt: "2026-05-02T08:00:00.000Z",
            nextSeason: 1,
            nextWeek: 3,
            resultMatchIds: [],
            season: 1,
            simulatedByUserId: "admin",
            status: "completed",
            week: 2,
            weekKey: "s1-w2",
          },
          {
            completedAt: "2026-05-01T08:00:00.000Z",
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
      }),
    );

    expect(weekProgress.hasConflicts).toBe(true);
    expect(weekProgress.conflictCodes).toContain("last-simulated-week-mismatch");
    expect(weekProgress.conflictReasons).toContain(
      "lastSimulatedWeekKey=s1-w1 widerspricht latest completedWeek=s1-w2.",
    );
  });

  it("documents the allowed week progress transitions", () => {
    expect(ONLINE_LEAGUE_WEEK_PROGRESS_TRANSITIONS).toEqual([
      "pending -> ready",
      "ready -> simulating",
      "simulating -> completed",
      "completed -> advanced",
      "advanced -> pending",
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

  it("builds cumulative standings across weeks without counting duplicate result ids", () => {
    const weekOne = {
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
      status: "completed" as const,
      tiebreakerApplied: false,
      week: 1,
      winnerTeamId: "zurich",
      winnerTeamName: "Zurich Guardians",
    };
    const records = buildOnlineLeagueTeamRecords(
      league({
        matchResults: [
          weekOne,
          weekOne,
          {
            ...weekOne,
            awayScore: 21,
            homeScore: 14,
            matchId: "game-2",
            simulatedAt: "2026-01-08T00:00:00.000Z",
            week: 2,
            winnerTeamId: "basel",
            winnerTeamName: "Basel Rhinos",
          },
        ],
      }),
    );

    expect(records.find((record) => record.teamId === "zurich")).toMatchObject({
      gamesPlayed: 2,
      losses: 1,
      pointDifferential: 0,
      pointsAgainst: 38,
      pointsFor: 38,
      wins: 1,
    });
    expect(records.find((record) => record.teamId === "basel")).toMatchObject({
      gamesPlayed: 2,
      losses: 1,
      pointDifferential: 0,
      pointsAgainst: 38,
      pointsFor: 38,
      wins: 1,
    });
  });


  it("omits undefined optional record fields before Firestore persistence", () => {
    const records = buildOnlineLeagueTeamRecords(league());

    expect(records).toHaveLength(2);
    expect(records.some((record) => Object.hasOwn(record, "streak"))).toBe(false);
    expect(records.some((record) => Object.hasOwn(record, "updatedAt"))).toBe(false);
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
