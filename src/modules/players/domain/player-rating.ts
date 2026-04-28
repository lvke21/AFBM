type WeightedAttribute = {
  code: string;
  weight: number;
};

type SpotlightConfig = {
  key: keyof PlayerCompositeRatings;
  label: string;
};

export type PlayerCompositeRatings = {
  passing: number;
  pocket: number;
  mobility: number;
  command: number;
  ballCarrier: number;
  protection: number;
  hands: number;
  receiving: number;
  passBlocking: number;
  runBlocking: number;
  passRush: number;
  runDefense: number;
  linebackerCoverage: number;
  coverage: number;
  ballHawk: number;
  offensiveLineChemistry: number;
  qbReceiverChemistry: number;
  defensiveBackChemistry: number;
  protectionUnit: number;
  passRushUnit: number;
  pressCoverageUnit: number;
  runLaneCreation: number;
  boxDefense: number;
  returnGame: number;
  kicking: number;
  punting: number;
  snapping: number;
  specialistConsistency: number;
};

export type PlayerSpotlightRating = {
  label: string;
  value: number;
};

export function attributeValue(
  attributes: Record<string, number>,
  code: string,
  fallback = 50,
) {
  return attributes[code] ?? fallback;
}

function clampRating(value: number, min = 35, max = 99) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function weightedAverage(
  attributes: Record<string, number>,
  weights: WeightedAttribute[],
  min = 40,
  max = 95,
) {
  const totalWeight = weights.reduce((sum, entry) => sum + entry.weight, 0);

  if (totalWeight === 0) {
    return 50;
  }

  const total = weights.reduce(
    (sum, entry) => sum + attributeValue(attributes, entry.code) * entry.weight,
    0,
  );

  return clampRating(total / totalWeight, min, max);
}

export function toAttributeMap(
  attributes: Array<{
    value: number;
    attributeDefinition: {
      code: string;
    };
  }>,
) {
  return Object.fromEntries(
    attributes.map((attribute) => [attribute.attributeDefinition.code, attribute.value]),
  );
}

