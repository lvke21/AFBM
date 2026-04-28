import { createHash } from "node:crypto";

import { buildInitialRoster } from "../../../savegames/application/bootstrap/initial-roster";
import { MatchKind } from "../../../shared/domain/enums";

import { generateMatchStats } from "./match-engine";
import type {
  MatchSimulationResult,
  PlayerSimulationLine,
  SimulationMatchContext,
  SimulationStatAnchor,
  SimulationTeamContext,
  TeamSimulationResult,
} from "./simulation.types";

export const PRODUCTION_QA_REPORT_DATE = "2026-04-24";

export const PRODUCTION_QA_TEAMS = [
  ["BOS", "Boston", "Guardians", 0, 74],
  ["NYT", "New York", "Titans", 1, 78],
  ["MIA", "Miami", "Cyclones", 2, 76],
  ["CHI", "Chicago", "Voyagers", 3, 72],
  ["DAL", "Dallas", "Wranglers", 4, 80],
  ["SEA", "Seattle", "Phantoms", 5, 77],
  ["DEN", "Denver", "Mountaineers", 6, 75],
  ["ATL", "Atlanta", "Firebirds", 7, 73],
] as const;

export const PRODUCTION_REGRESSION_SCENARIOS = [
  { seed: "production-regression-seed-001", homeIndex: 0, awayIndex: 1, week: 1 },
  { seed: "production-regression-seed-002", homeIndex: 4, awayIndex: 5, week: 2 },
  { seed: "production-regression-seed-003", homeIndex: 2, awayIndex: 6, week: 3 },
  { seed: "production-regression-seed-004", homeIndex: 7, awayIndex: 3, week: 4 },
  { seed: "production-regression-seed-005", homeIndex: 1, awayIndex: 4, week: 5 },
  { seed: "production-regression-seed-006", homeIndex: 6, awayIndex: 0, week: 6 },
  { seed: "production-regression-seed-007", homeIndex: 5, awayIndex: 2, week: 7 },
  { seed: "production-regression-seed-008", homeIndex: 3, awayIndex: 7, week: 8 },
] as const;

export const EXPECTED_PRODUCTION_REGRESSION_FINGERPRINTS = {
  "production-regression-seed-001": "7d71f3ed5ef23aa8",
  "production-regression-seed-002": "091c461984237b57",
  "production-regression-seed-003": "eaa73a10bad12e29",
  "production-regression-seed-004": "a8e4646eb734f91b",
  "production-regression-seed-005": "0133e234b8e0529c",
  "production-regression-seed-006": "afe3f04939e7d779",
  "production-regression-seed-007": "263149ca26d7747a",
  "production-regression-seed-008": "2015ba1fc0d4888b",
} as const;

export type ProductionQaStatus = "GRUEN" | "ROT";

export type ProductionQaIssue = {
  severity: "critical" | "major" | "minor";
  category:
    | "clock"
    | "drive-log"
    | "edge-coverage"
    | "missing-values"
    | "performance"
    | "player-assignment"
    | "plausibility"
    | "reporting-gap"
    | "scoreboard"
    | "seed-regression"
    | "team-aggregation";
  scope: string;
  message: string;
};

export type ProductionQaGameRecord = {
  context: SimulationMatchContext;
  result: MatchSimulationResult;
  elapsedMs: number;
  issues: ProductionQaIssue[];
};

export type ProductionQaNumericSummary = {
  avg: number;
  min: number;
  max: number;
  p10: number;
  median: number;
  p90: number;
  stdDev: number;
};

