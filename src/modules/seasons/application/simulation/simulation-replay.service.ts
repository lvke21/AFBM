import { createRng } from "@/lib/random/seeded-rng";

import { generateMatchStats } from "./match-engine";
import type {
  MatchDriveResult,
  MatchSimulationResult,
  SimulationMatchContext,
  SimulationPlayerContext,
  SimulationTeamContext,
  TeamSimulationResult,
} from "./simulation.types";

export type SerializedSimulationPlayerContext = Omit<
  SimulationPlayerContext,
  "injuryEndsOn"
> & {
  injuryEndsOn: string | null;
};

export type SerializedSimulationTeamContext = Omit<
  SimulationTeamContext,
  "roster"
> & {
  roster: SerializedSimulationPlayerContext[];
};

export type SerializedSimulationMatchContext = Omit<
  SimulationMatchContext,
  "awayTeam" | "homeTeam" | "scheduledAt"
> & {
  awayTeam: SerializedSimulationTeamContext;
  homeTeam: SerializedSimulationTeamContext;
  scheduledAt: string;
};

export type SimulationReplaySummary = {
  awayScore: number;
  driveCount: number;
  homeScore: number;
  matchId: string;
  playerStatsFingerprint: string;
  seed: string;
  teamStats: {
    away: TeamSimulationResult;
    home: TeamSimulationResult;
  };
  totalDrivesPlanned: number;
  winner: string;
};

export type SimulationReplayStep = {
  awayScore: number;
  homeScore: number;
  offenseTeamId: string;
  phaseLabel: string;
  pointsScored: number;
  resultType: string;
  sequence: number;
  summary: string;
  totalYards: number;
  turnover: boolean;
};

export type SimulationReplayCapture = {
  input: SerializedSimulationMatchContext;
  resultFingerprint: string;
  resultSummary: SimulationReplaySummary;
  seed: string;
  stepReplay: SimulationReplayStep[];
  version: 1;
};

export type SimulationReplayResult = {
  actualFingerprint: string;
  actualSummary: SimulationReplaySummary;
  expectedFingerprint: string;
  matches: boolean;
  replayedResult: MatchSimulationResult;
  stepReplay: SimulationReplayStep[];
};

function serializePlayer(player: SimulationPlayerContext): SerializedSimulationPlayerContext {
  return {
    ...player,
    injuryEndsOn: player.injuryEndsOn?.toISOString() ?? null,
  };
}

function deserializePlayer(player: SerializedSimulationPlayerContext): SimulationPlayerContext {
  return {
    ...player,
    injuryEndsOn: player.injuryEndsOn ? new Date(player.injuryEndsOn) : null,
  };
}

function serializeTeam(team: SimulationTeamContext): SerializedSimulationTeamContext {
  return {
    ...team,
    roster: team.roster.map(serializePlayer),
  };
}

function deserializeTeam(team: SerializedSimulationTeamContext): SimulationTeamContext {
  return {
    ...team,
    roster: team.roster.map(deserializePlayer),
  };
}

export function serializeSimulationReplayInput(
  context: SimulationMatchContext,
): SerializedSimulationMatchContext {
  return {
    ...context,
    awayTeam: serializeTeam(context.awayTeam),
    homeTeam: serializeTeam(context.homeTeam),
    scheduledAt: context.scheduledAt.toISOString(),
  };
}

