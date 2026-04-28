import { InjuryStatus, PlayerStatus } from "@/modules/shared/domain/enums";
import { resolveMatchInjury } from "@/modules/players/domain/player-injury";
import type {
  MatchSimulationResult,
  PlayerSimulationLine,
  SimulationPlayerContext,
} from "./simulation.types";
import { PLAYER_CONDITION_RULES } from "./engine-rules";
import {
  applyMatchFatigueDelta,
  buildRecoveryConditionUpdate,
  calculateMatchFatigueDelta,
} from "./fatigue-recovery";
import { createSeededRandom, deriveSimulationSeed } from "./simulation-random";

type PlayerConditionUpdate = {
  fatigue: number;
  morale: number;
  status: PlayerStatus;
  injuryStatus: InjuryStatus;
  injuryName: string | null;
  injuryEndsOn: Date | null;
};

type PlayerRecoveryContext = {
  fatigue: number;
  morale: number;
  status: PlayerStatus;
  injuryStatus: InjuryStatus;
};

type PlayerRecoveryUpdate = {
  fatigue: number;
  morale: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function totalSnaps(line: PlayerSimulationLine) {
  return line.snapsOffense + line.snapsDefense + line.snapsSpecialTeams;
}

function resolveMoraleDelta(
  player: SimulationPlayerContext,
  line: PlayerSimulationLine,
  teamWon: boolean,
) {
  let delta = teamWon ? 3 : -3;

  if (player.captainFlag) {
    delta += teamWon ? 1 : -1;
  }

  if (line.started) {
    delta += teamWon ? 1 : 0;
  }

  if (
    line.passing.touchdowns > 1 ||
    line.rushing.touchdowns > 0 ||
    line.receiving.touchdowns > 0 ||
    line.defensive.sacks >= 1 ||
    line.defensive.interceptions >= 1
  ) {
    delta += 2;
  }

  if (line.passing.interceptions > 1 || line.rushing.fumbles > 0) {
    delta -= 2;
  }

  return delta;
}

export function buildPlayerConditionUpdate(
  player: SimulationPlayerContext,
  line: PlayerSimulationLine,
  matchResult: MatchSimulationResult,
  scheduledAt: Date,
  random?: () => number,
): PlayerConditionUpdate {
  const conditionRandom =
    random ??
    createSeededRandom(
      deriveSimulationSeed(matchResult.simulationSeed, `condition:${player.id}`),
    );
  const playerTeamResult =
    matchResult.homeTeam.teamId === player.teamId ? matchResult.homeTeam : matchResult.awayTeam;
  const opponentTeamResult =
    matchResult.homeTeam.teamId === player.teamId ? matchResult.awayTeam : matchResult.homeTeam;
  const teamWon = playerTeamResult.score > opponentTeamResult.score;
  const scoreMargin = Math.abs(playerTeamResult.score - opponentTeamResult.score);
  const frontRunnerLoad = teamWon && scoreMargin >= 17 && line.started && totalSnaps(line) >= 40 ? 2 : 0;
  const fatigueDelta = calculateMatchFatigueDelta(player, line) + frontRunnerLoad;
  const moraleDelta = resolveMoraleDelta(player, line, teamWon);
  const injury = resolveMatchInjury({
    player: {
      attributes: player.attributes,
      fatigue: player.fatigue,
      injuryRisk: player.injuryRisk,
      physicalOverall: player.physicalOverall,
      positionCode: player.positionCode,
      totalSnaps: totalSnaps(line),
    },
    random: conditionRandom,
    scheduledAt,
  });
  const nextCondition: Pick<
    PlayerConditionUpdate,
    "status" | "injuryStatus" | "injuryName" | "injuryEndsOn"
  > = injury
    ? {
        status: injury.status,
        injuryStatus: injury.injuryStatus,
        injuryName: injury.injuryName,
        injuryEndsOn: injury.injuryEndsOn,
      }
    : {
        status:
          player.injuryStatus === InjuryStatus.HEALTHY
            ? PlayerStatus.ACTIVE
            : (player.status as PlayerStatus),
        injuryStatus: player.injuryStatus as InjuryStatus,
        injuryName: player.injuryName,
        injuryEndsOn: player.injuryEndsOn,
      };

  return {
    fatigue: applyMatchFatigueDelta(player.fatigue, fatigueDelta),
    morale: clamp(player.morale + moraleDelta - (injury?.moralePenalty ?? 0), 20, 99),
    status: nextCondition.status,
    injuryStatus: nextCondition.injuryStatus,
    injuryName: nextCondition.injuryName,
    injuryEndsOn: nextCondition.injuryEndsOn,
  };
}

export function buildWeeklyRecoveryUpdate(
  player: PlayerRecoveryContext,
): PlayerRecoveryUpdate {
  const ruleKey =
    (player.injuryStatus in PLAYER_CONDITION_RULES.recovery
      ? player.injuryStatus
      : InjuryStatus.HEALTHY) as keyof typeof PLAYER_CONDITION_RULES.recovery;
  const recoveryRule = PLAYER_CONDITION_RULES.recovery[ruleKey];
  return buildRecoveryConditionUpdate(player, recoveryRule);
}