export type ProductionQaAggregate = {
  summaries: {
    pointsPerGame: ProductionQaNumericSummary;
    totalYardsPerGame: ProductionQaNumericSummary;
    totalYardsPerTeam: ProductionQaNumericSummary;
    passingYardsPerTeam: ProductionQaNumericSummary;
    rushingYardsPerTeam: ProductionQaNumericSummary;
    passRatePerTeam: ProductionQaNumericSummary;
    firstDownsPerTeam: ProductionQaNumericSummary;
    turnoversPerTeam: ProductionQaNumericSummary;
    sacksPerTeam: ProductionQaNumericSummary;
    penaltiesPerTeam: ProductionQaNumericSummary;
    explosivePlaysPerTeam: ProductionQaNumericSummary;
    redZoneEfficiency: ProductionQaNumericSummary;
    drivesPerGame: ProductionQaNumericSummary;
    totalTopPerGameSeconds: ProductionQaNumericSummary;
    runtimePerGameMs: ProductionQaNumericSummary;
  };
  derived: {
    thirdDownConversionAvailable: boolean;
    playByPlayAvailable: boolean;
  };
};

export type ProductionQaAssessment = {
  status: ProductionQaStatus;
  technicalStatus: ProductionQaStatus;
  qualityStatus: ProductionQaStatus;
  observabilityStatus: ProductionQaStatus;
  aggregate: ProductionQaAggregate;
  issues: ProductionQaIssue[];
  qualityFindings: string[];
  observabilityFindings: string[];
  flags: {
    expectedGameCount: number;
    simulatedGameCount: number;
    criticalCount: number;
    majorCount: number;
    technicalIssueCount: number;
    performanceAcceptable: boolean;
    allClockTotalsValid: boolean;
  };
};

export type ProductionQaRunResult = {
  suiteName: string;
  expectedGameCount: number;
  games: ProductionQaGameRecord[];
  suiteElapsedMs: number;
  assessment: ProductionQaAssessment;
};

export type ProductionQaRegressionRecord = {
  seed: string;
  matchId: string;
  fingerprint: string;
  repeatedFingerprint: string;
  identical: boolean;
  score: string;
  totalYards: number;
  drives: number;
};

export type ProductionQaEdgeCaseResult = {
  status: ProductionQaStatus;
  scannedGames: number;
  endgameDriveCount: number;
  lateTrailingDecisionCount: number;
  blowoutGameCount: number;
  garbageTimeDecisionCount: number;
  redZoneStopCount: number;
  backedUpDriveCount: number;
  playoffDecisive: boolean;
  issues: ProductionQaIssue[];
};

type CreateMatchContextOptions = {
  matchId?: string;
  seed?: string;
  saveGameId?: string;
  seasonId?: string;
  seasonYear?: number;
  week?: number;
  kind?: MatchKind;
  scheduledAt?: Date;
  homeIndex?: number;
  awayIndex?: number;
  homeTeam?: SimulationTeamContext;
  awayTeam?: SimulationTeamContext;
};

function createStatAnchor(id: string): SimulationStatAnchor {
  return {
    id,
    passingLongestCompletion: 0,
    rushingLongestRush: 0,
    receivingLongestReception: 0,
    kickingLongestFieldGoal: 0,
    puntingLongestPunt: 0,
  };
}

export function buildProductionSimulationTeam(
  teamId: string,
  city: string,
  nickname: string,
  rosterIndex: number,
  prestige: number,
): SimulationTeamContext {
  const roster = buildInitialRoster(rosterIndex, prestige, 2026).map((seed, index) => ({
    id: `${teamId}-player-${index}`,
    teamId,
    firstName: seed.firstName,
    lastName: seed.lastName,
    age: seed.age,
    developmentTrait: seed.developmentTrait,
    potentialRating: seed.potentialRating,
    positionCode: seed.primaryPositionCode,
    secondaryPositionCode: seed.secondaryPositionCode ?? null,
    rosterStatus: seed.rosterStatus,
    depthChartSlot: seed.depthChartSlot,
    captainFlag: seed.captainFlag,
    developmentFocus: false,
    injuryRisk: seed.injuryRisk,
    status: "ACTIVE",
    injuryStatus: "HEALTHY",
    injuryName: null,
    injuryEndsOn: null,
    fatigue: seed.fatigue,
    morale: seed.morale,
    positionOverall: seed.positionOverall,
    offensiveOverall: seed.offensiveOverall ?? null,
    defensiveOverall: seed.defensiveOverall ?? null,
    specialTeamsOverall: seed.specialTeamsOverall ?? null,
    physicalOverall: seed.physicalOverall,
    mentalOverall: seed.mentalOverall,
    attributes: Object.fromEntries(
      Object.entries(seed.attributes).filter((entry): entry is [string, number] => entry[1] != null),
    ),
    gameDayAvailability: "ACTIVE" as const,
    gameDayReadinessMultiplier: 1,
    gameDaySnapMultiplier: 1,
    seasonStat: createStatAnchor(`season-${teamId}-${index}`),
    careerStat: createStatAnchor(`career-${teamId}-${index}`),
  }));

  return {
    id: teamId,
    city,
    nickname,
    abbreviation: teamId,
    overallRating: prestige,
    roster,
  };
}

