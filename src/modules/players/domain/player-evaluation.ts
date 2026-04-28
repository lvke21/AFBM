type WeightedAttribute = {
  code: string;
  weight: number;
};

type AttributeMap = Record<string, number | undefined>;

const GENERAL_ATTRIBUTE_CODES = [
  "SPEED",
  "ACCELERATION",
  "AGILITY",
  "STRENGTH",
  "AWARENESS",
  "TOUGHNESS",
  "DURABILITY",
  "DISCIPLINE",
  "INTELLIGENCE",
  "LEADERSHIP",
] as const;

export const POSITION_STARTER_SLOTS: Record<string, number> = {
  QB: 1,
  RB: 1,
  FB: 1,
  WR: 3,
  TE: 1,
  LT: 1,
  LG: 1,
  C: 1,
  RG: 1,
  RT: 1,
  LE: 1,
  RE: 1,
  DT: 2,
  LOLB: 1,
  MLB: 1,
  ROLB: 1,
  CB: 2,
  FS: 1,
  SS: 1,
  K: 1,
  P: 1,
  LS: 1,
};

const POSITION_WEIGHT_MAP: Record<string, WeightedAttribute[]> = {
  QB: [
    { code: "THROW_POWER", weight: 1.0 },
    { code: "THROW_ACCURACY_SHORT", weight: 1.2 },
    { code: "THROW_ACCURACY_MEDIUM", weight: 1.15 },
    { code: "THROW_ACCURACY_DEEP", weight: 0.95 },
    { code: "DECISION_MAKING", weight: 1.25 },
    { code: "POCKET_PRESENCE", weight: 1.0 },
    { code: "MOBILITY", weight: 0.75 },
    { code: "AWARENESS", weight: 0.8 },
    { code: "INTELLIGENCE", weight: 0.8 },
  ],
  RB: [
    { code: "VISION", weight: 1.2 },
    { code: "BALL_SECURITY", weight: 1.05 },
    { code: "ELUSIVENESS", weight: 1.05 },
    { code: "BREAK_TACKLE", weight: 0.95 },
    { code: "SPEED", weight: 0.85 },
    { code: "ACCELERATION", weight: 0.95 },
    { code: "SHORT_YARDAGE_POWER", weight: 0.75 },
    { code: "HANDS", weight: 0.6 },
  ],
  FB: [
    { code: "PASS_PROTECTION", weight: 1.1 },
    { code: "SHORT_YARDAGE_POWER", weight: 1.0 },
    { code: "STRENGTH", weight: 0.95 },
    { code: "TOUGHNESS", weight: 0.85 },
    { code: "BALL_SECURITY", weight: 0.9 },
    { code: "BLOCKING", weight: 1.0 },
    { code: "HANDS", weight: 0.45 },
  ],
  WR: [
    { code: "CATCHING", weight: 1.0 },
    { code: "HANDS", weight: 1.15 },
    { code: "ROUTE_RUNNING", weight: 1.05 },
    { code: "RELEASE", weight: 0.75 },
    { code: "SEPARATION", weight: 1.1 },
    { code: "SPEED", weight: 0.9 },
    { code: "ACCELERATION", weight: 0.8 },
    { code: "RUN_AFTER_CATCH", weight: 0.6 },
  ],
  TE: [
    { code: "CATCHING", weight: 0.85 },
    { code: "HANDS", weight: 0.95 },
    { code: "ROUTE_RUNNING", weight: 0.6 },
    { code: "CONTESTED_CATCH", weight: 0.8 },
    { code: "BLOCKING", weight: 1.0 },
    { code: "STRENGTH", weight: 0.85 },
    { code: "AWARENESS", weight: 0.7 },
  ],
  LT: [
    { code: "PASS_BLOCK", weight: 1.2 },
    { code: "FOOTWORK", weight: 1.0 },
    { code: "HAND_TECHNIQUE", weight: 0.9 },
    { code: "ANCHOR", weight: 0.95 },
    { code: "STRENGTH", weight: 0.8 },
    { code: "AWARENESS", weight: 0.75 },
  ],
  LG: [
    { code: "RUN_BLOCK", weight: 1.2 },
    { code: "HAND_TECHNIQUE", weight: 0.9 },
    { code: "ANCHOR", weight: 0.8 },
    { code: "STRENGTH", weight: 1.0 },
    { code: "AWARENESS", weight: 0.7 },
    { code: "TOUGHNESS", weight: 0.7 },
  ],
  C: [
    { code: "AWARENESS", weight: 1.0 },
    { code: "INTELLIGENCE", weight: 1.0 },
    { code: "PASS_BLOCK", weight: 0.85 },
    { code: "RUN_BLOCK", weight: 0.85 },
    { code: "HAND_TECHNIQUE", weight: 0.9 },
    { code: "ANCHOR", weight: 0.7 },
    { code: "LEADERSHIP", weight: 0.55 },
  ],
  RG: [
    { code: "RUN_BLOCK", weight: 1.2 },
    { code: "HAND_TECHNIQUE", weight: 0.9 },
    { code: "ANCHOR", weight: 0.8 },
    { code: "STRENGTH", weight: 1.0 },
    { code: "AWARENESS", weight: 0.7 },
    { code: "TOUGHNESS", weight: 0.7 },
  ],
  RT: [
    { code: "PASS_BLOCK", weight: 1.15 },
    { code: "FOOTWORK", weight: 0.95 },
    { code: "HAND_TECHNIQUE", weight: 0.9 },
    { code: "ANCHOR", weight: 0.95 },
    { code: "STRENGTH", weight: 0.8 },
    { code: "AWARENESS", weight: 0.75 },
  ],
  LE: [
    { code: "PASS_RUSH", weight: 1.05 },
    { code: "POWER_MOVES", weight: 1.0 },
    { code: "BLOCK_SHEDDING", weight: 1.0 },
    { code: "TACKLING", weight: 0.8 },
    { code: "STRENGTH", weight: 0.9 },
    { code: "TOUGHNESS", weight: 0.7 },
  ],
  RE: [
    { code: "PASS_RUSH", weight: 1.05 },
    { code: "FINESSE_MOVES", weight: 1.0 },
    { code: "PURSUIT", weight: 0.85 },
    { code: "SPEED", weight: 0.75 },
    { code: "ACCELERATION", weight: 0.8 },
    { code: "BLOCK_SHEDDING", weight: 0.8 },
  ],
  DT: [
    { code: "BLOCK_SHEDDING", weight: 1.1 },
    { code: "POWER_MOVES", weight: 1.0 },
    { code: "TACKLING", weight: 0.9 },
    { code: "STRENGTH", weight: 1.0 },
    { code: "TOUGHNESS", weight: 0.8 },
    { code: "PASS_RUSH", weight: 0.65 },
  ],
  LOLB: [
    { code: "PURSUIT", weight: 0.95 },
    { code: "PASS_RUSH", weight: 0.85 },
    { code: "TACKLING", weight: 0.9 },
    { code: "LB_MAN_COVERAGE", weight: 0.65 },
    { code: "LB_ZONE_COVERAGE", weight: 0.8 },
    { code: "COVERAGE_RANGE", weight: 0.75 },
    { code: "SPEED", weight: 0.7 },
  ],
  MLB: [
    { code: "TACKLING", weight: 1.0 },
    { code: "PLAY_RECOGNITION", weight: 1.1 },
    { code: "PURSUIT", weight: 0.85 },
    { code: "LB_MAN_COVERAGE", weight: 0.55 },
    { code: "LB_ZONE_COVERAGE", weight: 0.95 },
    { code: "COVERAGE_RANGE", weight: 0.7 },
    { code: "AWARENESS", weight: 0.8 },
    { code: "LEADERSHIP", weight: 0.65 },
  ],
  ROLB: [
    { code: "PURSUIT", weight: 0.95 },
    { code: "PASS_RUSH", weight: 0.85 },
    { code: "TACKLING", weight: 0.9 },
    { code: "LB_MAN_COVERAGE", weight: 0.65 },
    { code: "LB_ZONE_COVERAGE", weight: 0.8 },
    { code: "COVERAGE_RANGE", weight: 0.75 },
    { code: "SPEED", weight: 0.7 },
  ],
  CB: [
    { code: "MAN_COVERAGE", weight: 1.0 },
    { code: "ZONE_COVERAGE", weight: 0.85 },
    { code: "PRESS", weight: 0.75 },
    { code: "BALL_SKILLS", weight: 0.8 },
    { code: "COVERAGE_RANGE", weight: 0.9 },
    { code: "SPEED", weight: 0.8 },
    { code: "ACCELERATION", weight: 0.7 },
    { code: "HANDS", weight: 0.35 },
  ],
  FS: [
    { code: "ZONE_COVERAGE", weight: 1.05 },
    { code: "BALL_SKILLS", weight: 0.95 },
    { code: "PLAY_RECOGNITION", weight: 0.95 },
    { code: "COVERAGE_RANGE", weight: 1.05 },
    { code: "PURSUIT", weight: 0.7 },
    { code: "SPEED", weight: 0.7 },
    { code: "AWARENESS", weight: 0.8 },
    { code: "HANDS", weight: 0.35 },
  ],
  SS: [
    { code: "TACKLING", weight: 1.0 },
    { code: "PURSUIT", weight: 0.85 },
    { code: "PLAY_RECOGNITION", weight: 0.85 },
    { code: "ZONE_COVERAGE", weight: 0.7 },
    { code: "COVERAGE_RANGE", weight: 0.65 },
    { code: "HIT_POWER", weight: 0.8 },
    { code: "TOUGHNESS", weight: 0.65 },
  ],
  K: [
    { code: "KICK_POWER", weight: 0.95 },
    { code: "KICK_ACCURACY", weight: 1.1 },
    { code: "KICK_CONSISTENCY", weight: 1.05 },
    { code: "KICKOFF_POWER", weight: 0.8 },
    { code: "DISCIPLINE", weight: 0.6 },
    { code: "AWARENESS", weight: 0.55 },
  ],
  P: [
    { code: "PUNT_POWER", weight: 0.95 },
    { code: "PUNT_ACCURACY", weight: 1.1 },
    { code: "PUNT_HANG_TIME", weight: 1.0 },
    { code: "KICK_CONSISTENCY", weight: 0.85 },
    { code: "DISCIPLINE", weight: 0.55 },
    { code: "AWARENESS", weight: 0.5 },
  ],
  LS: [
    { code: "SNAP_ACCURACY", weight: 1.2 },
    { code: "SNAP_VELOCITY", weight: 1.0 },
    { code: "BLOCKING", weight: 0.65 },
    { code: "DISCIPLINE", weight: 0.8 },
    { code: "AWARENESS", weight: 0.8 },
    { code: "HAND_TECHNIQUE", weight: 0.7 },
    { code: "ANCHOR", weight: 0.5 },
  ],
};