export function computePlayerCompositeRatings(
  attributes: Record<string, number>,
): PlayerCompositeRatings {
  return {
    passing: weightedAverage(attributes, [
      { code: "THROW_ACCURACY_SHORT", weight: 1.2 },
      { code: "THROW_ACCURACY_MEDIUM", weight: 1.15 },
      { code: "THROW_ACCURACY_DEEP", weight: 0.95 },
      { code: "THROW_POWER", weight: 1.0 },
      { code: "DECISION_MAKING", weight: 1.2 },
      { code: "POCKET_PRESENCE", weight: 0.8 },
      { code: "AWARENESS", weight: 0.8 },
    ]),
    pocket: weightedAverage(attributes, [
      { code: "POCKET_PRESENCE", weight: 1.3 },
      { code: "DECISION_MAKING", weight: 1.1 },
      { code: "AWARENESS", weight: 1.0 },
      { code: "DISCIPLINE", weight: 0.8 },
      { code: "THROW_ACCURACY_MEDIUM", weight: 0.7 },
    ]),
    mobility: weightedAverage(attributes, [
      { code: "MOBILITY", weight: 1.35 },
      { code: "SCRAMBLING", weight: 1.0 },
      { code: "ACCELERATION", weight: 0.9 },
      { code: "AGILITY", weight: 0.8 },
      { code: "SPEED", weight: 0.7 },
    ]),
    command: weightedAverage(attributes, [
      { code: "AWARENESS", weight: 1.1 },
      { code: "DISCIPLINE", weight: 1.0 },
      { code: "INTELLIGENCE", weight: 1.1 },
      { code: "LEADERSHIP", weight: 0.9 },
      { code: "PLAY_RECOGNITION", weight: 0.7 },
    ]),
    ballCarrier: weightedAverage(attributes, [
      { code: "VISION", weight: 1.15 },
      { code: "BALL_SECURITY", weight: 1.0 },
      { code: "ELUSIVENESS", weight: 1.0 },
      { code: "BREAK_TACKLE", weight: 0.95 },
      { code: "ACCELERATION", weight: 0.85 },
      { code: "SHORT_YARDAGE_POWER", weight: 0.75 },
    ]),
    protection: weightedAverage(attributes, [
      { code: "PASS_PROTECTION", weight: 1.2 },
      { code: "AWARENESS", weight: 0.9 },
      { code: "DISCIPLINE", weight: 0.8 },
      { code: "STRENGTH", weight: 0.7 },
      { code: "TOUGHNESS", weight: 0.7 },
    ]),
    hands: weightedAverage(attributes, [
      { code: "HANDS", weight: 1.35 },
      { code: "CATCHING", weight: 1.0 },
      { code: "CONTESTED_CATCH", weight: 0.75 },
      { code: "BALL_SECURITY", weight: 0.65 },
      { code: "JUMPING", weight: 0.45 },
    ]),
    receiving: weightedAverage(attributes, [
      { code: "CATCHING", weight: 1.0 },
      { code: "HANDS", weight: 1.1 },
      { code: "ROUTE_RUNNING", weight: 1.0 },
      { code: "RELEASE", weight: 0.7 },
      { code: "SEPARATION", weight: 1.05 },
      { code: "RUN_AFTER_CATCH", weight: 0.7 },
    ]),
    passBlocking: weightedAverage(attributes, [
      { code: "PASS_BLOCK", weight: 1.2 },
      { code: "FOOTWORK", weight: 1.0 },
      { code: "HAND_TECHNIQUE", weight: 0.95 },
      { code: "ANCHOR", weight: 0.95 },
      { code: "AWARENESS", weight: 0.75 },
      { code: "PASS_PROTECTION", weight: 0.55 },
    ]),
    runBlocking: weightedAverage(attributes, [
      { code: "RUN_BLOCK", weight: 1.2 },
      { code: "HAND_TECHNIQUE", weight: 0.95 },
      { code: "STRENGTH", weight: 0.95 },
      { code: "ANCHOR", weight: 0.7 },
      { code: "BLOCKING", weight: 0.55 },
      { code: "TOUGHNESS", weight: 0.6 },
    ]),
    passRush: weightedAverage(attributes, [
      { code: "PASS_RUSH", weight: 1.15 },
      { code: "POWER_MOVES", weight: 0.95 },
      { code: "FINESSE_MOVES", weight: 0.95 },
      { code: "BLOCK_SHEDDING", weight: 0.8 },
      { code: "ACCELERATION", weight: 0.75 },
      { code: "PLAY_RECOGNITION", weight: 0.6 },
    ]),
    runDefense: weightedAverage(attributes, [
      { code: "TACKLING", weight: 1.0 },
      { code: "PURSUIT", weight: 0.95 },
      { code: "BLOCK_SHEDDING", weight: 0.95 },
      { code: "STRENGTH", weight: 0.8 },
      { code: "PLAY_RECOGNITION", weight: 0.85 },
      { code: "HIT_POWER", weight: 0.6 },
    ]),
    linebackerCoverage: weightedAverage(attributes, [
      { code: "LB_MAN_COVERAGE", weight: 0.85 },
      { code: "LB_ZONE_COVERAGE", weight: 1.1 },
      { code: "LB_COVERAGE", weight: 0.8 },
      { code: "COVERAGE_RANGE", weight: 0.9 },
      { code: "PLAY_RECOGNITION", weight: 0.85 },
      { code: "AWARENESS", weight: 0.8 },
    ]),
    coverage: weightedAverage(attributes, [
      { code: "MAN_COVERAGE", weight: 1.0 },
      { code: "ZONE_COVERAGE", weight: 1.05 },
      { code: "COVERAGE_RANGE", weight: 0.95 },
      { code: "PRESS", weight: 0.6 },
      { code: "PLAY_RECOGNITION", weight: 0.8 },
      { code: "AWARENESS", weight: 0.75 },
    ]),
    ballHawk: weightedAverage(attributes, [
      { code: "BALL_SKILLS", weight: 1.2 },
      { code: "HANDS", weight: 0.95 },
      { code: "COVERAGE_RANGE", weight: 0.8 },
      { code: "PLAY_RECOGNITION", weight: 0.95 },
      { code: "JUMPING", weight: 0.55 },
    ]),
    offensiveLineChemistry: weightedAverage(attributes, [
      { code: "AWARENESS", weight: 1.1 },
      { code: "DISCIPLINE", weight: 1.0 },
      { code: "INTELLIGENCE", weight: 0.9 },
      { code: "LEADERSHIP", weight: 0.65 },
      { code: "HAND_TECHNIQUE", weight: 0.7 },
      { code: "FOOTWORK", weight: 0.55 },
      { code: "PASS_BLOCK", weight: 0.45 },
      { code: "RUN_BLOCK", weight: 0.45 },
    ]),
    qbReceiverChemistry: weightedAverage(attributes, [
      { code: "DECISION_MAKING", weight: 0.9 },
      { code: "AWARENESS", weight: 1.0 },
      { code: "INTELLIGENCE", weight: 0.8 },
      { code: "LEADERSHIP", weight: 0.55 },
      { code: "ROUTE_RUNNING", weight: 0.9 },
      { code: "RELEASE", weight: 0.55 },
      { code: "SEPARATION", weight: 0.65 },
      { code: "CATCHING", weight: 0.5 },
      { code: "THROW_ACCURACY_SHORT", weight: 0.5 },
      { code: "THROW_ACCURACY_MEDIUM", weight: 0.45 },
    ]),
    defensiveBackChemistry: weightedAverage(attributes, [
      { code: "ZONE_COVERAGE", weight: 1.0 },
      { code: "MAN_COVERAGE", weight: 0.75 },
      { code: "PRESS", weight: 0.55 },
      { code: "PLAY_RECOGNITION", weight: 1.05 },
      { code: "AWARENESS", weight: 0.9 },
      { code: "INTELLIGENCE", weight: 0.75 },
      { code: "DISCIPLINE", weight: 0.75 },
      { code: "COVERAGE_RANGE", weight: 0.7 },
    ]),
    protectionUnit: weightedAverage(attributes, [
      { code: "PASS_BLOCK", weight: 1.15 },
      { code: "PASS_PROTECTION", weight: 0.85 },
      { code: "FOOTWORK", weight: 0.9 },
      { code: "ANCHOR", weight: 0.85 },
      { code: "HAND_TECHNIQUE", weight: 0.8 },
      { code: "AWARENESS", weight: 0.65 },
      { code: "DISCIPLINE", weight: 0.55 },
    ]),
    passRushUnit: weightedAverage(attributes, [
      { code: "PASS_RUSH", weight: 1.15 },
      { code: "POWER_MOVES", weight: 0.9 },
      { code: "FINESSE_MOVES", weight: 0.9 },
      { code: "BLOCK_SHEDDING", weight: 0.85 },
      { code: "PLAY_RECOGNITION", weight: 0.65 },
      { code: "ACCELERATION", weight: 0.5 },
      { code: "STRENGTH", weight: 0.4 },
    ]),
    pressCoverageUnit: weightedAverage(attributes, [
      { code: "PRESS", weight: 1.2 },
      { code: "MAN_COVERAGE", weight: 1.0 },
      { code: "PLAY_RECOGNITION", weight: 0.8 },
      { code: "COVERAGE_RANGE", weight: 0.75 },
      { code: "AWARENESS", weight: 0.65 },
      { code: "STRENGTH", weight: 0.45 },
      { code: "AGILITY", weight: 0.45 },
    ]),
    runLaneCreation: weightedAverage(attributes, [
      { code: "RUN_BLOCK", weight: 1.1 },
      { code: "HAND_TECHNIQUE", weight: 0.9 },
      { code: "STRENGTH", weight: 0.85 },
      { code: "ANCHOR", weight: 0.75 },
      { code: "FOOTWORK", weight: 0.65 },
      { code: "BLOCKING", weight: 0.6 },
      { code: "AWARENESS", weight: 0.55 },
    ]),
    boxDefense: weightedAverage(attributes, [
      { code: "BLOCK_SHEDDING", weight: 1.05 },
      { code: "TACKLING", weight: 1.0 },
      { code: "PURSUIT", weight: 0.9 },
      { code: "PLAY_RECOGNITION", weight: 0.95 },
      { code: "STRENGTH", weight: 0.75 },
      { code: "HIT_POWER", weight: 0.55 },
    ]),
    returnGame: weightedAverage(attributes, [
      { code: "RETURN_VISION", weight: 1.1 },
      { code: "HANDS", weight: 0.9 },
      { code: "BALL_SECURITY", weight: 0.95 },
      { code: "ELUSIVENESS", weight: 0.9 },
      { code: "ACCELERATION", weight: 0.85 },
      { code: "SPEED", weight: 0.8 },
      { code: "RUN_AFTER_CATCH", weight: 0.65 },
    ]),
    kicking: weightedAverage(attributes, [
      { code: "KICK_POWER", weight: 0.95 },
      { code: "KICK_ACCURACY", weight: 1.1 },
      { code: "KICK_CONSISTENCY", weight: 1.0 },
      { code: "KICKOFF_POWER", weight: 0.8 },
      { code: "DISCIPLINE", weight: 0.6 },
      { code: "AWARENESS", weight: 0.55 },
    ]),
    punting: weightedAverage(attributes, [
      { code: "PUNT_POWER", weight: 0.95 },
      { code: "PUNT_ACCURACY", weight: 1.1 },
      { code: "PUNT_HANG_TIME", weight: 1.0 },
      { code: "KICK_CONSISTENCY", weight: 0.85 },
      { code: "DISCIPLINE", weight: 0.55 },
      { code: "AWARENESS", weight: 0.5 },
    ]),
    snapping: weightedAverage(attributes, [
      { code: "SNAP_ACCURACY", weight: 1.2 },
      { code: "SNAP_VELOCITY", weight: 1.0 },
      { code: "DISCIPLINE", weight: 0.75 },
      { code: "AWARENESS", weight: 0.75 },
      { code: "HAND_TECHNIQUE", weight: 0.65 },
      { code: "BLOCKING", weight: 0.55 },
    ]),
    specialistConsistency: weightedAverage(attributes, [
      { code: "KICK_CONSISTENCY", weight: 1.15 },
      { code: "SNAP_ACCURACY", weight: 0.8 },
      { code: "SNAP_VELOCITY", weight: 0.65 },
      { code: "DISCIPLINE", weight: 0.95 },
      { code: "AWARENESS", weight: 0.8 },
      { code: "LEADERSHIP", weight: 0.45 },
    ]),
  };
}