export function cloneProductionTeam(team: SimulationTeamContext): SimulationTeamContext {
  return {
    ...team,
    roster: team.roster.map((player) => ({
      ...player,
      attributes: { ...player.attributes },
      seasonStat: player.seasonStat ? { ...player.seasonStat } : null,
      careerStat: player.careerStat ? { ...player.careerStat } : null,
    })),
  };
}

export function createProductionMatchContext(
  index: number,
  options: CreateMatchContextOptions = {},
): SimulationMatchContext {
  const teams = PRODUCTION_QA_TEAMS.map(([id, city, nickname, rosterIndex, prestige]) =>
    buildProductionSimulationTeam(id, city, nickname, rosterIndex, prestige),
  );
  const homeIndex = options.homeIndex ?? index % teams.length;
  const rawAwayIndex = options.awayIndex ?? (index * 3 + 1) % teams.length;
  const awayIndex = rawAwayIndex === homeIndex ? (rawAwayIndex + 2) % teams.length : rawAwayIndex;

  return {
    matchId: options.matchId ?? `production-qa-match-${index + 1}`,
    saveGameId: options.saveGameId ?? "production-qa-savegame",
    seasonId: options.seasonId ?? "production-qa-season-2026",
    kind: options.kind ?? MatchKind.REGULAR_SEASON,
    simulationSeed: options.seed ?? `production-qa-seed-${index + 1}`,
    seasonYear: options.seasonYear ?? 2026,
    week: options.week ?? (index % 18) + 1,
    scheduledAt: options.scheduledAt ?? new Date(Date.UTC(2026, 8, 1 + (index % 28), 18, 0, 0)),
    homeTeam: options.homeTeam ?? cloneProductionTeam(teams[homeIndex]),
    awayTeam: options.awayTeam ?? cloneProductionTeam(teams[awayIndex]),
  };
}

export function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

export function average(values: number[]) {
  return values.length === 0 ? 0 : sum(values) / values.length;
}

export function percentile(values: number[], fraction: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = (sorted.length - 1) * fraction;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const lower = sorted[lowerIndex] ?? sorted[0] ?? 0;
  const upper = sorted[upperIndex] ?? sorted[sorted.length - 1] ?? 0;
  const weight = index - lowerIndex;

  return lower + (upper - lower) * weight;
}

export function standardDeviation(values: number[]) {
  if (values.length <= 1) {
    return 0;
  }

  const mean = average(values);
  const variance =
    values.reduce((total, value) => total + (value - mean) ** 2, 0) /
    values.length;

  return Math.sqrt(variance);
}

export function summarize(values: number[]): ProductionQaNumericSummary {
  if (values.length === 0) {
    return {
      avg: 0,
      min: 0,
      max: 0,
      p10: 0,
      median: 0,
      p90: 0,
      stdDev: 0,
    };
  }

  return {
    avg: average(values),
    min: Math.min(...values),
    max: Math.max(...values),
    p10: percentile(values, 0.1),
    median: percentile(values, 0.5),
    p90: percentile(values, 0.9),
    stdDev: standardDeviation(values),
  };
}

export function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function flattenNumbers(line: PlayerSimulationLine) {
  const values: Array<[string, number]> = [];

  for (const [sectionKey, sectionValue] of Object.entries(line)) {
    if (typeof sectionValue === "number") {
      values.push([sectionKey, sectionValue]);
      continue;
    }

    if (sectionValue && typeof sectionValue === "object") {
      for (const [key, value] of Object.entries(sectionValue)) {
        if (typeof value === "number") {
          values.push([`${sectionKey}.${key}`, value]);
        }
      }
    }
  }

  return values;
}

