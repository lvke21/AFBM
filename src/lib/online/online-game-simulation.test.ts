import { describe, expect, it } from "vitest";

import type {
  OnlineContractPlayer,
  OnlineDepthChartEntry,
  OnlineLeague,
  OnlineLeagueUser,
} from "./online-league-types";
import {
  adaptOnlineTeamToSimulationTeam,
  simulateOnlineGame,
} from "./online-game-simulation";

function player(
  playerId: string,
  overall: number,
  overrides: Partial<OnlineContractPlayer> = {},
): OnlineContractPlayer {
  return {
    age: 26,
    attributes: {},
    contract: {
      capHitPerYear: 1_000_000,
      contractType: "regular",
      deadCapPerYear: 0,
      guaranteedMoney: 500_000,
      salaryPerYear: 1_000_000,
      signingBonus: 0,
      totalValue: 2_000_000,
      yearsRemaining: 2,
    },
    developmentPath: "solid",
    developmentProgress: 0,
    overall,
    playerId,
    playerName: playerId,
    position: "QB",
    potential: overall,
    status: "active",
    xFactors: [],
    ...overrides,
  };
}

function user(
  teamId: string,
  roster: OnlineContractPlayer[],
  depthChart?: OnlineDepthChartEntry[],
): OnlineLeagueUser {
  return {
    contractRoster: roster,
    depthChart,
    joinedAt: "2026-01-01T00:00:00.000Z",
    readyForWeek: true,
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
    name: "Online Simulation Fixture",
    status: "active",
    teams: [
      { abbreviation: "ZUR", id: "zurich", name: "Zurich Guardians" },
      { abbreviation: "BAS", id: "basel", name: "Basel Rhinos" },
    ],
    users: [
      user("zurich", [player("zurich-qb", 82), player("zurich-rb", 78)]),
      user("basel", [player("basel-qb", 72), player("basel-rb", 70)]),
    ],
    weekStatus: "pre_week",
    ...overrides,
  };
}