function clampRating(value: number, min = 35, max = 99) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function weightedAverage(
  attributes: AttributeMap,
  weightedAttributes: WeightedAttribute[],
  min = 45,
  max = 95,
) {
  const totalWeight = weightedAttributes.reduce((sum, entry) => sum + entry.weight, 0);

  if (totalWeight === 0) {
    return 50;
  }

  const total = weightedAttributes.reduce(
    (sum, entry) => sum + (attributes[entry.code] ?? 50) * entry.weight,
    0,
  );

  return clampRating(total / totalWeight, min, max);
}

export function computePositionOverall(positionCode: string, attributes: AttributeMap) {
  const weightedAttributes = POSITION_WEIGHT_MAP[positionCode];

  if (weightedAttributes) {
    return weightedAverage(attributes, weightedAttributes, 45, 95);
  }

  return weightedAverage(
    attributes,
    GENERAL_ATTRIBUTE_CODES.map((code) => ({ code, weight: 1 })),
    45,
    95,
  );
}

export function computeSpecialTeamsOverall(
  primaryPositionCode: string,
  secondaryPositionCode: string | null | undefined,
  attributes: AttributeMap,
) {
  if (primaryPositionCode === "K" || primaryPositionCode === "P" || primaryPositionCode === "LS") {
    const keysByPosition: Record<string, WeightedAttribute[]> = {
      K: [
        { code: "KICK_POWER", weight: 0.95 },
        { code: "KICK_ACCURACY", weight: 1.1 },
        { code: "KICK_CONSISTENCY", weight: 1.0 },
        { code: "KICKOFF_POWER", weight: 0.8 },
      ],
      P: [
        { code: "PUNT_POWER", weight: 0.95 },
        { code: "PUNT_ACCURACY", weight: 1.1 },
        { code: "PUNT_HANG_TIME", weight: 1.0 },
        { code: "KICK_CONSISTENCY", weight: 0.85 },
      ],
      LS: [
        { code: "SNAP_ACCURACY", weight: 1.2 },
        { code: "SNAP_VELOCITY", weight: 1.0 },
        { code: "DISCIPLINE", weight: 0.8 },
        { code: "AWARENESS", weight: 0.8 },
        { code: "HAND_TECHNIQUE", weight: 0.65 },
        { code: "BLOCKING", weight: 0.55 },
      ],
    };
    const keys = keysByPosition[primaryPositionCode] ?? [
      { code: "DISCIPLINE", weight: 1 },
      { code: "AWARENESS", weight: 1 },
    ];
    return weightedAverage(attributes, keys, 45, 95);
  }

  if (secondaryPositionCode === "KR" || secondaryPositionCode === "PR") {
    return weightedAverage(
      attributes,
      [
        { code: "RETURN_VISION", weight: 1.15 },
        { code: "HANDS", weight: 0.9 },
        { code: "BALL_SECURITY", weight: 0.95 },
        { code: "ELUSIVENESS", weight: 0.9 },
        { code: "ACCELERATION", weight: 0.85 },
        { code: "SPEED", weight: 0.8 },
        { code: "RUN_AFTER_CATCH", weight: 0.65 },
      ],
      45,
      92,
    );
  }

  return undefined;
}