function teamPlayerLines(result: MatchSimulationResult, team: TeamSimulationResult) {
  return result.playerLines.filter((line) => line.teamId === team.teamId);
}

function validateTeamRollup(
  result: MatchSimulationResult,
  team: TeamSimulationResult,
  issues: ProductionQaIssue[],
) {
  const playerLines = teamPlayerLines(result, team);
  const playerPassingYards = sum(playerLines.map((line) => line.passing.yards));
  const playerRushingYards = sum(playerLines.map((line) => line.rushing.yards));

  if (team.totalYards !== team.passingYards + team.rushingYards) {
    issues.push({
      severity: "critical",
      category: "team-aggregation",
      scope: `${result.matchId}:${team.teamId}`,
      message: `Total yards mismatch (${team.totalYards} vs ${team.passingYards + team.rushingYards}).`,
    });
  }

  if (team.passingYards !== playerPassingYards || team.rushingYards !== playerRushingYards) {
    issues.push({
      severity: "critical",
      category: "team-aggregation",
      scope: `${result.matchId}:${team.teamId}`,
      message: "Team yards do not match player rollups.",
    });
  }

  if (team.timeOfPossessionSeconds < 0) {
    issues.push({
      severity: "critical",
      category: "clock",
      scope: `${result.matchId}:${team.teamId}`,
      message: "Team time of possession is negative.",
    });
  }
}

export function validateProductionQaGame(
  context: SimulationMatchContext,
  result: MatchSimulationResult,
): ProductionQaIssue[] {
  const issues: ProductionQaIssue[] = [];
  const rosterByPlayerId = new Map(
    [...context.homeTeam.roster, ...context.awayTeam.roster].map((player) => [player.id, player]),
  );
  const seenDriveSequences = new Set<number>();

  if (result.simulationSeed !== context.simulationSeed) {
    issues.push({
      severity: "critical",
      category: "seed-regression",
      scope: result.matchId,
      message: "Result simulationSeed does not match the context seed.",
    });
  }

  if (result.homeScore < 0 || result.awayScore < 0) {
    issues.push({
      severity: "critical",
      category: "scoreboard",
      scope: result.matchId,
      message: "Final score must not be negative.",
    });
  }

  const totalTop =
    result.homeTeam.timeOfPossessionSeconds +
    result.awayTeam.timeOfPossessionSeconds;

  if (context.kind === MatchKind.REGULAR_SEASON && totalTop !== 3600) {
    issues.push({
      severity: "critical",
      category: "clock",
      scope: result.matchId,
      message: `Regulation TOP must equal 3600 seconds, got ${totalTop}.`,
    });
  }

  if (result.drives.length === 0) {
    issues.push({
      severity: "critical",
      category: "drive-log",
      scope: result.matchId,
      message: "Simulation produced no drive log entries.",
    });
  }

  if (result.totalDrivesPlanned < result.drives.length) {
    issues.push({
      severity: "major",
      category: "drive-log",
      scope: result.matchId,
      message: "Persisted drive count exceeds planned drive count.",
    });
  }

  for (const drive of result.drives) {
    if (seenDriveSequences.has(drive.sequence)) {
      issues.push({
        severity: "critical",
        category: "drive-log",
        scope: `${result.matchId}:drive:${drive.sequence}`,
        message: "Drive sequence duplicated.",
      });
    }

    seenDriveSequences.add(drive.sequence);

    const expectedSequence = seenDriveSequences.size;
    if (drive.sequence !== expectedSequence) {
      issues.push({
        severity: "critical",
        category: "drive-log",
        scope: `${result.matchId}:drive:${drive.sequence}`,
        message: `Drive sequence is not contiguous; expected ${expectedSequence}.`,
      });
    }

    if (drive.sequence > 1) {
      const previous = result.drives[drive.sequence - 2];

      if (
        previous &&
        (previous.endedHomeScore !== drive.startedHomeScore ||
          previous.endedAwayScore !== drive.startedAwayScore)
      ) {
        issues.push({
          severity: "critical",
          category: "scoreboard",
          scope: `${result.matchId}:drive:${drive.sequence}`,
          message: "Drive scoreboard progression is inconsistent.",
        });
      }
    }

    const homeDelta = drive.endedHomeScore - drive.startedHomeScore;
    const awayDelta = drive.endedAwayScore - drive.startedAwayScore;

    if (homeDelta < 0 || awayDelta < 0) {
      issues.push({
        severity: "critical",
        category: "scoreboard",
        scope: `${result.matchId}:drive:${drive.sequence}`,
        message: "Drive score moved backwards.",
      });
    }

    if (homeDelta + awayDelta !== drive.pointsScored) {
      issues.push({
        severity: "major",
        category: "scoreboard",
        scope: `${result.matchId}:drive:${drive.sequence}`,
        message: "Drive pointsScored does not match scoreboard delta.",
      });
    }

    if (drive.plays < 0 || drive.passAttempts < 0 || drive.rushAttempts < 0 || drive.totalYards < 0) {
      issues.push({
        severity: "major",
        category: "drive-log",
        scope: `${result.matchId}:drive:${drive.sequence}`,
        message: "Drive contains a negative count.",
      });
    }
  }

  validateTeamRollup(result, result.homeTeam, issues);
  validateTeamRollup(result, result.awayTeam, issues);

  for (const line of result.playerLines) {
    const rosterPlayer = rosterByPlayerId.get(line.playerId);

    if (!rosterPlayer || rosterPlayer.teamId !== line.teamId) {
      issues.push({
        severity: "critical",
        category: "player-assignment",
        scope: `${result.matchId}:${line.playerId}`,
        message: "Player stat line is not aligned with roster team assignment.",
      });
    }

    for (const [key, value] of flattenNumbers(line)) {
      if (!Number.isFinite(value)) {
        issues.push({
          severity: "critical",
          category: "missing-values",
          scope: `${result.matchId}:${line.playerId}:${key}`,
          message: "Non-finite stat value.",
        });
      } else if (value < 0) {
        issues.push({
          severity: "major",
          category: "plausibility",
          scope: `${result.matchId}:${line.playerId}:${key}`,
          message: "Negative stat value.",
        });
      }
    }
  }

  return issues;
}