describe("online game simulation", () => {
  it("adapts online roster strength to the existing match engine input", () => {
    const adapted = adaptOnlineTeamToSimulationTeam(league(), "zurich");

    expect(adapted).toMatchObject({
      id: "zurich",
      name: "Zurich Guardians",
      rating: 80,
      warnings: [],
    });
  });

  it("weights depth-chart starters higher than backups for simulation strength", () => {
    const highStarterLeague = league({
      users: [
        user(
          "zurich",
          [player("zurich-high", 90), player("zurich-low", 60)],
          [
            {
              backupPlayerIds: ["zurich-low"],
              position: "QB",
              starterPlayerId: "zurich-high",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        ),
      ],
    });
    const lowStarterLeague = league({
      users: [
        user(
          "zurich",
          [player("zurich-high", 90), player("zurich-low", 60)],
          [
            {
              backupPlayerIds: ["zurich-high"],
              position: "QB",
              starterPlayerId: "zurich-low",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        ),
      ],
    });

    expect(adaptOnlineTeamToSimulationTeam(highStarterLeague, "zurich")?.rating).toBe(83);
    expect(adaptOnlineTeamToSimulationTeam(lowStarterLeague, "zurich")?.rating).toBe(67);
  });

  it("ignores released and free-agent players when deriving simulation strength", () => {
    const adapted = adaptOnlineTeamToSimulationTeam(
      league({
        users: [
          user("zurich", [
            player("zurich-active", 80),
            player("zurich-released", 99, { status: "released" }),
            player("zurich-free-agent", 99, { status: "free_agent" }),
          ]),
        ],
      }),
      "zurich",
    );

    expect(adapted?.rating).toBe(80);
  });

  it("applies a penalty when a required starter position is missing", () => {
    const adapted = adaptOnlineTeamToSimulationTeam(
      league({
        users: [
          user(
            "zurich",
            [player("zurich-rb", 80, { position: "RB" })],
            [
              {
                backupPlayerIds: [],
                position: "RB",
                starterPlayerId: "zurich-rb",
                updatedAt: "2026-01-01T00:00:00.000Z",
              },
            ],
          ),
        ],
      }),
      "zurich",
    );

    expect(adapted).toMatchObject({
      rating: 72,
      warnings: [
        "Team-Staerke erhaelt -8, weil kein aktiver QB-Starter gesetzt ist.",
      ],
    });
  });

  it("lets a stronger depth-chart team win more deterministic seeded games", () => {
    const strengthLeague = league({
      users: [
        user(
          "zurich",
          [
            player("zurich-qb", 95),
            player("zurich-rb", 82, { position: "RB" }),
          ],
          [
            {
              backupPlayerIds: [],
              position: "QB",
              starterPlayerId: "zurich-qb",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        ),
        user(
          "basel",
          [
            player("basel-qb", 55),
            player("basel-rb", 56, { position: "RB" }),
          ],
          [
            {
              backupPlayerIds: [],
              position: "QB",
              starterPlayerId: "basel-qb",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        ),
      ],
    });
    const wins = Array.from({ length: 24 }, (_, index) => {
      const simulated = simulateOnlineGame(
        {
          awayTeamId: "basel",
          homeTeamId: "zurich",
          id: `strength-game-${index + 1}`,
          season: 1,
          week: index + 1,
        },
        strengthLeague,
      );

      if (!simulated.ok) {
        throw new Error(simulated.error.message);
      }

      return simulated.result.winnerTeamId;
    });

    expect(wins.filter((winnerTeamId) => winnerTeamId === "zurich").length).toBeGreaterThan(14);
    expect(wins).toEqual(
      Array.from({ length: 24 }, (_, index) => {
        const simulated = simulateOnlineGame(
          {
            awayTeamId: "basel",
            homeTeamId: "zurich",
            id: `strength-game-${index + 1}`,
            season: 1,
            week: index + 1,
          },
          strengthLeague,
        );

        if (!simulated.ok) {
          throw new Error(simulated.error.message);
        }

        return simulated.result.winnerTeamId;
      }),
    );
  });

  it("simulates a normal planned online game", () => {
    const simulated = simulateOnlineGame(
      {
        awayTeamId: "basel",
        homeTeamId: "zurich",
        id: "game-1",
        season: 1,
        week: 1,
      },
      league(),
      {
        simulatedAt: "2026-01-01T12:00:00.000Z",
        simulatedByUserId: "admin",
      },
    );

    expect(simulated.ok).toBe(true);

    if (!simulated.ok) {
      throw new Error(simulated.error.message);
    }

    expect(simulated.result).toMatchObject({
      awayTeamId: "basel",
      gameId: "game-1",
      homeTeamId: "zurich",
      matchId: "game-1",
      simulatedAt: "2026-01-01T12:00:00.000Z",
      simulatedByUserId: "admin",
      status: "completed",
      week: 1,
    });
    expect(simulated.result.homeScore).toBeGreaterThanOrEqual(0);
    expect(simulated.result.awayScore).toBeGreaterThanOrEqual(0);
    expect(simulated.result.simulationWarnings).toEqual([]);
    expect(JSON.stringify(simulated.result)).not.toContain("undefined");
    expect([simulated.result.homeTeamId, simulated.result.awayTeamId]).toContain(
      simulated.result.winnerTeamId,
    );
    expect([simulated.result.homeTeamId, simulated.result.awayTeamId]).toContain(
      simulated.result.loserTeamId,
    );
    expect(simulated.result.winnerTeamId).not.toBe(simulated.result.loserTeamId);
  });

  it("returns a structured error when a scheduled team is missing", () => {
    const simulated = simulateOnlineGame(
      {
        awayTeamId: "missing-team",
        homeTeamId: "zurich",
        id: "broken-game",
        week: 1,
      },
      league(),
    );

    expect(simulated).toEqual({
      error: {
        code: "missing_away_team",
        message: "Away-Team missing-team wurde in Liga league-1 nicht gefunden.",
      },
      ok: false,
    });
  });

  it("uses a documented fallback rating for teams without active rosters", () => {
    const simulated = simulateOnlineGame(
      {
        awayTeamId: "basel",
        homeTeamId: "zurich",
        id: "fallback-game",
        week: 1,
      },
      league({ users: [] }),
      {
        simulatedAt: "2026-01-01T12:00:00.000Z",
      },
    );

    expect(simulated.ok).toBe(true);

    if (!simulated.ok) {
      throw new Error(simulated.error.message);
    }

    expect(simulated.result.simulationWarnings).toEqual([
      "Team zurich nutzt Rating-Fallback 70, weil kein aktives Online-Roster vorhanden ist.",
      "Team basel nutzt Rating-Fallback 70, weil kein aktives Online-Roster vorhanden ist.",
    ]);
  });

  it("keeps warning arrays serializable for Firestore writes", () => {
    const normalGame = simulateOnlineGame(
      {
        awayTeamId: "basel",
        homeTeamId: "zurich",
        id: "serializable-game",
        week: 1,
      },
      league(),
    );
    const fallbackGame = simulateOnlineGame(
      {
        awayTeamId: "basel",
        homeTeamId: "zurich",
        id: "serializable-fallback-game",
        week: 1,
      },
      league({ users: [] }),
    );

    if (!normalGame.ok || !fallbackGame.ok) {
      throw new Error("Expected serializable simulation fixtures to succeed.");
    }

    expect(normalGame.result.simulationWarnings).toEqual([]);
    expect(fallbackGame.result.simulationWarnings).toHaveLength(2);
    expect(Object.values(normalGame.result)).not.toContain(undefined);
    expect(Object.values(fallbackGame.result)).not.toContain(undefined);
  });
});