export function computePhysicalOverall(attributes: AttributeMap) {
  const keys = [
    "SPEED",
    "ACCELERATION",
    "AGILITY",
    "STRENGTH",
    "TOUGHNESS",
    "DURABILITY",
  ];
  const total = keys.reduce((sum, code) => sum + (attributes[code] ?? 50), 0);
  return clampRating(total / keys.length, 40, 95);
}

export function computeMentalOverall(attributes: AttributeMap) {
  const keys = ["AWARENESS", "DISCIPLINE", "INTELLIGENCE", "LEADERSHIP"];
  const total = keys.reduce((sum, code) => sum + (attributes[code] ?? 50), 0);
  return clampRating(total / keys.length, 40, 95);
}

export function buildPlayerEvaluationSnapshot(
  primaryPositionCode: string,
  positionGroupCode: "OFFENSE" | "DEFENSE" | "SPECIAL_TEAMS",
  secondaryPositionCode: string | null | undefined,
  attributes: AttributeMap,
) {
  const positionOverall = computePositionOverall(primaryPositionCode, attributes);

  return {
    positionOverall,
    offensiveOverall: positionGroupCode === "OFFENSE" ? positionOverall : undefined,
    defensiveOverall: positionGroupCode === "DEFENSE" ? positionOverall : undefined,
    specialTeamsOverall: computeSpecialTeamsOverall(
      primaryPositionCode,
      secondaryPositionCode,
      attributes,
    ),
    physicalOverall: computePhysicalOverall(attributes),
    mentalOverall: computeMentalOverall(attributes),
  };
}

export function calculateTeamOverall(
  players: Array<{
    positionCode: string;
    positionOverall: number;
    specialTeamsOverall?: number | null;
  }>,
) {
  const relevantPositions = Object.entries(POSITION_STARTER_SLOTS).flatMap(
    ([positionCode, count]) => Array.from({ length: count }, () => positionCode),
  );
  const byPosition = new Map<string, number[]>();

  for (const player of players) {
    const rating =
      player.positionCode === "K" || player.positionCode === "P" || player.positionCode === "LS"
        ? (player.specialTeamsOverall ?? player.positionOverall)
        : player.positionOverall;
    const existing = byPosition.get(player.positionCode) ?? [];
    existing.push(rating);
    existing.sort((left, right) => right - left);
    byPosition.set(player.positionCode, existing);
  }

  const starterRatings = relevantPositions
    .map((positionCode) => {
      const current = byPosition.get(positionCode) ?? [];
      return current.shift() ?? 55;
    })
    .filter((value) => value > 0);

  if (starterRatings.length === 0) {
    return 60;
  }

  return clampRating(
    starterRatings.reduce((sum, value) => sum + value, 0) / starterRatings.length,
    55,
    95,
  );
}