export function runProductionQaGames(input: {
  suiteName: string;
  gameCount: number;
  seedPrefix: string;
}): ProductionQaRunResult {
  const games: ProductionQaGameRecord[] = [];
  const suiteStart = process.hrtime.bigint();

  for (let index = 0; index < input.gameCount; index += 1) {
    const context = createProductionMatchContext(index, {
      matchId: `${input.suiteName.toLowerCase().replaceAll(/\s+/g, "-")}-${index + 1}`,
      seed: `${input.seedPrefix}-${index + 1}`,
    });
    const startedAt = process.hrtime.bigint();
    const result = generateMatchStats(context);
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    games.push({
      context,
      result,
      elapsedMs,
      issues: validateProductionQaGame(context, result),
    });
  }

  const suiteElapsedMs = Number(process.hrtime.bigint() - suiteStart) / 1_000_000;
  const assessment = assessProductionQaGames(games, input.gameCount);

  return {
    suiteName: input.suiteName,
    expectedGameCount: input.gameCount,
    games,
    suiteElapsedMs,
    assessment,
  };
}

export function buildProductionQaAggregate(games: ProductionQaGameRecord[]): ProductionQaAggregate {
  const teamResults = games.flatMap((game) => [game.result.homeTeam, game.result.awayTeam]);
  const passRates = games.flatMap((game) =>
    [game.result.homeTeam, game.result.awayTeam].map((team) => {
      const lines = teamPlayerLines(game.result, team);
      const passAttempts = sum(lines.map((line) => line.passing.attempts));
      const rushAttempts = sum(lines.map((line) => line.rushing.attempts));

      return passAttempts / Math.max(1, passAttempts + rushAttempts);
    }),
  );

  return {
    summaries: {
      pointsPerGame: summarize(games.map((game) => game.result.homeScore + game.result.awayScore)),
      totalYardsPerGame: summarize(
        games.map((game) => game.result.homeTeam.totalYards + game.result.awayTeam.totalYards),
      ),
      totalYardsPerTeam: summarize(teamResults.map((team) => team.totalYards)),
      passingYardsPerTeam: summarize(teamResults.map((team) => team.passingYards)),
      rushingYardsPerTeam: summarize(teamResults.map((team) => team.rushingYards)),
      passRatePerTeam: summarize(passRates),
      firstDownsPerTeam: summarize(teamResults.map((team) => team.firstDowns)),
      turnoversPerTeam: summarize(teamResults.map((team) => team.turnovers)),
      sacksPerTeam: summarize(teamResults.map((team) => team.sacks)),
      penaltiesPerTeam: summarize(teamResults.map((team) => team.penalties)),
      explosivePlaysPerTeam: summarize(teamResults.map((team) => team.explosivePlays)),
      redZoneEfficiency: summarize(
        teamResults.map((team) => team.redZoneTouchdowns / Math.max(1, team.redZoneTrips)),
      ),
      drivesPerGame: summarize(games.map((game) => game.result.drives.length)),
      totalTopPerGameSeconds: summarize(
        games.map(
          (game) =>
            game.result.homeTeam.timeOfPossessionSeconds +
            game.result.awayTeam.timeOfPossessionSeconds,
        ),
      ),
      runtimePerGameMs: summarize(games.map((game) => game.elapsedMs)),
    },
    derived: {
      thirdDownConversionAvailable: false,
      playByPlayAvailable: false,
    },
  };
}

