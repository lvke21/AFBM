import { beforeEach, describe, expect, it } from "vitest";

import {
  SimulationApiError,
  createGame,
  getDriveLog,
  getGameResult,
  getStats,
  resetSimulationApiStoreForTests,
  simulateGame,
} from "./simulation-api.service";

function validCreateGameInput(gameId = "api-test-game-1") {
  return {
    gameId,
    seed: `${gameId}-seed`,
    teams: {
      home: {
        id: "BOS",
        city: "Boston",
        nickname: "Guardians",
        abbreviation: "BOS",
        overallRating: 74,
        rosterSeed: 0,
      },
      away: {
        id: "NYT",
        city: "New York",
        nickname: "Titans",
        abbreviation: "NYT",
        overallRating: 78,
        rosterSeed: 1,
      },
    },
    gameplan: {
      home: { tempo: "balanced" },
      away: { tempo: "aggressive" },
    },
    settings: {
      kind: "REGULAR_SEASON" as const,
      seasonYear: 2026,
      week: 1,
      scheduledAt: "2026-09-01T18:00:00.000Z",
    },
  };
}

describe("simulation API service", () => {
  beforeEach(() => {
    resetSimulationApiStoreForTests();
  });

  it("createGame creates a stable game id response", () => {
    const created = createGame(validCreateGameInput());

    expect(created.gameId).toBe("api-test-game-1");
    expect(created.status).toBe("CREATED");
    expect(created.seed).toBe("api-test-game-1-seed");
    expect(created.teams.home.abbreviation).toBe("BOS");
    expect(created.teams.away.abbreviation).toBe("NYT");
    expect(created.createdAt).toEqual(expect.any(String));
  });

  it("simulateGame produces and stores a result", () => {
    const created = createGame(validCreateGameInput());
    const simulated = simulateGame(created.gameId);

    expect(simulated.gameId).toBe(created.gameId);
    expect(simulated.status).toBe("SIMULATED");
    expect(simulated.finalScore.home).toEqual(expect.any(Number));
    expect(simulated.finalScore.away).toEqual(expect.any(Number));
    expect(simulated.simulatedAt).toEqual(expect.any(String));
  });

  it("getGameResult returns score, winner, team stats, player stats and drive summary", () => {
    const created = createGame(validCreateGameInput());
    simulateGame(created.gameId);

    const result = getGameResult(created.gameId);

    expect(result.gameId).toBe(created.gameId);
    expect(result.finalScore.home).toEqual(expect.any(Number));
    expect(result.winner === null || result.winner.teamId.length > 0).toBe(true);
    expect(result.teamStats).toHaveLength(2);
    expect(result.playerStats.length).toBeGreaterThan(20);
    expect(result.driveSummary.length).toBeGreaterThan(0);
  });

  it("getDriveLog returns drive-by-drive data", () => {
    const created = createGame(validCreateGameInput());
    simulateGame(created.gameId);

    const log = getDriveLog(created.gameId);

    expect(log.gameId).toBe(created.gameId);
    expect(log.drives.length).toBeGreaterThan(0);
    expect(log.drives[0]).toEqual(
      expect.objectContaining({
        startFieldPosition: expect.any(Number),
        result: expect.any(String),
        plays: expect.any(Number),
        scoreAfterDrive: expect.objectContaining({
          home: expect.any(Number),
          away: expect.any(Number),
        }),
      }),
    );
  });

  it("getStats returns team stats, player stats, leaders and summary", () => {
    const created = createGame(validCreateGameInput());
    simulateGame(created.gameId);

    const stats = getStats(created.gameId);

    expect(stats.gameId).toBe(created.gameId);
    expect(stats.teamStats).toHaveLength(2);
    expect(stats.playerStats.length).toBeGreaterThan(20);
    expect(stats.leaders.passing).not.toBeNull();
    expect(stats.summary.length).toBeGreaterThan(10);
  });

  it("handles unknown game ids", () => {
    expect(() => simulateGame("missing-game")).toThrow(SimulationApiError);

    try {
      simulateGame("missing-game");
    } catch (error) {
      expect(error).toBeInstanceOf(SimulationApiError);
      expect((error as SimulationApiError).statusCode).toBe(404);
      expect((error as SimulationApiError).code).toBe("GAME_NOT_FOUND");
    }
  });

  it("handles games that have not been simulated yet", () => {
    const created = createGame(validCreateGameInput());

    expect(() => getGameResult(created.gameId)).toThrow(SimulationApiError);

    try {
      getDriveLog(created.gameId);
    } catch (error) {
      expect(error).toBeInstanceOf(SimulationApiError);
      expect((error as SimulationApiError).statusCode).toBe(409);
      expect((error as SimulationApiError).code).toBe("GAME_NOT_SIMULATED");
    }
  });

  it("rejects invalid team input", () => {
    const input = validCreateGameInput();
    input.teams.away.id = input.teams.home.id;

    expect(() => createGame(input)).toThrow(SimulationApiError);
  });
});