function spotlightConfigs(
  positionCode: string,
  secondaryPositionCode?: string | null,
): SpotlightConfig[] {
  switch (positionCode) {
    case "QB":
      return [
        { key: "passing", label: "Pass" },
        { key: "command", label: "Command" },
        { key: "mobility", label: "Mobility" },
      ];
    case "RB":
    case "FB":
      return [
        { key: "ballCarrier", label: "Runner" },
        { key: "protection", label: "Pass Pro" },
        { key: "hands", label: "Hands" },
      ];
    case "WR":
      return [
        { key: "receiving", label: "Receiving" },
        { key: "hands", label: "Hands" },
        {
          key: secondaryPositionCode === "KR" || secondaryPositionCode === "PR"
            ? "returnGame"
            : "ballCarrier",
          label: secondaryPositionCode === "KR" || secondaryPositionCode === "PR"
            ? "Return"
            : "YAC",
        },
      ];
    case "TE":
      return [
        { key: "receiving", label: "Receiving" },
        { key: "runBlocking", label: "Run Block" },
        { key: "hands", label: "Hands" },
      ];
    case "LT":
    case "RT":
      return [
        { key: "passBlocking", label: "Pass Block" },
        { key: "runBlocking", label: "Run Block" },
        { key: "command", label: "Awareness" },
      ];
    case "LG":
    case "RG":
    case "C":
      return [
        { key: "runBlocking", label: "Run Block" },
        { key: "passBlocking", label: "Pass Block" },
        { key: "command", label: "Awareness" },
      ];
    case "LE":
    case "RE":
    case "DT":
      return [
        { key: "passRush", label: "Pass Rush" },
        { key: "runDefense", label: "Run Defense" },
        { key: "command", label: "Recognition" },
      ];
    case "LOLB":
    case "MLB":
    case "ROLB":
      return [
        { key: "runDefense", label: "Run Defense" },
        { key: "linebackerCoverage", label: "Coverage" },
        { key: positionCode === "MLB" ? "command" : "passRush", label: positionCode === "MLB" ? "Command" : "Pass Rush" },
      ];
    case "CB":
    case "FS":
    case "SS":
      return [
        { key: "coverage", label: "Coverage" },
        { key: "ballHawk", label: "Ball Hawk" },
        { key: "runDefense", label: "Run Support" },
      ];
    case "K":
      return [
        { key: "kicking", label: "Kicking" },
        { key: "specialistConsistency", label: "Consistency" },
        { key: "command", label: "Focus" },
      ];
    case "P":
      return [
        { key: "punting", label: "Punting" },
        { key: "specialistConsistency", label: "Consistency" },
        { key: "command", label: "Focus" },
      ];
    case "LS":
      return [
        { key: "snapping", label: "Snapping" },
        { key: "specialistConsistency", label: "Consistency" },
        { key: "passBlocking", label: "Protection" },
      ];
    default:
      return [
        { key: "command", label: "Command" },
        { key: "ballCarrier", label: "Runner" },
        { key: "coverage", label: "Coverage" },
      ];
  }
}

export function buildPlayerSpotlightRatings(
  positionCode: string,
  secondaryPositionCode: string | null | undefined,
  ratings: PlayerCompositeRatings,
): PlayerSpotlightRating[] {
  return spotlightConfigs(positionCode, secondaryPositionCode).map((entry) => ({
    label: entry.label,
    value: ratings[entry.key],
  }));
}