export function assessProductionQaGames(
  games: ProductionQaGameRecord[],
  expectedGameCount: number,
): ProductionQaAssessment {
  const aggregate = buildProductionQaAggregate(games);
  const issues = games.flatMap((game) => game.issues);
  const qualityFindings: string[] = [];
  const observabilityFindings: string[] = [];
  const allClockTotalsValid = games.every(
    (game) =>
      game.result.homeTeam.timeOfPossessionSeconds +
        game.result.awayTeam.timeOfPossessionSeconds ===
      3600,
  );
  const performanceAcceptable =
    aggregate.summaries.runtimePerGameMs.avg <= 20 &&
    aggregate.summaries.runtimePerGameMs.p90 <= 40;

  if (games.length !== expectedGameCount) {
    issues.push({
      severity: "critical",
      category: "missing-values",
      scope: "suite",
      message: `Expected ${expectedGameCount} games, simulated ${games.length}.`,
    });
  }

  if (!performanceAcceptable) {
    issues.push({
      severity: "major",
      category: "performance",
      scope: "suite",
      message: `Runtime is too high: avg ${round(aggregate.summaries.runtimePerGameMs.avg, 2)} ms, p90 ${round(aggregate.summaries.runtimePerGameMs.p90, 2)} ms.`,
    });
  }

  const avgPoints = aggregate.summaries.pointsPerGame.avg;
  const avgTeamYards = aggregate.summaries.totalYardsPerTeam.avg;
  const avgTurnovers = aggregate.summaries.turnoversPerTeam.avg;
  const avgSacks = aggregate.summaries.sacksPerTeam.avg;
  const avgPenalties = aggregate.summaries.penaltiesPerTeam.avg;
  const avgExplosive = aggregate.summaries.explosivePlaysPerTeam.avg;
  const avgRedZone = aggregate.summaries.redZoneEfficiency.avg;
  const avgPassRate = aggregate.summaries.passRatePerTeam.avg;

  if (avgPoints < 30 || avgPoints > 80) {
    qualityFindings.push(`Punkte pro Spiel ausserhalb Zielkorridor 30-80: ${round(avgPoints)}.`);
  }

  if (avgTeamYards < 250 || avgTeamYards > 550) {
    qualityFindings.push(`Total Yards pro Team ausserhalb Zielkorridor 250-550: ${round(avgTeamYards)}.`);
  }

  if (avgTurnovers < 0.8 || avgTurnovers > 3) {
    qualityFindings.push(`Turnovers pro Team ausserhalb Zielkorridor 0.8-3.0: ${round(avgTurnovers)}.`);
  }

  if (avgSacks < 1 || avgSacks > 5) {
    qualityFindings.push(`Sacks pro Team ausserhalb Zielkorridor 1.0-5.0: ${round(avgSacks)}.`);
  }

  if (avgPenalties < 3 || avgPenalties > 9) {
    qualityFindings.push(`Penalties pro Team ausserhalb Zielkorridor 3.0-9.0: ${round(avgPenalties)}.`);
  }

  if (avgExplosive > 10) {
    qualityFindings.push(`Explosive Plays pro Team zu hoch, Ziel <= 10: ${round(avgExplosive)}.`);
  }

  if (avgRedZone > 0.85) {
    qualityFindings.push(`Red-Zone-Effizienz zu hoch, Ziel <= 85%: ${round(avgRedZone * 100)}%.`);
  }

  if (avgPassRate < 0.4 || avgPassRate > 0.72) {
    qualityFindings.push(`Passquote ausserhalb Zielkorridor 40%-72%: ${round(avgPassRate * 100)}%.`);
  }

  if (!aggregate.derived.thirdDownConversionAvailable) {
    observabilityFindings.push("3rd-Down-Conversion ist nicht als nativer Simulationsoutput verfuegbar.");
  }

  if (!aggregate.derived.playByPlayAvailable) {
    observabilityFindings.push("Play-by-Play ist nicht als nativer Simulationsoutput verfuegbar.");
  }

  const technicalIssueCount = issues.filter(
    (issue) => issue.severity === "critical" || issue.severity === "major",
  ).length;
  const criticalCount = issues.filter((issue) => issue.severity === "critical").length;
  const majorCount = issues.filter((issue) => issue.severity === "major").length;
  const technicalStatus =
    technicalIssueCount === 0 &&
    games.length === expectedGameCount &&
    performanceAcceptable &&
    allClockTotalsValid
      ? "GRUEN"
      : "ROT";
  const qualityStatus = qualityFindings.length === 0 ? "GRUEN" : "ROT";
  const observabilityStatus = observabilityFindings.length === 0 ? "GRUEN" : "ROT";
  const status =
    technicalStatus === "GRUEN" &&
    qualityStatus === "GRUEN" &&
    observabilityStatus === "GRUEN"
      ? "GRUEN"
      : "ROT";

  return {
    status,
    technicalStatus,
    qualityStatus,
    observabilityStatus,
    aggregate,
    issues,
    qualityFindings,
    observabilityFindings,
    flags: {
      expectedGameCount,
      simulatedGameCount: games.length,
      criticalCount,
      majorCount,
      technicalIssueCount,
      performanceAcceptable,
      allClockTotalsValid,
    },
  };
}

