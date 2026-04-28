import { describe, expect, it } from "vitest";

import { InjuryStatus, PlayerStatus } from "@/modules/shared/domain/enums";

import { buildPlayerConditionUpdate, buildWeeklyRecoveryUpdate } from "./player-condition";
import type {
  MatchSimulationResult,
  PlayerSimulationLine,
  SimulationPlayerContext,
} from "./simulation.types";

function createPlayer(overrides: Partial<SimulationPlayerContext> = {}): SimulationPlayerContext {
  return {
    id: "player-1",
    teamId: "team-1",
    firstName: "Jordan",
    lastName: "Stone",
    age: 26,
    developmentTrait: "NORMAL",
    potentialRating: 78,
    positionCode: "WR",
    secondaryPositionCode: null,
    rosterStatus: "BACKUP",
    depthChartSlot: 2,
    captainFlag: false,
    developmentFocus: false,
    injuryRisk: 55,
    status: "ACTIVE",
    injuryStatus: "HEALTHY",
    injuryName: null,
    injuryEndsOn: null,
    fatigue: 22,
    morale: 61,
    positionOverall: 76,
    offensiveOverall: 76,
    defensiveOverall: null,
    specialTeamsOverall: null,
    physicalOverall: 75,
    mentalOverall: 69,
    attributes: {
      DURABILITY: 70,
      TOUGHNESS: 72,
      HANDS: 74,
      SPEED: 76,
      ACCELERATION: 77,
      BALL_SECURITY: 71,
      ELUSIVENESS: 68,
    },
    gameDayAvailability: "ACTIVE" as const,
    gameDayReadinessMultiplier: 1,
    gameDaySnapMultiplier: 1,
    seasonStat: null,
    careerStat: null,
    ...overrides,
  };
}

function createLine(overrides: Partial<PlayerSimulationLine> = {}): PlayerSimulationLine {
  return {
    playerId: "player-1",
    teamId: "team-1",
    started: false,
    snapsOffense: 24,
    snapsDefense: 0,
    snapsSpecialTeams: 0,
    passing: {
      attempts: 0,
      completions: 0,
      yards: 0,
      touchdowns: 0,
      interceptions: 0,
      sacksTaken: 0,
      sackYardsLost: 0,
      longestCompletion: 0,
    },
    rushing: {
      attempts: 0,
      yards: 0,
      touchdowns: 0,
      fumbles: 0,
      longestRush: 0,
      brokenTackles: 0,
    },
    receiving: {
      targets: 4,
      receptions: 3,
      yards: 44,
      touchdowns: 0,
      drops: 0,
      longestReception: 18,
      yardsAfterCatch: 11,
    },
    blocking: {
      passBlockSnaps: 0,
      runBlockSnaps: 0,
      sacksAllowed: 0,
      pressuresAllowed: 0,
      pancakes: 0,
    },
    defensive: {
      tackles: 0,
      assistedTackles: 0,
      tacklesForLoss: 0,
      sacks: 0,
      quarterbackHits: 0,
      passesDefended: 0,
      interceptions: 0,
      forcedFumbles: 0,
      fumbleRecoveries: 0,
      defensiveTouchdowns: 0,
      coverageSnaps: 0,
      targetsAllowed: 0,
      receptionsAllowed: 0,
      yardsAllowed: 0,
    },
    kicking: {
      fieldGoalsMade: 0,
      fieldGoalsAttempted: 0,
      fieldGoalsMadeShort: 0,
      fieldGoalsAttemptedShort: 0,
      fieldGoalsMadeMid: 0,
      fieldGoalsAttemptedMid: 0,
      fieldGoalsMadeLong: 0,
      fieldGoalsAttemptedLong: 0,
      extraPointsMade: 0,
      extraPointsAttempted: 0,
      longestFieldGoal: 0,
      kickoffTouchbacks: 0,
    },
    punting: {
      punts: 0,
      puntYards: 0,
      netPuntYards: 0,
      fairCatchesForced: 0,
      hangTimeTotalTenths: 0,
      puntsInside20: 0,
      touchbacks: 0,
      longestPunt: 0,
    },
    returns: {
      kickReturns: 0,
      kickReturnYards: 0,
      kickReturnTouchdowns: 0,
      kickReturnFumbles: 0,
      puntReturns: 0,
      puntReturnYards: 0,
      puntReturnTouchdowns: 0,
      puntReturnFumbles: 0,
    },
    ...overrides,
  };
}

