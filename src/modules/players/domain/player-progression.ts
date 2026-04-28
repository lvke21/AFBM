export type PlayerProgressionContext = {
  age?: number;
  attributes: Record<string, number>;
  depthChartSlot: number | null;
  developmentFocus: boolean;
  developmentFocusStreakWeeks?: number;
  developmentTrait: string;
  fatigue?: number;
  morale?: number;
  positionCode: string;
  positionOverall: number;
  potentialRating: number;
  rosterStatus: string;
};

export type PlayerGameProgressionInput = PlayerProgressionContext & {
  bigPlays?: number;
  mistakes?: number;
  started: boolean;
  touchdowns?: number;
  totalSnaps: number;
};

export type PlayerProgressionSource = "GAME" | "WEEKLY_TRAINING";

export type PlayerAttributeProgressionChange = {
  code: string;
  delta: number;
  next: number;
  previous: number;
};

export const ATTRIBUTE_PROGRESS_CAP = 99;
export const ATTRIBUTE_REGRESSION_FLOOR = 35;
export const WEEKLY_TRAINING_XP_THRESHOLD = 70;
export const GAME_XP_THRESHOLD = 100;
export const DEVELOPMENT_FOCUS_WEEKLY_XP = {
  base: 22,
  repeatPenalty: 4,
  maxRepeatPenalty: 12,
} as const;

const DEVELOPMENT_TARGETS: Record<string, string[]> = {
  QB: [
    "THROW_ACCURACY_SHORT",
    "THROW_ACCURACY_MEDIUM",
    "DECISION_MAKING",
    "AWARENESS",
    "MOBILITY",
  ],
  RB: ["VISION", "BALL_SECURITY", "ELUSIVENESS", "ACCELERATION", "HANDS"],
  FB: ["PASS_PROTECTION", "BLOCKING", "SHORT_YARDAGE_POWER", "STRENGTH"],
  WR: ["HANDS", "ROUTE_RUNNING", "SEPARATION", "RELEASE", "RUN_AFTER_CATCH"],
  TE: ["HANDS", "BLOCKING", "CONTESTED_CATCH", "AWARENESS"],
  LT: ["PASS_BLOCK", "FOOTWORK", "ANCHOR", "AWARENESS"],
  LG: ["RUN_BLOCK", "HAND_TECHNIQUE", "STRENGTH", "AWARENESS"],
  C: ["AWARENESS", "INTELLIGENCE", "HAND_TECHNIQUE", "LEADERSHIP"],
  RG: ["RUN_BLOCK", "HAND_TECHNIQUE", "STRENGTH", "AWARENESS"],
  RT: ["PASS_BLOCK", "FOOTWORK", "ANCHOR", "AWARENESS"],
  LE: ["PASS_RUSH", "BLOCK_SHEDDING", "POWER_MOVES", "PLAY_RECOGNITION"],
  RE: ["PASS_RUSH", "FINESSE_MOVES", "ACCELERATION", "PURSUIT"],
  DT: ["BLOCK_SHEDDING", "POWER_MOVES", "STRENGTH", "TACKLING"],
  LOLB: ["PURSUIT", "LB_ZONE_COVERAGE", "PASS_RUSH", "COVERAGE_RANGE"],
  MLB: ["PLAY_RECOGNITION", "LB_ZONE_COVERAGE", "TACKLING", "LEADERSHIP"],
  ROLB: ["PURSUIT", "LB_ZONE_COVERAGE", "PASS_RUSH", "COVERAGE_RANGE"],
  CB: ["MAN_COVERAGE", "ZONE_COVERAGE", "BALL_SKILLS", "COVERAGE_RANGE"],
  FS: ["ZONE_COVERAGE", "PLAY_RECOGNITION", "BALL_SKILLS", "COVERAGE_RANGE"],
  SS: ["TACKLING", "PLAY_RECOGNITION", "ZONE_COVERAGE", "HIT_POWER"],
  K: ["KICK_ACCURACY", "KICK_POWER", "KICK_CONSISTENCY"],
  P: ["PUNT_ACCURACY", "PUNT_POWER", "PUNT_HANG_TIME"],
  LS: ["SNAP_ACCURACY", "SNAP_VELOCITY", "DISCIPLINE", "AWARENESS"],
};

