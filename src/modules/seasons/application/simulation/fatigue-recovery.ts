import type {
  PlayerSimulationLine,
  SimulationPlayerContext,
} from "./simulation.types";

type FatigueRecoveryContext = {
  fatigue: number;
  morale: number;
  status: string;
  injuryStatus: string;
};

export const FATIGUE_LIMITS = {
  max: 99,
  min: 0,
  moraleMax: 99,
  moraleMin: 20,
} as const;

const HIGH_LOAD_POSITIONS = new Set(["RB", "WR", "CB", "LOLB", "ROLB", "FS", "SS"]);
const TRENCH_POSITIONS = new Set(["LT", "LG", "C", "RG", "RT", "LE", "RE", "DT"]);

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function totalPlayerSnaps(line: PlayerSimulationLine) {
  return line.snapsOffense + line.snapsDefense + line.snapsSpecialTeams;
}

export function calculateMatchFatigueDelta(
  player: Pick<SimulationPlayerContext, "positionCode">,
  line: PlayerSimulationLine,
) {
  const snaps = totalPlayerSnaps(line);

  if (snaps <= 0) {
    return 0;
  }

  const positionLoad =
    HIGH_LOAD_POSITIONS.has(player.positionCode)
      ? 2
      : TRENCH_POSITIONS.has(player.positionCode)
        ? 1
        : 0;
  const starterLoad = line.started ? 3 : 0;
  const highUsageLoad = snaps >= 55 ? 2 : snaps >= 40 ? 1 : 0;

  return clamp(Math.round(snaps / 7) + starterLoad + positionLoad + highUsageLoad, 1, 18);
}

export function applyMatchFatigueDelta(currentFatigue: number, matchDelta: number) {
  if (matchDelta <= 0) {
    return clamp(currentFatigue, FATIGUE_LIMITS.min, FATIGUE_LIMITS.max);
  }

  const fatigue = clamp(currentFatigue, FATIGUE_LIMITS.min, FATIGUE_LIMITS.max);
  const effectiveDelta =
    fatigue >= 85
      ? Math.ceil(matchDelta * 0.5)
      : fatigue >= 70
        ? Math.ceil(matchDelta * 0.65)
        : fatigue >= 55
          ? Math.ceil(matchDelta * 0.85)
          : matchDelta;
  const rawNext = fatigue + effectiveDelta;

  if (rawNext <= 92) {
    return clamp(rawNext, FATIGUE_LIMITS.min, FATIGUE_LIMITS.max);
  }

  return clamp(92 + Math.ceil((rawNext - 92) * 0.55), FATIGUE_LIMITS.min, FATIGUE_LIMITS.max);
}

export function buildRecoveryConditionUpdate(
  player: FatigueRecoveryContext,
  baseRecovery: {
    fatigueRecovery: number;
    moraleRecovery: number;
  },
) {
  const fatigueBandBonus = player.fatigue >= 85 ? 7 : player.fatigue >= 70 ? 5 : player.fatigue >= 55 ? 3 : 0;
  const healthyBonus = player.injuryStatus === "HEALTHY" && player.status === "ACTIVE" ? 2 : 0;
  const fatigueRecovery = baseRecovery.fatigueRecovery + fatigueBandBonus + healthyBonus;
  const moraleRecovery =
    player.injuryStatus === "HEALTHY"
      ? baseRecovery.moraleRecovery
      : player.status === "ACTIVE"
        ? 0
        : baseRecovery.moraleRecovery;

  return {
    fatigue: clamp(player.fatigue - fatigueRecovery, FATIGUE_LIMITS.min, FATIGUE_LIMITS.max),
    morale: clamp(
      player.morale + moraleRecovery,
      FATIGUE_LIMITS.moraleMin,
      FATIGUE_LIMITS.moraleMax,
    ),
  };
}

export function buildFatigueGameDayProfile(
  player: Pick<SimulationPlayerContext, "fatigue">,
) {
  const fatigue = clamp(player.fatigue, FATIGUE_LIMITS.min, FATIGUE_LIMITS.max);
  const readinessPenalty =
    fatigue <= 35
      ? 0
      : fatigue <= 60
        ? (fatigue - 35) * 0.0008
        : 0.02 + (fatigue - 60) * 0.001;
  const snapPenalty =
    fatigue <= 45
      ? 0
      : fatigue <= 70
        ? (fatigue - 45) * 0.0008
        : 0.02 + (fatigue - 70) * 0.0012;

  return {
    readinessMultiplier: clamp(1 - readinessPenalty, 0.92, 1),
    snapMultiplier: clamp(1 - snapPenalty, 0.88, 1),
  };
}
