import { beforeEach, describe, expect, it } from "vitest";

import { resetSimulationApiStoreForTests } from "@/modules/seasons/infrastructure/simulation/simulation-api.service";

import { POST as createGameRoute } from "./createGame/route";
import { GET as getDriveLogRoute } from "./getDriveLog/route";
import { GET as getGameResultRoute } from "./getGameResult/route";
import { GET as getStatsRoute } from "./getStats/route";
import { POST as simulateGameRoute } from "./simulateGame/route";

function request(url: string, body?: unknown) {
  return new Request(url, {
    method: body ? "POST" : "GET",
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "content-type": "application/json" } : undefined,
  });
}

function createPayload(gameId = "api-route-game-1") {
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
    settings: {
      seasonYear: 2026,
      week: 1,
      scheduledAt: "2026-09-01T18:00:00.000Z",
    },
  };
}

describe("simulation API routes", () => {
  beforeEach(() => {
    resetSimulationApiStoreForTests();
  });

  it("creates, simulates and reads a game through route handlers", async () => {
    const createResponse = await createGameRoute(
      request("http://localhost/api/simulation/createGame", createPayload()),
    );
    const created = await createResponse.json();

    expect(createResponse.status).toBe(201);
    expect(created.gameId).toBe("api-route-game-1");

    const simulateResponse = await simulateGameRoute(
      request("http://localhost/api/simulation/simulateGame", {
        gameId: created.gameId,
      }),
    );
    const simulated = await simulateResponse.json();

    expect(simulateResponse.status).toBe(200);
    expect(simulated.status).toBe("SIMULATED");

    const resultResponse = await getGameResultRoute(
      request(`http://localhost/api/simulation/getGameResult?gameId=${created.gameId}`),
    );
    const result = await resultResponse.json();

    expect(resultResponse.status).toBe(200);
    expect(result.teamStats).toHaveLength(2);
    expect(result.driveSummary.length).toBeGreaterThan(0);

    const driveResponse = await getDriveLogRoute(
      request(`http://localhost/api/simulation/getDriveLog?gameId=${created.gameId}`),
    );
    const driveLog = await driveResponse.json();

    expect(driveResponse.status).toBe(200);
    expect(driveLog.drives.length).toBeGreaterThan(0);

    const statsResponse = await getStatsRoute(
      request(`http://localhost/api/simulation/getStats?gameId=${created.gameId}`),
    );
    const stats = await statsResponse.json();

    expect(statsResponse.status).toBe(200);
    expect(stats.teamStats).toHaveLength(2);
    expect(stats.playerStats.length).toBeGreaterThan(20);
    expect(stats.summary.length).toBeGreaterThan(10);
  });

  it("returns stable error responses for missing and unsimulated games", async () => {
    const missingResponse = await getGameResultRoute(
      request("http://localhost/api/simulation/getGameResult?gameId=missing"),
    );
    const missingBody = await missingResponse.json();

    expect(missingResponse.status).toBe(404);
    expect(missingBody.code).toBe("GAME_NOT_FOUND");

    const createResponse = await createGameRoute(
      request("http://localhost/api/simulation/createGame", createPayload("api-route-unsimulated")),
    );
    const created = await createResponse.json();
    const unsimulatedResponse = await getStatsRoute(
      request(`http://localhost/api/simulation/getStats?gameId=${created.gameId}`),
    );
    const unsimulatedBody = await unsimulatedResponse.json();

    expect(unsimulatedResponse.status).toBe(409);
    expect(unsimulatedBody.code).toBe("GAME_NOT_SIMULATED");
  });
});
