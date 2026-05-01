import { beforeEach, describe, expect, it, vi } from "vitest";

import { MatchStatus, SeasonPhase } from "@/modules/shared/domain/enums";

const seasonSimulationRepositoryMock = vi.hoisted(() => ({
  findSeasonHeaderForUser: vi.fn(),
  listWeekMatchesForSimulation: vi.fn(),
}));

const seasonSimulationCommandRepositoryMock = vi.hoisted(() => ({
  runInTransaction: vi.fn(),
  releaseWeekSimulationLock: vi.fn(),
  releaseStaleWeekSimulationLocks: vi.fn(),
  countWeekMatchesByStatus: vi.fn(),
  markWeekMatchesInProgress: vi.fn(),
  markMatchSimulationStarted: vi.fn(),
  updateSeason: vi.fn(),
  touchSaveGame: vi.fn(),
}));

const runWeeklyPreparationMock = vi.hoisted(() => vi.fn());
const ensureSimulationStatAnchorsMock = vi.hoisted(() => vi.fn());
const assertTeamCanSimulateMock = vi.hoisted(() => vi.fn());
const buildMatchContextMock = vi.hoisted(() => vi.fn());
const generateMatchStatsMock = vi.hoisted(() => vi.fn());
const persistMatchResultMock = vi.hoisted(() => vi.fn());
const createPlayoffSemifinalsMock = vi.hoisted(() => vi.fn());
const createPlayoffFinalMock = vi.hoisted(() => vi.fn());

vi.mock("../infrastructure/simulation/season-simulation.repository", () => ({
  seasonSimulationRepository: seasonSimulationRepositoryMock,
}));

vi.mock("../infrastructure/simulation/season-simulation.command-repository", () => ({
  seasonSimulationCommandRepository: seasonSimulationCommandRepositoryMock,
}));

vi.mock("../infrastructure/simulation/weekly-preparation", () => ({
  runWeeklyPreparation: runWeeklyPreparationMock,
}));

vi.mock("../infrastructure/simulation/stat-anchors", () => ({
  ensureSimulationStatAnchors: ensureSimulationStatAnchorsMock,
}));

vi.mock("./simulation/depth-chart", () => ({
  assertTeamCanSimulate: assertTeamCanSimulateMock,
}));

vi.mock("../infrastructure/simulation/match-context", () => ({
  buildMatchContext: buildMatchContextMock,
}));

vi.mock("./simulation/match-engine", () => ({
  generateMatchStats: generateMatchStatsMock,
}));

vi.mock("../infrastructure/simulation/match-result-persistence", () => ({
  persistMatchResult: persistMatchResultMock,
}));

vi.mock("../infrastructure/simulation/playoff-scheduling", () => ({
  createPlayoffSemifinals: createPlayoffSemifinalsMock,
  createPlayoffFinal: createPlayoffFinalMock,
}));

import { simulateSeasonWeekForUser } from "./season-simulation.service";

function createSeasonHeader(overrides: Record<string, unknown> = {}) {
  return {
    id: "season-1",
    saveGameId: "save-1",
    year: 2026,
    phase: SeasonPhase.REGULAR_SEASON,
    week: 1,
    saveGame: {
      currentSeasonId: "season-1",
      settings: {
        seasonLengthWeeks: 14,
      },
    },
    ...overrides,
  };
}

function createScheduledMatch() {
  return {
    id: "match-1",
    saveGameId: "save-1",
    seasonId: "season-1",
    week: 1,
    kind: "REGULAR_SEASON",
    status: MatchStatus.SCHEDULED,
    scheduledAt: new Date("2026-09-01T18:00:00.000Z"),
    homeTeam: {
      id: "home",
      city: "Boston",
      nickname: "Guardians",
      abbreviation: "BOS",
      overallRating: 74,
      rosterProfiles: [],
    },
    awayTeam: {
      id: "away",
      city: "New York",
      nickname: "Titans",
      abbreviation: "NYT",
      overallRating: 74,
      rosterProfiles: [],
    },
  };
}