export function deserializeSimulationReplayInput(
  input: SerializedSimulationMatchContext,
): SimulationMatchContext {
  return {
    ...input,
    awayTeam: deserializeTeam(input.awayTeam),
    homeTeam: deserializeTeam(input.homeTeam),
    scheduledAt: new Date(input.scheduledAt),
  };
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
    .join(",")}}`;
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function resolveWinner(result: MatchSimulationResult) {
  if (result.homeScore === result.awayScore) {
    return "TIE";
  }

  return result.homeScore > result.awayScore ? result.homeTeam.teamId : result.awayTeam.teamId;
}

function summarizePlayers(result: MatchSimulationResult) {
  return result.playerLines
    .map((line) => ({
      blocking: line.blocking,
      defensive: line.defensive,
      kicking: line.kicking,
      playerId: line.playerId,
      punting: line.punting,
      receiving: line.receiving,
      returns: line.returns,
      rushing: line.rushing,
      snapsDefense: line.snapsDefense,
      snapsOffense: line.snapsOffense,
      snapsSpecialTeams: line.snapsSpecialTeams,
      started: line.started,
      passing: line.passing,
      teamId: line.teamId,
    }))
    .sort((left, right) => left.playerId.localeCompare(right.playerId));
}

function summarizeDrives(drives: MatchDriveResult[]) {
  return drives.map((drive) => ({
    awayScore: drive.endedAwayScore,
    defenseTeamId: drive.defenseTeamId,
    homeScore: drive.endedHomeScore,
    offenseTeamId: drive.offenseTeamId,
    phaseLabel: drive.phaseLabel,
    plays: drive.plays,
    pointsScored: drive.pointsScored,
    resultType: drive.resultType,
    sequence: drive.sequence,
    summary: drive.summary,
    totalYards: drive.totalYards,
    turnover: drive.turnover,
  }));
}

export function createSimulationReplaySteps(
  result: MatchSimulationResult,
): SimulationReplayStep[] {
  return result.drives.map((drive) => ({
    awayScore: drive.endedAwayScore,
    homeScore: drive.endedHomeScore,
    offenseTeamId: drive.offenseTeamId,
    phaseLabel: drive.phaseLabel,
    pointsScored: drive.pointsScored,
    resultType: drive.resultType,
    sequence: drive.sequence,
    summary: drive.summary,
    totalYards: drive.totalYards,
    turnover: drive.turnover,
  }));
}

export function createSimulationReplaySummary(
  result: MatchSimulationResult,
): SimulationReplaySummary {
  return {
    awayScore: result.awayScore,
    driveCount: result.drives.length,
    homeScore: result.homeScore,
    matchId: result.matchId,
    playerStatsFingerprint: hashString(stableStringify(summarizePlayers(result))),
    seed: result.simulationSeed,
    teamStats: {
      away: result.awayTeam,
      home: result.homeTeam,
    },
    totalDrivesPlanned: result.totalDrivesPlanned,
    winner: resolveWinner(result),
  };
}

export function createSimulationResultFingerprint(result: MatchSimulationResult) {
  return hashString(
    stableStringify({
      drives: summarizeDrives(result.drives),
      summary: createSimulationReplaySummary(result),
    }),
  );
}

export function createSimulationReplayCapture(
  context: SimulationMatchContext,
  result: MatchSimulationResult = generateMatchStats(context, createRng(context.simulationSeed)),
): SimulationReplayCapture {
  if (context.simulationSeed !== result.simulationSeed) {
    throw new Error("Replay capture seed mismatch between input and result.");
  }

  return {
    input: serializeSimulationReplayInput(context),
    resultFingerprint: createSimulationResultFingerprint(result),
    resultSummary: createSimulationReplaySummary(result),
    seed: context.simulationSeed,
    stepReplay: createSimulationReplaySteps(result),
    version: 1,
  };
}

export function replaySimulationCapture(
  capture: SimulationReplayCapture,
): SimulationReplayResult {
  if (capture.version !== 1) {
    throw new Error(`Unsupported simulation replay capture version: ${capture.version}`);
  }

  if (capture.input.simulationSeed !== capture.seed) {
    throw new Error("Replay capture seed mismatch between stored seed and input seed.");
  }

  const context = deserializeSimulationReplayInput(capture.input);
  const replayedResult = generateMatchStats(context, createRng(capture.seed));
  const actualFingerprint = createSimulationResultFingerprint(replayedResult);

  return {
    actualFingerprint,
    actualSummary: createSimulationReplaySummary(replayedResult),
    expectedFingerprint: capture.resultFingerprint,
    matches: actualFingerprint === capture.resultFingerprint,
    replayedResult,
    stepReplay: createSimulationReplaySteps(replayedResult),
  };
}