export function fingerprintMatchResult(result: MatchSimulationResult) {
  return createHash("sha256").update(JSON.stringify(result)).digest("hex").slice(0, 16);
}

export function runSeedRegressionQa(): ProductionQaRegressionRecord[] {
  return PRODUCTION_REGRESSION_SCENARIOS.map((scenario, index) => {
    const context = createProductionMatchContext(index, {
      matchId: `production-regression-${index + 1}`,
      seed: scenario.seed,
      week: scenario.week,
      homeIndex: scenario.homeIndex,
      awayIndex: scenario.awayIndex,
    });
    const first = generateMatchStats(context);
    const second = generateMatchStats(context);
    const fingerprint = fingerprintMatchResult(first);
    const repeatedFingerprint = fingerprintMatchResult(second);

    return {
      seed: scenario.seed,
      matchId: context.matchId,
      fingerprint,
      repeatedFingerprint,
      identical: JSON.stringify(first) === JSON.stringify(second),
      score: `${first.homeScore}-${first.awayScore}`,
      totalYards: first.homeTeam.totalYards + first.awayTeam.totalYards,
      drives: first.drives.length,
    };
  });
}

export function assessEdgeCases(games: ProductionQaGameRecord[]): ProductionQaEdgeCaseResult {
  const issues: ProductionQaIssue[] = [];
  const drives = games.flatMap((game) => game.result.drives);
  const endgameDriveCount = drives.filter(
    (drive) =>
      drive.phaseLabel === "Q4" &&
      drive.startSecondsRemainingInGame != null &&
      drive.startSecondsRemainingInGame <= 300,
  ).length;
  const lateTrailingDecisionCount = drives.filter(
    (drive) =>
      drive.fourthDownScoreDelta != null &&
      drive.fourthDownScoreDelta < 0 &&
      drive.fourthDownSecondsRemaining != null &&
      drive.fourthDownSecondsRemaining <= 360,
  ).length;
  const blowoutGameCount = games.filter(
    (game) => Math.abs(game.result.homeScore - game.result.awayScore) >= 21,
  ).length;
  const garbageTimeDecisionCount = drives.filter(
    (drive) =>
      drive.fourthDownScoreDelta != null &&
      drive.fourthDownScoreDelta >= 17 &&
      drive.fourthDownSecondsRemaining != null &&
      drive.fourthDownSecondsRemaining <= 900,
  ).length;
  const redZoneStopCount = drives.filter(
    (drive) => drive.redZoneTrip && drive.resultType !== "TOUCHDOWN",
  ).length;
  const backedUpDriveCount = drives.filter(
    (drive) => drive.startFieldPosition != null && drive.startFieldPosition <= 20,
  ).length;
  const playoffContext = createProductionMatchContext(999, {
    matchId: "production-edge-playoff-decisive",
    seed: "production-edge-playoff-decisive-seed",
    kind: MatchKind.PLAYOFF,
    week: 20,
    homeTeam: buildProductionSimulationTeam("BOS", "Boston", "Guardians", 0, 74),
    awayTeam: buildProductionSimulationTeam("NYT", "New York", "Titans", 0, 74),
  });
  const playoffResult = generateMatchStats(playoffContext, () => 0);
  const playoffDecisive = playoffResult.homeScore !== playoffResult.awayScore;

  if (endgameDriveCount === 0) {
    issues.push({
      severity: "major",
      category: "edge-coverage",
      scope: "endgame",
      message: "No Q4 endgame drives found in edge scan.",
    });
  }

  if (lateTrailingDecisionCount === 0) {
    issues.push({
      severity: "major",
      category: "edge-coverage",
      scope: "endgame-trailing",
      message: "No late trailing fourth-down decisions found in edge scan.",
    });
  }

  if (blowoutGameCount === 0) {
    issues.push({
      severity: "major",
      category: "edge-coverage",
      scope: "blowout",
      message: "No blowout games found in edge scan.",
    });
  }

  if (garbageTimeDecisionCount === 0) {
    issues.push({
      severity: "major",
      category: "edge-coverage",
      scope: "garbage-time",
      message: "No garbage-time decisions found in edge scan.",
    });
  }

  if (redZoneStopCount === 0) {
    issues.push({
      severity: "major",
      category: "edge-coverage",
      scope: "red-zone-stop",
      message: "No red-zone non-touchdown outcomes found in edge scan.",
    });
  }

  if (backedUpDriveCount === 0) {
    issues.push({
      severity: "major",
      category: "edge-coverage",
      scope: "backed-up",
      message: "No backed-up drives found in edge scan.",
    });
  }

  if (!playoffDecisive) {
    issues.push({
      severity: "critical",
      category: "edge-coverage",
      scope: "playoff",
      message: "Playoff edge case did not produce a decisive winner.",
    });
  }

  return {
    status: issues.length === 0 ? "GRUEN" : "ROT",
    scannedGames: games.length,
    endgameDriveCount,
    lateTrailingDecisionCount,
    blowoutGameCount,
    garbageTimeDecisionCount,
    redZoneStopCount,
    backedUpDriveCount,
    playoffDecisive,
    issues,
  };
}