describe("simulateSeasonWeekForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seasonSimulationCommandRepositoryMock.runInTransaction.mockImplementation((callback) =>
      callback({}),
    );
    seasonSimulationRepositoryMock.listWeekMatchesForSimulation.mockResolvedValue([]);
    ensureSimulationStatAnchorsMock.mockResolvedValue({ repairedPlayers: 0 });
    createPlayoffSemifinalsMock.mockResolvedValue(false);
    createPlayoffFinalMock.mockResolvedValue(false);
  });

  it("rejects simulations for non-current seasons", async () => {
    seasonSimulationRepositoryMock.findSeasonHeaderForUser.mockResolvedValue(
      createSeasonHeader({
        saveGame: {
          currentSeasonId: "season-2",
          settings: {
            seasonLengthWeeks: 14,
          },
        },
      }),
    );

    await expect(
      simulateSeasonWeekForUser({
        userId: "user-1",
        saveGameId: "save-1",
        seasonId: "season-1",
      }),
    ).rejects.toThrow("Only the current season can be advanced by the engine");
  });

  it("blocks a second run when the same week is already locked in progress", async () => {
    seasonSimulationRepositoryMock.findSeasonHeaderForUser.mockResolvedValue(createSeasonHeader());
    seasonSimulationRepositoryMock.listWeekMatchesForSimulation.mockResolvedValue([
      createScheduledMatch(),
    ]);
    seasonSimulationCommandRepositoryMock.countWeekMatchesByStatus.mockImplementation(
      async (_tx: unknown, _saveGameId: string, _seasonId: string, _week: number, status: MatchStatus) =>
        status === MatchStatus.IN_PROGRESS ? 1 : 1,
    );

    await expect(
      simulateSeasonWeekForUser({
        userId: "user-1",
        saveGameId: "save-1",
        seasonId: "season-1",
      }),
    ).rejects.toThrow("This season week is already being simulated");
  });

  it("does not simulate a week twice when no scheduled matches remain", async () => {
    seasonSimulationRepositoryMock.findSeasonHeaderForUser.mockResolvedValue(createSeasonHeader());
    seasonSimulationRepositoryMock.listWeekMatchesForSimulation.mockResolvedValue([]);

    const result = await simulateSeasonWeekForUser({
      userId: "user-1",
      saveGameId: "save-1",
      seasonId: "season-1",
    });

    expect(result).toEqual({
      seasonId: "season-1",
      simulatedWeek: 1,
      simulatedMatchCount: 0,
      phase: SeasonPhase.REGULAR_SEASON,
      nextWeek: 1,
      orchestrator: expect.objectContaining({
        jobId: "save-1:season-1:week-1",
        status: "COMPLETED",
        matchIds: [],
        steps: expect.arrayContaining([
          expect.objectContaining({
            id: "lock",
            status: "SKIPPED",
          }),
          expect.objectContaining({
            id: "simulate",
            status: "SKIPPED",
          }),
        ]),
      }),
    });
    expect(seasonSimulationCommandRepositoryMock.markWeekMatchesInProgress).not.toHaveBeenCalled();
    expect(persistMatchResultMock).not.toHaveBeenCalled();
    expect(seasonSimulationCommandRepositoryMock.updateSeason).not.toHaveBeenCalled();
  });

  it("stores simulated match results and advances the week", async () => {
    const scheduledMatch = createScheduledMatch();
    seasonSimulationRepositoryMock.findSeasonHeaderForUser.mockResolvedValue(createSeasonHeader());
    seasonSimulationRepositoryMock.listWeekMatchesForSimulation
      .mockResolvedValueOnce([scheduledMatch])
      .mockResolvedValueOnce([scheduledMatch])
      .mockResolvedValueOnce([scheduledMatch])
      .mockResolvedValueOnce([
        {
          ...scheduledMatch,
          status: MatchStatus.IN_PROGRESS,
        },
      ]);
    seasonSimulationCommandRepositoryMock.countWeekMatchesByStatus.mockImplementation(
      async (_tx: unknown, _saveGameId: string, _seasonId: string, _week: number, status: MatchStatus) =>
        status === MatchStatus.IN_PROGRESS ? 0 : 1,
    );
    seasonSimulationCommandRepositoryMock.markWeekMatchesInProgress.mockResolvedValue({
      count: 1,
    });
    seasonSimulationCommandRepositoryMock.markMatchSimulationStarted.mockResolvedValue({});
    const context = {
      matchId: "match-1",
      simulationSeed: "seed-1",
      homeTeam: {
        id: "home",
      },
      awayTeam: {
        id: "away",
      },
    };
    const resultPayload = {
      finalScore: {
        home: 24,
        away: 17,
      },
    };
    buildMatchContextMock.mockReturnValue(context);
    generateMatchStatsMock.mockReturnValue(resultPayload);
    persistMatchResultMock.mockResolvedValue(undefined);
    seasonSimulationCommandRepositoryMock.updateSeason.mockResolvedValue({});
    seasonSimulationCommandRepositoryMock.touchSaveGame.mockResolvedValue({});

    const result = await simulateSeasonWeekForUser({
      userId: "user-1",
      saveGameId: "save-1",
      seasonId: "season-1",
    });

    expect(seasonSimulationCommandRepositoryMock.markWeekMatchesInProgress).toHaveBeenCalledWith(
      {},
      "save-1",
      "season-1",
      1,
    );
    expect(seasonSimulationCommandRepositoryMock.markMatchSimulationStarted).toHaveBeenCalledWith(
      {},
      "match-1",
      "seed-1",
      expect.any(Date),
    );
    expect(assertTeamCanSimulateMock).toHaveBeenCalledTimes(2);
    expect(persistMatchResultMock).toHaveBeenCalledWith({}, context, resultPayload);
    expect(seasonSimulationCommandRepositoryMock.updateSeason).toHaveBeenCalledWith(
      {},
      "season-1",
      expect.objectContaining({
        phase: SeasonPhase.REGULAR_SEASON,
        week: 2,
      }),
    );
    expect(seasonSimulationCommandRepositoryMock.touchSaveGame).toHaveBeenCalledWith(
      {},
      "save-1",
    );
    expect(result).toEqual({
      seasonId: "season-1",
      simulatedWeek: 1,
      simulatedMatchCount: 1,
      phase: SeasonPhase.REGULAR_SEASON,
      nextWeek: 2,
      orchestrator: expect.objectContaining({
        jobId: "save-1:season-1:week-1",
        status: "COMPLETED",
        matchIds: ["match-1"],
        steps: expect.arrayContaining([
          expect.objectContaining({
            id: "lock",
            status: "COMPLETED",
          }),
          expect.objectContaining({
            id: "simulate",
            status: "COMPLETED",
          }),
          expect.objectContaining({
            id: "persist-game-output",
            status: "COMPLETED",
          }),
          expect.objectContaining({
            id: "persist-stats",
            status: "COMPLETED",
          }),
          expect.objectContaining({
            id: "generate-readmodels",
            status: "SKIPPED",
          }),
          expect.objectContaining({
            id: "unlock",
            status: "COMPLETED",
          }),
        ]),
      }),
    });
  });
});
