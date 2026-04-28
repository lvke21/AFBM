import { describe, expect, it } from "vitest";

import type { SeasonOverview } from "@/modules/seasons/domain/season.types";
import type { TeamDetail, TeamPlayerSummary } from "@/modules/teams/domain/team.types";

import { MAX_VISIBLE_INBOX_ITEMS, buildInboxState } from "./inbox-model";

function createPlayer(overrides: Partial<TeamPlayerSummary> = {}): TeamPlayerSummary {
  return {
    age: 25,
    archetypeName: null,
    captainFlag: false,
    currentContract: null,
    depthChartSlot: 1,
    detailRatings: [],
    developmentFocus: false,
    fatigue: 10,
    fullName: "Test Player",
    heightCm: 188,
    id: "player-1",
    injuryName: null,
    injuryStatus: "HEALTHY",
    keyAttributes: {
      awareness: 70,
      coverageRange: 70,
      discipline: 70,
      durability: 70,
      hands: 70,
      kickConsistency: 70,
      leadership: 70,
      linebackerCoverage: 70,
      linebackerManCoverage: 70,
      linebackerZoneCoverage: 70,
      mobility: 70,
      returnVision: 70,
      snapAccuracy: 70,
      snapVelocity: 70,
      speed: 70,
      strength: 70,
    },
    mentalOverall: 70,
    morale: 60,
    physicalOverall: 70,
    positionCode: "QB",
    positionGroupName: "Quarterback",
    positionName: "Quarterback",
    positionOverall: 72,
    potentialRating: 78,
    rosterStatus: "STARTER",
    schemeFitName: null,
    schemeFitScore: null,
    seasonLine: {
      fieldGoalsAttempted: 0,
      fieldGoalsMade: 0,
      gamesPlayed: 0,
      interceptions: 0,
      passesDefended: 0,
      passingInterceptions: 0,
      passingTouchdowns: 0,
      passingYards: 0,
      punts: 0,
      puntsInside20: 0,
      receptionsAllowed: 0,
      receivingTouchdowns: 0,
      receivingYards: 0,
      receptions: 0,
      returnFumbles: 0,
      returnTouchdowns: 0,
      returnYards: 0,
      rushingTouchdowns: 0,
      rushingYards: 0,
      sacks: 0,
      tackles: 0,
      targetsAllowed: 0,
      yardsAllowed: 0,
    },
    secondaryPositionCode: null,
    secondaryPositionName: null,
    status: "ACTIVE",
    weightKg: 100,
    yearsPro: 3,
    ...overrides,
  };
}

function createTeam(overrides: Partial<TeamDetail> = {}): TeamDetail {
  return {
    abbreviation: "BOS",
    cashBalance: 20_000_000,
    conferenceName: "East",
    contractOutlook: {
      activeCapCommitted: 100_000_000,
      expiringCap: 0,
      expiringPlayers: [],
    },
    currentRecord: "1-0",
    divisionName: "North",
    id: "team-1",
    managerControlled: true,
    morale: 70,
    name: "Boston Guardians",
    overallRating: 82,
    players: [
      createPlayer({ id: "qb-1", positionCode: "QB", depthChartSlot: 1 }),
      createPlayer({ id: "qb-2", positionCode: "QB", fullName: "Conflict QB", depthChartSlot: 1 }),
    ],
    recentDecisionEvents: [],
    recentFinanceEvents: [],
    salaryCapSpace: 4_000_000,
    schemes: {
      defense: "Zone",
      offense: "Balanced",
      specialTeams: "Field Position",
    },
    teamNeeds: [
      {
        needScore: 8,
        playerCount: 3,
        positionCode: "OL",
        positionName: "Offensive Line",
        starterAverage: 65,
        starterSchemeFit: 60,
        targetCount: 5,
      },
    ],
    ...overrides,
  };
}

function createSeason(overrides: Partial<SeasonOverview> = {}): SeasonOverview {
  return {
    championName: null,
    id: "season-1",
    matches: [
      {
        awayScore: null,
        awayTeamId: "team-2",
        awayTeamName: "New York Titans",
        homeScore: null,
        homeTeamId: "team-1",
        homeTeamName: "Boston Guardians",
        id: "match-1",
        kind: "REGULAR_SEASON",
        scheduledAt: new Date("2026-09-10T18:00:00Z"),
        status: "SCHEDULED",
        week: 2,
      },
    ],
    phase: "REGULAR_SEASON",
    playoffPicture: [],
    standings: [],
    week: 2,
    year: 2026,
    ...overrides,
  };
}