function createResult(overrides: Partial<Pick<MatchSimulationResult, "awayScore" | "homeScore">> = {}): MatchSimulationResult {
  const homeScore = overrides.homeScore ?? 24;
  const awayScore = overrides.awayScore ?? 17;

  return {
    matchId: "match-1",
    simulationSeed: "match-seed-1",
    totalDrivesPlanned: 22,
    homeScore,
    awayScore,
    homeTeam: {
      teamId: "team-1",
      score: homeScore,
      touchdowns: 3,
      firstDowns: 19,
      totalYards: 344,
      passingYards: 238,
      rushingYards: 106,
      turnovers: 1,
      sacks: 2,
      explosivePlays: 7,
      redZoneTrips: 3,
      redZoneTouchdowns: 2,
      penalties: 5,
      timeOfPossessionSeconds: 1900,
    },
    awayTeam: {
      teamId: "team-2",
      score: awayScore,
      touchdowns: 2,
      firstDowns: 16,
      totalYards: 287,
      passingYards: 201,
      rushingYards: 86,
      turnovers: 2,
      sacks: 1,
      explosivePlays: 4,
      redZoneTrips: 2,
      redZoneTouchdowns: 1,
      penalties: 6,
      timeOfPossessionSeconds: 1700,
    },
    playerLines: [],
    drives: [],
  };
}

describe("buildPlayerConditionUpdate", () => {
  it("preserves an existing injury when no new injury occurs", () => {
    const scheduledAt = new Date("2026-09-08T18:00:00.000Z");
    const player = createPlayer({
      status: PlayerStatus.ACTIVE,
      injuryStatus: InjuryStatus.QUESTIONABLE,
      injuryName: "Hamstring Tightness",
      injuryEndsOn: new Date("2026-09-15T18:00:00.000Z"),
    });

    const update = buildPlayerConditionUpdate(
      player,
      createLine(),
      createResult(),
      scheduledAt,
      () => 0.99,
    );

    expect(update.status).toBe(PlayerStatus.ACTIVE);
    expect(update.injuryStatus).toBe(InjuryStatus.QUESTIONABLE);
    expect(update.injuryName).toBe("Hamstring Tightness");
    expect(update.injuryEndsOn?.toISOString()).toBe("2026-09-15T18:00:00.000Z");
  });

  it("writes a new injury when the injury roll hits", () => {
    const scheduledAt = new Date("2026-09-08T18:00:00.000Z");
    const player = createPlayer();

    const update = buildPlayerConditionUpdate(
      player,
      createLine(),
      createResult(),
      scheduledAt,
      (() => {
        const rolls = [0.01, 0.99];
        let index = 0;
        return () => {
          const value = rolls[index] ?? rolls[rolls.length - 1];
          index += 1;
          return value;
        };
      })(),
    );

    expect(update.status).toBe(PlayerStatus.INJURED);
    expect(update.injuryStatus).toBe(InjuryStatus.INJURED_RESERVE);
    expect(update.injuryName).toBeTruthy();
    expect(update.injuryEndsOn).not.toBeNull();
  });

  it("adds meaningful fatigue after high match load", () => {
    const scheduledAt = new Date("2026-09-08T18:00:00.000Z");
    const update = buildPlayerConditionUpdate(
      createPlayer({ fatigue: 90 }),
      createLine({ started: true, snapsOffense: 56 }),
      createResult(),
      scheduledAt,
      () => 0.99,
    );

    expect(update.fatigue).toBe(96);
  });

  it("adds a small front-runner load for starters in clear wins", () => {
    const scheduledAt = new Date("2026-09-08T18:00:00.000Z");
    const update = buildPlayerConditionUpdate(
      createPlayer({ fatigue: 30 }),
      createLine({ started: true, snapsOffense: 42 }),
      createResult({ homeScore: 38, awayScore: 10 }),
      scheduledAt,
      () => 0.99,
    );

    expect(update.fatigue).toBe(44);
  });

  it("recovers high fatigue more strongly while respecting bounds", () => {
    expect(
      buildWeeklyRecoveryUpdate({
        fatigue: 82,
        injuryStatus: InjuryStatus.HEALTHY,
        morale: 58,
        status: PlayerStatus.ACTIVE,
      }),
    ).toEqual({
      fatigue: 63,
      morale: 59,
    });

    expect(
      buildWeeklyRecoveryUpdate({
        fatigue: 4,
        injuryStatus: InjuryStatus.HEALTHY,
        morale: 99,
        status: PlayerStatus.ACTIVE,
      }),
    ).toEqual({
      fatigue: 0,
      morale: 99,
    });
  });
});