const REGRESSION_TARGETS: Record<string, string[]> = {
  QB: ["MOBILITY", "THROW_POWER"],
  RB: ["SPEED", "ACCELERATION"],
  FB: ["SPEED", "AGILITY"],
  WR: ["SPEED", "ACCELERATION"],
  TE: ["SPEED", "AGILITY"],
  LT: ["FOOTWORK", "AGILITY"],
  LG: ["AGILITY", "ACCELERATION"],
  C: ["AGILITY", "STRENGTH"],
  RG: ["AGILITY", "ACCELERATION"],
  RT: ["FOOTWORK", "AGILITY"],
  LE: ["ACCELERATION", "SPEED"],
  RE: ["ACCELERATION", "SPEED"],
  DT: ["ACCELERATION", "AGILITY"],
  LOLB: ["SPEED", "ACCELERATION"],
  MLB: ["SPEED", "ACCELERATION"],
  ROLB: ["SPEED", "ACCELERATION"],
  CB: ["SPEED", "ACCELERATION"],
  FS: ["SPEED", "ACCELERATION"],
  SS: ["SPEED", "ACCELERATION"],
  K: ["KICK_POWER"],
  P: ["PUNT_POWER"],
  LS: ["STRENGTH"],
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function traitXp(trait: string) {
  switch (trait) {
    case "ELITE":
      return 18;
    case "STAR":
      return 12;
    case "IMPACT":
      return 7;
    default:
      return 0;
  }
}

function ageXp(age: number | undefined) {
  if (age == null) {
    return 0;
  }

  if (age <= 22) {
    return 14;
  }

  if (age <= 25) {
    return 9;
  }

  if (age <= 28) {
    return 4;
  }

  if (age <= 30) {
    return 0;
  }

  return -12;
}

function trainingUsageXp(player: PlayerProgressionContext) {
  const baseByRosterStatus: Record<string, number> = {
    BACKUP: 18,
    PRACTICE_SQUAD: 10,
    ROTATION: 32,
    STARTER: 44,
  };
  const depthBonus =
    player.depthChartSlot === 1
      ? 8
      : player.depthChartSlot === 2
        ? 5
        : player.depthChartSlot && player.depthChartSlot <= 3
          ? 3
          : 0;

  return (baseByRosterStatus[player.rosterStatus] ?? 0) + depthBonus;
}

function conditionXp(player: PlayerProgressionContext) {
  const morale = player.morale ?? 50;
  const fatigue = player.fatigue ?? 35;

  return Math.round((morale - 50) / 4) - Math.round(Math.max(fatigue - 45, 0) / 5);
}

function potentialXp(player: PlayerProgressionContext) {
  const developmentGap = player.potentialRating - player.positionOverall;

  if (developmentGap <= 0) {
    return -100;
  }

  return clamp(Math.round(developmentGap * 1.2), 4, 28);
}

export function calculateWeeklyTrainingXp(player: PlayerProgressionContext) {
  const focusXp = calculateDevelopmentFocusWeeklyXp(player);

  return clamp(
    trainingUsageXp(player) +
      potentialXp(player) +
      traitXp(player.developmentTrait) +
      conditionXp(player) +
      focusXp,
    0,
    140,
  );
}

export function calculateDevelopmentFocusWeeklyXp(player: PlayerProgressionContext) {
  if (!player.developmentFocus) {
    return 0;
  }

  const repeatPenalty = clamp(
    Math.floor(player.developmentFocusStreakWeeks ?? 0) *
      DEVELOPMENT_FOCUS_WEEKLY_XP.repeatPenalty,
    0,
    DEVELOPMENT_FOCUS_WEEKLY_XP.maxRepeatPenalty,
  );

  return DEVELOPMENT_FOCUS_WEEKLY_XP.base - repeatPenalty;
}

export function calculateGameProgressionXp(player: PlayerGameProgressionInput) {
  const performanceXp =
    (player.bigPlays ?? 0) * 8 + (player.touchdowns ?? 0) * 10 - (player.mistakes ?? 0) * 9;
  const startedXp = player.started ? 12 : 0;
  const focusXp = player.developmentFocus ? 14 : 0;

  return clamp(
    Math.round(player.totalSnaps * 1.9) +
      startedXp +
      performanceXp +
      potentialXp(player) +
      traitXp(player.developmentTrait) +
      ageXp(player.age) +
      conditionXp(player) +
      focusXp,
    0,
    220,
  );
}

export function listDevelopmentTargets(positionCode: string) {
  return DEVELOPMENT_TARGETS[positionCode] ?? DEVELOPMENT_TARGETS.QB;
}

export function listRegressionTargets(positionCode: string) {
  return REGRESSION_TARGETS[positionCode] ?? REGRESSION_TARGETS.QB;
}

export function buildAttributeProgressionPlan(input: {
  maxAttributeGains: number;
  player: PlayerProgressionContext;
  source: PlayerProgressionSource;
  xpGained: number;
}) {
  if (input.player.potentialRating <= input.player.positionOverall) {
    return [];
  }

  const threshold =
    input.source === "WEEKLY_TRAINING" ? WEEKLY_TRAINING_XP_THRESHOLD : GAME_XP_THRESHOLD;
  const gainBudget = clamp(
    Math.floor(input.xpGained / threshold),
    0,
    input.maxAttributeGains,
  );

  if (gainBudget <= 0) {
    return [];
  }

  const changes: PlayerAttributeProgressionChange[] = [];
  const targets = listDevelopmentTargets(input.player.positionCode);

  for (const code of targets) {
    if (changes.length >= gainBudget) {
      break;
    }

    const previous = input.player.attributes[code] ?? 50;

    if (previous >= ATTRIBUTE_PROGRESS_CAP) {
      continue;
    }

    changes.push({
      code,
      delta: 1,
      previous,
      next: clamp(previous + 1, ATTRIBUTE_REGRESSION_FLOOR, ATTRIBUTE_PROGRESS_CAP),
    });
  }

  return changes;
}

export function buildAgeRegressionPlan(player: PlayerProgressionContext) {
  const age = player.age ?? 0;
  const developmentGap = player.potentialRating - player.positionOverall;

  if (age < 31 || developmentGap > 2) {
    return [];
  }

  return listRegressionTargets(player.positionCode)
    .slice(0, clamp(Math.ceil((age - 30) / 2), 0, 2))
    .flatMap((code) => {
      const previous = player.attributes[code] ?? 50;

      if (previous <= 40) {
        return [];
      }

      return [
        {
          code,
          delta: -1,
          previous,
          next: clamp(previous - 1, ATTRIBUTE_REGRESSION_FLOOR, ATTRIBUTE_PROGRESS_CAP),
        },
      ];
    });
}