describe("inbox model", () => {
  it("prioritizes blockers before routine tasks and keeps direct action links", () => {
    const state = buildInboxState({
      saveGameId: "save-1",
      season: createSeason(),
      team: createTeam(),
    });

    expect(state.items[0].id).toBe("roster-depth-conflicts");
    expect(state.items[0].priority).toBe("critical");
    expect(state.items.every((item) => item.href && item.actionLabel)).toBe(true);
    expect(state.priorityCounts.critical).toBeGreaterThan(0);
  });

  it("puts live games at critical priority", () => {
    const state = buildInboxState({
      saveGameId: "save-1",
      season: createSeason({
        matches: [
          {
            ...createSeason().matches[0],
            status: "IN_PROGRESS",
          },
        ],
      }),
      team: createTeam({
        players: [createPlayer({ id: "qb-1", positionCode: "QB", depthChartSlot: 1 })],
        salaryCapSpace: 20_000_000,
        teamNeeds: [],
      }),
    });

    expect(state.items[0].id).toBe("game-live-match-1");
    expect(state.items[0].href).toBe("/app/savegames/save-1/game/live?matchId=match-1");
  });

  it("routes finance work to the standalone finance workspace", () => {
    const state = buildInboxState({
      saveGameId: "save-1",
      season: createSeason(),
      team: createTeam({
        players: [createPlayer({ id: "qb-1", positionCode: "QB", depthChartSlot: 1 })],
        salaryCapSpace: -1,
        teamNeeds: [],
      }),
    });
    const financeItem = state.items.find((item) => item.id === "finance-cap-negative");

    expect(financeItem?.href).toBe("/app/savegames/save-1/finance");
    expect(financeItem?.actionLabel).toBe("Finanzen pruefen");
  });

  it("keeps persisted task status and manual priority on generated tasks", () => {
    const state = buildInboxState({
      filter: "read",
      saveGameId: "save-1",
      season: createSeason(),
      taskStates: [
        {
          completedAt: null,
          hiddenAt: null,
          priorityOverride: "critical",
          readAt: new Date("2026-09-10T10:00:00Z"),
          status: "read",
          taskKey: "finance-cap-tight",
          updatedAt: new Date("2026-09-10T10:00:00Z"),
        },
      ],
      team: createTeam({
        players: [createPlayer({ id: "qb-1", positionCode: "QB", depthChartSlot: 1 })],
        salaryCapSpace: 4_000_000,
        teamNeeds: [],
      }),
    });
    const financeItem = state.items.find((item) => item.id === "finance-cap-tight");

    expect(financeItem?.status).toBe("read");
    expect(financeItem?.priority).toBe("critical");
    expect(financeItem?.basePriority).toBe("high");
    expect(state.taskStatusCounts.read).toBe(1);
  });

  it("filters open and read tasks as separate statuses", () => {
    const openState = buildInboxState({
      filter: "open",
      saveGameId: "save-1",
      season: createSeason(),
      taskStates: [
        {
          completedAt: null,
          hiddenAt: null,
          priorityOverride: null,
          readAt: new Date("2026-09-10T10:00:00Z"),
          status: "read",
          taskKey: "finance-cap-tight",
          updatedAt: new Date("2026-09-10T10:00:00Z"),
        },
      ],
      team: createTeam({
        players: [createPlayer({ id: "qb-1", positionCode: "QB", depthChartSlot: 1 })],
        salaryCapSpace: 4_000_000,
        teamNeeds: [],
      }),
    });
    const readState = buildInboxState({
      filter: "read",
      saveGameId: "save-1",
      season: createSeason(),
      taskStates: [
        {
          completedAt: null,
          hiddenAt: null,
          priorityOverride: null,
          readAt: new Date("2026-09-10T10:00:00Z"),
          status: "read",
          taskKey: "finance-cap-tight",
          updatedAt: new Date("2026-09-10T10:00:00Z"),
        },
      ],
      team: createTeam({
        players: [createPlayer({ id: "qb-1", positionCode: "QB", depthChartSlot: 1 })],
        salaryCapSpace: 4_000_000,
        teamNeeds: [],
      }),
    });

    expect(openState.items.map((item) => item.status)).not.toContain("read");
    expect(readState.items.map((item) => item.id)).toEqual(["finance-cap-tight"]);
    expect(readState.taskStatusCounts.open).toBeGreaterThan(0);
    expect(readState.taskStatusCounts.read).toBe(1);
  });

  it("filters done and hidden tasks without losing total task counts", () => {
    const doneState = buildInboxState({
      filter: "done",
      saveGameId: "save-1",
      season: createSeason(),
      taskStates: [
        {
          completedAt: new Date("2026-09-10T10:00:00Z"),
          hiddenAt: null,
          priorityOverride: null,
          readAt: new Date("2026-09-10T10:00:00Z"),
          status: "done",
          taskKey: "finance-cap-tight",
          updatedAt: new Date("2026-09-10T10:00:00Z"),
        },
        {
          completedAt: null,
          hiddenAt: new Date("2026-09-10T11:00:00Z"),
          priorityOverride: null,
          readAt: new Date("2026-09-10T11:00:00Z"),
          status: "hidden",
          taskKey: "game-next-match-1",
          updatedAt: new Date("2026-09-10T11:00:00Z"),
        },
      ],
      team: createTeam({
        players: [createPlayer({ id: "qb-1", positionCode: "QB", depthChartSlot: 1 })],
        salaryCapSpace: 4_000_000,
        teamNeeds: [],
      }),
    });

    expect(doneState.items.map((item) => item.id)).toEqual(["finance-cap-tight"]);
    expect(doneState.taskStatusCounts.done).toBe(1);
    expect(doneState.taskStatusCounts.hidden).toBe(1);
    expect(doneState.totalCount).toBeGreaterThan(doneState.items.length);
  });

  it("limits visible work so the inbox does not overload the user", () => {
    const noisyTeam = createTeam({
      contractOutlook: {
        activeCapCommitted: 110_000_000,
        expiringCap: 10_000_000,
        expiringPlayers: Array.from({ length: 4 }, (_, index) => ({
          capHit: 2_000_000,
          fullName: `Expiring ${index}`,
          id: `expiring-${index}`,
          positionCode: "WR",
          years: 1,
        })),
      },
      players: Array.from({ length: 12 }, (_, index) =>
        createPlayer({
          depthChartSlot: index === 0 ? 1 : index + 1,
          fullName: `Player ${index}`,
          id: `player-${index}`,
          injuryStatus: index < 4 ? "QUESTIONABLE" : "HEALTHY",
          positionCode: index < 2 ? "QB" : "WR",
        }),
      ),
      recentFinanceEvents: Array.from({ length: 4 }, (_, index) => ({
        amount: -1_000_000,
        capImpact: -1_000_000,
        cashBalanceAfter: 10_000_000 - index,
        description: `Finance event ${index}`,
        id: `finance-${index}`,
        occurredAt: new Date(`2026-09-${10 + index}T00:00:00Z`),
        playerName: null,
        type: "SIGNING_BONUS",
      })),
      teamNeeds: Array.from({ length: 7 }, (_, index) => ({
        needScore: 9 - index,
        playerCount: 2,
        positionCode: `P${index}`,
        positionName: `Position ${index}`,
        starterAverage: 60 + index,
        starterSchemeFit: 60,
        targetCount: 5,
      })),
    });
    const state = buildInboxState({
      limit: MAX_VISIBLE_INBOX_ITEMS,
      saveGameId: "save-1",
      season: createSeason(),
      team: noisyTeam,
    });

    expect(state.items).toHaveLength(MAX_VISIBLE_INBOX_ITEMS);
    expect(state.hiddenCount).toBeGreaterThan(0);
    expect(state.totalCount).toBeGreaterThan(MAX_VISIBLE_INBOX_ITEMS);
  });

  it("keeps sparse legacy team and season records renderable", () => {
    const state = buildInboxState({
      saveGameId: "save-1",
      season: {
        id: "season-1",
        phase: "REGULAR_SEASON",
        week: 1,
      } as SeasonOverview,
      team: {
        id: "team-1",
        abbreviation: "BOS",
        name: "Boston Guardians",
        salaryCapSpace: 20_000_000,
      } as TeamDetail,
    });

    expect(state.items).toEqual([]);
    expect(state.totalCount).toBe(0);
    expect(state.isEmpty).toBe(true);
  });
});
